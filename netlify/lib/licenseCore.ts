/**
 * Licences Premium vendues sur Chariow (boutique Ivory Gestion).
 *
 *  - la clé API Chariow ne quitte jamais le serveur (CHARIOW_API_KEY) ;
 *  - seules les licences des 3 produits Ivory Caisse sont acceptées ;
 *  - une clé ne consomme une activation Chariow qu'une fois par téléphone
 *    (réinstaller l'app sur le même téléphone ne « brûle » pas la 2e place) ;
 *  - la date de fin vient de Chariow (expires_at), jamais du téléphone.
 *
 * Module sans dépendance Netlify : stockage et réseau injectés (testable).
 */

export type LicPlan = "pro" | "year" | "life";

/** Produits Chariow → formule Ivory Caisse */
export const PRODUCTS: Record<string, LicPlan> = {
  prd_ewwwyub0: "pro", // Mensuel 2 000 F, 31 jours
  prd_h95p8e2k: "year", // Annuel 15 000 F, 366 jours
  prd_8e5bj3vn: "life", // À vie 25 000 F
};

export interface LicEnv {
  apiKey?: string;
  apiBase: string;
}

export interface LicRecord {
  devices: string[];
  plan: LicPlan;
  updated: number;
}

export interface LicKV {
  get(key: string): Promise<LicRecord | null>;
  set(key: string, value: LicRecord): Promise<void>;
}

export type LicFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface ChariowLicense {
  status?: string;
  product?: { id?: string };
  is_active?: boolean;
  is_expired?: boolean;
  can_activate?: boolean;
  activations?: { count?: number; max?: number; remaining?: number };
  expires_at?: string | null;
  revoked_at?: string | null;
}

export const licEnabled = (env: LicEnv) => Boolean(env.apiKey);

const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;
const DEVICE_RE = /^[a-z0-9]{12,40}$/i;
export const normKey = (k: unknown) => (typeof k === "string" ? k.trim().toUpperCase().replace(/\s+/g, "") : "");
export const isKey = (k: string) => KEY_RE.test(k);
export const isDevice = (d: unknown): d is string => typeof d === "string" && DEVICE_RE.test(d);

/* La clé est stockée hachée côté serveur : une fuite du stockage ne révèle aucune clé */
export async function keyId(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ivory-caisse:${key}`));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const headers = (env: LicEnv) => ({
  Authorization: `Bearer ${env.apiKey}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "IvoryCaisse/2.3 (+https://ivory-caisse.netlify.app)",
});

async function readLicense(env: LicEnv, fetchFn: LicFetch, key: string) {
  const res = await fetchFn(`${env.apiBase}/v1/licenses/${encodeURIComponent(key)}`, {
    method: "GET",
    headers: headers(env),
  });
  if (res.status === 404) return { found: false as const };
  if (!res.ok) return { found: null as null, status: res.status };
  const body = (await res.json().catch(() => ({}))) as { data?: ChariowLicense };
  return { found: true as const, lic: body.data ?? {} };
}

const untilOf = (lic: ChariowLicense, plan: LicPlan): number | null => {
  if (plan === "life") return null;
  const t = lic.expires_at ? Date.parse(lic.expires_at) : NaN;
  return Number.isFinite(t) ? t : null;
};

export type LicResult =
  | { status: 200; body: { ok: true; plan: LicPlan; until: number | null; devicesLeft?: number } }
  | { status: number; body: { ok: false; error: string; code: string } };

const fail = (status: number, code: string, error: string): LicResult => ({ status, body: { ok: false, code, error } });

/* ---------------- Activer une clé sur un téléphone ---------------- */

export async function activate(
  env: LicEnv,
  kv: LicKV,
  fetchFn: LicFetch,
  input: { key: unknown; device: unknown }
): Promise<LicResult> {
  if (!licEnabled(env)) return fail(503, "disabled", "L'activation par clé n'est pas encore ouverte");
  const key = normKey(input.key);
  if (!isKey(key)) return fail(400, "format", "Cette clé n'a pas le bon format. Copie-la depuis l'e-mail Chariow.");
  if (!isDevice(input.device)) return fail(400, "device", "Appareil non reconnu");

  const r = await readLicense(env, fetchFn, key);
  if (r.found === false) return fail(422, "unknown", "Clé introuvable. Vérifie qu'elle est complète.");
  if (r.found === null) return fail(502, "upstream", "Chariow ne répond pas. Réessaie dans un instant.");
  const lic = r.lic;

  const plan = PRODUCTS[lic.product?.id ?? ""];
  if (!plan) return fail(422, "product", "Cette clé n'est pas une licence Ivory Caisse.");
  if (lic.status === "revoked" || lic.revoked_at) return fail(422, "revoked", "Cette clé a été annulée. Contacte le support.");
  if (lic.is_expired || lic.status === "expired") return fail(422, "expired", "Cette licence a expiré. Renouvelle ton Premium.");

  const id = await keyId(key);
  const rec = (await kv.get(id)) ?? { devices: [], plan, updated: 0 };

  /* Même téléphone : pas de nouvelle activation */
  if (rec.devices.includes(input.device) && lic.status === "active") {
    return { status: 200, body: { ok: true, plan, until: untilOf(lic, plan), devicesLeft: lic.activations?.remaining } };
  }

  const res = await fetchFn(`${env.apiBase}/v1/licenses/${encodeURIComponent(key)}/activate`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({ device_identifier: `ivory-caisse:${input.device}` }),
  });
  const body = (await res.json().catch(() => ({}))) as { data?: ChariowLicense; message?: string };
  if (!res.ok) {
    const msg = String(body.message ?? "").toLowerCase();
    if (msg.includes("limit")) return fail(409, "limit", "Cette clé est déjà utilisée sur 2 téléphones. Contacte le support pour libérer une place.");
    if (msg.includes("expired")) return fail(422, "expired", "Cette licence a expiré. Renouvelle ton Premium.");
    if (msg.includes("revoked")) return fail(422, "revoked", "Cette clé a été annulée. Contacte le support.");
    return fail(502, "upstream", "Activation impossible pour le moment. Réessaie dans un instant.");
  }
  const after = body.data ?? lic;
  await kv.set(id, { devices: Array.from(new Set([...rec.devices, input.device])), plan, updated: Date.now() });
  return { status: 200, body: { ok: true, plan, until: untilOf(after, plan), devicesLeft: after.activations?.remaining } };
}

/* ---------------- Revérifier (remboursement, annulation, expiration) ---------------- */

export async function recheck(
  env: LicEnv,
  kv: LicKV,
  fetchFn: LicFetch,
  input: { key: unknown; device: unknown }
): Promise<LicResult> {
  if (!licEnabled(env)) return fail(503, "disabled", "Vérification indisponible");
  const key = normKey(input.key);
  if (!isKey(key) || !isDevice(input.device)) return fail(400, "format", "Requête invalide");
  const rec = await kv.get(await keyId(key));
  if (!rec || !rec.devices.includes(input.device)) return fail(422, "device", "Cette clé n'est pas activée sur ce téléphone.");
  const r = await readLicense(env, fetchFn, key);
  if (r.found === false) return fail(422, "unknown", "Licence introuvable.");
  if (r.found === null) return fail(502, "upstream", "Chariow ne répond pas.");
  const lic = r.lic;
  const plan = PRODUCTS[lic.product?.id ?? ""];
  if (!plan) return fail(422, "product", "Licence non reconnue.");
  if (lic.status === "revoked" || lic.revoked_at) return fail(422, "revoked", "Licence annulée.");
  if (lic.is_expired || lic.status === "expired") return fail(422, "expired", "Licence expirée.");
  return { status: 200, body: { ok: true, plan, until: untilOf(lic, plan), devicesLeft: lic.activations?.remaining } };
}

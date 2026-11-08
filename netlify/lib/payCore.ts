/**
 * Cœur du paiement Ivory Caisse via CinetPay (Wave, Orange Money, MTN, Moov, carte).
 *
 * Règles de sécurité :
 *  - la clé API CinetPay ne quitte jamais le serveur ;
 *  - le prix vient de la table PRICES ci-dessous, jamais du téléphone ;
 *  - un paiement n'est « payé » qu'après vérification auprès de CinetPay
 *    (statut ACCEPTED + montant + devise identiques) ;
 *  - une transaction payée n'active Premium que sur l'appareil qui l'a lancée.
 *
 * Ce module ne dépend pas de Netlify : stockage et réseau sont injectés (testable).
 */

export type PaidPlan = "pro" | "year" | "life";

export const PRICES: Record<PaidPlan, { amount: number; days: number | null; label: string }> = {
  pro: { amount: 2000, days: 31, label: "Premium mensuel" },
  year: { amount: 15000, days: 366, label: "Premium annuel" },
  life: { amount: 25000, days: null, label: "Premium a vie" },
};

export type PayStatus = "pending" | "paid" | "refused";

export interface PayRecord {
  tx: string;
  plan: PaidPlan;
  amount: number;
  device: string;
  status: PayStatus;
  created: number;
  paidAt?: number;
  until?: number | null;
  method?: string;
  operatorId?: string;
}

export interface KV {
  get(key: string): Promise<PayRecord | null>;
  set(key: string, value: PayRecord): Promise<void>;
}

export interface Env {
  apikey?: string;
  siteId?: string;
  apiBase: string;
  siteUrl: string;
}

export type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export const enabled = (env: Env) => Boolean(env.apikey && env.siteId);

const DEVICE_RE = /^[a-z0-9]{12,40}$/i;
const TX_RE = /^IC[A-Z0-9]{10,30}$/;

export const isPlan = (p: unknown): p is PaidPlan => p === "pro" || p === "year" || p === "life";
export const isDevice = (d: unknown): d is string => typeof d === "string" && DEVICE_RE.test(d);
export const isTx = (t: unknown): t is string => typeof t === "string" && TX_RE.test(t);

export function newTx(): string {
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 12);
  return `IC${Date.now().toString(36).toUpperCase()}${rnd}`;
}

const headers = {
  "Content-Type": "application/json",
  /* CinetPay bloque les appels sans User-Agent (erreur 1010) */
  "User-Agent": "IvoryCaisse/2.2.0 (+https://ivory-caisse.netlify.app)",
};

const clean = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[#/$_&<>"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/* ---------------- Créer un paiement ---------------- */

export async function initPayment(
  env: Env,
  kv: KV,
  fetchFn: Fetch,
  input: { plan: unknown; device: unknown; name?: unknown }
): Promise<{ ok: true; tx: string; url: string } | { ok: false; status: number; error: string }> {
  if (!enabled(env)) return { ok: false, status: 503, error: "Paiement pas encore activé" };
  if (!isPlan(input.plan)) return { ok: false, status: 400, error: "Formule inconnue" };
  if (!isDevice(input.device)) return { ok: false, status: 400, error: "Appareil non reconnu" };

  const price = PRICES[input.plan];
  const tx = newTx();
  const name = clean(typeof input.name === "string" ? input.name : "", 40) || "Client";

  /* Enregistré AVANT d'afficher le guichet (recommandation CinetPay) */
  await kv.set(tx, {
    tx,
    plan: input.plan,
    amount: price.amount,
    device: input.device,
    status: "pending",
    created: Date.now(),
  });

  const res = await fetchFn(`${env.apiBase}/v2/payment`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      apikey: env.apikey,
      site_id: env.siteId,
      transaction_id: tx,
      amount: price.amount,
      currency: "XOF",
      description: clean(`Ivory Caisse ${price.label}`, 80),
      notify_url: `${env.siteUrl}/api/pay/notify`,
      return_url: `${env.siteUrl}/api/pay/return?tx=${tx}`,
      channels: "ALL",
      lang: "fr",
      metadata: `${input.plan}`,
      customer_name: name,
      customer_surname: name,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    description?: string;
    data?: { payment_url?: string };
  };
  if (body.code !== "201" || !body.data?.payment_url) {
    return { ok: false, status: 502, error: `CinetPay a refusé la création (${body.code ?? res.status} ${body.message ?? ""})`.trim() };
  }
  return { ok: true, tx, url: body.data.payment_url };
}

/* ---------------- Vérifier auprès de CinetPay ---------------- */

export async function checkWithCinetPay(env: Env, kv: KV, fetchFn: Fetch, tx: string): Promise<PayRecord | null> {
  const rec = await kv.get(tx);
  if (!rec) return null;
  if (rec.status === "paid") return rec; // déjà confirmé : idempotent

  const res = await fetchFn(`${env.apiBase}/v2/payment/check`, {
    method: "POST",
    headers,
    body: JSON.stringify({ apikey: env.apikey, site_id: env.siteId, transaction_id: tx }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    code?: string;
    data?: { status?: string; amount?: string | number; currency?: string; payment_method?: string; operator_id?: string };
  };
  const d = body.data ?? {};
  const status = String(d.status ?? "").toUpperCase();

  if (body.code === "00" && status === "ACCEPTED") {
    /* Le montant et la devise doivent correspondre exactement à la formule */
    if (Number(d.amount) !== rec.amount || String(d.currency).toUpperCase() !== "XOF") {
      const bad: PayRecord = { ...rec, status: "refused" };
      await kv.set(tx, bad);
      return bad;
    }
    const days = PRICES[rec.plan].days;
    const paidAt = Date.now();
    const done: PayRecord = {
      ...rec,
      status: "paid",
      paidAt,
      until: days === null ? null : paidAt + days * 86400000,
      method: d.payment_method,
      operatorId: d.operator_id,
    };
    await kv.set(tx, done);
    return done;
  }
  if (status === "REFUSED" || status === "CANCELED" || status === "CANCELLED" || body.code === "627") {
    const ref: PayRecord = { ...rec, status: "refused" };
    await kv.set(tx, ref);
    return ref;
  }
  return rec; // toujours en attente (client n'a pas encore validé sur son téléphone)
}

/* ---------------- Réponse au téléphone ---------------- */

export async function verifyForDevice(
  env: Env,
  kv: KV,
  fetchFn: Fetch,
  input: { tx: unknown; device: unknown }
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!enabled(env)) return { status: 503, body: { error: "Paiement pas encore activé" } };
  if (!isTx(input.tx) || !isDevice(input.device)) return { status: 400, body: { error: "Requête invalide" } };
  const rec = await kv.get(input.tx);
  /* Même réponse si inconnue ou appartenant à un autre appareil : rien à deviner */
  if (!rec || rec.device !== input.device) return { status: 422, body: { error: "Paiement introuvable" } };
  const r = await checkWithCinetPay(env, kv, fetchFn, input.tx);
  if (!r) return { status: 422, body: { error: "Paiement introuvable" } };
  return {
    status: 200,
    body: r.status === "paid" ? { status: "paid", plan: r.plan, until: r.until ?? null } : { status: r.status },
  };
}

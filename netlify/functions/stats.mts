import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

/**
 * Statistiques anonymes d'utilisation — routes :
 *   POST /api/stats/ping     { id, v, plan, trial, native } → 204
 *   GET  /api/stats/summary  (en-tête x-admin-key) → chiffres agrégés
 *
 * Aucune donnée commerciale ni personnelle : un identifiant aléatoire par téléphone,
 * la version, le plan et l'état de l'essai. Rien d'autre.
 */

/* Empreinte SHA-256 du code administrateur (le code lui-même n'est pas dans le dépôt) */
const ADMIN_HASH = "3e184d04f913cb5e88aa644fd0eaadf60c293e8ef46576af197eb57d91d17ac6";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
  "Access-Control-Max-Age": "86400",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS } });

type Trial = "none" | "active" | "ended";
type Plan = "free" | "pro" | "shop" | "year" | "life";
interface Device {
  first: number;
  last: number;
  v: string;
  plan: Plan;
  trial: Trial;
  native: boolean;
  /** jours (AAAA-MM-JJ) où l'app a été ouverte, 60 derniers au plus */
  days: string[];
  /** a déjà eu un essai terminé ou en cours */
  hadTrial: boolean;
}

const ID_RE = /^[a-f0-9-]{36}$/;
const PLANS: Plan[] = ["free", "pro", "shop", "year", "life"];
const TRIALS: Trial[] = ["none", "active", "ended"];
const DAY = 86_400_000;

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  const store = getStore({ name: "ivory-stats", consistency: "strong" });

  if (url.pathname.endsWith("/ping") && req.method === "POST") {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return json(422, { ok: false });
    }
    const id = String(b.id ?? "");
    const plan = String(b.plan ?? "") as Plan;
    const trial = String(b.trial ?? "") as Trial;
    if (!ID_RE.test(id) || !PLANS.includes(plan) || !TRIALS.includes(trial)) return json(422, { ok: false });
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const key = `dev/${id}`;
    const old = ((await store.get(key, { type: "json" })) as Device | null) ?? null;
    const days = old ? (old.days.includes(today) ? old.days : [...old.days, today].slice(-60)) : [today];
    const rec: Device = {
      first: old?.first ?? now,
      last: now,
      v: String(b.v ?? "").slice(0, 12),
      plan,
      trial,
      native: Boolean(b.native),
      days,
      hadTrial: Boolean(old?.hadTrial) || trial !== "none",
    };
    await store.setJSON(key, rec);
    return new Response(null, { status: 204, headers: CORS });
  }

  if (url.pathname.endsWith("/summary") && req.method === "GET") {
    const given = req.headers.get("x-admin-key") ?? "";
    if (!given || (await sha256(given.trim().toUpperCase())) !== ADMIN_HASH) return json(401, { ok: false, error: "Code administrateur incorrect" });
    const { blobs } = await store.list({ prefix: "dev/" });
    /* Les identifiants de test (00000000-…) ne sont jamais comptés */
    const keys = blobs.map((x) => x.key).filter((k) => !k.startsWith("dev/00000000-"));
    const recs = (await Promise.all(keys.map((k) => store.get(k, { type: "json" })))).filter(Boolean) as Device[];
    const now = Date.now();
    const paid = (d: Device) => d.plan !== "free";
    const s = {
      ok: true,
      at: now,
      installs: recs.length,
      new7: recs.filter((d) => now - d.first < 7 * DAY).length,
      active1: recs.filter((d) => now - d.last < DAY).length,
      active7: recs.filter((d) => now - d.last < 7 * DAY).length,
      active30: recs.filter((d) => now - d.last < 30 * DAY).length,
      android: recs.filter((d) => d.native).length,
      trialActive: recs.filter((d) => d.trial === "active" && now - d.last < 8 * DAY).length,
      trialEndedFree: recs.filter((d) => d.trial === "ended" && !paid(d)).length,
      premium: recs.filter(paid).length,
      byPlan: Object.fromEntries(PLANS.map((p) => [p, recs.filter((d) => d.plan === p).length])),
      /* parmi ceux qui sont arrivés au bout de l'essai, combien paient */
      conversion: (() => {
        const done = recs.filter((d) => d.hadTrial && (d.trial === "ended" || paid(d)));
        return done.length ? Math.round((done.filter(paid).length / done.length) * 1000) / 10 : null;
      })(),
      /* rétention : ouvert au moins 3 jours différents */
      engaged: recs.filter((d) => d.days.length >= 3).length,
      versions: recs.reduce<Record<string, number>>((m, d) => ((m[d.v || "?"] = (m[d.v || "?"] ?? 0) + 1), m), {}),
      /* installations par jour, 14 derniers jours */
      daily: Array.from({ length: 14 }, (_, i) => {
        const day = new Date(now - (13 - i) * DAY).toISOString().slice(0, 10);
        return { day, installs: recs.filter((d) => new Date(d.first).toISOString().slice(0, 10) === day).length, active: recs.filter((d) => d.days.includes(day)).length };
      }),
    };
    return json(200, s);
  }

  return json(404, { ok: false, error: "Route inconnue" });
};

export const config: Config = { path: ["/api/stats/*"] };

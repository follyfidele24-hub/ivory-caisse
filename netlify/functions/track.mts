import type { Config, Context } from "@netlify/functions";

/**
 * Mesure anonyme de la landing — route :
 *   POST /api/track  { name, props, t, sid } → 204
 *
 * - Aucun cookie, aucun identifiant personnel. `sid` = identifiant de session
 *   aléatoire tenu en mémoire par la page (perdu à la fermeture de l'onglet).
 * - Écriture : log Netlify UNIQUEMENT (pas de Blobs, pas de base). Ne pas changer sans accord.
 * - Liste blanche d'événements et de propriétés : tout le reste est ignoré.
 *   La démo n'envoie jamais de montant, seulement { demo_used: true }.
 * - Rate-limit 60 req/min par IP, en mémoire de l'instance (best effort). L'IP n'est jamais journalisée.
 */

const EVENTS = new Set(["cta_click", "section_view", "demo_add"]);
const ID_RE = /^[a-z0-9-]{1,32}$/;
const SID_RE = /^[a-z0-9]{6,24}$/;
const MAX_BODY = 1024;
const LIMIT = 60;
const WINDOW = 60_000;

const hits = new Map<string, { n: number; start: number }>();

function limited(ip: string, now: number) {
  const h = hits.get(ip);
  if (!h || now - h.start > WINDOW) {
    hits.set(ip, { n: 1, start: now });
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > WINDOW) hits.delete(k);
    return false;
  }
  h.n += 1;
  return h.n > LIMIT;
}

const empty = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return empty(405);

  const now = Date.now();
  if (limited(context.ip || "unknown", now)) return empty(429);

  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return empty(400);

  let body: { name?: unknown; props?: Record<string, unknown>; t?: unknown; sid?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return empty(400);
  }
  if (typeof body.name !== "string" || !EVENTS.has(body.name)) return empty(400);

  const props: Record<string, string | boolean> = {};
  const p = body.props && typeof body.props === "object" ? body.props : {};
  if (typeof p.id === "string" && ID_RE.test(p.id)) props.id = p.id;
  if (body.name === "demo_add") props.demo_used = true;

  const t = typeof body.t === "number" && Number.isFinite(body.t) ? Math.round(body.t) : now;
  const sid = typeof body.sid === "string" && SID_RE.test(body.sid) ? body.sid : undefined;

  console.log(JSON.stringify({ track: body.name, props, t, sid }));
  return empty(204);
};

export const config: Config = { path: ["/api/track"] };

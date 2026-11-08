import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { activate, licEnabled, recheck, type LicEnv, type LicKV, type LicRecord } from "../lib/licenseCore.ts";

/**
 * Licences Chariow — routes :
 *   GET  /api/license/status    → { enabled }
 *   POST /api/license/activate  { key, device } → { ok, plan, until }
 *   POST /api/license/recheck   { key, device } → { ok, plan, until }  (annulation / expiration)
 *
 * Variable Netlify : CHARIOW_API_KEY (secret, droits licences lecture + écriture)
 */

const env = (): LicEnv => ({
  apiKey: Netlify.env.get("CHARIOW_API_KEY") || undefined,
  apiBase: Netlify.env.get("CHARIOW_API_BASE") || "https://api.chariow.com",
});

const kv = (): LicKV => {
  const store = getStore({ name: "ivory-licenses", consistency: "strong" });
  return {
    get: async (k) => ((await store.get(k, { type: "json" })) as LicRecord | null) ?? null,
    set: async (k, v) => {
      await store.setJSON(k, v);
    },
  };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export default async (req: Request) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/license\/?/, "");
  const E = env();
  try {
    if (route === "status" && req.method === "GET") return json(200, { enabled: licEnabled(E) });
    if ((route === "activate" || route === "recheck") && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { key?: unknown; device?: unknown };
      const r = route === "activate" ? await activate(E, kv(), fetch, b) : await recheck(E, kv(), fetch, b);
      return json(r.status, r.body);
    }
    return json(404, { ok: false, error: "Route inconnue" });
  } catch (e) {
    console.error("license error", e);
    return json(500, { ok: false, error: "Erreur serveur licence", code: "server" });
  }
};

export const config: Config = { path: ["/api/license/*"] };

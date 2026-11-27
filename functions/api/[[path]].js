// ESSAI CLOUDFLARE PAGES — ne pas fusionner dans ivory-caisse-app.
// Les fonctions /api restent sur Netlify (inchangées). Ici, un relais minimal et sûr :
// - lectures d'état (GET /api/pay/status, /api/license/status) : relayées vers la prod Netlify
// - ping de stats : ignoré (204) pour ne pas polluer les vraies statistiques
// - tout le reste (paiement, activation de licence, admin) : bloqué sur le site d'essai
const ORIGIN = "https://ivory-caisse.netlify.app";
const READ_ONLY = new Set(["/api/pay/status", "/api/license/status"]);

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (path === "/api/stats/ping") return new Response(null, { status: 204 });

  if (request.method === "GET" && READ_ONLY.has(path)) {
    const res = await fetch(ORIGIN + path + url.search, { headers: { accept: "application/json" } });
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new Response(JSON.stringify({ ok: false, error: "Site d'essai : action désactivée" }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

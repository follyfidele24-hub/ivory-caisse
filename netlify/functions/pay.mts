import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { checkWithCinetPay, enabled, initPayment, isTx, verifyForDevice, type Env, type KV, type PayRecord } from "../lib/payCore.ts";

/**
 * API paiement Ivory Caisse — routes :
 *   GET  /api/pay/status   → { enabled }
 *   POST /api/pay/init     → { tx, url }     (ouvre le guichet CinetPay)
 *   POST /api/pay/verify   → { status, plan?, until? }
 *   POST /api/pay/notify   ← appel serveur CinetPay (re-vérifie via l'API)
 *   GET|POST /api/pay/return?tx=…  ← retour du client après paiement → redirige vers l'app
 *
 * Variables Netlify (Project configuration → Environment variables) :
 *   CINETPAY_APIKEY, CINETPAY_SITE_ID  (secrets, jamais dans le code de l'app)
 */

const env = (req: Request): Env => ({
  apikey: Netlify.env.get("CINETPAY_APIKEY") || undefined,
  siteId: Netlify.env.get("CINETPAY_SITE_ID") || undefined,
  apiBase: Netlify.env.get("CINETPAY_API_BASE") || "https://api-checkout.cinetpay.com",
  siteUrl: (Netlify.env.get("URL") || new URL(req.url).origin).replace(/\/$/, ""),
});

const kv = (): KV => {
  const store = getStore({ name: "ivory-payments", consistency: "strong" });
  return {
    get: async (k) => ((await store.get(k, { type: "json" })) as PayRecord | null) ?? null,
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

const readBody = async (req: Request): Promise<Record<string, unknown>> => {
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) return (await req.json()) as Record<string, unknown>;
    if (type.includes("form")) return Object.fromEntries((await req.formData()).entries());
  } catch {
    /* corps illisible */
  }
  return {};
};

export default async (req: Request, _ctx: Context) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/pay\/?/, "");
  const E = env(req);

  try {
    if (route === "status" && req.method === "GET") return json(200, { enabled: enabled(E) });

    if (route === "init" && req.method === "POST") {
      const b = await readBody(req);
      const r = await initPayment(E, kv(), fetch, { plan: b.plan, device: b.device, name: b.name });
      return r.ok ? json(200, { tx: r.tx, url: r.url }) : json(r.status, { error: r.error });
    }

    if (route === "verify" && req.method === "POST") {
      const b = await readBody(req);
      const r = await verifyForDevice(E, kv(), fetch, { tx: b.tx, device: b.device });
      return json(r.status, r.body);
    }

    if (route === "notify") {
      /* CinetPay « ping » l'URL en GET pour vérifier qu'elle répond */
      if (req.method !== "POST") return new Response("OK", { status: 200 });
      const b = await readBody(req);
      const tx = String(b.cpm_trans_id ?? b.transaction_id ?? "");
      /* On ne fait jamais confiance au contenu : on redemande le statut à CinetPay */
      if (enabled(E) && isTx(tx)) await checkWithCinetPay(E, kv(), fetch, tx);
      return new Response("OK", { status: 200 });
    }

    if (route === "return") {
      const url = new URL(req.url);
      let tx = url.searchParams.get("tx") ?? "";
      if (!isTx(tx) && req.method === "POST") {
        const b = await readBody(req);
        tx = String(b.transaction_id ?? b.cpm_trans_id ?? "");
      }
      const dest = `${E.siteUrl}/?paiement=retour${isTx(tx) ? `&tx=${tx}` : ""}`;
      return new Response(null, { status: 303, headers: { Location: dest } });
    }

    return json(404, { error: "Route inconnue" });
  } catch (e) {
    console.error("pay error", e);
    return json(500, { error: "Erreur serveur paiement" });
  }
};

export const config: Config = {
  path: ["/api/pay/*"],
};

/**
 * Intégration CinetPay (Wave, Orange Money, MTN MoMo, Moov Money).
 * Le SDK "seamless" affiche la demande de paiement directement dans l'app.
 *
 * Activation : créer un compte marchand sur cinetpay.com, récupérer la clé API
 * et le Site ID, les copier dans .env (voir DEPLOYMENT.md).
 * Sans clés, l'app reste en mode démonstration.
 */

const APIKEY = import.meta.env.VITE_CINETPAY_APIKEY as string | undefined;
const SITE_ID = import.meta.env.VITE_CINETPAY_SITE_ID as string | undefined;
const VERIFY_URL = import.meta.env.VITE_CINETPAY_VERIFY_URL as string | undefined;

export const cinetpayReady = Boolean(APIKEY && SITE_ID && VERIFY_URL);

interface CinetPaySDK {
  setConfig: (c: Record<string, unknown>) => void;
  getCheckout: (c: Record<string, unknown>) => void;
  waitResponse: (cb: (data: { status?: string }) => void) => void;
  callMerchantModule?: () => void;
}

declare global {
  interface Window {
    CinetPay?: CinetPaySDK;
  }
}

let loading: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.CinetPay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.cinetpay.com/seamless/main.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Impossible de charger le SDK CinetPay"));
    document.head.appendChild(s);
  });
  return loading;
}

export interface PayOpts {
  transactionId: string;
  amount: number;
  description: string;
  customerName: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export async function payWithCinetPay(o: PayOpts): Promise<void> {
  await loadSdk();
  const CP = window.CinetPay;
  if (!CP) throw new Error("SDK CinetPay indisponible");

  CP.setConfig({
    apikey: APIKEY,
    site_id: Number(SITE_ID),
    notify_url: VERIFY_URL,
    mode: "PRODUCTION",
  });

  CP.getCheckout({
    transaction_id: o.transactionId,
    amount: o.amount,
    currency: "XOF",
    channels: "ALL",
    description: o.description,
    customer_name: o.customerName,
    customer_surname: o.customerName,
    customer_city: "Abidjan",
    customer_country: "CI",
    lang: "fr",
  });

  CP.waitResponse(async (data) => {
    if (data.status !== "ACCEPTED" && data.status !== "SUCCESS") {
      o.onError("Paiement refusé ou annulé");
      return;
    }

    if (!VERIFY_URL) {
      o.onError("Vérification serveur non configurée");
      return;
    }

    try {
      const response = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: o.transactionId }),
      });
      const result = (await response.json()) as { paid?: boolean; status?: string };
      if (response.ok && (result.paid === true || result.status === "ACCEPTED")) o.onSuccess();
      else o.onError("Le paiement n'a pas encore été confirmé");
    } catch {
      o.onError("Impossible de vérifier le paiement. Réessaie dans un instant.");
    }
  });

  CP.callMerchantModule?.();
}

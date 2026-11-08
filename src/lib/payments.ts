/**
 * Paiement Premium côté app.
 * La clé CinetPay reste sur le serveur (fonction Netlify /api/pay/*) :
 * l'app demande un lien de paiement, ouvre le guichet CinetPay, puis fait
 * vérifier le résultat par le serveur avant de débloquer quoi que ce soit.
 */
import type { Plan } from "./store";

const DEVICE_KEY = "ivorycaisse_device";
const PENDING_KEY = "ivorycaisse_pay_pending";

export type PaidPlan = Exclude<Plan, "free">;

/** Identifiant de cet appareil : un paiement n'active Premium que là où il a été lancé. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[a-z0-9]{12,40}$/i.test(id)) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 24);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "nostorage000000";
  }
}

export interface Pending {
  tx: string;
  plan: PaidPlan;
  ts: number;
}

export const getPending = (): Pending | null => {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") as Pending | null;
    /* au-delà de 2 jours, une transaction non confirmée est abandonnée */
    return p && Date.now() - p.ts < 2 * 86400000 ? p : null;
  } catch {
    return null;
  }
};
export const clearPending = () => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};

/** Le paiement en ligne est-il disponible ? (serveur joignable + clés configurées) */
export async function paymentsEnabled(): Promise<boolean> {
  try {
    const r = await fetch("/api/pay/status", { cache: "no-store" });
    if (!r.ok) return false;
    return Boolean(((await r.json()) as { enabled?: boolean }).enabled);
  } catch {
    return false;
  }
}

/** Crée le paiement côté serveur puis ouvre le guichet CinetPay. */
export async function startPayment(plan: PaidPlan, name: string): Promise<void> {
  const r = await fetch("/api/pay/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, device: deviceId(), name }),
  });
  const b = (await r.json().catch(() => ({}))) as { tx?: string; url?: string; error?: string };
  if (!r.ok || !b.tx || !b.url) throw new Error(b.error ?? "Paiement indisponible pour le moment");
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ tx: b.tx, plan, ts: Date.now() } satisfies Pending));
  } catch {
    /* ignore */
  }
  window.location.href = b.url;
}

export type VerifyResult =
  | { status: "paid"; plan: PaidPlan; until: number | null }
  | { status: "pending" }
  | { status: "refused" }
  | { status: "error"; message: string };

export async function verifyPayment(tx: string): Promise<VerifyResult> {
  try {
    const r = await fetch("/api/pay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx, device: deviceId() }),
    });
    const b = (await r.json().catch(() => ({}))) as {
      status?: string;
      plan?: PaidPlan;
      until?: number | null;
      error?: string;
    };
    if (r.status === 404) return { status: "refused" };
    if (!r.ok) return { status: "error", message: b.error ?? "Vérification impossible" };
    if (b.status === "paid" && b.plan) return { status: "paid", plan: b.plan, until: b.until ?? null };
    if (b.status === "refused") return { status: "refused" };
    return { status: "pending" };
  } catch {
    return { status: "error", message: "Pas de connexion. On revérifiera à la prochaine ouverture." };
  }
}

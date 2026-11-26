import { Capacitor } from "@capacitor/core";
import type { Plan, TrialInfo } from "./store";

/**
 * Statistiques anonymes : un identifiant aléatoire par téléphone, la version, le plan et l'état de l'essai.
 * Jamais de nom, de numéro, de montant ni de donnée commerciale.
 */
export const APP_VERSION = "2.10.0";
const API = Capacitor.isNativePlatform() ? "https://ivory-caisse.netlify.app" : "";
const ID_KEY = "ivorycaisse_sid";
const LAST_KEY = "ivorycaisse_sping";
const EVERY = 6 * 3600 * 1000;

const deviceId = () => {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

/** Envoie un signal au plus toutes les 6 h, ou tout de suite si le plan ou l'essai a changé. Silencieux hors ligne. */
export function ping(plan: Plan, trial: TrialInfo) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const id = deviceId();
  if (!id) return;
  const state = trial.active ? "active" : trial.ended ? "ended" : "none";
  const sig = `${plan}|${state}|${APP_VERSION}`;
  try {
    const [ts, oldSig] = (localStorage.getItem(LAST_KEY) ?? "0|").split("#");
    if (oldSig === sig && Date.now() - Number(ts) < EVERY) return;
    localStorage.setItem(LAST_KEY, `${Date.now()}#${sig}`);
  } catch {
    /* ignore */
  }
  void fetch(`${API}/api/stats/ping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, v: APP_VERSION, plan, trial: state, native: Capacitor.isNativePlatform() }),
    keepalive: true,
  }).catch(() => {});
}

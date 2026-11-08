import type { Debt, Product, Txn } from "./store";

/**
 * Sauvegarde cloud via Firebase Firestore.
 * Restauration par "code de sauvegarde" choisi par le commerçant :
 * s'il perd son téléphone, il réinstalle l'app, entre son code, et tout revient.
 *
 * Activation : copier les clés du projet Firebase dans .env (voir DEPLOYMENT.md).
 */

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const cloudReady = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

export interface CloudPayload {
  txns: Txn[];
  debts: Debt[];
  products?: Product[];
  sellers?: string[];
  shop?: string;
  exportedAt: string;
}

async function getDb() {
  if (!cloudReady) throw new Error("Firebase non configuré (clés manquantes dans .env)");
  const { initializeApp, getApps } = await import("firebase/app");
  const { getFirestore } = await import("firebase/firestore");
  const app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return getFirestore(app);
}

const normCode = (code: string): string => code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

export async function backupToCloud(code: string, payload: CloudPayload): Promise<void> {
  const c = normCode(code);
  if (c.length < 4) throw new Error("Le code doit contenir au moins 4 caractères");
  const db = await getDb();
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "backups", c), payload);
}

export async function restoreFromCloud(code: string): Promise<CloudPayload | null> {
  const c = normCode(code);
  if (c.length < 4) throw new Error("Code trop court");
  const db = await getDb();
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "backups", c));
  if (!snap.exists()) return null;
  return snap.data() as CloudPayload;
}

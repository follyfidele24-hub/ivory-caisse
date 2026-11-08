import type { Debt, Product, Profile, Txn } from "./store";

/**
 * Sauvegarde locale en fichier : sans compte, sans internet.
 * Le commerçant l'envoie sur son propre WhatsApp / Drive / e-mail.
 */

export interface BackupFile {
  app: "ivory-caisse";
  version: 1;
  exportedAt: string;
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
  sellers: string[];
}

export const BACKUP_EVERY_DAYS = 7;

export function buildBackup(d: Omit<BackupFile, "app" | "version" | "exportedAt">): BackupFile {
  return { app: "ivory-caisse", version: 1, exportedAt: new Date().toISOString(), ...d };
}

const fileName = (shop?: string) =>
  `ivory-caisse-${(shop ?? "boutique").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

/** Partage le fichier (WhatsApp, Drive…) si possible, sinon le télécharge. */
export async function saveBackup(b: BackupFile): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = new Blob([JSON.stringify(b)], { type: "application/json" });
  const name = fileName(b.profile?.shop);
  const file = new File([blob], name, { type: "application/json" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Sauvegarde Ivory Caisse" });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";

/** Lit et vérifie un fichier de sauvegarde. Lève une erreur lisible si invalide. */
export async function readBackup(file: File): Promise<BackupFile> {
  if (file.size > 25 * 1024 * 1024) throw new Error("Fichier trop gros");
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Ivory Caisse");
  }
  const o = raw as Partial<BackupFile>;
  if (!o || typeof o !== "object" || !Array.isArray(o.txns) || !Array.isArray(o.debts)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Ivory Caisse");
  }
  const txns = o.txns.filter(
    (t): t is Txn =>
      !!t && isStr(t.id) && (t.type === "sale" || t.type === "expense") && isNum(t.amount) && isNum(t.ts)
  );
  if (txns.length !== o.txns.length) throw new Error("Sauvegarde abîmée : certains mouvements sont illisibles");
  return {
    app: "ivory-caisse",
    version: 1,
    exportedAt: isStr(o.exportedAt) ? o.exportedAt : "",
    profile: o.profile ?? null,
    txns,
    debts: o.debts as Debt[],
    products: Array.isArray(o.products) ? (o.products as Product[]) : [],
    sellers: Array.isArray(o.sellers) ? o.sellers.filter(isStr) : [],
  };
}

/** Jours depuis la dernière sauvegarde (ou depuis la création du compte). */
export const daysSinceBackup = (p: Profile | null): number => {
  if (!p) return 0;
  const ref = p.lastBackup ?? p.created;
  return Math.floor((Date.now() - ref) / 86400000);
};

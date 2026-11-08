import { fmtF, fullDate, timeOf } from "./format";
import type { Product, Profile, Txn } from "./store";

const clean = (s: string): string => s.replace(/[\u202F\u00A0]/g, " ");
const m = (n: number): string => clean(fmtF(n));

/* ---------------- Reçu PDF (format ticket 80 mm) ---------------- */

export async function exportReceiptPDF(txn: Txn, profile: Profile | null) {
  const { jsPDF } = await import("jspdf");
  const w = 226; // ~80mm
  const nItems = txn.items?.length ?? 0;
  const doc = new jsPDF({ unit: "pt", format: [w, 400 + Math.max(0, nItems - 1) * 22] });
  let y = 26;

  /* En-tête */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(clean(profile?.shop ?? "MA BOUTIQUE"), w / 2, y, { align: "center" });
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 118);
  doc.text(clean(profile?.name ?? ""), w / 2, y, { align: "center" });
  y += 11;
  doc.text("Abidjan - Cote d'Ivoire", w / 2, y, { align: "center" });
  y += 13;

  /* Séparateur */
  doc.setDrawColor(200, 198, 192);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y, w - 14, y);
  doc.setLineDashPattern([], 0);
  y += 14;

  /* Métadonnées */
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 98);
  doc.text(clean(fullDate(txn.ts)), 14, y);
  doc.text(clean(timeOf(txn.ts)), w - 14, y, { align: "right" });
  y += 10;
  doc.text(clean(`N° ${txn.id.toUpperCase()}`), 14, y);
  if (txn.seller) {
    doc.text(clean(`Par ${txn.seller}`), w - 14, y, { align: "right" });
  }
  y += 15;

  /* Lignes article */
  doc.setTextColor(25, 25, 30);
  if (txn.items && txn.items.length) {
    for (const it of txn.items) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const n = clean(it.name);
      doc.text(n.length > 22 ? n.slice(0, 22) + "..." : n, 14, y);
      doc.text(m(it.qty * it.price), w - 14, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 118);
      doc.text(clean(`${it.qty} x ${fmtF(it.price)}`), 14, y + 9);
      doc.setTextColor(25, 25, 30);
      y += 22;
    }
    y += 2;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const label = clean(txn.note || txn.category);
    doc.text(label.length > 24 ? label.slice(0, 24) + "..." : label, 14, y);
    doc.setFont("helvetica", "normal");
    y += 18;
  }

  /* Séparateur */
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y - 8, w - 14, y - 8);
  doc.setLineDashPattern([], 0);

  /* Total */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL", 14, y + 4);
  doc.setFontSize(15);
  doc.text(m(txn.amount), w - 14, y + 5, { align: "right" });
  y += 24;

  /* Type */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 118);
  doc.text(clean(txn.type === "sale" ? "Vente reglee" : "Depense"), 14, y);
  y += 22;

  /* Pied */
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y, w - 14, y);
  doc.setLineDashPattern([], 0);
  y += 14;
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 98);
  doc.text("Merci de votre visite !", w / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 158);
  doc.text(clean("Ivory Caisse · édité par Ivory Gestion"), w / 2, y, { align: "center" });

  doc.save(`recu-${txn.id}-${new Date(txn.ts).toISOString().slice(0, 10)}.pdf`);
}

/* ---------------- Reçu texte pour WhatsApp ---------------- */

export function receiptText(txn: Txn, profile: Profile | null): string {
  const lines = [
    `*${profile?.shop ?? "MA BOUTIQUE"}*`,
    clean(fullDate(txn.ts)) + " · " + clean(timeOf(txn.ts)),
    "",
    ...(txn.items?.length
      ? txn.items.map((it) => `${clean(it.name)} — ${it.qty} × ${m(it.price)} = ${m(it.qty * it.price)}`)
      : [clean(txn.note || txn.category)]),
    `*TOTAL : ${m(txn.amount)}*`,
  ];
  if (txn.seller) lines.push(`Encaisse par ${txn.seller}`);
  lines.push("", "_Merci de votre visite !_", "N° " + txn.id.toUpperCase());
  return lines.join("\n");
}

export async function shareText(
  text: string,
  title: string
): Promise<"shared" | "copied" | "cancelled"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "cancelled";
  }
}

export async function shareReceipt(txn: Txn, profile: Profile | null): Promise<"shared" | "copied" | "cancelled"> {
  return shareText(receiptText(txn, profile), `Reçu — ${profile?.shop ?? "Ivory Caisse"}`);
}

/* ---------------- Bilan du jour (clôture de caisse) ---------------- */

export interface DaySummaryInput {
  shop: string;
  date: string;
  sales: number;
  expenses: number;
  profit: number;
  count: number;
  topSale: { note: string; amount: number } | null;
  owed: number;
  goalPct: number | null;
}

export function dayCloseText(o: DaySummaryInput): string {
  const lines = [
    `*BILAN DU JOUR — ${o.shop}*`,
    o.date,
    "",
    `Ventes : ${m(o.sales)} (${o.count} mouvement${o.count > 1 ? "s" : ""})`,
    `Dépenses : ${m(o.expenses)}`,
    `Profit : *${m(o.profit)}*`,
  ];
  if (o.topSale) lines.push("", `Meilleure vente : ${o.topSale.note} (${m(o.topSale.amount)})`);
  if (o.goalPct !== null) lines.push(`Objectif du jour : ${o.goalPct}% ${o.goalPct >= 100 ? "atteint" : ""}`.trim());
  if (o.owed > 0) lines.push(`Crédits clients en cours : ${m(o.owed)}`);
  lines.push("", "_Clôturé avec Ivory Caisse_");
  return lines.join("\n");
}

/* ---------------- Réassort stock via WhatsApp ---------------- */

export function reorderMessage(items: Product[], shop: string): string {
  const list = items.map((p) => `• ${p.name} — reste ${p.stock}`).join("\n");
  return `*Réassort à prévoir* — ${shop}\n\n${list}\n\n_Généré avec Ivory Caisse_`;
}

import { fmtF, startOfDay } from "./format";
import { debtBalance, type Debt, type Product, type Profile, type Txn } from "./store";

/* Dossier d'activité sur 12 mois, pour une microfinance, une banque ou une tontine.
   Réservé aux licences Annuel et À vie. Tout est calculé à partir des données du téléphone. */

const clean = (s: string): string => s.replace(/[  ]/g, " ");
const m = (n: number): string => clean(fmtF(n));
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export interface MonthRow {
  label: string;
  sales: number;
  expenses: number;
  result: number;
  activeDays: number;
}

export function dossierData(txns: Txn[], debts: Debt[], products: Product[], now = Date.now()) {
  const d = new Date(now);
  const months: MonthRow[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(d.getFullYear(), d.getMonth() - i, 1).getTime();
    const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 1).getTime();
    let sales = 0;
    let expenses = 0;
    const days = new Set<number>();
    for (const t of txns) {
      if (t.ts < start || t.ts >= end) continue;
      if (t.type === "sale") {
        sales += t.amount;
        days.add(startOfDay(t.ts));
      } else expenses += t.amount;
    }
    const md = new Date(start);
    months.push({
      label: `${MONTHS[md.getMonth()]} ${String(md.getFullYear()).slice(2)}`,
      sales,
      expenses,
      result: sales - expenses,
      activeDays: days.size,
    });
  }
  const withActivity = months.filter((r) => r.sales > 0 || r.expenses > 0);
  const sum = (k: keyof Omit<MonthRow, "label">) => months.reduce((s, r) => s + r[k], 0);
  const best = withActivity.reduce<MonthRow | null>((b, r) => (!b || r.sales > b.sales ? r : b), null);
  const receivables = debts.filter((x) => (x.dir ?? "credit") === "credit").reduce((s, x) => s + Math.max(0, debtBalance(x)), 0);
  const payables = debts.filter((x) => x.dir === "debt").reduce((s, x) => s + Math.max(0, debtBalance(x)), 0);
  const stockValue = products.reduce((s, p) => s + p.cost * p.stock, 0);
  return {
    months,
    activeMonths: withActivity.length,
    sales: sum("sales"),
    expenses: sum("expenses"),
    result: sum("result"),
    activeDays: sum("activeDays"),
    avgSales: withActivity.length ? Math.round(sum("sales") / withActivity.length) : 0,
    best,
    receivables,
    payables,
    stockValue,
  };
}

export async function exportDossierPDF(opts: {
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
}) {
  const { jsPDF } = await import("jspdf");
  const data = dossierData(opts.txns, opts.debts, opts.products);
  const p = opts.profile;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 46;
  const INK: [number, number, number] = [20, 26, 51];
  const MUTED: [number, number, number] = [89, 96, 122];

  /* En-tête */
  doc.setFillColor(22, 35, 92);
  doc.rect(0, 0, W, 104, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(clean(p?.shop || "Ma boutique"), M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const who = [p?.name, p?.receipt?.city, p?.receipt?.phone ? `Tél. ${p.receipt.phone}` : ""].filter(Boolean).join("  ·  ");
  doc.text(clean(who), M, 64);
  doc.setFontSize(9);
  const first = data.months[0].label;
  const last = data.months[11].label;
  doc.text(clean(`Dossier d'activité  ·  ${first} à ${last}  ·  édité le ${new Date().toLocaleDateString("fr-FR")}`), M, 84);

  /* Synthèse */
  let y = 140;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Synthèse sur 12 mois", M, y);
  y += 20;
  const rows: [string, string][] = [
    ["Chiffre d'affaires (ventes encaissées)", m(data.sales)],
    ["Dépenses enregistrées", m(data.expenses)],
    ["Résultat (ventes - dépenses)", m(data.result)],
    ["Ventes moyennes par mois d'activité", m(data.avgSales)],
    ["Meilleur mois", data.best ? clean(`${data.best.label} (${m(data.best.sales)})`) : "-"],
    ["Mois avec activité", `${data.activeMonths} sur 12`],
    ["Jours avec au moins une vente", String(data.activeDays)],
    ["Crédits clients à récupérer", m(data.receivables)],
    ["Dettes fournisseurs en cours", m(data.payables)],
    ["Valeur du stock (prix d'achat)", m(data.stockValue)],
  ];
  doc.setFontSize(10);
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(242, 244, 248);
      doc.rect(M, y - 12, W - M * 2, 20, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(clean(k), M + 8, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(v, W - M - 8, y + 2, { align: "right" });
    y += 20;
  });

  /* Graphique des ventes mensuelles */
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Ventes par mois", M, y);
  y += 14;
  const chartH = 120;
  const maxV = Math.max(1, ...data.months.map((r) => r.sales));
  const bw = (W - M * 2) / 12;
  data.months.forEach((r, i) => {
    const h = Math.round((r.sales / maxV) * chartH);
    doc.setFillColor(200, 73, 13);
    doc.rect(M + i * bw + 6, y + chartH - h, bw - 12, h, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(clean(r.label), M + i * bw + bw / 2, y + chartH + 12, { align: "center" });
  });
  y += chartH + 34;

  /* Tableau mensuel */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Détail mensuel", M, y);
  y += 18;
  const cols = [M + 8, M + 140, M + 260, M + 380, W - M - 8];
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  ["MOIS", "VENTES", "DÉPENSES", "RÉSULTAT", "JOURS ACTIFS"].forEach((h, i) =>
    doc.text(clean(h), cols[i], y, { align: i === 0 ? "left" : "right" }),
  );
  y += 6;
  doc.setDrawColor(210, 214, 224);
  doc.line(M, y, W - M, y);
  y += 14;
  doc.setFontSize(9);
  for (const r of data.months) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(clean(r.label), cols[0], y);
    doc.text(m(r.sales), cols[1], y, { align: "right" });
    doc.text(m(r.expenses), cols[2], y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r.result >= 0 ? 8 : 179, r.result >= 0 ? 107 : 18, r.result >= 0 ? 72 : 58);
    doc.text(m(r.result), cols[3], y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(String(r.activeDays), cols[4], y, { align: "right" });
    y += 16;
  }

  /* Mention d'honnêteté : le prêteur doit savoir d'où viennent les chiffres */
  y += 16;
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const note = doc.splitTextToSize(
    clean(
      "Chiffres issus des enregistrements quotidiens du commerçant dans l'application Ivory Caisse (ventes, dépenses, crédits, stock). " +
        "Document non audité, établi à la date indiquée. Ivory Caisse est édité par Ivory Gestion, Cocody, Abidjan.",
    ),
    W - M * 2,
  );
  doc.text(note, M, y);

  doc.save(`dossier-activite-${(p?.shop || "boutique").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

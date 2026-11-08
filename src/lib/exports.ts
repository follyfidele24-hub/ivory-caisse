import { fmtF, shortDate, timeOf } from "./format";
import { getCurrency } from "./currency";
import { debtBalance, totals, type Debt, type Profile, type Txn } from "./store";

/* jsPDF ne gère pas les espaces fines insécables de Intl */
const clean = (s: string): string => s.replace(/[\u202F\u00A0]/g, " ");
/* montant complet nettoyé (avec symbole de la devise active) */
const m = (n: number): string => clean(fmtF(n));

export interface ReportOpts {
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  label: string;
  from: number;
  to: number;
}

const inRange = (txns: Txn[], from: number, to: number): Txn[] =>
  txns.filter((t) => t.ts >= from && t.ts <= to);

const fileStamp = (): string => new Date().toISOString().slice(0, 10);

/* ------------------------------ PDF ------------------------------ */

export async function exportReportPDF({ profile, txns, debts, label, from, to }: ReportOpts) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const rows = inRange(txns, from, to);
  const agg = totals(txns, from, to);

  /* Bandeau */
  doc.setFillColor(255, 122, 26);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("IVORY CAISSE", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(clean(`${profile?.shop ?? "Ma boutique"}  ·  ${profile?.name ?? ""}`), M, 58);
  doc.setFontSize(9);
  doc.text(clean(`Rapport ${label}  ·  du ${shortDate(from)} au ${shortDate(to)}`), M, 75);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GENERE HORS-LIGNE", W - M, 38, { align: "right" });

  /* Totaux */
  let y = 128;
  const boxW = (W - M * 2 - 24) / 3;
  const boxes: [string, number, [number, number, number]][] = [
    ["VENTES", agg.sales, [34, 153, 84]],
    ["DEPENSES", agg.expenses, [200, 60, 80]],
    ["PROFIT", agg.profit, [230, 120, 30]],
  ];
  boxes.forEach(([title, val, [r, g, b]], i) => {
    const x = M + i * (boxW + 12);
    doc.setFillColor(245, 243, 238);
    doc.roundedRect(x, y, boxW, 58, 8, 8, "F");
    doc.setTextColor(120, 120, 130);
    doc.setFontSize(7.5);
    doc.text(title, x + 12, y + 18);
    doc.setTextColor(r, g, b);
    doc.setFontSize(13);
    doc.text(m(val), x + 12, y + 40);
  });
  y += 88;

  /* Table des mouvements */
  doc.setTextColor(30, 30, 35);
  doc.setFontSize(12);
  doc.text("Mouvements", M, y);
  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 150);
  doc.text("DATE", M, y);
  doc.text("TYPE", M + 78, y);
  doc.text("DETAIL", M + 140, y);
  doc.text("MONTANT", W - M, y, { align: "right" });
  y += 6;
  doc.setDrawColor(230, 228, 222);
  doc.line(M, y, W - M, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  for (const t of rows) {
    if (y > H - 70) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 100);
    doc.text(clean(`${shortDate(t.ts)} ${timeOf(t.ts)}`), M, y);
    doc.setTextColor(30, 30, 35);
    doc.text(t.type === "sale" ? "Vente" : "Depense", M + 78, y);
    const detail = clean(`${t.category}${t.note ? " — " + t.note : ""}`);
    doc.text(detail.length > 42 ? detail.slice(0, 42) + "…" : detail, M + 140, y);
    if (t.type === "sale") doc.setTextColor(34, 153, 84);
    else doc.setTextColor(200, 60, 80);
    doc.setFont("helvetica", "bold");
    doc.text(`${t.type === "sale" ? "+" : "-"}${m(t.amount)}`, W - M, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 17;
  }
  if (rows.length === 0) {
    doc.setTextColor(140, 140, 150);
    doc.text(clean("Aucun mouvement sur la période."), M, y);
    y += 17;
  }

  /* Crédits clients */
  if (y > H - 160) {
    doc.addPage();
    y = 60;
  }
  y += 16;
  doc.setTextColor(30, 30, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(clean("Crédits clients"), M, y);
  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 150);
  doc.text("CLIENT", M, y);
  doc.text("CREDIT", M + 200, y);
  doc.text("REMBOURSE", M + 290, y);
  doc.text("RESTE", W - M, y, { align: "right" });
  y += 6;
  doc.line(M, y, W - M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  debts.forEach((d) => {
    if (y > H - 60) {
      doc.addPage();
      y = 60;
    }
    const credit = d.entries.reduce((s, e) => s + e.amount, 0);
    const paid = d.payments.reduce((s, p) => s + p.amount, 0);
    const rest = debtBalance(d);
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 35);
    doc.text(clean(d.name), M, y);
    doc.text(m(credit), M + 200, y);
    doc.text(m(paid), M + 290, y);
    doc.setTextColor(rest > 0 ? 200 : 34, rest > 0 ? 60 : 153, rest > 0 ? 80 : 84);
    doc.setFont("helvetica", "bold");
    doc.text(rest > 0 ? m(rest) : "Solde", W - M, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 17;
  });

  /* Pied de page */
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 168);
  doc.text(
    clean(`Ivory Caisse · édité par Ivory Gestion · ${new Date().toLocaleDateString("fr-FR")}`),
    W / 2,
    H - 24,
    { align: "center" }
  );

  doc.save(`ivory-caisse-${label.replace(/\s/g, "-")}-${fileStamp()}.pdf`);
}

/* ------------------------------ Excel ------------------------------ */

export async function exportReportExcel({ profile, txns, debts, label, from, to }: ReportOpts) {
  const XLSX = await import("xlsx");
  const rows = inRange(txns, from, to);
  const agg = totals(txns, from, to);
  const code = getCurrency().code;

  const resume = [
    { Indicateur: "Boutique", Valeur: profile?.shop ?? "Ma boutique" },
    { Indicateur: "Commerçant", Valeur: profile?.name ?? "" },
    { Indicateur: "Période", Valeur: `${shortDate(from)} → ${shortDate(to)}` },
    { Indicateur: `Ventes (${code})`, Valeur: agg.sales },
    { Indicateur: `Dépenses (${code})`, Valeur: agg.expenses },
    { Indicateur: `Profit (${code})`, Valeur: agg.profit },
    { Indicateur: "Nb mouvements", Valeur: rows.length },
    { Indicateur: "Devise", Valeur: `${getCurrency().code} (${getCurrency().label})` },
  ];

  const mouvements = rows.map((t) => ({
    Date: shortDate(t.ts),
    Heure: timeOf(t.ts),
    Type: t.type === "sale" ? "Vente" : "Dépense",
    Catégorie: t.category,
    Note: t.note,
    [`Montant (${code})`]: t.type === "sale" ? t.amount : -t.amount,
  }));

  const credits = debts.map((d) => ({
    Client: d.name,
    Téléphone: d.phone ? `+225 ${d.phone}` : "",
    [`Crédit total (${code})`]: d.entries.reduce((s, e) => s + e.amount, 0),
    [`Remboursé (${code})`]: d.payments.reduce((s, p) => s + p.amount, 0),
    [`Reste à payer (${code})`]: debtBalance(d),
  }));

  const wb = XLSX.utils.book_new();
  const wsR = XLSX.utils.json_to_sheet(resume);
  wsR["!cols"] = [{ wch: 22 }, { wch: 34 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Résumé");
  const wsM = XLSX.utils.json_to_sheet(mouvements.length ? mouvements : [{ Info: "Aucun mouvement" }]);
  wsM["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsM, "Mouvements");
  const wsC = XLSX.utils.json_to_sheet(credits.length ? credits : [{ Info: "Aucun client" }]);
  wsC["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsC, "Crédits");

  XLSX.writeFile(wb, `ivory-caisse-${label.replace(/\s/g, "-")}-${fileStamp()}.xlsx`);
}

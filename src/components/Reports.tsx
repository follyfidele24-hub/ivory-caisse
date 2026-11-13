import { lazy, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, Flame, Lock, Receipt, TrendingUp } from "lucide-react";
import { DAY, dayLetter, fmtF, shortDate, startOfDay, sym } from "../lib/format";
import { exportReportExcel, exportReportPDF } from "../lib/exports";
import { kFmt, Btn, Seg, Toast } from "./ui";
const TrendChart = lazy(() => import("./Charts").then((m) => ({ default: m.TrendChart })));
const CategoryDonut = lazy(() => import("./Charts").then((m) => ({ default: m.CategoryDonut })));
const ChartSkeleton = ({ h }: { h: number }) => (
  <div className="h-full animate-pulse rounded-2xl bg-fg/[0.04]" style={{ minHeight: h }} aria-hidden="true" />
);
import { totals, useStore, type Product, type Txn } from "../lib/store";

type Range = "day" | "week" | "month";

/* Marge par article sur la période, à partir des ventes liées au stock.
   Prix d'achat : celui enregistré au moment de la vente, sinon le prix d'achat actuel. */
function productMargins(txns: Txn[], products: Product[], from: number) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const acc = new Map<string, { name: string; qty: number; ca: number; marge: number }>();
  txns.forEach((t) => {
    if (t.type !== "sale" || t.ts < from || !t.items) return;
    t.items.forEach((it) => {
      const key = it.productId ?? it.name;
      const cost = it.cost ?? (it.productId ? byId.get(it.productId)?.cost : undefined) ?? 0;
      const row = acc.get(key) ?? { name: it.name, qty: 0, ca: 0, marge: 0 };
      row.qty += it.qty;
      row.ca += it.qty * it.price;
      row.marge += it.qty * (it.price - cost);
      acc.set(key, row);
    });
  });
  return [...acc.values()].sort((a, b) => b.marge - a.marge);
}

export default function Reports({ onPremium }: { onPremium: () => void }) {
  const { txns, debts, profile, products } = useStore();
  const [range, setRange] = useState<Range>("week");
  const [toast, setToast] = useState<string | null>(null);

  const now = Date.now();
  const today = startOfDay(now);
  const days = range === "day" ? 1 : range === "week" ? 7 : 30;
  const from = today - (days - 1) * DAY;

  const agg = useMemo(() => totals(txns, from, now + 1000), [txns, from, now]);
  const margins = useMemo(() => productMargins(txns, products, from), [txns, products, from]);

  const series = useMemo(() => {
    const labels: string[] = [];
    const sales: number[] = [];
    const expenses: number[] = [];
    if (range === "day") {
      const slots: [string, number, number][] = [
        ["Matin", 5, 12],
        ["Midi", 12, 15],
        ["Soir", 15, 19],
        ["Nuit", 19, 29],
      ];
      slots.forEach(([label, h0, h1]) => {
        labels.push(label);
        let s = 0;
        let e = 0;
        txns.forEach((t) => {
          if (t.ts < from) return;
          const h = new Date(t.ts).getHours();
          if (h >= h0 && h < h1) {
            if (t.type === "sale") s += t.amount;
            else e += t.amount;
          }
        });
        sales.push(s);
        expenses.push(e);
      });
    } else {
      for (let i = 0; i < days; i++) {
        const s = from + i * DAY;
        const t = totals(txns, s, Math.min(s + DAY, now + 1000));
        labels.push(range === "week" ? dayLetter(s) : `${new Date(s).getDate()}`);
        sales.push(t.sales);
        expenses.push(t.expenses);
      }
    }
    return { labels, sales, expenses };
  }, [txns, range, from, days, now]);

  const bestDay = useMemo(() => {
    let best = { ts: from, value: -Infinity };
    for (let i = 0; i < days; i++) {
      const s = from + i * DAY;
      const p = totals(txns, s, Math.min(s + DAY, now + 1000)).profit;
      if (p > best.value) best = { ts: s, value: p };
    }
    return best.value === -Infinity ? null : best;
  }, [txns, from, days, now]);

  const expByCat = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((t) => {
      if (t.ts >= from && t.type === "expense") map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [txns, from]);

  const team = useMemo(() => {
    const map = new Map<string, number>();
    txns.forEach((t) => {
      if (t.ts >= from && t.type === "sale") {
        const k = t.seller ?? "Moi";
        map.set(k, (map.get(k) ?? 0) + t.amount);
      }
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [txns, from]);

  const isFree = profile?.plan === "free";
  const txCount = txns.filter((t) => t.ts >= from).length;
  const avgDay = days > 1 ? Math.round(agg.sales / days) : agg.sales;
  const rangeLabel = range === "day" ? "jour" : range === "week" ? "semaine" : "mois";

  /* Dossier d'activité 12 mois : licences Annuel et À vie */
  const canDossier = profile?.plan === "year" || profile?.plan === "life";
  const tryDossier = async () => {
    if (!canDossier) {
      onPremium();
      return;
    }
    try {
      setToast("Préparation du dossier…");
      const { exportDossierPDF } = await import("../lib/dossier");
      await exportDossierPDF({ profile, txns, debts, products });
      setToast("Dossier 12 mois téléchargé");
    } catch {
      setToast("Export impossible sur ce téléphone");
    }
    window.setTimeout(() => setToast(null), 2200);
  };

  const tryExport = async (kind: "pdf" | "excel") => {
    if (isFree) {
      onPremium();
      return;
    }
    try {
      const opts = { profile, txns, debts, label: rangeLabel, from, to: now };
      setToast("Préparation du fichier…");
      if (kind === "pdf") await exportReportPDF(opts);
      else await exportReportExcel(opts);
      setToast(`Rapport ${kind === "pdf" ? "PDF" : "Excel"} téléchargé`);
    } catch {
      setToast("Export impossible sur ce téléphone");
    }
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="pb-32">
      <Toast message={toast} kind="info" />
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Rapports</h1>
        <p className="text-xs text-muted">Tes chiffres, sans détour.</p>
      </div>

      <Seg
        id="range"
        options={[
          { id: "day", label: "Jour" },
          { id: "week", label: "Semaine" },
          { id: "month", label: isFree ? "Mois · Premium" : "Mois" },
        ]}
        value={range}
        onChange={(r) => (r === "month" && isFree ? onPremium() : setRange(r))}
      />

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {[
          { label: "Ventes", value: agg.sales, cls: "text-mint" },
          { label: "Dépenses", value: agg.expenses, cls: "text-rose" },
          { label: "Profit", value: agg.profit, cls: agg.profit >= 0 ? "text-brand2" : "text-rose" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-3.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{s.label}</p>
            <p className={`mt-1 truncate font-display text-base font-extrabold tabular-nums ${s.cls}`} title={fmtF(s.value)}>
              {kFmt(s.value)}{sym()}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        key={`chart-${range}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mt-4 p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {range === "day" ? "Journée en cours" : `Évolution sur ${days} jours`}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Ventes
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose">
              <span className="h-1.5 w-1.5 rounded-full bg-rose" /> Dépenses
            </span>
          </div>
        </div>
        <div className="h-52">
          <Suspense fallback={<ChartSkeleton h={200} />}>
            <TrendChart labels={series.labels} sales={series.sales} expenses={series.expenses} />
          </Suspense>
        </div>
      </motion.div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="card flex flex-col gap-1.5 p-3.5">
          <Flame size={15} className="text-brand2" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Meilleur profit</p>
          {bestDay ? (
            <p className="font-display text-xs font-extrabold leading-tight">
              {kFmt(bestDay.value)}
              {sym()}
              <span className="block text-[11px] font-semibold text-muted">{shortDate(bestDay.ts)}</span>
            </p>
          ) : (
            <p className="font-display text-xs font-extrabold">—</p>
          )}
        </div>
        <div className="card flex flex-col gap-1.5 p-3.5">
          <TrendingUp size={15} className="text-mint" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Moyenne/jour</p>
          <p className="truncate font-display text-xs font-extrabold">{kFmt(avgDay)}{sym()}</p>
        </div>
        <div className="card flex flex-col gap-1.5 p-3.5">
          <Receipt size={15} className="text-sky-300" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Mouvements</p>
          <p className="font-display text-xs font-extrabold">{txCount}</p>
        </div>
      </div>

      {expByCat.length > 0 && (
        <div className="card mt-4 p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">Où part l'argent</p>
          <div className="h-44">
            <Suspense fallback={<ChartSkeleton h={180} />}>
              <CategoryDonut labels={expByCat.map(([c]) => c)} values={expByCat.map(([, v]) => v)} />
            </Suspense>
          </div>
        </div>
      )}

      {team.some(([k]) => k !== "Moi") && (
        <div className="card mt-4 p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">Encaissements par membre</p>
          <div className="space-y-3.5">
            {team.map(([member, v]) => (
              <div key={member}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold">{member}</span>
                  <span className="font-bold text-mint tabular-nums">{fmtF(v)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-fg/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / (team[0]?.[1] ?? 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="h-full rounded-full bg-gradient-to-r from-mint/50 to-mint"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marge par article (Premium) : quels articles rapportent vraiment */}
      {margins.length > 0 && (
        <section aria-label="Marge par article" className="card mt-4 p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base font-extrabold">Ce qui rapporte vraiment</h2>
            {!isFree && (
              <span className="text-xs font-semibold text-muted tabular-nums">
                marge totale {fmtF(margins.reduce((s, m) => s + m.marge, 0))}
              </span>
            )}
          </div>
          {isFree ? (
            <>
              <p className="text-sm text-muted">
                {margins.length} article{margins.length > 1 ? "s" : ""} vendu{margins.length > 1 ? "s" : ""} depuis le stock sur
                la période. Le Premium te montre la marge de chacun et ton top 5.
              </p>
              <button
                onClick={onPremium}
                className="tap btn-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 text-sm font-bold text-brand2"
              >
                <Lock size={14} aria-hidden="true" /> Voir mes marges · Premium
              </button>
            </>
          ) : (
            <ol className="divide-y divide-line">
              {margins.slice(0, 5).map((m, i) => (
                <li key={m.name} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 font-display text-sm font-extrabold text-brand2 tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{m.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {m.qty} vendu{m.qty > 1 ? "s" : ""} · {fmtF(m.ca)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-sm font-extrabold tabular-nums ${m.marge >= 0 ? "text-mint" : "text-rose"}`}>
                      {fmtF(m.marge)}
                    </p>
                    <p className="text-[11px] font-semibold text-muted tabular-nums">
                      {m.ca > 0 ? Math.round((m.marge / m.ca) * 100) : 0} % de marge
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="card mt-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Exporter ce rapport</p>
          {isFree && (
            <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-brand2">
              <Lock size={10} /> Premium
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="soft" onClick={() => tryExport("pdf")}>
            <FileText size={16} className="text-rose" /> PDF
          </Btn>
          <Btn variant="soft" onClick={() => tryExport("excel")}>
            <FileSpreadsheet size={16} className="text-mint" /> Excel
          </Btn>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          {isFree ? "Passe Premium pour exporter vers ta banque ou ta tontine." : "Le fichier se télécharge directement sur ton téléphone."}
        </p>
      </div>

      {/* Dossier microfinance (Annuel, À vie) */}
      <section aria-label="Dossier d'activité 12 mois" className="card mt-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-extrabold">Dossier pour un prêt</h2>
          {!canDossier && (
            <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-brand2">
              <Lock size={10} aria-hidden="true" /> Annuel
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          12 mois de ventes, dépenses, résultat, crédits clients et stock, dans un PDF à montrer à ta microfinance,
          ta banque ou ta tontine.
        </p>
        <Btn variant={canDossier ? "brand" : "soft"} className="mt-3 w-full py-3" onClick={tryDossier}>
          <FileText size={16} aria-hidden="true" /> {canDossier ? "Télécharger mon dossier 12 mois" : "Débloquer avec l'offre Annuelle"}
        </Btn>
      </section>
    </div>
  );
}

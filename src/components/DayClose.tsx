import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Copy,
  MapPin,
  Receipt,
  Share2,
  Target,
  X,
} from "lucide-react";
import { dayCloseText, shareText } from "../lib/receipt";
import { fmt, fmtF, longDate, startOfDay, sym } from "../lib/format";
import { debtBalance, totals, useStore } from "../lib/store";
import { Btn } from "./ui";

export default function DayClose({ onClose }: { onClose: () => void }) {
  const { txns, debts, profile } = useStore();
  const [status, setStatus] = useState<"idle" | "shared" | "copied">("idle");

  const now = Date.now();
  const today = startOfDay(now);
  const t = useMemo(() => totals(txns, today, now + 1000), [txns, today, now]);

  const todayMoves = useMemo(() => txns.filter((x) => x.ts >= today), [txns, today]);
  const topSale = useMemo<{ note: string; amount: number } | null>(() => {
    let best: { note: string; amount: number } | null = null;
    for (const x of todayMoves) {
      if (x.type === "sale" && (best === null || x.amount > best.amount)) {
        best = { note: x.note || x.category, amount: x.amount };
      }
    }
    return best;
  }, [todayMoves]);

  const owed = debts.reduce((s, d) => s + Math.max(0, (d.dir ?? "credit") === "credit" ? debtBalance(d) : 0), 0);
  const goal = profile?.dailyGoal ?? 0;
  const goalPct = goal > 0 ? Math.round((t.sales / goal) * 100) : null;

  const text = dayCloseText({
    shop: profile?.shop ?? "Ma boutique",
    date: longDate(today),
    sales: t.sales,
    expenses: t.expenses,
    profit: t.profit,
    count: todayMoves.length,
    topSale,
    owed,
    goalPct,
  });

  const share = async () => {
    const r = await shareText(text, `Bilan du jour — ${profile?.shop ?? "Ivory Caisse"}`);
    if (r !== "cancelled") {
      setStatus(r);
      if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
      window.setTimeout(() => setStatus("idle"), 2600);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2600);
    } catch {
      /* indisponible */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink no-scrollbar"
    >
      <div className="pointer-events-none fixed -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/15 blur-[110px]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
          <span className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-brand2">
            <ClipboardCheck size={12} /> Clôture
          </span>
        </div>

        <div className="mt-8 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted">
            <MapPin size={11} /> {profile?.shop ?? "Ma boutique"} · {longDate(today)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Bilan de la journée</h1>
        </div>

        {/* Profit */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-6 rounded-[1.8rem] bg-gradient-to-br from-action via-action to-action2 p-6 text-center shadow-[0_20px_50px_-20px_rgba(255,122,26,0.55)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">Profit du jour</p>
          <p className="mt-1 font-display text-[2.8rem] font-extrabold leading-none tabular-nums text-white">
            {fmtF(t.profit)}
          </p>
          {goalPct !== null && (
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              goalPct >= 100 ? "bg-mint text-on-mint" : "bg-white/15 text-white"
            }`}>
              <Target size={12} /> Objectif : {goalPct}% {goalPct >= 100 ? "— atteint !" : ""}
            </span>
          )}
        </motion.div>

        {/* Détails */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mint">
              <ArrowUpRight size={11} /> Ventes
            </div>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{fmt(t.sales)}{sym()}</p>
            <p className="text-[10px] text-muted">{todayMoves.filter((x) => x.type === "sale").length} encaissements</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose">
              <ArrowDownRight size={11} /> Dépenses
            </div>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{fmt(t.expenses)}{sym()}</p>
            <p className="text-[10px] text-muted">{todayMoves.filter((x) => x.type === "expense").length} sorties</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand2">
              <Receipt size={11} /> Meilleure vente
            </div>
            <p className="mt-1 truncate font-display text-sm font-extrabold">
              {topSale ? `${fmt(topSale.amount)}${sym()}` : "—"}
            </p>
            <p className="truncate text-[10px] text-muted">{topSale?.note ?? "Aucune vente"}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose">
              <ArrowDownRight size={11} /> Crédits en cours
            </div>
            <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{fmt(owed)}{sym()}</p>
            <p className="text-[10px] text-muted">chez tes clients</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-8">
          <Btn onClick={share} variant="mint" className="w-full py-4 text-base">
            {status === "shared" ? (
              <><Check size={18} /> Bilan partagé !</>
            ) : status === "copied" ? (
              <><Check size={18} /> Copié — colle-le dans WhatsApp</>
            ) : (
              <><Share2 size={18} /> Partager ce bilan</>
            )}
          </Btn>
          <Btn variant="soft" onClick={copy} className="mt-2.5 w-full">
            <Copy size={15} /> Copier le texte
          </Btn>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
            Poste le bilan dans ton groupe WhatsApp ou garde-le en archive : le pro avec la caisse, c'est de toi.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

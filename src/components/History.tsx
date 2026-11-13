import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { DAY, fmtF, fmtSigned, relDay, startOfDay, timeOf } from "../lib/format";
import { useStore, type TxnType, type Txn } from "../lib/store";
import { Seg, Toast } from "./ui";
import { Lock } from "lucide-react";
import TxnDetail from "./TxnDetail";

type TypeFilter = "all" | TxnType;
type Period = "7" | "30" | "all";

export default function History({ onClose, onPremium }: { onClose: () => void; onPremium?: () => void }) {
  const { txns, profile } = useStore();
  /* Gratuit : 30 derniers jours · Premium : historique complet */
  const isFree = profile?.plan === "free";
  const [type, setType] = useState<TypeFilter>("all");
  const [period, setPeriod] = useState<Period>("30");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Txn | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let minTs = 0;
    if (period !== "all") {
      const days = period === "7" ? 7 : 30;
      minTs = startOfDay(Date.now()) - (days - 1) * DAY;
    }
    return txns.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (t.ts < minTs) return false;
      if (needle && !`${t.note} ${t.category} ${t.seller ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [txns, type, period, q]);

  const sum = useMemo(() => {
    let s = 0;
    let e = 0;
    filtered.forEach((t) => (t.type === "sale" ? (s += t.amount) : (e += t.amount)));
    return { s, e };
  }, [filtered]);

  const visible = filtered.slice(0, 200);


  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 flex flex-col bg-ink"
    >
      <div className="pointer-events-none fixed -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/12 blur-[100px]" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {/* En-tête */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-right">
            <h1 className="font-display text-xl font-extrabold tracking-tight">Historique</h1>
            <p className="text-[10px] font-bold text-muted">{filtered.length} mouvement{filtered.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Recherche */}
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-panel px-4 transition-colors focus-within:border-brand/50">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher : riz, pagne, Grâce…"
            className="w-full bg-transparent py-3.5 text-sm font-semibold outline-none placeholder:text-fg/25"
          />
        </div>

        <Seg<TypeFilter>
          id="hist-type"
          options={[
            { id: "all", label: "Tout" },
            { id: "sale", label: "Ventes" },
            { id: "expense", label: "Dépenses" },
          ]}
          value={type}
          onChange={setType}
        />

        <div className="my-3 flex gap-2">
          {(
            [
              ["7", "7 jours"],
              ["30", "30 jours"],
              ["all", "Tout"],
            ] as [Period, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => (id === "all" && isFree ? onPremium?.() : setPeriod(id))}
              className={`tap btn-press flex min-h-11 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                period === id ? "border-brand/50 bg-brand/15 text-brand2" : "border-line bg-panel2 text-muted"
              }`}
            >
              {id === "all" && isFree && <Lock size={11} aria-hidden="true" />}
              {label}
              {id === "all" && isFree && <span className="sr-only"> (Premium)</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-[10px] font-bold">
            <span className="text-mint tabular-nums">+{fmtF(sum.s)}</span>
            <span className="text-rose tabular-nums">−{fmtF(sum.e)}</span>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <div className="card divide-y divide-line overflow-hidden">
            {visible.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setDetail(tx)}
                className="tap flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-fg/[0.02]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    tx.type === "sale"
                      ? "border-mint/25 bg-mint/10 text-mint"
                      : "border-rose/25 bg-rose/10 text-rose"
                  }`}
                >
                  {tx.type === "sale" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{tx.note || tx.category}</p>
                  <p className="truncate text-xs text-muted">
                    {relDay(tx.ts)} · {timeOf(tx.ts)}
                    {tx.seller && ` · ${tx.seller}`}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-display text-sm font-bold tabular-nums ${
                    tx.type === "sale" ? "text-mint" : "text-rose"
                  }`}
                >
                  {fmtSigned(tx.type === "sale" ? tx.amount : -tx.amount)}
                </p>
              </button>
            ))}
            {visible.length === 0 && (
              <p className="p-10 text-center text-sm text-muted">
                Aucun mouvement ne correspond à ta recherche.
              </p>
            )}
          </div>
          {filtered.length > 200 && (
            <p className="mt-3 text-center text-[11px] text-muted">
              +{filtered.length - 200} mouvements plus anciens masqués — affine ta recherche.
            </p>
          )}
        </div>
      </div>

      <TxnDetail txn={detail} onClose={() => setDetail(null)} notify={notify} />

      <Toast message={toast} kind="info" />
    </motion.div>
  );
}

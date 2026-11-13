import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Clock3,
  Crown,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  PartyPopper,
  Eraser,
  HardDriveDownload,
} from "lucide-react";
import { DAY, dayLetter, fmt, fmtF, fmtSigned, relDay, startOfDay, sym, timeOf } from "../lib/format";
import { totals, useStore, type Txn } from "../lib/store";
import { AnimNum, AmountPadLite, Avatar, BarChart, Btn, Sheet, Toast } from "./ui";
import History from "./History";
import TxnDetail from "./TxnDetail";
import { BACKUP_EVERY_DAYS, buildBackup, daysSinceBackup, saveBackup } from "../lib/backup";
import DayClose from "./DayClose";

export default function Dashboard({
  onPremium,
  onSettings,
}: {
  onPremium: () => void;
  onSettings: () => void;
}) {
  const { txns, debts, products, sellers, profile, updateProfile, resetData } = useStore();
  const [wipeAsk, setWipeAsk] = useState(false);
  const [detail, setDetail] = useState<Txn | null>(null);
  const [goalSheet, setGoalSheet] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  };

  const now = Date.now();
  const today = startOfDay(now);
  const t = totals(txns, today, now + 1000);
  const y = totals(txns, today - DAY, today);

  const change =
    y.profit !== 0 ? Math.round(((t.profit - y.profit) / Math.abs(y.profit)) * 100) : t.profit > 0 ? 100 : null;

  const chart = Array.from({ length: 7 }, (_, idx) => {
    const s = today - (6 - idx) * DAY;
    return { label: dayLetter(s), value: totals(txns, s, s + DAY).sales };
  });

  const owed = debts.reduce(
    (s, d) =>
      s +
      Math.max(
        0,
        (d.dir ?? "credit") === "credit" ? debtBal(d) : 0
      ),
    0
  );

  const recent = txns.slice(0, 8);
  const firstName = (profile?.name ?? "").split(" ")[0] || "Patron";

  const goal = profile?.dailyGoal ?? 0;
  const goalPct = goal > 0 ? Math.min(100, (t.sales / goal) * 100) : 0;
  const goalReached = goal > 0 && t.sales >= goal;

  const saveGoal = () => {
    const v = parseInt(goalInput || "0", 10);
    updateProfile({ dailyGoal: v > 0 ? v : undefined });
    setGoalSheet(false);
    setGoalInput("");
    notify(v > 0 ? `Objectif fixé à ${fmtF(v)}` : "Objectif retiré");
  };


  return (
    <div className="pb-32">
      <Toast message={toast} kind="info" />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onSettings} className="tap btn-press" aria-label="Ouvrir les réglages" title="Réglages">
            <Avatar name={firstName} size={44} />
          </button>
          <div>
            <p className="text-xs text-muted">{relDay(now)} · Ça va ?</p>
            <h1 className="font-display text-lg font-bold leading-tight">{profile?.shop ?? "Ma boutique"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCloseOpen(true)}
            className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel hover:border-brand/40"
            aria-label="Clôturer la journée"
            title="Clôturer la journée"
          >
            <ClipboardCheck size={17} className="text-brand2" />
          </button>
          {profile?.plan !== "free" && (
            <span className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand2">
              <Crown size={11} /> Premium
            </span>
          )}
        </div>
      </div>

      {/* Données d'exemple */}
      {profile?.demo && (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4" role="region" aria-label="Données d'exemple">
          <div className="flex items-start gap-3">
            <Eraser size={17} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-300">Ce sont des données d'exemple</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-300/85">
                Explore l'app, puis efface-les pour noter tes vraies ventes. Tes réglages sont gardés.
              </p>
            </div>
          </div>
          {!wipeAsk ? (
            <Btn variant="soft" className="mt-3 w-full py-3" onClick={() => setWipeAsk(true)}>
              Effacer et commencer pour de vrai
            </Btn>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Btn variant="soft" className="py-3" onClick={() => setWipeAsk(false)}>
                Pas encore
              </Btn>
              <Btn
                variant="danger"
                className="py-3"
                onClick={() => {
                  resetData();
                  setWipeAsk(false);
                  notify("C'est parti — ta caisse est vide et prête");
                }}
              >
                Oui, effacer
              </Btn>
            </div>
          )}
        </div>
      )}

      {/* Rappel de sauvegarde */}
      {!profile?.demo &&
        txns.length >= 5 &&
        daysSinceBackup(profile) >= BACKUP_EVERY_DAYS &&
        (profile?.backupSnooze ?? 0) < Date.now() && (
          <div className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4" role="region" aria-label="Rappel de sauvegarde">
            <div className="flex items-start gap-3">
              <HardDriveDownload size={17} className="mt-0.5 shrink-0 text-sky-300" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-sky-300">
                  {profile?.lastBackup ? `Pas de sauvegarde depuis ${daysSinceBackup(profile)} jours` : "Tes données ne sont pas encore sauvegardées"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-sky-300/85">
                  Téléphone perdu ou cassé = tout est perdu. Envoie-toi le fichier sur WhatsApp : 10 secondes, gratuit.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
              <Btn
                variant="soft"
                className="py-3"
                onClick={() => updateProfile({ backupSnooze: Date.now() + 3 * DAY })}
              >
                Plus tard
              </Btn>
              <Btn
                className="py-3"
                onClick={async () => {
                  try {
                    const r = await saveBackup(buildBackup({ profile, txns, debts, products, sellers }));
                    if (r === "cancelled") return;
                    updateProfile({ lastBackup: Date.now() });
                    notify(r === "shared" ? "Sauvegarde envoyée" : "Sauvegarde enregistrée");
                  } catch {
                    notify("Sauvegarde impossible sur ce téléphone");
                  }
                }}
              >
                <HardDriveDownload size={15} aria-hidden="true" /> Sauvegarder
              </Btn>
            </div>
          </div>
        )}

      {/* Carte profit */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-action via-action to-action2 p-6 shadow-[0_20px_50px_-20px_rgba(255,122,26,0.55)]"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">Profit du jour</p>
        <p className="mt-1 font-display text-[2.9rem] font-extrabold leading-none tracking-tight text-white">
          <AnimNum value={t.profit} format={fmtF} />
        </p>
        {change !== null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
            {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {change >= 0 ? "+" : ""}
            {change}% vs hier
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <ArrowUpRight size={12} /> Ventes
            </div>
            <p className="mt-0.5 font-display text-lg font-bold text-white">
              <AnimNum value={t.sales} format={fmtF} />
            </p>
          </div>
          <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
              <ArrowDownRight size={12} /> Dépenses
            </div>
            <p className="mt-0.5 font-display text-lg font-bold text-white">
              <AnimNum value={t.expenses} format={fmtF} />
            </p>
          </div>
        </div>
      </motion.div>

      {/* Objectif du jour */}
      <motion.button
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        onClick={() => {
          setGoalInput(goal > 0 ? String(goal) : "");
          setGoalSheet(true);
        }}
        className="tap card mt-4 w-full p-4 text-left transition-colors hover:border-brand/30"
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              goalReached ? "border-mint/30 bg-mint/10 text-mint" : "border-brand/25 bg-brand/10 text-brand2"
            }`}
          >
            <Target size={18} />
          </div>
          <div className="min-w-0 flex-1">
            {goal > 0 ? (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold">{goalReached ? (
                      <span className="inline-flex items-center gap-1.5">
                        Objectif atteint <PartyPopper size={15} className="text-mint" aria-hidden="true" />
                      </span>
                    ) : (
                      "Objectif du jour"
                    )}</p>
                  <p className="shrink-0 text-[11px] font-bold text-muted tabular-nums">
                    {fmt(t.sales)} / {fmt(goal)}{sym()}
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${goalPct}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 18 }}
                    className={`h-full rounded-full ${
                      goalReached ? "bg-gradient-to-r from-mint to-teal-400" : "bg-gradient-to-r from-brand to-brand2"
                    }`}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold">Fixe ton objectif du jour</p>
                <p className="text-xs text-muted">Ex : 40 000 — suis ta progression en direct</p>
              </>
            )}
          </div>
        </div>
      </motion.button>

      {/* Crédits en cours */}
      {owed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="card mt-3 flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose/25 bg-rose/10 text-rose">
              <ArrowDownRight size={17} />
            </div>
            <div>
              <p className="text-xs text-muted">Crédits en cours</p>
              <p className="font-display text-base font-bold">{fmtF(owed)} à récupérer</p>
            </div>
          </div>
          <span className="rounded-full bg-rose/10 px-2.5 py-1 text-[10px] font-bold text-rose">
            {(() => {
              const n = debts.filter((d) => (d.dir ?? "credit") === "credit" && debtBal(d) > 0).length;
              return `${n} client${n > 1 ? "s" : ""}`;
            })()}
          </span>
        </motion.div>
      )}

      {/* Graphique 7 jours */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card mt-3 p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Ventes · 7 derniers jours</p>
          <span className="rounded-full border border-line bg-panel2 px-2.5 py-1 text-[10px] font-bold text-mint">
            {fmtF(chart.reduce((s, c) => s + c.value, 0))}
          </span>
        </div>
        <BarChart data={chart} />
      </motion.div>

      {/* Bannière Premium */}
      {profile?.plan === "free" && (
        <motion.button
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          onClick={onPremium}
          className="tap btn-press mt-3 flex w-full items-center gap-3 overflow-hidden rounded-[1.5rem] border border-brand/30 bg-gradient-to-r from-brand/15 to-transparent p-4 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-action to-action2 text-white">
            <Crown size={17} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Passe Premium à 2 000 F/mois</p>
            <p className="text-xs text-muted">Export PDF · Sauvegarde cloud · Rapports mensuels</p>
          </div>
          <Sparkles size={16} className="shrink-0 text-brand2" />
        </motion.button>
      )}

      {/* Transactions récentes */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Mouvements récents</p>
          <span className="text-[10px] font-bold text-muted">{txns.length} au total</span>
        </div>
        <div className="card divide-y divide-line overflow-hidden">
          <AnimatePresence initial={false}>
            {recent.map((tx) => (
              <motion.button
                key={tx.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -60 }}
                onClick={() => setDetail(tx)}
                className="tap flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-fg/[0.02]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                    tx.type === "sale" ? "border-mint/25 bg-mint/10 text-mint" : "border-rose/25 bg-rose/10 text-rose"
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
              </motion.button>
            ))}
          </AnimatePresence>
          {recent.length === 0 && (
            <p className="p-8 text-center text-sm text-muted">
              Aucun mouvement. Appuie sur <span className="font-bold text-brand2">+</span> pour enregistrer ta première
              vente.
            </p>
          )}
        </div>
        {txns.length > 8 && (
          <button
            onClick={() => setHistOpen(true)}
            className="tap btn-press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-panel py-3 text-xs font-bold text-muted transition-colors hover:border-brand/40 hover:text-cream"
          >
            <Clock3 size={13} /> Voir tout l'historique ({txns.length})
          </button>
        )}
        <p className="mt-2.5 text-center text-[10px] text-muted">Touche un mouvement pour sortir son reçu</p>
      </div>

      <TxnDetail txn={detail} onClose={() => setDetail(null)} notify={notify} />

      {/* Sheet objectif */}
      <Sheet open={goalSheet} onClose={() => setGoalSheet(false)}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-brand/25 bg-brand/10 text-brand2">
          <Target size={24} />
        </div>
        <h2 className="text-center font-display text-xl font-extrabold">Objectif de ventes du jour</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted">
          Combien veux-tu encaisser aujourd'hui ? La barre se remplit à chaque vente.
        </p>
        <p className="mt-6 text-center font-display text-4xl font-extrabold tabular-nums text-brand2">
          {fmtF(parseInt(goalInput || "0", 10))}
        </p>
        <div className="mt-5">
          <AmountPadLite value={goalInput} onChange={setGoalInput} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Btn
            variant="soft"
            onClick={() => {
              updateProfile({ dailyGoal: undefined });
              setGoalSheet(false);
              setGoalInput("");
              notify("Objectif retiré");
            }}
          >
            Retirer
          </Btn>
          <Btn onClick={saveGoal} disabled={parseInt(goalInput || "0", 10) <= 0}>
            Valider
          </Btn>
        </div>
      </Sheet>

      <AnimatePresence>
        {histOpen && <History onClose={() => setHistOpen(false)} onPremium={onPremium} />}
        {closeOpen && <DayClose onClose={() => setCloseOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* helper local */
const debtBal = (d: { entries: { amount: number }[]; payments: { amount: number }[] }): number =>
  d.entries.reduce((s, e) => s + e.amount, 0) - d.payments.reduce((s, p) => s + p.amount, 0);

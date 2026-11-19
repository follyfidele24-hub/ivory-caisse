import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, ClipboardCheck, Info, LogOut, Share2, Wallet } from "lucide-react";
import { fmtF, fmtSigned, startOfDay, timeOf } from "../lib/format";
import { cancelStatus, expectedCash, useStore, type Txn } from "../lib/store";
import { shareText } from "../lib/receipt";
import { Avatar, Btn, Sheet, Toast } from "./ui";
import TxnDetail from "./TxnDetail";

/** Accueil d'un vendeur : ses ventes du jour, l'argent à avoir en caisse, sa clôture. Aucun chiffre de marge. */
export default function StaffHome({ onLock }: { onLock: () => void }) {
  const { txns, debts, closures, journal, rules, actorName, profile } = useStore();
  const [detail, setDetail] = useState<Txn | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2400);
  };

  const now = Date.now();
  const today = startOfDay(now);
  const lastClose = closures.find((c) => c.who === actorName);
  const from = Math.max(today, lastClose?.ts ?? 0);
  const cash = useMemo(() => expectedCash(txns, debts, actorName, from, now), [txns, debts, actorName, from, now]);
  const mine = txns.filter((t) => t.ts >= today && (t.by ?? t.seller) === actorName);
  const mySales = mine.filter((t) => t.type === "sale");
  const salesTotal = mySales.reduce((s, t) => s + t.amount, 0);
  const cancelsLeft = mine[0] ? cancelStatus(mine[0], actorName, journal, rules, now).left : rules.cancelPerDay;

  return (
    <div className="pb-32">
      <Toast message={toast} kind="info" />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={actorName} size={44} />
          <div>
            <p className="text-xs text-muted">Vendeur · {profile?.shop ?? "Ma boutique"}</p>
            <h1 className="font-display text-lg font-bold leading-tight">Bonjour, {actorName}</h1>
          </div>
        </div>
        <button
          onClick={onLock}
          className="tap btn-press flex h-11 items-center gap-1.5 rounded-2xl border border-line bg-panel px-3.5 text-xs font-bold text-muted"
          aria-label="Verrouiller et changer de personne"
        >
          <LogOut size={15} aria-hidden="true" /> Quitter
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.8rem] bg-gradient-to-br from-mint to-teal-700 p-6 text-white shadow-[0_20px_50px_-24px_rgba(8,107,72,0.7)]"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/80">Mes ventes aujourd'hui</p>
        <p className="mt-1 font-display text-[2.6rem] font-extrabold leading-none tabular-nums">{fmtF(salesTotal)}</p>
        <p className="mt-1.5 text-xs font-semibold text-white/80">
          {mySales.length} vente{mySales.length > 1 ? "s" : ""}
        </p>
        <div className="mt-5 rounded-2xl bg-black/20 p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75">
            <Wallet size={12} aria-hidden="true" /> À avoir en caisse {lastClose && lastClose.ts > today ? "depuis ta clôture" : ""}
          </p>
          <p className="mt-0.5 font-display text-xl font-extrabold tabular-nums">{fmtF(cash.expected)}</p>
        </div>
      </motion.div>

      <Btn className="mt-4 w-full py-4 text-base" onClick={() => setCloseOpen(true)}>
        <ClipboardCheck size={18} aria-hidden="true" /> Clôturer ma caisse
      </Btn>

      <div className="card mt-4 flex gap-3 p-4">
        <Info size={16} className="mt-0.5 shrink-0 text-sky-500" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted">
          Tu peux annuler ta vente pendant <b className="text-fg">{rules.cancelMin} min</b> ({cancelsLeft} annulation{cancelsLeft > 1 ? "s" : ""} restante{cancelsLeft > 1 ? "s" : ""} aujourd'hui). Dépense seule jusqu'à{" "}
          <b className="text-fg">{fmtF(rules.expenseCap)}</b>. Au-delà, il faut le PIN du patron. Tout est noté dans le journal du patron.
        </p>
      </div>

      <div className="mt-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Mes mouvements du jour</p>
        <div className="card divide-y divide-line overflow-hidden">
          {mine.map((tx) => (
            <button key={tx.id} onClick={() => setDetail(tx)} className="tap flex w-full items-center gap-3 p-4 text-left">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                  tx.type === "sale" ? "border-mint/25 bg-mint/10 text-mint" : "border-rose/25 bg-rose/10 text-rose"
                }`}
              >
                {tx.type === "sale" ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowDownRight size={16} aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{tx.note || tx.category}</p>
                <p className="text-xs text-muted">
                  {timeOf(tx.ts)}
                  {tx.review === "pending" && " · à vérifier par le patron"}
                </p>
              </div>
              <p className={`shrink-0 font-display text-sm font-bold tabular-nums ${tx.type === "sale" ? "text-mint" : "text-rose"}`}>
                {fmtSigned(tx.type === "sale" ? tx.amount : -tx.amount)}
              </p>
            </button>
          ))}
          {mine.length === 0 && (
            <p className="p-8 text-center text-sm text-muted">
              Rien encore aujourd'hui. Appuie sur <span className="font-bold text-brand2">+</span> pour ta première vente.
            </p>
          )}
        </div>
      </div>

      <TxnDetail txn={detail} onClose={() => setDetail(null)} notify={notify} />
      <CashClose open={closeOpen} onClose={() => setCloseOpen(false)} from={from} cash={cash} notify={notify} />
    </div>
  );
}

/* ---------- Clôture de caisse : attendu, compté, écart ---------- */

export function CashClose({
  open,
  onClose,
  from,
  cash,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  from: number;
  cash: ReturnType<typeof expectedCash>;
  notify: (m: string) => void;
}) {
  const { addClosure, actorName, profile } = useStore();
  const [esp, setEsp] = useState("");
  const [momo, setMomo] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const counted = (parseInt(esp || "0", 10) || 0) + (parseInt(momo || "0", 10) || 0);
  const diff = counted - cash.expected;
  const needNote = diff !== 0 && note.trim().length < 3;
  const filled = esp !== "" || momo !== "";

  const reset = () => {
    setEsp("");
    setMomo("");
    setNote("");
    setDone(null);
  };

  const save = () => {
    if (!filled || needNote) return;
    addClosure({ from, expected: cash.expected, cash: parseInt(esp || "0", 10) || 0, momo: parseInt(momo || "0", 10) || 0, diff, note: note.trim() });
    const text = [
      `*CLÔTURE DE CAISSE — ${profile?.shop ?? "Ma boutique"}*`,
      `Par ${actorName}, le ${new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
      ``,
      `Ventes : ${fmtF(cash.sales)}`,
      cash.collected ? `Remboursements reçus : ${fmtF(cash.collected)}` : "",
      cash.expenses ? `Dépenses : -${fmtF(cash.expenses)}` : "",
      `Attendu en caisse : ${fmtF(cash.expected)}`,
      `Compté : ${fmtF(counted)} (espèces ${fmtF(parseInt(esp || "0", 10) || 0)}, Mobile Money ${fmtF(parseInt(momo || "0", 10) || 0)})`,
      diff === 0 ? `✅ Caisse juste` : diff < 0 ? `⚠️ Manque : ${fmtF(-diff)}` : `ℹ️ Surplus : ${fmtF(diff)}`,
      note.trim() ? `Note : ${note.trim()}` : "",
      ``,
      `_Ivory Caisse_`,
    ]
      .filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "")
      .join("\n");
    setDone(text);
    notify(diff === 0 ? "Clôture enregistrée · caisse juste" : "Clôture enregistrée · écart noté");
  };

  const input = "w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 font-display text-lg font-bold tabular-nums outline-none focus:border-brand/50";

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      {!done ? (
        <>
          <h2 className="text-center font-display text-xl font-extrabold">Clôture de ma caisse</h2>
          <div className="mt-4 space-y-2 rounded-2xl border border-line bg-panel2 p-4 text-sm">
            <Row k="Mes ventes" v={fmtF(cash.sales)} />
            {cash.collected > 0 && <Row k="Remboursements reçus" v={fmtF(cash.collected)} />}
            {cash.expenses > 0 && <Row k="Mes dépenses" v={`-${fmtF(cash.expenses)}`} />}
            {cash.paidOut > 0 && <Row k="Payé aux fournisseurs" v={`-${fmtF(cash.paidOut)}`} />}
            <div className="border-t border-line pt-2">
              <Row k="Attendu en caisse" v={fmtF(cash.expected)} strong />
            </div>
          </div>

          <label className="mt-4 block text-xs font-bold text-muted" htmlFor="cc-esp">Espèces comptées</label>
          <input id="cc-esp" inputMode="numeric" value={esp} onChange={(e) => setEsp(e.target.value.replace(/\D/g, "").slice(0, 9))} className={`mt-1.5 ${input}`} placeholder="0" />
          <label className="mt-3 block text-xs font-bold text-muted" htmlFor="cc-momo">Mobile Money reçu (Orange, MTN, Moov, Wave)</label>
          <input id="cc-momo" inputMode="numeric" value={momo} onChange={(e) => setMomo(e.target.value.replace(/\D/g, "").slice(0, 9))} className={`mt-1.5 ${input}`} placeholder="0" />

          {filled && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-center ${
                diff === 0 ? "border-mint/30 bg-mint/10 text-mint" : diff < 0 ? "border-rose/30 bg-rose/10 text-rose" : "border-sky-500/30 bg-sky-500/10 text-sky-600"
              }`}
              aria-live="polite"
            >
              <p className="text-xs font-bold uppercase tracking-wider">{diff === 0 ? "Caisse juste" : diff < 0 ? "Il manque" : "Surplus"}</p>
              {diff !== 0 && <p className="font-display text-2xl font-extrabold tabular-nums">{fmtF(Math.abs(diff))}</p>}
            </div>
          )}

          {filled && diff !== 0 && (
            <>
              <label className="mt-3 block text-xs font-bold text-muted" htmlFor="cc-note">Explique l'écart (obligatoire)</label>
              <input id="cc-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-line bg-panel2 px-4 py-3 text-sm font-semibold outline-none focus:border-brand/50" placeholder="Ex : monnaie rendue en trop" />
            </>
          )}

          <Btn className="mt-5 w-full py-4" disabled={!filled || needNote} onClick={save}>
            <Check size={17} aria-hidden="true" /> Enregistrer la clôture
          </Btn>
        </>
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl border border-mint/30 bg-mint/10 text-mint">
            <Check size={26} aria-hidden="true" />
          </div>
          <h2 className="font-display text-xl font-extrabold">Clôture enregistrée</h2>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">Le patron la voit dans son journal. Tu peux aussi lui envoyer le résumé.</p>
          <Btn variant="mint" className="mt-5 w-full py-4" onClick={() => void shareText(done, "Clôture de caisse")}>
            <Share2 size={17} aria-hidden="true" /> Envoyer au patron (WhatsApp)
          </Btn>
          <Btn
            variant="soft"
            className="mt-2.5 w-full"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Fermer
          </Btn>
        </div>
      )}
    </Sheet>
  );
}

function Row({ k, v, strong = false }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={strong ? "font-bold" : "text-muted"}>{k}</span>
      <span className={`tabular-nums ${strong ? "font-display font-extrabold" : "font-semibold"}`}>{v}</span>
    </div>
  );
}

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Factory,
  Lock,
  MessageCircle,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { fmt, fmtF, relDay, sym, timeOf } from "../lib/format";
import { debtBalance, useStore, type Debt, type DebtDir } from "../lib/store";
import { AmountPad } from "./AddTxn";
import { Avatar, Btn, Seg, Sheet, Toast } from "./ui";

export default function Debts({ onPremium }: { onPremium: () => void }) {
  const { debts, profile, addClient, addDebtMove, removeClient } = useStore();
  const [dir, setDir] = useState<DebtDir>("credit");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetClient, setSheetClient] = useState(false);
  const [move, setMove] = useState<{ kind: "entry" | "payment" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cDir, setCDir] = useState<DebtDir>("credit");
  const [mAmount, setMAmount] = useState("");
  const [mNote, setMNote] = useState("");

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  };

  const list = useMemo(() => debts.filter((d) => (d.dir ?? "credit") === dir), [debts, dir]);

  const stats = useMemo(() => {
    let owed = 0;
    let collected = 0;
    list.forEach((d) => {
      owed += Math.max(0, debtBalance(d));
      collected += d.payments.reduce((s, p) => s + p.amount, 0);
    });
    return { owed, collected, active: list.filter((d) => debtBalance(d) > 0).length };
  }, [list]);

  const client: Debt | null = debts.find((d) => d.id === selected) ?? null;
  const clientDir: DebtDir = client?.dir ?? "credit";
  const FREE_LIMIT = 5;
  const isFree = profile?.plan === "free";

  const T = {
    credit: {
      title: "Crédits clients",
      sub: "Qui te doit quoi, sans le cahier.",
      addLabel: "Client",
      owed: "À récupérer",
      collected: "Récupéré",
      active: "Débiteurs",
      entryBtn: "Nouveau crédit",
      payBtn: "Encaisser",
      entrySheet: "Nouveau crédit",
      paySheet: "Encaisser un versement",
      entryNotePh: "Pour quoi ? (ex : pagne + mèches)",
      toastEntry: (v: number) => `Crédit de ${fmtF(v)} noté`,
      toastPay: (v: number) => `${fmtF(v)} encaissé`,
    },
    debt: {
      title: "Mes dettes",
      sub: "Ce que tu dois aux fournisseurs.",
      addLabel: "Dette",
      owed: "À rembourser",
      collected: "Remboursé",
      active: "Créanciers",
      entryBtn: "J'ai pris à crédit",
      payBtn: "Je rembourse",
      entrySheet: "J'ai pris à crédit",
      paySheet: "Je rembourse",
      entryNotePh: "Quoi ? (ex : 10 sacs de riz)",
      toastEntry: (v: number) => `Dette de ${fmtF(v)} notée`,
      toastPay: (v: number) => `${fmtF(v)} remboursé`,
    },
  }[dir];

  const CT = {
    credit: { entrySheet: T.entrySheet, paySheet: T.paySheet },
    debt: {
      entrySheet: "J'ai pris à crédit",
      paySheet: "Je rembourse",
    },
  }[clientDir];

  const openNewClient = () => {
    if (isFree && debts.length >= FREE_LIMIT) {
      onPremium();
      return;
    }
    setCDir(dir);
    setSheetClient(true);
  };

  const saveClient = () => {
    if (cName.trim().length < 2) return;
    addClient(cName.trim(), cPhone.trim(), cDir);
    setCName("");
    setCPhone("");
    setSheetClient(false);
    setDir(cDir);
    showToast(cDir === "credit" ? "Client ajouté" : "Créancier ajouté");
  };

  const saveMove = () => {
    const v = parseInt(mAmount || "0", 10);
    if (!client || v <= 0 || !move) return;
    addDebtMove(client.id, move.kind, v, mNote.trim());
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    showToast(
      move.kind === "entry"
        ? (clientDir === "credit" ? T.toastEntry(v) : `Dette de ${fmtF(v)} notée`)
        : clientDir === "credit"
          ? T.toastPay(v)
          : `${fmtF(v)} remboursé`
    );
    setMAmount("");
    setMNote("");
    setMove(null);
  };

  const history = client
    ? [
        ...client.entries.map((m) => ({ ...m, kind: "entry" as const })),
        ...client.payments.map((m) => ({ ...m, kind: "payment" as const })),
      ].sort((a, b) => b.ts - a.ts)
    : [];

  const paidPct = (d: Debt) => {
    const total = d.entries.reduce((s, e) => s + e.amount, 0);
    if (total === 0) return 100;
    return Math.min(100, Math.round((d.payments.reduce((s, p) => s + p.amount, 0) / total) * 100));
  };

  const waLink = client && client.phone
    ? `https://wa.me/225${client.phone.replace(/\s/g, "")}?text=${encodeURIComponent(
        `Bonjour ${client.name}, c'est ${profile?.shop ?? "ta boutique"}. Il te reste ${fmtF(
          debtBalance(client)
        )} à régler. Tu peux passer quand tu veux. Merci !`
      )}`
    : null;

  return (
    <div className="pb-32">
      <Toast message={toast} kind="info" />

      <AnimatePresence mode="wait">
        {!client ? (
          <motion.div key="list" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-extrabold tracking-tight">Crédits & dettes</h1>
                <p className="text-xs text-muted">Les deux sens du compte courant.</p>
              </div>
              <button
                onClick={openNewClient}
                className="tap btn-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-action to-action2 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,122,26,0.6)]"
              >
                <Plus size={16} /> {T.addLabel}
              </button>
            </div>

            <Seg
              id="debt-dir"
              options={[
                { id: "credit", label: "On me doit" },
                { id: "debt", label: "Je dois" },
              ]}
              value={dir}
              onChange={setDir}
              accent={dir === "credit" ? "rose" : "brand"}
            />

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="card p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{T.owed}</p>
                <p className="mt-1 font-display text-base font-extrabold text-rose tabular-nums">{fmt(stats.owed)}{sym()}</p>
              </div>
              <div className="card p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{T.collected}</p>
                <p className="mt-1 font-display text-base font-extrabold text-mint tabular-nums">{fmt(stats.collected)} F</p>
              </div>
              <div className="card p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{T.active}</p>
                <p className="mt-1 font-display text-base font-extrabold tabular-nums">{stats.active}</p>
              </div>
            </div>

            {isFree && (
              <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <Lock size={11} className="text-brand2" /> Plan gratuit : {debts.length}/{FREE_LIMIT} fiches.
                <button onClick={onPremium} className="font-bold text-brand2 underline underline-offset-2">
                  Passer Premium
                </button>
              </p>
            )}

            {/* Liste */}
            <div className="mt-4 space-y-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {list.map((d, i) => {
                  const bal = debtBalance(d);
                  const pct = paidPct(d);
                  const isDebt = (d.dir ?? "credit") === "debt";
                  return (
                    <motion.button
                      key={d.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelected(d.id)}
                      className="tap card w-full p-4 text-left transition-colors hover:border-brand/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={d.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{d.name}</p>
                          <p className="text-xs text-muted">
                            {pct}% {isDebt ? "remboursé" : "récupéré"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 font-display text-sm font-extrabold tabular-nums ${bal > 0 ? "text-rose" : "text-mint"}`}
                        >
                          {bal > 0 ? fmtF(bal) : "Soldé"}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 120, damping: 20 }}
                          className={`h-full rounded-full ${pct >= 100 ? "bg-mint" : "bg-gradient-to-r from-brand to-brand2"}`}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              {list.length === 0 && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-10 text-center">
                  {dir === "credit" ? (
                    <ShoppingBag size={26} className="mx-auto mb-3 text-muted" />
                  ) : (
                    <Factory size={26} className="mx-auto mb-3 text-muted" />
                  )}
                  <p className="font-display text-lg font-bold">
                    {dir === "credit" ? "Aucun client à crédit" : "Aucune dette fournisseur"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {dir === "credit"
                      ? "Ajoute ton premier client pour suivre ses dettes."
                      : "Note ici ce que tu dois à tes grossistes."}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <button
              onClick={() => setSelected(null)}
              className="tap mb-5 flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3.5 py-2 text-xs font-bold text-muted"
            >
              <ArrowLeft size={14} /> Toutes les fiches
            </button>

            <div className="card mb-4 p-5">
              <div className="flex items-center gap-3.5">
                <Avatar name={client.name} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold">{client.name}</p>
                  <p className="text-xs text-muted">
                    {clientDir === "credit" ? "Client — il me doit" : "Fournisseur — je lui dois"}
                    {client.phone ? ` · +225 ${client.phone}` : ""}
                  </p>
                </div>
                {client.phone && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:+225${client.phone.replace(/\s/g, "")}`}
                      className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel2 text-mint"
                      aria-label="Appeler"
                    >
                      <Phone size={16} />
                    </a>
                    {clientDir === "credit" && waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Relancer sur WhatsApp"
                        className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-mint/30 bg-mint/10 text-mint"
                        aria-label="Relancer sur WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-5 rounded-2xl border border-line bg-ink p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  {clientDir === "credit" ? "Reste à récupérer" : "Reste à rembourser"}
                </p>
                <p
                  className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${
                    debtBalance(client) > 0 ? "text-rose" : "text-mint"
                  }`}
                >
                  {debtBalance(client) > 0 ? fmtF(debtBalance(client)) : "Soldé"}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Btn variant="danger" onClick={() => setMove({ kind: "entry" })}>
                  <ArrowDownRight size={16} /> {clientDir === "credit" ? "Crédit" : "J'ai pris"}
                </Btn>
                <Btn
                  variant="mint"
                  onClick={() => setMove({ kind: "payment" })}
                  disabled={debtBalance(client) <= 0}
                  className={debtBalance(client) <= 0 ? "opacity-40" : ""}
                >
                  <ArrowUpRight size={16} /> {clientDir === "credit" ? "Encaisser" : "Je rembourse"}
                </Btn>
              </div>
            </div>

            {/* Historique */}
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">Historique</p>
            <div className="card divide-y divide-line overflow-hidden">
              {history.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      m.kind === "payment"
                        ? "border-mint/25 bg-mint/10 text-mint"
                        : "border-rose/25 bg-rose/10 text-rose"
                    }`}
                  >
                    {m.kind === "payment" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {m.note || (m.kind === "payment" ? "Versement" : "Crédit")}
                    </p>
                    <p className="text-xs text-muted">
                      {relDay(m.ts)} · {timeOf(m.ts)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-display text-sm font-bold tabular-nums ${
                      m.kind === "payment" ? "text-mint" : "text-rose"
                    }`}
                  >
                    {m.kind === "payment" ? "−" : "+"}
                    {fmt(m.amount)}{sym()}
                  </p>
                </div>
              ))}
              {history.length === 0 && <p className="p-8 text-center text-sm text-muted">Aucun mouvement pour l'instant.</p>}
            </div>

            <button
              onClick={() => {
                removeClient(client.id);
                setSelected(null);
                showToast("Fiche supprimée");
              }}
              className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose/20 bg-rose/5 py-3 text-sm font-bold text-rose/80"
            >
              <Trash2 size={15} /> Supprimer cette fiche
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet : nouvelle fiche */}
      <Sheet open={sheetClient} onClose={() => setSheetClient(false)}>
        <h2 className="mb-5 font-display text-xl font-extrabold">Nouvelle fiche</h2>
        <div className="mb-4">
          <Seg
            id="c-dir"
            options={[
              { id: "credit", label: "Client — il me doit" },
              { id: "debt", label: "Fournisseur — je lui dois" },
            ]}
            value={cDir}
            onChange={setCDir}
          />
        </div>
        <input
          autoFocus
          value={cName}
          onChange={(e) => setCName(e.target.value)}
          placeholder={cDir === "credit" ? "Nom du client (ex : Awa Kouamé)" : "Nom du fournisseur (ex : Grossiste Adjamé)"}
          className="mb-3 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
        />
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-line bg-panel2 px-4 transition-colors focus-within:border-brand/50">
          <span className="text-sm font-bold text-muted">+225</span>
          <input
            value={cPhone}
            onChange={(e) => setCPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 14))}
            placeholder="07 08 12 34 56 (optionnel)"
            inputMode="tel"
            className="w-full bg-transparent py-4 text-sm font-semibold outline-none placeholder:text-fg/25"
          />
        </div>
        <Btn onClick={saveClient} disabled={cName.trim().length < 2} className={`w-full py-4 ${cName.trim().length < 2 ? "opacity-40" : ""}`}>
          <Check size={17} /> Ajouter la fiche
        </Btn>
      </Sheet>

      {/* Sheet : crédit / versement */}
      <Sheet open={move !== null} onClose={() => setMove(null)}>
        <h2 className="mb-4 font-display text-xl font-extrabold">
          {move?.kind === "entry" ? CT.entrySheet : CT.paySheet}
        </h2>
        <p
          className={`mb-5 text-center font-display text-4xl font-extrabold tabular-nums ${
            parseInt(mAmount || "0", 10) > 0 ? (move?.kind === "entry" ? "text-rose" : "text-mint") : "text-fg/25"
          }`}
        >
          {fmtF(parseInt(mAmount || "0", 10))}
        </p>
        <input
          value={mNote}
          onChange={(e) => setMNote(e.target.value)}
          placeholder={
            move?.kind === "entry"
              ? clientDir === "credit"
                ? "Pour quoi ? (ex : pagne + mèches)"
                : "Quoi ? (ex : 10 sacs de riz)"
              : "Comment ? (ex : Wave, espèces)"
          }
          className="mb-4 w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
        />
        <AmountPad value={mAmount} onChange={setMAmount} />
        <Btn
          onClick={saveMove}
          disabled={parseInt(mAmount || "0", 10) <= 0}
          variant={move?.kind === "entry" ? "danger" : "mint"}
          className={`mt-4 w-full py-4 ${parseInt(mAmount || "0", 10) <= 0 ? "opacity-40" : ""}`}
        >
          <Check size={17} /> Valider
        </Btn>
      </Sheet>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Bus, Check, Coins, Delete, Home, MoreHorizontal, Package, User, Users } from "lucide-react";
import { fmtF } from "../lib/format";
import { useStore, type TxnType } from "../lib/store";
import { Btn, Seg, Sheet } from "./ui";

/* ---------- Clavier numérique partagé ---------- */

export function AmountPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (navigator.vibrate) navigator.vibrate(6);
    if (k === "back") onChange(value.slice(0, -1));
    else if (k === "00") {
      if (value !== "" && value.length < 8) onChange(value + "00");
    } else if (value === "0") onChange(k);
    else if (value.length < 9) onChange(value + k);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          className="tap btn-press flex h-14 items-center justify-center rounded-2xl border border-line bg-panel2 font-display text-xl font-bold transition-colors active:bg-fg/10"
        >
          {k === "back" ? <Delete size={20} className="text-muted" /> : k}
        </button>
      ))}
    </div>
  );
}

/* ---------- Catégories de dépense ---------- */

export const EXP_CATS = [
  { id: "Marchandises", icon: Package },
  { id: "Transport", icon: Bus },
  { id: "Loyer", icon: Home },
  { id: "Salaires", icon: Users },
  { id: "Crédit/Data", icon: Coins },
  { id: "Autre", icon: MoreHorizontal },
];

export default function AddTxn({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (kind: TxnType, amount: number, id: string) => void;
}) {
  const { addTxn, sellers } = useStore();
  const [type, setType] = useState<TxnType>("sale");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("Marchandises");
  const [note, setNote] = useState("");
  const [seller, setSeller] = useState<string | null>(null);

  const value = parseInt(amount || "0", 10);
  const valid = value > 0;

  /* Saisie au clavier physique (PC / tablette) : chiffres, Retour, Entrée */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setAmount((a) => (a.length >= 9 ? a : (a === "0" ? "" : a) + e.key));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setAmount((a) => a.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const save = () => {
    if (!valid) return;
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    const id = addTxn({
      type,
      amount: value,
      category: type === "sale" ? "Vente" : cat,
      note: note.trim(),
      ts: Date.now(),
      seller: type === "sale" ? seller ?? undefined : undefined,
    });
    onSaved(type, value, id);
    setAmount("");
    setNote("");
    setSeller(null);
    onClose();
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  return (
    <Sheet open={open} onClose={onClose}>
      <Seg
        id="txn-type"
        options={[
          { id: "sale", label: "Vente" },
          { id: "expense", label: "Dépense" },
        ]}
        value={type}
        onChange={setType}
        accent={type === "sale" ? "mint" : "rose"}
      />

      {/* Montant */}
      <div className="my-5 text-center">
        <p
          className={`font-display text-5xl font-extrabold tabular-nums tracking-tight ${
            value > 0 ? (type === "sale" ? "text-mint" : "text-rose") : "text-fg/25"
          }`}
        >
          {fmtF(value)}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {[500, 1000, 2000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => {
                setAmount(String(v));
                if (navigator.vibrate) navigator.vibrate(6);
              }}
              className={`tap btn-press rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums transition-colors ${
                amount === String(v)
                  ? "border-brand/50 bg-brand/15 text-brand2"
                  : "border-line bg-panel2 text-muted"
              }`}
            >
              {v.toLocaleString("fr-FR").replace(/\u202F/g, "\u00A0")}
            </button>
          ))}
        </div>
      </div>

      {/* Qui encaisse ? (mode équipe) */}
      {type === "sale" && sellers.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
            <User size={12} /> Encaissé par
          </p>
          <div className="flex flex-wrap gap-2">
            {[null, ...sellers].map((s) => {
              const active = seller === s;
              return (
                <button
                  key={s ?? "me"}
                  onClick={() => setSeller(s)}
                  className={`tap btn-press rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                    active ? "border-mint/50 bg-mint/15 text-mint" : "border-line bg-panel2 text-muted"
                  }`}
                >
                  {s ?? "Moi"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catégories (dépense) */}
      {type === "expense" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {EXP_CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`tap btn-press flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                cat === c.id ? "border-rose/50 bg-rose/15 text-rose" : "border-line bg-panel2 text-muted"
              }`}
            >
              <c.icon size={13} /> {c.id}
            </button>
          ))}
        </div>
      )}

      {/* Note */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note"
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        placeholder={type === "sale" ? "Note (ex : 2 pagnes 3 tons)" : "Note (ex : réassort Adjamé)"}
        className="mb-4 w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
      />

      <AmountPad value={amount} onChange={setAmount} />

      <Btn
        onClick={save}
        disabled={!valid}
        variant={type === "sale" ? "mint" : "danger"}
        className={`mt-4 w-full py-4 text-base ${!valid ? "opacity-40" : ""}`}
      >
        <Check size={18} />
        {type === "sale" ? `Encaisser ${value > 0 ? fmtF(value) : ""}` : `Dépenser ${value > 0 ? fmtF(value) : ""}`}
      </Btn>
    </Sheet>
  );
}

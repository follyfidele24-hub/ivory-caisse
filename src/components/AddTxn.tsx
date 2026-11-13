import { useEffect, useRef, useState } from "react";
import { Bus, Check, Coins, Delete, Home, Minus, MoreHorizontal, Package, Plus, User, Users } from "lucide-react";
import { fmtF } from "../lib/format";
import { useStore, type Product, type TxnType } from "../lib/store";
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

/* ---------- Choix d'un article du stock + quantité ---------- */

function ProductPick({
  products,
  selected,
  onSelect,
  qty,
  onQty,
  mode,
}: {
  products: Product[];
  selected: string | null;
  onSelect: (id: string) => void;
  qty: number;
  onQty: (q: number) => void;
  /** sale : on ne vend que ce qui est en rayon · restock : on peut racheter un article en rupture */
  mode: "sale" | "restock";
}) {
  const p = products.find((x) => x.id === selected) ?? null;
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  /* Article choisi toujours en tête ; ensuite la recherche filtre la liste */
  const list = products
    .filter((x) => !needle || x.name.toLowerCase().includes(needle) || x.id === selected)
    .sort((a, b) => (a.id === selected ? -1 : b.id === selected ? 1 : 0));
  const max = mode === "sale" ? p?.stock ?? 0 : 9999;
  /* Classes écrites en entier : Tailwind ne génère pas les noms construits dynamiquement */
  const onBox = mode === "sale" ? "border-mint/50 bg-mint/15" : "border-rose/50 bg-rose/15";
  const onText = mode === "sale" ? "text-mint" : "text-rose";
  return (
    <div className="mb-4">
      {products.length > 6 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Chercher un article"
          placeholder="Chercher un article…"
          className="mb-2 w-full rounded-2xl border border-line bg-panel2 px-4 py-3 text-sm font-semibold outline-none transition-colors placeholder:text-fg/30 focus:border-brand/50"
        />
      )}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Article">
        {list.length === 0 && <p className="px-1 py-2 text-xs font-semibold text-muted">Aucun article ne correspond.</p>}
        {list.map((x) => {
          const out = mode === "sale" && x.stock <= 0;
          const on = x.id === selected;
          return (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={out}
              onClick={() => onSelect(x.id)}
              className={`tap btn-press flex min-h-11 shrink-0 flex-col items-start rounded-2xl border px-3.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                on ? onBox : "border-line bg-panel2"
              }`}
            >
              <span className={`max-w-[9.5rem] truncate text-xs font-extrabold ${on ? onText : "text-fg"}`}>{x.name}</span>
              <span className="text-[11px] font-semibold text-muted tabular-nums">
                {out ? "Rupture" : `${mode === "sale" ? fmtF(x.price) : `achat ${fmtF(x.cost)}`} · stock ${x.stock}`}
              </span>
            </button>
          );
        })}
      </div>
      {p && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-panel2 px-3 py-2">
          <span className="text-xs font-bold text-muted">Quantité</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Une de moins"
              disabled={qty <= 1}
              onClick={() => onQty(qty - 1)}
              className="tap btn-press flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel disabled:opacity-30"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <span className="w-10 text-center font-display text-lg font-extrabold tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Une de plus"
              disabled={qty >= max}
              onClick={() => onQty(qty + 1)}
              className="tap btn-press flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel disabled:opacity-30"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {p && mode === "sale" && qty >= p.stock && (
        <p className="mt-1.5 text-[11px] font-semibold text-gold">C'est tout le stock restant de cet article.</p>
      )}
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
  const { addTxn, sellers, products, sellCart, restock } = useStore();
  const [type, setType] = useState<TxnType>("sale");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("Marchandises");
  const [note, setNote] = useState("");
  const [seller, setSeller] = useState<string | null>(null);

  /* Vente : "stock" = on choisit l'article (stock contrôlé) · "free" = montant libre hors stock */
  const [saleMode, setSaleMode] = useState<"stock" | "free">("stock");
  const [pid, setPid] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const hasProducts = products.length > 0;
  const fromStock = type === "sale" && hasProducts && saleMode === "stock";
  const restocking = type === "expense" && cat === "Marchandises" && pid !== null;
  const picked = products.find((p) => p.id === pid) ?? null;

  const typed = parseInt(amount || "0", 10);
  const value = fromStock ? (picked ? picked.price * qty : 0) : typed;
  const valid = fromStock ? !!picked && picked.stock > 0 && qty >= 1 && qty <= picked.stock : value > 0;

  const pick = (id: string) => {
    setPid((cur) => (cur === id && !fromStock ? null : id));
    setQty(1);
  };
  /* Changer de type remet le choix d'article à zéro */
  useEffect(() => {
    setPid(null);
    setQty(1);
  }, [type, saleMode]);
  /* Un article vendu ailleurs entre-temps : on ne dépasse jamais le stock */
  useEffect(() => {
    if (fromStock && picked && qty > picked.stock) setQty(Math.max(1, picked.stock));
  }, [fromStock, picked, qty]);

  /* Saisie au clavier physique (PC / tablette) : chiffres, Retour, Entrée */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key) && !fromStockRef.current) {
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
    let id: string | null;
    if (fromStock && picked) id = sellCart([{ id: picked.id, qty }], seller ?? undefined);
    else if (restocking && picked) id = restock(picked.id, qty, value, note.trim());
    else
      id = addTxn({
        type,
        amount: value,
        category: type === "sale" ? "Vente" : cat,
        note: note.trim(),
        ts: Date.now(),
        seller: type === "sale" ? seller ?? undefined : undefined,
      });
    if (!id) return;
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    onSaved(type, value, id);
    setAmount("");
    setNote("");
    setSeller(null);
    setPid(null);
    setQty(1);
    onClose();
  };
  const fromStockRef = useRef(fromStock);
  fromStockRef.current = fromStock;
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

      {type === "sale" && hasProducts && (
        <div className="mt-3">
          <Seg
            id="sale-mode"
            options={[
              { id: "stock", label: "Article du stock" },
              { id: "free", label: "Montant libre" },
            ]}
            value={saleMode}
            onChange={setSaleMode}
            accent="mint"
          />
          {saleMode === "free" && (
            <p className="mt-1.5 text-center text-[11px] font-semibold text-muted">
              Hors stock : service ou article que tu ne suis pas. Rien n'est retiré du stock.
            </p>
          )}
        </div>
      )}

      {/* Montant */}
      <div className="my-5 text-center">
        <p
          className={`font-display text-5xl font-extrabold tabular-nums tracking-tight ${
            value > 0 ? (type === "sale" ? "text-mint" : "text-rose") : "text-fg/25"
          }`}
        >
          {fmtF(value)}
        </p>
        {fromStock && picked && (
          <p className="mt-1 text-xs font-semibold text-muted tabular-nums">
            {qty} × {fmtF(picked.price)}
          </p>
        )}
        {restocking && picked && value > 0 && (
          <p className="mt-1 text-xs font-semibold text-muted tabular-nums">
            soit {fmtF(Math.round(value / qty))} l'unité · stock {picked.stock} → {picked.stock + qty}
          </p>
        )}
        {!fromStock && (
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
        )}
      </div>

      {fromStock && (
        <ProductPick products={products} selected={pid} onSelect={pick} qty={qty} onQty={setQty} mode="sale" />
      )}

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

      {type === "expense" && cat === "Marchandises" && hasProducts && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted">
            Ajouter au stock <span className="font-semibold">(facultatif · touche à nouveau pour annuler)</span>
          </p>
          <ProductPick products={products} selected={pid} onSelect={pick} qty={qty} onQty={setQty} mode="restock" />
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

      {!fromStock && <AmountPad value={amount} onChange={setAmount} />}

      <Btn
        onClick={save}
        disabled={!valid}
        variant={type === "sale" ? "mint" : "danger"}
        className={`mt-4 w-full py-4 text-base ${!valid ? "opacity-40" : ""}`}
      >
        <Check size={18} />
        {type === "sale"
          ? fromStock && !picked
            ? "Choisis un article"
            : `Encaisser ${value > 0 ? fmtF(value) : ""}`
          : `${restocking ? "Acheter" : "Dépenser"} ${value > 0 ? fmtF(value) : ""}`}
      </Btn>
    </Sheet>
  );
}

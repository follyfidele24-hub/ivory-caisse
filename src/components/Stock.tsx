import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, MessageCircle, Minus, Package, Plus, Search, ShoppingBasket, Trash2, X } from "lucide-react";
import { fmt, fmtF, sym } from "../lib/format";
import { reorderMessage } from "../lib/receipt";
import { useStore, type Product } from "../lib/store";
import { Btn, Sheet, Toast } from "./ui";

type Pane = null | { kind: "add" } | { kind: "edit"; p: Product } | { kind: "cart" };

const LEVELS = {
  out: { chip: "border-rose/30 bg-rose/10 text-rose", icon: "border-rose/25 bg-rose/10 text-rose" },
  low: { chip: "border-rose/30 bg-rose/10 text-rose", icon: "border-rose/25 bg-rose/10 text-rose" },
  mid: { chip: "border-amber-400/30 bg-amber-400/10 text-amber-300", icon: "border-amber-400/25 bg-amber-400/10 text-amber-300" },
  ok: { chip: "border-mint/25 bg-mint/10 text-mint", icon: "border-mint/25 bg-mint/10 text-mint" },
} as const;

const levelOf = (p: Product): keyof typeof LEVELS =>
  p.stock === 0 ? "out" : p.stock <= p.alert ? "low" : p.stock <= p.alert * 2 ? "mid" : "ok";

function Field({
  label,
  value,
  onChange,
  numeric,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-muted">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d]/g, "").slice(0, 9) : e.target.value)}
        inputMode={numeric ? "numeric" : "text"}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
      />
    </div>
  );
}

export default function Stock() {
  const { products, profile, sellers, addProduct, updateProduct, deleteProduct, sellCart, deleteTxn } = useStore();
  const [pane, setPane] = useState<Pane>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  const [fName, setFName] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fCost, setFCost] = useState("");
  const [fStock, setFStock] = useState("");
  const [fAlert, setFAlert] = useState("5");
  const [seller, setSeller] = useState<string | null>(null);

  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (m: string, undo?: string) => {
    setToast(m);
    setUndoId(undo ?? null);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      setUndoId(null);
    }, undo ? 5000 : 2200);
  };

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? products.filter((p) => p.name.toLowerCase().includes(n)) : products;
  }, [products, q]);

  /* ---------- Panier ---------- */
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty }))
        .filter((l): l is { p: Product; qty: number } => Boolean(l.p) && l.qty > 0),
    [cart, products]
  );
  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0);
  const cartTotal = cartLines.reduce((a, l) => a + l.qty * l.p.price, 0);
  const cartMargin = cartLines.reduce((a, l) => a + l.qty * (l.p.price - l.p.cost), 0);

  const setQtyFor = (p: Product, qty: number) => {
    const v = Math.max(0, Math.min(p.stock, qty));
    setCart((c) => {
      const n = { ...c };
      if (v === 0) delete n[p.id];
      else n[p.id] = v;
      return n;
    });
    if (navigator.vibrate) navigator.vibrate(6);
  };
  const addToCart = (p: Product) => setQtyFor(p, (cart[p.id] ?? 0) + 1);

  const stats = useMemo(() => {
    const value = products.reduce((s, p) => s + p.cost * p.stock, 0);
    const low = products.filter((p) => p.stock <= p.alert);
    const worth = products.reduce((s, p) => s + p.price * p.stock, 0);
    return { value, worth, low, count: products.length };
  }, [products]);

  const openAdd = () => {
    setFName("");
    setFPrice("");
    setFCost("");
    setFStock("");
    setFAlert("5");
    setPane({ kind: "add" });
  };

  const openEdit = (p: Product) => {
    setFName(p.name);
    setFPrice(String(p.price));
    setFCost(String(p.cost));
    setFStock(String(p.stock));
    setFAlert(String(p.alert));
    setPane({ kind: "edit", p });
  };


  const saveProduct = () => {
    const price = parseInt(fPrice || "0", 10);
    const cost = parseInt(fCost || "0", 10);
    const stock = parseInt(fStock || "0", 10);
    const alert = parseInt(fAlert || "0", 10);
    if (fName.trim().length < 2 || price <= 0) return;
    const data = { name: fName.trim(), price, cost, stock, alert };
    if (pane?.kind === "edit") {
      updateProduct(pane.p.id, data);
      showToast("Produit mis à jour");
    } else {
      addProduct(data);
      showToast("Produit ajouté au stock");
    }
    setPane(null);
  };

  const editP = pane?.kind === "edit" ? pane.p : null;

  const checkout = () => {
    if (!cartLines.length) return;
    const id = sellCart(
      cartLines.map((l) => ({ id: l.p.id, qty: l.qty })),
      seller ?? undefined
    );
    if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
    showToast(`Encaissé ${fmtF(cartTotal)}${cartMargin > 0 ? ` · marge ${fmtF(cartMargin)}` : ""}`, id ?? undefined);
    setCart({});
    setSeller(null);
    setPane(null);
  };

  const validForm = fName.trim().length >= 2 && parseInt(fPrice || "0", 10) > 0;

  return (
    <div className="pb-32">
      <Toast
        message={toast}
        kind="sale"
        action={
          undoId
            ? {
                label: "Annuler",
                onClick: () => {
                  deleteTxn(undoId);
                  showToast("Vente annulée · stock remis");
                },
              }
            : undefined
        }
      />

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Stock</h1>
          <p className="text-xs text-muted">Sache toujours ce qu'il te reste.</p>
        </div>
        <button
          onClick={openAdd}
          className="tap btn-press flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-action to-action2 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,122,26,0.6)]"
        >
          <Plus size={16} /> Produit
        </button>
      </div>

      {/* Alerte rupture */}
      {stats.low.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-2xl border border-rose/25 bg-rose/10 p-4"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-rose" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-rose">
              {stats.low.length === 1 ? "1 article à commander" : `${stats.low.length} articles à commander`}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose">
              {stats.low.map((p) => `${p.name} (${p.stock})`).join(" · ")}
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(reorderMessage(stats.low, profile?.shop ?? "Ma boutique"))}`}
              target="_blank"
              rel="noreferrer"
              className="tap btn-press mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-rose/15 px-3 py-2 text-[11px] font-extrabold text-rose"
            >
              <MessageCircle size={12} /> Envoyer la liste au fournisseur
            </a>
          </div>
        </motion.div>
      )}

      {/* Statistiques */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <div className="card p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Valeur stock</p>
          <p className="mt-1 font-display text-base font-extrabold text-brand2 tabular-nums">{fmtF(stats.value)}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Produits</p>
          <p className="mt-1 font-display text-base font-extrabold tabular-nums">{stats.count}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">À commander</p>
          <p className={`mt-1 font-display text-base font-extrabold tabular-nums ${stats.low.length > 0 ? "text-rose" : "text-mint"}`}>
            {stats.low.length}
          </p>
        </div>
      </div>

      {/* Recherche */}
      {products.length >= 4 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-panel px-4 transition-colors focus-within:border-brand/50">
          <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher un produit…"
            aria-label="Chercher un produit"
            type="search"
            className="w-full bg-transparent py-3.5 text-sm font-semibold outline-none placeholder:text-fg/25"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer la recherche" className="tap -mr-2 flex h-10 w-10 items-center justify-center text-muted">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Liste produits */}
      <div className="space-y-2.5">
        {shown.map((p, i) => {
          const lv = LEVELS[levelOf(p)];
          const margin = p.price - p.cost;
          const inCart = cart[p.id] ?? 0;
          const left = p.stock - inCart;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className={`card p-4 transition-colors ${inCart ? "border-mint/40" : ""}`}
            >
              <button
                type="button"
                onClick={() => openEdit(p)}
                className="tap flex w-full items-center gap-3 text-left"
                aria-label={`Modifier ${p.name}`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${lv.icon}`}>
                  <Package size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-muted">
                    {fmtF(p.price)}
                    {margin > 0 && <span className="text-mint"> · marge {fmt(margin)}{sym()}</span>}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tabular-nums ${lv.chip}`}>
                  {p.stock === 0 ? "Rupture" : `Stock : ${p.stock}`}
                </span>
              </button>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/8" aria-hidden="true">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (p.stock / Math.max(1, p.alert * 4)) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className={`h-full rounded-full ${
                      levelOf(p) === "ok" ? "bg-mint" : levelOf(p) === "mid" ? "bg-amber-400" : "bg-rose"
                    }`}
                  />
                </div>
                {inCart > 0 ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-xl bg-mint/15 p-1">
                    <button type="button" onClick={() => setQtyFor(p, inCart - 1)} aria-label={`Retirer un ${p.name}`} className="tap btn-press flex h-9 w-9 items-center justify-center rounded-lg text-mint">
                      <Minus size={15} />
                    </button>
                    <span className="w-7 text-center text-sm font-extrabold text-mint tabular-nums" aria-live="polite">{inCart}</span>
                    <button type="button" disabled={left <= 0} onClick={() => addToCart(p)} aria-label={`Ajouter un ${p.name}`} className="tap btn-press flex h-9 w-9 items-center justify-center rounded-lg text-mint disabled:opacity-30">
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={p.stock === 0}
                    onClick={() => addToCart(p)}
                    className="tap btn-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-mint/15 px-4 text-xs font-extrabold text-mint disabled:cursor-not-allowed disabled:bg-fg/5 disabled:text-muted"
                  >
                    <Plus size={14} aria-hidden="true" /> Panier
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {products.length > 0 && shown.length === 0 && (
          <p className="card p-8 text-center text-sm text-muted">Aucun produit ne contient « {q} ».</p>
        )}
        {products.length === 0 && (
          <div className="card p-10 text-center">
            <Package size={28} className="mx-auto mb-3 text-muted" aria-hidden="true" />
            <p className="font-display text-lg font-bold">Stock vide</p>
            <p className="mt-1 text-sm text-muted">Ajoute ton premier produit pour suivre tes quantités.</p>
          </div>
        )}
      </div>

      {/* Barre panier */}
      <AnimatePresence>
        {cartCount > 0 && pane === null && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-5"
          >
            <button
              type="button"
              onClick={() => setPane({ kind: "cart" })}
              className="tap btn-press flex w-full items-center gap-3 rounded-2xl bg-mint px-4 py-3.5 text-on-mint shadow-[0_14px_34px_-10px_rgba(34,201,141,0.7)]"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-ink/15">
                <ShoppingBasket size={18} aria-hidden="true" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-extrabold text-mint">{cartCount}</span>
              </span>
              <span className="flex-1 text-left text-sm font-extrabold">
                Panier · {cartCount} article{cartCount > 1 ? "s" : ""}
              </span>
              <span className="font-display text-base font-extrabold tabular-nums">{fmtF(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet ajout / édition */}
      <Sheet open={pane?.kind === "add" || pane?.kind === "edit"} onClose={() => setPane(null)}>
        <h2 className="mb-5 font-display text-xl font-extrabold">
          {pane?.kind === "edit" ? "Modifier le produit" : "Nouveau produit"}
        </h2>
        <div className="space-y-3.5">
          <Field label="Nom du produit" value={fName} onChange={setFName} placeholder="Ex : Sac de riz 5kg" />
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Prix de vente (${sym().trim()})`} value={fPrice} onChange={setFPrice} numeric placeholder="4 500" />
            <Field label={`Prix d'achat (${sym().trim()})`} value={fCost} onChange={setFCost} numeric placeholder="3 800" />
            <Field label="Quantité en stock" value={fStock} onChange={setFStock} numeric placeholder="24" />
            <Field label="Alerte si moins de" value={fAlert} onChange={setFAlert} numeric placeholder="5" />
          </div>
        </div>
        <Btn onClick={saveProduct} disabled={!validForm} className={`mt-5 w-full py-4 ${!validForm ? "opacity-40" : ""}`}>
          <Check size={17} /> {pane?.kind === "edit" ? "Enregistrer" : "Ajouter au stock"}
        </Btn>
        {editP && (
          <button
            onClick={() => {
              deleteProduct(editP.id);
              setPane(null);
              showToast("Produit supprimé");
            }}
            className="tap mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose/20 bg-rose/5 py-3 text-sm font-bold text-rose/80"
          >
            <Trash2 size={15} /> Supprimer ce produit
          </button>
        )}
      </Sheet>

      {/* Sheet panier */}
      <Sheet open={pane?.kind === "cart"} onClose={() => setPane(null)}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Encaisser le panier</p>
        <h2 className="mt-1 pr-10 font-display text-xl font-extrabold">
          {cartCount} article{cartCount > 1 ? "s" : ""}
        </h2>

        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel2">
          {cartLines.map(({ p, qty }) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{p.name}</p>
                <p className="text-xs text-muted tabular-nums">
                  {fmtF(p.price)} · {p.stock - qty} restant{p.stock - qty > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQtyFor(p, qty - 1)} aria-label={`Retirer un ${p.name}`} className="tap btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel">
                  {qty === 1 ? <Trash2 size={14} className="text-rose" /> : <Minus size={15} />}
                </button>
                <span className="w-8 text-center font-display text-lg font-extrabold tabular-nums">{qty}</span>
                <button type="button" disabled={qty >= p.stock} onClick={() => setQtyFor(p, qty + 1)} aria-label={`Ajouter un ${p.name}`} className="tap btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel disabled:opacity-30">
                  <Plus size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="my-4 rounded-2xl border border-line bg-ink p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total à encaisser</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-mint tabular-nums">{fmtF(cartTotal)}</p>
          {cartMargin > 0 && (
            <p className="mt-1 text-xs font-semibold text-muted">
              Marge : <span className="text-brand2">{fmtF(cartMargin)}</span>
            </p>
          )}
        </div>

        {sellers.length > 0 && (
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold text-muted">Encaissé par</legend>
            <div className="flex flex-wrap gap-2">
              {[null, ...sellers].map((sv) => (
                <button
                  type="button"
                  key={sv ?? "me"}
                  aria-pressed={seller === sv}
                  onClick={() => setSeller(sv)}
                  className={`tap btn-press min-h-10 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                    seller === sv ? "border-mint/50 bg-mint/15 text-mint" : "border-line bg-panel2 text-muted"
                  }`}
                >
                  {sv ?? "Moi"}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <Btn variant="mint" onClick={checkout} disabled={!cartLines.length} className="w-full py-4 text-base">
          <Check size={18} aria-hidden="true" /> Encaisser et déduire du stock
        </Btn>
        <Btn
          variant="ghost"
          className="mt-1 w-full"
          onClick={() => {
            setCart({});
            setPane(null);
          }}
        >
          Vider le panier
        </Btn>
      </Sheet>
    </div>
  );
}

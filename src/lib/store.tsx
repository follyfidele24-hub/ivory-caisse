import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DAY, startOfDay, uid } from "./format";

export type TxnType = "sale" | "expense";

export interface Txn {
  id: string;
  type: TxnType;
  amount: number;
  category: string;
  note: string;
  ts: number;
  /** Membre de l'équipe qui a encaissé (vide = le patron) */
  seller?: string;
  /** Lignes du ticket quand la vente vient du stock (panier) */
  items?: TxnItem[];
  /** Date de dernière modification */
  edited?: number;
}

export interface TxnItem {
  productId?: string;
  name: string;
  qty: number;
  price: number;
}

export type ThemeMode = "dark" | "light" | "auto";

export interface DebtMove {
  id: string;
  amount: number;
  note: string;
  ts: number;
}

export type DebtDir = "credit" | "debt";

export interface Debt {
  id: string;
  name: string;
  phone: string;
  /** credit = le client me doit · debt = je dois au fournisseur */
  dir?: DebtDir;
  entries: DebtMove[];
  payments: DebtMove[];
  created: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  alert: number;
  ts: number;
}

export type Plan = "free" | "pro" | "year" | "life";

export interface Profile {
  name: string;
  shop: string;
  plan: Plan;
  created: number;
  /** Code PIN à 4 chiffres (null = désactivé) */
  pin?: string | null;
  /** Objectif de ventes par jour, en unités de la devise */
  dailyGoal?: number;
  /** Code devise (XOF, NGN, GHS, USD...) */
  currency?: string;
  /** Identifiant du thème */
  theme?: string;
  /** Apparence : sombre, clair (plein soleil) ou selon le téléphone */
  mode?: ThemeMode;
  /** Date de la dernière sauvegarde fichier */
  lastBackup?: number;
  /** Rappel de sauvegarde repoussé jusqu'à cette date */
  backupSnooze?: number;
  /** Fin de l'abonnement Premium (null = à vie, absent = gratuit) */
  premiumUntil?: number | null;
  /** Dernière transaction de paiement confirmée */
  lastPaymentTx?: string;
  /** true tant que les données d'exemple de l'inscription sont présentes */
  demo?: boolean;
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Gratuit",
  pro: "Premium",
  year: "Premium Annuel",
  life: "À Vie",
};

export const debtBalance = (d: Debt): number =>
  d.entries.reduce((s, e) => s + e.amount, 0) - d.payments.reduce((s, p) => s + p.amount, 0);

export function totals(txns: Txn[], from: number, to: number) {
  let sales = 0;
  let expenses = 0;
  for (const t of txns) {
    if (t.ts >= from && t.ts < to) {
      if (t.type === "sale") sales += t.amount;
      else expenses += t.amount;
    }
  }
  return { sales, expenses, profit: sales - expenses };
}

interface StoreShape {
  launched: boolean;
  markLaunched: () => void;
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
  sellers: string[];
  completeOnboarding: (name: string, shop: string, currency: string) => void;
  addTxn: (t: Omit<Txn, "id">) => string;
  deleteTxn: (id: string) => void;
  updateTxn: (id: string, patch: Partial<Omit<Txn, "id">>) => void;
  sellCart: (items: { id: string; qty: number }[], seller?: string) => string | null;
  addClient: (name: string, phone: string, dir?: DebtDir) => void;
  addDebtMove: (debtId: string, kind: "entry" | "payment", amount: number, note: string) => void;
  removeClient: (id: string) => void;
  addProduct: (p: Omit<Product, "id" | "ts">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  sellProduct: (id: string, qty: number, seller?: string) => void;
  addSeller: (name: string) => void;
  removeSeller: (name: string) => void;
  setPlan: (p: Plan) => void;
  updateProfile: (p: Partial<Profile>) => void;
  importAll: (d: { txns: Txn[]; debts: Debt[]; products?: Product[]; sellers?: string[] }) => void;
  resetData: () => void;
  resetAll: () => void;
}

const KEY = "ivorycaisse_v4";

interface Persisted {
  launched: boolean;
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
  sellers: string[];
}

const load = (): Persisted => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Persisted>;
      return {
        launched: Boolean(p.launched),
        profile: p.profile ?? null,
        txns: p.txns ?? [],
        debts: p.debts ?? [],
        products: p.products ?? [],
        sellers: p.sellers ?? [],
      };
    }
  } catch {
    /* ignore */
  }
  return { launched: false, profile: null, txns: [], debts: [], products: [], sellers: [] };
};

/* ---------- Migration douce depuis l'ancienne clé ---------- */
(() => {
  try {
    if (!localStorage.getItem(KEY) && localStorage.getItem("ivorycaisse_v3")) {
      localStorage.setItem(KEY, localStorage.getItem("ivorycaisse_v3")!);
    }
  } catch {
    /* ignore */
  }
})();

/* ---------- Données de démonstration ---------- */

const SEED_SELLER = "Grâce";

const SALE_NOTES = [
  "Tissu pagne 3 tons",
  "Riz sac 5kg",
  "Attiéké + poisson",
  "Huile 1L x4",
  "Savon en carton",
  "Pagnes hollandais",
  "Tomates cageot",
  "Crédit téléphone",
];
const EXP_NOTES: [string, string][] = [
  ["Marchandises", "Réassort marché"],
  ["Transport", "Aller-retour taxi"],
  ["Loyer", "Avance boutique"],
  ["Marchandises", "Farine 10kg"],
  ["Frais", "Taxe marché"],
];

function seedTxns(): Txn[] {
  const now = Date.now();
  const out: Txn[] = [];
  const sales = [
    [12500, 8400, 3200],
    [15100, 9700],
    [22000, 12400],
    [9800, 6400, 4100],
    [17300, 8100],
    [25600, 11800, 5200],
    [14200, 9300],
  ];
  const exps = [18000, 2500, 0, 12300, 1500, 5600, 0];
  sales.forEach((day, i) => {
    const base = startOfDay(now) - (6 - i) * DAY;
    day.forEach((amount, j) => {
      out.push({
        id: uid(),
        type: "sale",
        amount,
        category: "Vente",
        note: SALE_NOTES[(i + j * 3) % SALE_NOTES.length],
        ts: base + (9 + j * 4) * 3600000 + 1200000,
        seller: i % 3 === 1 && j === 0 ? SEED_SELLER : undefined,
      });
    });
    if (exps[i] > 0) {
      const e = EXP_NOTES[i % EXP_NOTES.length];
      out.push({ id: uid(), type: "expense", amount: exps[i], category: e[0], note: e[1], ts: base + 7 * 3600000 });
    }
  });
  return out.sort((a, b) => b.ts - a.ts);
}

function seedDebts(): Debt[] {
  const now = Date.now();
  return [
    {
      id: uid(),
      name: "Awa Kouamé",
      phone: "07 08 12 34 56",
      dir: "credit",
      entries: [
        { id: uid(), amount: 10000, note: "Pagne + mèches", ts: now - 5 * DAY },
        { id: uid(), amount: 5000, note: "Riz 5kg", ts: now - 2 * DAY },
      ],
      payments: [{ id: uid(), amount: 5000, note: "Versement mobile money", ts: now - 3 * DAY }],
      created: now - 12 * DAY,
    },
    {
      id: uid(),
      name: "Moussa Traoré",
      phone: "05 54 67 89 01",
      dir: "credit",
      entries: [{ id: uid(), amount: 8500, note: "Carton attiéké", ts: now - DAY }],
      payments: [],
      created: now - 6 * DAY,
    },
    {
      id: uid(),
      name: "Grossiste Central",
      phone: "05 44 55 66 77",
      dir: "debt",
      entries: [{ id: uid(), amount: 45000, note: "10 sacs de riz à crédit", ts: now - 3 * DAY }],
      payments: [{ id: uid(), amount: 20000, note: "Acompte mobile money", ts: now - DAY }],
      created: now - 9 * DAY,
    },
  ];
}

function seedProducts(): Product[] {
  const now = Date.now();
  return [
    { id: uid(), name: "Sac de riz 5kg", price: 4500, cost: 3800, stock: 24, alert: 5, ts: now },
    { id: uid(), name: "Huile végétale 1L", price: 1500, cost: 1200, stock: 36, alert: 10, ts: now },
    { id: uid(), name: "Pagne 3 tons", price: 8500, cost: 6500, stock: 3, alert: 5, ts: now },
    { id: uid(), name: "Savon (carton)", price: 6000, cost: 5000, stock: 8, alert: 4, ts: now },
  ];
}

/* ---------- Contexte ---------- */

const StoreCtx = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const api = useMemo<StoreShape>(
    () => ({
      launched: state.launched,
      profile: state.profile,
      txns: state.txns,
      debts: state.debts,
      products: state.products,
      sellers: state.sellers,
      markLaunched: () => setState((s) => ({ ...s, launched: true })),
      completeOnboarding: (name, shop, currency) =>
        setState((s) => ({
          ...s,
          launched: true,
          profile: { name, shop, plan: "free", created: Date.now(), pin: null, currency, theme: "sunset", demo: true },
          txns: seedTxns(),
          debts: seedDebts(),
          products: seedProducts(),
          sellers: [SEED_SELLER],
        })),
      addTxn: (t) => {
        const id = uid();
        setState((s) => ({ ...s, txns: [{ ...t, id }, ...s.txns] }));
        return id;
      },
      deleteTxn: (id) =>
        setState((s) => {
          const t = s.txns.find((x) => x.id === id);
          /* Une vente faite depuis le stock remet les articles en rayon */
          const back = new Map<string, number>();
          t?.items?.forEach((it) => it.productId && back.set(it.productId, (back.get(it.productId) ?? 0) + it.qty));
          return {
            ...s,
            txns: s.txns.filter((x) => x.id !== id),
            products: back.size ? s.products.map((p) => (back.has(p.id) ? { ...p, stock: p.stock + back.get(p.id)! } : p)) : s.products,
          };
        }),
      updateTxn: (id, patch) =>
        setState((s) => ({
          ...s,
          txns: s.txns.map((t) => (t.id === id ? { ...t, ...patch, edited: Date.now() } : t)).sort((a, b) => b.ts - a.ts),
        })),
      sellCart: (items, seller) => {
        const id = uid();
        let ok = false;
        setState((s) => {
          const lines: TxnItem[] = [];
          for (const it of items) {
            const p = s.products.find((x) => x.id === it.id);
            if (!p || it.qty <= 0) continue;
            lines.push({ productId: p.id, name: p.name, qty: Math.min(it.qty, p.stock), price: p.price });
          }
          const valid = lines.filter((l) => l.qty > 0);
          if (!valid.length) return s;
          ok = true;
          const txn: Txn = {
            id,
            type: "sale",
            amount: valid.reduce((a, l) => a + l.qty * l.price, 0),
            category: "Vente",
            note: valid.map((l) => `${l.name} ×${l.qty}`).join(", "),
            ts: Date.now(),
            seller,
            items: valid,
          };
          const dec = new Map(valid.map((l) => [l.productId!, l.qty]));
          return {
            ...s,
            products: s.products.map((p) => (dec.has(p.id) ? { ...p, stock: Math.max(0, p.stock - dec.get(p.id)!) } : p)),
            txns: [txn, ...s.txns],
          };
        });
        return ok || items.length ? id : null;
      },
      addClient: (name, phone, dir = "credit") =>
        setState((s) => {
          const c: Debt = { id: uid(), name, phone, dir, entries: [], payments: [], created: Date.now() };
          return { ...s, debts: [c, ...s.debts] };
        }),
      addDebtMove: (debtId, kind, amount, note) =>
        setState((s) => ({
          ...s,
          debts: s.debts.map((d) => {
            if (d.id !== debtId) return d;
            const move: DebtMove = { id: uid(), amount, note, ts: Date.now() };
            return kind === "entry" ? { ...d, entries: [move, ...d.entries] } : { ...d, payments: [move, ...d.payments] };
          }),
        })),
      removeClient: (id) => setState((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) })),
      addProduct: (p) => setState((s) => ({ ...s, products: [{ ...p, id: uid(), ts: Date.now() }, ...s.products] })),
      updateProduct: (id, patch) =>
        setState((s) => ({ ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      deleteProduct: (id) => setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })),
      sellProduct: (id, qty, seller) =>
        setState((s) => {
          const p = s.products.find((x) => x.id === id);
          if (!p || qty <= 0) return s;
          const txn: Txn = {
            id: uid(),
            type: "sale",
            amount: p.price * qty,
            category: "Vente",
            note: `${p.name} ×${qty}`,
            ts: Date.now(),
            seller,
            items: [{ productId: p.id, name: p.name, qty, price: p.price }],
          };
          return {
            ...s,
            products: s.products.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock - qty) } : x)),
            txns: [txn, ...s.txns],
          };
        }),
      addSeller: (name) =>
        setState((s) => {
          const n = name.trim();
          if (n.length < 2 || s.sellers.includes(n) || s.sellers.length >= 8) return s;
          return { ...s, sellers: [...s.sellers, n] };
        }),
      removeSeller: (name) => setState((s) => ({ ...s, sellers: s.sellers.filter((x) => x !== name) })),
      setPlan: (p) => setState((s) => (s.profile ? { ...s, profile: { ...s.profile, plan: p } } : s)),
      updateProfile: (p) => setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...p } } : s)),
      importAll: (d) =>
        setState((s) => ({
          ...s,
          txns: d.txns ?? [],
          debts: d.debts ?? [],
          products: d.products ?? s.products,
          sellers: d.sellers ?? s.sellers,
        })),
      resetData: () =>
        setState((s) => ({
          ...s,
          txns: [],
          debts: [],
          products: [],
          sellers: [],
          profile: s.profile ? { ...s.profile, demo: false } : s.profile,
        })),
      resetAll: () => setState({ launched: true, profile: null, txns: [], debts: [], products: [], sellers: [] }),
    }),
    [state]
  );

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore doit être utilisé dans StoreProvider");
  return ctx;
}

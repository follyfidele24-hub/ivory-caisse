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
  /** Lignes liées au stock : vente (sortie) ou achat de marchandises (entrée) */
  items?: TxnItem[];
  /** Date de dernière modification */
  edited?: number;
  /** Membre de l'équipe qui a saisi le mouvement (vide = le patron) */
  by?: string;
  /** Dépense saisie par un vendeur, en attente du contrôle du patron */
  review?: "pending" | "ok";
}

export interface TxnItem {
  productId?: string;
  name: string;
  qty: number;
  price: number;
  /** Prix d'achat unitaire au moment de la vente (pour la marge exacte) */
  cost?: number;
}

export type ThemeMode = "dark" | "light" | "auto";

export interface DebtMove {
  id: string;
  amount: number;
  note: string;
  ts: number;
  /** Membre de l'équipe qui a noté le mouvement (vide = le patron) */
  by?: string;
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
  /** Dernière relance envoyée (WhatsApp) */
  remindedAt?: number;
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
  /** Clé de licence Chariow activée sur ce téléphone */
  licenseKey?: string;
  /** Dernière vérification de la licence auprès du serveur */
  licenseCheckedAt?: number;
  /** Dernière transaction de paiement confirmée */
  lastPaymentTx?: string;
  /** true tant que les données d'exemple de l'inscription sont présentes */
  demo?: boolean;
  /** Reçu personnalisé (Premium) */
  receipt?: { city?: string; phone?: string; thanks?: string };
  /** Code de secours du patron (récupère le PIN sans la clé de licence) */
  recovery?: string;
  /** Début de l'essai Premium offert (une seule fois par boutique) */
  trialStart?: number;
  /** Le patron a fermé la carte « essai terminé » */
  trialEndSeen?: boolean;
}

/** Essai Premium offert à chaque nouvelle boutique */
export const TRIAL_DAYS = 14;
/** En gratuit, seul le premier vendeur créé garde son accès */
export const FREE_STAFF = 1;

export interface TrialInfo {
  /** Essai en cours : l'app se comporte comme en Premium */
  active: boolean;
  /** Essai terminé sans abonnement */
  ended: boolean;
  until: number;
  daysLeft: number;
}

export function trialInfo(p: Profile | null, now = Date.now()): TrialInfo {
  if (!p?.trialStart || p.plan !== "free") return { active: false, ended: false, until: 0, daysLeft: 0 };
  const until = p.trialStart + TRIAL_DAYS * 86_400_000;
  const left = until - now;
  return { active: left > 0, ended: left <= 0, until, daysLeft: Math.max(0, Math.ceil(left / 86_400_000)) };
}

/* ---------- Équipe, droits et contrôle ---------- */

/** Accès d'un vendeur : un prénom et son propre code PIN */
export interface StaffAccess {
  name: string;
  pin: string;
  active: boolean;
  created: number;
}

/** Règles fixées par le patron */
export interface Rules {
  /** Dépense maximale qu'un vendeur saisit seul */
  expenseCap: number;
  /** Délai (minutes) pendant lequel un vendeur peut annuler sa propre vente */
  cancelMin: number;
  /** Nombre d'annulations par jour et par vendeur sans le patron */
  cancelPerDay: number;
}
export const DEFAULT_RULES: Rules = { expenseCap: 5000, cancelMin: 2, cancelPerDay: 3 };

export type JournalAction =
  | "login" | "sale" | "expense" | "cancel" | "delete" | "edit" | "stock" | "product"
  | "debt" | "team" | "rules" | "closure" | "review" | "pin" | "denied" | "data";

/** Une ligne du journal : qui, quand, quoi. Ajout seulement, jamais modifiée. */
export interface JournalEntry {
  id: string;
  ts: number;
  who: string;
  staff: boolean;
  action: JournalAction;
  text: string;
  amount?: number;
}

/** Clôture de caisse d'une personne : ce qui était attendu, ce qui a été compté */
export interface Closure {
  id: string;
  ts: number;
  who: string;
  staff: boolean;
  from: number;
  expected: number;
  cash: number;
  momo: number;
  diff: number;
  note: string;
}

export const OWNER = "Patron";
export const JOURNAL_MAX = 5000;

/** PIN trop facile à deviner : chiffres identiques, suites, motifs répétés */
export function weakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const d = pin.split("").map(Number);
  const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  if (up || down) return true;
  if (pin[0] === pin[2] && pin[1] === pin[3]) return true;
  return ["1122", "2580", "0852", "1004", "2000", "2001", "1999"].includes(pin);
}

/** Ce qu'un vendeur reste autorisé à annuler aujourd'hui */
export function cancelStatus(txn: Txn, who: string, journal: JournalEntry[], rules: Rules, now = Date.now()) {
  const mine = (txn.by ?? txn.seller) === who;
  const inTime = now - txn.ts <= rules.cancelMin * 60_000;
  const start = startOfDay(now);
  const used = journal.filter((j) => j.staff && j.who === who && j.action === "cancel" && j.ts >= start).length;
  const left = Math.max(0, rules.cancelPerDay - used);
  return { ok: mine && inTime && left > 0, mine, inTime, left };
}

/** Argent qu'une personne doit avoir en main depuis une date */
export function expectedCash(txns: Txn[], debts: Debt[], who: string | null, from: number, to = Date.now()) {
  const me = (x?: string) => (who === null ? !x : x === who);
  let sales = 0, expenses = 0, collected = 0, paidOut = 0;
  for (const t of txns) {
    if (t.ts < from || t.ts > to || !me(t.by ?? t.seller)) continue;
    if (t.type === "sale") sales += t.amount;
    else expenses += t.amount;
  }
  for (const d of debts)
    for (const m of d.payments)
      if (m.ts >= from && m.ts <= to && me(m.by)) {
        if ((d.dir ?? "credit") === "credit") collected += m.amount;
        else paidOut += m.amount;
      }
  return { sales, expenses, collected, paidOut, expected: sales - expenses + collected - paidOut };
}

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Gratuit",
  pro: "Premium",
  year: "Premium Annuel",
  life: "À Vie",
};

export const debtBalance = (d: Debt): number =>
  d.entries.reduce((s, e) => s + e.amount, 0) - d.payments.reduce((s, p) => s + p.amount, 0);

/* ---------- Relances ----------
   Un client « à relancer » : il doit encore de l'argent, rien n'a bougé sur sa fiche depuis
   RELANCE_DAYS jours, et on ne l'a pas déjà relancé ces REMIND_PAUSE derniers jours. */
export const RELANCE_DAYS = 7;
const REMIND_PAUSE = 3;
export const lastMoveTs = (d: Debt): number =>
  Math.max(d.created, ...d.entries.map((e) => e.ts), ...d.payments.map((p) => p.ts));
export function toRemind(debts: Debt[], now = Date.now()): Debt[] {
  return debts
    .filter(
      (d) =>
        (d.dir ?? "credit") === "credit" &&
        debtBalance(d) > 0 &&
        now - lastMoveTs(d) >= RELANCE_DAYS * DAY &&
        (!d.remindedAt || now - d.remindedAt >= REMIND_PAUSE * DAY),
    )
    .sort((a, b) => debtBalance(b) - debtBalance(a));
}

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

type Res = { ok: true } | { ok: false; why: string };

interface StoreShape {
  launched: boolean;
  markLaunched: () => void;
  /** Profil vu par l'app : pendant l'essai, plan = "pro" */
  profile: Profile | null;
  /** Plan réellement payé (sans l'essai) */
  paidPlan: Plan;
  trial: TrialInfo;
  /** false si ce vendeur dépasse la limite du gratuit (accès en pause) */
  staffAllowed: (name: string) => boolean;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
  sellers: string[];
  /* ---- équipe et contrôle ---- */
  staff: StaffAccess[];
  journal: JournalEntry[];
  closures: Closure[];
  rules: Rules;
  /** Les rôles sont actifs : PIN patron + au moins un accès vendeur */
  rolesOn: boolean;
  /** Personne connectée (null = le patron) */
  actor: string | null;
  /** true si un vendeur est aux commandes : droits réduits */
  isStaff: boolean;
  /** Nom affiché de la personne connectée */
  actorName: string;
  login: (who: string | null, pin: string) => boolean;
  logout: () => void;
  checkOwnerPin: (pin: string) => boolean;
  /** Note au journal une tentative refusée (ex. mauvais PIN patron tapé sur le téléphone d'un vendeur) */
  logDenied: (text: string) => void;
  addStaff: (name: string, pin: string) => Res;
  setStaffPin: (name: string, pin: string) => Res;
  setStaffActive: (name: string, active: boolean) => void;
  removeStaff: (name: string) => void;
  setRules: (r: Rules) => void;
  addClosure: (c: Omit<Closure, "id" | "ts" | "who" | "staff">) => void;
  markReviewed: (id: string) => void;
  /** Nouveau PIN patron avec la clé de licence ou le code de secours */
  recoverOwner: (secret: string, newPin: string) => Res;
  ensureRecovery: () => string;
  /* ---- mouvements ---- */
  completeOnboarding: (name: string, shop: string, currency: string) => void;
  /** Renvoie l'id créé, ou "" si refusé (dépense vendeur au-delà du plafond sans PIN patron) */
  addTxn: (t: Omit<Txn, "id">, opts?: { ownerPin?: string }) => string;
  /** false si un vendeur n'a pas le droit d'annuler ce mouvement */
  deleteTxn: (id: string, opts?: { ownerPin?: string }) => boolean;
  updateTxn: (id: string, patch: Partial<Omit<Txn, "id">>) => void;
  sellCart: (items: { id: string; qty: number }[], seller?: string) => string | null;
  /** Achat de marchandises : crée la dépense et remet les quantités en stock */
  restock: (productId: string, qty: number, amount: number, note: string) => string | null;
  addClient: (name: string, phone: string, dir?: DebtDir) => void;
  addDebtMove: (debtId: string, kind: "entry" | "payment", amount: number, note: string) => void;
  removeClient: (id: string) => void;
  markReminded: (id: string) => void;
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
const ACTOR_KEY = "ivorycaisse_actor";

interface Persisted {
  launched: boolean;
  profile: Profile | null;
  txns: Txn[];
  debts: Debt[];
  products: Product[];
  sellers: string[];
  staff: StaffAccess[];
  journal: JournalEntry[];
  closures: Closure[];
  rules: Rules;
}

const EMPTY: Persisted = {
  launched: false, profile: null, txns: [], debts: [], products: [], sellers: [],
  staff: [], journal: [], closures: [], rules: DEFAULT_RULES,
};

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
        staff: p.staff ?? [],
        journal: p.journal ?? [],
        closures: p.closures ?? [],
        rules: { ...DEFAULT_RULES, ...(p.rules ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return EMPTY;
};

const loadActor = (): string | null => {
  try {
    return localStorage.getItem(ACTOR_KEY) || null;
  } catch {
    return null;
  }
};

const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/\u202F/g, " ")} F`;

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
  const [actor, setActorRaw] = useState<string | null>(loadActor);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const setActor = (a: string | null) => {
    setActorRaw(a);
    try {
      if (a) localStorage.setItem(ACTOR_KEY, a);
      else localStorage.removeItem(ACTOR_KEY);
    } catch {
      /* ignore */
    }
  };

  /* Essai Premium : donné une fois à chaque boutique gratuite, y compris celles créées avant cette version */
  useEffect(() => {
    if (state.profile && state.profile.plan === "free" && !state.profile.trialStart && !state.profile.licenseKey) {
      setState((s) => (s.profile ? { ...s, profile: { ...s.profile, trialStart: Date.now() } } : s));
    }
  }, [state.profile]);

  const trial = trialInfo(state.profile);
  const effFree = state.profile?.plan === "free" && !trial.active;
  const sortedStaff = [...state.staff].sort((a, b) => a.created - b.created);
  const staffAllowed = (name: string) => !effFree || sortedStaff.findIndex((x) => x.name === name) < FREE_STAFF;

  const rolesOn = Boolean(state.profile?.pin) && state.staff.some((x) => x.active);
  /* Un nom de vendeur retiré ou désactivé ne garde aucun droit */
  const isStaff = rolesOn && actor !== null && state.staff.some((x) => x.name === actor && x.active) && staffAllowed(actor);
  const who = isStaff ? actor! : OWNER;

  const api = useMemo<StoreShape>(() => {
    /** Ajoute une ligne au journal (append-only, plafonné aux JOURNAL_MAX dernières) */
    const log = (s: Persisted, action: JournalAction, text: string, amount?: number): JournalEntry[] => {
      const e: JournalEntry = { id: uid(), ts: Date.now(), who, staff: isStaff, action, text, amount };
      const j = [e, ...s.journal];
      return j.length > JOURNAL_MAX ? j.slice(0, JOURNAL_MAX) : j;
    };
    const ownerOk = (pin?: string) => Boolean(pin && state.profile?.pin && pin === state.profile.pin);
    const denied = (text: string) => setState((s) => ({ ...s, journal: log(s, "denied", text) }));
    /** Les actions du patron seulement : un vendeur est refusé et la tentative est notée */
    const ownerOnly = (label: string, fn: () => void) => {
      if (isStaff) {
        denied(`Tentative refusée : ${label}`);
        return;
      }
      fn();
    };
    const nameOf = (s: Persisted, pid: string) => s.products.find((p) => p.id === pid)?.name ?? "article";

    return {
      launched: state.launched,
      profile: trial.active && state.profile ? { ...state.profile, plan: "pro" } : state.profile,
      paidPlan: state.profile?.plan ?? "free",
      trial,
      staffAllowed,
      txns: state.txns,
      debts: state.debts,
      products: state.products,
      sellers: state.sellers,
      staff: state.staff,
      journal: state.journal,
      closures: state.closures,
      rules: state.rules,
      rolesOn,
      actor: isStaff ? actor : null,
      isStaff,
      actorName: isStaff ? actor! : state.profile?.name?.split(" ")[0] || OWNER,

      login: (target, pin) => {
        if (target === null) {
          if (pin !== state.profile?.pin) return false;
          setActor(null);
          setState((s) => ({ ...s, journal: [{ id: uid(), ts: Date.now(), who: OWNER, staff: false, action: "login", text: "Connexion du patron" }, ...s.journal] }));
          return true;
        }
        const st = state.staff.find((x) => x.name === target && x.active);
        if (!st || st.pin !== pin || !staffAllowed(target)) return false;
        setActor(target);
        setState((s) => ({ ...s, journal: [{ id: uid(), ts: Date.now(), who: target, staff: true, action: "login", text: `Connexion de ${target}` }, ...s.journal] }));
        return true;
      },
      logout: () => setActor(null),
      checkOwnerPin: (pin) => ownerOk(pin),
      logDenied: (text) => denied(text),

      addStaff: (name, pin) => {
        if (isStaff) return { ok: false, why: "Réservé au patron" };
        const n = name.trim();
        if (n.length < 2) return { ok: false, why: "Prénom trop court" };
        if (n.toLowerCase() === OWNER.toLowerCase()) return { ok: false, why: "Choisis un autre prénom" };
        if (!state.profile?.pin) return { ok: false, why: "Crée d'abord ton PIN patron" };
        if (state.staff.some((x) => x.name.toLowerCase() === n.toLowerCase())) return { ok: false, why: "Ce prénom a déjà un accès" };
        if (weakPin(pin)) return { ok: false, why: "PIN trop simple (évite 1234, 0000, 1212…)" };
        if (pin === state.profile.pin || state.staff.some((x) => x.pin === pin)) return { ok: false, why: "Ce PIN est déjà utilisé" };
        setState((s) => ({
          ...s,
          staff: [...s.staff, { name: n, pin, active: true, created: Date.now() }],
          sellers: s.sellers.includes(n) ? s.sellers : [...s.sellers, n],
          journal: log(s, "team", `Accès vendeur créé pour ${n}`),
        }));
        return { ok: true };
      },
      setStaffPin: (name, pin) => {
        if (isStaff) return { ok: false, why: "Réservé au patron" };
        if (weakPin(pin)) return { ok: false, why: "PIN trop simple (évite 1234, 0000, 1212…)" };
        if (pin === state.profile?.pin || state.staff.some((x) => x.name !== name && x.pin === pin)) return { ok: false, why: "Ce PIN est déjà utilisé" };
        setState((s) => ({ ...s, staff: s.staff.map((x) => (x.name === name ? { ...x, pin } : x)), journal: log(s, "pin", `Nouveau PIN pour ${name}`) }));
        return { ok: true };
      },
      setStaffActive: (name, active) =>
        ownerOnly("suspendre un accès", () =>
          setState((s) => ({ ...s, staff: s.staff.map((x) => (x.name === name ? { ...x, active } : x)), journal: log(s, "team", `${active ? "Accès réactivé" : "Accès suspendu"} : ${name}`) })),
        ),
      removeStaff: (name) =>
        ownerOnly("retirer un accès", () =>
          setState((s) => ({ ...s, staff: s.staff.filter((x) => x.name !== name), journal: log(s, "team", `Accès retiré : ${name}`) })),
        ),
      setRules: (r) =>
        ownerOnly("changer les règles", () =>
          setState((s) => ({
            ...s,
            rules: r,
            journal: log(s, "rules", `Règles : dépense seule ≤ ${money(r.expenseCap)}, annulation ${r.cancelMin} min, ${r.cancelPerDay}/jour`),
          })),
        ),
      addClosure: (c) =>
        setState((s) => ({
          ...s,
          closures: [{ ...c, id: uid(), ts: Date.now(), who, staff: isStaff }, ...s.closures].slice(0, 1000),
          journal: log(
            s,
            "closure",
            `Clôture de caisse : attendu ${money(c.expected)}, compté ${money(c.cash + c.momo)}, ${c.diff === 0 ? "caisse juste" : c.diff < 0 ? `manque ${money(-c.diff)}` : `surplus ${money(c.diff)}`}`,
            c.diff,
          ),
        })),
      markReviewed: (id) =>
        ownerOnly("valider une dépense", () =>
          setState((s) => {
            const t = s.txns.find((x) => x.id === id);
            return { ...s, txns: s.txns.map((x) => (x.id === id ? { ...x, review: "ok" as const } : x)), journal: t ? log(s, "review", `Dépense vérifiée : ${t.note || t.category} (${t.by ?? "?"})`, t.amount) : s.journal };
          }),
        ),
      recoverOwner: (secret, newPin) => {
        const sec = secret.trim().toUpperCase();
        const prof = state.profile;
        if (!prof) return { ok: false, why: "Aucune boutique" };
        const good = (prof.licenseKey && sec === prof.licenseKey.trim().toUpperCase()) || (prof.recovery && sec === prof.recovery);
        if (!good) return { ok: false, why: "Clé ou code de secours incorrect" };
        if (weakPin(newPin)) return { ok: false, why: "PIN trop simple" };
        if (state.staff.some((x) => x.pin === newPin)) return { ok: false, why: "Ce PIN est déjà utilisé par un vendeur" };
        setActor(null);
        setState((s) => ({
          ...s,
          profile: s.profile ? { ...s.profile, pin: newPin } : s.profile,
          journal: [{ id: uid(), ts: Date.now(), who: OWNER, staff: false, action: "pin", text: "PIN patron réinitialisé (clé de secours)" }, ...s.journal],
        }));
        return { ok: true };
      },
      ensureRecovery: () => {
        if (state.profile?.recovery) return state.profile.recovery;
        const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const buf = new Uint32Array(8);
        crypto.getRandomValues(buf);
        const code = Array.from(buf, (n) => abc[n % abc.length]).join("");
        const pretty = `${code.slice(0, 4)}-${code.slice(4)}`;
        setState((s) => (s.profile ? { ...s, profile: { ...s.profile, recovery: pretty } } : s));
        return pretty;
      },

      markLaunched: () => setState((s) => ({ ...s, launched: true })),
      completeOnboarding: (name, shop, currency) =>
        setState((s) => ({
          ...s,
          launched: true,
          profile: { name, shop, plan: "free", created: Date.now(), pin: null, currency, theme: "sunset", demo: true, trialStart: Date.now() },
          txns: seedTxns(),
          debts: seedDebts(),
          products: seedProducts(),
          sellers: [SEED_SELLER],
        })),
      addTxn: (t, opts) => {
        let review: Txn["review"];
        if (isStaff && t.type === "expense") {
          if (t.amount > state.rules.expenseCap && !ownerOk(opts?.ownerPin)) {
            denied(`Dépense de ${money(t.amount)} refusée (plafond ${money(state.rules.expenseCap)})`);
            return "";
          }
          review = ownerOk(opts?.ownerPin) ? "ok" : "pending";
        }
        const id = uid();
        const row: Txn = isStaff
          ? { ...t, id, by: actor!, seller: t.type === "sale" ? actor! : undefined, review }
          : { ...t, id };
        setState((s) => ({
          ...s,
          txns: [row, ...s.txns],
          journal: log(s, row.type === "sale" ? "sale" : "expense", `${row.type === "sale" ? "Vente" : "Dépense"} : ${row.note || row.category}${review === "ok" ? " (validée par le patron)" : ""}`, row.amount),
        }));
        return id;
      },
      deleteTxn: (id, opts) => {
        const t = state.txns.find((x) => x.id === id);
        if (!t) return false;
        const override = ownerOk(opts?.ownerPin);
        if (isStaff && !override) {
          const st = cancelStatus(t, actor!, state.journal, state.rules);
          if (!st.ok) {
            denied(`Annulation refusée : ${t.note || t.category} (${money(t.amount)})`);
            return false;
          }
        }
        setState((s) => {
          const tt = s.txns.find((x) => x.id === id);
          if (!tt) return s;
          /* Supprimer une vente remet les articles en rayon ; supprimer un achat les retire */
          const sign = tt.type === "expense" ? -1 : 1;
          const back = new Map<string, number>();
          tt.items?.forEach((it) => it.productId && back.set(it.productId, (back.get(it.productId) ?? 0) + it.qty));
          const label = `${tt.type === "sale" ? "vente" : "dépense"} « ${tt.note || tt.category} » du ${new Date(tt.ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
          return {
            ...s,
            txns: s.txns.filter((x) => x.id !== id),
            products: back.size
              ? s.products.map((p) => (back.has(p.id) ? { ...p, stock: Math.max(0, p.stock + sign * back.get(p.id)!) } : p))
              : s.products,
            journal: log(s, isStaff ? "cancel" : "delete", `${isStaff ? "Annulation" : "Suppression"} : ${label}${isStaff && override ? " (PIN patron)" : ""}`, tt.amount),
          };
        });
        return true;
      },
      updateTxn: (id, patch) =>
        ownerOnly("modifier un mouvement", () =>
          setState((s) => {
            const old = s.txns.find((t) => t.id === id);
            const changed = old && patch.amount !== undefined && patch.amount !== old.amount ? ` ${money(old.amount)} → ${money(patch.amount)}` : "";
            return {
              ...s,
              txns: s.txns.map((t) => (t.id === id ? { ...t, ...patch, edited: Date.now() } : t)).sort((a, b) => b.ts - a.ts),
              journal: old ? log(s, "edit", `Modification : ${old.note || old.category}${changed}`, patch.amount ?? old.amount) : s.journal,
            };
          }),
        ),
      sellCart: (items, seller) => {
        /* Contrôle immédiat : rien à encaisser si aucun article demandé n'est disponible */
        const sellable = items.some((it) => it.qty > 0 && (state.products.find((p) => p.id === it.id)?.stock ?? 0) > 0);
        if (!sellable) return null;
        const id = uid();
        const by = isStaff ? actor! : undefined;
        setState((s) => {
          const lines: TxnItem[] = [];
          for (const it of items) {
            const p = s.products.find((x) => x.id === it.id);
            if (!p || it.qty <= 0) continue;
            lines.push({ productId: p.id, name: p.name, qty: Math.min(it.qty, p.stock), price: p.price, cost: p.cost });
          }
          const valid = lines.filter((l) => l.qty > 0);
          if (!valid.length) return s;
          const txn: Txn = {
            id,
            type: "sale",
            amount: valid.reduce((a, l) => a + l.qty * l.price, 0),
            category: "Vente",
            note: valid.map((l) => `${l.name} ×${l.qty}`).join(", "),
            ts: Date.now(),
            seller: by ?? seller,
            by,
            items: valid,
          };
          const dec = new Map(valid.map((l) => [l.productId!, l.qty]));
          return {
            ...s,
            products: s.products.map((p) => (dec.has(p.id) ? { ...p, stock: Math.max(0, p.stock - dec.get(p.id)!) } : p)),
            txns: [txn, ...s.txns],
            journal: log(s, "sale", `Vente : ${txn.note}`, txn.amount),
          };
        });
        return id;
      },
      restock: (productId, qty, amount, note) => {
        const p0 = state.products.find((p) => p.id === productId);
        if (!p0 || qty <= 0 || amount < 0) return null;
        if (isStaff) {
          denied(`Tentative refusée : réassort de ${p0.name}`);
          return null;
        }
        const id = uid();
        setState((s) => {
          const p = s.products.find((x) => x.id === productId);
          if (!p) return s;
          const unit = amount > 0 ? Math.round(amount / qty) : p.cost;
          const txn: Txn = {
            id,
            type: "expense",
            amount,
            category: "Marchandises",
            note: note || `Réappro ${p.name} ×${qty}`,
            ts: Date.now(),
            items: [{ productId: p.id, name: p.name, qty, price: unit }],
          };
          return {
            ...s,
            /* Le prix d'achat suit le dernier réassort : la marge reste juste */
            products: s.products.map((x) => (x.id === productId ? { ...x, stock: x.stock + qty, cost: unit } : x)),
            txns: [txn, ...s.txns],
            journal: log(s, "stock", `Réassort : ${p.name} +${qty} (stock ${p.stock} → ${p.stock + qty})`, amount),
          };
        });
        return id;
      },
      addClient: (name, phone, dir = "credit") =>
        setState((s) => {
          const c: Debt = { id: uid(), name, phone, dir, entries: [], payments: [], created: Date.now() };
          return { ...s, debts: [c, ...s.debts], journal: log(s, "debt", `Nouvelle fiche ${dir === "credit" ? "client" : "fournisseur"} : ${name}`) };
        }),
      addDebtMove: (debtId, kind, amount, note) =>
        setState((s) => {
          const d0 = s.debts.find((d) => d.id === debtId);
          return {
            ...s,
            debts: s.debts.map((d) => {
              if (d.id !== debtId) return d;
              const move: DebtMove = { id: uid(), amount, note, ts: Date.now(), by: isStaff ? actor! : undefined };
              return kind === "entry" ? { ...d, entries: [move, ...d.entries] } : { ...d, payments: [move, ...d.payments] };
            }),
            journal: d0 ? log(s, "debt", `${kind === "entry" ? "Crédit ajouté" : "Remboursement reçu"} : ${d0.name}${note ? ` (${note})` : ""}`, amount) : s.journal,
          };
        }),
      removeClient: (id) =>
        ownerOnly("supprimer une fiche client", () =>
          setState((s) => {
            const d = s.debts.find((x) => x.id === id);
            return { ...s, debts: s.debts.filter((x) => x.id !== id), journal: d ? log(s, "debt", `Fiche supprimée : ${d.name} (solde ${money(debtBalance(d))})`, debtBalance(d)) : s.journal };
          }),
        ),
      markReminded: (id) =>
        setState((s) => ({ ...s, debts: s.debts.map((d) => (d.id === id ? { ...d, remindedAt: Date.now() } : d)) })),
      addProduct: (p) =>
        ownerOnly("ajouter un produit", () =>
          setState((s) => ({ ...s, products: [{ ...p, id: uid(), ts: Date.now() }, ...s.products], journal: log(s, "product", `Produit ajouté : ${p.name} (stock ${p.stock}, prix ${money(p.price)})`) })),
        ),
      updateProduct: (id, patch) =>
        ownerOnly("modifier un produit", () =>
          setState((s) => {
            const old = s.products.find((p) => p.id === id);
            const bits: string[] = [];
            if (old && patch.stock !== undefined && patch.stock !== old.stock) bits.push(`stock ${old.stock} → ${patch.stock}`);
            if (old && patch.price !== undefined && patch.price !== old.price) bits.push(`prix ${money(old.price)} → ${money(patch.price)}`);
            if (old && patch.cost !== undefined && patch.cost !== old.cost) bits.push(`achat ${money(old.cost)} → ${money(patch.cost)}`);
            return {
              ...s,
              products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
              journal: old ? log(s, bits.some((b) => b.startsWith("stock")) ? "stock" : "product", `Produit modifié : ${old.name}${bits.length ? ` (${bits.join(", ")})` : ""}`) : s.journal,
            };
          }),
        ),
      deleteProduct: (id) =>
        ownerOnly("supprimer un produit", () =>
          setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id), journal: log(s, "product", `Produit supprimé : ${nameOf(s, id)}`) })),
        ),
      sellProduct: (id, qty, seller) =>
        setState((s) => {
          const p = s.products.find((x) => x.id === id);
          if (!p || qty <= 0 || p.stock <= 0) return s;
          qty = Math.min(qty, p.stock);
          const by = isStaff ? actor! : undefined;
          const txn: Txn = {
            id: uid(),
            type: "sale",
            amount: p.price * qty,
            category: "Vente",
            note: `${p.name} ×${qty}`,
            ts: Date.now(),
            seller: by ?? seller,
            by,
            items: [{ productId: p.id, name: p.name, qty, price: p.price, cost: p.cost }],
          };
          return {
            ...s,
            products: s.products.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock - qty) } : x)),
            txns: [txn, ...s.txns],
            journal: log(s, "sale", `Vente : ${txn.note}`, txn.amount),
          };
        }),
      addSeller: (name) =>
        ownerOnly("ajouter un vendeur", () =>
          setState((s) => {
            const n = name.trim();
            if (n.length < 2 || s.sellers.includes(n) || s.sellers.length >= 8) return s;
            return { ...s, sellers: [...s.sellers, n] };
          }),
        ),
      removeSeller: (name) =>
        ownerOnly("retirer un vendeur", () =>
          setState((s) => ({ ...s, sellers: s.sellers.filter((x) => x !== name), staff: s.staff.filter((x) => x.name !== name) })),
        ),
      setPlan: (p) => setState((s) => (s.profile ? { ...s, profile: { ...s.profile, plan: p } } : s)),
      updateProfile: (p) =>
        setState((s) => {
          if (!s.profile) return s;
          const pinChange = "pin" in p && p.pin !== s.profile.pin;
          return {
            ...s,
            profile: { ...s.profile, ...p },
            journal: pinChange ? log(s, "pin", p.pin ? "PIN patron défini ou modifié" : "PIN patron désactivé") : s.journal,
          };
        }),
      importAll: (d) =>
        ownerOnly("restaurer une sauvegarde", () =>
          setState((s) => ({
            ...s,
            txns: d.txns ?? [],
            debts: d.debts ?? [],
            products: d.products ?? s.products,
            sellers: d.sellers ?? s.sellers,
            journal: log(s, "data", `Sauvegarde restaurée (${(d.txns ?? []).length} mouvements)`),
          })),
        ),
      resetData: () =>
        ownerOnly("effacer les données", () =>
          setState((s) => ({
            ...s,
            txns: [],
            debts: [],
            products: [],
            sellers: s.staff.map((x) => x.name),
            closures: [],
            profile: s.profile ? { ...s.profile, demo: false } : s.profile,
            journal: log(s, "data", "Données effacées par le patron"),
          })),
        ),
      resetAll: () =>
        ownerOnly("réinitialiser l'app", () => {
          setActor(null);
          setState({ ...EMPTY, launched: true });
        }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, actor, rolesOn, isStaff, who, trial.active, trial.daysLeft]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreShape {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore doit être utilisé dans StoreProvider");
  return ctx;
}

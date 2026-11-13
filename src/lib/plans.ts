import type { Plan } from "./store";
import { cloudReady } from "./cloudFlag";

export interface PlanDef {
  id: Plan;
  name: string;
  price: string;
  /** Montant numérique en FCFA (utilisé pour le paiement réel) */
  amount: number;
  per: string;
  tag?: string;
  highlight?: boolean;
  features: string[];
  /** Page d'achat de la licence sur la boutique Chariow Ivory Gestion */
  chariowUrl?: string;
}

export const CHARIOW_STORE = "https://nunovjiz.mychariow.shop";

/* Uniquement ce que l'app fait vraiment : chaque ligne correspond à un verrou dans le code
   (Debts FREE_LIMIT, History "Tout", Reports "Mois", exports). Le cloud n'apparaît que s'il est branché. */
const PREMIUM_FEATURES = [
  "Clients crédit illimités",
  "Historique complet",
  "Rapports du mois",
  "Export PDF & Excel",
  ...(cloudReady ? ["Sauvegarde cloud"] : []),
];

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0 F",
    amount: 0,
    per: "pour toujours",
    features: ["Ventes, dépenses & stock illimités", "5 clients crédit", "Rapports jour et semaine", "Historique 30 jours", "100% hors-ligne"],
  },
  {
    id: "pro",
    name: "Premium",
    price: "2 000 F",
    amount: 2000,
    per: "/ mois",
    tag: "Recommandé",
    highlight: true,
    features: PREMIUM_FEATURES,
    chariowUrl: "https://nunovjiz.mychariow.shop/prd_ewwwyub0",
  },
  {
    id: "year",
    name: "Annuel",
    price: "15 000 F",
    amount: 15000,
    per: "/ an",
    tag: "Économise 37%",
    features: PREMIUM_FEATURES,
    chariowUrl: "https://nunovjiz.mychariow.shop/prd_h95p8e2k",
  },
  {
    id: "life",
    name: "À Vie",
    price: "25 000 F",
    amount: 25000,
    per: "une seule fois",
    features: ["Tout le Premium", "Payé une seule fois", "Mises à jour à vie", "Support prioritaire"],
    chariowUrl: "https://nunovjiz.mychariow.shop/prd_8e5bj3vn",
  },
];

/** Moyens de paiement acceptés via CinetPay — logos 16:9 dans public/payments/ */
export const PAYMENTS: { name: string; color: string; short: string; logo: string }[] = [
  { name: "Wave", color: "#1dc4f2", short: "W", logo: "./payments/wave.webp" },
  { name: "Orange Money", color: "#ff7900", short: "OM", logo: "./payments/orange-money.webp" },
  { name: "MTN MoMo", color: "#ffcc00", short: "MM", logo: "./payments/mtn-momo.webp" },
  { name: "Moov Money", color: "#0066b3", short: "Mv", logo: "./payments/moov-money.webp" },
];

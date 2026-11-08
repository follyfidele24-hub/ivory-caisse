import type { Plan } from "./store";

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
}

const PREMIUM_FEATURES = [
  "Clients crédit illimités",
  "Historique illimité",
  "Export PDF & Excel",
  "Rapports hebdo & mensuels",
  "Sauvegarde cloud",
  "Rappels SMS clients",
];

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Gratuit",
    price: "0 F",
    amount: 0,
    per: "pour toujours",
    features: ["Ventes & dépenses illimitées", "5 clients crédit", "Rapport du jour", "100% hors-ligne"],
  },
  {
    id: "pro",
    name: "Premium",
    price: "2 000 F",
    amount: 2000,
    per: "/ mois",
    tag: "Populaire",
    highlight: true,
    features: PREMIUM_FEATURES,
  },
  {
    id: "year",
    name: "Annuel",
    price: "15 000 F",
    amount: 15000,
    per: "/ an",
    tag: "Économise 37%",
    features: PREMIUM_FEATURES,
  },
  {
    id: "life",
    name: "À Vie",
    price: "25 000 F",
    amount: 25000,
    per: "une seule fois",
    features: ["Tout le Premium", "Payé une seule fois", "Mises à jour à vie", "Support prioritaire"],
  },
];

export const PAYMENTS: { name: string; color: string; short: string }[] = [
  { name: "Wave", color: "#1dc4f2", short: "W" },
  { name: "Orange Money", color: "#ff7900", short: "OM" },
  { name: "MTN MoMo", color: "#ffcc00", short: "MM" },
  { name: "Moov Money", color: "#0066b3", short: "Mv" },
];

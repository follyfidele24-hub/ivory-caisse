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
   (Debts FREE_LIMIT, History "Tout", Reports "Mois", exports, staffLimit, fullJournal, hasDossier).
   Le cloud n'apparaît que s'il est branché. Les 4 premières lignes sont celles affichées sur la carte. */
const ESSENTIEL = [
  "Clients crédit illimités",
  "Liste « à relancer » + WhatsApp en 1 geste",
  "Marge par article et top 5",
  "2 vendeurs, chacun son PIN",
  "Reçu à ton nom (ville, numéro, message)",
  "Historique complet",
  "Rapports du mois",
  "Export PDF & Excel",
  ...(cloudReady ? ["Sauvegarde cloud"] : []),
];

const DOSSIER = "Dossier 12 mois pour un prêt (microfinance, banque)";

/* Produits Chariow de la grille v2 : renseignés dès leur création (voir netlify/lib/licenseCore.ts) */
export const CHARIOW_V2 = {
  pro: "",
  shop: "",
  year: "",
};

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Découverte",
    price: "0 F",
    amount: 0,
    per: "pour toujours",
    features: ["7 jours de Boutique offerts au départ", "Ventes, dépenses & stock illimités", "5 clients crédit", "1 vendeur avec son PIN + journal 7 jours", "Rapports jour et semaine", "Historique 30 jours", "100% hors-ligne"],
  },
  {
    id: "pro",
    name: "Essentiel",
    price: "5 000 F",
    amount: 5000,
    per: "/ mois",
    tag: "Le plus choisi",
    highlight: true,
    features: ESSENTIEL,
    chariowUrl: CHARIOW_V2.pro ? `${CHARIOW_STORE}/${CHARIOW_V2.pro}` : undefined,
  },
  {
    id: "shop",
    name: "Boutique",
    price: "12 000 F",
    amount: 12000,
    per: "/ mois",
    tag: "Avec une équipe",
    features: ["Tout l'Essentiel", "Vendeurs illimités, chacun son PIN", "Journal complet de l'équipe", DOSSIER, "Support prioritaire WhatsApp"],
    chariowUrl: CHARIOW_V2.shop ? `${CHARIOW_STORE}/${CHARIOW_V2.shop}` : undefined,
  },
  {
    id: "year",
    name: "Essentiel annuel",
    price: "50 000 F",
    amount: 50000,
    per: "/ an",
    tag: "2 mois offerts",
    features: ["Tout l'Essentiel pendant 12 mois", "2 mois offerts (4 167 F/mois)", DOSSIER, "Le prix ne bouge pas pendant 1 an"],
    chariowUrl: CHARIOW_V2.year ? `${CHARIOW_STORE}/${CHARIOW_V2.year}` : undefined,
  },
];
/* « À vie » n'est plus vendu (tarifs v2). Le plan "life" reste reconnu partout dans le code :
   une licence à vie déjà achetée garde tous ses droits. */

/** Moyens de paiement mobile money affichés — logos 16:9 dans public/payments/ */
export const PAYMENTS: { name: string; color: string; short: string; logo: string }[] = [
  { name: "Wave", color: "#1dc4f2", short: "W", logo: "./payments/wave.webp" },
  { name: "Orange Money", color: "#ff7900", short: "OM", logo: "./payments/orange-money.webp" },
  { name: "MTN MoMo", color: "#ffcc00", short: "MM", logo: "./payments/mtn-momo.webp" },
  { name: "Moov Money", color: "#0066b3", short: "Mv", logo: "./payments/moov-money.webp" },
];

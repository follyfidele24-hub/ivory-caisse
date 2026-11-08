import { getCurrency } from "./currency";

export const DAY = 86400000;

const roundN = (n: number, d: number): number => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

/** Nombre formaté selon la devise active (séparateurs de milliers + décimales). */
export const fmt = (n: number): string => {
  const c = getCurrency();
  return new Intl.NumberFormat(c.locale, {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  })
    .format(roundN(n, c.decimals))
    /* espace fine insécable → espace insécable classique : présente dans toutes les polices */
    .replace(/\u202F/g, "\u00A0");
};

/** Symbole actif, ex. " F" (suffixe) ou "$" (préfixe). */
export const sym = (): string => {
  const c = getCurrency();
  return c.suffix ? ` ${c.symbol}` : c.symbol;
};

/** Montant complet avec symbole, ex. "12 500 F" ou "$12,500". */
export const fmtF = (n: number): string => {
  const c = getCurrency();
  const num = fmt(n);
  return c.suffix ? `${num} ${c.symbol}` : `${c.symbol}${num}`;
};

/** Montant signé : "+12 500 F" / "−3 000 F" / "+$500". */
export const fmtSigned = (n: number): string =>
  n >= 0 ? `+${fmtF(n)}` : `\u2212${fmtF(Math.abs(n))}`;

export const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
export const dayLetter = (ts: number): string => DAY_LETTERS[new Date(ts).getDay()];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const longDate = (ts: number): string => {
  const d = new Date(ts);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** Date complète avec année, pour les reçus (preuve d'achat). */
export const fullDate = (ts: number): string =>
  new Date(ts).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

export const shortDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const timeOf = (ts: number): string => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const relDay = (ts: number): string => {
  const today = startOfDay(Date.now());
  const t = startOfDay(ts);
  if (t === today) return "Aujourd'hui";
  if (t === today - DAY) return "Hier";
  return shortDate(ts);
};

export const uid = (): string => Math.random().toString(36).slice(2, 10);

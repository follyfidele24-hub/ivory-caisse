export interface Theme {
  id: string;
  name: string;
  brand: string;
  brand2: string;
  deep: string;
  /** petit aperçu dégradé */
  preview: string;
}

export const THEMES: Theme[] = [
  { id: "sunset", name: "Coucher de soleil", brand: "#ff7a1a", brand2: "#ffb15c", deep: "#e8550f", preview: "linear-gradient(135deg,#ffb15c,#e8550f)" },
  { id: "ocean", name: "Océan", brand: "#1d9bf0", brand2: "#5cc8ff", deep: "#0a6fc2", preview: "linear-gradient(135deg,#5cc8ff,#0a6fc2)" },
  { id: "emerald", name: "Émeraude", brand: "#10b981", brand2: "#5ee0b8", deep: "#0a8a5f", preview: "linear-gradient(135deg,#5ee0b8,#0a8a5f)" },
  { id: "violet", name: "Violet royal", brand: "#8b5cf6", brand2: "#c4b1ff", deep: "#6d28d9", preview: "linear-gradient(135deg,#c4b1ff,#6d28d9)" },
  { id: "rose", name: "Hibiscus", brand: "#f43f7e", brand2: "#ff8fb0", deep: "#d11e63", preview: "linear-gradient(135deg,#ff8fb0,#d11e63)" },
  { id: "gold", name: "Or", brand: "#f5a623", brand2: "#ffd27a", deep: "#d4860b", preview: "linear-gradient(135deg,#ffd27a,#d4860b)" },
  { id: "indigo", name: "Indigo nuit", brand: "#5b6cff", brand2: "#9aa8ff", deep: "#3b48d6", preview: "linear-gradient(135deg,#9aa8ff,#3b48d6)" },
];

const byId = new Map(THEMES.map((t) => [t.id, t]));
export const DEFAULT_THEME = "sunset";

export type Mode = "dark" | "light" | "auto";

const prefersLight = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;

/** Mode réellement affiché ("auto" suit le réglage du téléphone). */
export const resolveMode = (m?: Mode): "dark" | "light" => (m === "light" || (m === "auto" && prefersLight()) ? "light" : "dark");

/** Applique couleur + mode en surchargeant les variables CSS Tailwind. */
export function applyTheme(id?: string, mode?: Mode): void {
  const t = (id && byId.get(id)) || byId.get(DEFAULT_THEME)!;
  const r = document.documentElement;
  const m = resolveMode(mode);
  r.dataset.mode = m;
  r.style.setProperty("--color-brand", t.brand);
  /* brand2 sert de couleur de texte d'accent : on la fonce sur fond clair */
  r.style.setProperty("--color-brand2", m === "light" ? `color-mix(in oklab, ${t.deep} 72%, black)` : t.brand2);
  r.style.setProperty("--color-deep", t.deep);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", m === "light" ? "#f5f3ee" : "#0A0A0E");
}

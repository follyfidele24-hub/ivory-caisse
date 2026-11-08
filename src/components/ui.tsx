import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import { Delete as DeleteIcon, X } from "lucide-react";

/* ---------- Nombre animé ---------- */

export function AnimNum({ value, format }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const [text, setText] = useState(format ? format(0) : "0");
  const fmtRef = useRef(format);
  fmtRef.current = format;

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(
    () => spring.on("change", (v) => setText(fmtRef.current ? fmtRef.current(v) : String(Math.round(v)))),
    [spring]
  );

  if (reduce) return <span className="tabular-nums">{format ? format(value) : String(Math.round(value))}</span>;
  return <span className="tabular-nums">{text}</span>;
}

/* ---------- Format court "12,5k" ---------- */

export const kFmt = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1000000) return `${(v / 1000000).toFixed(1).replace(".", ",").replace(",0", "")}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",").replace(",0", "")}k`;
  return String(Math.round(v));
};

/* ---------- Graphique en barres ---------- */

export function BarChart({
  data,
  barClassName,
}: {
  data: { label: string; value: number; dim?: boolean }[];
  barClassName?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2">
      {data.map((d, i) => {
        const pct = Math.max(4, (d.value / max) * 100);
        const isMax = d.value === max && max > 0;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className={`text-[10px] tabular-nums ${isMax ? "text-brand2 font-bold" : "text-muted"}`}>
              {d.value > 0 ? kFmt(d.value) : ""}
            </span>
            <div className="flex h-24 w-full items-end justify-center">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${pct}%`, opacity: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 22, delay: i * 0.045 }}
                className={`w-full max-w-7 rounded-full ${
                  d.dim
                    ? "bg-fg/10"
                    : isMax
                      ? "bg-gradient-to-t from-deep to-brand2 shadow-[0_0_24px_-4px_rgba(255,122,26,0.7)]"
                      : (barClassName ?? "bg-fg/15")
                }`}
              />
            </div>
            <span className={`text-[10px] font-semibold ${isMax ? "text-brand2" : "text-muted"}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Clavier compact (objectifs, montants simples) ---------- */

export function AmountPadLite({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const press = (k: string) => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (k === "back") onChange(value.slice(0, -1));
    else if (k === "000") {
      if (value !== "" && value.length < 8) onChange(value + "000");
    } else if (value === "0") onChange(k);
    else if (value.length < 8) onChange(value + k);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "back"];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          className="tap btn-press flex h-11 items-center justify-center rounded-xl border border-line bg-panel2 font-display text-base font-bold transition-colors active:bg-fg/10"
        >
          {k === "back" ? <DeleteIcon size={16} className="text-muted" /> : k}
        </button>
      ))}
    </div>
  );
}

/* ---------- Contrôle segmenté ---------- */

export function Seg<T extends string>({
  id,
  options,
  value,
  onChange,
  accent = "brand",
}: {
  id: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (t: T) => void;
  accent?: "brand" | "mint" | "rose";
}) {
  const activeText = { brand: "text-white", mint: "text-on-mint", rose: "text-white" }[accent];
  const accentCls = {
    brand: "bg-gradient-to-br from-brand to-deep text-white shadow-[0_6px_20px_-6px_rgba(255,122,26,0.7)]",
    mint: "bg-mint text-on-mint",
    rose: "bg-rose text-white",
  }[accent];
  return (
    <div className="flex rounded-2xl border border-line bg-panel2 p-1">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className="tap relative min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={`absolute inset-0 rounded-xl ${accentCls}`}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative z-10 ${active ? `${activeText} font-bold` : "text-muted"}`}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Feuille du bas (bottom sheet) ---------- */

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => panelRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md overflow-hidden rounded-t-[2rem] border-t border-line bg-panel shadow-2xl outline-none"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110) onClose();
            }}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-fg/15" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="tap absolute right-3 top-2 flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-cream focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X size={20} />
            </button>
            <div className="max-h-[82dvh] overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------- Boutons ---------- */

type BtnVariant = "brand" | "mint" | "soft" | "ghost" | "danger";

export function Btn({
  variant = "brand",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const styles: Record<BtnVariant, string> = {
    brand:
      "bg-gradient-to-br from-brand to-deep text-white shadow-[0_10px_28px_-8px_rgba(255,122,26,0.65)]",
    mint: "bg-mint text-on-mint",
    soft: "border border-line bg-panel2 text-cream",
    ghost: "bg-transparent text-muted",
    danger: "border border-rose/25 bg-rose/10 text-rose",
  };
  return (
    <button
      {...rest}
      className={`tap btn-press flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Avatar initials ---------- */

const AV_COLORS = [
  "from-brand to-deep",
  "from-mint to-teal-700",
  "from-violet-400 to-violet-700",
  "from-sky-400 to-blue-700",
  "from-rose to-pink-700",
];

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const idx = name.length % AV_COLORS.length;
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-display font-bold text-white ${AV_COLORS[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

/* ---------- Toast ---------- */

export function Toast({
  message,
  kind,
  action,
}: {
  message: string | null;
  kind: "sale" | "expense" | "info";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -70, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] mx-auto w-fit max-w-[92vw]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
              kind === "sale"
                ? "border-mint/30 bg-mint/15 text-mint"
                : kind === "expense"
                  ? "border-rose/30 bg-rose/15 text-rose"
                  : "border-line bg-panel2/90 text-cream"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                kind === "sale" ? "bg-mint" : kind === "expense" ? "bg-rose" : "bg-brand"
              }`}
            />
            {message}
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="tap -my-1.5 -mr-2 ml-1 min-h-11 rounded-full px-3 text-sm font-extrabold text-cream underline decoration-2 underline-offset-4 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
              >
                {action.label}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

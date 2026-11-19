import { useState } from "react";
import { motion } from "framer-motion";
import { Delete, ShieldCheck } from "lucide-react";
import { Sheet } from "./ui";
import { useStore } from "../lib/store";

/** Clavier PIN à 4 chiffres. onComplete renvoie false si le code est refusé (secousse + remise à zéro). */
export default function PinPad({
  onComplete,
  error,
  compact = false,
}: {
  onComplete: (pin: string) => boolean | void;
  error?: string | null;
  compact?: boolean;
}) {
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(0);
  const [bad, setBad] = useState(false);

  const press = (k: string) => {
    if (navigator.vibrate) navigator.vibrate(6);
    if (k === "back") {
      setEntry((e) => e.slice(0, -1));
      setBad(false);
      return;
    }
    if (entry.length >= 4) return;
    const next = entry + k;
    setEntry(next);
    if (next.length === 4) {
      const r = onComplete(next);
      if (r === false) {
        setBad(true);
        setShake((s) => s + 1);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        window.setTimeout(() => setEntry(""), 380);
      } else {
        if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
        window.setTimeout(() => setEntry(""), 200);
      }
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
  const h = compact ? "h-13" : "h-16";

  return (
    <div className="w-full">
      <motion.div
        key={shake}
        animate={shake > 0 ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={`${compact ? "my-4" : "my-7"} flex justify-center gap-4`}
        aria-live="polite"
        aria-label={`${entry.length} chiffre${entry.length > 1 ? "s" : ""} sur 4`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-all ${
              bad ? "bg-rose" : entry.length > i ? "scale-110 bg-brand" : "bg-fg/15"
            }`}
          />
        ))}
      </motion.div>
      <p className={`mb-4 min-h-4 text-center text-xs font-bold ${bad || error ? "text-rose" : "text-transparent"}`}>
        {error || "Code incorrect, réessaie"}
      </p>
      <div className="grid w-full grid-cols-3 gap-2.5">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={`e-${i}`} />
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "back" ? "Effacer" : k}
              className={`tap btn-press flex ${h} items-center justify-center rounded-3xl border border-line bg-panel font-display text-2xl font-bold transition-colors active:bg-fg/10`}
            >
              {k === "back" ? <Delete size={22} className="text-muted" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/* ---------- Validation par le patron (sur le téléphone du vendeur) ---------- */

export function OwnerPinSheet({
  open,
  title,
  detail,
  onClose,
  onOk,
}: {
  open: boolean;
  title: string;
  detail?: string;
  onClose: () => void;
  onOk: (pin: string) => void;
}) {
  const { checkOwnerPin, logDenied, isStaff } = useStore();
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand2">
        <ShieldCheck size={22} aria-hidden="true" />
      </div>
      <h2 className="text-center font-display text-lg font-extrabold">{title}</h2>
      {detail && <p className="mx-auto mt-1 max-w-xs text-center text-xs leading-relaxed text-muted">{detail}</p>}
      <p className="mt-3 text-center text-xs font-bold text-muted">PIN du patron</p>
      <PinPad
        compact
        onComplete={(pin) => {
          if (!checkOwnerPin(pin)) {
            if (isStaff) logDenied(`Mauvais PIN patron tapé (${title.toLowerCase()})`);
            return false;
          }
          onOk(pin);
          return true;
        }}
      />
    </Sheet>
  );
}

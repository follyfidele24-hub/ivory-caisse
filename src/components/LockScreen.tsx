import { useState } from "react";
import { motion } from "framer-motion";
import { Delete, Lock } from "lucide-react";
import { useStore } from "../lib/store";

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { profile, resetAll } = useStore();
  const [entry, setEntry] = useState("");
  const [shake, setShake] = useState(0);
  const [error, setError] = useState(false);

  const firstName = (profile?.name ?? "").split(" ")[0] || "Patron";

  const press = (k: string) => {
    if (navigator.vibrate) navigator.vibrate(6);
    if (k === "back") {
      setEntry((e) => e.slice(0, -1));
      setError(false);
      return;
    }
    if (entry.length >= 4) return;
    const next = entry + k;
    setEntry(next);
    if (next.length === 4) {
      if (next === profile?.pin) {
        if (navigator.vibrate) navigator.vibrate([10, 40, 20]);
        window.setTimeout(onUnlock, 150);
      } else {
        setError(true);
        setShake((s) => s + 1);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        window.setTimeout(() => setEntry(""), 380);
      }
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-ink px-8"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/12 blur-[100px]" />

      <div className="relative flex w-full max-w-xs flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-deep font-display text-2xl font-extrabold text-white shadow-[0_16px_40px_-12px_rgba(255,122,26,0.8)]">
          IC
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Bonjour, {firstName}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Lock size={11} /> Entre ton code PIN
        </p>

        {/* Points */}
        <motion.div
          key={shake}
          animate={shake > 0 ? { x: [0, -12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="my-8 flex gap-4"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              animate={{
                scale: entry.length > i ? 1.15 : 1,
                backgroundColor: error
                  ? "rgba(245,81,108,1)"
                  : entry.length > i
                    ? "rgba(255,177,92,1)"
                    : "rgba(255,255,255,0.12)",
              }}
              className="h-3.5 w-3.5 rounded-full"
            />
          ))}
        </motion.div>

        <p className={`mb-6 h-4 text-xs font-bold ${error ? "text-rose" : "text-transparent"}`}>
          Code incorrect, réessaie
        </p>

        {/* Clavier */}
        <div className="grid w-full grid-cols-3 gap-2.5">
          {keys.map((k, i) =>
            k === "" ? (
              <span key={`e-${i}`} />
            ) : (
              <button
                key={k}
                onClick={() => press(k)}
                className="tap btn-press flex h-16 items-center justify-center rounded-3xl border border-line bg-panel font-display text-2xl font-bold transition-colors active:bg-fg/10"
              >
                {k === "back" ? <Delete size={22} className="text-muted" /> : k}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => {
            if (window.confirm("Réinitialiser l'app ? Toutes les données de ce téléphone seront effacées.")) {
              resetAll();
            }
          }}
          className="tap mt-8 text-[11px] font-semibold text-muted underline underline-offset-4"
        >
          Code oublié ? Réinitialiser l'app
        </button>
      </div>
    </motion.div>
  );
}

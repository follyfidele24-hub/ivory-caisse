import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Crown, KeyRound, Lock, MessageCircle, User } from "lucide-react";
import { BrandMark, Btn } from "./ui";
import PinPad from "./PinPad";
import { useStore, weakPin } from "../lib/store";
import { whatsappLink } from "../lib/contact";

type Step = { kind: "who" } | { kind: "pin"; who: string | null } | { kind: "recover" };

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { profile, staff, rolesOn, login, recoverOwner, resetAll, staffAllowed } = useStore();
  const team = staff.filter((s) => s.active);
  const [step, setStep] = useState<Step>(rolesOn ? { kind: "who" } : { kind: "pin", who: null });
  const [secret, setSecret] = useState("");
  const [newPin, setNewPin] = useState("");
  const [recErr, setRecErr] = useState<string | null>(null);

  const firstName = (profile?.name ?? "").split(" ")[0] || "Patron";

  const tryPin = (who: string | null) => (pin: string) => {
    const ok = login(who, pin);
    if (ok) window.setTimeout(onUnlock, 150);
    return ok;
  };

  const recover = () => {
    if (weakPin(newPin)) {
      setRecErr("Choisis un nouveau PIN à 4 chiffres, pas trop simple");
      return;
    }
    const r = recoverOwner(secret, newPin);
    if (!r.ok) {
      setRecErr(r.why);
      return;
    }
    onUnlock();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-y-auto bg-ink px-8 py-10"
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/12 blur-[100px]" />

      <div className="relative flex w-full max-w-xs flex-col items-center">
        <BrandMark size={60} className="mb-4" />

        {step.kind === "who" && (
          <>
            <h1 className="text-center font-display text-2xl font-extrabold tracking-tight">{profile?.shop ?? "Ma boutique"}</h1>
            <p className="mt-1 text-xs font-semibold text-muted">Qui tient la caisse ?</p>
            <div className="mt-7 grid w-full gap-2.5">
              <button
                onClick={() => setStep({ kind: "pin", who: null })}
                className="tap btn-press flex min-h-14 items-center gap-3 rounded-2xl border border-brand/35 bg-brand/10 px-4 text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-action to-action2 text-white">
                  <Crown size={17} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{firstName}</span>
                  <span className="block text-[11px] font-semibold text-muted">Patron · tous les droits</span>
                </span>
              </button>
              {team.map((s) => (
                <button
                  key={s.name}
                  onClick={() => staffAllowed(s.name) && setStep({ kind: "pin", who: s.name })}
                  disabled={!staffAllowed(s.name)}
                  className="tap btn-press flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel px-4 text-left disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-mint/30 bg-mint/10 text-mint">
                    <User size={17} aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-extrabold">{s.name}</span>
                    <span className="block text-[11px] font-semibold text-muted">{staffAllowed(s.name) ? "Vendeur" : "Accès en pause · Premium"}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step.kind === "pin" && (
          <>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              Bonjour, {step.who ?? firstName}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Lock size={11} aria-hidden="true" /> {step.who ? "Entre ton code PIN vendeur" : "Entre ton code PIN patron"}
            </p>
            <PinPad onComplete={tryPin(step.who)} />
            <div className="mt-6 flex w-full flex-col items-center gap-3">
              {rolesOn && (
                <button onClick={() => setStep({ kind: "who" })} className="tap flex items-center gap-1 text-xs font-bold text-muted">
                  <ChevronLeft size={14} aria-hidden="true" /> Changer de personne
                </button>
              )}
              {step.who === null ? (
                rolesOn || profile?.licenseKey || profile?.recovery ? (
                  <button
                    onClick={() => {
                      setRecErr(null);
                      setStep({ kind: "recover" });
                    }}
                    className="tap text-[11px] font-semibold text-muted underline underline-offset-4"
                  >
                    Code patron oublié ?
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm("Réinitialiser l'app ? Toutes les données de ce téléphone seront effacées.")) resetAll();
                    }}
                    className="tap text-[11px] font-semibold text-muted underline underline-offset-4"
                  >
                    Code oublié ? Réinitialiser l'app
                  </button>
                )
              ) : (
                <p className="text-center text-[11px] font-semibold text-muted">PIN oublié ? Demande au patron de t'en donner un nouveau.</p>
              )}
            </div>
          </>
        )}

        {step.kind === "recover" && (
          <div className="w-full">
            <h1 className="text-center font-display text-2xl font-extrabold tracking-tight">Code patron oublié</h1>
            <p className="mt-2 text-center text-xs leading-relaxed text-muted">
              Tape ta <b className="text-fg">clé de licence</b> Chariow ou ton <b className="text-fg">code de secours</b> (8 caractères, donné à la création de ton équipe).
            </p>
            <label className="mt-5 block text-xs font-bold text-muted" htmlFor="rec-secret">
              Clé de licence ou code de secours
            </label>
            <input
              id="rec-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1.5 w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 font-mono text-sm font-semibold uppercase outline-none focus:border-brand/50"
            />
            <label className="mt-4 block text-xs font-bold text-muted" htmlFor="rec-pin">
              Nouveau PIN patron (4 chiffres)
            </label>
            <input
              id="rec-pin"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              type="password"
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-center font-display text-xl tracking-[0.5em] outline-none focus:border-brand/50"
            />
            {recErr && <p className="mt-2 text-center text-xs font-bold text-rose">{recErr}</p>}
            <Btn className="mt-4 w-full py-4" disabled={!secret.trim() || newPin.length !== 4} onClick={recover}>
              <KeyRound size={16} aria-hidden="true" /> Changer mon PIN
            </Btn>
            <a
              href={whatsappLink(`Bonjour Ivory Gestion, j'ai oublié mon code patron sur Ivory Caisse (boutique : ${profile?.shop ?? ""}).`)}
              target="_blank"
              rel="noreferrer"
              className="tap mt-3 flex min-h-11 items-center justify-center gap-2 text-xs font-bold text-mint"
            >
              <MessageCircle size={14} aria-hidden="true" /> Aucun des deux ? Écris au support
            </a>
            <button onClick={() => setStep({ kind: "pin", who: null })} className="tap mx-auto mt-1 flex items-center gap-1 text-xs font-bold text-muted">
              <ChevronLeft size={14} aria-hidden="true" /> Retour
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

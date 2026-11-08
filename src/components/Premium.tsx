import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Crown, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { PLANS, PAYMENTS, type PlanDef } from "../lib/plans";
import { cinetpayReady, payWithCinetPay } from "../lib/cinetpay";
import { useStore } from "../lib/store";
import { Btn } from "./ui";
import { Capacitor } from "@capacitor/core";

type Step = "plans" | "pay" | "store" | "success";

export default function Premium({ onClose }: { onClose: () => void }) {
  const { profile, setPlan } = useStore();
  const [step, setStep] = useState<Step>("plans");
  const [chosen, setChosen] = useState<PlanDef | null>(null);
  const [method, setMethod] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const current = profile?.plan ?? "free";
  const storeBuild = Capacitor.isNativePlatform() && import.meta.env.VITE_STORE_BUILD === "true";

  const pick = (p: PlanDef) => {
    if (p.id === current) return;
    if (p.id === "free") {
      setPlan("free");
      return;
    }
    setChosen(p);
    setPayError(null);
    setStep(storeBuild ? "store" : "pay");
  };

  const pay = async () => {
    if (!chosen || processing) return;
    setPayError(null);
    setProcessing(true);
    if (navigator.vibrate) navigator.vibrate(15);

    const activate = () => {
      setProcessing(false);
      setPlan(chosen.id);
      setStep("success");
      if (navigator.vibrate) navigator.vibrate([20, 60, 30]);
    };

    /* Paiement réel CinetPay si les clés sont configurées */
    if (cinetpayReady) {
      try {
        await payWithCinetPay({
          transactionId: `IC-${Date.now()}`,
          amount: chosen.amount,
          description: `Ivory Caisse — Abonnement ${chosen.name}`,
          customerName: profile?.name ?? "Client",
          onSuccess: activate,
          onError: (msg) => {
            setProcessing(false);
            setPayError(msg);
          },
        });
      } catch {
        setProcessing(false);
        setPayError("Service de paiement indisponible. Réessaie dans un instant.");
      }
      return;
    }

    // Ne jamais débloquer un plan commercial sans confirmation de paiement.
    setProcessing(false);
    setPayError("Le paiement n'est pas encore configuré. Contacte Ivory Gestion pour activer Premium.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink no-scrollbar"
    >
      <div className="pointer-events-none fixed -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/15 blur-[110px]" />

      <div className="relative mx-auto min-h-dvh max-w-md px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          {/* ------- ÉTAPE : PLANS ------- */}
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="mb-6 flex items-center justify-between">
                <button onClick={onClose} className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel2">
                  <X size={18} />
                </button>
                <span className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-brand2">
                  <Crown size={12} /> Premium
                </span>
              </div>

              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                Ton business
                <br />
                au niveau <span className="text-brand2">supérieur.</span>
              </h1>
              <p className="mt-2 text-sm text-muted">Paiement par Wave, Orange Money, MTN MoMo ou Moov. Annulation quand tu veux.</p>

              <div className="mt-7 space-y-3">
                {PLANS.map((p, i) => {
                  const isCurrent = p.id === current;
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => pick(p)}
                      disabled={isCurrent}
                      className={`tap card relative w-full p-5 text-left transition-all ${
                        p.highlight ? "border-brand/50 shadow-[0_0_40px_-12px_rgba(255,122,26,0.5)]" : ""
                      } ${isCurrent ? "opacity-60" : "hover:border-brand/30"}`}
                    >
                      {p.tag && (
                        <span
                          className={`absolute -top-2.5 right-4 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                            p.highlight ? "bg-gradient-to-r from-brand to-deep text-white" : "border border-line bg-panel2 text-brand2"
                          }`}
                        >
                          {p.tag}
                        </span>
                      )}
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-muted">{p.name}</p>
                          <p className="mt-0.5 font-display text-2xl font-extrabold">
                            {p.price} <span className="text-xs font-semibold text-muted">{p.per}</span>
                          </p>
                        </div>
                        {isCurrent ? (
                          <span className="rounded-full bg-mint/15 px-3 py-1.5 text-[10px] font-extrabold uppercase text-mint">
                            Plan actuel
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-fg/20" />
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {p.features.slice(0, 4).map((f) => (
                          <p key={f} className="flex items-start gap-1.5 text-[11px] text-muted">
                            <Check size={11} className="mt-0.5 shrink-0 text-mint" /> {f}
                          </p>
                        ))}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
                <ShieldCheck size={13} className="text-mint" /> Paiement sécurisé via CinetPay
              </p>
            </motion.div>
          )}

          {/* ------- ÉTAPE : PAIEMENT ------- */}
          {step === "pay" && chosen && (
            <motion.div key="pay" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button
                onClick={() => setStep("plans")}
                className="tap mb-6 flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3.5 py-2 text-xs font-bold text-muted"
              >
                <ArrowLeft size={14} /> Tous les plans
              </button>

              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                {chosen.name} · {chosen.price}
                <span className="text-base font-bold text-muted"> {chosen.per}</span>
              </h1>
              <p className="mt-2 text-sm text-muted">Choisis ton moyen de paiement :</p>

              <div className="mt-6 space-y-2.5">
                {PAYMENTS.map((m, i) => (
                  <button
                    key={m.name}
                    onClick={() => setMethod(i)}
                    className={`tap card flex w-full items-center gap-3.5 p-4 text-left transition-all ${
                      method === i ? "border-brand/50 bg-brand/5" : ""
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-xs font-extrabold text-white"
                      style={{ background: m.color }}
                    >
                      {m.short}
                    </span>
                    <span className="flex-1 text-sm font-bold">{m.name}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        method === i ? "border-brand bg-brand" : "border-fg/20"
                      }`}
                    >
                      {method === i && <Check size={12} className="text-white" />}
                    </span>
                  </button>
                ))}
              </div>

              <Btn onClick={pay} disabled={processing} className="mt-7 w-full py-4 text-base">
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Connexion {PAYMENTS[method].name}…
                  </>
                ) : (
                  <>
                    Payer {chosen.price} <Sparkles size={16} />
                  </>
                )}
              </Btn>

              {payError && <p className="mt-4 text-center text-xs font-semibold text-rose">{payError}</p>}

              <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                {cinetpayReady
                  ? "Tu vas recevoir une demande de confirmation directement sur ton téléphone."
                  : "Mode démo : ajoute tes clés CinetPay dans .env pour encaisser de vrais paiements."}
              </p>
            </motion.div>
          )}

          {/* ------- BUILD GOOGLE PLAY / APP STORE ------- */}
          {step === "store" && chosen && (
            <motion.div key="store" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button
                onClick={() => setStep("plans")}
                className="tap mb-6 flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3.5 py-2 text-xs font-bold text-muted"
              >
                <ArrowLeft size={14} /> Tous les plans
              </button>
              <div className="flex min-h-[55dvh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.7rem] border border-brand/30 bg-brand/10 text-brand2">
                  <Crown size={34} />
                </div>
                <h1 className="font-display text-2xl font-extrabold">Premium arrive sur le store</h1>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  L'achat {chosen.name} sera proposé ici avec le système de paiement officiel de ton téléphone. La
                  version gratuite reste entièrement utilisable.
                </p>
                <Btn variant="soft" onClick={onClose} className="mt-7 w-full">
                  Continuer avec le plan gratuit
                </Btn>
              </div>
            </motion.div>
          )}

          {/* ------- ÉTAPE : SUCCÈS ------- */}
          {step === "success" && (
            <motion.div
              key="ok"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[70dvh] flex-col items-center justify-center text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.1 }}
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-brand to-deep shadow-[0_24px_60px_-16px_rgba(255,122,26,0.8)]"
              >
                <Crown size={44} className="text-white" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                  Bienvenue dans <span className="text-brand2">Premium !</span>
                </h1>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
                  Export PDF & Excel, clients illimités, sauvegarde cloud… tout est débloqué. Au travail !
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-10 w-full"
              >
                <Btn onClick={onClose} className="w-full py-4 text-base">
                  C'est parti <Check size={18} />
                </Btn>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

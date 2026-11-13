import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Coins, PartyPopper, Store, User } from "lucide-react";
import { useStore } from "../lib/store";
import { Btn } from "./ui";
import CurrencyPicker from "./CurrencyPicker";

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [shop, setShop] = useState("");
  const [currency, setCurrency] = useState("XOF");

  const steps = [
    {
      icon: User,
      title: "Comment tu t'appelles ?",
      sub: "Pour te souhaiter la bienvenue chaque matin.",
      value: name,
      set: setName,
      placeholder: "Ex : Awa Koné",
      valid: name.trim().length >= 2,
    },
    {
      icon: Store,
      title: "Le nom de ta boutique ?",
      sub: "Celui que tes clients connaissent, même un surnom.",
      value: shop,
      set: setShop,
      placeholder: "Ex : Chez Awa — Pagnes & Co",
      valid: shop.trim().length >= 2,
    },
  ];

  // step 2 = devise, step 3 = bienvenue
  const total = 4;

  return (
    <div className="noise relative flex min-h-dvh flex-col bg-ink px-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand/15 blur-[100px]" />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col pt-20">
        {/* progression */}
        <div className="mb-12 flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand2"
                initial={false}
                animate={{ width: step >= i ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 || step === 1 ? (
            <motion.div
              key={`s-${step}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-3xl border border-brand/25 bg-brand/10 text-brand2">
                {(() => {
                  const Icon = steps[step].icon;
                  return <Icon size={24} />;
                })()}
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">{steps[step].title}</h1>
              <p className="mt-3 text-muted">{steps[step].sub}</p>
              <input
                autoFocus
                value={steps[step].value}
                onChange={(e) => steps[step].set(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && steps[step].valid) setStep(step + 1);
                }}
                placeholder={steps[step].placeholder}
                className="mt-10 w-full rounded-3xl border border-line bg-panel px-6 py-5 font-display text-2xl font-bold outline-none transition-colors placeholder:text-fg/20 focus:border-brand/50"
              />
              <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
                <Btn className="w-full py-4 text-base" disabled={!steps[step].valid} onClick={() => setStep(step + 1)}>
                  Continuer <ArrowRight size={18} />
                </Btn>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="currency"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-brand/25 bg-brand/10 text-brand2">
                <Coins size={24} />
              </div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">Ta devise ?</h1>
              <p className="mt-3 text-muted">Choisis la monnaie de ta boutique. Tu pourras la changer plus tard.</p>
              <div className="mt-8 max-h-[46dvh] overflow-y-auto no-scrollbar pb-2">
                <CurrencyPicker value={currency} onChange={setCurrency} />
              </div>
              <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
                <Btn className="w-full py-4 text-base" onClick={() => setStep(step + 1)}>
                  Continuer <ArrowRight size={18} />
                </Btn>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-1 flex-col"
            >
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-action to-action2 text-white shadow-[0_16px_40px_-12px_rgba(255,122,26,0.8)]"
              >
                <PartyPopper size={28} />
              </motion.div>
              <h1 className="font-display text-4xl font-extrabold tracking-tight">
                Bienvenue,
                <br />
                <span className="text-brand2">{name.trim().split(" ")[0]} !</span>
              </h1>
              <p className="mt-3 leading-relaxed text-muted">
                On a préparé <span className="font-semibold text-cream">{shop.trim()}</span> avec quelques exemples pour
                que tu voies tout de suite comment ça marche. Efface-les quand tu veux dans les réglages.
              </p>
              <div className="mt-8 space-y-3">
                {["Enregistre une vente en 3 secondes", "Suis tes crédits clients et fournisseurs", "Lis ton vrai bénéfice chaque soir"].map(
                  (t, i) => (
                    <motion.div
                      key={t}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.12 }}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5 text-sm font-semibold"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/15 font-display text-xs font-extrabold text-brand2">
                        {i + 1}
                      </span>
                      {t}
                    </motion.div>
                  )
                )}
              </div>
              <div className="mt-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
                <Btn className="w-full py-4 text-base" onClick={() => completeOnboarding(name.trim(), shop.trim(), currency)}>
                  Ouvrir ma caisse <ArrowRight size={18} />
                </Btn>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

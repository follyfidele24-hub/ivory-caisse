import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { StoreProvider, useStore, type TxnType } from "./lib/store";
import { fmtF } from "./lib/format";
import { setCurrency } from "./lib/currency";
import { applyTheme } from "./lib/themes";
import { NATIVE_SECURE_RESUME } from "./lib/native";
import Dashboard from "./components/Dashboard";
import AddTxn from "./components/AddTxn";

/* Écrans chargés à la demande : l'app démarre plus vite en 3G */
const Landing = lazy(() => import("./components/Landing"));
const Onboarding = lazy(() => import("./components/Onboarding"));
const Stock = lazy(() => import("./components/Stock"));
const Debts = lazy(() => import("./components/Debts"));
const Reports = lazy(() => import("./components/Reports"));
const Settings = lazy(() => import("./components/Settings"));
const Premium = lazy(() => import("./components/Premium"));

function ScreenLoader() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-label="Chargement">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-fg/10 border-t-brand" />
    </div>
  );
}

/* Précharge les onglets en arrière-plan une fois l'app affichée */
const prefetchTabs = () => {
  void import("./components/Stock");
  void import("./components/Debts");
  void import("./components/Reports");
  void import("./components/Settings");
};
import LockScreen from "./components/LockScreen";
import BottomNav, { type Tab } from "./components/BottomNav";
import { Toast } from "./components/ui";

function AppShell() {
  const { profile, deleteTxn } = useStore();
  const toastTimer = useRef<number | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("home");
  const [addOpen, setAddOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [locked, setLocked] = useState(() => Boolean(profile?.pin));
  const [toast, setToast] = useState<{ msg: string; kind: "sale" | "expense" | "info"; undoId?: string } | null>(null);

  const showToast = (t: NonNullable<typeof toast>, ms: number) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  useEffect(() => {
    const id = window.setTimeout(prefetchTabs, 1500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const secureResume = () => {
      if (profile?.pin) setLocked(true);
    };
    window.addEventListener(NATIVE_SECURE_RESUME, secureResume);
    return () => window.removeEventListener(NATIVE_SECURE_RESUME, secureResume);
  }, [profile?.pin]);

  const onSaved = (kind: TxnType, amount: number, id: string) => {
    showToast(
      {
        msg: kind === "sale" ? `Vente encaissée · +${fmtF(amount)}` : `Dépense notée · ${fmtF(amount)}`,
        kind: kind === "sale" ? "sale" : "expense",
        undoId: id,
      },
      5000
    );
  };

  const undo = () => {
    if (!toast?.undoId) return;
    deleteTxn(toast.undoId);
    if (navigator.vibrate) navigator.vibrate(8);
    showToast({ msg: "Saisie annulée", kind: "info" }, 1800);
  };

  return (
    <div className="noise relative min-h-dvh bg-ink">
      <div className="pointer-events-none fixed -left-24 top-[-6rem] h-72 w-72 rounded-full bg-brand/12 blur-[100px]" />
      <div className="pointer-events-none fixed -right-28 top-1/3 h-72 w-72 rounded-full bg-mint/8 blur-[110px]" />

      <main className="relative mx-auto max-w-md px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Suspense fallback={<ScreenLoader />}>
            {tab === "home" && <Dashboard onPremium={() => setPremiumOpen(true)} onSettings={() => setTab("settings")} />}
            {tab === "stock" && <Stock />}
            {tab === "debts" && <Debts onPremium={() => setPremiumOpen(true)} />}
            {tab === "reports" && <Reports onPremium={() => setPremiumOpen(true)} />}
            {tab === "settings" && <Settings onPremium={() => setPremiumOpen(true)} onBack={() => setTab("home")} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav tab={tab} onTab={setTab} onAdd={() => setAddOpen(true)} />

      <AddTxn open={addOpen} onClose={() => setAddOpen(false)} onSaved={onSaved} />

      <Suspense fallback={null}>
        <AnimatePresence>{premiumOpen && <Premium onClose={() => setPremiumOpen(false)} />}</AnimatePresence>
      </Suspense>

      {locked && profile?.pin && <LockScreen onUnlock={() => setLocked(false)} />}

      <Toast
        message={toast?.msg ?? null}
        kind={toast?.kind ?? "info"}
        action={toast?.undoId ? { label: "Annuler", onClick: undo } : undefined}
      />
    </div>
  );
}

function Root() {
  const { launched, profile, markLaunched } = useStore();

  /* Applique la devise et le thème choisis par l'utilisateur */
  useEffect(() => {
    setCurrency(profile?.currency);
  }, [profile?.currency]);

  /* Le mode clair ne concerne que l'app (la page d'accueil reste sombre) */
  const mode = profile ? profile.mode : "dark";
  useEffect(() => {
    applyTheme(profile?.theme, mode);
    if (mode !== "auto") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    const on = () => applyTheme(profile?.theme, mode);
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, [profile?.theme, mode]);

  return (
    <Suspense fallback={<ScreenLoader />}>
    <AnimatePresence mode="wait">
      {!launched ? (
        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          <Landing onStart={markLaunched} />
        </motion.div>
      ) : !profile ? (
        <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
          <Onboarding />
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AppShell />
        </motion.div>
      )}
    </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <Root />
      </StoreProvider>
    </MotionConfig>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Download,
  KeyRound,
  MessageCircle,
  Package,
  Plus,
  Receipt,
  ShieldCheck,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  WifiOff,
  Zap,
  PartyPopper,
} from "lucide-react";
import { PLANS, PAYMENTS } from "../lib/plans";
import { Avatar, Btn } from "./ui";
import Legal, { type LegalDoc } from "./Legal";
import InstallApp from "./InstallApp";

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { type: "spring" as const, stiffness: 120, damping: 20 },
};

function Logo({ size = 38 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-deep font-display font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(255,122,26,0.7)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      IC
    </div>
  );
}

/* ---------- Ventes qui défilent en direct ---------- */

const LIVE = [
  { note: "Sac de riz 5 kg", amount: 4500, seller: "Moi" },
  { note: "Pagne 3 tons", amount: 8500, seller: "Grâce" },
  { note: "Huile 1L ×4", amount: 6000, seller: "Moi" },
  { note: "Attiéké + poisson", amount: 2500, seller: "Grâce" },
  { note: "Savon carton", amount: 6000, seller: "Mariam" },
];

function LiveTicker() {
  const [rows, setRows] = useState(() => LIVE.slice(0, 4));

  useEffect(() => {
    const id = window.setInterval(() => {
      setRows((prev) => {
        const next = LIVE[(prev.length + 1) % LIVE.length];
        return [...prev.slice(1), next];
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel/90 p-3.5 backdrop-blur">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          Exemple de journée
        </span>
        <span className="font-display text-[10px] font-bold text-mint tabular-nums">
          +{total.toLocaleString("fr-FR").replace(/\u202F/g, "\u00A0")} F
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <motion.div
            key={`${r.note}-${i}-${total}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="flex items-center gap-2.5 rounded-xl bg-ink/70 px-2.5 py-2"
          >
            <ArrowUpRight size={12} className="shrink-0 text-mint" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{r.note}</span>
            <span className="shrink-0 text-[9px] font-bold text-muted">{r.seller}</span>
            <span className="shrink-0 font-display text-[11px] font-extrabold text-mint tabular-nums">
              {r.amount.toLocaleString("fr-FR").replace(/\u202F/g, "\u00A0")}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Aperçu téléphone ---------- */

function PhoneMock() {
  const bars = [38, 55, 42, 70, 58, 92, 66];
  return (
    <div className="relative mx-auto w-[268px]">
      <div className="float-slow relative rounded-[2.4rem] border border-white/10 bg-[#0d0d12] p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="rounded-[2rem] border border-line bg-ink p-4">
          <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/10" />
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-deep font-display text-[10px] font-bold text-white">
                A
              </div>
              <div>
                <p className="text-[8px] text-muted">Bonjour</p>
                <p className="text-[10px] font-bold">Awa Boutique</p>
              </div>
            </div>
            <div className="relative flex h-7 w-7 items-center justify-center rounded-xl border border-line bg-panel2">
              <Bell size={11} className="text-muted" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
            </div>
          </div>
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-brand to-deep p-3">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-white/70">Profit du jour</p>
            <p className="font-display text-xl font-extrabold text-white">35 800 F</p>
            <div className="mt-1 flex items-center gap-1 text-[8px] font-semibold text-white/85">
              <TrendingUp size={9} /> +18% vs hier
            </div>
          </div>
          <div className="mb-3 rounded-xl border border-line bg-panel p-2.5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[8px] font-semibold text-muted">OBJECTIF 50 000 F</span>
              <span className="text-[8px] font-bold text-brand2">72%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-brand to-brand2" />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="mb-2 text-[8px] font-semibold text-muted">7 DERNIERS JOURS</p>
            <div className="flex h-12 items-end gap-1.5">
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 rounded-full ${i === 5 ? "bg-gradient-to-t from-deep to-brand2" : "bg-white/12"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-10 top-16 -rotate-6 rounded-2xl border border-line bg-panel2/95 px-3 py-2 shadow-xl backdrop-blur">
        <p className="text-[9px] text-muted">Vente encaissée</p>
        <p className="font-display text-sm font-bold text-mint">+12 500 F</p>
      </div>
      <div className="absolute -right-6 bottom-24 rotate-3 rounded-2xl border border-mint/25 bg-mint/10 px-3 py-2 shadow-xl backdrop-blur">
        <p className="flex items-center gap-1 text-[9px] font-bold text-mint">Objectif atteint <PartyPopper size={10} aria-hidden="true" /></p>
      </div>
    </div>
  );
}

/* ---------- Bento fonctionnalités ---------- */

const BENTO = [
  {
    icon: WifiOff,
    title: "100% hors-ligne",
    desc: "Pas de forfait internet au marché ? Aucun souci. Tout s'enregistre sur le téléphone, même en mode avion.",
    span: "md:col-span-2 md:row-span-1",
    accent: "text-brand2",
    ring: "border-brand/25 bg-brand/[0.07]",
  },
  {
    icon: Zap,
    title: "3 secondes",
    desc: "Clavier géant, une main, entre deux clientes.",
    span: "",
    accent: "text-amber-300",
    ring: "border-amber-400/25 bg-amber-400/[0.06]",
  },
  {
    icon: Users,
    title: "Crédits clients",
    desc: "Fini le cahier déchiré : qui doit quoi, qui a remboursé, qui relancer.",
    span: "",
    accent: "text-mint",
    ring: "border-mint/25 bg-mint/[0.06]",
  },
  {
    icon: Package,
    title: "Stock & réassort",
    desc: "Quantités en temps réel, alerte de rupture, vente qui déduit le stock automatiquement et calcule ta marge.",
    span: "md:col-span-2",
    accent: "text-sky-300",
    ring: "border-sky-400/25 bg-sky-400/[0.06]",
  },
  {
    icon: MessageCircle,
    title: "Relance WhatsApp",
    desc: "Un tap : le message de rappel part au client avec le montant exact.",
    span: "",
    accent: "text-mint",
    ring: "border-mint/25 bg-mint/[0.06]",
  },
  {
    icon: Target,
    title: "Objectif du jour",
    desc: "Fixe ton chiffre, regarde la barre se remplir.",
    span: "",
    accent: "text-brand2",
    ring: "border-brand/25 bg-brand/[0.06]",
  },
  {
    icon: Receipt,
    title: "Reçus de caisse",
    desc: "Reçu PDF ou message WhatsApp après chaque vente. Une preuve propre pour chaque client.",
    span: "",
    accent: "text-rose",
    ring: "border-rose/25 bg-rose/[0.06]",
  },
  {
    icon: KeyRound,
    title: "Code PIN",
    desc: "L'app se verrouille. Ni vendeuses, ni curieux.",
    span: "",
    accent: "text-amber-300",
    ring: "border-amber-400/25 bg-amber-400/[0.06]",
  },
  {
    icon: BarChart3,
    title: "Rapports clairs",
    desc: "Courbes de ventes, répartition des dépenses, encaissements par membre de l'équipe. Export PDF et Excel pour la banque.",
    span: "md:col-span-2",
    accent: "text-violet-300",
    ring: "border-violet-400/25 bg-violet-400/[0.06]",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Installe en 30 secondes",
    desc: "Ouvre le lien sur ton téléphone, choisis « Ajouter à l'écran d'accueil ». L'icône apparaît comme une vraie application.",
  },
  {
    n: "02",
    title: "Enregistre ta première vente",
    desc: "Tape le montant sur le clavier géant, valide. C'est tout. Le profit du jour se met à jour immédiatement.",
  },
  {
    n: "03",
    title: "Regarde ton vrai bénéfice",
    desc: "Chaque soir, l'app te dit ce que ton commerce a réellement gagné — ventes moins dépenses. Enfin des chiffres sûrs.",
  },
];

const TESTIMONIALS = [
  {
    name: "Vendeuse de pagnes",
    role: "Marché d'Adjamé",
    text: "Fini le cahier qui se déchire. Chaque vente est notée en 2 touches et le bénéfice du jour s'affiche tout seul le soir.",
    tilt: "-1.4deg",
  },
  {
    name: "Gérant d'épicerie",
    role: "Boutique de quartier",
    text: "Les clients qui prennent à crédit sont listés avec leur solde. Une touche, et le rappel part sur WhatsApp.",
    tilt: "1.2deg",
  },
  {
    name: "Boutique avec vendeuses",
    role: "Cosmétiques, prêt-à-porter",
    text: "Chaque vendeuse encaisse sous son nom. Le patron voit qui a vendu quoi, même quand il n'est pas là.",
    tilt: "-0.8deg",
  },
];

const FAQ = [
  {
    q: "Ça marche vraiment sans internet ?",
    a: "Oui. Toutes les ventes, dépenses, crédits et stocks sont enregistrés dans le téléphone. Tu peux couper le réseau, l'application continue de fonctionner. Internet ne sert qu'à la sauvegarde cloud et aux paiements Premium.",
  },
  {
    q: "Et si je perds ou on me vole mon téléphone ?",
    a: "Avec le Premium, tu choisis un code secret et tu sauvegardes tes données. Sur ton nouveau téléphone, tu entres le même code et tout revient : ventes, crédits, stock, équipe.",
  },
  {
    q: "Comment je paie l'abonnement ?",
    a: "Par Wave, Orange Money, MTN MoMo ou Moov Money, directement depuis l'application. À partir de 2 000 F par mois, ou 25 000 F une seule fois pour la version à vie.",
  },
  {
    q: "Je peux l'utiliser avec mes vendeuses ?",
    a: "Oui. Tu ajoutes chaque membre dans « Mon équipe », et au moment d'encaisser tu indiques qui a pris la vente. Les rapports montrent ensuite les encaissements de chacune.",
  },
  {
    q: "C'est disponible sur Google Play ?",
    a: "L'application s'installe directement depuis le site, sans passer par un store. La version Google Play arrive : tu peux déjà l'utiliser dès aujourd'hui.",
  },
];

function FaqItem({ q, a, i }: { q: string; a: string; i: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap flex w-full items-center gap-4 border-b border-line py-5 text-left transition-colors hover:text-brand2"
      >
        <span className="font-display text-sm font-bold">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="ml-auto shrink-0 text-muted">
          <ChevronDown size={17} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <p className="py-4 text-sm leading-relaxed text-muted">{a}</p>
      </motion.div>
    </motion.div>
  );
}

export default function Landing({ onStart }: { onStart: () => void }) {
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  return (
    <div className="noise min-h-dvh overflow-x-clip bg-ink font-body text-cream">
      {/* Fond : grille papier du marché */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.055) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(255,122,26,0.13),transparent_65%)]" />

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-lg font-bold tracking-tight">Ivory Caisse</span>
          </div>
          <button
            onClick={onStart}
            className="tap btn-press flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-deep px-4 py-2 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(255,122,26,0.7)]"
          >
            Ouvrir l'app <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-16 pt-28">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand2"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Conçue pour les commerçants d'Afrique
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-display text-[3.2rem] font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-6xl lg:text-[4.4rem]"
            >
              Ton cahier
              <br />
              de caisse,
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">enfin clair.</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
                  className="absolute inset-x-0 bottom-1.5 z-0 h-4 origin-left rounded-sm bg-brand/35 sm:bottom-2 sm:h-5"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 max-w-md text-base leading-relaxed text-muted sm:text-lg"
            >
              Ventes, dépenses, crédits clients, stock. Chaque soir, tu sais exactement ce que ton commerce a gagné.
              Même sans réseau.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Btn onClick={onStart} className="px-7 py-4 text-base">
                Créer ma caisse <ArrowRight size={18} />
              </Btn>
              <InstallApp />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.34 }}
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted"
            >
              <Smartphone size={14} className="text-brand2" /> Gratuit · Sans pub · Android et iPhone
            </motion.p>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6"
            >
              {[
                ["100 %", "hors-ligne"],
                ["30 s", "pour démarrer"],
                ["0 F", "pour commencer"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-muted">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.2 }}
            className="space-y-4 py-4"
          >
            <LiveTicker />
            <PhoneMock />
          </motion.div>
        </div>
      </section>

      {/* Marquee */}
      <div className="overflow-hidden border-y border-line bg-panel py-4">
        <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex items-center gap-10">
              {[
                "100% hors-ligne",
                "Wave",
                "Orange Money",
                "MTN MoMo",
                "Moov Money",
                "Gestion de stock",
                "Reçus de caisse",
                "Crédits clients",
                "Relances WhatsApp",
                "Bilan du jour",
                "Franc CFA",
                "Naira",
                "Cedi",
                "Shilling",
                "Rand",
                "Multi-devise",
              ].map((s) => (
                <span key={s} className="flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-muted">
                  {s} <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bento fonctionnalités */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <motion.div {...fadeUp} className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand2">Ce qu'elle fait pour toi</p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Tout ce qu'il faut. <span className="text-muted">Rien de trop.</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Une caisse pensée pour le marché : rapide, solide, et qui parle franc CFA.
          </p>
        </motion.div>

        <div className="grid gap-3 md:grid-cols-3">
          {BENTO.map((f, i) => (
            <motion.article
              key={f.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.06 }}
              className={`group relative overflow-hidden rounded-[1.6rem] border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 ${f.span}`}
            >
              <div
                className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${f.ring}`}
              />
              <div className="relative">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-ink ${f.accent}`}>
                  <f.icon size={19} />
                </div>
                <h3 className="mb-2 font-display text-xl font-bold tracking-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="border-y border-line bg-panel px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-14">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand2">Trois étapes</p>
            <h2 className="max-w-lg font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Prête avant la fin de la journée
            </h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="relative">
                <span className="font-display text-[4.5rem] font-extrabold leading-none text-white/[0.07]">{s.n}</span>
                <h3 className="-mt-6 font-display text-xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <motion.div {...fadeUp} className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand2">Tarifs en FCFA, sans surprise</p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Un prix pour chaque commerce
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {PAYMENTS.map((p) => (
              <img
                key={p.name}
                src={p.logo}
                alt={p.name}
                width={320}
                height={180}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto rounded-lg border border-line"
              />
            ))}
          </div>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.id}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className={`card relative flex flex-col p-6 ${
                p.highlight ? "border-brand/50 shadow-[0_0_50px_-12px_rgba(255,122,26,0.5)]" : ""
              }`}
            >
              {p.tag && (
                <span
                  className={`absolute -top-3 left-5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                    p.highlight ? "bg-gradient-to-r from-brand to-deep text-white" : "border border-line bg-panel2 text-brand2"
                  }`}
                >
                  {p.tag}
                </span>
              )}
              <p className="text-sm font-bold text-muted">{p.name}</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-extrabold">{p.price}</span>
                <span className="text-xs text-muted">{p.per}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-muted">
                    <Check size={14} className="mt-0.5 shrink-0 text-mint" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onStart}
                className={`tap btn-press mt-6 flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold ${
                  p.highlight
                    ? "bg-gradient-to-br from-brand to-deep text-white shadow-[0_10px_28px_-8px_rgba(255,122,26,0.65)]"
                    : "border border-line bg-panel2"
                }`}
              >
                Choisir <ArrowUpRight size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Témoignages */}
      <section className="border-y border-line bg-panel px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-14 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand2">Pensée pour ton commerce</p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Trois façons de l'utiliser</h2>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.figure
                key={t.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.07 }}
                style={{ rotate: t.tilt }}
                className="card flex flex-col p-6 transition-transform duration-300 hover:rotate-0 hover:border-brand/30"
              >
                <p className="flex-1 text-sm leading-relaxed text-cream/90">{t.text}</p>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <Avatar name={t.name} size={40} />
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted">{t.role}</p>
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-24">
        <motion.div {...fadeUp} className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand2">Questions fréquentes</p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">On te répond cash</h2>
        </motion.div>
        <div>
          {FAQ.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} i={i} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 pb-24">
        <motion.div
          {...fadeUp}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-brand/30 bg-gradient-to-br from-brand/15 via-panel to-panel p-10 sm:p-16"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/15 blur-[90px]" />
          <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Ton commerce mérite
                <br />
                des chiffres <span className="text-brand2">propres.</span>
              </h2>
              <p className="mt-4 max-w-md text-muted">
                Installation en 30 secondes. Tes premières ventes enregistrées avant ce soir.
              </p>
              <Btn onClick={onStart} className="mt-8 px-8 py-4 text-base">
                Commencer gratuitement <ArrowRight size={18} />
              </Btn>
            </div>
            <ul className="space-y-3">
              {[
                [<ShieldCheck key="a" size={15} />, "Aucune donnée vendue, jamais"],
                [<Download key="b" size={15} />, "Export de tes données à tout moment"],
                [<Plus key="c" size={15} />, "Gratuit pour toujours, sans publicité"],
              ].map(([icon, text]) => (
                <li key={String(text)} className="flex items-center gap-3 rounded-2xl border border-line bg-ink/60 px-4 py-3 text-sm font-semibold">
                  <span className="text-brand2">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line px-5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
              <div>
                <p className="font-display text-sm font-bold">Ivory Caisse</p>
                <p className="text-xs text-muted">Un produit Ivory Gestion · Abidjan, Afrique</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {PAYMENTS.map((p) => (
                <img
                  key={p.name}
                  src={p.logo}
                  alt={p.name}
                  width={320}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-auto rounded-md"
                />
              ))}
            </div>
          </div>

          {/* Légal */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-8 text-xs font-semibold text-muted">
            <button onClick={() => setLegal("terms")} className="tap transition-colors hover:text-brand2">
              Conditions d'utilisation
            </button>
            <button onClick={() => setLegal("privacy")} className="tap transition-colors hover:text-brand2">
              Confidentialité
            </button>
            <button onClick={() => setLegal("contact")} className="tap transition-colors hover:text-brand2">
              Contact
            </button>
          </div>

          {/* Éditeur */}
          <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-deep font-display text-xs font-extrabold text-white">
                IG
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Éditeur</p>
                <p className="font-display text-base font-bold">Ivory Gestion</p>
                <p className="text-xs text-brand2">Fondé par Fidèle Folly</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              © 2026 Ivory Gestion — Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {legal && <Legal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}

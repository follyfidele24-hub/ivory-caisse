import { motion } from "framer-motion";
import { ArrowLeft, AtSign, Building2, Clock, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { CONTACT, whatsappLink } from "../lib/contact";
import { cloudReady } from "../lib/cloudFlag";

export type LegalDoc = "terms" | "privacy" | "contact";

interface Section {
  h: string;
  p?: string;
  items?: string[];
}


const DOCS: Record<LegalDoc, { title: string; intro: string; sections: Section[] }> = {
  terms: {
    title: "Conditions d'utilisation",
    intro: `En vigueur depuis janvier 2026. Ces conditions régissent l'utilisation de ${CONTACT.product}, éditée par ${CONTACT.structure}.`,
    sections: [
      {
        h: "1. Présentation du service",
        p: `${CONTACT.product} est une application de gestion de caisse (ventes, dépenses, crédits clients, stock) destinée aux commerçants. Le service fonctionne principalement hors-ligne, sur l'appareil de l'utilisateur.`,
      },
      {
        h: "2. Acceptation",
        p: "En créant une caisse ou en continuant à utiliser l'application, vous acceptez les présentes conditions. Si vous n'êtes pas d'accord, n'utilisez pas le service.",
      },
      {
        h: "3. Votre responsabilité",
        items: [
          "Vous êtes responsable de l'exactitude des ventes, dépenses et crédits que vous saisissez.",
          `Vous devez sauvegarder régulièrement vos données (fichier de sauvegarde${cloudReady ? " ou sauvegarde cloud Premium" : ""}).`,
          "Vous protégez votre code PIN et votre appareil.",
        ],
      },
      {
        h: "4. Abonnement Premium & paiements",
        p: "Certaines fonctions nécessitent une licence Premium (mensuelle, annuelle ou à vie). Le paiement se fait sur la boutique en ligne Ivory Gestion, opérée par Chariow, qui encaisse le mobile money et les cartes. Une clé d'activation est envoyée par e-mail. Les licences sont des achats uniques, sans renouvellement automatique.",
      },
      {
        h: "5. Utilisation acceptable",
        items: [
          "Ne pas tenter d'accéder à des données qui ne vous appartiennent pas.",
          "Ne pas utiliser le service à des fins illégales.",
          "Ne pas reprendre la marque Ivory Caisse / Ivory Gestion sans autorisation.",
        ],
      },
      {
        h: "6. Propriété intellectuelle",
        p: `${CONTACT.product}, son nom, son logo, son code et ses contenus sont la propriété exclusive de ${CONTACT.structure}. Tous droits réservés. Toute reproduction, même partielle, est interdite sans autorisation écrite.`,
      },
      {
        h: "7. Limitation de responsabilité",
        p: `${CONTACT.structure} met tout en œuvre pour la fiabilité du service, mais ne saurait être tenu responsable d'une perte de données liée à une défaillance de l'appareil, un vol, ou une absence de sauvegarde de la part de l'utilisateur. Le service est fourni « tel quel ».`,
      },
      {
        h: "8. Modifications du service",
        p: "Nous pouvons faire évoluer les fonctionnalités et la tarification. Les changements importants seront communiqués dans l'application.",
      },
      {
        h: "9. Loi applicable",
        p: `Les présentes conditions sont régies par le droit ivoirien. En cas de litige, les tribunaux d'Abidjan sont compétents.`,
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    intro: `${CONTACT.structure} respecte la vie privée des commerçants. Cette politique explique quelles données sont traitées et comment.`,
    sections: [
      {
        h: "1. Responsable du traitement",
        p: `${CONTACT.structure}, éditrice de ${CONTACT.product}, est responsable du traitement de vos données.`,
      },
      {
        h: "2. Données stockées sur votre appareil",
        p: "Vos ventes, dépenses, crédits, stock, équipe et profil sont enregistrés localement sur votre téléphone. Ils ne quittent jamais votre appareil tant que vous ne les partagez pas" + (cloudReady ? " ou ne les sauvegardez pas dans le cloud." : "."),
      },
      {
        h: "3. Sauvegarde cloud (option Premium)",
        p: cloudReady
          ? "Si vous activez la sauvegarde cloud, vos données chiffrées sont envoyées sur nos serveurs (Firebase) associées au code secret que vous choisissez, afin de les restaurer en cas de perte du téléphone."
          : "La sauvegarde cloud n'est pas encore proposée : aucune donnée n'est envoyée sur nos serveurs. Lorsqu'elle sera disponible, elle restera facultative et cette politique sera mise à jour avant son activation.",
      },
      {
        h: "4. Paiements",
        p: "Les paiements Premium sont traités par Chariow, la plateforme de la boutique Ivory Gestion. Nous ne recevons ni ne stockons vos informations bancaires ou mobile money. Pour vérifier une licence, l'application envoie la clé et un identifiant anonyme du téléphone ; la clé est conservée sous forme chiffrée (empreinte).",
      },
      {
        h: "5. Ce que nous ne faisons jamais",
        items: [
          "Nous ne vendons jamais vos données.",
          "Nous ne partageons pas vos informations commerciales avec des tiers à des fins publicitaires.",
          "Nous n'accédons pas à vos contacts ou messages sans votre action explicite (partage WhatsApp).",
        ],
      },
      {
        h: "6. Sécurité",
        p: "Vous pouvez activer un code PIN pour verrouiller l'application. Nous vous recommandons d'exporter ou de sauvegarder régulièrement vos données.",
      },
      {
        h: "7. Vos droits",
        p: "Conformément aux lois applicables, vous pouvez demander l'accès, la rectification ou la suppression de vos données cloud. Pour cela, contactez-nous (voir Contact).",
      },
      {
        h: "8. Conservation",
        p: "Les données locales sont conservées tant que vous utilisez l'application. Vous pouvez tout effacer à tout moment depuis les Réglages.",
      },
    ],
  },
  contact: {
    title: "Contact",
    intro: "Une question, une suggestion, un problème ? L'équipe Ivory Gestion vous répond.",
    sections: [],
  },
};

export default function Legal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  const d = DOCS[doc];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink no-scrollbar"
    >
      <div className="pointer-events-none fixed -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/12 blur-[100px]" />

      <div className="relative mx-auto min-h-dvh w-full max-w-md px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            className="tap btn-press flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-panel"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-xl font-extrabold tracking-tight">{d.title}</h1>
        </div>

        {doc === "contact" ? (
          <div className="space-y-3">
            <div className="card flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-panel2 font-display text-sm font-extrabold text-fg">
                IG
              </div>
              <div>
                <p className="font-display text-lg font-bold">{CONTACT.structure}</p>
                <p className="text-xs text-muted">Éditrice de {CONTACT.product}</p>
              </div>
            </div>

            <a
              href={`mailto:${CONTACT.email}`}
              className="tap card flex items-center gap-3.5 p-4 transition-colors hover:border-brand/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand2">
                <AtSign size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Email</p>
                <p className="text-xs text-muted">{CONTACT.email}</p>
              </div>
            </a>

            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="tap card flex items-center gap-3.5 p-4 transition-colors hover:border-brand/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10 text-mint">
                <MessageCircle size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">WhatsApp</p>
                <p className="text-xs text-muted">{CONTACT.whatsapp}</p>
              </div>
            </a>

            {CONTACT.phones.map((ph) => (
              <a key={ph.tel} href={`tel:${ph.tel}`} className="tap card flex items-center gap-3.5 p-4 transition-colors hover:border-brand/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
                  <Phone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Téléphone</p>
                  <p className="text-xs text-muted tabular-nums">{ph.label}</p>
                </div>
              </a>
            ))}

            <div className="card flex items-center gap-3.5 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel2 text-muted">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Siège</p>
                <p className="text-xs text-muted">{CONTACT.city}</p>
              </div>
            </div>
            <div className="card flex items-center gap-3.5 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel2 text-muted">
                <Clock size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Horaires</p>
                <p className="text-xs text-muted">Lun. – Sam. · 8h – 20h</p>
              </div>
            </div>

            <div className="card flex items-center gap-3.5 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Fondateur</p>
                <p className="text-xs text-muted">{CONTACT.founder}</p>
              </div>
            </div>

            <p className="pt-4 text-center text-[11px] leading-relaxed text-muted">
              © 2026 {CONTACT.structure} — Tous droits réservés.
            </p>
          </div>
        ) : (
          <article className="space-y-6">
            <p className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm leading-relaxed text-muted">{d.intro}</p>
            {d.sections.map((s) => (
              <section key={s.h}>
                <h2 className="mb-2 font-display text-base font-bold text-brand2">{s.h}</h2>
                {s.p && <p className="text-sm leading-relaxed text-cream/85">{s.p}</p>}
                {s.items && (
                  <ul className="mt-2 space-y-1.5">
                    {s.items.map((it) => (
                      <li key={it} className="flex gap-2 text-sm leading-relaxed text-cream/85">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <p className="border-t border-line pt-6 text-center text-[11px] text-muted">
              © 2026 {CONTACT.structure} — Tous droits réservés.
            </p>
          </article>
        )}
      </div>
    </motion.div>
  );
}

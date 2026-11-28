import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Copy, KeyRound, Lock, Pause, Play, ScrollText, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { MAX_STAFF, PLAN_LABEL, staffLimit, useStore } from "../lib/store";
import { fmtF } from "../lib/format";
import { shareText } from "../lib/receipt";
import { Btn, Sheet } from "./ui";
import Control from "./Control";


/** Le patron gère son équipe : un accès par vendeur avec son PIN, les règles, le contrôle. */
export default function TeamCard({ onPremium, notify }: { onPremium: () => void; notify: (m: string) => void }) {
  const { profile, staff, sellers, rules, txns, staffAllowed, addStaff, setStaffPin, setStaffActive, removeStaff, removeSeller, setRules, ensureRecovery } = useStore();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [recovery, setRecovery] = useState<string | null>(null);
  const [ctl, setCtl] = useState(false);
  const [rCap, setRCap] = useState(String(rules.expenseCap));
  const [rMin, setRMin] = useState(String(rules.cancelMin));
  const [rDay, setRDay] = useState(String(rules.cancelPerDay));

  const lim = staffLimit(profile?.plan);
  const capped = lim < MAX_STAFF;
  const hasPin = Boolean(profile?.pin);
  const limitReached = staff.length >= lim;
  const legacy = sellers.filter((s) => !staff.some((x) => x.name === s));
  const pending = txns.filter((t) => t.review === "pending").length;
  const field = "rounded-2xl border border-line bg-panel2 px-4 py-3 text-sm font-semibold outline-none transition-colors placeholder:text-fg/30 focus:border-brand/50";
  const digits = (v: string, n: number) => v.replace(/\D/g, "").slice(0, n);

  const create = (n = name) => {
    const r = addStaff(n, pin);
    if (!r.ok) {
      setErr(r.why);
      return;
    }
    const first = staff.length === 0;
    setErr(null);
    setName("");
    setPin("");
    notify(`Accès créé pour ${n.trim()}. Donne-lui son PIN en main propre.`);
    if (first || !profile?.recovery) setRecovery(ensureRecovery());
  };

  const saveRules = () => {
    const cap = parseInt(rCap || "0", 10);
    const min = Math.min(60, Math.max(0, parseInt(rMin || "0", 10)));
    const day = Math.min(20, Math.max(0, parseInt(rDay || "0", 10)));
    setRules({ expenseCap: cap, cancelMin: min, cancelPerDay: day });
    setRMin(String(min));
    setRDay(String(day));
    notify("Règles enregistrées");
  };

  return (
    <div className="card mb-4 p-4">
      <div className="flex items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-500">
          <Users size={16} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Accès vendeurs</p>
          <p className="text-xs leading-relaxed text-muted">
            Chaque vendeur a son PIN. Il encaisse, mais ne touche ni au stock, ni aux prix, ni à tes chiffres.
          </p>
        </div>
      </div>

      {!hasPin && (
        <p className="mt-3.5 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold leading-relaxed text-amber-700">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> Active d'abord ton code PIN patron (section Sécurité, juste au-dessus). C'est lui qui protège tes droits.
        </p>
      )}

      {staff.length > 0 && (
        <div className="mt-3.5 divide-y divide-line rounded-2xl border border-line">
          {staff.map((s) => (
            <div key={s.name} className="flex items-center gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className={`text-[11px] font-semibold ${s.active && staffAllowed(s.name) ? "text-mint" : "text-muted"}`}>
                  {!s.active ? "Accès suspendu" : staffAllowed(s.name) ? "Accès actif" : "En pause · Boutique pour le réactiver"}
                </p>
              </div>
              <button onClick={() => { setPinFor(s.name); setNewPin(""); setErr(null); }} className="tap btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel" aria-label={`Nouveau PIN pour ${s.name}`} title="Nouveau PIN">
                <KeyRound size={15} aria-hidden="true" />
              </button>
              <button onClick={() => { setStaffActive(s.name, !s.active); notify(s.active ? `${s.name} ne peut plus se connecter` : `${s.name} peut de nouveau se connecter`); }} className="tap btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel" aria-label={s.active ? `Suspendre ${s.name}` : `Réactiver ${s.name}`} title={s.active ? "Suspendre" : "Réactiver"}>
                {s.active ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
              </button>
              <button
                onClick={() => {
                  if (!window.confirm(`Retirer l'accès de ${s.name} ? Son historique reste dans le journal.`)) return;
                  removeStaff(s.name);
                  notify(`Accès de ${s.name} retiré`);
                }}
                className="tap btn-press flex h-10 w-10 items-center justify-center rounded-xl border border-rose/30 bg-rose/10 text-rose"
                aria-label={`Retirer ${s.name}`}
                title="Retirer"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {legacy.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {legacy.map((s) => (
            <span key={s} className="flex items-center gap-1.5 rounded-full border border-line bg-panel2 py-1.5 pl-3.5 pr-1.5 text-xs font-bold text-muted">
              {s} · sans accès
              <button onClick={() => { setName(s); setErr(null); }} className="tap rounded-full bg-brand/15 px-2 py-1 text-[10px] font-extrabold text-brand2">Donner un accès</button>
              <button onClick={() => removeSeller(s)} className="tap rounded-full px-1.5 py-1 text-[10px] font-bold" aria-label={`Retirer ${s}`}>✕</button>
            </span>
          ))}
        </div>
      )}

      {hasPin &&
        (limitReached && capped ? (
          <button onClick={onPremium} className="tap btn-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 px-3 text-sm font-bold text-brand2">
            <Lock size={14} aria-hidden="true" /> {PLAN_LABEL[profile?.plan ?? "free"]} : {lim} vendeur{lim > 1 ? "s" : ""} · illimités avec Boutique
          </button>
        ) : limitReached ? null : (
          <div className="mt-3">
            <div className="grid grid-cols-[1fr_6.5rem] gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Prénom du vendeur" placeholder="Prénom (ex : Grâce)" className={`min-w-0 ${field}`} />
              <input value={pin} onChange={(e) => setPin(digits(e.target.value, 4))} aria-label="PIN du vendeur (4 chiffres)" placeholder="PIN" inputMode="numeric" type="password" autoComplete="new-password" className={`text-center tracking-[0.3em] ${field}`} />
            </div>
            {err && <p className="mt-1.5 text-xs font-bold text-rose">{err}</p>}
            <Btn className="mt-2 w-full" disabled={name.trim().length < 2 || pin.length !== 4} onClick={() => create()}>
              <UserPlus size={16} aria-hidden="true" /> Créer l'accès vendeur
            </Btn>
          </div>
        ))}

      {staff.length > 0 && (
        <>
          <p className="mb-2 mt-5 text-xs font-bold text-muted">Règles pour les vendeurs</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] font-semibold text-muted">
              Dépense seule jusqu'à
              <input value={rCap} onChange={(e) => setRCap(digits(e.target.value, 7))} inputMode="numeric" className={`mt-1 w-full px-3 tabular-nums ${field}`} />
            </label>
            <label className="text-[11px] font-semibold text-muted">
              Annulation (min)
              <input value={rMin} onChange={(e) => setRMin(digits(e.target.value, 2))} inputMode="numeric" className={`mt-1 w-full px-3 tabular-nums ${field}`} />
            </label>
            <label className="text-[11px] font-semibold text-muted">
              Annulations / jour
              <input value={rDay} onChange={(e) => setRDay(digits(e.target.value, 2))} inputMode="numeric" className={`mt-1 w-full px-3 tabular-nums ${field}`} />
            </label>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Actuel : dépense ≤ {fmtF(rules.expenseCap)} sans toi, annulation de sa vente pendant {rules.cancelMin} min, {rules.cancelPerDay} par jour. Remise et changement de prix : jamais sans ton PIN.
          </p>
          <Btn variant="soft" className="mt-2 w-full" onClick={saveRules}>
            Enregistrer les règles
          </Btn>
        </>
      )}

      <Btn variant="soft" className="mt-3 w-full" onClick={() => setCtl(true)}>
        <ScrollText size={15} aria-hidden="true" /> Journal et clôtures de caisse
        {pending > 0 && <span className="rounded-full bg-rose px-2 py-0.5 text-[10px] font-extrabold text-white">{pending} à vérifier</span>}
      </Btn>

      {/* Nouveau PIN pour un vendeur */}
      <Sheet open={pinFor !== null} onClose={() => setPinFor(null)}>
        <h2 className="text-center font-display text-lg font-extrabold">Nouveau PIN pour {pinFor}</h2>
        <input value={newPin} onChange={(e) => setNewPin(digits(e.target.value, 4))} inputMode="numeric" type="password" autoComplete="new-password" aria-label="Nouveau PIN" className={`mt-4 w-full text-center font-display text-xl tracking-[0.5em] ${field}`} />
        {err && <p className="mt-1.5 text-center text-xs font-bold text-rose">{err}</p>}
        <Btn
          className="mt-3 w-full py-4"
          disabled={newPin.length !== 4}
          onClick={() => {
            const r = setStaffPin(pinFor!, newPin);
            if (!r.ok) return setErr(r.why);
            setErr(null);
            notify(`PIN de ${pinFor} changé`);
            setPinFor(null);
          }}
        >
          <KeyRound size={16} aria-hidden="true" /> Changer le PIN
        </Btn>
      </Sheet>

      {/* Code de secours, montré une fois à la création de l'équipe */}
      <Sheet open={recovery !== null} onClose={() => setRecovery(null)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand2">
          <ShieldCheck size={22} aria-hidden="true" />
        </div>
        <h2 className="text-center font-display text-lg font-extrabold">Ton code de secours</h2>
        <p className="mx-auto mt-1 max-w-xs text-center text-xs leading-relaxed text-muted">
          Si tu oublies ton PIN patron, ce code te permet d'en créer un nouveau. Garde-le hors de la boutique : envoie-le-toi sur WhatsApp.
        </p>
        <p className="mt-4 rounded-2xl border border-line bg-panel2 py-4 text-center font-mono text-2xl font-extrabold tracking-[0.2em]">{recovery}</p>
        <Btn variant="mint" className="mt-4 w-full py-4" onClick={() => void shareText(`Code de secours Ivory Caisse (${profile?.shop ?? ""}) : ${recovery}`, "Code de secours")}>
          <Copy size={16} aria-hidden="true" /> L'envoyer sur mon WhatsApp
        </Btn>
        <Btn variant="soft" className="mt-2.5 w-full" onClick={() => setRecovery(null)}>
          C'est noté
        </Btn>
      </Sheet>

      <AnimatePresence>{ctl && <Control onClose={() => setCtl(false)} onPremium={onPremium} />}</AnimatePresence>
    </div>
  );
}

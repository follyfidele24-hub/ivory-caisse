import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, ClipboardCheck, Crown, Lock, ScrollText, ShieldAlert, User, X } from "lucide-react";
import { DAY, fmtF, relDay, startOfDay, timeOf } from "../lib/format";
import { fullJournal, OWNER, useStore, type JournalAction } from "../lib/store";
import { Btn, Seg } from "./ui";

const FREE_DAYS = 7;

const TONE: Partial<Record<JournalAction, string>> = {
  denied: "text-rose",
  cancel: "text-amber-600",
  delete: "text-rose",
  edit: "text-amber-600",
  stock: "text-sky-600",
  closure: "text-brand2",
};

/** Contrôle du patron : journal de tout ce qui se passe, clôtures de caisse, dépenses à vérifier. */
export default function Control({ onClose, onPremium, initial = "journal" }: { onClose: () => void; onPremium: () => void; initial?: "journal" | "closures" | "review" }) {
  const { journal, closures, txns, staff, profile, markReviewed } = useStore();
  const [tab, setTab] = useState<"journal" | "closures" | "review">(initial);
  const [who, setWho] = useState<string | null>(null);
  const free = !fullJournal(profile?.plan);
  const limit = free ? startOfDay(Date.now()) - (FREE_DAYS - 1) * DAY : 0;

  const people = [OWNER, ...staff.map((s) => s.name)];
  const rows = useMemo(() => journal.filter((j) => j.ts >= limit && (!who || j.who === who)), [journal, limit, who]);
  const hidden = free ? journal.filter((j) => j.ts < limit).length : 0;
  const pending = txns.filter((t) => t.review === "pending");
  const cl = closures.filter((c) => c.ts >= limit && (!who || c.who === who));

  /* Regroupe par jour */
  const groups = useMemo(() => {
    const m = new Map<number, typeof rows>();
    for (const r of rows) {
      const d = startOfDay(r.ts);
      m.set(d, [...(m.get(d) ?? []), r]);
    }
    return [...m.entries()];
  }, [rows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink no-scrollbar"
    >
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="tap btn-press flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel" aria-label="Fermer">
            <X size={18} />
          </button>
          <span className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-brand2">
            <ShieldAlert size={12} aria-hidden="true" /> Contrôle patron
          </span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">Qui a fait quoi</h1>
        <p className="mt-1 text-sm text-muted">Chaque vente, annulation, dépense et changement de stock, avec le nom et l'heure. Rien ne s'efface.</p>

        <div className="mt-5">
          <Seg
            id="ctl-tab"
            options={[
              { id: "journal", label: "Journal" },
              { id: "closures", label: "Clôtures" },
              { id: "review", label: `À vérifier${pending.length ? ` (${pending.length})` : ""}` },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab !== "review" && (
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {[null, ...people].map((p) => (
              <button
                key={p ?? "all"}
                onClick={() => setWho(p)}
                aria-pressed={who === p}
                className={`tap btn-press shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${who === p ? "border-brand/50 bg-brand/15 text-brand2" : "border-line bg-panel2 text-muted"}`}
              >
                {p ?? "Tout le monde"}
              </button>
            ))}
          </div>
        )}

        {tab === "journal" && (
          <div className="mt-4 space-y-5">
            {groups.map(([d, list]) => (
              <div key={d}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{relDay(d)}</p>
                <div className="card divide-y divide-line overflow-hidden">
                  {list.map((j) => (
                    <div key={j.id} className="flex items-start gap-3 p-3.5">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${j.staff ? "border-mint/30 bg-mint/10 text-mint" : "border-brand/30 bg-brand/10 text-brand2"}`}>
                        {j.staff ? <User size={14} aria-hidden="true" /> : <Crown size={14} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold leading-snug ${TONE[j.action] ?? ""}`}>
                          {j.action === "denied" && <AlertTriangle size={13} className="mr-1 inline" aria-hidden="true" />}
                          {j.text}
                        </p>
                        <p className="text-[11px] text-muted">
                          {j.who} · {timeOf(j.ts)}
                        </p>
                      </div>
                      {j.amount !== undefined && j.action !== "closure" && (
                        <span className="shrink-0 text-xs font-bold tabular-nums text-muted">{fmtF(j.amount)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <Empty icon={<ScrollText size={20} />} text="Rien dans le journal pour l'instant." />}
          </div>
        )}

        {tab === "closures" && (
          <div className="mt-4 space-y-2.5">
            {cl.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold">{c.who}</p>
                  <p className="text-[11px] text-muted">
                    {relDay(c.ts)} · {timeOf(c.ts)}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <Mini k="Attendu" v={fmtF(c.expected)} />
                  <Mini k="Compté" v={fmtF(c.cash + c.momo)} />
                  <Mini k={c.diff === 0 ? "Écart" : c.diff < 0 ? "Manque" : "Surplus"} v={c.diff === 0 ? "0" : fmtF(Math.abs(c.diff))} tone={c.diff === 0 ? "text-mint" : c.diff < 0 ? "text-rose" : "text-sky-600"} />
                </div>
                {c.note && <p className="mt-2 text-xs text-muted">« {c.note} »</p>}
              </div>
            ))}
            {cl.length === 0 && <Empty icon={<ClipboardCheck size={20} />} text="Aucune clôture de caisse. Tes vendeurs la font depuis leur écran, en fin de journée." />}
          </div>
        )}

        {tab === "review" && (
          <div className="mt-4 space-y-2.5">
            {pending.map((t) => (
              <div key={t.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.note || t.category}</p>
                  <p className="text-[11px] text-muted">
                    {t.category} · {t.by} · {relDay(t.ts)} {timeOf(t.ts)}
                  </p>
                </div>
                <p className="shrink-0 font-display text-sm font-bold tabular-nums text-rose">-{fmtF(t.amount)}</p>
                <Btn variant="soft" className="shrink-0 px-3 py-2 text-xs" onClick={() => markReviewed(t.id)} aria-label={`Marquer vérifiée : ${t.note || t.category}`}>
                  <Check size={14} aria-hidden="true" /> OK
                </Btn>
              </div>
            ))}
            {pending.length === 0 && <Empty icon={<Check size={20} />} text="Aucune dépense de vendeur à vérifier." />}
            <p className="pt-2 text-center text-[11px] leading-relaxed text-muted">
              Une dépense te semble fausse ? Ouvre-la depuis l'accueil pour la corriger ou la supprimer. Le journal garde la trace.
            </p>
          </div>
        )}

        {free && hidden > 0 && tab !== "review" && (
          <button onClick={onPremium} className="tap btn-press mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-bold text-brand2">
            <Lock size={14} aria-hidden="true" /> {hidden} ligne{hidden > 1 ? "s" : ""} plus ancienne{hidden > 1 ? "s" : ""} · journal complet avec Boutique
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Mini({ k, v, tone = "" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel2 px-2 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{k}</p>
      <p className={`truncate font-display text-sm font-extrabold tabular-nums ${tone}`}>{v}</p>
    </div>
  );
}

function Empty({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-8 text-center text-muted">
      {icon}
      <p className="text-sm">{text}</p>
    </div>
  );
}

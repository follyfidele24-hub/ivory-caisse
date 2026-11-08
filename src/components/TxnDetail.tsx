import { useEffect, useState } from "react";
import { Check, FileText, ImageDown, MessageCircle, Package, Pencil, Trash2, User } from "lucide-react";
import { fmtF, fmtSigned, relDay, timeOf } from "../lib/format";
import { exportReceiptPDF, shareReceipt } from "../lib/receipt";
import { shareTicketImage } from "../lib/ticketImage";
import { useStore, type Txn, type TxnType } from "../lib/store";
import { EXP_CATS } from "./AddTxn";
import { Btn, Seg, Sheet } from "./ui";

/* yyyy-mm-dd et hh:mm locaux pour les champs date/heure */
const pad = (n: number) => String(n).padStart(2, "0");
const toDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const inputCls =
  "w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:text-fg/30 focus:border-brand/50";

/**
 * Fiche d'un mouvement : détail, ticket image / PDF / texte, modification et suppression.
 * Partagée entre le tableau de bord et l'historique.
 */
export default function TxnDetail({
  txn,
  onClose,
  notify,
}: {
  txn: Txn | null;
  onClose: () => void;
  notify: (m: string) => void;
}) {
  const { profile, sellers, deleteTxn, updateTxn } = useStore();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [type, setType] = useState<TxnType>("sale");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState("Marchandises");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seller, setSeller] = useState<string | null>(null);

  useEffect(() => {
    setMode("view");
    setConfirmDel(false);
    if (!txn) return;
    setType(txn.type);
    setAmount(String(txn.amount));
    setNote(txn.note);
    setCat(txn.type === "expense" ? txn.category : "Marchandises");
    setDate(toDate(txn.ts));
    setTime(toTime(txn.ts));
    setSeller(txn.seller ?? null);
  }, [txn]);

  const value = parseInt(amount || "0", 10);
  const ts = (() => {
    const t = new Date(`${date}T${time || "00:00"}`).getTime();
    return Number.isFinite(t) ? t : txn?.ts ?? Date.now();
  })();
  const future = ts > Date.now() + 60_000;
  const valid = value > 0 && !future;

  const save = () => {
    if (!txn || !valid) return;
    updateTxn(txn.id, {
      type,
      amount: value,
      note: note.trim(),
      category: type === "sale" ? "Vente" : cat,
      ts,
      seller: type === "sale" ? seller ?? undefined : undefined,
    });
    notify("Mouvement modifié");
    onClose();
  };

  const run = async (kind: "image" | "pdf" | "text") => {
    if (!txn || busy) return;
    setBusy(true);
    try {
      if (kind === "image") {
        const r = await shareTicketImage(txn, profile);
        if (r === "shared") notify("Ticket partagé");
        else if (r === "downloaded") notify("Ticket enregistré en image");
      } else if (kind === "pdf") {
        await exportReceiptPDF(txn, profile);
        notify("Reçu PDF téléchargé");
      } else {
        const r = await shareReceipt(txn, profile);
        if (r === "copied") notify("Reçu copié — colle-le dans WhatsApp");
        else if (r === "shared") notify("Reçu partagé");
      }
    } catch {
      notify("Partage indisponible sur ce téléphone");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={txn !== null} onClose={onClose}>
      {txn && mode === "view" && (
        <>
          <div className="mb-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              {txn.type === "sale" ? "Vente" : "Dépense"} · {relDay(txn.ts)} à {timeOf(txn.ts)}
            </p>
            <p
              className={`mt-1.5 font-display text-4xl font-extrabold tabular-nums ${
                txn.type === "sale" ? "text-mint" : "text-rose"
              }`}
            >
              {fmtSigned(txn.type === "sale" ? txn.amount : -txn.amount)}
            </p>
            {txn.edited && <p className="mt-1 text-[11px] font-semibold text-muted">Modifié {relDay(txn.edited).toLowerCase()}</p>}
          </div>

          {txn.items && txn.items.length > 0 && (
            <div className="mb-3 divide-y divide-line rounded-2xl border border-line bg-panel2">
              {txn.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <Package size={14} className="shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{it.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {it.qty} × {fmtF(it.price)}
                  </span>
                  <span className="w-24 shrink-0 text-right font-bold tabular-nums">{fmtF(it.qty * it.price)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-5 space-y-2.5 rounded-2xl border border-line bg-panel2 p-4 text-sm">
            {!txn.items?.length && (
              <div className="flex justify-between gap-3">
                <span className="text-muted">Détail</span>
                <span className="text-right font-semibold">{txn.note || txn.category}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-muted">Catégorie</span>
              <span className="font-semibold">{txn.category}</span>
            </div>
            {txn.type === "sale" && (
              <div className="flex justify-between gap-3">
                <span className="flex items-center gap-1 text-muted">
                  <User size={12} aria-hidden="true" /> Encaissé par
                </span>
                <span className="font-semibold">{txn.seller ?? profile?.name ?? "Moi"}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-muted">N° mouvement</span>
              <span className="font-mono text-xs font-semibold">{txn.id.toUpperCase()}</span>
            </div>
          </div>

          <Btn variant="mint" className="w-full py-4" disabled={busy} onClick={() => run("image")}>
            <ImageDown size={17} aria-hidden="true" /> Ticket en image (WhatsApp)
          </Btn>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            <Btn variant="soft" className="px-2" disabled={busy} onClick={() => run("pdf")}>
              <FileText size={15} className="text-rose" aria-hidden="true" /> PDF
            </Btn>
            <Btn variant="soft" className="px-2" disabled={busy} onClick={() => run("text")}>
              <MessageCircle size={15} className="text-mint" aria-hidden="true" /> Texte
            </Btn>
            <Btn variant="soft" className="px-2" onClick={() => setMode("edit")}>
              <Pencil size={15} className="text-brand2" aria-hidden="true" /> Modifier
            </Btn>
          </div>

          {!confirmDel ? (
            <Btn variant="ghost" className="mt-2.5 w-full text-rose/90" onClick={() => setConfirmDel(true)}>
              <Trash2 size={15} aria-hidden="true" /> Supprimer ce mouvement
            </Btn>
          ) : (
            <div className="mt-2.5 rounded-2xl border border-rose/25 bg-rose/10 p-3">
              <p className="mb-2.5 text-center text-xs font-semibold text-rose">
                Supprimer définitivement ?{txn.items?.length ? " Les articles retournent en stock." : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Btn variant="soft" onClick={() => setConfirmDel(false)}>
                  Garder
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    deleteTxn(txn.id);
                    notify("Mouvement supprimé");
                    onClose();
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" /> Supprimer
                </Btn>
              </div>
            </div>
          )}
        </>
      )}

      {txn && mode === "edit" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h2 className="mb-4 pr-10 font-display text-xl font-extrabold">Modifier le mouvement</h2>
          <Seg
            id="edit-type"
            options={[
              { id: "sale", label: "Vente" },
              { id: "expense", label: "Dépense" },
            ]}
            value={type}
            onChange={setType}
            accent={type === "sale" ? "mint" : "rose"}
          />

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Montant</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
              inputMode="numeric"
              className={`${inputCls} font-display text-2xl font-extrabold tabular-nums`}
            />
          </label>
          {txn.items?.length ? (
            <p className="mt-1.5 text-[11px] font-semibold text-muted">
              Vente liée au stock : changer le montant ne modifie pas les quantités en stock.
            </p>
          ) : null}

          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-bold text-muted">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Date</span>
              <input type="date" value={date} max={toDate(Date.now())} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-muted">Heure</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </label>
          </div>
          {future && <p className="mt-1.5 text-xs font-semibold text-rose">La date ne peut pas être dans le futur.</p>}

          {type === "expense" && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-bold text-muted">Catégorie</legend>
              <div className="flex flex-wrap gap-2">
                {EXP_CATS.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={cat === c.id}
                    onClick={() => setCat(c.id)}
                    className={`tap btn-press flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                      cat === c.id ? "border-rose/50 bg-rose/15 text-rose" : "border-line bg-panel2 text-muted"
                    }`}
                  >
                    <c.icon size={13} aria-hidden="true" /> {c.id}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {type === "sale" && sellers.length > 0 && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-xs font-bold text-muted">Encaissé par</legend>
              <div className="flex flex-wrap gap-2">
                {[null, ...sellers].map((s) => (
                  <button
                    type="button"
                    key={s ?? "me"}
                    aria-pressed={seller === s}
                    onClick={() => setSeller(s)}
                    className={`tap btn-press min-h-10 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${
                      seller === s ? "border-mint/50 bg-mint/15 text-mint" : "border-line bg-panel2 text-muted"
                    }`}
                  >
                    {s ?? "Moi"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-5 grid grid-cols-[1fr_2fr] gap-2.5">
            <Btn type="button" variant="soft" onClick={() => setMode("view")}>
              Annuler
            </Btn>
            <Btn type="submit" disabled={!valid} className="py-4">
              <Check size={17} aria-hidden="true" /> Enregistrer
            </Btn>
          </div>
        </form>
      )}
    </Sheet>
  );
}

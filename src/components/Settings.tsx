import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Coins,
  Crown,
  Database,
  Download,
  Edit3,
  Eraser,
  FolderOpen,
  Moon,
  SunMedium,
  SmartphoneNfc,
  Info,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  Palette,
  Scale,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { longDate } from "../lib/format";
import { backupToCloud, cloudReady, restoreFromCloud } from "../lib/firebase";
import { currencyByCode } from "../lib/currency";
import { THEMES } from "../lib/themes";
import { buildBackup, daysSinceBackup, readBackup, saveBackup, type BackupFile } from "../lib/backup";
import type { ThemeMode } from "../lib/store";
import { PLAN_LABEL, useStore } from "../lib/store";
import { Avatar, Btn, Sheet, Toast } from "./ui";
import CurrencyPicker from "./CurrencyPicker";
import Legal, { type LegalDoc } from "./Legal";
import InstallApp from "./InstallApp";

export default function Settings({ onPremium, onBack }: { onPremium: () => void; onBack: () => void }) {
  const {
    profile,
    updateProfile,
    importAll,
    resetAll,
    resetData,
    txns,
    debts,
    products,
    sellers,
    addSeller,
    removeSeller,
  } = useStore();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [shop, setShop] = useState(profile?.shop ?? "");
  const [cloudCode, setCloudCode] = useState("");
  const [cloudBusy, setCloudBusy] = useState<"up" | "down" | null>(null);

  const [pinSheet, setPinSheet] = useState<"set" | "off" | null>(null);
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [newSeller, setNewSeller] = useState("");
  const [curOpen, setCurOpen] = useState(false);
  const [draftCur, setDraftCur] = useState(profile?.currency ?? "XOF");
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  };

  const cur = currencyByCode(profile?.currency);

  const saveProfile = () => {
    if (name.trim().length < 2 || shop.trim().length < 2) return;
    updateProfile({ name: name.trim(), shop: shop.trim() });
    setEditOpen(false);
    showToast("Profil mis à jour");
  };

  const exportData = async () => {
    try {
      const r = await saveBackup(buildBackup({ profile, txns, debts, products, sellers }));
      if (r === "cancelled") return;
      updateProfile({ lastBackup: Date.now() });
      showToast(r === "shared" ? "Sauvegarde envoyée" : "Sauvegarde enregistrée sur le téléphone");
    } catch {
      showToast("Sauvegarde impossible sur ce téléphone");
    }
  };

  const pickRestore = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(await readBackup(f));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Fichier illisible");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const since = daysSinceBackup(profile);
  const mode: ThemeMode = profile?.mode ?? "dark";

  const shareApp = async () => {
    const payload = {
      title: "Ivory Caisse",
      text: "La caisse du commerçant africain — ventes, crédits, stock. 100% hors-ligne. Essaye-la !",
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
        showToast("Lien copié — partage-le où tu veux");
      }
    } catch {
      /* partage annulé */
    }
  };

  const doBackup = async () => {
    if (cloudBusy) return;
    setCloudBusy("up");
    try {
      await backupToCloud(cloudCode, { txns, debts, products, sellers, shop: profile?.shop, exportedAt: new Date().toISOString() });
      showToast("Sauvegarde envoyée dans le cloud");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Sauvegarde impossible");
    } finally {
      setCloudBusy(null);
    }
  };

  const doRestore = async () => {
    if (cloudBusy) return;
    setCloudBusy("down");
    try {
      const data = await restoreFromCloud(cloudCode);
      if (data && Array.isArray(data.txns) && Array.isArray(data.debts)) {
        importAll({ txns: data.txns, debts: data.debts, products: data.products, sellers: data.sellers });
        showToast("Données restaurées — bienvenue à nouveau");
      } else {
        showToast("Aucune sauvegarde trouvée pour ce code");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Restauration impossible");
    } finally {
      setCloudBusy(null);
    }
  };

  const savePin = () => {
    if (pinA.length !== 4 || pinA !== pinB) return;
    updateProfile({ pin: pinA });
    setPinSheet(null);
    setPinA("");
    setPinB("");
    showToast("Code PIN activé");
  };

  const disablePin = () => {
    if (pinA !== profile?.pin) {
      showToast("Code incorrect");
      return;
    }
    updateProfile({ pin: null });
    setPinSheet(null);
    setPinA("");
    showToast("Code PIN désactivé");
  };

  const isFree = profile?.plan === "free";
  const codeOk = cloudCode.trim().length >= 4;
  const hasPin = Boolean(profile?.pin);
  const activeTheme = profile?.theme ?? "sunset";

  return (
    <div className="pb-32">
      <Toast message={toast} kind="info" />

      <button
        onClick={onBack}
        className="tap mb-5 flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3.5 py-2 text-xs font-bold text-muted"
      >
        <ArrowLeft size={14} /> Retour à la caisse
      </button>

      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Réglages</h1>
        <p className="text-xs text-muted">Ton compte, tes données, ton style.</p>
      </div>

      {/* Profil */}
      <div className="card mb-4 flex items-center gap-4 p-5">
        <Avatar name={profile?.name ?? "?"} size={54} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold">{profile?.name}</p>
          <p className="truncate text-xs text-muted">{profile?.shop}</p>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
              isFree ? "bg-fg/8 text-muted" : "bg-brand/15 text-brand2"
            }`}
          >
            <Crown size={9} /> {PLAN_LABEL[profile?.plan ?? "free"]}
          </span>
        </div>
        <button
          onClick={() => {
            setName(profile?.name ?? "");
            setShop(profile?.shop ?? "");
            setEditOpen(true);
          }}
          className="tap btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-panel2 text-muted"
        >
          <Edit3 size={16} />
        </button>
      </div>

      {isFree && (
        <button
          onClick={onPremium}
          className="tap btn-press mb-4 flex w-full items-center gap-3 rounded-[1.5rem] border border-brand/40 bg-gradient-to-r from-brand/20 to-transparent p-4 text-left"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-deep text-white">
            <Crown size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Passer Premium</p>
            <p className="text-xs text-muted">À partir de 2 000 F/mois · Mobile money</p>
          </div>
          <ChevronRight size={17} className="text-brand2" />
        </button>
      )}

      {/* Apparence */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Apparence</p>
      <div className="card mb-3 p-4">
        <p className="mb-1 text-sm font-bold">Mode d'affichage</p>
        <p className="mb-3 text-xs text-muted">Le mode clair se lit mieux en plein soleil.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mode d'affichage">
          {(
            [
              ["dark", "Sombre", Moon],
              ["light", "Clair", SunMedium],
              ["auto", "Auto", SmartphoneNfc],
            ] as [ThemeMode, string, typeof Moon][]
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => updateProfile({ mode: id })}
              className={`tap btn-press flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-colors ${
                mode === id ? "border-brand/60 bg-brand/10 text-brand2" : "border-line bg-panel2 text-muted"
              }`}
            >
              <Icon size={17} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card mb-4 p-4">
        <div className="mb-3 flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand2">
            <Palette size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Thème de l'application</p>
            <p className="text-xs text-muted">Choisis la couleur qui te ressemble</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {THEMES.map((t) => {
            const active = activeTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  updateProfile({ theme: t.id });
                  showToast(`Thème « ${t.name} » appliqué`);
                }}
                className={`tap btn-press flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all ${
                  active ? "border-brand/60 bg-brand/10" : "border-line bg-panel2"
                }`}
                title={t.name}
              >
                <span
                  className="h-9 w-9 rounded-xl ring-1 ring-fg/10"
                  style={{ background: t.preview }}
                />
                <span className={`text-[10px] font-bold ${active ? "text-brand2" : "text-muted"}`}>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Devise & région */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Devise & région</p>
      <button
        onClick={() => {
          setDraftCur(profile?.currency ?? "XOF");
          setCurOpen(true);
        }}
        className="tap card mb-4 flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:border-brand/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10 text-mint">
          <Coins size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Devise</p>
          <p className="text-xs text-muted">
            {cur.code} · {cur.label} <span className="font-bold text-cream">{cur.suffix ? "" : cur.symbol}</span>
          </p>
        </div>
        <span className="font-display text-base font-extrabold text-brand2">{cur.symbol}</span>
        <ChevronRight size={16} className="text-muted" />
      </button>

      {/* Sécurité */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Sécurité</p>
      <div className="card mb-4 flex items-center gap-3.5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <KeyRound size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            Code PIN {hasPin && <span className="text-mint">· activé</span>}
          </p>
          <p className="text-xs leading-relaxed text-muted">
            {hasPin ? "L'app se verrouille à chaque ouverture" : "Verrouille l'app — ni vendeuses, ni curieux"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {hasPin ? (
            <>
              <Btn
                variant="soft"
                className="px-3 py-2 text-xs"
                onClick={() => {
                  setPinA("");
                  setPinB("");
                  setPinSheet("set");
                }}
              >
                Modifier
              </Btn>
              <Btn
                variant="danger"
                className="px-3 py-2 text-xs"
                onClick={() => {
                  setPinA("");
                  setPinSheet("off");
                }}
              >
                Coupe
              </Btn>
            </>
          ) : (
            <Btn
              className="px-4 py-2 text-xs"
              onClick={() => {
                setPinA("");
                setPinB("");
                setPinSheet("set");
              }}
            >
              Activer
            </Btn>
          )}
        </div>
      </div>

      {/* Mon équipe */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Mon équipe</p>
      <div className="card mb-4 p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <Users size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Vendeurs & vendeuses</p>
            <p className="text-xs leading-relaxed text-muted">
              Chaque vente est attribuée à la personne qui encaisse.
            </p>
          </div>
        </div>
        {sellers.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {sellers.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 py-1.5 pl-3.5 pr-2 text-xs font-bold text-mint"
              >
                {s}
                <button
                  onClick={() => {
                    removeSeller(s);
                    showToast(`${s} retiré(e) de l'équipe`);
                  }}
                  className="tap flex items-center justify-center rounded-full bg-mint/15 p-1"
                  aria-label={`Retirer ${s}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={newSeller}
            onChange={(e) => setNewSeller(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSeller.trim().length >= 2) {
                addSeller(newSeller);
                setNewSeller("");
                showToast("Membre ajouté à l'équipe");
              }
            }}
            placeholder="Prénom (ex : Grâce)"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-panel2 px-4 py-3 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
          />
          <Btn
            className="shrink-0 px-4 py-3"
            disabled={newSeller.trim().length < 2}
            onClick={() => {
              addSeller(newSeller);
              setNewSeller("");
              showToast("Membre ajouté à l'équipe");
            }}
          >
            <UserPlus size={16} />
          </Btn>
        </div>
      </div>

      {/* Sauvegarde cloud */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Sauvegarde cloud</p>
      <div className="card mb-4 p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300">
            <Database size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Téléphone perdu ? Rien de perdu.</p>
            <p className="text-xs leading-relaxed text-muted">
              Choisis un code secret, sauvegarde, et restaure tout sur un nouveau téléphone.
            </p>
          </div>
        </div>

        {isFree ? (
          <button
            onClick={onPremium}
            className="tap btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-brand/30 bg-brand/10 py-3 text-sm font-bold text-brand2"
          >
            <Lock size={14} /> Réservé au Premium — Débloquer
          </button>
        ) : !cloudReady ? (
          <p className="mt-4 rounded-2xl border border-line bg-panel2 px-4 py-3 text-xs leading-relaxed text-muted">
            Cloud prêt à activer : colle tes clés Firebase dans le fichier <span className="font-bold text-cream">.env</span>, puis relance le build. Guide complet : <span className="font-bold text-cream">DEPLOYMENT.md</span>.
          </p>
        ) : (
          <div className="mt-4">
            <input
              value={cloudCode}
              onChange={(e) => setCloudCode(e.target.value)}
              placeholder="Ton code secret (ex : awa-26)"
              autoCapitalize="none"
              className="w-full rounded-2xl border border-line bg-panel2 px-4 py-3.5 text-sm font-semibold outline-none transition-colors placeholder:text-fg/25 focus:border-brand/50"
            />
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <Btn variant="mint" onClick={doBackup} disabled={!codeOk || cloudBusy !== null} className={!codeOk ? "opacity-40" : ""}>
                {cloudBusy === "up" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Sauvegarder
              </Btn>
              <Btn variant="soft" onClick={doRestore} disabled={!codeOk || cloudBusy !== null} className={!codeOk ? "opacity-40" : ""}>
                {cloudBusy === "down" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Restaurer
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Données */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Données</p>
      <div className="card mb-4 divide-y divide-line overflow-hidden">
        <button onClick={exportData} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10 text-mint">
            <Download size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Sauvegarder dans un fichier</p>
            <p className={`text-xs ${since >= 7 ? "text-amber-300" : "text-muted"}`}>
              {profile?.lastBackup ? `Dernière sauvegarde : ${since === 0 ? "aujourd'hui" : `il y a ${since} jour${since > 1 ? "s" : ""}`}` : "Jamais sauvegardé — envoie-le sur ton WhatsApp"}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <button onClick={() => fileRef.current?.click()} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand2">
            <FolderOpen size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Restaurer une sauvegarde</p>
            <p className="text-xs text-muted">Choisis un fichier .json d'Ivory Caisse</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => pickRestore(e.target.files?.[0])}
        />
        <div className="flex w-full items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <WifiOff size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Mode hors-ligne</p>
            <p className="text-xs text-muted">Actif — tout est stocké sur ce téléphone</p>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_10px_rgba(34,201,141,0.8)]" />
        </div>
        <button
          onClick={() => setWipeOpen(true)}
          className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
            <Eraser size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">{profile?.demo ? "Effacer les données d'exemple" : "Vider toutes les données"}</p>
            <p className="text-xs text-muted">Garde ton profil, vide ventes, crédits, stock et équipe</p>
          </div>
        </button>
        <button onClick={() => setResetOpen(true)} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-rose/5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose/25 bg-rose/10 text-rose">
            <Trash2 size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose">Tout réinitialiser</p>
            <p className="text-xs text-muted">Efface ventes, crédits, stock et profil</p>
          </div>
        </button>
      </div>

      {/* À propos & légal */}
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">À propos & légal</p>
      <div className="mb-3">
        <InstallApp full />
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        <button onClick={shareApp} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand2">
            <Share2 size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Partager Ivory Caisse</p>
            <p className="text-xs text-muted">Recommande l'app à un autre commerçant</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <button onClick={() => setLegal("terms")} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-panel2 text-muted">
            <Scale size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Conditions d'utilisation</p>
            <p className="text-xs text-muted">Règles du service</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <button onClick={() => setLegal("privacy")} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10 text-violet-300">
            <ShieldCheck size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Politique de confidentialité</p>
            <p className="text-xs text-muted">Tes données, protégées</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <button onClick={() => setLegal("contact")} className="tap flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-fg/[0.02]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-mint/25 bg-mint/10 text-mint">
            <MessageCircle size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Contact & support</p>
            <p className="text-xs text-muted">Ivory Gestion te répond</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
        <div className="flex w-full items-center gap-3.5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-panel2 text-muted">
            <Info size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Ivory Caisse</p>
            <p className="text-xs text-muted">Version 2.1.1 · Membre depuis le {profile ? longDate(profile.created) : "—"}</p>
          </div>
        </div>
        {/* Éditeur */}
        <div className="flex w-full items-center gap-3.5 bg-gradient-to-r from-brand/10 to-transparent p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-deep font-display text-xs font-extrabold text-white">
            IG
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold">Ivory Gestion</p>
            <p className="text-xs text-muted">Éditeur · Fondé par Fidèle Folly</p>
          </div>
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand2">
            © 2026
          </span>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] text-muted">
        Ivory Caisse · édité par Ivory Gestion — Tous droits réservés.
      </p>

      {/* Sheet édition */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)}>
        <h2 className="mb-5 font-display text-xl font-extrabold">Modifier le profil</h2>
        <p className="mb-1.5 text-xs font-bold text-muted">Ton nom</p>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mb-4 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-sm font-semibold outline-none focus:border-brand/50" />
        <p className="mb-1.5 text-xs font-bold text-muted">Nom de la boutique</p>
        <input value={shop} onChange={(e) => setShop(e.target.value)} className="mb-6 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-sm font-semibold outline-none focus:border-brand/50" />
        <Btn onClick={saveProfile} className="w-full py-4">
          <Check size={17} /> Enregistrer
        </Btn>
      </Sheet>

      {/* Sheet devise */}
      <Sheet open={curOpen} onClose={() => setCurOpen(false)}>
        <h2 className="mb-1 font-display text-xl font-extrabold">Choisis ta devise</h2>
        <p className="mb-5 text-xs text-muted">Toute l'application s'adapte instantanément.</p>
        <div className="max-h-[52dvh] overflow-y-auto no-scrollbar pb-2">
          <CurrencyPicker
            value={draftCur}
            onChange={setDraftCur}
          />
        </div>
        <Btn
          className="mt-4 w-full py-4"
          onClick={() => {
            updateProfile({ currency: draftCur });
            setCurOpen(false);
            showToast("Devise mise à jour");
          }}
        >
          <Check size={17} /> Appliquer {currencyByCode(draftCur).code}
        </Btn>
      </Sheet>

      {/* Sheet PIN */}
      <Sheet open={pinSheet !== null} onClose={() => setPinSheet(null)}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <KeyRound size={24} />
        </div>
        {pinSheet === "set" ? (
          <>
            <h2 className="text-center font-display text-xl font-extrabold">{hasPin ? "Modifier le code PIN" : "Activer le code PIN"}</h2>
            <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted">4 chiffres, faciles à retenir pour toi, impossibles à deviner pour les autres.</p>
            <input
              value={pinA}
              onChange={(e) => setPinA(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Code à 4 chiffres"
              className="mt-6 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none transition-colors placeholder:text-base placeholder:tracking-normal placeholder:text-fg/25 focus:border-brand/50"
            />
            <input
              value={pinB}
              onChange={(e) => setPinB(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Confirme le code"
              className="mt-3 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none transition-colors placeholder:text-base placeholder:tracking-normal placeholder:text-fg/25 focus:border-brand/50"
            />
            {pinA.length === 4 && pinB.length === 4 && pinA !== pinB && (
              <p className="mt-2 text-center text-xs font-bold text-rose">Les deux codes sont différents</p>
            )}
            <Btn onClick={savePin} disabled={pinA.length !== 4 || pinA !== pinB} className={`mt-5 w-full py-4 ${pinA.length !== 4 || pinA !== pinB ? "opacity-40" : ""}`}>
              <Check size={17} /> Valider le code
            </Btn>
          </>
        ) : (
          <>
            <h2 className="text-center font-display text-xl font-extrabold">Désactiver le code PIN</h2>
            <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted">Entre ton code actuel pour confirmer.</p>
            <input
              value={pinA}
              onChange={(e) => setPinA(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="Code actuel"
              className="mt-6 w-full rounded-2xl border border-line bg-panel2 px-4 py-4 text-center font-display text-2xl font-extrabold tracking-[0.5em] outline-none transition-colors placeholder:text-base placeholder:tracking-normal placeholder:text-fg/25 focus:border-brand/50"
            />
            <Btn variant="danger" onClick={disablePin} disabled={pinA.length !== 4} className={`mt-5 w-full py-4 ${pinA.length !== 4 ? "opacity-40" : ""}`}>
              <Lock size={15} /> Désactiver
            </Btn>
          </>
        )}
      </Sheet>

      {/* Sheet reset */}
      <Sheet open={resetOpen} onClose={() => setResetOpen(false)}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-rose/25 bg-rose/10 text-rose">
          <Trash2 size={24} />
        </div>
        <h2 className="text-center font-display text-xl font-extrabold">Tout effacer ?</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted">
          Toutes tes ventes, dépenses, crédits, ton stock et ton profil seront supprimés définitivement de ce téléphone.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2.5">
          <Btn variant="soft" onClick={() => setResetOpen(false)}>
            Annuler
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              resetAll();
              setResetOpen(false);
            }}
          >
            <Trash2 size={15} /> Effacer
          </Btn>
        </div>
      </Sheet>

      {/* Sheet vider les données */}
      <Sheet open={wipeOpen} onClose={() => setWipeOpen(false)}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
          <Eraser size={24} />
        </div>
        <h2 className="text-center font-display text-xl font-extrabold">Repartir à zéro ?</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted">
          {txns.length} mouvement{txns.length > 1 ? "s" : ""}, {debts.length} fiche{debts.length > 1 ? "s" : ""} crédit et {products.length} produit
          {products.length > 1 ? "s" : ""} seront effacés. Ton profil et tes réglages restent.
          {!profile?.demo && " Fais une sauvegarde avant si ces données sont réelles."}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-2.5">
          <Btn variant="soft" onClick={() => setWipeOpen(false)}>
            Annuler
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              resetData();
              setWipeOpen(false);
              showToast("Données effacées — à toi de jouer !");
            }}
          >
            <Eraser size={15} /> Effacer
          </Btn>
        </div>
      </Sheet>

      {/* Sheet restauration */}
      <Sheet open={pending !== null} onClose={() => setPending(null)}>
        {pending && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl border border-brand/25 bg-brand/10 text-brand2">
              <FolderOpen size={24} />
            </div>
            <h2 className="text-center font-display text-xl font-extrabold">Restaurer cette sauvegarde ?</h2>
            <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted">
              {pending.profile?.shop ? `${pending.profile.shop} · ` : ""}
              {pending.exportedAt ? `du ${longDate(new Date(pending.exportedAt).getTime())}` : "date inconnue"}
            </p>
            <div className="my-5 grid grid-cols-3 gap-2 text-center">
              {[
                [pending.txns.length, "mouvements"],
                [pending.debts.length, "fiches crédit"],
                [pending.products.length, "produits"],
              ].map(([n, l]) => (
                <div key={String(l)} className="rounded-2xl border border-line bg-panel2 p-3">
                  <p className="font-display text-xl font-extrabold tabular-nums">{n}</p>
                  <p className="text-[11px] font-semibold text-muted">{l}</p>
                </div>
              ))}
            </div>
            <p className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-center text-xs font-semibold text-amber-300">
              Les données actuelles de ce téléphone seront remplacées.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <Btn variant="soft" onClick={() => setPending(null)}>
                Annuler
              </Btn>
              <Btn
                onClick={() => {
                  importAll({ txns: pending.txns, debts: pending.debts, products: pending.products, sellers: pending.sellers });
                  updateProfile({ demo: false, lastBackup: Date.now() });
                  setPending(null);
                  showToast("Sauvegarde restaurée");
                }}
              >
                <Check size={15} /> Restaurer
              </Btn>
            </div>
          </>
        )}
      </Sheet>

      {/* Overlay légal */}
      {legal && <Legal doc={legal} onClose={() => setLegal(null)} />}
    </div>
  );
}

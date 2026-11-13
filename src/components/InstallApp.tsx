import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Check, Copy, Download, MoreVertical, Share2, Smartphone } from "lucide-react";
import { Btn, Sheet } from "./ui";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export default function InstallApp({ full = false }: { full?: boolean }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [copied, setCopied] = useState(false);

  const native = Capacitor.isNativePlatform();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const android = /android/i.test(navigator.userAgent);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const done = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (native || installed) return null;

  const beginInstall = async () => {
    if (!prompt) {
      setOpen(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Le navigateur peut refuser le presse-papiers hors HTTPS. */
    }
  };

  return (
    <>
      <button
        onClick={beginInstall}
        className={`tap btn-press items-center justify-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3.5 text-sm font-bold text-cream ${
          full ? "flex w-full" : "flex"
        }`}
      >
        <Download size={16} className="text-brand2" /> Installer sur téléphone
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-action to-action2 text-white shadow-[0_16px_40px_-12px_rgba(255,122,26,0.75)]">
          <Smartphone size={27} />
        </div>
        <h2 className="text-center font-display text-2xl font-extrabold">Installer Ivory Caisse</h2>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-muted">
          L'application s'ouvre en plein écran, fonctionne hors-ligne et apparaît avec les autres applications.
        </p>

        <div className="mt-6 space-y-2.5">
          {ios ? (
            <>
              <Step n="1" icon={<Share2 size={16} />} text="Ouvre cette page dans Safari puis touche Partager." />
              <Step n="2" icon={<Download size={16} />} text="Choisis « Sur l'écran d'accueil »." />
              <Step n="3" icon={<Check size={16} />} text="Active « Ouvrir comme app », puis touche Ajouter." />
            </>
          ) : android ? (
            <>
              <Step n="1" icon={<MoreVertical size={16} />} text="Dans Chrome, touche le menu en haut à droite." />
              <Step n="2" icon={<Download size={16} />} text="Choisis « Ajouter à l'écran d'accueil », puis Installer." />
              <Step n="3" icon={<Check size={16} />} text="L'icône Ivory Caisse apparaît sur ton téléphone." />
            </>
          ) : (
            <>
              <Step n="1" icon={<Smartphone size={16} />} text="Ouvre ce même lien dans Chrome sur Android ou Safari sur iPhone." />
              <Step n="2" icon={<Download size={16} />} text="Utilise le menu du navigateur pour l'ajouter à l'écran d'accueil." />
            </>
          )}
        </div>

        <Btn variant="soft" onClick={copyLink} className="mt-5 w-full">
          {copied ? <Check size={16} className="text-mint" /> : <Copy size={16} />}
          {copied ? "Lien copié" : "Copier le lien d'installation"}
        </Btn>
      </Sheet>
    </>
  );
}

function Step({ n, icon, text }: { n: string; icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel2 p-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-display text-xs font-extrabold text-brand2">
        {n}
      </span>
      <span className="text-brand2">{icon}</span>
      <p className="text-xs font-semibold leading-relaxed text-cream/90">{text}</p>
    </div>
  );
}
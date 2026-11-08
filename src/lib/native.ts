import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export const NATIVE_SECURE_RESUME = "ivory:native-secure-resume";

/** Configure le conteneur Android/iOS sans modifier le comportement PWA. */
export async function setupNativeRuntime(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* Certaines versions WebView gèrent directement la barre système. */
  }

  let backgroundAt = 0;
  await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      backgroundAt = Date.now();
      return;
    }

    // Après 30 secondes en arrière-plan, le code PIN est redemandé.
    if (backgroundAt > 0 && Date.now() - backgroundAt > 30_000) {
      window.dispatchEvent(new Event(NATIVE_SECURE_RESUME));
    }
    backgroundAt = 0;
  });

  // Le premier rendu React est visible : le splash natif peut disparaître.
  window.requestAnimationFrame(() => {
    void SplashScreen.hide({ fadeOutDuration: 260 });
  });
}
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./index.css";
import App from "./App";
import { setupNativeRuntime } from "./lib/native";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

void setupNativeRuntime();

// Mode hors-ligne complet (PWA) — uniquement en production
if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* hors-ligne indisponible, l'app reste fonctionnelle */
    });
  });
}

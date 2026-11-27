import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ivorygestion.ivorycaisse",
  appName: "Ivory Caisse",
  // Le SPA est servi sous /app/ sur le web ; l'APK embarque uniquement l'app (pas la landing).
  webDir: "dist/app",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 260,
      backgroundColor: "#f6f7fa",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#f6f7fa",
    },
  },
};

export default config;
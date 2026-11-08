import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ivorygestion.ivorycaisse",
  appName: "Ivory Caisse",
  webDir: "dist",
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
      backgroundColor: "#0A0A0E",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A0A0E",
    },
  },
};

export default config;
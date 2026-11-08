/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_CINETPAY_APIKEY?: string;
  readonly VITE_CINETPAY_SITE_ID?: string;
  readonly VITE_CINETPAY_VERIFY_URL?: string;
  readonly VITE_STORE_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

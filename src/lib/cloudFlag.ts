/* Sauvegarde cloud disponible seulement si les clés Firebase sont fournies au build.
   Module léger : à importer partout où l'on parle du cloud (offres, FAQ, réglages). */
export const cloudReady = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID,
);

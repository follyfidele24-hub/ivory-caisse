/* Ivory Caisse — service worker v3.1 « Thanos » (landing + app)
   Objectifs :
   1. Démarrer vite, même sur réseau 2G/3G.
   2. Ne précharger QUE le nécessaire : jamais l'APK, jamais xlsx / jspdf / html2canvas.
   3. Ne jamais bloquer une mise à jour.
   4. Deux replis hors-ligne distincts : / → landing, /app/ → caisse.

   ⚠️ Marqueurs lus par le plugin "ivory-precache" de vite.config.ts au build :
   la ligne CACHE reçoit une version unique, la ligne APP_SHELL la liste réelle des fichiers.
   Ne renomme pas ces deux constantes. */
const CACHE = "ivory-v3-dev";
const APP_SHELL = ["/", "/index.html", "/app/", "/app/index.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
const RUNTIME = CACHE + "-runtime";

/* Jamais de cache : paiement, licence, mesure, APK, compteur admin. */
function isNeverCached(path) {
  return (
    path.startsWith("/api/") ||
    path.endsWith(".apk") ||
    path === "/apk" ||
    path === "/android" ||
    path === "/telecharger" ||
    path === "/compteur" ||
    path.startsWith("/stats")
  );
}

/* Librairies lourdes : chargées à la demande UNIQUEMENT, puis gardées. */
function isHeavyExport(path) {
  return /(xlsx|jspdf|html2canvas|purify)/i.test(path);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // addAll échoue en bloc : on tolère un fichier absent, le reste est quand même mis en cache.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (e) {
            /* fichier absent : on continue */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Supprime aussi les anciens caches "ivory-caisse-*" de la v12.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // WhatsApp, paiement externe… : on ne touche pas
  if (isNeverCached(url.pathname)) return; // toujours le réseau

  // Navigation : réseau d'abord (mises à jour), cache en secours.
  // Chaque page est rangée sous sa propre URL ; le repli dépend de la zone (/app/ ou landing).
  if (req.mode === "navigate") {
    const inApp = url.pathname === "/app" || url.pathname.startsWith("/app/");
    const shell = inApp ? "/app/index.html" : "/index.html";
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh.ok && !fresh.redirected) cache.put(url.pathname, fresh.clone());
          return fresh;
        } catch (e) {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match(shell)) ||
            (await cache.match(inApp ? "/app/" : "/")) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Export lourd : jamais préchargé. Mis en cache à la première utilisation.
  if (isHeavyExport(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Statique : cache d'abord + revalidation silencieuse (stale-while-revalidate).
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (hit) {
        event.waitUntil(network);
        return hit;
      }
      return (await network) || new Response("", { status: 504 });
    })()
  );
});

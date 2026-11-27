import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fichiers JAMAIS préchargés par le service worker (chemins relatifs à dist/).
 * Bug corrigé : l'ancien filtre laissait passer ivory-caisse.apk (4,6 Mo à la 1re visite)
 * et les exports lourds (xlsx, jspdf, html2canvas, purify).
 */
const NEVER_PRECACHE: RegExp[] = [
  /\.apk$/i, // APK : téléchargé seulement à la demande via /android
  /(^|\/)(xlsx|jspdf|html2canvas|purify)[^/]*\.js$/i, // exports lourds : à la demande (runtime)
  /\/firebase-/, // sauvegarde cloud = réseau obligatoire
  /^(sw\.js|_headers|_redirects|404\.html|og\.png|robots\.txt|sitemap\.xml)$/, // fichiers serveur / partage
  /^(stats|install|privacy|terms|support)\.html$/, // pages secondaires : mises en cache à la visite
  /^(payments|screens)\//, // doublons racine : l'app utilise app/payments et app/screens
  /\.map$/,
  /\.woff$/,
  /^(?!.*latin).*\.woff2$/, // polices : uniquement les sous-ensembles latins (comme avant)
];

/**
 * Après le build : écrit dans dist/sw.js la liste des fichiers à mettre en cache
 * (JS, CSS, polices latines, icônes) + une version unique, pour que l'app
 * fonctionne hors-ligne dès la première visite, écrans chargés à la demande inclus.
 */
function precacheManifest(): Plugin {
  return {
    name: "ivory-precache",
    apply: "build",
    closeBundle() {
      const dist = path.resolve(__dirname, "dist");
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir)) {
          const full = path.join(dir, f);
          if (fs.statSync(full).isDirectory()) walk(full);
          else files.push(path.relative(dist, full).split(path.sep).join("/"));
        }
      };
      walk(dist);
      const keep = files.filter((f) => !NEVER_PRECACHE.some((rule) => rule.test(f)));
      const shell = ["/", "/app/", ...keep.map((f) => `/${f}`)];
      const swPath = path.join(dist, "sw.js");
      const src = fs.readFileSync(swPath, "utf8");
      const sw = src
        .replace(/const CACHE = "[^"]*";/, `const CACHE = "ivory-v3-${Date.now().toString(36)}";`)
        .replace(/const APP_SHELL = \[[^\]]*\];/, `const APP_SHELL = ${JSON.stringify(shell)};`);
      // Garde-fou : si les marqueurs ont disparu de public/sw.js, le build échoue au lieu de livrer un SW vide.
      if (sw === src || !sw.includes('const CACHE = "ivory-v3-')) {
        throw new Error("ivory-precache : marqueurs CACHE / APP_SHELL introuvables dans dist/sw.js");
      }
      const leaked = shell.filter((f) => /\.apk$|xlsx|jspdf|html2canvas|purify/i.test(f));
      if (leaked.length) throw new Error(`ivory-precache : fichiers interdits dans le precache : ${leaked.join(", ")}`);
      fs.writeFileSync(swPath, sw);
    },
  };
}

/**
 * Le SPA vit sous /app/ (la racine / est la landing statique de public/index.html).
 * L'app référence en relatif ./payments/, ./screens/ et ./icons/ : on les recopie
 * dans dist/app/ pour que /app/ (web) et l'APK (webDir dist/app) les trouvent.
 */
const APP_PUBLIC_DIRS = ["icons", "payments", "screens"];
function appPublicCopy(): Plugin {
  return {
    name: "ivory-app-public",
    apply: "build",
    // order "pre" : la copie doit exister avant que precacheManifest() liste dist/
    closeBundle: {
      order: "pre",
      handler() {
        const dist = path.resolve(__dirname, "dist");
        for (const dir of APP_PUBLIC_DIRS) {
          fs.cpSync(path.join(dist, dir), path.join(dist, "app", dir), { recursive: true });
        }
        // Vite écrit "../app/assets/…" dans dist/app/index.html : juste sur le web,
        // faux dans l'APK (racine = dist/app). "./assets/…" marche dans les deux cas.
        const html = path.join(dist, "app", "index.html");
        fs.writeFileSync(html, fs.readFileSync(html, "utf8").replaceAll('"../app/assets/', '"./assets/'));
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), appPublicCopy(), precacheManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Bundles de l'app rangés sous dist/app/assets, séparés des fichiers de la landing (dist/assets)
    assetsDir: "app/assets",
    rollupOptions: {
      input: path.resolve(__dirname, "app/index.html"),
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          firebase: ["firebase/app", "firebase/firestore"],
        },
      },
    },
  },
});

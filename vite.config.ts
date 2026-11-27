import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const keep = files.filter(
        (f) =>
          f !== "sw.js" &&
          f !== "_headers" &&
          f !== "og.png" &&
          f !== "404.html" &&
          f !== "_redirects" &&
          // Firebase : sauvegarde cloud = réseau obligatoire, inutile de le pré-télécharger
          !/\/firebase-/.test(f) &&
          !f.endsWith(".map") &&
          // polices : uniquement les sous-ensembles latins (les autres restent à la demande)
          (!f.endsWith(".woff2") || /latin/.test(f)) &&
          !f.endsWith(".woff")
      );
      const shell = ["./", ...keep.map((f) => `./${f}`)];
      const swPath = path.join(dist, "sw.js");
      const sw = fs
        .readFileSync(swPath, "utf8")
        .replace(/const CACHE = "[^"]*";/, `const CACHE = "ivory-caisse-${Date.now().toString(36)}";`)
        .replace(/const APP_SHELL = \[[^\]]*\];/, `const APP_SHELL = ${JSON.stringify(shell)};`);
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

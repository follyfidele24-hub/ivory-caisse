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

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), precacheManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
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

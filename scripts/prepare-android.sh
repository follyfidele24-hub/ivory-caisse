#!/usr/bin/env bash
set -euo pipefail

echo "Ivory Caisse - préparation Android"
npm install
npm run build

if [ ! -d "android" ]; then
  npx cap add android
fi

node scripts/prepare-assets.mjs
npx capacitor-assets generate --android
npx cap sync android
npx cap open android

echo "Android Studio est ouvert. Choisir Build > Build APK(s)."
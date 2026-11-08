#!/usr/bin/env bash
set -euo pipefail

echo "Ivory Caisse - préparation iOS (Mac uniquement)"
npm install
npm run build

if [ ! -d "ios" ]; then
  npx cap add ios
fi

node scripts/prepare-assets.mjs
npx capacitor-assets generate --ios
npx cap sync ios
npx cap open ios

echo "Xcode est ouvert. Choisir Product > Archive pour préparer App Store Connect."
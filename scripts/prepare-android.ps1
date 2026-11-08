$ErrorActionPreference = "Stop"

Write-Host "Ivory Caisse - preparation Android" -ForegroundColor Yellow
npm install
npm run build

if (-not (Test-Path "android")) {
  npx cap add android
}

node scripts/prepare-assets.mjs
npx capacitor-assets generate --android
npx cap sync android
npx cap open android

Write-Host "Android Studio est ouvert. Choisis Build > Build APK(s)." -ForegroundColor Green
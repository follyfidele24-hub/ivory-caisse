# Ivory Caisse — APK Android, iPhone et stores

Ce projet est configuré avec Capacitor 7 :

- identifiant définitif : `com.ivorygestion.ivorycaisse`
- nom natif : `Ivory Caisse`
- dossier web : `dist/`
- Android minimum : Android 6 (API 23)
- iPhone minimum : iOS 14

> Important : ne change pas l’identifiant après la première publication sur un store.

## Option 1 — APK Android sans logiciel (recommandée pour commencer)

Le fichier `.github/workflows/android-apk.yml` construit l’APK dans GitHub.

1. Mets le projet complet dans un dépôt GitHub.
2. Dans le dépôt, ouvre **Actions**.
3. Choisis **Construire l’APK Android**.
4. Clique **Run workflow**, puis encore **Run workflow**.
5. Attends la coche verte (environ 5 à 10 minutes).
6. Va dans **Releases** à droite du dépôt.
7. Ouvre la dernière version **Ivory Caisse Android — bêta** et télécharge
   `ivory-caisse-beta.apk`. Tu peux aussi récupérer l’artifact de l’Action.

Cet APK sert aux tests terrain. Sur Android, le téléphone demandera d’autoriser
l’installation depuis Chrome, Fichiers ou WhatsApp. Cette distribution est gratuite
et ne nécessite pas Google Play.

## Option 2 — APK avec Android Studio

Pré-requis : Node 20+, Android Studio 2024.2.1+ et Android SDK.

### Windows

Dans PowerShell à la racine du projet :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-android.ps1
```

### macOS / Linux

```bash
chmod +x scripts/prepare-android.sh
./scripts/prepare-android.sh
```

Dans Android Studio :

- APK test : **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- APK signé : **Build > Generate Signed Bundle / APK > APK**
- Google Play : **Build > Generate Signed Bundle / APK > Android App Bundle**

Le fichier test se trouve normalement dans :
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Mettre à jour l’APK après une modification

```bash
npm run build
npx cap sync android
npx cap open android
```

Il ne faut pas refaire `npx cap add android` si le dossier `android/` existe déjà.

## Google Play

1. Crée le compte Ivory Gestion dans Google Play Console (environ 25 USD, une fois).
2. Utilise un compte **organisation** si Ivory Gestion peut fournir les justificatifs.
3. Génère un fichier `.aab` signé dans Android Studio.
4. Fournis les URLs publiques :
   - `https://TON-DOMAINE/privacy.html`
   - `https://TON-DOMAINE/support.html`
   - `https://TON-DOMAINE/terms.html`
5. Remplis la fiche depuis `STORE_LISTING.md`.

Pour un nouveau compte personnel Google créé après le 13 novembre 2023, Google
demande généralement un test fermé avec au moins 12 testeurs inscrits pendant
14 jours consécutifs avant l’accès à la production.

### Paiement Google Play

Premium est un service numérique utilisé dans l’application. Une application
distribuée par Google Play doit utiliser Google Play Billing, sauf programme ou
exception applicable. Pour produire un build de test conforme sans CinetPay :

```bash
VITE_STORE_BUILD=true npm run build
npx cap sync android
```

Sous Windows PowerShell :

```powershell
$env:VITE_STORE_BUILD="true"
npm run build
npx cap sync android
```

Ce mode masque le paiement externe. Avant de vendre Premium sur Google Play, il
faudra intégrer Play Billing et une validation serveur des abonnements.

## iPhone et App Store

Une vraie application iOS nécessite macOS et Xcode. Depuis un Mac :

```bash
chmod +x scripts/prepare-ios.sh
./scripts/prepare-ios.sh
```

Dans Xcode :

1. Sélectionne l’équipe Apple Developer d’Ivory Gestion.
2. Vérifie le Bundle Identifier `com.ivorygestion.ivorycaisse`.
3. Teste sur un iPhone réel.
4. Choisis **Product > Archive**, puis **Distribute App**.

Apple Developer coûte normalement environ 99 USD par an. Apple exige également
In-App Purchase pour débloquer Premium dans l’application. Le build App Store doit
utiliser `VITE_STORE_BUILD=true` jusqu’à l’intégration des achats Apple.

## iPhone sans App Store — gratuit immédiatement

1. Déploie le dossier `dist/` sur Netlify.
2. Ouvre l’URL dans Safari sur l’iPhone.
3. Touche **Partager**.
4. Choisis **Sur l’écran d’accueil**.
5. Active **Ouvrir comme app**, puis **Ajouter**.

La PWA fonctionne en plein écran et hors-ligne. C’est la seule distribution iPhone
publique, gratuite et simple sans compte Apple Developer.

## Icône et splash

Les sources sont dans `assets/icon-only.png` et `assets/splash.png`. Pour les
régénérer après avoir créé les projets natifs :

```bash
node scripts/prepare-assets.mjs
npx capacitor-assets generate
```

## Avant la publication

- Remplacer l’email ou le numéro provisoire par les vraies coordonnées Ivory Gestion.
- Tester ventes, dépenses, stock, PDF, Excel et restauration sur un vrai téléphone.
- Tester le mode avion.
- Faire tester l’APK par au moins 12 commerçants.
- Faire relire les textes légaux par un professionnel du droit avant lancement commercial.
- Ne jamais publier de clés secrètes Firebase, CinetPay ou de signature Android dans GitHub.
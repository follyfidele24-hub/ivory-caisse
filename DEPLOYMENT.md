# Ivory Caisse — Guide de mise en ligne

Application 100 % hors-ligne pour commerçants ivoiriens. Aucune clé n'est
obligatoire : sans configuration, l'app fonctionne en mode local + démo.

---

## 1. Construire l'application

```bash
npm install
npm run build
```

Le résultat est dans le dossier **`dist/`** (index.html + dossier `assets/` découpé pour un démarrage rapide
+ le manifest PWA + le service worker + l'icône).

---

## 2. Mettre en ligne gratuitement (2 minutes)

**Méthode recommandée : Netlify Drop**

1. Va sur https://app.netlify.com/drop
2. Glisse-dépose le dossier **`dist/`** entier
3. Tu obtiens une URL du type `https://ivory-caisse.netlify.app`

C'est en ligne, en HTTPS, partout en Côte d'Ivoire et dans le monde.

**Nom de domaine pro (optionnel)** : achète `ivorycaisse.ci` (~15 000 F/an
sur nic.ci) ou `.com` (~10 €/an) et connecte-le dans Netlify → *Domain settings*.

---

## 3. Installer sur le téléphone (PWA)

Une fois l'URL en ligne :

- **Android (Chrome)** : ouvre l'URL → menu ⋮ → **"Installer l'application"**
  ou **"Ajouter à l'écran d'accueil"** → l'icône Ivory Caisse apparaît
  comme une vraie app, plein écran, sans barre d'adresse.
- **iPhone (Safari)** : bouton **Partager** → **"Sur l'écran d'accueil"**.

Le service worker met l'app en cache : elle s'ouvre ensuite même sans réseau.

---

## 3 bis. Licences Premium via Chariow (mode actuel)

1. Chariow → Paramètres → Développeur → Clés API → **Créer une clé API** (droits licences : lecture + écriture).
2. Netlify → Project configuration → Environment variables → `CHARIOW_API_KEY` = la clé (secret).
3. Deploys → Trigger deploy. Vérifie `https://ivory-caisse.netlify.app/api/license/status` → `{"enabled":true}`.

Produits reliés (netlify/lib/licenseCore.ts) : prd_ewwwyub0 (Mensuel), prd_h95p8e2k (Annuel), prd_8e5bj3vn (À vie).

## 4. Activer les paiements réels (CinetPay)

CinetPay encaisse Wave, Orange Money, MTN MoMo, Moov Money et carte bancaire.
Le paiement passe par une **fonction Netlify** (`netlify/functions/pay.mts`) :
la clé API reste sur le serveur, jamais dans l'app.

1. Crée un compte marchand sur https://www.cinetpay.com et fais valider ton dossier (KYC).
2. Espace marchand → **Intégration / API** : récupère la **clé API** et le **Site ID**.
3. Netlify → ton projet → **Project configuration → Environment variables** → ajoute :
   - `CINETPAY_APIKEY` = ta clé API (coche « Contains secret values »)
   - `CINETPAY_SITE_ID` = ton Site ID
4. Netlify → **Deploys → Trigger deploy → Deploy project** (pour prendre les variables en compte).
5. Vérifie : `https://ivory-caisse.netlify.app/api/pay/status` doit répondre `{"enabled":true}`.

Fonctionnement :
- `/api/pay/init` crée la transaction (prix fixé côté serveur) et renvoie le lien du guichet CinetPay ;
- `/api/pay/return` ramène le client dans l'app après paiement ;
- `/api/pay/notify` reçoit la notification CinetPay et **re-vérifie** le statut auprès de l'API ;
- `/api/pay/verify` ne valide que si CinetPay répond `ACCEPTED` avec le bon montant en XOF,
  et seulement pour le téléphone qui a lancé le paiement.

Les transactions sont stockées dans Netlify Blobs (magasin `ivory-payments`).
Sans les deux variables, le paiement reste fermé et aucun Premium n'est débloqué.

---

## 5. Sauvegarde cloud Firebase

La version actuelle contient le connecteur technique, mais une mise en production
doit d'abord ajouter Firebase Authentication (téléphone) ou un backend qui vérifie
le propriétaire de chaque sauvegarde. N'utilise jamais des règles Firestore
publiques. Garde ces règles fermées tant que l'authentification n'est pas branchée :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

Après intégration de l'authentification, les règles devront limiter chaque document
à son propriétaire (`request.auth.uid`). Les clés publiques de configuration Web
pourront ensuite être placées dans `.env` :

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=ivory-caisse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ivory-caisse
VITE_FIREBASE_APP_ID=...
```

Ne commercialise pas la restauration par simple code avant cette sécurisation.

---

## 6. Publier sur Google Play (~25 $ une seule fois)

1. Mets l'app en ligne (étape 2) et ouvre https://www.pwabuilder.com
2. Entre ton URL → PWABuilder génère un package **Android (.aab)**
3. Crée un compte développeur sur https://play.google.com/console
   (25 $, paiement unique)
4. Crée l'application, téléverse le `.aab`, remplis la fiche
   (captures d'écran, description FR, catégorie *Finance*)
5. Politique de confidentialité requise : tu peux héberger une page simple
   sur ton site Netlify

Délai de validation : généralement 2 à 5 jours.

## 7. Publier sur l'App Store iOS (99 $/an + Mac requis)

1. `npx cap add ios` avec Capacitor (ou PWABuilder → package iOS)
2. Ouvre le projet dans **Xcode** sur Mac, configure la signature
3. Compte Apple Developer (99 $/an) → App Store Connect → soumission

À faire en phase 2 : la majorité des commerçants ciblés sont sur Android.

---

## 8. Check-list de lancement

- [ ] `npm run build` passe sans erreur
- [ ] Dossier `dist/` déployé sur Netlify
- [ ] Installation PWA testée sur un vrai téléphone Android
- [ ] Ouverture hors-ligne vérifiée (mode avion)
- [ ] Clés CinetPay en place et paiement test de 100 F effectué
- [ ] Firebase configuré + sauvegarde/restauration testée avec un code
- [ ] Compte WhatsApp Business "Ivory Caisse" créé pour le support

Bon lancement !

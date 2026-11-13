# Ivory Caisse — Journal des changements

## 2.6.0 — des offres qui rapportent

### Premium (mensuel)
- **À relancer aujourd'hui** (Crédits) : les clients qui doivent encore et dont la fiche dort depuis 7 jours,
  triés par montant, relance WhatsApp pré-remplie en un geste ; un client relancé sort de la liste 3 jours.
  En gratuit : aperçu du montant qui dort, noms cachés.
- **Ce qui rapporte vraiment** (Rapports) : marge par article sur la période et top 5. Le prix d'achat est
  désormais enregistré au moment de la vente pour une marge exacte.
- **Reçu à ton nom** (Réglages → Mon reçu) : ville, téléphone, message de remerciement, sans la mention
  Ivory Caisse, sur les reçus PDF, image et WhatsApp. Le reçu gratuit n'affiche plus « Abidjan » par défaut.
- **Équipe illimitée** ; le gratuit passe à 1 vendeuse (les équipes existantes sont conservées).

### Annuel et À vie
- **Dossier pour un prêt** : PDF 12 mois (synthèse, ventes par mois, détail mensuel, crédits clients,
  dettes, valeur du stock) avec mention « chiffres non audités ».
- Annuel : prise en main de 30 min par WhatsApp (service assuré par Ivory Gestion).

## 2.5.1 — corrections du check-up

### Promesses tenues
- « Sauvegarde cloud » retirée des offres, de la FAQ, des réglages et des mentions légales tant que Firebase
  n'est pas branché (elle réapparaît seule quand les clés VITE_FIREBASE_* sont fournies). Le message technique
  « colle tes clés Firebase dans .env » n'est plus jamais montré aux clients.
- « Rappels SMS clients » retiré : la fonction n'existait pas.
- Les avantages Premium correspondent maintenant à de vrais verrous : historique complet (gratuit : 30 jours),
  rapports du mois (gratuit : jour et semaine), clients crédit illimités (gratuit : 5), export PDF et Excel.
- FAQ vol de téléphone : renvoie vers la sauvegarde fichier, qui existe pour tous.
- Mentions légales : paiements traités par Chariow (et plus CinetPay), licences sans renouvellement automatique.

### Lisibilité
- Boutons pleins : orange foncé calculé pour chaque thème (contraste ≥ 4,6:1 avec le texte blanc, contre 2,6:1).
- Vert et rouge du mode clair foncés ; montant « 0 F » lisible ; descriptions texte des graphiques.
- Audit d'accessibilité automatique (axe, WCAG AA) : 0 erreur sur l'accueil, la caisse, le stock, les crédits,
  les rapports et la saisie.

### Sécurité
- Mise à jour des bibliothèques : DOMPurify (via l'export PDF) et Capacitor, failles critiques corrigées.
- Le site ne peut plus être affiché dans le cadre d'un autre site (X-Frame-Options, frame-ancestors).
- Page 404 aux couleurs de l'app.

## 2.5.0

- Mode clair par défaut partout (app, page d'accueil, pages statiques, barre du navigateur, écran de lancement).
  Le sombre reste disponible dans Réglages ; ceux qui l'avaient choisi le gardent.
- Nouveau fond « papier de cahier » #f6f7fa et texte encre bleu nuit #141a33 (fini le crème).
- Nouveau logo « le cahier » : le « i » d'Ivory dont le point est une pièce, avec les lignes du cahier.
  Icônes de l'app, favicon et image de partage refaits.

## 2.4.1

### Landing revue selon les principes des galeries designeer.xyz (voir DESIGN.md)
- Fonctions présentées comme les lignes d'un cahier de caisse, au lieu d'une grille de cartes à icônes.
- Retirés : badge en pilule, sur-titres en capitales, bandeau défilant, halos lumineux, mot coloré dans les titres,
  fondu répété sur chaque section. Le hero reste le seul moment animé.
- Offre mise en avant : « Recommandé » au lieu de « Populaire » (pas encore de ventes pour le prouver).
- Profils de commerce présentés comme des usages, sans avatars façon témoignage.
- CTA final aligné sur le hero : « Créer ma caisse ».
- Image de partage (og.png 1200×630) et balises Open Graph / Twitter ; méta-description réécrite.
- E-mail de contact : ivorygestion@gmail.com ; page support statique complétée (WhatsApp, téléphones, siège) ;
  nouveau logo sur les pages statiques.
- DESIGN.md : direction, palette avec rôles, règles et grille de revue pour les prochaines évolutions.

## 2.4.0

### Stock fiable
- « + Vente » propose d'abord **Article du stock** : on choisit l'article et la quantité, le montant se calcule,
  le stock baisse. Impossible de vendre un article en rupture ou plus que la quantité restante.
- **Montant libre** reste possible, clairement marqué « hors stock » (service, article non suivi).
- Dépense « Marchandises » : option **Ajouter au stock** (article + quantité). Le stock monte et le prix d'achat
  suit le dernier réassort, pour une marge juste. Supprimer cet achat retire les quantités.
- Recherche d'article dans la caisse dès 7 produits.
- Garde-fou côté données : un panier sans article disponible n'enregistre rien.

### Correctifs
- Clavier qui se fermait après chaque lettre dans les formulaires (fenêtres du bas) : corrigé.

### Marque et contacts
- Nouveau logo vectoriel (auvent de boutique + pièce en francs), net à toutes les tailles, aux couleurs du thème ;
  icônes de l'app régénérées, favicon SVG.
- Ivory Gestion (éditeur) a sa pastille neutre, distincte du produit.
- Contacts : WhatsApp +225 07 59 26 09 53, téléphones +225 07 59 26 09 53 et +225 01 42 04 34 07,
  siège Cocody, Abidjan. Lien WhatsApp direct depuis l'écran d'activation de clé.

## 2.3.0

### Premium par licence Chariow (sans compte marchand CinetPay)
- 3 licences en vente sur la boutique Ivory Gestion : Mensuel 2 000 F (31 j), Annuel 15 000 F (366 j), À vie 25 000 F.
- « Payer » ouvre la page Chariow de la formule ; l'app passe à l'étape « Active ta clé ».
- Nouvelle fonction serveur `/api/license/*` : vérifie la clé auprès de Chariow, n'accepte que les 3 produits
  Ivory Caisse, active 2 téléphones maximum, sans consommer de place quand on réinstalle sur le même téléphone.
- Date de fin fournie par Chariow ; clés stockées hachées côté serveur.
- Revérification automatique une fois par jour : licence annulée/remboursée/expirée → retour au gratuit.
- CinetPay reste prioritaire s'il est configuré un jour (CINETPAY_APIKEY / CINETPAY_SITE_ID).
- Correctif : les refus métier ne répondent plus en 404/403 (Netlify les interceptait), mais en 422/409.

## 2.2.1

- Logos officiels Wave, Orange Money, MTN MoMo et Moov Money (écran Premium, tarifs, pied de page), vignettes 16:9 WebP (~20 Ko au total, disponibles hors-ligne).

## 2.2.0

### Paiement Premium sécurisé (CinetPay)
- Nouvelle fonction serveur Netlify `/api/pay/*` : la clé CinetPay ne quitte plus le serveur
  (avant : intégrée dans le code de l'app, lisible par tous).
- Prix imposés par le serveur ; paiement validé seulement si CinetPay confirme ACCEPTED,
  avec le bon montant en XOF.
- Un paiement n'active Premium que sur le téléphone qui l'a lancé (avant : un même numéro
  de transaction pouvait débloquer n'importe quel téléphone).
- Notification CinetPay re-vérifiée auprès de l'API ; retour automatique dans l'app.
- Paiement en attente revérifié à la réouverture.
- Expiration des abonnements : mensuel 31 j, annuel 366 j, À vie sans fin ; date affichée.
- Service worker : les routes `/api/` ne sont jamais mises en cache.

## 2.1.1

- Icônes PWA refaites : 728 Ko → 42 Ko, vraie 192 px, icône adaptative Android, icône Apple.
- Fichier `_headers` publié avec le site (Netlify Drop) : type correct du manifest, cache des fichiers.
- Service worker : `_headers` / `_redirects` exclus du pré-cache.

## 2.1.0

### Vitesse
- Démarrage en 3G : 4,8 s → 1,8 s ; 688 Ko → 157 Ko au premier chargement.
- Écrans, graphiques, PDF, Excel et Firebase chargés à la demande (build découpé, plus de fichier unique).
- Polices embarquées dans l'app (plus de Google Fonts) : rendu identique hors-ligne.
- Service worker : tous les fichiers de l'app pré-cachés à l'installation (sauf Firebase).

### Caisse
- Panier multi-produits depuis le Stock : plusieurs articles, un seul encaissement, stock déduit.
- Bouton « Annuler » 5 s après chaque saisie (et après une vente panier : stock remis).
- Modifier un mouvement : montant, note, catégorie, vendeur, date et heure.
- Suppression en deux temps ; une vente issue du stock remet les articles en rayon.
- Ticket de caisse en image PNG, partageable directement sur WhatsApp.
- Reçus PDF / texte / image : détail des articles et date complète avec l'année.
- Recherche dans le stock.

### Données
- Rappel de sauvegarde après 7 jours sans sauvegarde (fichier partageable sur WhatsApp).
- Restauration d'une sauvegarde fichier, avec vérification et confirmation.
- Bandeau « données d'exemple » après l'inscription, avec effacement en un geste.
- Confirmation obligatoire avant de vider les données (avant : une seule touche).

### Affichage et accessibilité
- Mode clair (plein soleil), sombre ou automatique ; contrastes texte ≥ 4,5:1.
- Graphiques adaptés au thème actif.
- Focus clavier visible ; tiroirs fermables par Échap ou bouton ✕ ; saisie du montant au clavier.
- Respect du réglage « réduire les animations ».
- Textes de moins de 10 px supprimés ; séparateur de milliers corrigé avec les polices embarquées.
- Bouton « Vendre » imbriqué dans un bouton corrigé ; devise réelle partout (plus de « F » en dur).

### Honnêteté
- Landing : faux chiffres (« 28 400 commerçants », « 4,9/5 ») et faux témoignages retirés.

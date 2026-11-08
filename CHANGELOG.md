# Ivory Caisse — Journal des changements

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

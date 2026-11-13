# Ivory Caisse — Direction de design

Référence à relire avant toute modification d'interface (app, landing, pages statiques, visuels).
Principes tirés des galeries sélectionnées par designeer.xyz (Curated.design, Saaspo, 60fps, Mobbin, Good UI,
Laws of UX, Practical Typography), relevé du 9 novembre 2026, appliqués à ce produit.

## Brief

- **Cible :** commerçants de boutique, d'étal et de maquis en Afrique de l'Ouest qui tiennent un cahier papier.
- **Promesse :** chaque soir, savoir ce que le commerce a gagné, même sans réseau.
- **Action attendue :** « Créer ma caisse ». Même libellé en haut et en bas de la landing.

## Concept

**Le cahier de caisse.** C'est l'objet que le produit remplace, donc la forme de référence :
lignes réglées, libellé à gauche, montant à droite, total souligné. On l'utilise pour les listes
de fonctions, les extraits de journée, l'image de partage. Pas de grille de cartes identiques.

## Couleurs (rôles fixes)

| Rôle | Valeur sombre | Valeur claire | Origine |
|---|---|---|---|
| Fond, encre de nuit | `--color-ink` #0a0a0e | #f5f3ee | écran utilisé tôt le matin et tard le soir |
| Texte, ivoire | `--color-cream` #f7f3ec | #17171d | le nom « Ivory » |
| Action, orange | `--color-brand` #ff7a1a (thème) | idem, foncé pour le texte | drapeau ivoirien, mobile money |
| Argent qui rentre | `--color-mint` #22c98d | #0b7a54 | vert du drapeau, ventes |
| Argent qui sort | `--color-rose` #f5516c | #c8173f | dépenses, ruptures |
| Texte secondaire | `--color-muted` | | |

Règles : orange réservé à l'action principale et à la marque. Vert et rose réservés aux montants.
Pas d'autre couleur d'accent (pas de bleu ciel, violet, ambre décoratifs).

## Typographie

- Titres : **Bricolage Grotesque** (variable), graisse 800, interlettrage serré.
- Texte : **Inter** (variable). Texte courant 15–16 px minimum sur mobile, interlignage 1,4–1,5.
- Montants : chiffres tabulaires (`tabular-nums`), espace insécable avant « F » et entre les milliers.
- Hiérarchie par la graisse et la couleur d'abord. Pas de mot coloré ou souligné dans un titre.

## Marque

- Logo : auvent de boutique + pièce marquée F (`BrandMark` dans `ui.tsx`, `public/icons/icon.svg`).
  Suit la couleur du thème dans l'app ; orange fixe sur les icônes et l'image de partage.
- Ivory Gestion (éditeur) : pastille « IG » neutre (fond `panel2`, bordure `line`), jamais orange.
- Image de partage : `public/og.png` (1200×630), titre + extrait de cahier.

## Mouvement

- Un seul moment orchestré sur la landing : le hero (téléphone et ventes qui défilent).
  Les sections suivantes n'ont pas d'animation d'entrée.
- Dans l'app : transitions < 300 ms, ease-out, uniquement transform et opacity.
  Les feuilles du bas peuvent utiliser un ressort. `MotionConfig reducedMotion="user"` reste actif.
- Plus un geste est fréquent (encaisser, + / −), plus son retour est court et discret.

## Ergonomie (non négociable)

- Zones tactiles ≥ 44 px. Clavier numérique géant pour les montants.
- Annuler (toast) plutôt que confirmer. Confirmation seulement pour l'irréversible (effacer les données).
- Une feuille du bas ne doit jamais voler le focus d'un champ (voir `Sheet` : `onClose` en ref).
- Le stock est la vérité : on ne vend pas ce qui n'est pas en rayon ; « Montant libre » est marqué hors stock.
- États vide, chargement, erreur et succès conçus pour chaque écran.

## Contenu

- Tutoiement, phrases courtes, vocabulaire du marché (« encaisser », « crédit », « réassort »).
- Aucun chiffre, logo client ou témoignage inventé. Les profils de commerce sont des usages, pas des citations.
- Pas de badge « Populaire » sans ventes réelles : l'offre mise en avant est « Recommandé ».
- Coordonnées : uniquement depuis `src/lib/contact.ts`.

## À ne pas faire (signes d'un site généré)

Badge en pilule au-dessus du titre · petit sur-titre en capitales sur chaque section · trois cartes égales
avec icône dans un carré · halos flous et lueurs derrière les blocs · dégradé violet/indigo · titres en dégradé
ou avec un mot coloré · même fondu sur chaque section · chiffres non sourcés · « Get Started / En savoir plus ».

## Grille avant livraison

- [ ] Promesse et cible lisibles en 5 secondes
- [ ] Un CTA principal, même libellé haut et bas
- [ ] Palette ci-dessus uniquement, rôles respectés
- [ ] Texte ≥ 16 px mobile, lignes ≤ 90 caractères
- [ ] Zones tactiles ≥ 44 px, focus visible
- [ ] Animations < 300 ms, reduced-motion géré
- [ ] Méta-description, image de partage, textes alternatifs à jour
- [ ] Zéro signe de la liste « À ne pas faire »

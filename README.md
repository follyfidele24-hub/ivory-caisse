# Ivory Studio

Une photo produit en entrée. Une pub vidéo ou 4 visuels de campagne en sortie.
Next.js + SDK officiel Runway (`@runwayml/sdk`), surface **Recipes**.

| Onglet | Recipe Runway | Version épinglée | Sortie |
| --- | --- | --- | --- |
| Pub vidéo | `product_ad` | `2026-07` | 1 vidéo (4–15 s) |
| Visuels campagne | `product_campaign_image` | `2026-06` | 4 images |

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis colle ta clé RUNWAYML_API_SECRET
npm run dev                  # http://localhost:3000
```

La clé se crée dans le Developer Portal Runway (https://dev.runwayml.com) → API Keys.
Elle reste côté serveur (`app/api/generate/route.ts`), jamais dans le navigateur.

## Comment ça marche

1. Le navigateur redimensionne la photo (2048 px max, JPEG) pour rester sous la limite de 5 Mo des data URIs.
2. `POST /api/generate` valide l'entrée et appelle `client.recipes.productAd(...)` ou `productCampaignImage(...)`, puis `.waitForTaskOutput()`.
3. La route renvoie les URLs de sortie. Elles expirent sous ~24–48 h : télécharge ce que tu gardes.

Chaque génération consomme des crédits Runway. Tarifs : https://docs.dev.runwayml.com/guides/pricing.

## Limites connues

- La route attend la fin de la tâche dans la même requête HTTP. En local, aucun souci.
  Sur Vercel, `maxDuration = 800` exige le plan Pro (Hobby plafonne à 300 s). Une pub vidéo longue peut dépasser.
  Si ça arrive : découper en `POST` (création, renvoie l'id) + `GET /api/tasks/[id]` (statut).
- Pas de stockage des résultats. À ajouter (Supabase Storage, S3…) si tu veux un historique.

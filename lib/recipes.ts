// Contrats partagés client/serveur. Valeurs reprises de la doc Runway Dev (Recipes).

export type RecipeKind = "product_ad" | "product_campaign_image";

export const AD_RATIOS = [
  "1280:720",
  "720:1280",
  "960:960",
  "834:1112",
  "1920:1080",
  "1080:1920",
  "1440:1440",
  "1248:1664",
] as const;
export type AdRatio = (typeof AD_RATIOS)[number];

export type GenerateRequest =
  | {
      recipe: "product_ad";
      productImages: string[]; // data URIs, 1 à 10
      productInfo?: string;
      userConcept?: string;
      ratio?: AdRatio;
      duration?: number; // 4 à 15 s
      audio?: boolean;
    }
  | {
      recipe: "product_campaign_image";
      image: string; // data URI
      prompt: string;
    };

export type GenerateResponse =
  | { ok: true; taskId: string; outputs: string[] }
  | { ok: false; error: string; taskId?: string; failureCode?: string };

// Limite Runway : 5 Mo par data URI encodée.
export const MAX_DATA_URI_BYTES = 5 * 1024 * 1024;

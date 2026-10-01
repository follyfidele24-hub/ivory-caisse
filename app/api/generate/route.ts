import RunwayML, { TaskFailedError, TaskTimedOutError } from "@runwayml/sdk";
import {
  AD_RATIOS,
  MAX_DATA_URI_BYTES,
  type GenerateRequest,
  type GenerateResponse,
} from "@/lib/recipes";

export const runtime = "nodejs";
// Une vidéo Product Ad peut prendre plusieurs minutes. 800 s = plafond Vercel (Pro, Fluid).
export const maxDuration = 800;

type Failure = Extract<GenerateResponse, { ok: false }>;

function fail(error: string, status = 400, extra: Omit<Failure, "ok" | "error"> = {}) {
  return Response.json({ ok: false, error, ...extra } satisfies Failure, { status });
}

function checkImage(uri: unknown): string | null {
  if (typeof uri !== "string" || !/^data:image\/(jpe?g|png|webp);base64,/.test(uri)) {
    return "Image invalide : JPEG, PNG ou WebP attendu.";
  }
  if (uri.length > MAX_DATA_URI_BYTES) return "Image trop lourde (5 Mo max une fois encodée).";
  return null;
}

export async function POST(request: Request) {
  if (!process.env.RUNWAYML_API_SECRET) {
    return fail("RUNWAYML_API_SECRET manquant côté serveur. Ajoute-le dans .env.local.", 500);
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return fail("Corps JSON invalide.");
  }

  const client = new RunwayML();
  const waitOptions = { timeout: (maxDuration - 20) * 1000, abortSignal: request.signal };

  try {
    let task;
    if (body.recipe === "product_ad") {
      const images = body.productImages ?? [];
      if (images.length < 1 || images.length > 10) return fail("1 à 10 photos produit.");
      for (const img of images) {
        const err = checkImage(img);
        if (err) return fail(err);
      }
      if (body.ratio && !AD_RATIOS.includes(body.ratio)) return fail("Format non supporté.");
      if (body.duration !== undefined && !(Number.isInteger(body.duration) && body.duration >= 4 && body.duration <= 15)) {
        return fail("Durée : entier entre 4 et 15 s.");
      }

      task = await client.recipes
        .productAd({
          version: "2026-07",
          productImages: images.map((uri) => ({ uri })),
          productInfo: body.productInfo?.slice(0, 2500) || undefined,
          userConcept: body.userConcept?.slice(0, 3500) || undefined,
          ratio: body.ratio,
          duration: body.duration,
          audio: body.audio,
        })
        .waitForTaskOutput(waitOptions);
    } else if (body.recipe === "product_campaign_image") {
      const err = checkImage(body.image);
      if (err) return fail(err);
      if (!body.prompt?.trim()) return fail("Le brief créatif est obligatoire.");

      task = await client.recipes
        .productCampaignImage({
          version: "2026-06",
          image: { uri: body.image },
          prompt: body.prompt.slice(0, 3500),
        })
        .waitForTaskOutput(waitOptions);
    } else {
      return fail("Recipe inconnue.");
    }

    return Response.json({ ok: true, taskId: task.id, outputs: task.output } satisfies GenerateResponse);
  } catch (error) {
    if (error instanceof TaskFailedError) {
      const d = error.taskDetails as { id: string; failure?: string; failureCode?: string };
      return fail(d.failure ?? "La génération a échoué.", 422, { taskId: d.id, failureCode: d.failureCode });
    }
    if (error instanceof TaskTimedOutError) {
      return fail("Délai dépassé. La tâche tourne peut-être encore côté Runway.", 504, {
        taskId: error.taskDetails.id,
      });
    }
    if (error instanceof RunwayML.APIError) {
      return fail(`Runway API ${error.status} : ${error.message}`, error.status ?? 502);
    }
    throw error;
  }
}

"use client";

import { useState } from "react";
import {
  AD_RATIOS,
  MAX_DATA_URI_BYTES,
  type AdRatio,
  type GenerateRequest,
  type GenerateResponse,
  type RecipeKind,
} from "@/lib/recipes";

// Redimensionne côté navigateur pour rester sous la limite de 5 Mo des data URIs Runway.
async function toDataUri(file: File, maxSide = 2048): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.9, 0.8, 0.7]) {
    const uri = canvas.toDataURL("image/jpeg", quality);
    if (uri.length <= MAX_DATA_URI_BYTES) return uri;
  }
  throw new Error(`${file.name} reste trop lourde après compression.`);
}

export default function Home() {
  const [recipe, setRecipe] = useState<RecipeKind>("product_ad");
  const [images, setImages] = useState<string[]>([]);
  const [productInfo, setProductInfo] = useState("");
  const [concept, setConcept] = useState("");
  const [ratio, setRatio] = useState<AdRatio>("1080:1920");
  const [duration, setDuration] = useState(8);
  const [audio, setAudio] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<{ kind: RecipeKind; urls: string[] } | null>(null);

  const maxImages = recipe === "product_ad" ? 10 : 1;

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    try {
      setImages(await Promise.all([...files].slice(0, maxImages).map((f) => toDataUri(f))));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOutputs(null);
    if (images.length === 0) return setError("Ajoute au moins une photo produit.");

    const payload: GenerateRequest =
      recipe === "product_ad"
        ? { recipe, productImages: images, productInfo, userConcept: concept, ratio, duration, audio }
        : { recipe, image: images[0], prompt: concept };

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as GenerateResponse;
      if (data.ok) setOutputs({ kind: recipe, urls: data.outputs });
      else setError(data.failureCode ? `${data.error} (${data.failureCode})` : data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function switchRecipe(next: RecipeKind) {
    setRecipe(next);
    setImages((prev) => (next === "product_campaign_image" ? prev.slice(0, 1) : prev));
    setOutputs(null);
    setError(null);
  }

  return (
    <main>
      <h1>Ivory Studio</h1>
      <p className="sub">Une photo produit en entrée, une pub vidéo ou des visuels de campagne en sortie.</p>

      <div className="tabs" role="group" aria-label="Type de rendu">
        <button type="button" aria-pressed={recipe === "product_ad"} onClick={() => switchRecipe("product_ad")}>
          Pub vidéo
        </button>
        <button
          type="button"
          aria-pressed={recipe === "product_campaign_image"}
          onClick={() => switchRecipe("product_campaign_image")}
        >
          Visuels campagne (×4)
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <label>
          Photo{maxImages > 1 ? "s" : ""} produit
          <span className="hint">
            {maxImages > 1 ? "1 à 10 angles du même produit. La première sert de référence principale." : "Une photo, produit bien isolé."}{" "}
            Fond neutre, bonne lumière.
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple={maxImages > 1} onChange={(e) => onFiles(e.target.files)} />
        </label>
        {images.length > 0 && (
          <div className="thumbs">
            {images.map((src, i) => (
              <img key={i} src={src} alt={`Photo produit ${i + 1}`} />
            ))}
          </div>
        )}

        {recipe === "product_ad" && (
          <label>
            Infos produit <span className="hint">Optionnel. Ex : croissant pur beurre, feuilletage 27 couches.</span>
            <textarea value={productInfo} maxLength={2500} onChange={(e) => setProductInfo(e.target.value)} />
          </label>
        )}

        <label>
          {recipe === "product_ad" ? "Direction créative" : "Brief créatif"}
          <span className="hint">
            {recipe === "product_ad"
              ? "Optionnel. Ambiance, lumière, mouvements de caméra."
              : "Obligatoire. Ex : lumière chaude du matin, comptoir en bois, style éditorial gourmand."}
          </span>
          <textarea value={concept} maxLength={3500} required={recipe === "product_campaign_image"} onChange={(e) => setConcept(e.target.value)} />
        </label>

        {recipe === "product_ad" && (
          <div className="row">
            <label>
              Format
              <select value={ratio} onChange={(e) => setRatio(e.target.value as AdRatio)}>
                {AD_RATIOS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Durée (s)
              <input type="number" min={4} max={15} step={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>
            <label className="check">
              <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
              Générer l&apos;audio
            </label>
          </div>
        )}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Génération en cours…" : "Générer"}
        </button>
        {loading && <p className="status">Ça prend de quelques dizaines de secondes à plusieurs minutes. Garde l&apos;onglet ouvert.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </form>

      {outputs && (
        <section className="results" aria-label="Résultats">
          {outputs.urls.map((url, i) => (
            <figure key={url} style={{ margin: 0 }}>
              {outputs.kind === "product_ad" ? <video src={url} controls playsInline /> : <img src={url} alt={`Visuel ${i + 1}`} />}
              <a href={url} target="_blank" rel="noreferrer" download>
                Télécharger (lien temporaire, ~24-48 h)
              </a>
            </figure>
          ))}
        </section>
      )}
    </main>
  );
}

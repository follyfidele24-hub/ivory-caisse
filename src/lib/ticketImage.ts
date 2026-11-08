import { fmtF, fullDate, timeOf } from "./format";
import type { Profile, Txn } from "./store";

/**
 * Ticket de caisse en image PNG, dessiné sur canvas (aucune librairie).
 * Format reçu 80 mm, lisible dans une conversation WhatsApp.
 */

const W = 720; // px (rendu net sur écrans 2x/3x)
const PAD = 56;
const INK = "#16161c";
const MUTED = "#6b6b76";
const LINE = "#d9d5cc";
const PAPER = "#fffdf8";

const FONT_BODY = `"Inter Variable", Inter, system-ui, sans-serif`;
const FONT_DISPLAY = `"Bricolage Grotesque Variable", "Bricolage Grotesque", ${FONT_BODY}`;

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

function dashed(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  ctx.restore();
}

/** Dessine le ticket ; mesure d'abord la hauteur, puis rend. */
function draw(ctx: CanvasRenderingContext2D | null, txn: Txn, profile: Profile | null, brand: string): number {
  const c = ctx ?? (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D);
  let y = 0;
  const text = (s: string, x: number, yy: number, font: string, color: string, align: CanvasTextAlign = "left") => {
    if (!ctx) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, yy);
  };

  /* Bandeau couleur de la boutique */
  if (ctx) {
    ctx.fillStyle = brand;
    ctx.fillRect(0, 0, W, 14);
  }
  y = 96;
  text(profile?.shop ?? "Ma boutique", W / 2, y, `800 44px ${FONT_DISPLAY}`, INK, "center");
  y += 40;
  text(profile?.name ?? "", W / 2, y, `500 24px ${FONT_BODY}`, MUTED, "center");
  y += 40;
  if (ctx) dashed(ctx, y);
  y += 46;

  text(fullDate(txn.ts), PAD, y, `500 22px ${FONT_BODY}`, MUTED);
  text(timeOf(txn.ts), W - PAD, y, `500 22px ${FONT_BODY}`, MUTED, "right");
  y += 34;
  text(`N° ${txn.id.toUpperCase()}`, PAD, y, `500 22px ${FONT_BODY}`, MUTED);
  if (txn.seller) text(`Par ${txn.seller}`, W - PAD, y, `500 22px ${FONT_BODY}`, MUTED, "right");
  y += 50;

  /* Lignes */
  c.font = `600 28px ${FONT_BODY}`;
  if (txn.items && txn.items.length) {
    for (const it of txn.items) {
      const lines = wrap(c, it.name, W - PAD * 2 - 220);
      lines.forEach((l, i) => {
        text(l, PAD, y + i * 36, `600 28px ${FONT_BODY}`, INK);
      });
      text(fmtF(it.qty * it.price), W - PAD, y, `700 28px ${FONT_BODY}`, INK, "right");
      y += lines.length * 36;
      text(`${it.qty} × ${fmtF(it.price)}`, PAD, y, `500 22px ${FONT_BODY}`, MUTED);
      y += 48;
    }
  } else {
    const lines = wrap(c, txn.note || txn.category, W - PAD * 2);
    lines.forEach((l) => {
      text(l, PAD, y, `600 28px ${FONT_BODY}`, INK);
      y += 38;
    });
    y += 10;
  }

  if (ctx) dashed(ctx, y);
  y += 70;
  text("TOTAL", PAD, y, `800 30px ${FONT_BODY}`, INK);
  text(fmtF(txn.amount), W - PAD, y + 4, `800 56px ${FONT_DISPLAY}`, INK, "right");
  y += 44;
  text(txn.type === "sale" ? "Vente réglée" : "Dépense", PAD, y, `500 22px ${FONT_BODY}`, MUTED);
  y += 50;
  if (ctx) dashed(ctx, y);
  y += 56;
  text("Merci de votre visite !", W / 2, y, `600 26px ${FONT_BODY}`, INK, "center");
  y += 38;
  text("Ivory Caisse · Ivory Gestion", W / 2, y, `500 20px ${FONT_BODY}`, "#a3a3ad", "center");
  y += 56;
  return y;
}

export async function ticketBlob(txn: Txn, profile: Profile | null): Promise<Blob> {
  try {
    await document.fonts?.ready;
  } catch {
    /* polices système en secours */
  }
  const brand = getComputedStyle(document.documentElement).getPropertyValue("--color-brand").trim() || "#ff7a1a";
  const h = draw(null, txn, profile, brand);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, h);
  ctx.textBaseline = "alphabetic";
  draw(ctx, txn, profile, brand);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image impossible"))), "image/png")
  );
}

/** Partage le ticket en image (WhatsApp, etc.) ; sinon le télécharge. */
export async function shareTicketImage(
  txn: Txn,
  profile: Profile | null
): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await ticketBlob(txn, profile);
  const name = `ticket-${txn.id}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `Ticket — ${profile?.shop ?? "Ivory Caisse"}` });
      return "shared";
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

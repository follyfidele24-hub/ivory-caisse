import { rename } from "node:fs/promises";
import sharp from "sharp";

async function normalize(path, size) {
  const temp = `${path}.tmp.png`;
  await sharp(path).resize(size, size, { fit: "fill" }).png().toFile(temp);
  await rename(temp, path);
  console.log(`${path}: ${size}x${size}`);
}

await normalize("assets/icon-only.png", 1024);
await normalize("assets/splash.png", 2732);
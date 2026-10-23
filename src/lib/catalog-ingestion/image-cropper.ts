import sharp from "sharp";
import type { CropResult } from "./types";

export interface CropOptions {
  coords_1000: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  sku: string;
  imageWidth: number;
  imageHeight: number;
  imageBuffer: Buffer;
  quality?: number;
}

/**
 * Recorta uma região retangular baseada em coordenadas normalizadas (0 a 1000) e exporta em WebP.
 */
export async function cropProductImage({
  coords_1000,
  sku,
  imageWidth,
  imageHeight,
  imageBuffer,
  quality = 88,
}: CropOptions): Promise<CropResult> {
  const [ymin, xmin, ymax, xmax] = coords_1000;

  // Converte escala 0..1000 para pixels com limites de segurança
  const top = Math.max(0, Math.min(imageHeight - 1, Math.round((ymin / 1000) * imageHeight)));
  const left = Math.max(0, Math.min(imageWidth - 1, Math.round((xmin / 1000) * imageWidth)));
  const bottom = Math.max(top + 10, Math.min(imageHeight, Math.round((ymax / 1000) * imageHeight)));
  const right = Math.max(left + 10, Math.min(imageWidth, Math.round((xmax / 1000) * imageWidth)));

  const width = right - left;
  const height = bottom - top;

  const cropBuffer = await sharp(imageBuffer)
    .extract({ left, top, width, height })
    .webp({ quality, effort: 4 })
    .toBuffer();

  return {
    sku,
    cropBuffer,
    width,
    height,
    coords: coords_1000,
  };
}

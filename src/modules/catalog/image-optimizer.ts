import crypto from 'crypto';
import sharp from 'sharp';
import { saveMediaObject } from '@/modules/shared/storage';
import { ALLOWED_IMAGE_MIMES, MAX_IMAGE_UPLOAD_BYTES } from './validators';

export interface OptimizeImageOptions {
  buffer: Buffer;
  mimeType: string;
  businessId: string;
  kind?: 'product' | 'logo' | 'cover';
  crop?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  };
}

export interface OptimizedImageResult {
  publicUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  format: 'webp';
}

/**
 * Valida, recorta, redimensiona y optimiza una imagen a formato WebP usando sharp.
 * Cumple los requisitos B3 y D1:
 * - Rechaza archivos > 5 MB o de formato no permitido.
 * - Convierte siempre a WebP ligero para carga rápida en redes 3G/4G.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function optimizeAndSaveWebpImage(
  opts: OptimizeImageOptions,
): Promise<OptimizedImageResult> {
  const { buffer, mimeType, businessId, kind = 'product', crop } = opts;

  if (!UUID_REGEX.test(businessId)) {
    throw new Error('Identificador de negocio inválido para almacenamiento de imagen.');
  }

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('La imagen enviada está vacía.');
  }

  if (buffer.byteLength > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('La imagen supera el límite máximo de 5 MB. Elige una más liviana.');
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    throw new Error('Formato de imagen no soportado. Usa JPG, PNG, WebP o AVIF.');
  }

  let pipeline = sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).rotate(); // Respeta orientación EXIF del celular
  const metadata = await pipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('No pudimos leer las dimensiones de la imagen.');
  }

  // Si viene un recorte explícito válido, lo aplicamos antes de redimensionar
  if (
    crop &&
    typeof crop.left === 'number' &&
    typeof crop.top === 'number' &&
    typeof crop.width === 'number' &&
    typeof crop.height === 'number' &&
    crop.width > 10 &&
    crop.height > 10
  ) {
    const left = Math.max(0, Math.min(Math.round(crop.left), metadata.width - 10));
    const top = Math.max(0, Math.min(Math.round(crop.top), metadata.height - 10));
    const width = Math.min(Math.round(crop.width), metadata.width - left);
    const height = Math.min(Math.round(crop.height), metadata.height - top);
    pipeline = pipeline.extract({ left, top, width, height });
  }

  // Dimensiones objetivo según el uso (ligeras para 3G/4G)
  const targetDimensions =
    kind === 'cover'
      ? { width: 1200, height: 480 }
      : kind === 'logo'
        ? { width: 400, height: 400 }
        : { width: 720, height: 720 };

  const processedBuffer = await pipeline
    .resize(targetDimensions.width, targetDimensions.height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const finalMeta = await sharp(processedBuffer).metadata();

  const folderName = kind === 'product' ? 'products' : 'brand';
  // Carpeta por negocio completo (antes solo 8 caracteres del id: podía mezclar negocios).
  const fileName = `${kind}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
  const key = `${folderName}/${businessId.toLowerCase()}/${fileName}`;
  const publicUrl = await saveMediaObject(key, processedBuffer);

  return {
    publicUrl,
    width: finalMeta.width || targetDimensions.width,
    height: finalMeta.height || targetDimensions.height,
    sizeBytes: processedBuffer.byteLength,
    format: 'webp',
  };
}

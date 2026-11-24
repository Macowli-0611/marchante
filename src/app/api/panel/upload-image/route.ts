import { optimizeAndSaveWebpImage } from '@/modules/catalog/image-optimizer';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/modules/catalog/validators';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit } from '@/modules/shared/rate-limiter';
import { assertNotDemo, ok, sellerRoute } from '@/modules/shared/route';

export const POST = sellerRoute(async (session, request) => {
  assertNotDemo(session, 'subir imágenes');

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_UPLOAD_BYTES + 64 * 1024) {
    throw new AppError('La imagen supera el límite máximo de 5 MB. Elige una más liviana.', 413);
  }

  const limit = await checkSharedRateLimit({
    key: `upload:${session.businessId}`,
    windowMs: 60 * 60 * 1000,
    maxRequests: 60,
  });
  if (!limit.allowed) {
    throw new AppError(`Subiste muchas imágenes seguidas. Espera ${limit.retryAfterSeconds} segundos.`, 429);
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw new AppError('Selecciona un archivo de imagen válido.');
  }

  const kindRaw = String(formData.get('kind') || 'product');
  const kind = kindRaw === 'logo' || kindRaw === 'cover' ? kindRaw : ('product' as const);

  const result = await optimizeAndSaveWebpImage({
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || 'application/octet-stream',
    businessId: session.businessId,
    kind,
  });

  return ok({
    imageUrl: result.publicUrl,
    width: result.width,
    height: result.height,
    sizeBytes: result.sizeBytes,
  });
}, 'No se pudo procesar la imagen.');

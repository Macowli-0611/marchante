import { createPublicPendingOrder } from '@/modules/orders/service';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit, getClientIp } from '@/modules/shared/rate-limiter';
import { ok, publicRoute, readJson } from '@/modules/shared/route';

export const POST = publicRoute(async (request) => {
  const clientIp = getClientIp(request);
  const body = await readJson(request);
  const slugKey = typeof body.businessSlug === 'string' ? body.businessSlug.slice(0, 60) : 'unknown';

  // Máximo 15 pedidos cada 5 minutos por IP + tienda, y 200 por hora por tienda (Requisito C8)
  const [perIp, perShop] = await Promise.all([
    checkSharedRateLimit({ key: `public-order:${clientIp}:${slugKey}`, windowMs: 5 * 60 * 1000, maxRequests: 15 }),
    checkSharedRateLimit({ key: `public-order-shop:${slugKey}`, windowMs: 60 * 60 * 1000, maxRequests: 200 }),
  ]);
  if (!perIp.allowed || !perShop.allowed) {
    const wait = Math.max(perIp.retryAfterSeconds, perShop.retryAfterSeconds);
    throw new AppError(
      `Has enviado muchos pedidos seguidos. Espera ${wait} segundos e intenta de nuevo.`,
      429,
    );
  }

  const result = await createPublicPendingOrder(body as never);
  return ok({ ...result }, 201);
}, 'No pudimos registrar tu pedido.');

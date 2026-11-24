import { registerSeller } from '@/modules/auth/service';
import { setSessionCookie } from '@/modules/auth/session';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit, getClientIp } from '@/modules/shared/rate-limiter';
import { ok, publicRoute, readJson } from '@/modules/shared/route';

export const POST = publicRoute(async (request) => {
  const limit = await checkSharedRateLimit({
    key: `auth-register:${getClientIp(request)}`,
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
  });
  if (!limit.allowed) {
    throw new AppError(`Demasiados registros seguidos. Espera ${limit.retryAfterSeconds} segundos.`, 429);
  }
  const session = await registerSeller((await readJson(request)) as never);
  await setSessionCookie(session);
  return ok({ session: { slug: session.slug, businessName: session.businessName } }, 201);
}, 'No se pudo completar el registro.');

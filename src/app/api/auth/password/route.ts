import { changeSellerPassword } from '@/modules/auth/service';
import { revokeAllSessions, setSessionCookie } from '@/modules/auth/session';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit } from '@/modules/shared/rate-limiter';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

export const POST = sellerRoute(async (session, request) => {
  const limit = await checkSharedRateLimit({
    key: `auth-password:${session.userId}`,
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  });
  if (!limit.allowed) {
    throw new AppError(`Demasiados intentos. Espera ${limit.retryAfterSeconds} segundos.`, 429);
  }
  await changeSellerPassword(session.userId, (await readJson(request)) as never);
  // Cierra todas las demás sesiones y deja abierta solo esta.
  const sessionVersion = await revokeAllSessions(session.userId);
  await setSessionCookie({ ...session, sessionVersion });
  return ok();
}, 'No se pudo cambiar la contraseña.');

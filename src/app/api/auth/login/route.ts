import { loginSeller } from '@/modules/auth/service';
import { setSessionCookie } from '@/modules/auth/session';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit, getClientIp } from '@/modules/shared/rate-limiter';
import { ok, publicRoute, readJson } from '@/modules/shared/route';

export const POST = publicRoute(async (request) => {
  const clientIp = getClientIp(request);
  const body = await readJson(request);
  const emailKey = typeof body.email === 'string' ? body.email.toLowerCase().trim().slice(0, 120) : 'anon';

  // Dos límites: por IP+correo (adivinar una clave) y por correo (ataque distribuido).
  const [perIp, perEmail] = await Promise.all([
    checkSharedRateLimit({ key: `auth-login:${clientIp}:${emailKey}`, windowMs: 5 * 60 * 1000, maxRequests: 10 }),
    checkSharedRateLimit({ key: `auth-login-email:${emailKey}`, windowMs: 15 * 60 * 1000, maxRequests: 30 }),
  ]);
  if (!perIp.allowed || !perEmail.allowed) {
    const wait = Math.max(perIp.retryAfterSeconds, perEmail.retryAfterSeconds);
    throw new AppError(`Demasiados intentos de inicio de sesión. Espera ${wait} segundos.`, 429);
  }

  const session = await loginSeller(body as never);
  await setSessionCookie(session);
  return ok({ session: { slug: session.slug, businessName: session.businessName } });
}, 'No se pudo iniciar sesión.');

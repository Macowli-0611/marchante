import { ensureDemoSellerAccount } from '@/modules/auth/service';
import { isDemoEnabled } from '@/modules/auth/demo';
import { setSessionCookie } from '@/modules/auth/session';
import { AppError } from '@/modules/shared/errors';
import { checkSharedRateLimit, getClientIp } from '@/modules/shared/rate-limiter';
import { ok, publicRoute } from '@/modules/shared/route';

export const POST = publicRoute(async (request) => {
  if (!isDemoEnabled()) {
    throw new AppError('La tienda de demostración no está disponible.', 404);
  }
  const limit = await checkSharedRateLimit({
    key: `auth-demo:${getClientIp(request)}`,
    windowMs: 10 * 60 * 1000,
    maxRequests: 20,
  });
  if (!limit.allowed) {
    throw new AppError(`Demasiados intentos. Espera ${limit.retryAfterSeconds} segundos.`, 429);
  }
  const session = await ensureDemoSellerAccount();
  await setSessionCookie(session);
  return ok({ session: { slug: session.slug, businessName: session.businessName } });
}, 'No se pudo preparar la cuenta de demostración.');

/** Permite a la interfaz saber si debe mostrar el botón de demo. */
export async function GET() {
  return Response.json({ ok: true, enabled: isDemoEnabled() });
}

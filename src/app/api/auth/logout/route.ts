import { clearSessionCookie, getServerSession, revokeAllSessions } from '@/modules/auth/session';
import { ok, publicRoute } from '@/modules/shared/route';

export const POST = publicRoute(async () => {
  const session = await getServerSession();
  // La tienda demo es compartida: cerrar sesión ahí no debe sacar a los demás visitantes.
  if (session && !session.isDemo) {
    await revokeAllSessions(session.userId);
  }
  await clearSessionCookie();
  return ok();
}, 'No se pudo cerrar la sesión.');

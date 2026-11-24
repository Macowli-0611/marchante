import { setSessionCookie } from '@/modules/auth/session';
import { getBusinessProfile, updateBusinessProfile } from '@/modules/business/service';
import { assertNotDemo, ok, readJson, sellerRoute } from '@/modules/shared/route';

export const GET = sellerRoute(async (session) => {
  const business = await getBusinessProfile(session.businessId);
  return ok({ business });
}, 'Error al cargar el perfil');

export const PUT = sellerRoute(async (session, request) => {
  assertNotDemo(session, 'cambiar el perfil del negocio');
  const body = await readJson(request);
  const updated = await updateBusinessProfile(session.businessId, body as never);

  // Si cambió el nombre del negocio, del dueño o el slug, actualizamos la cookie de sesión
  if (
    updated.slug !== session.slug ||
    updated.name !== session.businessName ||
    updated.ownerName !== session.ownerName
  ) {
    await setSessionCookie({
      ...session,
      slug: updated.slug,
      businessName: updated.name,
      ownerName: updated.ownerName,
    });
  }
  return ok({ business: updated });
}, 'No se pudo guardar el perfil');

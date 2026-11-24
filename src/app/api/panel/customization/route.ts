import { updateCatalogCustomization } from '@/modules/business/customization';
import { assertNotDemo, ok, readJson, sellerRoute } from '@/modules/shared/route';

export const PUT = sellerRoute(async (session, request) => {
  assertNotDemo(session, 'cambiar el diseño de la vitrina');
  const updated = await updateCatalogCustomization(session.businessId, (await readJson(request)) as never);
  return ok({ business: updated });
}, 'No se pudo guardar el diseño');

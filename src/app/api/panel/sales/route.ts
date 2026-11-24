import { getQuickSaleWorkspaceData, recordQuickSale, voidSale } from '@/modules/sales/service';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

export const GET = sellerRoute(async (session) => {
  return ok({ ...(await getQuickSaleWorkspaceData(session.businessId)) });
}, 'Error al cargar ventas');

export const POST = sellerRoute(async (session, request) => {
  const body = await readJson(request);
  // La fecha de venta solo la fija el servidor (soldAt no se acepta desde la API).
  delete body.soldAt;
  return ok({ ...(await recordQuickSale(session.businessId, body as never)) }, 201);
}, 'No se pudo registrar la venta');

export const PATCH = sellerRoute(async (session, request) => {
  return ok({ sale: await voidSale(session.businessId, (await readJson(request)) as never) });
}, 'No se pudo anular la venta');

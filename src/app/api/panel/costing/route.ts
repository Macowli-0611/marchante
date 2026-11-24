import { listProductsWithCostingSummary, updateProductCosting } from '@/modules/catalog/costing';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

export const GET = sellerRoute(async (session, request) => {
  const raw = Number(new URL(request.url).searchParams.get('targetMargin') || 45);
  const targetMargin = Number.isFinite(raw) ? Math.min(95, Math.max(0, raw)) : 45;
  return ok({ ...(await listProductsWithCostingSummary(session.businessId, targetMargin)) });
}, 'Error al cargar costos y márgenes');

export const PUT = sellerRoute(async (session, request) => {
  return ok({ ...(await updateProductCosting(session.businessId, (await readJson(request)) as never)) });
}, 'No se pudo actualizar el costo');

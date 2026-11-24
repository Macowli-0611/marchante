import {
  createExpenseCategory,
  getFinanceLedger,
  recordFinancialMovement,
  voidFinancialMovement,
} from '@/modules/finance/service';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

export const GET = sellerRoute(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const ledger = await getFinanceLedger(session.businessId, {
    period: (searchParams.get('period') || 'month') as never,
    fromYmd: searchParams.get('fromYmd') || undefined,
    toYmd: searchParams.get('toYmd') || undefined,
    filterKind: (searchParams.get('filterKind') || 'all') as never,
  });
  return ok({ ...ledger });
}, 'Error al cargar movimientos');

export const POST = sellerRoute(async (session, request) => {
  const body = await readJson(request);
  if (body.action === 'create_category') {
    const category = await createExpenseCategory(session.businessId, {
      name: body.name as string,
      isProductCost: body.isProductCost === true,
    });
    return ok({ category }, 201);
  }
  const movement = await recordFinancialMovement(session.businessId, body as never);
  return ok({ movement }, 201);
}, 'No se pudo registrar el movimiento');

export const PATCH = sellerRoute(async (session, request) => {
  const voided = await voidFinancialMovement(session.businessId, (await readJson(request)) as never);
  return ok({ movement: voided });
}, 'No se pudo anular el movimiento');

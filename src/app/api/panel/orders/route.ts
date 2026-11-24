import { cancelPendingOrder, confirmPendingOrderOneTap } from '@/modules/sales/service';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

export const POST = sellerRoute(async (session, request) => {
  const body = await readJson(request);
  if (body.action === 'cancel') {
    const order = await cancelPendingOrder(session.businessId, {
      orderId: body.orderId as string,
      reason: body.reason as string | undefined,
    });
    return ok({ order });
  }
  const result = await confirmPendingOrderOneTap(session.businessId, {
    orderId: body.orderId as string,
    paymentMethod: body.paymentMethod as never,
  });
  return ok({ ...result });
}, 'No se pudo procesar el pedido');

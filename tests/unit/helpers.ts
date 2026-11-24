import { and, eq } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { orders } from '@/db/schema';

/**
 * La respuesta pública de un pedido ya no expone ids internos; las pruebas que
 * actúan como vendedor buscan el id por el código visible (#M-101).
 */
export async function getOrderIdByCode(businessId: string, orderCode: string): Promise<string> {
  const [row] = await withTenantContext(businessId, (tx) =>
    tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.orderCode, orderCode)))
      .limit(1),
  );
  if (!row) throw new Error(`Pedido ${orderCode} no encontrado en la prueba`);
  return row.id;
}

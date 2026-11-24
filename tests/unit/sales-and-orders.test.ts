import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { customers, saleItems } from '@/db/schema';
import { registerSeller } from '@/modules/auth/service';
import {
  createProduct,
  listCategories,
  updateProduct,
} from '@/modules/catalog/service';
import { createPublicPendingOrder } from '@/modules/orders/service';
import { getOrderIdByCode } from './helpers';
import {
  confirmPendingOrderOneTap,
  recordQuickSale,
  voidSale,
} from '@/modules/sales/service';

describe('Sección E — Venta Rápida, Confirmación 1-Toque y Snapshot Histórico (E1 a E7)', () => {
  it('E2 & E3: registra una venta rápida con precio editable y CONGELA el precio y costo histórico aunque el producto cambie después', async () => {
    const seller = await registerSeller({
      ownerName: 'Hernán Gómez',
      businessName: 'Arepas Don Hernán',
      slug: 'arepas-don-hernan-sales',
      email: 'hernan-sales@marchante.co',
      password: 'password123',
      whatsappPhone: '3112229988',
      category: 'comida_casera',
    });

    const cats = await listCategories(seller.businessId);
    const catId = cats[0]!.id;

    // Producto original: precio $12.000, costo $5.000
    const prod = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Arepa Rellena Mixta',
      priceCop: 12000,
      costCop: 5000,
    });

    // Venta rápida de 2 unidades con precio especial editado a $11.000 c/u
    const saleResult = await recordQuickSale(seller.businessId, {
      paymentMethod: 'nequi',
      newCustomerName: 'Laura Méndez',
      newCustomerPhone: '3104445566',
      items: [
        {
          productId: prod.id,
          quantity: 2,
          unitPriceCop: 11000, // Precio editado al vuelo
        },
      ],
    });

    // Total venta: 2 * 11.000 = 22.000; Costo total: 2 * 5.000 = 10.000; Ganancia: 12.000
    expect(saleResult.sale.totalCop).toBe(22000);
    expect(saleResult.sale.totalCostCop).toBe(10000);
    expect(saleResult.sale.grossProfitCop).toBe(12000);

    // AHORA CAMBIAMOS EL PRECIO Y EL COSTO DEL PRODUCTO EN EL CATÁLOGO
    await updateProduct(seller.businessId, {
      productId: prod.id,
      categoryId: catId,
      name: 'Arepa Rellena Mixta Súper',
      priceCop: 18000,
      costCop: 8500,
    });

    // REGLA CRÍTICA E3: La venta histórica sigue teniendo el snapshot intacto ($11.000 y $5.000)
    await withTenantContext(seller.businessId, async (tx) => {
      const [savedItem] = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleResult.sale.id));

      expect(savedItem?.unitPriceCop).toBe(11000);
      expect(savedItem?.unitCostCop).toBe(5000);
      expect(savedItem?.lineTotalCop).toBe(22000);
      expect(savedItem?.lineProfitCop).toBe(12000);
    });
  });

  it('E4, E5 & E7: confirma con un toque un pedido pendiente de WhatsApp, actualiza el cliente y permite anular una venta', async () => {
    const seller = await registerSeller({
      ownerName: 'Marta Silva',
      businessName: 'Chocolates Doña Marta',
      slug: 'chocolates-dona-marta',
      email: 'marta-confirm@marchante.co',
      password: 'password123',
      whatsappPhone: '3137778899',
      category: 'reposteria',
    });

    const cats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Caja de Trufas de Café (x6)',
      priceCop: 25000,
      costCop: 10000,
    });

    // 1. Cliente pide desde el catálogo público -> queda como PENDING
    const pendingRes = await createPublicPendingOrder({
      businessSlug: 'chocolates-dona-marta',
      clientOrderId: 'order-to-confirm-01',
      customerName: 'Felipe Arias',
      customerPhone: '3201112233',
      deliveryType: 'PICKUP',
      paymentMethod: 'daviplata',
      items: [{ productId: prod.id, quantity: 2 }],
    });

    expect(pendingRes.order.status).toBe('PENDING');

    // 2. El vendedor confirma el pedido con 1 toque desde el panel (E5)
    const confirmed = await confirmPendingOrderOneTap(seller.businessId, {
      orderId: await getOrderIdByCode(seller.businessId, pendingRes.order.orderCode),
    });

    expect(confirmed.order.status).toBe('CONFIRMED');
    expect(confirmed.sale.source).toBe('CATALOG_ORDER');
    expect(confirmed.sale.totalCop).toBe(50000);
    expect(confirmed.sale.grossProfitCop).toBe(30000);

    // 3. El cliente Felipe Arias ahora tiene $50.000 en totalSpentCop y 1 compra confirmada
    await withTenantContext(seller.businessId, async (tx) => {
      const [cust] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, confirmed.sale.customerId!));
      expect(cust?.totalSpentCop).toBe(50000);
      expect(cust?.purchasesCount).toBe(1);
    });

    // 4. Si se anula la venta por error (E7), se marca voidedAt y se descuenta del cliente
    const voided = await voidSale(seller.businessId, {
      saleId: confirmed.sale.id,
      reason: 'Pedido de prueba',
    });
    expect(voided.voidedAt).not.toBeNull();

    await withTenantContext(seller.businessId, async (tx) => {
      const [cust] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, confirmed.sale.customerId!));
      expect(cust?.totalSpentCop).toBe(0);
      expect(cust?.purchasesCount).toBe(0);
    });
  });
});

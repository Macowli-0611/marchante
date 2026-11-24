import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { customers, orderItems, orders } from '@/db/schema';
import { registerSeller } from '@/modules/auth/service';
import {
  createProduct,
  listCategories,
  toggleProductStatus,
} from '@/modules/catalog/service';
import {
  createPublicPendingOrder,
  getPublicCatalogBySlug,
} from '@/modules/orders/service';
import { buildWhatsAppOrderUrl } from '@/modules/orders/whatsapp-message';
import { checkRateLimit, resetRateLimiterForTests } from '@/modules/shared/rate-limiter';

describe('Sección C — Catálogo Público, Carrito, Pedido Pendiente y WhatsApp (C1 a C8)', () => {
  it('C1 & C2: sirve la vitrina pública por /slug excluyendo productos ocultos y conservando los agotados', async () => {
    const seller = await registerSeller({
      ownerName: 'Doña Carmen',
      businessName: 'Amasijos Doña Carmen',
      slug: 'amasijos-dona-carmen',
      email: 'carmen-public@marchante.co',
      password: 'password123',
      whatsappPhone: '3182223344',
      category: 'reposteria',
    });

    const cats = await listCategories(seller.businessId);
    const catId = cats[0]!.id;

    const visibleProd = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Pandebono Valluno Caliente',
      priceCop: 4500,
      costCop: 1800,
    });

    const soldOutProd = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Buñuelo Relleno de Arequipe',
      priceCop: 5000,
      costCop: 2000,
      isSoldOut: true,
    });

    const hiddenProd = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Receta Secreta en Pruebas',
      priceCop: 10000,
      costCop: 4000,
      isHidden: true,
    });

    const catalog = await getPublicCatalogBySlug('amasijos-dona-carmen');
    expect(catalog).not.toBeNull();
    expect(catalog?.business.name).toBe('Amasijos Doña Carmen');

    const publicProducts = catalog!.categories.flatMap((c) => c.products);
    const ids = publicProducts.map((p) => p.id);
    expect(ids).toContain(visibleProd.id);
    expect(ids).toContain(soldOutProd.id);
    expect(ids).not.toContain(hiddenProd.id);
  });

  it('C5, C6, C7 & F1: guarda el pedido como PENDIENTE con snapshot de precio/costo, auto-crea cliente, garantiza idempotencia y genera mensaje WhatsApp', async () => {
    const seller = await registerSeller({
      ownerName: 'Julián Mora',
      businessName: 'Chorizos Don Julián',
      slug: 'chorizos-don-julian',
      email: 'julian-orders@marchante.co',
      password: 'password123',
      whatsappPhone: '3109998877',
      category: 'comida_casera',
    });

    const cats = await listCategories(seller.businessId);
    const prod1 = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Picada Santarrosana Personal',
      priceCop: 22000,
      costCop: 9500,
    });
    const prod2 = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Limonada de Panela con Limón Mandarino',
      priceCop: 6000,
      costCop: 1500,
    });

    const clientOrderId = 'client-uuid-test-1001';
    const orderResult = await createPublicPendingOrder({
      businessSlug: 'chorizos-don-julian',
      clientOrderId,
      customerName: 'Santiago Vélez',
      customerPhone: '300 777 6655',
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Calle 45 # 12-34, Barrio Chapinero',
      paymentMethod: 'nequi',
      notes: 'Traer servilletas y ají aparte por favor',
      items: [
        { productId: prod1.id, quantity: 2, notes: 'Bien asada' },
        { productId: prod2.id, quantity: 1 },
      ],
    });

    expect(orderResult.idempotentReplay).toBe(false);
    expect(orderResult.order.status).toBe('PENDING');
    expect(orderResult.order.orderCode).toBe('M-101');
    // Total = (22.000 * 2) + 6.000 = 50.000 COP
    expect(orderResult.order.totalCop).toBe(50000);
    expect(orderResult.items).toHaveLength(2);
    expect(orderResult.items[0]?.unitPriceCop).toBe(22000);
    // El costo NO viaja al cliente del catálogo, pero sí queda congelado en la base
    expect(orderResult.items[0]).not.toHaveProperty('unitCostCop');
    expect(JSON.stringify(orderResult)).not.toContain('9500');
    await withTenantContext(seller.businessId, async (tx) => {
      const lines = await tx.select().from(orderItems);
      expect(lines.find((l) => l.unitPriceCop === 22000)?.unitCostCop).toBe(9500);
    });

    // Verificar mensaje y URL de WhatsApp (C7)
    expect(orderResult.whatsappUrl).toContain('https://wa.me/573109998877?text=');
    expect(orderResult.whatsappMessage).toContain('NUEVO PEDIDO #M-101');
    expect(orderResult.whatsappMessage).toContain('Picada Santarrosana Personal × 2');
    expect(orderResult.whatsappMessage).toContain('$ 50.000');
    expect(orderResult.whatsappMessage).toContain('Santiago Vélez');
    expect(orderResult.whatsappMessage).toContain('Calle 45 # 12-34');

    // Verificar que el cliente se haya creado automáticamente en la base de clientes (F1)
    await withTenantContext(seller.businessId, async (tx) => {
      const custRows = await tx.select().from(customers);
      expect(custRows).toHaveLength(1);
      expect(custRows[0]?.name).toBe('Santiago Vélez');
      expect(custRows[0]?.phone).toBe('3007776655');
    });

    // C8: Reintento idempotente con el mismo clientOrderId NO duplica el pedido
    const replay = await createPublicPendingOrder({
      businessSlug: 'chorizos-don-julian',
      clientOrderId,
      customerName: 'Santiago Vélez',
      customerPhone: '300 777 6655',
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Calle 45 # 12-34, Barrio Chapinero',
      paymentMethod: 'nequi',
      items: [
        { productId: prod1.id, quantity: 2 },
        { productId: prod2.id, quantity: 1 },
      ],
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.order.orderCode).toBe(orderResult.order.orderCode);

    await withTenantContext(seller.businessId, async (tx) => {
      const allOrders = await tx.select().from(orders).where(eq(orders.businessId, seller.businessId));
      expect(allOrders).toHaveLength(1);
    });
  });

  it('C8: bloquea pedidos de productos agotados, bots que llenan el honeypot y exceso de peticiones en el rate limiter', async () => {
    const seller = await registerSeller({
      ownerName: 'Patricia Cano',
      businessName: 'Helados Paty',
      slug: 'helados-paty',
      email: 'paty-spam@marchante.co',
      password: 'password123',
      whatsappPhone: '3154443322',
      category: 'reposteria',
    });

    const cats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Helado de Paila de Mora',
      priceCop: 7000,
      costCop: 2500,
    });

    // 1. Honeypot lleno -> rechazado por anti-spam
    await expect(
      createPublicPendingOrder({
        businessSlug: 'helados-paty',
        clientOrderId: 'spam-bot-order-1',
        customerName: 'Bot Spam',
        websiteHoneypot: 'http://spam-casino.example.com',
        items: [{ productId: prod.id, quantity: 1 }],
      }),
    ).rejects.toThrow(/protección anti-spam/);

    // 2. Producto agotado -> rechazado en servidor
    await toggleProductStatus(seller.businessId, { productId: prod.id, isSoldOut: true });
    await expect(
      createPublicPendingOrder({
        businessSlug: 'helados-paty',
        clientOrderId: 'sold-out-order-2',
        customerName: 'Cliente Real',
        items: [{ productId: prod.id, quantity: 1 }],
      }),
    ).rejects.toThrow(/está agotado por hoy/);

    // 3. Rate limiter -> permite hasta maxRequests y bloquea la siguiente
    resetRateLimiterForTests();
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit({
        key: 'test-ip:helados-paty',
        windowMs: 60_000,
        maxRequests: 3,
      });
      expect(r.allowed).toBe(true);
    }
    const blocked = checkRateLimit({
      key: 'test-ip:helados-paty',
      windowMs: 60_000,
      maxRequests: 3,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // 4. Sanitización de markdown malicioso en WhatsApp
    const wa = buildWhatsAppOrderUrl({
      orderCode: 'M-202',
      businessName: 'Helados *Paty*',
      businessWhatsapp: '3154443322',
      customerName: 'Pedro _Pérez_',
      deliveryType: 'PICKUP',
      paymentMethodLabel: 'Efectivo',
      totalCop: 7000,
      items: [
        {
          productName: 'Helado de Mora',
          quantity: 1,
          unitPriceCop: 7000,
          lineTotalCop: 7000,
        },
      ],
    });
    expect(wa.message).toContain('Pedro Pérez');
  });
});

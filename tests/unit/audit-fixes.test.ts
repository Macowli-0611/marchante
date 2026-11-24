import { afterEach, describe, expect, it, vi } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { withSystemDb, withTenantContext } from '@/db';
import { customers, orders, sales, users } from '@/db/schema';
import { registerSeller } from '@/modules/auth/service';
import { revokeAllSessions } from '@/modules/auth/session';
import { evaluateBusinessOpenStatus } from '@/modules/business/schedule';
import { getBusinessProfile, updateBusinessProfile } from '@/modules/business/service';
import { createProduct, listCategories } from '@/modules/catalog/service';
import { createProductSchema } from '@/modules/catalog/validators';
import { getDailySummary } from '@/modules/analytics/daily-summary';
import { getFinanceLedger, listExpenseCategories, recordFinancialMovement } from '@/modules/finance/service';
import {
  createPublicPendingOrder,
  getPublicCatalogBySlug,
  resolvePublicSlugRedirect,
} from '@/modules/orders/service';
import { confirmPendingOrderOneTap, recordQuickSale, voidSale } from '@/modules/sales/service';
import { AppError, toErrorResponse } from '@/modules/shared/errors';
import { checkSharedRateLimit, getClientIp } from '@/modules/shared/rate-limiter';
import { buildBogotaInstant } from './time-helpers';
import { getOrderIdByCode } from './helpers';

let counter = 0;
async function newSeller(prefix: string) {
  counter += 1;
  const slug = `${prefix}-${counter}-${Date.now().toString(36)}`;
  const seller = await registerSeller({
    ownerName: 'Prueba Auditoría',
    businessName: `Negocio ${slug}`,
    slug,
    email: `${slug}@marchante.co`,
    password: 'clave-segura-2026',
    whatsappPhone: '3001234567',
    category: 'reposteria',
  });
  const [cat] = await listCategories(seller.businessId);
  const product = await createProduct(seller.businessId, {
    categoryId: cat!.id,
    name: 'Arepa de prueba',
    priceCop: 10000,
    costCop: 4000,
  });
  return { seller, product };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Auditoría 21-nov — correcciones', () => {
  it('la vitrina pública y la respuesta del pedido NO exponen costos ni ids internos', async () => {
    const { seller, product } = await newSeller('fuga');
    const catalog = await getPublicCatalogBySlug(seller.slug);
    const publicProduct = catalog!.categories[0]!.products[0]!;
    expect(Object.keys(publicProduct).sort()).toEqual(
      ['categoryId', 'description', 'id', 'imageUrl', 'isSoldOut', 'name', 'priceCop'].sort(),
    );
    expect(JSON.stringify(catalog)).not.toContain('costCop');

    const result = await createPublicPendingOrder({
      businessSlug: seller.slug,
      clientOrderId: `fuga-${product.id}`,
      customerName: 'Cliente Uno',
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 1 }],
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain('unitCostCop');
    expect(json).not.toContain(seller.businessId);
    expect(json).not.toContain('"id"');
  });

  it('rechaza métodos de pago desactivados por el vendedor', async () => {
    const { seller, product } = await newSeller('pago');
    // 'card' viene desactivado por defecto
    await expect(
      createPublicPendingOrder({
        businessSlug: seller.slug,
        clientOrderId: 'pago-desactivado-01',
        customerName: 'Cliente Dos',
        paymentMethod: 'card',
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ).rejects.toThrow(/método de pago no está disponible/);
  });

  it('un pedido público no sobrescribe el nombre ni la dirección del cliente que tenía el vendedor', async () => {
    const { seller, product } = await newSeller('crm');
    await recordQuickSale(seller.businessId, {
      paymentMethod: 'cash',
      newCustomerName: 'Camila Real',
      newCustomerPhone: '3154448899',
      items: [{ productId: product.id, quantity: 1 }],
    });
    await withTenantContext(seller.businessId, (tx) =>
      tx.update(customers).set({ address: 'Dirección verdadera' }).where(eq(customers.phone, '3154448899')),
    );

    await createPublicPendingOrder({
      businessSlug: seller.slug,
      clientOrderId: 'crm-ataque-0001',
      customerName: 'Nombre Falso',
      customerPhone: '3154448899',
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Dirección del atacante',
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 1 }],
    });

    const [cust] = await withTenantContext(seller.businessId, (tx) =>
      tx.select().from(customers).where(eq(customers.phone, '3154448899')),
    );
    expect(cust!.name).toBe('Camila Real');
    expect(cust!.address).toBe('Dirección verdadera');
  });

  it('repetir un clientOrderId con otros datos no revela el pedido ajeno', async () => {
    const { seller, product } = await newSeller('replay');
    await createPublicPendingOrder({
      businessSlug: seller.slug,
      clientOrderId: 'replay-original-01',
      customerName: 'Sebastián Mejía',
      customerPhone: '3186665544',
      deliveryType: 'DELIVERY',
      deliveryAddress: 'Calle 14 # 8-45',
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 1 }],
    });
    await expect(
      createPublicPendingOrder({
        businessSlug: seller.slug,
        clientOrderId: 'replay-original-01',
        customerName: 'Curioso',
        paymentMethod: 'cash',
        items: [{ productId: product.id, quantity: 1 }],
      }),
    ).rejects.toThrow(/ya fue enviado/);
  });

  it('el rol marchante_tenant ya no puede leer la tabla de usuarios', async () => {
    const { seller } = await newSeller('rol');
    await expect(
      withTenantContext(seller.businessId, async (tx) => {
        await tx.execute(sql`select count(*) from users`);
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it('consecutivos atómicos: pedidos simultáneos reciben códigos distintos', async () => {
    const { seller, product } = await newSeller('seq');
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        createPublicPendingOrder({
          businessSlug: seller.slug,
          clientOrderId: `seq-concurrente-${i}`,
          customerName: `Cliente ${i}`,
          paymentMethod: 'cash',
          items: [{ productId: product.id, quantity: 1 }],
        }),
      ),
    );
    const codes = new Set(results.map((r) => r.order.orderCode));
    expect(codes.size).toBe(6);
  });

  it('confirmar dos veces el mismo pedido crea UNA sola venta', async () => {
    const { seller, product } = await newSeller('doble');
    const pending = await createPublicPendingOrder({
      businessSlug: seller.slug,
      clientOrderId: 'doble-toque-0001',
      customerName: 'Felipe',
      customerPhone: '3201112233',
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 2 }],
    });
    const orderId = await getOrderIdByCode(seller.businessId, pending.order.orderCode);
    const outcomes = await Promise.allSettled([
      confirmPendingOrderOneTap(seller.businessId, { orderId }),
      confirmPendingOrderOneTap(seller.businessId, { orderId }),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
    const saleRows = await withTenantContext(seller.businessId, (tx) =>
      tx.select().from(sales).where(eq(sales.orderId, orderId)),
    );
    expect(saleRows).toHaveLength(1);
  });

  it('anular la venta de un pedido revierte el pedido y los totales del cliente', async () => {
    const { seller, product } = await newSeller('anular');
    const pending = await createPublicPendingOrder({
      businessSlug: seller.slug,
      clientOrderId: 'anular-pedido-01',
      customerName: 'Valentina',
      customerPhone: '3207773344',
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 1 }],
    });
    const orderId = await getOrderIdByCode(seller.businessId, pending.order.orderCode);
    const confirmed = await confirmPendingOrderOneTap(seller.businessId, { orderId });
    await voidSale(seller.businessId, { saleId: confirmed.sale.id, reason: 'Error de digitación' });

    await withTenantContext(seller.businessId, async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      expect(order!.status).toBe('CANCELLED');
      const [cust] = await tx.select().from(customers).where(eq(customers.phone, '3207773344'));
      expect(cust!.totalSpentCop).toBe(0);
      expect(cust!.purchasesCount).toBe(0);
      expect(cust!.lastPurchaseAt).toBeNull();
    });
  });

  it('las compras de insumos no se restan dos veces de la ganancia', async () => {
    const { seller, product } = await newSeller('insumos');
    // Venta: 10.000 con costo 4.000 → ganancia bruta 6.000
    await recordQuickSale(seller.businessId, {
      paymentMethod: 'cash',
      items: [{ productId: product.id, quantity: 1 }],
    });
    const cats = await listExpenseCategories(seller.businessId);
    const insumos = cats.find((c) => c.name === 'Materia prima e insumos')!;
    const arriendo = cats.find((c) => c.name === 'Servicios y arriendo')!;
    expect(insumos.isProductCost).toBe(true);
    expect(arriendo.isProductCost).toBe(false);

    await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      categoryId: insumos.id,
      amountCop: 3000,
      description: 'Harina y queso',
    });
    await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      categoryId: arriendo.id,
      amountCop: 1000,
      description: 'Parte del arriendo',
    });

    const summary = await getDailySummary(seller.businessId);
    expect(summary.metrics.expensesCop).toBe(4000);
    expect(summary.metrics.productCostPurchasesCop).toBe(3000);
    expect(summary.metrics.operatingExpensesCop).toBe(1000);
    expect(summary.metrics.netProfitCop).toBe(5000); // 6.000 − 1.000

    const ledger = await getFinanceLedger(seller.businessId, { period: 'today' });
    expect(ledger.totals.netProfitAfterExpensesCop).toBe(5000);
    expect(ledger.totals.netCashBalanceCop).toBe(6000); // caja: 10.000 − 4.000
  });

  it('el horario que cruza la medianoche sigue abierto en la madrugada', () => {
    const closed = { isOpen: false, openTime: '09:00', closeTime: '17:00' };
    const schedule = {
      lun: closed,
      mar: closed,
      mie: closed,
      jue: closed,
      vie: { isOpen: true, openTime: '18:00', closeTime: '01:00' },
      sab: closed,
      dom: closed,
    };
    // Sábado 00:30 en Bogotá (horario del viernes)
    const status = evaluateBusinessOpenStatus(schedule, buildBogotaInstant('sab', 0, 30));
    expect(status.isOpen).toBe(true);
    // Sábado 01:30 → ya cerró
    expect(evaluateBusinessOpenStatus(schedule, buildBogotaInstant('sab', 1, 30)).isOpen).toBe(false);
    // Viernes 23:00 → abierto
    expect(evaluateBusinessOpenStatus(schedule, buildBogotaInstant('vie', 23, 0)).isOpen).toBe(true);
    // Viernes 00:30 (madrugada del jueves, que está cerrado) → cerrado
    expect(evaluateBusinessOpenStatus(schedule, buildBogotaInstant('vie', 0, 30)).isOpen).toBe(false);
  });

  it('cambiar el slug redirige el link viejo y nadie más puede tomarlo', async () => {
    const { seller } = await newSeller('slug');
    const profile = await getBusinessProfile(seller.businessId);
    const newSlug = `${seller.slug}-nuevo`;
    await updateBusinessProfile(seller.businessId, {
      name: profile.name,
      ownerName: profile.ownerName,
      slug: newSlug,
      description: profile.description,
      category: profile.category,
      whatsappPhone: profile.whatsappPhone,
      address: profile.address,
      city: profile.city,
      latitude: profile.latitude,
      longitude: profile.longitude,
      schedule: profile.schedule,
      paymentMethods: profile.paymentMethods,
      socialLinks: profile.socialLinks,
    });

    expect(await resolvePublicSlugRedirect(seller.slug)).toBe(newSlug);
    await expect(
      registerSeller({
        ownerName: 'Suplantador',
        businessName: 'Suplantador',
        slug: seller.slug,
        email: `suplantador-${counter}@marchante.co`,
        password: 'clave-segura-2026',
        whatsappPhone: '3009998877',
        category: 'reposteria',
      }),
    ).rejects.toThrow(/ya está ocupado/);
  });

  it('los negocios nuevos no nacen con dirección inventada', async () => {
    const { seller } = await newSeller('direccion');
    const profile = await getBusinessProfile(seller.businessId);
    expect(profile.address).toBe('');
    expect(profile.whatsappPhone).toBe('573001234567');
  });

  it('revocar sesiones sube la versión de sesión del usuario', async () => {
    const { seller } = await newSeller('sesion');
    const [before] = await withSystemDb((db) =>
      db.select().from(users).where(eq(users.id, seller.userId)),
    );
    const next = await revokeAllSessions(seller.userId);
    expect(next).toBe(before!.sessionVersion + 1);
  });

  it('solo acepta imágenes de nuestro almacenamiento', () => {
    const base = { categoryId: crypto.randomUUID(), name: 'Producto', priceCop: 1000 };
    expect(createProductSchema.safeParse({ ...base, imageUrl: '/media/products/x/a.webp' }).success).toBe(true);
    expect(createProductSchema.safeParse({ ...base, imageUrl: 'https://rastreo.example/pixel.gif' }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, imageUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('los errores de base de datos no se muestran al usuario', async () => {
    const dbError = Object.assign(new Error('duplicate key value violates unique constraint "users_email_idx"'), {
      code: '23505',
    });
    const res = toErrorResponse(dbError, 'Algo falló');
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain('users_email_idx');

    const internal = toErrorResponse(new TypeError("Cannot read properties of undefined (reading 'id')"), 'Algo falló');
    expect((await internal.json()).error).toBe('Algo falló');

    const domain = toErrorResponse(new AppError('Mensaje para el usuario', 403), 'x');
    expect(domain.status).toBe(403);
  });

  it('la IP del límite de intentos no se puede falsificar con X-Forwarded-For', () => {
    const spoofed = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 200.10.10.10' } });
    expect(getClientIp(spoofed)).toBe('200.10.10.10');
    const behindVercel = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '181.50.1.1' },
    });
    expect(getClientIp(behindVercel)).toBe('181.50.1.1');
  });

  it('el límite compartido bloquea al pasar el máximo', async () => {
    const key = `prueba-limite-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      expect((await checkSharedRateLimit({ key, windowMs: 60_000, maxRequests: 3 })).allowed).toBe(true);
    }
    const blocked = await checkSharedRateLimit({ key, windowMs: 60_000, maxRequests: 3 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('en producción exige AUTH_SECRET propio y apaga la demo', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', 'marchante-dev-local-secret-key-colombia-2026-seguro');
    vi.resetModules();
    const sessionMod = await import('@/modules/auth/session');
    expect(() => sessionMod.getJwtSecretKey()).toThrow(/AUTH_SECRET/);

    vi.stubEnv('AUTH_SECRET', '');
    vi.resetModules();
    const sessionMod2 = await import('@/modules/auth/session');
    expect(() => sessionMod2.getJwtSecretKey()).toThrow(/AUTH_SECRET/);

    const demoMod = await import('@/modules/auth/demo');
    expect(demoMod.isDemoEnabled()).toBe(false);
    vi.stubEnv('ENABLE_DEMO', 'true');
    expect(demoMod.isDemoEnabled()).toBe(true);
  });

  it('las ventas por un mismo teléfono se juntan en un solo cliente', async () => {
    const { seller, product } = await newSeller('dedupe');
    for (let i = 0; i < 2; i++) {
      await recordQuickSale(seller.businessId, {
        paymentMethod: 'cash',
        newCustomerName: 'Don Jorge',
        newCustomerPhone: '310 555 1122',
        items: [{ productId: product.id, quantity: 1 }],
      });
    }
    const rows = await withTenantContext(seller.businessId, (tx) =>
      tx
        .select()
        .from(customers)
        .where(and(eq(customers.businessId, seller.businessId), eq(customers.phone, '3105551122'))),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.purchasesCount).toBe(2);
    expect(rows[0]!.totalSpentCop).toBe(20000);
  });
});

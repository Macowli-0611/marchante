import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { normalizeSocialHandleOrUrl } from '@/modules/business/validators';
import { optimizeAndSaveWebpImage } from '@/modules/catalog/image-optimizer';
import {
  createProduct,
  listCategories,
  updateProduct,
} from '@/modules/catalog/service';
import { updateProductCosting } from '@/modules/catalog/costing';
import { createCustomer, getCustomerDetailWithHistory } from '@/modules/customers/service';
import {
  recordFinancialMovement,
  voidFinancialMovement,
} from '@/modules/finance/service';
import { createPublicPendingOrder } from '@/modules/orders/service';
import { getOrderIdByCode } from './helpers';
import {
  confirmPendingOrderOneTap,
  recordQuickSale,
  voidSale,
} from '@/modules/sales/service';

describe('Fase 13 — Auditoría de Seguridad, Permisos Multi-Tenant (BOLA/IDOR) y Límites de Dinero', () => {
  it('bloquea esquemas XSS (javascript:, data:, vbscript:) en enlaces de redes sociales y página web', () => {
    expect(() => normalizeSocialHandleOrUrl('javascript:alert(1)', 'website')).toThrow(
      /no permitido por seguridad/,
    );
    expect(() => normalizeSocialHandleOrUrl('data:text/html,<script>', 'instagram')).toThrow(
      /no permitido por seguridad/,
    );
    expect(() => normalizeSocialHandleOrUrl('vbscript:msgbox(1)', 'tiktok')).toThrow(
      /no permitido por seguridad/,
    );
  });

  it('bloquea intentos de Path Traversal en businessId del optimizador de imágenes y archivos corruptos', async () => {
    await expect(
      optimizeAndSaveWebpImage({
        buffer: Buffer.from('not-an-image'),
        mimeType: 'image/png',
        businessId: '../../../etc/passwd',
      }),
    ).rejects.toThrow(/Identificador de negocio inválido/);

    await expect(
      optimizeAndSaveWebpImage({
        buffer: Buffer.from('fake-corrupted-binary-payload'),
        mimeType: 'image/png',
        businessId: '11111111-2222-3333-4444-555555555555',
      }),
    ).rejects.toThrow();
  });

  it('impide ataques BOLA / IDOR cruzados entre vendedores en productos, pedidos, ventas, clientes, costos y gastos', async () => {
    const attacker = await registerSeller({
      ownerName: 'Atacante Tenant 1',
      businessName: 'Tienda Atacante',
      slug: 'tienda-atacante-sec',
      email: 'atacante-sec@marchante.co',
      password: 'password123',
      whatsappPhone: '3001110001',
      category: 'tecnologia_otros',
    });

    const victim = await registerSeller({
      ownerName: 'Víctima Tenant 2',
      businessName: 'Tienda Víctima',
      slug: 'tienda-victima-sec',
      email: 'victima-sec@marchante.co',
      password: 'password123',
      whatsappPhone: '3001110002',
      category: 'reposteria',
    });

    const victimCats = await listCategories(victim.businessId);
    const victimProd = await createProduct(victim.businessId, {
      categoryId: victimCats[0]!.id,
      name: 'Postre Exclusivo Víctima',
      priceCop: 15000,
      costCop: 6000,
    });

    const victimCustomer = await createCustomer(victim.businessId, {
      name: 'Cliente Privado Víctima',
      phone: '3109991111',
    });

    const victimOrder = await createPublicPendingOrder({
      businessSlug: victim.slug,
      clientOrderId: 'victim-order-sec-1',
      customerName: 'Cliente Privado Víctima',
      customerPhone: '3109991111',
      items: [{ productId: victimProd.id, quantity: 1 }],
    });

    const victimSale = await recordQuickSale(victim.businessId, {
      paymentMethod: 'cash',
      items: [{ productId: victimProd.id, quantity: 1 }],
    });

    const victimExpense = await recordFinancialMovement(victim.businessId, {
      kind: 'EXPENSE',
      amountCop: 10000,
      description: 'Gasto privado víctima',
    });

    const attackerCats = await listCategories(attacker.businessId);

    // 1. El atacante no puede editar el producto ni el costeo de la víctima
    await expect(
      updateProduct(attacker.businessId, {
        productId: victimProd.id,
        categoryId: attackerCats[0]!.id,
        name: 'Hackeado',
        priceCop: 100,
      }),
    ).rejects.toThrow(/Producto no encontrado/);

    await expect(
      updateProductCosting(attacker.businessId, {
        productId: victimProd.id,
        priceCop: 100,
        costCop: 50,
      }),
    ).rejects.toThrow(/Producto no encontrado/);

    // 2. El atacante no puede confirmar el pedido pendiente de la víctima
    await expect(
      confirmPendingOrderOneTap(attacker.businessId, {
        orderId: await getOrderIdByCode(victim.businessId, victimOrder.order.orderCode),
      }),
    ).rejects.toThrow(/El pedido no existe/);

    // 3. El atacante no puede anular la venta ni el gasto de la víctima
    await expect(
      voidSale(attacker.businessId, {
        saleId: victimSale.sale.id,
        reason: 'Sabotaje',
      }),
    ).rejects.toThrow(/Venta no encontrada/);

    await expect(
      voidFinancialMovement(attacker.businessId, {
        movementId: victimExpense.id,
        reason: 'Sabotaje',
      }),
    ).rejects.toThrow(/Movimiento no encontrado/);

    // 4. El atacante no puede leer el historial del cliente de la víctima
    await expect(
      getCustomerDetailWithHistory(attacker.businessId, victimCustomer.id),
    ).rejects.toThrow(/Cliente no encontrado/);
  });

  it('previene desbordamiento de enteros (overflow > MAX_COP_AMOUNT) al multiplicar precio por cantidad en ventas', async () => {
    const seller = await registerSeller({
      ownerName: 'Vendedor Overflow',
      businessName: 'Tienda Overflow',
      slug: 'tienda-overflow-sec',
      email: 'overflow-sec@marchante.co',
      password: 'password123',
      whatsappPhone: '3009990000',
      category: 'tecnologia_otros',
    });

    const cats = await listCategories(seller.businessId);
    const expensiveProd = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Maquinaria Industrial',
      priceCop: 20_000_000,
      costCop: 10_000_000,
    });

    // 20 millones * 100 unidades = 2.000 millones (> MAX_COP_AMOUNT 999.999.999)
    await expect(
      recordQuickSale(seller.businessId, {
        paymentMethod: 'transfer',
        items: [{ productId: expensiveProd.id, quantity: 100 }],
      }),
    ).rejects.toThrow(/supera el límite permitido/);
  });
});

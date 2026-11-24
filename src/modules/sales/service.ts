import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { withTenantContext, type MarchanteDb } from '@/db';
import {
  businesses,
  categories,
  customers,
  orderItems,
  orders,
  products,
  saleItems,
  sales,
} from '@/db/schema';
import { getBogotaParts } from '@/modules/shared/bogota-time';
import { assertIntegerCop } from '@/modules/shared/currency';
import { AppError } from '@/modules/shared/errors';
import {
  cancelPendingOrderSchema,
  confirmPendingOrderSchema,
  recordQuickSaleSchema,
  voidSaleSchema,
  type CancelPendingOrderInput,
  type ConfirmPendingOrderInput,
  type RecordQuickSaleInput,
  type VoidSaleInput,
} from './validators';

/** Reserva el siguiente consecutivo de venta de forma atómica (#V-101). */
async function reserveSaleSequence(tx: MarchanteDb, businessId: string): Promise<number> {
  const [row] = await tx
    .update(businesses)
    .set({ nextSaleSeq: sql`${businesses.nextSaleSeq} + 1`, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();
  if (!row) throw new AppError('Negocio no encontrado.', 404);
  return row.nextSaleSeq - 1;
}

/** Suma (o resta) una compra al cliente con un UPDATE atómico, sin leer-y-escribir. */
async function applyCustomerPurchase(
  tx: MarchanteDb,
  businessId: string,
  customerId: string,
  deltaCop: number,
  deltaCount: number,
  lastPurchaseAt?: Date,
) {
  await tx
    .update(customers)
    .set({
      totalSpentCop: sql`GREATEST(0, ${customers.totalSpentCop} + ${deltaCop})`,
      purchasesCount: sql`GREATEST(0, ${customers.purchasesCount} + ${deltaCount})`,
      ...(lastPurchaseAt
        ? { lastPurchaseAt: sql`GREATEST(COALESCE(${customers.lastPurchaseAt}, ${lastPurchaseAt}), ${lastPurchaseAt})` }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));
}

/**
 * Registra una Venta Rápida en un par de toques (Requisitos E2, E3, F1).
 * - Respeta el precio unitario editable (`unitPriceCop`) enviado por el vendedor.
 * - Congela una foto inmutable del precio (`unit_price_cop`) y del costo (`unit_cost_cop`)
 *   vigentes al instante de la venta en `sale_items`.
 * - Define `business_date` y `bogota_hour` estrictamente en zona horaria `America/Bogota`.
 * - Si se asocia un cliente (existente o nuevo), actualiza su total gastado y última compra.
 */
export async function recordQuickSale(businessId: string, rawInput: RecordQuickSaleInput) {
  const input = recordQuickSaleSchema.parse(rawInput);
  const saleInstant = input.soldAt ?? new Date();
  const bogota = getBogotaParts(saleInstant);

  return withTenantContext(businessId, async (tx) => {
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const dbProducts = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          inArray(products.id, productIds),
          isNull(products.archivedAt),
        ),
      );

    const dbCategories = await tx
      .select()
      .from(categories)
      .where(eq(categories.businessId, businessId));

    const catNameById = new Map(dbCategories.map((c) => [c.id, c.name]));
    const prodById = new Map(dbProducts.map((p) => [p.id, p]));

    let totalCop = 0;
    let totalCostCop = 0;

    const preparedLines: Array<{
      productId: string;
      productNameSnapshot: string;
      categoryNameSnapshot: string;
      quantity: number;
      unitPriceCop: number;
      unitCostCop: number;
      lineTotalCop: number;
      lineProfitCop: number;
    }> = [];

    for (const item of input.items) {
      const dbProd = prodById.get(item.productId);
      if (!dbProd) {
        throw new AppError('Uno de los productos seleccionados ya no existe o fue archivado.');
      }

      // Precio editable en la venta rápida; si no se editó, toma el precio actual del producto
      const effectiveUnitPriceCop =
        typeof item.unitPriceCop === 'number' ? item.unitPriceCop : dbProd.priceCop;
      const effectiveUnitCostCop = dbProd.costCop;

      const lineTotalCop = assertIntegerCop(
        effectiveUnitPriceCop * item.quantity,
        'subtotal de la línea',
      );
      const lineCostCop = assertIntegerCop(
        effectiveUnitCostCop * item.quantity,
        'costo de la línea',
      );
      const lineProfitCop = lineTotalCop - lineCostCop;

      totalCop = assertIntegerCop(totalCop + lineTotalCop, 'total de la venta');
      totalCostCop = assertIntegerCop(totalCostCop + lineCostCop, 'costo total de la venta');

      preparedLines.push({
        productId: dbProd.id,
        productNameSnapshot: dbProd.name,
        categoryNameSnapshot: catNameById.get(dbProd.categoryId) || 'General',
        quantity: item.quantity,
        unitPriceCop: effectiveUnitPriceCop,
        unitCostCop: effectiveUnitCostCop,
        lineTotalCop,
        lineProfitCop,
      });
    }

    const grossProfitCop = totalCop - totalCostCop;

    // Resolver cliente opcional (existente o creado al vuelo)
    let resolvedCustomerId: string | null = input.customerId ?? null;
    let customerNameSnapshot: string | null = null;

    if (resolvedCustomerId) {
      const [existingCust] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, resolvedCustomerId), eq(customers.businessId, businessId)))
        .limit(1);

      if (existingCust) {
        customerNameSnapshot = existingCust.name;
        await applyCustomerPurchase(tx, businessId, existingCust.id, totalCop, 1, saleInstant);
      } else {
        resolvedCustomerId = null;
      }
    } else if (input.newCustomerName?.trim()) {
      const cleanName = input.newCustomerName.trim();
      const cleanPhone = (input.newCustomerPhone || '').replace(/\D/g, '') || null;
      customerNameSnapshot = cleanName;

      // Mismo criterio que el catálogo público: un teléfono = un cliente.
      const [samePhone] = cleanPhone
        ? await tx
            .select()
            .from(customers)
            .where(and(eq(customers.businessId, businessId), eq(customers.phone, cleanPhone)))
            .limit(1)
        : [];

      if (samePhone) {
        resolvedCustomerId = samePhone.id;
        customerNameSnapshot = samePhone.name;
        await applyCustomerPurchase(tx, businessId, samePhone.id, totalCop, 1, saleInstant);
      } else {
        const [createdCust] = await tx
          .insert(customers)
          .values({
            businessId,
            name: cleanName,
            phone: cleanPhone,
            totalSpentCop: totalCop,
            purchasesCount: 1,
            lastPurchaseAt: saleInstant,
          })
          .returning();
        resolvedCustomerId = createdCust?.id ?? null;
      }
    }

    const saleCode = `V-${await reserveSaleSequence(tx, businessId)}`;

    const [createdSale] = await tx
      .insert(sales)
      .values({
        businessId,
        customerId: resolvedCustomerId,
        saleCode,
        source: 'QUICK_SALE',
        paymentMethod: input.paymentMethod,
        customerNameSnapshot,
        totalCop,
        totalCostCop,
        grossProfitCop,
        notes: input.notes || '',
        soldAt: saleInstant,
        businessDate: bogota.dateString,
        bogotaHour: bogota.hour,
      })
      .returning();

    const insertedItems = await tx
      .insert(saleItems)
      .values(
        preparedLines.map((line) => ({
          saleId: createdSale!.id,
          businessId,
          ...line,
        })),
      )
      .returning();

    return {
      sale: createdSale!,
      items: insertedItems,
    };
  });
}

/**
 * Confirma con UN SOLO TOQUE un pedido pendiente recibido del catálogo público
 * y lo convierte en venta confirmada (Requisitos E4, E5, E3, F1).
 */
export async function confirmPendingOrderOneTap(
  businessId: string,
  rawInput: ConfirmPendingOrderInput,
) {
  const input = confirmPendingOrderSchema.parse(rawInput);
  const confirmInstant = input.confirmedAt ?? new Date();
  const bogota = getBogotaParts(confirmInstant);

  return withTenantContext(businessId, async (tx) => {
    // FOR UPDATE: si llegan dos confirmaciones a la vez (doble toque, dos celulares,
    // reintento por mala señal), la segunda espera y luego ve el pedido ya CONFIRMED.
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.businessId, businessId)))
      .limit(1)
      .for('update');

    if (!order) {
      throw new AppError('El pedido no existe.', 404);
    }
    if (order.status === 'CONFIRMED') {
      throw new AppError('Este pedido ya fue confirmado anteriormente.', 409);
    }
    if (order.status === 'CANCELLED') {
      throw new AppError('No se puede confirmar un pedido que fue cancelado.', 409);
    }

    const lines = await tx
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.orderId, order.id), eq(orderItems.businessId, businessId)));

    if (lines.length === 0) {
      throw new Error('El pedido no tiene productos asociados.');
    }

    const [business] = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const saleCode = `V-${await reserveSaleSequence(tx, businessId)}`;

    let totalCop = 0;
    let totalCostCop = 0;

    const saleLinesToInsert = lines.map((line) => {
      const lineTotal = line.unitPriceCop * line.quantity;
      const lineCost = line.unitCostCop * line.quantity;
      const lineProfit = lineTotal - lineCost;
      totalCop += lineTotal;
      totalCostCop += lineCost;

      return {
        businessId,
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        categoryNameSnapshot: line.categoryNameSnapshot,
        quantity: line.quantity,
        unitPriceCop: line.unitPriceCop,
        unitCostCop: line.unitCostCop,
        lineTotalCop: lineTotal,
        lineProfitCop: lineProfit,
      };
    });

    const grossProfitCop = totalCop - totalCostCop;
    const finalPaymentMethod = input.paymentMethod ?? order.paymentMethod;
    if (
      input.paymentMethod &&
      !business?.paymentMethods.some((m) => m.code === input.paymentMethod && m.enabled)
    ) {
      throw new AppError('Ese método de pago no está activo en tu negocio.');
    }

    // Si el pedido aún no tenía customerId pero sí nombre, creamos o vinculamos el cliente
    let customerId = order.customerId;
    if (customerId) {
      const [cust] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
        .limit(1);

      if (cust) {
        await applyCustomerPurchase(tx, businessId, cust.id, totalCop, 1, confirmInstant);
      } else {
        customerId = null;
      }
    } else if (order.customerName.trim()) {
      const [newCust] = await tx
        .insert(customers)
        .values({
          businessId,
          name: order.customerName.trim(),
          phone: order.customerPhone || null,
          address: order.deliveryAddress || '',
          totalSpentCop: totalCop,
          purchasesCount: 1,
          lastPurchaseAt: confirmInstant,
        })
        .returning();
      customerId = newCust?.id ?? null;
    }

    const [createdSale] = await tx
      .insert(sales)
      .values({
        businessId,
        customerId,
        orderId: order.id,
        saleCode,
        source: 'CATALOG_ORDER',
        paymentMethod: finalPaymentMethod,
        customerNameSnapshot: order.customerName,
        totalCop,
        totalCostCop,
        grossProfitCop,
        notes: order.notes,
        soldAt: confirmInstant,
        businessDate: bogota.dateString,
        bogotaHour: bogota.hour,
      })
      .returning();

    const insertedSaleItems = await tx
      .insert(saleItems)
      .values(
        saleLinesToInsert.map((l) => ({
          ...l,
          saleId: createdSale!.id,
        })),
      )
      .returning();

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: 'CONFIRMED',
        confirmedSaleId: createdSale!.id,
        confirmedAt: confirmInstant,
        customerId,
      })
      .where(eq(orders.id, order.id))
      .returning();

    return {
      order: updatedOrder!,
      sale: createdSale!,
      items: insertedSaleItems,
    };
  });
}

/**
 * Cancela un pedido pendiente que no se concretó.
 */
export async function cancelPendingOrder(
  businessId: string,
  rawInput: CancelPendingOrderInput,
) {
  const input = cancelPendingOrderSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.orderId), eq(orders.businessId, businessId)))
      .limit(1)
      .for('update');

    if (!order) {
      throw new AppError('Pedido no encontrado.', 404);
    }
    if (order.status !== 'PENDING') {
      throw new AppError('Solo se pueden cancelar pedidos que estén pendientes.', 409);
    }

    const [updated] = await tx
      .update(orders)
      .set({
        status: 'CANCELLED',
        cancelReason: input.reason,
      })
      .where(eq(orders.id, order.id))
      .returning();

    return updated!;
  });
}

/**
 * Anula una venta registrada por error dejando trazabilidad (Requisito E7).
 */
export async function voidSale(businessId: string, rawInput: VoidSaleInput) {
  const input = voidSaleSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const [sale] = await tx
      .select()
      .from(sales)
      .where(and(eq(sales.id, input.saleId), eq(sales.businessId, businessId)))
      .limit(1)
      .for('update');

    if (!sale) {
      throw new AppError('Venta no encontrada.', 404);
    }
    if (sale.voidedAt) {
      throw new AppError('Esta venta ya fue anulada.', 409);
    }

    const [voided] = await tx
      .update(sales)
      .set({
        voidedAt: new Date(),
        voidReason: input.reason,
      })
      .where(eq(sales.id, sale.id))
      .returning();

    if (sale.customerId) {
      await applyCustomerPurchase(tx, businessId, sale.customerId, -sale.totalCop, -1);
      // La "última compra" pasa a ser la venta vigente más reciente (o ninguna).
      const [latest] = await tx
        .select({ soldAt: sales.soldAt })
        .from(sales)
        .where(
          and(
            eq(sales.businessId, businessId),
            eq(sales.customerId, sale.customerId),
            isNull(sales.voidedAt),
          ),
        )
        .orderBy(desc(sales.soldAt))
        .limit(1);
      await tx
        .update(customers)
        .set({ lastPurchaseAt: latest?.soldAt ?? null })
        .where(and(eq(customers.id, sale.customerId), eq(customers.businessId, businessId)));
    }

    // Si la venta venía de un pedido del catálogo, el pedido deja de contar como confirmado.
    if (sale.orderId) {
      await tx
        .update(orders)
        .set({ status: 'CANCELLED', cancelReason: `Venta ${sale.saleCode} anulada: ${input.reason}` })
        .where(and(eq(orders.id, sale.orderId), eq(orders.businessId, businessId)));
    }

    return voided!;
  });
}

/**
 * Carga todos los datos necesarios para la pantalla de Venta Rápida y Pedidos Pendientes.
 */
export async function getQuickSaleWorkspaceData(businessId: string) {
  const todayBogota = getBogotaParts().dateString;

  return withTenantContext(businessId, async (tx) => {
    const [business] = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const activeCategories = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), isNull(categories.archivedAt)))
      .orderBy(asc(categories.sortOrder));

    const activeProducts = await tx
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), isNull(products.archivedAt)))
      .orderBy(asc(products.sortOrder), asc(products.name));

    const pendingOrdersList = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.status, 'PENDING')))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const pendingOrderIds = pendingOrdersList.map((o) => o.id);
    const pendingItems =
      pendingOrderIds.length > 0
        ? await tx
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, pendingOrderIds))
        : [];

    const todaySalesList = await tx
      .select()
      .from(sales)
      .where(and(eq(sales.businessId, businessId), eq(sales.businessDate, todayBogota)))
      .orderBy(desc(sales.soldAt))
      .limit(20);

    const todaySaleIds = todaySalesList.map((s) => s.id);
    const todaySaleLines =
      todaySaleIds.length > 0
        ? await tx
            .select()
            .from(saleItems)
            .where(inArray(saleItems.saleId, todaySaleIds))
        : [];

    const recentCustomers = await tx
      .select()
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .orderBy(desc(customers.totalSpentCop), asc(customers.name))
      .limit(50);

    const catNameById = new Map(activeCategories.map((c) => [c.id, c.name]));

    return {
      todayBogota,
      paymentMethods: business?.paymentMethods.filter((pm) => pm.enabled) || [],
      categories: activeCategories,
      products: activeProducts.map((p) => ({
        ...p,
        categoryName: catNameById.get(p.categoryId) || 'General',
      })),
      pendingOrders: pendingOrdersList.map((ord) => ({
        ...ord,
        items: pendingItems.filter((i) => i.orderId === ord.id),
      })),
      todaySales: todaySalesList.map((s) => ({
        ...s,
        items: todaySaleLines.filter((i) => i.saleId === s.id),
      })),
      customers: recentCustomers,
    };
  });
}

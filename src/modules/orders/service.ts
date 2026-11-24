import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { withSystemDb, withTenantContext, type MarchanteDb } from '@/db';
import {
  businesses,
  categories,
  customers,
  orderItems,
  orders,
  products,
} from '@/db/schema';
import { evaluateBusinessOpenStatus } from '@/modules/business/schedule';
import { assertIntegerCop } from '@/modules/shared/currency';
import { AppError, isUniqueViolation } from '@/modules/shared/errors';
import { resolveHistoricSlug } from '@/modules/business/slug-registry';
import { createPublicOrderSchema, type CreatePublicOrderInput } from './validators';
import { buildWhatsAppOrderUrl } from './whatsapp-message';

/**
 * Carga la vitrina pública de un negocio por su `slug` (Requisito C1 y C2).
 * - Excluye productos archivados (`archivedAt IS NOT NULL`) y ocultos (`isHidden = true`).
 * - Mantiene productos agotados (`isSoldOut = true`) marcados como "Agotado" para que el cliente lo sepa.
 * - Ordena categorías y productos según el orden elegido por el vendedor.
 */
/** Si el slug perteneció antes a un negocio que lo cambió, devuelve el slug actual. */
export async function resolvePublicSlugRedirect(slug: string): Promise<string | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  return withSystemDb((db) => resolveHistoricSlug(db, normalizedSlug));
}

export async function getPublicCatalogBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  const foundBusiness = await withSystemDb(async (db) => {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, normalizedSlug))
      .limit(1);
    return biz || null;
  });

  if (!foundBusiness) {
    return null;
  }

  return withTenantContext(foundBusiness.id, async (tx) => {
    const activeCategories = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, foundBusiness.id), isNull(categories.archivedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

    const visibleProducts = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, foundBusiness.id),
          eq(products.isHidden, false),
          isNull(products.archivedAt),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.createdAt));

    const openStatus = evaluateBusinessOpenStatus(foundBusiness.schedule);

    const categoriesWithProducts = activeCategories
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        // Solo campos públicos: NUNCA costos, desglose de insumos ni datos internos.
        products: visibleProducts
          .filter((p) => p.categoryId === cat.id)
          .map((p) => ({
            id: p.id,
            categoryId: p.categoryId,
            name: p.name,
            description: p.description,
            imageUrl: p.imageUrl,
            priceCop: p.priceCop,
            isSoldOut: p.isSoldOut,
          })),
      }))
      .filter((c) => c.products.length > 0);

    return {
      business: {
        id: foundBusiness.id,
        slug: foundBusiness.slug,
        name: foundBusiness.name,
        ownerName: foundBusiness.ownerName,
        description: foundBusiness.description,
        category: foundBusiness.category,
        whatsappPhone: foundBusiness.whatsappPhone,
        address: foundBusiness.address,
        city: foundBusiness.city,
        latitude: foundBusiness.latitude,
        longitude: foundBusiness.longitude,
        schedule: foundBusiness.schedule,
        paymentMethods: foundBusiness.paymentMethods
          .filter((pm) => pm.enabled)
          .map((pm) => ({
            code: pm.code,
            label: pm.label,
            enabled: pm.enabled,
            accountNumber: pm.accountNumber || '',
            accountHolder: pm.accountHolder || '',
            instructions: pm.instructions || '',
          })),
        socialLinks: foundBusiness.socialLinks,
        logoUrl: foundBusiness.logoUrl,
        coverUrl: foundBusiness.coverUrl,
        primaryColor: foundBusiness.primaryColor,
        backgroundPreset: foundBusiness.backgroundPreset,
        fontPreset: foundBusiness.fontPreset,
        cardStyle: foundBusiness.cardStyle,
      },
      openStatus,
      categories: categoriesWithProducts,
      totalVisibleProducts: categoriesWithProducts.reduce((acc, c) => acc + c.products.length, 0),
    };
  });
}

type PublicOrderRow = typeof orders.$inferSelect;
type PublicOrderLine = typeof orderItems.$inferSelect;

/** Lo que ve el cliente del catálogo: sin costos, ids internos ni datos de otros clientes. */
function toPublicOrderResponse(
  order: PublicOrderRow,
  lines: PublicOrderLine[],
  wa: { message: string; url: string },
  idempotentReplay: boolean,
) {
  return {
    order: {
      orderCode: order.orderCode,
      status: order.status,
      totalCop: order.totalCop,
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    },
    items: lines.map((l) => ({
      productName: l.productNameSnapshot,
      quantity: l.quantity,
      unitPriceCop: l.unitPriceCop,
      lineTotalCop: l.lineTotalCop,
      notes: l.notes,
    })),
    whatsappMessage: wa.message,
    whatsappUrl: wa.url,
    idempotentReplay,
  };
}

/** Reserva el siguiente consecutivo de forma atómica (sin carreras entre pedidos simultáneos). */
async function reserveOrderSequence(tx: MarchanteDb, businessId: string): Promise<number> {
  const [row] = await tx
    .update(businesses)
    .set({ nextOrderSeq: sql`${businesses.nextOrderSeq} + 1`, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();
  if (!row) throw new Error('Negocio no encontrado al reservar consecutivo.');
  return row.nextOrderSeq - 1;
}

/**
 * Crea un pedido en estado `PENDING` antes de abrir WhatsApp (Requisitos C5, C6, C7, C8, F1).
 * - Es idempotente por `(business_id, client_order_id)`; un reintento solo recupera el pedido
 *   si trae los mismos datos del cliente (nadie puede leer pedidos ajenos adivinando el id).
 * - Calcula todos los precios y costos desde la base de datos (snapshot inmutable).
 * - Solo acepta métodos de pago activos y productos visibles de categorías activas.
 * - Si el cliente da su teléfono, lo vincula con el cuaderno de clientes SIN sobrescribir
 *   lo que el vendedor ya tenía anotado.
 */
export async function createPublicPendingOrder(rawInput: CreatePublicOrderInput) {
  try {
    return await createPublicPendingOrderOnce(rawInput);
  } catch (err) {
    // Dos envíos simultáneos del mismo carrito: el segundo choca con el índice único
    // y al reintentar encuentra el pedido ya guardado.
    if (isUniqueViolation(err, 'orders_business_client_id_idx')) {
      return createPublicPendingOrderOnce(rawInput);
    }
    throw err;
  }
}

async function createPublicPendingOrderOnce(rawInput: CreatePublicOrderInput) {
  const input = createPublicOrderSchema.parse(rawInput);
  const normalizedSlug = input.businessSlug.trim().toLowerCase();
  const cleanCustomerPhone = (input.customerPhone || '').replace(/\D/g, '');

  const targetBusiness = await withSystemDb(async (db) => {
    const [biz] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.slug, normalizedSlug))
      .limit(1);
    return biz || null;
  });

  if (!targetBusiness) {
    throw new AppError('El negocio solicitado no existe.', 404);
  }

  const enabledMethods = targetBusiness.paymentMethods.filter((m) => m.enabled);

  return withTenantContext(targetBusiness.id, async (tx) => {
    // 1. Idempotencia: si ya se guardó este clientOrderId, devolvemos el mismo pedido
    const [existingOrder] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, targetBusiness.id),
          eq(orders.clientOrderId, input.clientOrderId),
        ),
      )
      .limit(1);

    if (existingOrder) {
      const sameCustomer =
        existingOrder.customerName.trim() === input.customerName.trim() &&
        existingOrder.customerPhone === cleanCustomerPhone;
      if (!sameCustomer) {
        throw new AppError('Este pedido ya fue enviado. Recarga la página para hacer uno nuevo.', 409);
      }

      const existingLines = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, existingOrder.id));

      const pmLabel =
        targetBusiness.paymentMethods.find((m) => m.code === existingOrder.paymentMethod)?.label ||
        existingOrder.paymentMethod;

      const wa = buildWhatsAppOrderUrl({
        orderCode: existingOrder.orderCode,
        businessName: targetBusiness.name,
        businessWhatsapp: targetBusiness.whatsappPhone,
        customerName: existingOrder.customerName,
        customerPhone: existingOrder.customerPhone,
        deliveryType: existingOrder.deliveryType,
        deliveryAddress: existingOrder.deliveryAddress,
        paymentMethodLabel: pmLabel,
        notes: existingOrder.notes,
        totalCop: existingOrder.totalCop,
        createdAt: existingOrder.createdAt,
        items: existingLines.map((l) => ({
          productName: l.productNameSnapshot,
          quantity: l.quantity,
          unitPriceCop: l.unitPriceCop,
          lineTotalCop: l.lineTotalCop,
          notes: l.notes,
        })),
      });

      return toPublicOrderResponse(existingOrder, existingLines, wa, true);
    }

    // 2. Método de pago: solo los que el vendedor tiene activos
    const chosenMethod = enabledMethods.find((m) => m.code === input.paymentMethod);
    if (!chosenMethod) {
      throw new AppError('Ese método de pago no está disponible en esta tienda. Elige otro.');
    }

    // 3. Cargar productos reales de la base de datos y validar disponibilidad
    const requestedIds = [...new Set(input.items.map((i) => i.productId))];
    const dbProducts = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, targetBusiness.id),
          inArray(products.id, requestedIds),
          isNull(products.archivedAt),
        ),
      );

    const activeCategories = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, targetBusiness.id), isNull(categories.archivedAt)));
    const catNameById = new Map(activeCategories.map((c) => [c.id, c.name]));
    const productById = new Map(dbProducts.map((p) => [p.id, p]));

    let computedTotalCop = 0;
    const preparedLines: Array<{
      productId: string;
      productNameSnapshot: string;
      categoryNameSnapshot: string;
      quantity: number;
      unitPriceCop: number;
      unitCostCop: number;
      lineTotalCop: number;
      notes: string;
    }> = [];

    for (const item of input.items) {
      const dbProd = productById.get(item.productId);
      if (!dbProd || dbProd.isHidden || !catNameById.has(dbProd.categoryId)) {
        throw new AppError('Uno de los productos elegidos ya no está disponible en el catálogo.');
      }
      if (dbProd.isSoldOut) {
        throw new AppError(`El producto "${dbProd.name}" está agotado por hoy.`);
      }

      const lineTotalCop = assertIntegerCop(dbProd.priceCop * item.quantity, 'subtotal del producto');
      computedTotalCop = assertIntegerCop(computedTotalCop + lineTotalCop, 'total del pedido');

      preparedLines.push({
        productId: dbProd.id,
        productNameSnapshot: dbProd.name,
        categoryNameSnapshot: catNameById.get(dbProd.categoryId) || 'General',
        quantity: item.quantity,
        unitPriceCop: dbProd.priceCop,
        unitCostCop: dbProd.costCop,
        lineTotalCop,
        notes: item.notes || '',
      });
    }

    // 4. Vincular con el cuaderno de clientes (Requisito F1). Lo que escribe un visitante
    //    anónimo nunca reemplaza el nombre ni la dirección que el vendedor ya tenía.
    let resolvedCustomerId: string | null = null;

    if (cleanCustomerPhone.length >= 7) {
      const [existingCustomer] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.businessId, targetBusiness.id),
            eq(customers.phone, cleanCustomerPhone),
          ),
        )
        .limit(1);

      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
        if (!existingCustomer.address.trim() && input.deliveryAddress) {
          await tx
            .update(customers)
            .set({ address: input.deliveryAddress, updatedAt: new Date() })
            .where(eq(customers.id, existingCustomer.id));
        }
      } else {
        const [newCust] = await tx
          .insert(customers)
          .values({
            businessId: targetBusiness.id,
            name: input.customerName,
            phone: cleanCustomerPhone,
            address: input.deliveryAddress || '',
          })
          .returning();
        resolvedCustomerId = newCust?.id || null;
      }
    }

    // 5. Reservar consecutivo del pedido (#M-101) de forma atómica
    const seq = await reserveOrderSequence(tx, targetBusiness.id);
    const orderCode = `M-${seq}`;

    // 6. Guardar el pedido como PENDIENTE antes de abrir WhatsApp (Requisito C6)
    const [createdOrder] = await tx
      .insert(orders)
      .values({
        businessId: targetBusiness.id,
        customerId: resolvedCustomerId,
        orderCode,
        clientOrderId: input.clientOrderId,
        status: 'PENDING',
        customerName: input.customerName,
        customerPhone: cleanCustomerPhone,
        deliveryType: input.deliveryType,
        deliveryAddress: input.deliveryAddress || '',
        paymentMethod: input.paymentMethod,
        notes: input.notes || '',
        totalCop: computedTotalCop,
      })
      .returning();

    const insertedLines = await tx
      .insert(orderItems)
      .values(
        preparedLines.map((line) => ({
          orderId: createdOrder!.id,
          businessId: targetBusiness.id,
          ...line,
        })),
      )
      .returning();

    const openStatus = evaluateBusinessOpenStatus(targetBusiness.schedule);

    const wa = buildWhatsAppOrderUrl({
      orderCode,
      businessName: targetBusiness.name,
      businessWhatsapp: targetBusiness.whatsappPhone,
      customerName: input.customerName,
      customerPhone: cleanCustomerPhone,
      deliveryType: input.deliveryType,
      deliveryAddress: input.deliveryAddress,
      paymentMethodLabel: chosenMethod.label,
      notes: input.notes,
      totalCop: computedTotalCop,
      createdAt: createdOrder!.createdAt,
      receivedWhileClosed: !openStatus.isOpen,
      items: preparedLines.map((l) => ({
        productName: l.productNameSnapshot,
        quantity: l.quantity,
        unitPriceCop: l.unitPriceCop,
        lineTotalCop: l.lineTotalCop,
        notes: l.notes,
      })),
    });

    return toPublicOrderResponse(createdOrder!, insertedLines, wa, false);
  });
}

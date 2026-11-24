import { and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { customers, orders, saleItems, sales } from '@/db/schema';
import {
  cleanCustomerPhone,
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type ListCustomersQueryInput,
  type UpdateCustomerInput,
} from './validators';

/**
 * Lista la base de clientes del negocio con buscador y ordenamiento (Requisito F4).
 */
export async function listCustomers(
  businessId: string,
  rawQuery: ListCustomersQueryInput = {},
) {
  const query = listCustomersQuerySchema.parse(rawQuery);

  return withTenantContext(businessId, async (tx) => {
    const conditions = [eq(customers.businessId, businessId)];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(customers.name, pattern),
          ilike(customers.phone, pattern),
          ilike(customers.notes, pattern),
          ilike(customers.address, pattern),
        )!,
      );
    }

    const orderByClause =
      query.sortBy === 'name'
        ? [asc(customers.name)]
        : query.sortBy === 'recent'
          ? [desc(customers.lastPurchaseAt), desc(customers.createdAt)]
          : [desc(customers.totalSpentCop), desc(customers.purchasesCount), asc(customers.name)];

    return tx
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(...orderByClause);
  });
}

/**
 * Crea un cliente manualmente (Requisito F2).
 */
export async function createCustomer(businessId: string, rawInput: CreateCustomerInput) {
  const input = createCustomerSchema.parse(rawInput);
  const normalizedPhone = cleanCustomerPhone(input.phone);

  return withTenantContext(businessId, async (tx) => {
    if (normalizedPhone) {
      const [existingPhone] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.businessId, businessId),
            eq(customers.phone, normalizedPhone),
          ),
        )
        .limit(1);

      if (existingPhone) {
        throw new Error(
          `Ya tienes un cliente registrado con el número ${normalizedPhone} (${existingPhone.name}).`,
        );
      }
    }

    const [created] = await tx
      .insert(customers)
      .values({
        businessId,
        name: input.name,
        phone: normalizedPhone,
        address: input.address,
        notes: input.notes,
      })
      .returning();

    return created!;
  });
}

/**
 * Actualiza los datos y notas de un cliente (Requisito F2 y F3).
 */
export async function updateCustomer(businessId: string, rawInput: UpdateCustomerInput) {
  const input = updateCustomerSchema.parse(rawInput);
  const normalizedPhone = cleanCustomerPhone(input.phone);

  return withTenantContext(businessId, async (tx) => {
    if (normalizedPhone) {
      const existing = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.businessId, businessId),
            eq(customers.phone, normalizedPhone),
          ),
        );

      const conflict = existing.find((c) => c.id !== input.customerId);
      if (conflict) {
        throw new Error(
          `El número ${normalizedPhone} ya pertenece a otro cliente (${conflict.name}).`,
        );
      }
    }

    const [updated] = await tx
      .update(customers)
      .set({
        name: input.name,
        phone: normalizedPhone,
        address: input.address,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, input.customerId), eq(customers.businessId, businessId)))
      .returning();

    if (!updated) {
      throw new Error('Cliente no encontrado.');
    }

    return updated;
  });
}

/**
 * Obtiene la ficha completa de un cliente junto con todo su historial de compras
 * confirmadas (con sus productos y precios congelados) y pedidos pendientes (Requisito F3).
 */
export async function getCustomerDetailWithHistory(businessId: string, customerId: string) {
  return withTenantContext(businessId, async (tx) => {
    const [customer] = await tx
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
      .limit(1);

    if (!customer) {
      throw new Error('Cliente no encontrado.');
    }

    const customerSales = await tx
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          eq(sales.customerId, customerId),
          isNull(sales.voidedAt),
        ),
      )
      .orderBy(desc(sales.soldAt));

    const saleIds = customerSales.map((s) => s.id);
    const items =
      saleIds.length > 0
        ? await tx
            .select()
            .from(saleItems)
            .where(inArray(saleItems.saleId, saleIds))
        : [];

    const pendingOrders = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.customerId, customerId),
          eq(orders.status, 'PENDING'),
        ),
      )
      .orderBy(desc(orders.createdAt));

    return {
      customer,
      purchases: customerSales.map((s) => ({
        ...s,
        items: items.filter((i) => i.saleId === s.id),
      })),
      pendingOrders,
    };
  });
}

import { and, asc, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { categories, orderItems, products, saleItems } from '@/db/schema';
import {
  createCategorySchema,
  createProductSchema,
  listProductsQuerySchema,
  renameCategorySchema,
  reorderCategoriesSchema,
  toggleProductStatusSchema,
  updateProductSchema,
  type CreateCategoryInput,
  type CreateProductInput,
  type ListProductsQueryInput,
  type UpdateProductInput,
} from './validators';

// ============================================================================
// CATEGORÍAS (B1)
// ============================================================================

export async function listCategories(businessId: string) {
  return withTenantContext(businessId, async (tx) => {
    const catList = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), isNull(categories.archivedAt)))
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt));

    const prodRows = await tx
      .select({
        categoryId: products.categoryId,
      })
      .from(products)
      .where(and(eq(products.businessId, businessId), isNull(products.archivedAt)));

    const countMap = new Map<string, number>();
    for (const p of prodRows) {
      countMap.set(p.categoryId, (countMap.get(p.categoryId) || 0) + 1);
    }

    return catList.map((c) => ({
      ...c,
      productCount: countMap.get(c.id) || 0,
    }));
  });
}

export async function createCategory(businessId: string, rawInput: CreateCategoryInput) {
  const input = createCategorySchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const existing = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), isNull(categories.archivedAt)));

    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === input.name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`Ya tienes una categoría llamada "${input.name}".`);
    }

    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);

    const [created] = await tx
      .insert(categories)
      .values({
        businessId,
        name: input.name,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return created!;
  });
}

export async function renameCategory(
  businessId: string,
  rawInput: { categoryId: string; name: string },
) {
  const input = renameCategorySchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const existing = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), isNull(categories.archivedAt)));

    const duplicate = existing.find(
      (c) =>
        c.id !== input.categoryId &&
        c.name.trim().toLowerCase() === input.name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`Ya tienes otra categoría llamada "${input.name}".`);
    }

    const [updated] = await tx
      .update(categories)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(and(eq(categories.id, input.categoryId), eq(categories.businessId, businessId)))
      .returning();

    if (!updated) {
      throw new Error('Categoría no encontrada.');
    }
    return updated;
  });
}

export async function reorderCategories(
  businessId: string,
  rawInput: { orderedCategoryIds: string[] },
) {
  const { orderedCategoryIds } = reorderCategoriesSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    for (let index = 0; index < orderedCategoryIds.length; index++) {
      const catId = orderedCategoryIds[index]!;
      await tx
        .update(categories)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(and(eq(categories.id, catId), eq(categories.businessId, businessId)));
    }
    return tx
      .select()
      .from(categories)
      .where(and(eq(categories.businessId, businessId), isNull(categories.archivedAt)))
      .orderBy(asc(categories.sortOrder));
  });
}

export async function archiveCategory(businessId: string, categoryId: string) {
  return withTenantContext(businessId, async (tx) => {
    const activeProductsInCat = await tx
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.categoryId, categoryId),
          isNull(products.archivedAt),
        ),
      )
      .limit(1);

    if (activeProductsInCat.length > 0) {
      throw new Error(
        'No puedes eliminar una categoría que todavía tiene productos activos. Mueve o archiva sus productos primero.',
      );
    }

    const [archived] = await tx
      .update(categories)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId)))
      .returning();

    if (!archived) {
      throw new Error('Categoría no encontrada.');
    }
    return archived;
  });
}

// ============================================================================
// PRODUCTOS (B2..B7)
// ============================================================================

export async function createProduct(businessId: string, rawInput: CreateProductInput) {
  const input = createProductSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    // Verificar que la categoría exista, pertenezca a este negocio y no esté archivada
    const [cat] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.businessId, businessId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    if (!cat) {
      throw new Error(
        'La categoría seleccionada no existe o está archivada. Elige una categoría válida antes de publicar.',
      );
    }

    const [created] = await tx
      .insert(products)
      .values({
        businessId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        priceCop: input.priceCop,
        costCop: input.costCop,
        imageUrl: input.imageUrl,
        isHidden: input.isHidden,
        isSoldOut: input.isSoldOut,
      })
      .returning();

    return created!;
  });
}

export async function updateProduct(businessId: string, rawInput: UpdateProductInput) {
  const input = updateProductSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const [cat] = await tx
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, input.categoryId),
          eq(categories.businessId, businessId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    if (!cat) {
      throw new Error('Debes elegir una categoría válida para este producto.');
    }

    const [updated] = await tx
      .update(products)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        priceCop: input.priceCop,
        costCop: input.costCop,
        imageUrl: input.imageUrl,
        isHidden: input.isHidden,
        isSoldOut: input.isSoldOut,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, input.productId),
          eq(products.businessId, businessId),
          isNull(products.archivedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error('Producto no encontrado.');
    }
    return updated;
  });
}

export async function toggleProductStatus(
  businessId: string,
  rawInput: { productId: string; isHidden?: boolean; isSoldOut?: boolean },
) {
  const input = toggleProductStatusSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const patch: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof input.isHidden === 'boolean') patch.isHidden = input.isHidden;
    if (typeof input.isSoldOut === 'boolean') patch.isSoldOut = input.isSoldOut;

    const [updated] = await tx
      .update(products)
      .set(patch)
      .where(
        and(
          eq(products.id, input.productId),
          eq(products.businessId, businessId),
          isNull(products.archivedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error('Producto no encontrado.');
    }
    return updated;
  });
}

/**
 * Requisito B6:
 * Los productos se ocultan o archivan, NUNCA se borran si tienen ventas o pedidos históricos.
 */
export async function archiveProductSafely(
  businessId: string,
  productId: string,
): Promise<{ action: 'archived' | 'deleted'; hadSalesHistory: boolean }> {
  return withTenantContext(businessId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
      .limit(1);

    if (!existing) {
      throw new Error('Producto no encontrado.');
    }

    const salesRefs = await tx
      .select({ id: saleItems.id })
      .from(saleItems)
      .where(and(eq(saleItems.businessId, businessId), eq(saleItems.productId, productId)))
      .limit(1);

    const orderRefs = await tx
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.businessId, businessId), eq(orderItems.productId, productId)))
      .limit(1);

    const hadSalesHistory = salesRefs.length > 0 || orderRefs.length > 0;

    // Siempre archivamos con archivedAt para proteger integridad y referencias históricas;
    // jamás ejecutamos DELETE sobre un producto con ventas.
    await tx
      .update(products)
      .set({
        isHidden: true,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, productId), eq(products.businessId, businessId)));

    return {
      action: 'archived',
      hadSalesHistory,
    };
  });
}

export async function listProducts(
  businessId: string,
  rawQuery: ListProductsQueryInput = {},
) {
  const query = listProductsQuerySchema.parse(rawQuery);

  return withTenantContext(businessId, async (tx) => {
    const conditions = [eq(products.businessId, businessId), isNull(products.archivedAt)];

    if (query.categoryId && query.categoryId !== 'all') {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.status === 'available') {
      conditions.push(eq(products.isHidden, false));
      conditions.push(eq(products.isSoldOut, false));
    } else if (query.status === 'sold_out') {
      conditions.push(eq(products.isSoldOut, true));
    } else if (query.status === 'hidden') {
      conditions.push(eq(products.isHidden, true));
    }

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(ilike(products.name, pattern), ilike(products.description, pattern))!,
      );
    }

    const whereClause = and(...conditions);

    const [totalRow] = await tx
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    const total = Number(totalRow?.value || 0);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const currentPage = Math.min(query.page, totalPages);
    const offset = (currentPage - 1) * query.pageSize;

    const items = await tx
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(asc(products.sortOrder), desc(products.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const catList = await tx
      .select()
      .from(categories)
      .where(eq(categories.businessId, businessId));

    const catNameById = new Map(catList.map((c) => [c.id, c.name]));

    return {
      items: items.map((item) => ({
        ...item,
        categoryName: catNameById.get(item.categoryId) || 'General',
      })),
      pagination: {
        total,
        page: currentPage,
        pageSize: query.pageSize,
        totalPages,
      },
    };
  });
}

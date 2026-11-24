import { z } from 'zod';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { categories, products, type CostBreakdownItem } from '@/db/schema';
import {
  calculateProductMargin,
  MAX_COP_AMOUNT,
  suggestCommercialPriceCop,
} from '@/modules/shared/currency';

export const costBreakdownItemSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z
    .string()
    .trim()
    .min(1, 'Escribe el nombre del ingrediente o insumo')
    .max(80, 'Nombre demasiado largo'),
  costCop: z
    .number()
    .int('El costo del insumo debe ser un entero en pesos COP')
    .min(0, 'El costo no puede ser negativo')
    .max(MAX_COP_AMOUNT),
});

export const updateProductCostingSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  priceCop: z
    .number()
    .int('El precio de venta debe ser un entero en pesos COP')
    .min(0, 'El precio no puede ser negativo')
    .max(MAX_COP_AMOUNT),
  costCop: z
    .number()
    .int('El costo unitario debe ser un entero en pesos COP')
    .min(0, 'El costo no puede ser negativo')
    .max(MAX_COP_AMOUNT),
  costBreakdown: z.array(costBreakdownItemSchema).max(40).optional().default([]),
  useBreakdownSum: z.boolean().optional().default(false),
});

export type UpdateProductCostingInput = z.input<typeof updateProductCostingSchema>;

/**
 * Calcula la suma exacta en pesos COP de una lista de ingredientes o insumos (Requisito H3).
 */
export function sumCostBreakdownCop(items: CostBreakdownItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(0, Math.trunc(item.costCop || 0)), 0);
}

/**
 * Actualiza el costo unitario, el desglose opcional por insumos y el precio de venta
 * de un producto dentro de su contexto multi-tenant RLS (Requisitos H1, H2, H3).
 */
export async function updateProductCosting(
  businessId: string,
  rawInput: UpdateProductCostingInput,
) {
  const input = updateProductCostingSchema.parse(rawInput);

  const effectiveCostCop =
    input.useBreakdownSum && input.costBreakdown.length > 0
      ? sumCostBreakdownCop(input.costBreakdown)
      : input.costCop;

  return withTenantContext(businessId, async (tx) => {
    const [updated] = await tx
      .update(products)
      .set({
        priceCop: input.priceCop,
        costCop: effectiveCostCop,
        costBreakdown: input.costBreakdown,
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

    const margin = calculateProductMargin(updated.priceCop, updated.costCop);

    return {
      product: updated,
      margin,
    };
  });
}

/**
 * Obtiene todos los productos activos del negocio con su análisis de costo, ganancia en pesos,
 * margen en porcentaje, desglose de insumos y precio sugerido (Requisitos H1..H4).
 */
export async function listProductsWithCostingSummary(
  businessId: string,
  targetMarginPercent = 45,
) {
  return withTenantContext(businessId, async (tx) => {
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

    const catNameById = new Map(activeCategories.map((c) => [c.id, c.name]));

    const enriched = activeProducts.map((prod) => {
      const margin = calculateProductMargin(prod.priceCop, prod.costCop);
      const suggestedPriceCop = suggestCommercialPriceCop(
        prod.costCop,
        targetMarginPercent,
        500,
      );

      return {
        id: prod.id,
        name: prod.name,
        categoryId: prod.categoryId,
        categoryName: catNameById.get(prod.categoryId) || 'General',
        priceCop: prod.priceCop,
        costCop: prod.costCop,
        costBreakdown: prod.costBreakdown || [],
        profitCop: margin.profitCop,
        marginPercent: margin.marginPercent,
        health: margin.health,
        healthLabel: margin.healthLabel,
        suggestedPriceCop,
      };
    });

    const withCost = enriched.filter((p) => p.costCop > 0);
    const averageMarginPercent =
      withCost.length > 0
        ? Math.round(
            (withCost.reduce((sum, p) => sum + p.marginPercent, 0) / withCost.length) * 10,
          ) / 10
        : 0;

    return {
      targetMarginPercent,
      summary: {
        totalProducts: enriched.length,
        averageMarginPercent,
        healthyCount: enriched.filter((p) => p.health === 'healthy' && p.costCop > 0).length,
        tightOrLowCount: enriched.filter(
          (p) => (p.health === 'tight' || p.health === 'low') && p.costCop > 0,
        ).length,
        lossCount: enriched.filter((p) => p.health === 'loss').length,
        missingCostCount: enriched.filter((p) => p.costCop === 0).length,
      },
      products: enriched,
    };
  });
}

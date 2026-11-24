import { and, eq } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { businesses, categories } from '@/db/schema';
import {
  BACKGROUND_PRESET_OPTIONS,
  CARD_STYLE_OPTIONS,
  CURATED_BRAND_PALETTES,
  FONT_PRESET_OPTIONS,
  getContrastRatioWithWhite,
  updateCatalogCustomizationSchema,
  type UpdateCatalogCustomizationInput,
} from './customization-options';

export {
  BACKGROUND_PRESET_OPTIONS,
  CARD_STYLE_OPTIONS,
  CURATED_BRAND_PALETTES,
  FONT_PRESET_OPTIONS,
  getContrastRatioWithWhite,
  updateCatalogCustomizationSchema,
  type UpdateCatalogCustomizationInput,
};

/**
 * Persiste la personalización del catálogo público (D1..D5) y el orden de categorías
 * en una sola transacción multi-tenant protegida con RLS.
 */
export async function updateCatalogCustomization(
  businessId: string,
  rawInput: UpdateCatalogCustomizationInput,
) {
  const input = updateCatalogCustomizationSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const [updatedBusiness] = await tx
      .update(businesses)
      .set({
        logoUrl: input.logoUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        primaryColor: input.primaryColor.toUpperCase(),
        backgroundPreset: input.backgroundPreset,
        fontPreset: input.fontPreset,
        cardStyle: input.cardStyle,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    if (!updatedBusiness) {
      throw new Error('No se encontró el negocio para actualizar su diseño.');
    }

    if (input.orderedCategoryIds && input.orderedCategoryIds.length > 0) {
      for (let i = 0; i < input.orderedCategoryIds.length; i++) {
        const catId = input.orderedCategoryIds[i]!;
        await tx
          .update(categories)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(and(eq(categories.id, catId), eq(categories.businessId, businessId)));
      }
    }

    return updatedBusiness;
  });
}

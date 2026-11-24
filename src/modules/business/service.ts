import { eq } from 'drizzle-orm';
import { withSystemDb, withTenantContext } from '@/db';
import { businesses, businessSlugHistory } from '@/db/schema';
import { AppError } from '@/modules/shared/errors';
import { isSlugTakenByAnotherBusiness } from './slug-registry';
import {
  updateBusinessProfileSchema,
  type UpdateBusinessProfileInput,
} from './validators';

/**
 * Obtiene el perfil completo del negocio dentro de su contexto multi-tenant RLS.
 */
export async function getBusinessProfile(businessId: string) {
  return withTenantContext(businessId, async (tx) => {
    const [business] = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new AppError('Negocio no encontrado.', 404);
    }
    return business;
  });
}

/**
 * Actualiza el perfil del negocio (Sección A: A1..A7) validando unicidad de slug
 * y ejecutando la escritura bajo aislamiento multi-tenant RLS.
 */
export async function updateBusinessProfile(
  businessId: string,
  rawInput: UpdateBusinessProfileInput,
) {
  const input = updateBusinessProfileSchema.parse(rawInput);

  // El slug no puede pertenecer (ni haber pertenecido) a otro negocio
  const slugConflict = await withSystemDb((db) =>
    isSlugTakenByAnotherBusiness(db, input.slug, businessId),
  );

  if (slugConflict) {
    throw new AppError(
      `El enlace "/${input.slug}" ya está siendo usado por otro negocio. Elige uno distinto.`,
      409,
    );
  }

  const previousSlug = await withTenantContext(businessId, async (tx) => {
    const [row] = await tx
      .select({ slug: businesses.slug })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);
    return row?.slug ?? null;
  });

  const result = await withTenantContext(businessId, async (tx) => {
    const [updated] = await tx
      .update(businesses)
      .set({
        name: input.name,
        ownerName: input.ownerName,
        slug: input.slug,
        description: input.description,
        category: input.category,
        whatsappPhone: input.whatsappPhone,
        address: input.address,
        city: input.city,
        latitude: input.latitude,
        longitude: input.longitude,
        schedule: input.schedule,
        paymentMethods: input.paymentMethods,
        socialLinks: input.socialLinks,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();

    if (!updated) {
      throw new AppError('No tienes permiso para modificar este negocio.', 403);
    }

    return updated;
  });

  // Guardamos el enlace anterior: los links ya compartidos redirigen al nuevo
  // y nadie más puede registrarlo para suplantar al negocio.
  if (previousSlug && previousSlug !== result.slug) {
    await withSystemDb((db) =>
      db
        .insert(businessSlugHistory)
        .values({ slug: previousSlug, businessId })
        .onConflictDoNothing(),
    );
  }

  return result;
}

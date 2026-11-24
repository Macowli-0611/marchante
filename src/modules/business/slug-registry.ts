import { and, eq, ne } from 'drizzle-orm';
import type { MarchanteDb } from '@/db';
import { businesses, businessSlugHistory } from '@/db/schema';

/**
 * Un slug está ocupado si lo usa otro negocio HOY o si otro negocio lo usó antes
 * (los links viejos siguen redirigiendo a su dueño original y nadie puede suplantarlo).
 */
export async function isSlugTakenByAnotherBusiness(
  db: MarchanteDb,
  slug: string,
  exceptBusinessId?: string,
): Promise<boolean> {
  const current = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(
      exceptBusinessId
        ? and(eq(businesses.slug, slug), ne(businesses.id, exceptBusinessId))
        : eq(businesses.slug, slug),
    )
    .limit(1);
  if (current.length > 0) return true;

  const historic = await db
    .select({ businessId: businessSlugHistory.businessId })
    .from(businessSlugHistory)
    .where(eq(businessSlugHistory.slug, slug))
    .limit(1);
  return historic.length > 0 && historic[0]!.businessId !== exceptBusinessId;
}

/** Resuelve un slug viejo al slug actual de su negocio (para redirigir links compartidos). */
export async function resolveHistoricSlug(db: MarchanteDb, slug: string): Promise<string | null> {
  const [row] = await db
    .select({ currentSlug: businesses.slug })
    .from(businessSlugHistory)
    .innerJoin(businesses, eq(businesses.id, businessSlugHistory.businessId))
    .where(eq(businessSlugHistory.slug, slug))
    .limit(1);
  return row && row.currentSlug !== slug ? row.currentSlug : null;
}

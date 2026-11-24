import { describe, expect, it } from 'vitest';
import { withTenantContext } from '@/db';
import { categories, products } from '@/db/schema';
import { registerSeller } from '@/modules/auth/service';
import { eq } from 'drizzle-orm';

describe('T3 & T4 — Registro y Aislamiento Multi-Tenant a nivel de Base de Datos (RLS)', () => {
  it('impide que el Vendedor A lea o modifique productos o categorías del Vendedor B a nivel PostgreSQL RLS', async () => {
    const sellerA = await registerSeller({
      ownerName: 'Andrés Vendedor A',
      businessName: 'Arepas Don Andrés',
      slug: 'arepas-don-andres',
      email: 'andres-a@marchante.co',
      password: 'password123',
      whatsappPhone: '3001112233',
      category: 'comida_casera',
    });

    const sellerB = await registerSeller({
      ownerName: 'Beatriz Vendedora B',
      businessName: 'Postres Doña Beatriz',
      slug: 'postres-dona-beatriz',
      email: 'beatriz-b@marchante.co',
      password: 'password123',
      whatsappPhone: '3004445566',
      category: 'reposteria',
    });

    // Crear un producto dentro del contexto RLS del Vendedor A
    await withTenantContext(sellerA.businessId, async (tx) => {
      const [catA] = await tx.select().from(categories).limit(1);
      expect(catA).toBeDefined();
      expect(catA!.businessId).toBe(sellerA.businessId);

      await tx.insert(products).values({
        businessId: sellerA.businessId,
        categoryId: catA!.id,
        name: 'Arepa de Choclo con Quesito',
        priceCop: 9500,
        costCop: 3800,
      });
    });

    // Crear un producto dentro del contexto RLS del Vendedor B
    let productBId = '';
    await withTenantContext(sellerB.businessId, async (tx) => {
      const [catB] = await tx.select().from(categories).limit(1);
      expect(catB).toBeDefined();
      expect(catB!.businessId).toBe(sellerB.businessId);

      const [prodB] = await tx
        .insert(products)
        .values({
          businessId: sellerB.businessId,
          categoryId: catB!.id,
          name: 'Milhoja Artesanal de Arequipe',
          priceCop: 11000,
          costCop: 4500,
        })
        .returning();
      productBId = prodB!.id;
    });

    // PRUEBA DE FUEGO RLS:
    // El Vendedor A hace un SELECT sin cláusula WHERE sobre `products`.
    // El motor PostgreSQL (RLS) SOLO debe devolver los productos del Vendedor A.
    await withTenantContext(sellerA.businessId, async (tx) => {
      const visibleProducts = await tx.select().from(products);
      expect(visibleProducts).toHaveLength(1);
      expect(visibleProducts[0]?.name).toBe('Arepa de Choclo con Quesito');

      // Si el Vendedor A intenta actualizar explícitamente el producto del Vendedor B por su ID,
      // PostgreSQL RLS bloquea la fila y afecta 0 registros.
      const updated = await tx
        .update(products)
        .set({ priceCop: 100 })
        .where(eq(products.id, productBId))
        .returning();
      expect(updated).toHaveLength(0);
    });

    // Verificar que el producto del Vendedor B sigue intacto en $11.000 COP
    await withTenantContext(sellerB.businessId, async (tx) => {
      const [prodB] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productBId));
      expect(prodB?.priceCop).toBe(11000);
    });
  });
});

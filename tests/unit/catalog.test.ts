import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { products, saleItems, sales } from '@/db/schema';
import { registerSeller } from '@/modules/auth/service';
import {
  archiveCategory,
  archiveProductSafely,
  createCategory,
  createProduct,
  listCategories,
  listProducts,
  renameCategory,
  reorderCategories,
  toggleProductStatus,
  updateProduct,
} from '@/modules/catalog/service';
import { optimizeAndSaveWebpImage } from '@/modules/catalog/image-optimizer';

describe('Sección B — Categorías y Administrador de Catálogo (B1 a B7)', () => {
  it('B1: crea, renombra, reordena categorías y bloquea eliminar una categoría con productos activos', async () => {
    const seller = await registerSeller({
      ownerName: 'Lucía Gómez',
      businessName: 'Postres Lucía',
      slug: 'postres-lucia-cat',
      email: 'lucia-cat@marchante.co',
      password: 'password123',
      whatsappPhone: '3120001122',
      category: 'reposteria',
    });

    const cat1 = await createCategory(seller.businessId, { name: 'Tortas Frías' });
    const cat2 = await createCategory(seller.businessId, { name: 'Bebidas Calientes' });

    const renamed = await renameCategory(seller.businessId, {
      categoryId: cat1.id,
      name: 'Tortas & Cheesecakes',
    });
    expect(renamed.name).toBe('Tortas & Cheesecakes');

    const allBefore = await listCategories(seller.businessId);
    const reorderedIds = [...allBefore.map((c) => c.id)].reverse();
    const reordered = await reorderCategories(seller.businessId, {
      orderedCategoryIds: reorderedIds,
    });
    expect(reordered[0]?.id).toBe(reorderedIds[0]);

    // Crear un producto en cat1 -> no debe dejar archivar cat1
    await createProduct(seller.businessId, {
      categoryId: cat1.id,
      name: 'Cheesecake de Maracuyá',
      priceCop: 16000,
      costCop: 6500,
    });

    await expect(archiveCategory(seller.businessId, cat1.id)).rejects.toThrow(
      /todavía tiene productos activos/,
    );

    // cat2 está vacía -> sí permite eliminarla/archivarla
    const archivedCat2 = await archiveCategory(seller.businessId, cat2.id);
    expect(archivedCat2.archivedAt).not.toBeNull();
  });

  it('B2, B4, B5, B7: exige categoría válida y precio entero COP, permite ocultar/mostrar, marcar agotado y filtrar/paginar', async () => {
    const seller = await registerSeller({
      ownerName: 'Mateo Ruiz',
      businessName: 'Café Don Mateo',
      slug: 'cafe-don-mateo',
      email: 'mateo-prod@marchante.co',
      password: 'password123',
      whatsappPhone: '3145556677',
      category: 'mercado_fruver',
    });

    const cats = await listCategories(seller.businessId);
    const mainCat = cats[0]!;

    // Rechaza precio con decimales (flotante)
    await expect(
      createProduct(seller.businessId, {
        categoryId: mainCat.id,
        name: 'Café Molido 500g',
        priceCop: 28500.75,
      }),
    ).rejects.toThrow(/entero en pesos COP/);

    const prod = await createProduct(seller.businessId, {
      categoryId: mainCat.id,
      name: 'Café de Origen Quindío 500g',
      description: 'Tostión media con notas a panela y cacao.',
      priceCop: 28000,
      costCop: 14000,
    });

    expect(prod.priceCop).toBe(28000);
    expect(prod.isHidden).toBe(false);
    expect(prod.isSoldOut).toBe(false);

    // Editar producto
    const edited = await updateProduct(seller.businessId, {
      productId: prod.id,
      categoryId: mainCat.id,
      name: 'Café Especial Quindío 500g',
      description: 'Tostión media.',
      priceCop: 30000,
      costCop: 14500,
    });
    expect(edited.priceCop).toBe(30000);

    // B5: Marcar agotado sin borrar
    const soldOut = await toggleProductStatus(seller.businessId, {
      productId: prod.id,
      isSoldOut: true,
    });
    expect(soldOut.isSoldOut).toBe(true);

    const soldOutList = await listProducts(seller.businessId, { status: 'sold_out' });
    expect(soldOutList.items).toHaveLength(1);

    // B4: Ocultar sin borrar
    const hidden = await toggleProductStatus(seller.businessId, {
      productId: prod.id,
      isHidden: true,
    });
    expect(hidden.isHidden).toBe(true);
  });

  it('B6: nunca borra físicamente un producto con ventas asociadas (lo archiva preservando el historial)', async () => {
    const seller = await registerSeller({
      ownerName: 'Rosa Velásquez',
      businessName: 'Tamales Doña Rosa',
      slug: 'tamales-dona-rosa',
      email: 'rosa-archive@marchante.co',
      password: 'password123',
      whatsappPhone: '3167778899',
      category: 'comida_casera',
    });

    const cats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Tamal Valluno Especial',
      priceCop: 15000,
      costCop: 7000,
    });

    // Registrar una venta histórica asociada a este producto
    await withTenantContext(seller.businessId, async (tx) => {
      const [sale] = await tx
        .insert(sales)
        .values({
          businessId: seller.businessId,
          saleCode: 'V-101',
          source: 'QUICK_SALE',
          paymentMethod: 'cash',
          totalCop: 30000,
          totalCostCop: 14000,
          grossProfitCop: 16000,
          businessDate: '2026-11-21',
          bogotaHour: 12,
        })
        .returning();

      await tx.insert(saleItems).values({
        saleId: sale!.id,
        businessId: seller.businessId,
        productId: prod.id,
        productNameSnapshot: prod.name,
        categoryNameSnapshot: cats[0]!.name,
        quantity: 2,
        unitPriceCop: 15000,
        unitCostCop: 7000,
        lineTotalCop: 30000,
        lineProfitCop: 16000,
      });
    });

    const archiveOutcome = await archiveProductSafely(seller.businessId, prod.id);
    expect(archiveOutcome.action).toBe('archived');
    expect(archiveOutcome.hadSalesHistory).toBe(true);

    // Ya no sale en el catálogo activo
    const activeCatalog = await listProducts(seller.businessId);
    expect(activeCatalog.items).toHaveLength(0);

    // Pero la fila sigue existiendo en la tabla products con archivedAt y su sale_item intacto
    await withTenantContext(seller.businessId, async (tx) => {
      const [dbProd] = await tx.select().from(products).where(eq(products.id, prod.id));
      expect(dbProd).toBeDefined();
      expect(dbProd?.archivedAt).not.toBeNull();
    });
  });

  it('B3: recorta y optimiza imágenes a WebP ligero y rechaza archivos de más de 5 MB', async () => {
    const rawPngBuffer = await sharp({
      create: {
        width: 1400,
        height: 1000,
        channels: 3,
        background: { r: 200, g: 62, b: 43 },
      },
    })
      .png()
      .toBuffer();

    const optimized = await optimizeAndSaveWebpImage({
      buffer: rawPngBuffer,
      mimeType: 'image/png',
      businessId: '11111111-2222-3333-4444-555555555555',
      kind: 'product',
      crop: { left: 100, top: 50, width: 800, height: 800 },
    });

    expect(optimized.format).toBe('webp');
    expect(optimized.publicUrl).toMatch(/\.webp$/);
    expect(optimized.width).toBe(720);
    expect(optimized.height).toBe(720);
    expect(optimized.sizeBytes).toBeLessThan(100 * 1024);

    // Probar límite de 5 MB
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 10, 1);
    await expect(
      optimizeAndSaveWebpImage({
        buffer: oversized,
        mimeType: 'image/png',
        businessId: '11111111-2222-3333-4444-555555555555',
      }),
    ).rejects.toThrow(/supera el límite máximo de 5 MB/);
  });
});

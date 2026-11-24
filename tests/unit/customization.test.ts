import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createCategory, createProduct, listCategories } from '@/modules/catalog/service';
import {
  getContrastRatioWithWhite,
  updateCatalogCustomization,
} from '@/modules/business/customization';
import { getPublicCatalogBySlug } from '@/modules/orders/service';

describe('Sección D — Personalización del Catálogo Público (D1 a D6)', () => {
  it('D2: valida contraste WCAG del color principal y rechaza colores ilegibles sobre botones blancos', () => {
    expect(getContrastRatioWithWhite('#C83E2B')).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatioWithWhite('#1B6B4A')).toBeGreaterThanOrEqual(4.5);
    // Amarillo pálido casi blanco -> mal contraste
    expect(getContrastRatioWithWhite('#FFF9D2')).toBeLessThan(2.0);
  });

  it('D1..D5: actualiza logo, portada, color, fondo, tipografía, estilo de tarjetas y orden de categorías reflejándose en la vitrina pública', async () => {
    const seller = await registerSeller({
      ownerName: 'Valeria Soto',
      businessName: 'Cerámica & Flores Valeria',
      slug: 'ceramica-valeria',
      email: 'valeria-design@marchante.co',
      password: 'password123',
      whatsappPhone: '3178889900',
      category: 'artesanias_regalos',
    });

    const cat2 = await createCategory(seller.businessId, { name: 'Macetas Pintadas a Mano' });
    const allCats = await listCategories(seller.businessId);
    const cat1 = allCats.find((c) => c.id !== cat2.id)!;

    await createProduct(seller.businessId, {
      categoryId: cat1.id,
      name: 'Jarrón Terracota',
      priceCop: 45000,
      costCop: 18000,
    });
    await createProduct(seller.businessId, {
      categoryId: cat2.id,
      name: 'Maceta Colibrí',
      priceCop: 32000,
      costCop: 12000,
    });

    // Rechaza un color sin contraste suficiente
    await expect(
      updateCatalogCustomization(seller.businessId, {
        logoUrl: '/uploads/brand/logo-test.webp',
        coverUrl: '/uploads/brand/cover-test.webp',
        primaryColor: '#FFFCE8',
        backgroundPreset: 'baldosin',
        fontPreset: 'editorial',
        cardStyle: 'mostrador',
      }),
    ).rejects.toThrow(/demasiado claro/);

    // Aplica personalización completa + invierte el orden de categorías (cat2 primero, cat1 segundo)
    const updated = await updateCatalogCustomization(seller.businessId, {
      logoUrl: '/uploads/brand/logo-valeria.webp',
      coverUrl: '/uploads/brand/cover-valeria.webp',
      primaryColor: '#1D4E89',
      backgroundPreset: 'baldosin',
      fontPreset: 'editorial',
      cardStyle: 'mostrador',
      orderedCategoryIds: [cat2.id, cat1.id],
    });

    expect(updated.logoUrl).toBe('/uploads/brand/logo-valeria.webp');
    expect(updated.coverUrl).toBe('/uploads/brand/cover-valeria.webp');
    expect(updated.primaryColor).toBe('#1D4E89');
    expect(updated.backgroundPreset).toBe('baldosin');
    expect(updated.fontPreset).toBe('editorial');
    expect(updated.cardStyle).toBe('mostrador');

    const publicCatalog = await getPublicCatalogBySlug('ceramica-valeria');
    expect(publicCatalog?.business.primaryColor).toBe('#1D4E89');
    expect(publicCatalog?.business.backgroundPreset).toBe('baldosin');
    // Verifica que la primera categoría de la vitrina ahora sea cat2 ("Macetas Pintadas a Mano")
    expect(publicCatalog?.categories[0]?.id).toBe(cat2.id);
    expect(publicCatalog?.categories[1]?.id).toBe(cat1.id);
  });
});

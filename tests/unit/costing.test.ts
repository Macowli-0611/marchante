import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createProduct, listCategories } from '@/modules/catalog/service';
import {
  listProductsWithCostingSummary,
  sumCostBreakdownCop,
  updateProductCosting,
} from '@/modules/catalog/costing';

describe('Sección H — Costos, Ganancia en Pesos, Margen (%) y Desglose por Insumos (H1 a H4)', () => {
  it('H1..H4: calcula ganancia en pesos, margen porcentual, precio sugerido y costo desglosado por ingredientes/insumos', async () => {
    const seller = await registerSeller({
      ownerName: 'Sofía Castro',
      businessName: 'Brownies Sofía',
      slug: 'brownies-sofia-costos',
      email: 'sofia-costos@marchante.co',
      password: 'password123',
      whatsappPhone: '3128889900',
      category: 'reposteria',
    });

    const cats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Caja de Brownies Melcochudos (x4)',
      priceCop: 20000,
      costCop: 0,
    });

    // H3: Desglose por ingredientes/insumos
    const breakdown = [
      { id: 'i1', name: 'Chocolate 70% y mantequilla', costCop: 4800 },
      { id: 'i2', name: 'Harina, huevos y azúcar', costCop: 2200 },
      { id: 'i3', name: 'Caja kraft y cinta artesanal', costCop: 1000 },
    ];
    expect(sumCostBreakdownCop(breakdown)).toBe(8000);

    // Actualizar el producto usando la suma del desglose ($8.000) y precio $20.000
    const updated = await updateProductCosting(seller.businessId, {
      productId: prod.id,
      priceCop: 20000,
      costCop: 0,
      costBreakdown: breakdown,
      useBreakdownSum: true,
    });

    // Ganancia = 20.000 - 8.000 = $12.000 COP (60% de margen)
    expect(updated.product.costCop).toBe(8000);
    expect(updated.margin.profitCop).toBe(12000);
    expect(updated.margin.marginPercent).toBe(60);
    expect(updated.margin.health).toBe('healthy');

    // H2 & H4: Verificar resumen del portafolio y precio sugerido
    const summary = await listProductsWithCostingSummary(seller.businessId, 50);
    expect(summary.summary.totalProducts).toBe(1);
    expect(summary.summary.averageMarginPercent).toBe(60);
    expect(summary.summary.healthyCount).toBe(1);
    // Para costo $8.000 y margen objetivo 50% -> precio sugerido = $16.000
    expect(summary.products[0]?.suggestedPriceCop).toBe(16000);
  });
});

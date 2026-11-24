import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createProduct, listCategories } from '@/modules/catalog/service';
import { recordFinancialMovement } from '@/modules/finance/service';
import { recordQuickSale } from '@/modules/sales/service';
import { getDailySummary } from '@/modules/analytics/daily-summary';

describe('Sección I — Resumen Diario en Lenguaje Humano (I1 a I4)', () => {
  it('I1..I4: calcula cuánto vendió, cuánto ganó, cuánto gastó, el producto estrella del día en Bogotá y genera la narrativa humana', async () => {
    const seller = await registerSeller({
      ownerName: 'Doña Teresa',
      businessName: 'Empanadas Doña Teresa',
      slug: 'empanadas-dona-teresa',
      email: 'teresa-resumen@marchante.co',
      password: 'password123',
      whatsappPhone: '3149990011',
      category: 'comida_casera',
    });

    const cats = await listCategories(seller.businessId);
    const catId = cats[0]!.id;

    // 1. Estado inicial vacío con tono humano
    const emptySummary = await getDailySummary(seller.businessId);
    expect(emptySummary.metrics.totalSoldCop).toBe(0);
    expect(emptySummary.starProduct).toBeNull();
    expect(emptySummary.narrative.storyParagraph).toContain('todavía no se ha estrenado la caja');

    // 2. Crear dos productos y registrar ventas hoy
    const empanada = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Empanada de Cambray',
      priceCop: 3500,
      costCop: 1500, // Ganancia unitaria: $2.000
    });

    const avena = await createProduct(seller.businessId, {
      categoryId: catId,
      name: 'Vaso de Avena Helada',
      priceCop: 4000,
      costCop: 1500, // Ganancia unitaria: $2.500
    });

    // Vende 10 empanadas ($35.000 venta, $20.000 ganancia) y 3 avenas ($12.000 venta, $7.500 ganancia)
    // Total vendido hoy = $47.000 | Ganancia bruta productos = $27.500
    await recordQuickSale(seller.businessId, {
      paymentMethod: 'cash',
      items: [
        { productId: empanada.id, quantity: 10 },
        { productId: avena.id, quantity: 3 },
      ],
    });

    // Registra un gasto hoy de $7.500 (servilletas y bolsas)
    await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      amountCop: 7500,
      paymentMethod: 'cash',
      description: 'Servilletas y bolsas de papel',
    });

    // 3. Consultar Resumen Diario
    const activeSummary = await getDailySummary(seller.businessId);
    expect(activeSummary.metrics.totalSoldCop).toBe(47000);
    expect(activeSummary.metrics.grossProfitCop).toBe(27500);
    expect(activeSummary.metrics.expensesCop).toBe(7500);
    // Ganancia libre tras costos y gastos = 27.500 - 7.500 = $20.000
    expect(activeSummary.metrics.netProfitCop).toBe(20000);

    // Producto estrella: Empanada de Cambray (10 unidades)
    expect(activeSummary.starProduct).not.toBeNull();
    expect(activeSummary.starProduct?.productName).toBe('Empanada de Cambray');
    expect(activeSummary.starProduct?.unitsSold).toBe(10);
    expect(activeSummary.starProduct?.revenueCop).toBe(35000);

    // Narrativa humana clara
    expect(activeSummary.narrative.storyParagraph).toContain('$ 47.000');
    expect(activeSummary.narrative.storyParagraph).toContain('$ 7.500');
    expect(activeSummary.narrative.storyParagraph).toContain('$ 20.000');
    expect(activeSummary.narrative.starProductSentence).toContain('Empanada de Cambray');
  });
});

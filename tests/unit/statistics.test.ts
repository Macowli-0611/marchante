import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createCategory, createProduct, listCategories } from '@/modules/catalog/service';
import { recordFinancialMovement } from '@/modules/finance/service';
import { recordQuickSale } from '@/modules/sales/service';
import { getBusinessStatistics } from '@/modules/analytics/statistics';

describe('Sección J — Estadísticas y Gráficas con Frases Explicativas y Filtros en Bogotá (J1 a J6)', () => {
  it('J1..J6: calcula ventas, ganancias, gastos, comparación porcentual contra el periodo anterior, top productos, categorías, pagos, mejores clientes y horas fuertes', async () => {
    const seller = await registerSeller({
      ownerName: 'Gabriel Ortiz',
      businessName: 'Asados Don Gabriel',
      slug: 'asados-don-gabriel',
      email: 'gabriel-stats@marchante.co',
      password: 'password123',
      whatsappPhone: '3107771122',
      category: 'comida_casera',
    });

    const initialCats = await listCategories(seller.businessId);
    const catAsados = initialCats[0]!;
    const catBebidas = await createCategory(seller.businessId, { name: 'Bebidas Naturales' });

    const churrasco = await createProduct(seller.businessId, {
      categoryId: catAsados.id,
      name: 'Churrasco al Carbón',
      priceCop: 30000,
      costCop: 14000, // Ganancia: $16.000
    });

    const jugo = await createProduct(seller.businessId, {
      categoryId: catBebidas.id,
      name: 'Jugo de Maracuyá en Leche',
      priceCop: 7000,
      costCop: 2000, // Ganancia: $5.000
    });

    // Fijamos una fecha de referencia: Sábado 2026-11-21 a las 1:00 p. m. Bogotá (18:00 UTC)
    const nowAnchor = new Date('2026-11-21T18:00:00.000Z');
    // Venta de la semana pasada: Jueves 2026-11-12 a las 12:00 p. m. Bogotá ($100.000)
    const lastWeekInstant = new Date('2026-11-12T17:00:00.000Z');
    await recordQuickSale(seller.businessId, {
      paymentMethod: 'cash',
      soldAt: lastWeekInstant,
      items: [{ productId: churrasco.id, quantity: 4, unitPriceCop: 25000 }], // $100.000
    });

    // Ventas de ESTA semana (Viernes 2026-11-20 y Sábado 2026-11-21): total $118.000 (18% más que la semana pasada!)
    await recordQuickSale(seller.businessId, {
      paymentMethod: 'nequi',
      newCustomerName: 'Andrés Cepeda',
      newCustomerPhone: '3159998877',
      soldAt: new Date('2026-11-20T18:00:00.000Z'), // 1:00 p.m. Bogotá
      items: [
        { productId: churrasco.id, quantity: 3 }, // $90.000
        { productId: jugo.id, quantity: 4 }, // $28.000 -> Total: $118.000
      ],
    });

    // Gasto de esta semana: Carbón y leña $18.000
    await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      amountCop: 18000,
      paymentMethod: 'cash',
      description: 'Bultos de carbón vegetal',
      occurredAt: nowAnchor,
      businessDate: '2026-11-21',
    });

    const weekStats = await getBusinessStatistics(
      seller.businessId,
      { period: 'week' },
      nowAnchor,
    );

    // 1. Comparación de ventas contra la semana anterior: $118.000 vs $100.000 -> +18%
    expect(weekStats.overview.salesCop).toBe(118000);
    expect(weekStats.overview.prevSalesCop).toBe(100000);
    expect(weekStats.overview.salesChangePercent).toBe(18);
    expect(weekStats.explanations.timelineExplanation).toContain(
      'Esta semana vendiste 18% más que la semana pasada',
    );

    // 2. Ganancia bruta productos = (3 * 16.000) + (4 * 5.000) = 48.000 + 20.000 = 68.000
    // Ganancia libre neta = 68.000 - 18.000 (gastos) = 50.000
    expect(weekStats.overview.grossProfitCop).toBe(68000);
    expect(weekStats.overview.expensesCop).toBe(18000);
    expect(weekStats.overview.netProfitCop).toBe(50000);

    // 3. Productos más vendidos (Jugo 4 uds, Churrasco 3 uds)
    expect(weekStats.topProducts).toHaveLength(2);
    expect(weekStats.topProducts[0]?.productName).toBe('Jugo de Maracuyá en Leche');
    expect(weekStats.topProducts[0]?.unitsSold).toBe(4);

    // 4. Categorías, Métodos de pago, Mejores clientes y Horas fuertes
    expect(weekStats.categoryBreakdown).toHaveLength(2);
    expect(weekStats.paymentMethodBreakdown[0]?.methodCode).toBe('nequi');
    expect(weekStats.topCustomers[0]?.customerName).toBe('Andrés Cepeda');
    expect(weekStats.topCustomers[0]?.totalSpentCop).toBe(118000);
    expect(weekStats.peakHours[0]?.hour).toBe(13); // 1:00 p. m. Bogotá
    expect(weekStats.explanations.peakHoursExplanation).toContain('1:00 p. m.');
  });
});

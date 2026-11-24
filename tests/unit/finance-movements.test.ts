import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createProduct, listCategories } from '@/modules/catalog/service';
import {
  createExpenseCategory,
  getFinanceLedger,
  listExpenseCategories,
  recordFinancialMovement,
  voidFinancialMovement,
} from '@/modules/finance/service';
import { recordQuickSale } from '@/modules/sales/service';

describe('Sección G — Gastos e Ingresos (G1 a G4)', () => {
  it('G1..G4: registra gastos por categoría, crea categorías propias, suma ingresos de ventas + ingresos extra manuales y permite anular', async () => {
    const seller = await registerSeller({
      ownerName: 'Ricardo Torres',
      businessName: 'Panadería Don Ricardo',
      slug: 'panaderia-don-ricardo',
      email: 'ricardo-finanzas@marchante.co',
      password: 'password123',
      whatsappPhone: '3118887766',
      category: 'reposteria',
    });

    // Verificar que nace con las categorías predeterminadas de gasto (Materia prima, Empaques, Transporte, etc.)
    const defaultCats = await listExpenseCategories(seller.businessId);
    expect(defaultCats.length).toBeGreaterThanOrEqual(5);
    const materiaPrimaCat = defaultCats.find((c) => c.name.includes('Materia prima'))!;
    expect(materiaPrimaCat).toBeDefined();

    // G2: Crear una categoría propia de gasto
    const gasCat = await createExpenseCategory(seller.businessId, {
      name: 'Cilindro de Gas Propano',
    });
    expect(gasCat.name).toBe('Cilindro de Gas Propano');

    // Registrar una venta confirmada ($40.000 ingresos, $15.000 costo -> $25.000 ganancia bruta)
    const prodCats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: prodCats[0]!.id,
      name: 'Rosca de Pandequeso Familiar',
      priceCop: 20000,
      costCop: 7500,
    });

    await recordQuickSale(seller.businessId, {
      paymentMethod: 'cash',
      items: [{ productId: prod.id, quantity: 2 }],
    });

    // G1: Registrar 2 gastos (Materia prima $12.000 y Gas $8.000 = $20.000 total gastos)
    await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      categoryId: materiaPrimaCat.id,
      amountCop: 12000,
      paymentMethod: 'cash',
      description: 'Compra de queso costeño y almidón',
    });

    const gasExpense = await recordFinancialMovement(seller.businessId, {
      kind: 'EXPENSE',
      categoryId: gasCat.id,
      amountCop: 8000,
      paymentMethod: 'nequi',
      description: 'Recarga cilindro de gas horno',
    });

    // G3: Registrar un ingreso extra manual ($10.000)
    await recordFinancialMovement(seller.businessId, {
      kind: 'EXTRA_INCOME',
      customCategoryName: 'Venta de costales vacíos',
      amountCop: 10000,
      paymentMethod: 'cash',
      description: 'Venta de 10 costales de harina limpios',
    });

    // G4: Consultar libro del día en hora Bogotá
    const ledger = await getFinanceLedger(seller.businessId, { period: 'today' });
    expect(ledger.totals.salesIncomeCop).toBe(40000);
    expect(ledger.totals.extraIncomeCop).toBe(10000);
    expect(ledger.totals.totalIncomeCop).toBe(50000);
    expect(ledger.totals.expensesCop).toBe(20000);
    // Balance neto en caja: 50.000 - 20.000 = 30.000
    expect(ledger.totals.netCashBalanceCop).toBe(30000);
    expect(ledger.expensesByCategory).toHaveLength(2);

    // Anular el gasto de $8.000 y verificar que los gastos bajan a $12.000
    await voidFinancialMovement(seller.businessId, {
      movementId: gasExpense.id,
      reason: 'Digitado por error',
    });

    const ledgerAfterVoid = await getFinanceLedger(seller.businessId, { period: 'today' });
    expect(ledgerAfterVoid.totals.expensesCop).toBe(12000);
    expect(ledgerAfterVoid.totals.netCashBalanceCop).toBe(38000);
  });
});

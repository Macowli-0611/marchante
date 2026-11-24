import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { expenseCategories, financialMovements, sales } from '@/db/schema';
import { getBogotaDateString, resolveBogotaPeriod } from '@/modules/shared/bogota-time';
import { AppError } from '@/modules/shared/errors';

/**
 * Separa los gastos en dos grupos:
 * - Compras de insumos/empaques (`isProductCost`): ya están dentro del costo de cada
 *   producto vendido, así que NO se restan otra vez de la ganancia (solo salen de la caja).
 * - Gastos operativos (arriendo, transporte, publicidad…): sí se restan de la ganancia.
 */
export function splitExpenses<T extends { kind: string; amountCop: number; isProductCost: boolean }>(
  movements: T[],
) {
  const expenses = movements.filter((m) => m.kind === 'EXPENSE');
  const productCostPurchasesCop = expenses
    .filter((m) => m.isProductCost)
    .reduce((acc, m) => acc + m.amountCop, 0);
  const operatingExpensesCop = expenses
    .filter((m) => !m.isProductCost)
    .reduce((acc, m) => acc + m.amountCop, 0);
  return {
    expenses,
    expensesCop: productCostPurchasesCop + operatingExpensesCop,
    productCostPurchasesCop,
    operatingExpensesCop,
  };
}
import {
  createExpenseCategorySchema,
  financeLedgerQuerySchema,
  recordFinancialMovementSchema,
  voidFinancialMovementSchema,
  type CreateExpenseCategoryInput,
  type FinanceLedgerQueryInput,
  type RecordFinancialMovementInput,
  type VoidFinancialMovementInput,
} from './validators';

/**
 * Lista las categorías de gasto activas del negocio (Requisito G1, G2).
 */
export async function listExpenseCategories(businessId: string) {
  return withTenantContext(businessId, async (tx) => {
    return tx
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.businessId, businessId),
          isNull(expenseCategories.archivedAt),
        ),
      )
      .orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.name));
  });
}

/**
 * Crea una categoría personalizada de gasto para el negocio (Requisito G2).
 */
export async function createExpenseCategory(
  businessId: string,
  rawInput: CreateExpenseCategoryInput,
) {
  const input = createExpenseCategorySchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const existing = await tx
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.businessId, businessId),
          isNull(expenseCategories.archivedAt),
        ),
      );

    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === input.name.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`Ya tienes una categoría de gasto llamada "${input.name}".`);
    }

    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0);

    const [created] = await tx
      .insert(expenseCategories)
      .values({
        businessId,
        name: input.name,
        icon: input.icon || 'receipt',
        isDefault: false,
        isProductCost: input.isProductCost,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return created!;
  });
}

/**
 * Registra un gasto (`EXPENSE`) o un ingreso extra manual (`EXTRA_INCOME`) (Requisitos G1, G3).
 */
export async function recordFinancialMovement(
  businessId: string,
  rawInput: RecordFinancialMovementInput,
) {
  const input = recordFinancialMovementSchema.parse(rawInput);
  const occurredAt = input.occurredAt ?? new Date();
  const businessDate = input.businessDate ?? getBogotaDateString(occurredAt);

  return withTenantContext(businessId, async (tx) => {
    let categoryId: string | null = input.categoryId ?? null;
    let isProductCost = false;
    let categoryNameSnapshot =
      input.kind === 'EXTRA_INCOME'
        ? input.customCategoryName?.trim() || 'Ingreso extra'
        : input.customCategoryName?.trim() || 'Otros gastos del día';

    if (categoryId) {
      const [cat] = await tx
        .select()
        .from(expenseCategories)
        .where(
          and(
            eq(expenseCategories.id, categoryId),
            eq(expenseCategories.businessId, businessId),
          ),
        )
        .limit(1);

      if (cat) {
        categoryNameSnapshot = cat.name;
        isProductCost = input.kind === 'EXPENSE' && cat.isProductCost;
      } else {
        categoryId = null;
      }
    }

    const [created] = await tx
      .insert(financialMovements)
      .values({
        businessId,
        kind: input.kind,
        categoryId,
        categoryNameSnapshot,
        amountCop: input.amountCop,
        paymentMethod: input.paymentMethod,
        description: input.description,
        isProductCost,
        occurredAt,
        businessDate,
      })
      .returning();

    return created!;
  });
}

/**
 * Anula un gasto o ingreso extra manual mal digitado (Requisito G4).
 */
export async function voidFinancialMovement(
  businessId: string,
  rawInput: VoidFinancialMovementInput,
) {
  const input = voidFinancialMovementSchema.parse(rawInput);

  return withTenantContext(businessId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(financialMovements)
      .where(
        and(
          eq(financialMovements.id, input.movementId),
          eq(financialMovements.businessId, businessId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError('Movimiento no encontrado.', 404);
    }
    if (existing.voidedAt) {
      throw new AppError('Este movimiento ya fue anulado.', 409);
    }

    const [voided] = await tx
      .update(financialMovements)
      .set({
        voidedAt: new Date(),
        voidReason: input.reason,
      })
      .where(eq(financialMovements.id, existing.id))
      .returning();

    return voided!;
  });
}

export interface UnifiedLedgerEntry {
  id: string;
  entryType: 'SALE_INCOME' | 'EXTRA_INCOME' | 'EXPENSE';
  title: string;
  categoryLabel: string;
  amountCop: number;
  paymentMethod: string;
  businessDate: string;
  occurredAt: Date;
  canVoidFromFinance: boolean;
}

/**
 * Obtiene el libro completo de Gastos e Ingresos (ventas + ingresos extra manuales)
 * filtrado por periodo en hora de Colombia (`America/Bogota`) (Requisitos G1..G4).
 */
export async function getFinanceLedger(
  businessId: string,
  rawQuery: FinanceLedgerQueryInput = {},
) {
  const query = financeLedgerQuerySchema.parse(rawQuery);
  const periodInfo = resolveBogotaPeriod(query.period, new Date(), {
    fromYmd: query.fromYmd,
    toYmd: query.toYmd,
  });

  return withTenantContext(businessId, async (tx) => {
    const categories = await tx
      .select()
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.businessId, businessId),
          isNull(expenseCategories.archivedAt),
        ),
      )
      .orderBy(asc(expenseCategories.sortOrder), asc(expenseCategories.name));

    const confirmedSales = await tx
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          isNull(sales.voidedAt),
          gte(sales.businessDate, periodInfo.fromYmd),
          lte(sales.businessDate, periodInfo.toYmd),
        ),
      )
      .orderBy(desc(sales.soldAt));

    const manualMovements = await tx
      .select()
      .from(financialMovements)
      .where(
        and(
          eq(financialMovements.businessId, businessId),
          isNull(financialMovements.voidedAt),
          gte(financialMovements.businessDate, periodInfo.fromYmd),
          lte(financialMovements.businessDate, periodInfo.toYmd),
        ),
      )
      .orderBy(desc(financialMovements.occurredAt));

    const salesIncomeCop = confirmedSales.reduce((sum, s) => sum + s.totalCop, 0);
    const salesGrossProfitCop = confirmedSales.reduce((sum, s) => sum + s.grossProfitCop, 0);

    const extraIncomeCop = manualMovements
      .filter((m) => m.kind === 'EXTRA_INCOME')
      .reduce((sum, m) => sum + m.amountCop, 0);

    const {
      expenses: expensesList,
      expensesCop,
      productCostPurchasesCop,
      operatingExpensesCop,
    } = splitExpenses(manualMovements);

    // Desglose de gastos por categoría
    const expenseByCatMap = new Map<string, number>();
    for (const exp of expensesList) {
      expenseByCatMap.set(
        exp.categoryNameSnapshot,
        (expenseByCatMap.get(exp.categoryNameSnapshot) || 0) + exp.amountCop,
      );
    }

    const expensesByCategory = [...expenseByCatMap.entries()]
      .map(([categoryName, totalCop]) => ({
        categoryName,
        totalCop,
        percent: expensesCop > 0 ? Math.round((totalCop / expensesCop) * 100) : 0,
      }))
      .sort((a, b) => b.totalCop - a.totalCop);

    // Construir flujo unificado cronológico
    const allEntries: UnifiedLedgerEntry[] = [
      ...confirmedSales.map((s) => ({
        id: s.id,
        entryType: 'SALE_INCOME' as const,
        title: `Venta #${s.saleCode}${s.customerNameSnapshot ? ` · ${s.customerNameSnapshot}` : ''}`,
        categoryLabel: s.source === 'CATALOG_ORDER' ? 'Pedido por catálogo' : 'Venta rápida',
        amountCop: s.totalCop,
        paymentMethod: s.paymentMethod,
        businessDate: s.businessDate,
        occurredAt: s.soldAt,
        canVoidFromFinance: false,
      })),
      ...manualMovements.map((m) => ({
        id: m.id,
        entryType:
          m.kind === 'EXTRA_INCOME' ? ('EXTRA_INCOME' as const) : ('EXPENSE' as const),
        title: m.description,
        categoryLabel: m.categoryNameSnapshot,
        amountCop: m.amountCop,
        paymentMethod: m.paymentMethod,
        businessDate: m.businessDate,
        occurredAt: m.occurredAt,
        canVoidFromFinance: true,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const filteredEntries = allEntries.filter((entry) => {
      if (query.filterKind === 'sales') return entry.entryType === 'SALE_INCOME';
      if (query.filterKind === 'extra_income') return entry.entryType === 'EXTRA_INCOME';
      if (query.filterKind === 'expenses') return entry.entryType === 'EXPENSE';
      return true;
    });

    const totalIncomeCop = salesIncomeCop + extraIncomeCop;
    const netCashBalanceCop = totalIncomeCop - expensesCop;
    // Caja: todo lo que entró menos todo lo que salió.
    // Ganancia: lo que dejaron las ventas (ya sin costo de producto) menos gastos operativos.
    const netProfitAfterExpensesCop = salesGrossProfitCop + extraIncomeCop - operatingExpensesCop;

    return {
      period: {
        preset: periodInfo.preset,
        label: periodInfo.label,
        fromYmd: periodInfo.fromYmd,
        toYmd: periodInfo.toYmd,
      },
      totals: {
        salesIncomeCop,
        salesCount: confirmedSales.length,
        salesGrossProfitCop,
        extraIncomeCop,
        totalIncomeCop,
        expensesCop,
        expensesCount: expensesList.length,
        productCostPurchasesCop,
        operatingExpensesCop,
        netCashBalanceCop,
        netProfitAfterExpensesCop,
      },
      expensesByCategory,
      categories,
      entries: filteredEntries,
    };
  });
}

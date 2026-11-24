import { z } from 'zod';
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import { financialMovements, saleItems, sales } from '@/db/schema';
import {
  addBogotaDays,
  resolveBogotaPeriod,
  type StatsPeriodPreset,
} from '@/modules/shared/bogota-time';
import { formatCop } from '@/modules/shared/currency';
import { PAYMENT_METHOD_LABELS } from '@/modules/shared/payment-methods';
import { splitExpenses } from '@/modules/finance/service';

export const statisticsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'custom']).optional().default('week'),
  fromYmd: z.string().optional(),
  toYmd: z.string().optional(),
});

export type StatisticsQueryInput = z.input<typeof statisticsQuerySchema>;


function formatHour12h(hour24: number): string {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? 'a. m.' : 'p. m.';
  return `${h12}:00 ${suffix}`;
}

function buildDateListInclusive(fromYmd: string, toYmd: string): string[] {
  const list: string[] = [];
  let cursor = fromYmd;
  let guard = 0;
  while (cursor <= toYmd && guard < 366) {
    list.push(cursor);
    cursor = addBogotaDays(cursor, 1);
    guard++;
  }
  return list;
}

/**
 * Calcula todas las estadísticas, series temporales, rankings y frases explicativas humanas
 * en zona horaria `America/Bogota` (Requisitos J1 a J6).
 */
export async function getBusinessStatistics(
  businessId: string,
  rawQuery: StatisticsQueryInput = {},
  now: Date = new Date(),
) {
  const query = statisticsQuerySchema.parse(rawQuery);
  const periodInfo = resolveBogotaPeriod(query.period as StatsPeriodPreset, now, {
    fromYmd: query.fromYmd,
    toYmd: query.toYmd,
  });

  return withTenantContext(businessId, async (tx) => {
    // 1. Ventas del periodo actual
    const currentSales = await tx
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          isNull(sales.voidedAt),
          gte(sales.businessDate, periodInfo.fromYmd),
          lte(sales.businessDate, periodInfo.toYmd),
        ),
      );

    // 2. Ventas del periodo inmediatamente anterior (para "Esta semana vendiste X% más que la anterior")
    const previousSales = await tx
      .select({
        totalCop: sales.totalCop,
        grossProfitCop: sales.grossProfitCop,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          isNull(sales.voidedAt),
          gte(sales.businessDate, periodInfo.prevFromYmd),
          lte(sales.businessDate, periodInfo.prevToYmd),
        ),
      );

    // 3. Líneas de venta del periodo actual (con precios y costos congelados)
    const currentSaleIds = currentSales.map((s) => s.id);
    const currentSaleItems =
      currentSaleIds.length > 0
        ? await tx
            .select()
            .from(saleItems)
            .where(inArray(saleItems.saleId, currentSaleIds))
        : [];

    // 4. Gastos e ingresos extra del periodo actual
    const currentMovements = await tx
      .select()
      .from(financialMovements)
      .where(
        and(
          eq(financialMovements.businessId, businessId),
          isNull(financialMovements.voidedAt),
          gte(financialMovements.businessDate, periodInfo.fromYmd),
          lte(financialMovements.businessDate, periodInfo.toYmd),
        ),
      );

    // 5. Totales generales y comparación porcentual contra el periodo anterior
    const salesCop = currentSales.reduce((acc, s) => acc + s.totalCop, 0);
    const grossProfitCop = currentSales.reduce((acc, s) => acc + s.grossProfitCop, 0);
    const prevSalesCop = previousSales.reduce((acc, s) => acc + s.totalCop, 0);

    const {
      expensesCop,
      productCostPurchasesCop,
      operatingExpensesCop,
    } = splitExpenses(currentMovements);
    const extraIncomeCop = currentMovements
      .filter((m) => m.kind === 'EXTRA_INCOME')
      .reduce((acc, m) => acc + m.amountCop, 0);

    // Las compras de insumos ya están en el costo de lo vendido (grossProfitCop).
    const netProfitCop = grossProfitCop + extraIncomeCop - operatingExpensesCop;

    let salesChangePercent: number | null = null;
    if (prevSalesCop > 0) {
      salesChangePercent = Math.round(((salesCop - prevSalesCop) / prevSalesCop) * 100);
    }

    // 6. Serie diaria (Ventas, Ganancias y Gastos por día — Requisito J3)
    const dateList = buildDateListInclusive(periodInfo.fromYmd, periodInfo.toYmd);
    const dailyMap = new Map<
      string,
      { salesCop: number; grossProfitCop: number; expensesCop: number; operatingCop: number; extraCop: number }
    >();
    const emptyBucket = () => ({ salesCop: 0, grossProfitCop: 0, expensesCop: 0, operatingCop: 0, extraCop: 0 });
    for (const d of dateList) {
      dailyMap.set(d, emptyBucket());
    }

    for (const s of currentSales) {
      const bucket = dailyMap.get(s.businessDate) || emptyBucket();
      bucket.salesCop += s.totalCop;
      bucket.grossProfitCop += s.grossProfitCop;
      dailyMap.set(s.businessDate, bucket);
    }

    for (const mov of currentMovements) {
      const bucket = dailyMap.get(mov.businessDate) || emptyBucket();
      if (mov.kind === 'EXPENSE') {
        bucket.expensesCop += mov.amountCop;
        if (!mov.isProductCost) bucket.operatingCop += mov.amountCop;
      } else if (mov.kind === 'EXTRA_INCOME') {
        bucket.extraCop += mov.amountCop;
      }
      dailyMap.set(mov.businessDate, bucket);
    }

    const dailyTimeline = [...dailyMap.entries()].map(([date, vals]) => ({
      date,
      shortLabel: date.slice(5), // MM-DD
      salesCop: vals.salesCop,
      profitCop: vals.grossProfitCop + vals.extraCop - vals.operatingCop,
      grossProfitCop: vals.grossProfitCop,
      expensesCop: vals.expensesCop,
    }));

    // 7. Productos más vendidos y Categorías (Requisito J4)
    const prodMap = new Map<
      string,
      {
        productId: string | null;
        productName: string;
        categoryName: string;
        unitsSold: number;
        revenueCop: number;
        profitCop: number;
      }
    >();

    const catMap = new Map<
      string,
      {
        categoryName: string;
        unitsSold: number;
        revenueCop: number;
        profitCop: number;
      }
    >();

    for (const item of currentSaleItems) {
      const prodKey = item.productId || `name:${item.productNameSnapshot}`;
      const existingProd = prodMap.get(prodKey);
      if (existingProd) {
        existingProd.unitsSold += item.quantity;
        existingProd.revenueCop += item.lineTotalCop;
        existingProd.profitCop += item.lineProfitCop;
      } else {
        prodMap.set(prodKey, {
          productId: item.productId,
          productName: item.productNameSnapshot,
          categoryName: item.categoryNameSnapshot,
          unitsSold: item.quantity,
          revenueCop: item.lineTotalCop,
          profitCop: item.lineProfitCop,
        });
      }

      const catKey = item.categoryNameSnapshot || 'General';
      const existingCat = catMap.get(catKey);
      if (existingCat) {
        existingCat.unitsSold += item.quantity;
        existingCat.revenueCop += item.lineTotalCop;
        existingCat.profitCop += item.lineProfitCop;
      } else {
        catMap.set(catKey, {
          categoryName: catKey,
          unitsSold: item.quantity,
          revenueCop: item.lineTotalCop,
          profitCop: item.lineProfitCop,
        });
      }
    }

    const topProducts = [...prodMap.values()]
      .sort((a, b) => (b.unitsSold !== a.unitsSold ? b.unitsSold - a.unitsSold : b.revenueCop - a.revenueCop))
      .slice(0, 10)
      .map((p) => ({
        ...p,
        sharePercent: salesCop > 0 ? Math.round((p.revenueCop / salesCop) * 100) : 0,
      }));

    const categoryBreakdown = [...catMap.values()]
      .sort((a, b) => b.revenueCop - a.revenueCop)
      .map((c) => ({
        ...c,
        sharePercent: salesCop > 0 ? Math.round((c.revenueCop / salesCop) * 100) : 0,
      }));

    // 8. Métodos de pago (Requisito J5)
    const pmMap = new Map<string, { salesCount: number; totalCop: number }>();
    for (const s of currentSales) {
      const curr = pmMap.get(s.paymentMethod) || { salesCount: 0, totalCop: 0 };
      curr.salesCount += 1;
      curr.totalCop += s.totalCop;
      pmMap.set(s.paymentMethod, curr);
    }

    const paymentMethodBreakdown = [...pmMap.entries()]
      .map(([code, vals]) => ({
        methodCode: code,
        methodLabel: PAYMENT_METHOD_LABELS[code] || code,
        salesCount: vals.salesCount,
        totalCop: vals.totalCop,
        sharePercent: salesCop > 0 ? Math.round((vals.totalCop / salesCop) * 100) : 0,
      }))
      .sort((a, b) => b.totalCop - a.totalCop);

    // 9. Mejores clientes del periodo (Requisito J6)
    const custMap = new Map<
      string,
      { customerId: string | null; customerName: string; purchasesCount: number; totalSpentCop: number }
    >();
    for (const s of currentSales) {
      if (!s.customerId && !s.customerNameSnapshot) continue;
      const key = s.customerId || `name:${s.customerNameSnapshot}`;
      const existing = custMap.get(key);
      if (existing) {
        existing.purchasesCount += 1;
        existing.totalSpentCop += s.totalCop;
      } else {
        custMap.set(key, {
          customerId: s.customerId,
          customerName: s.customerNameSnapshot || 'Cliente',
          purchasesCount: 1,
          totalSpentCop: s.totalCop,
        });
      }
    }

    const topCustomers = [...custMap.values()]
      .sort((a, b) => b.totalSpentCop - a.totalSpentCop)
      .slice(0, 8);

    // 10. Horas fuertes en hora de Colombia (Requisito J6)
    const hoursMap = new Map<number, { salesCount: number; totalCop: number }>();
    for (const s of currentSales) {
      const h = Number(s.bogotaHour);
      const curr = hoursMap.get(h) || { salesCount: 0, totalCop: 0 };
      curr.salesCount += 1;
      curr.totalCop += s.totalCop;
      hoursMap.set(h, curr);
    }

    const peakHours = [...hoursMap.entries()]
      .map(([hour, vals]) => ({
        hour,
        label12h: formatHour12h(hour),
        salesCount: vals.salesCount,
        totalCop: vals.totalCop,
      }))
      .sort((a, b) => a.hour - b.hour);

    const strongestHour = [...peakHours].sort((a, b) => b.totalCop - a.totalCop)[0] || null;

    // ========================================================================
    // 11. FRASES EXPLICATIVAS HUMANAS ARRIBA DE CADA GRÁFICA (Requisito J2)
    // ========================================================================

    let timelineExplanation = `${periodInfo.label} aún no tienes ventas registradas.`;
    if (salesCop > 0) {
      if (salesChangePercent !== null) {
        if (salesChangePercent > 0) {
          timelineExplanation = `${periodInfo.label} vendiste ${salesChangePercent}% más que ${
            periodInfo.comparisonLabel
          } (${formatCop(salesCop)} vs. ${formatCop(prevSalesCop)}).`;
        } else if (salesChangePercent < 0) {
          timelineExplanation = `${periodInfo.label} vendiste ${Math.abs(
            salesChangePercent,
          )}% menos que ${periodInfo.comparisonLabel} (${formatCop(salesCop)} vs. ${formatCop(
            prevSalesCop,
          )}).`;
        } else {
          timelineExplanation = `${periodInfo.label} llevas exactamente el mismo ritmo de ventas que ${
            periodInfo.comparisonLabel
          } (${formatCop(salesCop)}).`;
        }
      } else {
        timelineExplanation = `${periodInfo.label} has vendido ${formatCop(salesCop)} en ${
          currentSales.length
        } venta(s), dejando ${formatCop(netProfitCop)} libres después de costos y gastos.`;
      }
    }

    const topProductsExplanation = topProducts[0]
      ? `Tu producto campeón es "${topProducts[0].productName}" con ${
          topProducts[0].unitsSold
        } unidades vendidas (${formatCop(topProducts[0].revenueCop)} en ventas y ${formatCop(
          topProducts[0].profitCop,
        )} de ganancia).`
      : 'Cuando registres ventas, aquí verás cuáles productos te dejan más plata.';

    const categoriesExplanation = categoryBreakdown[0]
      ? `La categoría "${categoryBreakdown[0].categoryName}" representa el ${
          categoryBreakdown[0].sharePercent
        }% de tus ventas del periodo (${formatCop(categoryBreakdown[0].revenueCop)}).`
      : 'Aún no hay ventas por categoría en este rango de fechas.';

    const paymentMethodsExplanation = paymentMethodBreakdown[0]
      ? `El método preferido por tus clientes fue ${paymentMethodBreakdown[0].methodLabel}, por donde entró el ${
          paymentMethodBreakdown[0].sharePercent
        }% de la plata (${formatCop(paymentMethodBreakdown[0].totalCop)}).`
      : 'Aún no hay pagos registrados en este periodo.';

    const topCustomersExplanation = topCustomers[0]
      ? `Tu cliente número uno del periodo es ${topCustomers[0].customerName}, quien te ha comprado ${formatCop(
          topCustomers[0].totalSpentCop,
        )} en ${topCustomers[0].purchasesCount} compra(s).`
      : 'Asocia clientes en tus ventas o recibe pedidos por el catálogo para ver quiénes son tus clientes más fieles.';

    const peakHoursExplanation = strongestHour
      ? `Tu hora más fuerte es alrededor de las ${strongestHour.label12h} (hora Colombia), con ${
          strongestHour.salesCount
        } venta(s) por ${formatCop(strongestHour.totalCop)}.`
      : 'Aún no hay suficientes ventas para identificar tus horas pico.';

    return {
      period: {
        preset: periodInfo.preset,
        label: periodInfo.label,
        comparisonLabel: periodInfo.comparisonLabel,
        fromYmd: periodInfo.fromYmd,
        toYmd: periodInfo.toYmd,
        prevFromYmd: periodInfo.prevFromYmd,
        prevToYmd: periodInfo.prevToYmd,
      },
      overview: {
        salesCop,
        prevSalesCop,
        salesChangePercent,
        salesCount: currentSales.length,
        grossProfitCop,
        expensesCop,
        productCostPurchasesCop,
        operatingExpensesCop,
        extraIncomeCop,
        netProfitCop,
      },
      explanations: {
        timelineExplanation,
        topProductsExplanation,
        categoriesExplanation,
        paymentMethodsExplanation,
        topCustomersExplanation,
        peakHoursExplanation,
      },
      dailyTimeline,
      topProducts,
      categoryBreakdown,
      paymentMethodBreakdown,
      topCustomers,
      peakHours,
    };
  });
}

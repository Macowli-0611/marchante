import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { withTenantContext } from '@/db';
import {
  businesses,
  financialMovements,
  orders,
  products,
  saleItems,
  sales,
} from '@/db/schema';
import {
  addBogotaDays,
  DAY_LABELS_ES,
  formatBogotaTime12h,
  getBogotaParts,
} from '@/modules/shared/bogota-time';
import { formatCop } from '@/modules/shared/currency';
import { evaluateBusinessOpenStatus } from '@/modules/business/schedule';
import { splitExpenses } from '@/modules/finance/service';

export interface StarProductOfTheDay {
  productId: string | null;
  productName: string;
  categoryName: string;
  unitsSold: number;
  revenueCop: number;
  profitCop: number;
}

export interface DailySummaryData {
  business: {
    id: string;
    name: string;
    ownerName: string;
    slug: string;
    whatsappPhone: string;
  };
  dateBogota: string;
  dateHumanLabel: string;
  currentTimeBogota: string;
  openStatus: ReturnType<typeof evaluateBusinessOpenStatus>;
  metrics: {
    totalSoldCop: number;
    salesCount: number;
    totalCostOfSoldCop: number;
    grossProfitCop: number;
    /** Todo lo que salió de la caja hoy (insumos + operativos). */
    expensesCop: number;
    expensesCount: number;
    /** Compras de insumos/empaques: ya están en el costo de lo vendido, no se restan otra vez. */
    productCostPurchasesCop: number;
    /** Gastos operativos: sí se restan de la ganancia. */
    operatingExpensesCop: number;
    extraIncomeCop: number;
    netProfitCop: number;
    yesterdaySoldCop: number;
    /** Lo vendido ayer hasta esta misma hora (comparación justa durante el día). */
    yesterdaySameTimeSoldCop: number;
    vsYesterdayText: string;
  };
  starProduct: StarProductOfTheDay | null;
  narrative: {
    headline: string;
    storyParagraph: string;
    starProductSentence: string;
    tipOfTheDay: string;
  };
  pendingOrdersCount: number;
  activeProductsCount: number;
  recentSalesToday: Array<{
    id: string;
    saleCode: string;
    totalCop: number;
    grossProfitCop: number;
    paymentMethod: string;
    customerNameSnapshot: string | null;
    timeLabel: string;
    itemsSummary: string;
  }>;
}

/**
 * Construye las frases en lenguaje claro, cálido y humano para el resumen diario (Requisito I2).
 */
export function buildHumanDailyNarrative(params: {
  ownerName: string;
  businessName: string;
  totalSoldCop: number;
  salesCount: number;
  grossProfitCop: number;
  expensesCop: number;
  expensesCount: number;
  operatingExpensesCop?: number;
  productCostPurchasesCop?: number;
  extraIncomeCop: number;
  netProfitCop: number;
  yesterdaySoldCop: number;
  /** Si se da, la comparación es contra ayer a esta misma hora. */
  yesterdaySameTimeSoldCop?: number;
  starProduct: StarProductOfTheDay | null;
}): DailySummaryData['narrative'] & { vsYesterdayText: string } {
  const operatingExpensesCop = params.operatingExpensesCop ?? params.expensesCop;
  const productCostPurchasesCop = params.productCostPurchasesCop ?? 0;
  const sameTime = typeof params.yesterdaySameTimeSoldCop === 'number';
  const yesterdayRef = sameTime ? params.yesterdaySameTimeSoldCop! : params.yesterdaySoldCop;
  const refLabel = sameTime ? 'ayer a esta hora' : 'ayer';
  const firstName = params.ownerName.trim().split(/\s+/)[0] || 'marchante';

  // Comparación humana frente a ayer
  let vsYesterdayText =
    params.yesterdaySoldCop > 0
      ? `${sameTime ? 'Ayer a esta hora no llevabas ventas' : 'Ayer no hubo ventas'}; ayer cerraste en ${formatCop(params.yesterdaySoldCop)}`
      : 'Ayer no hubo ventas registradas';
  if (yesterdayRef > 0) {
    const diff = params.totalSoldCop - yesterdayRef;
    const pct = Math.round((diff / yesterdayRef) * 100);
    if (diff > 0) {
      vsYesterdayText = `Vas ${pct}% arriba de ${refLabel} (${formatCop(yesterdayRef)})`;
    } else if (diff < 0) {
      vsYesterdayText = `${sameTime ? 'Ayer a esta hora llevabas' : 'Ayer cerraste en'} ${formatCop(
        yesterdayRef,
      )} (${Math.abs(pct)}% más que hoy por ahora)`;
    } else {
      vsYesterdayText = `Llevas exactamente lo mismo que ${refLabel} (${formatCop(yesterdayRef)})`;
    }
  } else if (params.totalSoldCop > 0 && params.yesterdaySoldCop === 0) {
    vsYesterdayText = '¡Mejor que ayer! (ayer estuvo en $ 0)';
  }

  // Caso 1: Día sin ventas ni gastos todavía
  if (params.salesCount === 0 && params.expensesCount === 0 && params.extraIncomeCop === 0) {
    return {
      headline: `¡Buenas, ${firstName}! El mostrador de ${params.businessName} está listo.`,
      storyParagraph:
        'Hoy todavía no se ha estrenado la caja. Comparte el link de tu vitrina en tus estados de WhatsApp o usa el botón de Venta Rápida cuando atiendas a tu primer cliente.',
      starProductSentence:
        'Apenas registres tu primera venta del día, aquí verás cuál es tu producto estrella.',
      tipOfTheDay:
        'Consejo del día: publicar una foto fresca en tu estado de WhatsApp con tu link suele traer los primeros pedidos de la mañana.',
      vsYesterdayText,
    };
  }

  // Caso 2: Sin ventas pero con ingresos extra
  if (params.salesCount === 0 && params.extraIncomeCop > 0) {
    return {
      headline: `¡Buenas, ${firstName}! Hoy ya entraron ${formatCop(params.extraIncomeCop)} de ingresos extra.`,
      storyParagraph: `Todavía no hay ventas registradas, pero anotaste ${formatCop(
        params.extraIncomeCop,
      )} en ingresos extra${
        params.expensesCop > 0 ? ` y ${formatCop(params.expensesCop)} en gastos` : ''
      }. El balance del día va en ${formatCop(params.netProfitCop)}.`,
      starProductSentence: 'Todavía no hay producto estrella hoy.',
      tipOfTheDay:
        'Consejo del día: comparte tu link en los estados de WhatsApp para que lleguen los primeros pedidos.',
      vsYesterdayText,
    };
  }

  // Caso 3: Solo gastos registrados hoy, aún sin ventas
  if (params.salesCount === 0 && params.expensesCop > 0) {
    return {
      headline: `¡Ánimo, ${firstName}! Ya dejaste listos los insumos del día.`,
      storyParagraph: `Hoy has anotado ${formatCop(params.expensesCop)} en ${
        params.expensesCount
      } gasto(s) y aún no has registrado ventas. ¡Vamos a recuperar esa inversión en el mostrador!`,
      starProductSentence: 'Todavía no hay producto estrella hoy.',
      tipOfTheDay:
        'Anotar los gastos apenas los pagas es el secreto para que al final del mes las cuentas cuadren al peso.',
      vsYesterdayText,
    };
  }

  // Caso 4: Día activo con ventas
  const salesWord = params.salesCount === 1 ? '1 venta' : `${params.salesCount} ventas`;
  const expenseClause =
    operatingExpensesCop > 0
      ? `y después de restar ${formatCop(operatingExpensesCop)} en gastos del negocio`
      : 'y hoy no has tenido gastos del negocio';
  const purchasesClause =
    productCostPurchasesCop > 0
      ? ` (Las compras de insumos de hoy, ${formatCop(productCostPurchasesCop)}, ya están dentro del costo de cada producto: no se restan dos veces).`
      : '';

  const netSentence =
    params.netProfitCop >= 0
      ? `te van quedando ${formatCop(params.netProfitCop)} libres de verdad.`
      : `por los gastos de hoy el balance neto del día va en ${formatCop(params.netProfitCop)}.`;

  const storyParagraph = `Hoy has vendido ${formatCop(
    params.totalSoldCop,
  )} en ${salesWord} (dejando ${formatCop(
    params.grossProfitCop,
  )} de ganancia sobre tus productos), ${expenseClause}, ${netSentence}${purchasesClause}`;

  const starProductSentence = params.starProduct
    ? `Tu producto estrella de hoy es "${params.starProduct.productName}" con ${
        params.starProduct.unitsSold
      } unidad(es) vendidas, que te trajeron ${formatCop(
        params.starProduct.revenueCop,
      )} en ventas (${formatCop(params.starProduct.profitCop)} de ganancia).`
    : 'Todos tus productos han aportado parejo hoy.';

  const headline =
    params.netProfitCop > 0
      ? `¡Buen día, ${firstName}! Hoy la caja va dejando ${formatCop(params.netProfitCop)} libres.`
      : `¡Así va el día, ${firstName}! Llevas ${formatCop(params.totalSoldCop)} vendidos.`;

  const tipOfTheDay =
    params.starProduct && params.starProduct.unitsSold > 0
      ? `Consejo del día: "${params.starProduct.productName}" es lo que más sale hoy; destácalo en tu estado de WhatsApp.`
      : 'Consejo del día: anota cada gasto apenas lo pagas para que las cuentas cuadren al peso.';

  return {
    headline,
    storyParagraph,
    starProductSentence,
    tipOfTheDay,
    vsYesterdayText,
  };
}

/**
 * Calcula el Resumen Diario en hora oficial de Colombia (`America/Bogota`)
 * para la pantalla principal del panel (Requisitos I1..I4).
 */
export async function getDailySummary(
  businessId: string,
  targetDateYmd?: string,
  now: Date = new Date(),
): Promise<DailySummaryData> {
  const bogotaNow = getBogotaParts(now);
  const dateBogota = targetDateYmd || bogotaNow.dateString;
  const yesterdayBogota = addBogotaDays(dateBogota, -1);

  return withTenantContext(businessId, async (tx) => {
    const [business] = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new Error('Negocio no encontrado.');
    }

    const todaySales = await tx
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          eq(sales.businessDate, dateBogota),
          isNull(sales.voidedAt),
        ),
      )
      .orderBy(desc(sales.soldAt));

    const yesterdaySales = await tx
      .select({ totalCop: sales.totalCop, soldAt: sales.soldAt })
      .from(sales)
      .where(
        and(
          eq(sales.businessId, businessId),
          eq(sales.businessDate, yesterdayBogota),
          isNull(sales.voidedAt),
        ),
      );

    const todaySaleIds = todaySales.map((s) => s.id);
    const todayItems =
      todaySaleIds.length > 0
        ? await tx
            .select()
            .from(saleItems)
            .where(inArray(saleItems.saleId, todaySaleIds))
        : [];

    const todayMovements = await tx
      .select()
      .from(financialMovements)
      .where(
        and(
          eq(financialMovements.businessId, businessId),
          eq(financialMovements.businessDate, dateBogota),
          isNull(financialMovements.voidedAt),
        ),
      );

    const pendingOrders = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.status, 'PENDING')))
      .limit(500);

    const activeProducts = await tx
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.businessId, businessId), isNull(products.archivedAt)));

    // 1. Cuánto vendió y cuánto ganó sobre los productos
    const totalSoldCop = todaySales.reduce((acc, s) => acc + s.totalCop, 0);
    const totalCostOfSoldCop = todaySales.reduce((acc, s) => acc + s.totalCostCop, 0);
    const grossProfitCop = todaySales.reduce((acc, s) => acc + s.grossProfitCop, 0);
    const yesterdaySoldCop = yesterdaySales.reduce((acc, s) => acc + s.totalCop, 0);
    const isToday = dateBogota === bogotaNow.dateString;
    const sameTimeCutoff = now.getTime() - 24 * 60 * 60 * 1000;
    const yesterdaySameTimeSoldCop = yesterdaySales
      .filter((s) => s.soldAt.getTime() <= sameTimeCutoff)
      .reduce((acc, s) => acc + s.totalCop, 0);

    // 2. Cuánto gastó hoy e ingresos extra
    const {
      expenses: todayExpenses,
      expensesCop,
      productCostPurchasesCop,
      operatingExpensesCop,
    } = splitExpenses(todayMovements);
    const extraIncomeCop = todayMovements
      .filter((m) => m.kind === 'EXTRA_INCOME')
      .reduce((acc, m) => acc + m.amountCop, 0);

    // Ganancia libre del día tras costos de productos y gastos del día
    const netProfitCop = grossProfitCop + extraIncomeCop - operatingExpensesCop;

    // 3. Producto estrella del día (mayor cantidad de unidades vendidas hoy; desempate por ingresos)
    const productStatsMap = new Map<string, StarProductOfTheDay>();
    for (const line of todayItems) {
      const key = line.productId || `name:${line.productNameSnapshot}`;
      const existing = productStatsMap.get(key);
      if (existing) {
        existing.unitsSold += line.quantity;
        existing.revenueCop += line.lineTotalCop;
        existing.profitCop += line.lineProfitCop;
      } else {
        productStatsMap.set(key, {
          productId: line.productId,
          productName: line.productNameSnapshot,
          categoryName: line.categoryNameSnapshot,
          unitsSold: line.quantity,
          revenueCop: line.lineTotalCop,
          profitCop: line.lineProfitCop,
        });
      }
    }

    const rankedProducts = [...productStatsMap.values()].sort((a, b) => {
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
      return b.revenueCop - a.revenueCop;
    });

    const starProduct = rankedProducts[0] || null;

    const narrativeWithComparison = buildHumanDailyNarrative({
      ownerName: business.ownerName,
      businessName: business.name,
      totalSoldCop,
      salesCount: todaySales.length,
      grossProfitCop,
      expensesCop,
      expensesCount: todayExpenses.length,
      operatingExpensesCop,
      productCostPurchasesCop,
      extraIncomeCop,
      netProfitCop,
      yesterdaySoldCop,
      yesterdaySameTimeSoldCop: isToday ? yesterdaySameTimeSoldCop : undefined,
      starProduct,
    });

    const openStatus = evaluateBusinessOpenStatus(business.schedule, now);

    return {
      business: {
        id: business.id,
        name: business.name,
        ownerName: business.ownerName,
        slug: business.slug,
        whatsappPhone: business.whatsappPhone,
      },
      dateBogota,
      dateHumanLabel:
        dateBogota === bogotaNow.dateString
          ? `Hoy, ${DAY_LABELS_ES[bogotaNow.dayKey].toLowerCase()} ${dateBogota}`
          : `Día consultado: ${dateBogota}`,
      currentTimeBogota: formatBogotaTime12h(now),
      openStatus,
      metrics: {
        totalSoldCop,
        salesCount: todaySales.length,
        totalCostOfSoldCop,
        grossProfitCop,
        expensesCop,
        expensesCount: todayExpenses.length,
        productCostPurchasesCop,
        operatingExpensesCop,
        extraIncomeCop,
        netProfitCop,
        yesterdaySoldCop,
        yesterdaySameTimeSoldCop: isToday ? yesterdaySameTimeSoldCop : yesterdaySoldCop,
        vsYesterdayText: narrativeWithComparison.vsYesterdayText,
      },
      starProduct,
      narrative: {
        headline: narrativeWithComparison.headline,
        storyParagraph: narrativeWithComparison.storyParagraph,
        starProductSentence: narrativeWithComparison.starProductSentence,
        tipOfTheDay: narrativeWithComparison.tipOfTheDay,
      },
      pendingOrdersCount: pendingOrders.length,
      activeProductsCount: activeProducts.length,
      recentSalesToday: todaySales.slice(0, 8).map((s) => {
        const lines = todayItems.filter((i) => i.saleId === s.id);
        return {
          id: s.id,
          saleCode: s.saleCode,
          totalCop: s.totalCop,
          grossProfitCop: s.grossProfitCop,
          paymentMethod: s.paymentMethod,
          customerNameSnapshot: s.customerNameSnapshot,
          timeLabel: formatBogotaTime12h(s.soldAt),
          itemsSummary: lines
            .map((l) => `${l.quantity}x ${l.productNameSnapshot}`)
            .join(', '),
        };
      }),
    };
  });
}

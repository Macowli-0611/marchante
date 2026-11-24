'use client';

import React from 'react';
import { Award, Clock, CreditCard, Layers, Users } from 'lucide-react';
import { PeriodSelector } from '@/components/ui/period-selector';
import { formatCop } from '@/modules/shared/currency';
import { InsightCard, ShareBar, StatRow } from './statistics/insight-card';
import { OverviewCards } from './statistics/overview-cards';
import { SalesTimelineChart } from './statistics/sales-timeline-chart';
import type { StatisticsPayload } from './statistics/types';
import { useStatistics } from './statistics/use-statistics';

/** Estadísticas y gráficas (/panel/estadisticas). Las piezas viven en `./statistics/`. */
export function StatisticsDashboard({ initialStats }: { initialStats: StatisticsPayload }) {
  const { stats, period, loading, changePeriod } = useStatistics(initialStats);
  const { explanations } = stats;

  return (
    <div aria-busy={loading} className={`space-y-6 pb-20 ${loading ? 'opacity-70' : ''}`}>
      <div className="card-boleto p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
            America/Bogota · {stats.period.fromYmd} a {stats.period.toYmd}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Estadísticas de tu negocio</h1>
          <p className="text-sm text-ink-muted mt-0.5">Frases claras y gráficas para entender cómo evoluciona tu tienda.</p>
        </div>
        <PeriodSelector
          value={period}
          onChange={changePeriod}
          initialFromYmd={initialStats.period.fromYmd}
          initialToYmd={initialStats.period.toYmd}
          customLabel="Personalizado"
          applyLabel="Ver rango"
        />
      </div>

      <OverviewCards stats={stats} />
      <SalesTimelineChart stats={stats} />

      <div className="grid lg:grid-cols-2 gap-6">
        <InsightCard
          title="Productos más vendidos"
          icon={<Award className="h-5 w-5 text-warning" />}
          explanation={explanations.topProductsExplanation}
          isEmpty={stats.topProducts.length === 0}
          emptyText="Aún no hay productos vendidos."
        >
          <div className="space-y-3">
            {stats.topProducts.map((prod, idx) => (
              <ShareBar
                key={`${prod.productName}-${idx}`}
                label={
                  <>
                    {idx + 1}. {prod.productName} <span className="text-ink-muted">({prod.unitsSold} uds)</span>
                  </>
                }
                value={
                  <span className="font-mono-cop font-extrabold text-ink">
                    {formatCop(prod.revenueCop)} <span className="text-profit">(+{formatCop(prod.profitCop)})</span>
                  </span>
                }
                sharePercent={prod.sharePercent}
                barClass="bg-brand"
              />
            ))}
          </div>
        </InsightCard>

        <InsightCard
          title="Ventas por categoría"
          icon={<Layers className="h-5 w-5 text-profit" />}
          explanation={explanations.categoriesExplanation}
          isEmpty={stats.categoryBreakdown.length === 0}
          emptyText="Sin datos de categorías."
        >
          <div className="space-y-3">
            {stats.categoryBreakdown.map((cat) => (
              <ShareBar
                key={cat.categoryName}
                label={`${cat.categoryName} (${cat.unitsSold} uds · ${cat.sharePercent}%)`}
                value={<span className="font-mono-cop font-extrabold text-profit">{formatCop(cat.revenueCop)}</span>}
                sharePercent={cat.sharePercent}
                barClass="bg-profit"
              />
            ))}
          </div>
        </InsightCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <InsightCard
          title="Métodos de pago"
          icon={<CreditCard className="h-5 w-5 text-brand" />}
          explanation={explanations.paymentMethodsExplanation}
          explanationSize="xs"
          isEmpty={stats.paymentMethodBreakdown.length === 0}
          emptyText="Sin pagos en este periodo."
        >
          <div className="space-y-2.5">
            {stats.paymentMethodBreakdown.map((pm) => (
              <StatRow
                key={pm.methodCode}
                title={pm.methodLabel}
                detail={`${pm.salesCount} venta(s) · ${pm.sharePercent}%`}
                amount={formatCop(pm.totalCop)}
              />
            ))}
          </div>
        </InsightCard>

        <InsightCard
          title="Mejores clientes"
          icon={<Users className="h-5 w-5 text-profit" />}
          explanation={explanations.topCustomersExplanation}
          explanationSize="xs"
          isEmpty={stats.topCustomers.length === 0}
          emptyText="Sin clientes asociados en este periodo."
        >
          <div className="space-y-2.5">
            {stats.topCustomers.map((cust, i) => (
              <StatRow
                key={`${cust.customerName}-${i}`}
                title={`${i + 1}. ${cust.customerName}`}
                detail={`${cust.purchasesCount} compra(s)`}
                amount={formatCop(cust.totalSpentCop)}
                amountClass="text-profit"
              />
            ))}
          </div>
        </InsightCard>

        <InsightCard
          title="Horas fuertes (Hora Bogotá)"
          icon={<Clock className="h-5 w-5 text-warning" />}
          explanation={explanations.peakHoursExplanation}
          explanationSize="xs"
          isEmpty={stats.peakHours.length === 0}
          emptyText="Sin horas registradas aún."
        >
          <div className="space-y-2.5">
            {stats.peakHours.map((h) => (
              <StatRow key={h.hour} title={h.label12h} detail={`${h.salesCount} venta(s)`} amount={formatCop(h.totalCop)} />
            ))}
          </div>
        </InsightCard>
      </div>
    </div>
  );
}

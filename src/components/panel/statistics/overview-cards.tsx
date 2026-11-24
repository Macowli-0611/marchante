import React from 'react';
import { formatCop } from '@/modules/shared/currency';
import type { StatisticsPayload } from './types';

/** Ventas, ganancia libre y gastos del periodo, con comparación. */
export function OverviewCards({ stats }: { stats: StatisticsPayload }) {
  const { overview, period } = stats;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="card-boleto p-4 space-y-1">
        <span className="text-xs font-bold text-ink-muted">Ventas del periodo ({overview.salesCount})</span>
        <p className="font-mono-cop text-2xl sm:text-3xl font-extrabold text-ink">{formatCop(overview.salesCop)}</p>
        {overview.salesChangePercent !== null && (
          <p className={`text-xs font-bold ${overview.salesChangePercent >= 0 ? 'text-profit' : 'text-danger'}`}>
            <span aria-hidden="true">{overview.salesChangePercent >= 0 ? '▲' : '▼'}</span>{' '}
            <span className="sr-only">{overview.salesChangePercent >= 0 ? 'Subió' : 'Bajó'}</span>
            {Math.abs(overview.salesChangePercent)}% frente a {period.comparisonLabel}
          </p>
        )}
      </div>

      <div className="card-boleto p-4 space-y-1 bg-profit-soft/40 border-profit">
        <span className="text-xs font-bold text-profit-strong">Ganancia libre (tras costos y gastos)</span>
        <p
          className={`font-mono-cop text-2xl sm:text-3xl font-extrabold ${
            overview.netProfitCop >= 0 ? 'text-profit' : 'text-danger'
          }`}
        >
          {formatCop(overview.netProfitCop)}
        </p>
        <p className="text-xs text-profit-strong">Ganancia bruta de productos: {formatCop(overview.grossProfitCop)}</p>
      </div>

      <div className="card-boleto p-4 space-y-1">
        <span className="text-xs font-bold text-ink-muted">Gastos del periodo</span>
        <p className="font-mono-cop text-2xl sm:text-3xl font-extrabold text-danger">{formatCop(overview.expensesCop)}</p>
        <p className="text-xs text-ink-muted">Ingresos extra: {formatCop(overview.extraIncomeCop)}</p>
      </div>
    </div>
  );
}

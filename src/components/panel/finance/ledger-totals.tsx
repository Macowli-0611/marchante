import React from 'react';
import { PlusCircle, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatCop } from '@/modules/shared/currency';
import type { LedgerData } from './types';

/** Cuatro tarjetas: ventas, ingresos extra, gastos y balance del periodo. */
export function LedgerTotals({ totals }: { totals: LedgerData['totals'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="card-boleto p-4 space-y-1">
        <span className="text-xs font-bold text-ink-muted flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-profit" />
          Ingresos por ventas ({totals.salesCount})
        </span>
        <p className="font-mono-cop text-2xl font-extrabold text-profit">{formatCop(totals.salesIncomeCop)}</p>
        <p className="text-[11px] text-ink-muted">
          Ganancia bruta de productos: {formatCop(totals.salesGrossProfitCop)}
        </p>
      </div>

      <div className="card-boleto p-4 space-y-1">
        <span className="text-xs font-bold text-ink-muted flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-profit" />
          Ingresos extra manuales
        </span>
        <p className="font-mono-cop text-2xl font-extrabold text-ink">{formatCop(totals.extraIncomeCop)}</p>
        <p className="text-[11px] text-ink-muted">Total entradas: {formatCop(totals.totalIncomeCop)}</p>
      </div>

      <div className="card-boleto p-4 space-y-1">
        <span className="text-xs font-bold text-ink-muted flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-danger" />
          Gastos registrados ({totals.expensesCount})
        </span>
        <p className="font-mono-cop text-2xl font-extrabold text-danger">{formatCop(totals.expensesCop)}</p>
        <p className="text-[11px] text-ink-muted">
          {totals.productCostPurchasesCop
            ? `Insumos y empaques: ${formatCop(totals.productCostPurchasesCop)} · Gastos del negocio: ${formatCop(totals.operatingExpensesCop ?? 0)}`
            : 'Materia prima, transporte, empaques...'}
        </p>
      </div>

      <div className="card-boleto-strong p-4 space-y-1 bg-canvas">
        <span className="text-xs font-bold text-ink flex items-center gap-1.5">
          <Wallet className="h-4 w-4 text-brand" />
          Balance neto (Entró − Salió)
        </span>
        <p
          className={`font-mono-cop text-2xl font-extrabold ${
            totals.netCashBalanceCop >= 0 ? 'text-profit' : 'text-danger'
          }`}
        >
          {formatCop(totals.netCashBalanceCop)}
        </p>
        <p className="text-[11px] text-ink-muted">
          Ganancia real: {formatCop(totals.netProfitAfterExpensesCop)} (ventas menos costo de lo vendido y gastos
          del negocio; las compras de insumos ya van dentro del costo)
        </p>
      </div>
    </div>
  );
}

/** Barras de "¿en qué se fue la plata?" por categoría de gasto. */
export function ExpenseBreakdown({ items }: { items: LedgerData['expensesByCategory'] }) {
  if (items.length === 0) return null;
  return (
    <section className="card-boleto p-5 space-y-3">
      <h2 className="font-display text-base font-bold text-ink">
        ¿En qué se te fue la plata de los gastos en este periodo?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((cat) => (
          <div key={cat.categoryName} className="rounded-xl border border-line bg-canvas p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-ink">{cat.categoryName}</span>
              <span className="font-mono-cop text-danger">
                {formatCop(cat.totalCop)} ({cat.percent}%)
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full bg-line overflow-hidden"
              role="img"
              aria-label={`${cat.categoryName}: ${cat.percent}% de los gastos`}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, cat.percent)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

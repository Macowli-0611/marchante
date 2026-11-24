'use client';

import React, { useState } from 'react';
import { Download, MinusCircle, PlusCircle } from 'lucide-react';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { PeriodSelector } from '@/components/ui/period-selector';
import { buildLedgerCsv, downloadCsv } from './finance/csv';
import { ExpenseBreakdown, LedgerTotals } from './finance/ledger-totals';
import { LedgerList } from './finance/ledger-list';
import { MovementDialog } from './finance/movement-dialog';
import type { LedgerData, MovementKind } from './finance/types';
import { useFinanceLedger } from './finance/use-finance-ledger';

/** Gastos e ingresos (/panel/movimientos). Las piezas viven en `./finance/`. */
export function FinanceMovementsManager({ initialData }: { initialData: LedgerData }) {
  const finance = useFinanceLedger(initialData);
  const [dialogKind, setDialogKind] = useState<MovementKind | null>(null);
  const { ledger } = finance;

  return (
    <div className="space-y-6 pb-20">
      <div className="card-boleto p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Cuentas claras · {ledger.period.label} ({ledger.period.fromYmd} a {ledger.period.toYmd})
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Gastos e ingresos</h1>
          <p className="text-sm text-ink-muted mt-0.5 max-w-2xl">
            Anota tus compras de insumos, transporte o empaques. Las ventas entran solas y puedes registrar ingresos adicionales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              downloadCsv(buildLedgerCsv(ledger.entries), `marchante-movimientos-${ledger.period.fromYmd}.csv`)
            }
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-canvas text-xs sm:text-sm font-semibold text-ink hover:bg-subtle transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-brand" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => setDialogKind('EXTRA_INCOME')}
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-profit/30 bg-profit-soft text-xs sm:text-sm font-semibold text-profit hover:bg-profit-soft/80 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Ingreso extra
          </button>
          <button
            type="button"
            onClick={() => setDialogKind('EXPENSE')}
            className="min-h-[40px] px-4 inline-flex items-center gap-1.5 rounded-xl bg-brand text-xs sm:text-sm font-bold text-paper shadow-xs hover:bg-brand-strong transition-all cursor-pointer"
          >
            <MinusCircle className="h-4 w-4" />
            Registrar gasto
          </button>
        </div>
      </div>

      <FeedbackBanner feedback={finance.feedback} />

      <PeriodSelector
        value={finance.period}
        onChange={finance.changePeriod}
        initialFromYmd={initialData.period.fromYmd}
        initialToYmd={initialData.period.toYmd}
      />

      <LedgerTotals totals={ledger.totals} />
      <ExpenseBreakdown items={ledger.expensesByCategory} />
      <LedgerList
        entries={ledger.entries}
        filter={finance.filterKind}
        onFilterChange={finance.changeFilter}
        loading={finance.loading}
        onVoid={finance.voidEntry}
      />

      {dialogKind && (
        <MovementDialog
          kind={dialogKind}
          categories={ledger.categories}
          onClose={() => setDialogKind(null)}
          onSave={finance.saveMovement}
          onCreateCategory={finance.createCategory}
        />
      )}
    </div>
  );
}

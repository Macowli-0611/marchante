import React from 'react';
import { RotateCcw } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatCop } from '@/modules/shared/currency';
import { paymentMethodLabel } from '@/modules/shared/payment-methods';
import type { LedgerEntryItem, LedgerFilter } from './types';

const FILTERS: Array<{ id: LedgerFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'expenses', label: 'Solo gastos' },
  { id: 'sales', label: 'Ventas' },
  { id: 'extra_income', label: 'Ingresos extra' },
];

function entryBadgeClass(type: LedgerEntryItem['entryType']): string {
  if (type === 'EXPENSE') return 'bg-danger-soft text-danger';
  if (type === 'EXTRA_INCOME') return 'bg-warning-soft text-warning';
  return 'bg-profit-soft text-profit';
}

interface LedgerListProps {
  entries: LedgerEntryItem[];
  filter: LedgerFilter;
  onFilterChange: (filter: LedgerFilter) => void;
  loading: boolean;
  onVoid: (entry: LedgerEntryItem) => void;
}

/** Libro de movimientos filtrable con anulación de gastos e ingresos manuales (G4). */
export function LedgerList({ entries, filter, onFilterChange, loading, onVoid }: LedgerListProps) {
  return (
    <section className="card-boleto p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-line pb-3">
        <h2 className="font-display text-lg font-bold text-ink">Libro de movimientos ({entries.length})</h2>
        <SegmentedControl label="Tipo de movimiento" options={FILTERS} value={filter} onChange={onFilterChange} />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-6">No hay movimientos registrados en este filtro.</p>
      ) : (
        <div aria-busy={loading} className={`divide-y divide-line ${loading ? 'opacity-60' : ''}`}>
          {entries.map((entry) => {
            const isExpense = entry.entryType === 'EXPENSE';
            return (
              <div key={`${entry.entryType}-${entry.id}`} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${entryBadgeClass(entry.entryType)}`}>
                      {entry.categoryLabel}
                    </span>
                    <span className="text-xs font-mono-cop text-ink-muted">{entry.businessDate}</span>
                    <span className="text-xs text-ink-muted">· {paymentMethodLabel(entry.paymentMethod)}</span>
                  </div>
                  <p className="font-bold text-sm text-ink">{entry.title}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono-cop text-base font-extrabold ${isExpense ? 'text-danger' : 'text-profit'}`}>
                    {isExpense ? `-${formatCop(entry.amountCop)}` : `+${formatCop(entry.amountCop)}`}
                  </span>
                  {entry.canVoidFromFinance && (
                    <button
                      type="button"
                      onClick={() => onVoid(entry)}
                      aria-label={`Anular movimiento ${entry.title}`}
                      className="min-h-[34px] px-2.5 rounded-lg border border-line bg-canvas text-xs font-bold text-danger hover:bg-danger-soft inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Anular
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

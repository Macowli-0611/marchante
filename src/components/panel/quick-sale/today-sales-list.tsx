import React from 'react';
import { RotateCcw } from 'lucide-react';
import { formatBogotaTime12h } from '@/modules/shared/bogota-time';
import { formatCop } from '@/modules/shared/currency';
import { paymentMethodLabel } from '@/modules/shared/payment-methods';
import type { TodaySaleView } from './types';

interface TodaySalesListProps {
  todayBogota: string;
  sales: TodaySaleView[];
  onVoid: (sale: TodaySaleView) => void;
}

/** Ventas de hoy con anulación (E7). */
export function TodaySalesList({ todayBogota, sales, onVoid }: TodaySalesListProps) {
  return (
    <section className="card-boleto p-5 space-y-3">
      <h2 className="font-display text-lg font-bold text-ink">Ventas registradas hoy ({todayBogota})</h2>

      {sales.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Aún no hay ventas anotadas hoy. Usa los botones de arriba para estrenar el día.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className={`py-3 flex flex-wrap items-center justify-between gap-3 ${
                sale.voidedAt ? 'opacity-50 line-through' : ''
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono-cop text-xs font-extrabold text-ink">#{sale.saleCode}</span>
                  <span className="text-xs text-ink-muted">{formatBogotaTime12h(new Date(sale.soldAt))}</span>
                  <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-bold text-ink">
                    {paymentMethodLabel(sale.paymentMethod)}
                  </span>
                  {sale.source === 'CATALOG_ORDER' && (
                    <span className="rounded-md bg-profit-soft px-2 py-0.5 text-[11px] font-bold text-profit">
                      📲 Pedido WhatsApp
                    </span>
                  )}
                  {sale.customerNameSnapshot && (
                    <span className="text-xs font-semibold text-ink">👤 {sale.customerNameSnapshot}</span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {sale.items
                    .map((i) => `${i.quantity}x ${i.productNameSnapshot} (${formatCop(i.unitPriceCop)})`)
                    .join(' · ')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-mono-cop text-sm font-extrabold text-ink">{formatCop(sale.totalCop)}</p>
                  <p className="font-mono-cop text-[11px] font-bold text-profit">
                    Ganancia: {formatCop(sale.grossProfitCop)}
                  </p>
                </div>
                {!sale.voidedAt && (
                  <button
                    type="button"
                    onClick={() => onVoid(sale)}
                    title="Anular esta venta"
                    aria-label={`Anular venta #${sale.saleCode}`}
                    className="min-h-[36px] px-2.5 rounded-lg border border-line bg-canvas text-xs font-bold text-danger hover:bg-danger-soft inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Anular
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

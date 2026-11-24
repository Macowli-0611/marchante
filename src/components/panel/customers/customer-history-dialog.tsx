import React from 'react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { formatBogotaTime12h } from '@/modules/shared/bogota-time';
import { formatCop } from '@/modules/shared/currency';
import { paymentMethodLabel } from '@/modules/shared/payment-methods';
import type { CustomerDetail } from './types';

interface CustomerHistoryDialogProps {
  detail: CustomerDetail | null;
  loading: boolean;
  onClose: () => void;
}

/** Historial de compras de un cliente (F3). */
export function CustomerHistoryDialog({ detail, loading, onClose }: CustomerHistoryDialogProps) {
  return (
    <Dialog labelledBy="cust-hist-title" onClose={onClose} scrollable>
      <div className="card-boleto-strong w-full max-w-lg max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 rounded-b-none sm:rounded-b-2xl">
        {loading || !detail ? (
          <p id="cust-hist-title" role="status" className="text-sm font-semibold text-center py-8">
            Cargando historial del cliente...
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-line pb-3">
              <div>
                <h2 id="cust-hist-title" className="font-display text-2xl font-bold text-ink">
                  {detail.customer.name}
                </h2>
                <p className="text-xs text-ink-muted">
                  {detail.customer.phone ? `Tel: ${detail.customer.phone} · ` : ''}
                  {detail.customer.purchasesCount} compra(s) · Total:{' '}
                  <strong className="font-mono-cop text-profit">{formatCop(detail.customer.totalSpentCop)}</strong>
                </p>
              </div>
              <CloseButton label="Cerrar historial" onClick={onClose} />
            </div>

            {detail.customer.notes && (
              <div className="rounded-xl border border-line bg-canvas p-3 text-xs">
                <strong>Notas del cliente:</strong> {detail.customer.notes}
              </div>
            )}

            <div className="space-y-2.5">
              <h3 className="font-display text-base font-bold text-ink">
                Historial de compras ({detail.purchases.length})
              </h3>
              {detail.purchases.length === 0 ? (
                <p className="text-xs text-ink-muted py-4">Este cliente aún no tiene compras confirmadas.</p>
              ) : (
                <div className="divide-y divide-line rounded-xl border border-line bg-canvas overflow-hidden">
                  {detail.purchases.map((sale) => (
                    <div key={sale.id} className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono-cop font-extrabold text-ink">
                          #{sale.saleCode} · {sale.businessDate} ({formatBogotaTime12h(new Date(sale.soldAt))})
                        </span>
                        <span className="font-mono-cop font-extrabold text-profit">{formatCop(sale.totalCop)}</span>
                      </div>
                      <ul className="text-xs text-ink-soft space-y-0.5">
                        {sale.items.map((item) => (
                          <li key={item.id}>
                            • {item.quantity}x {item.productNameSnapshot} ({formatCop(item.unitPriceCop)} c/u)
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-ink-muted">Pagó con: {paymentMethodLabel(sale.paymentMethod)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

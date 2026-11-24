import React from 'react';
import { Check, ShoppingBag, XCircle } from 'lucide-react';
import { formatCop } from '@/modules/shared/currency';
import { paymentMethodLabel } from '@/modules/shared/payment-methods';
import type { PendingOrderView } from './types';

interface PendingOrdersTrayProps {
  orders: PendingOrderView[];
  busyOrderId: string | null;
  onConfirm: (order: PendingOrderView) => void;
  onCancel: (order: PendingOrderView) => void;
}

/** Pedidos del catálogo público por confirmar en 1 toque (E4, E5). */
export function PendingOrdersTray({ orders, busyOrderId, onConfirm, onCancel }: PendingOrdersTrayProps) {
  if (orders.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-warning bg-warning-soft p-4 sm:p-5 space-y-3 shadow-stamp-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-warning" />
          Pedidos pendientes por confirmar ({orders.length})
        </h2>
        <span className="text-xs font-bold text-warning">Llegaron desde tu catálogo público</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {orders.map((ord) => {
          const busy = busyOrderId === ord.id;
          return (
            <article
              key={ord.id}
              className="rounded-xl border-2 border-ink bg-paper p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-ink px-2.5 py-0.5 font-mono-cop text-xs font-extrabold text-paper">
                    #{ord.orderCode}
                  </span>
                  <span className="text-xs font-bold text-ink-muted">
                    {paymentMethodLabel(ord.paymentMethod)} ·{' '}
                    {ord.deliveryType === 'DELIVERY' ? '🛵 Domicilio' : '🏪 Recoge'}
                  </span>
                </div>

                <div>
                  <p className="font-bold text-base text-ink">{ord.customerName}</p>
                  {ord.customerPhone && (
                    <p className="text-xs font-mono-cop text-ink-muted">Tel: {ord.customerPhone}</p>
                  )}
                  {ord.deliveryType === 'DELIVERY' && ord.deliveryAddress && (
                    <p className="text-xs text-ink-muted">📍 {ord.deliveryAddress}</p>
                  )}
                </div>

                <ul className="border-t border-dashed border-line pt-2 space-y-1 text-xs">
                  {ord.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between">
                      <span>
                        <strong>{item.quantity}x</strong> {item.productNameSnapshot}
                      </span>
                      <span className="font-mono-cop font-bold">{formatCop(item.lineTotalCop)}</span>
                    </li>
                  ))}
                </ul>

                {ord.notes && <p className="text-xs italic text-warning">Nota: &ldquo;{ord.notes}&rdquo;</p>}
              </div>

              <div className="border-t border-line pt-3 flex items-center justify-between gap-2">
                <span className="font-mono-cop text-lg font-extrabold text-ink">{formatCop(ord.totalCop)}</span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(ord)}
                    title="Descartar pedido"
                    aria-label={`Descartar pedido #${ord.orderCode}`}
                    className="min-h-[42px] px-3 rounded-xl border border-line bg-canvas text-xs font-bold text-danger hover:bg-danger-soft cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onConfirm(ord)}
                    className="min-h-[42px] px-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-profit text-xs sm:text-sm font-extrabold text-paper shadow-stamp-2 hover:bg-profit-strong cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    {busy ? 'Confirmando...' : 'Confirmar venta'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

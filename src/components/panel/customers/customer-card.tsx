import React from 'react';
import { Calendar, Edit3, FileText, MapPin, MessageCircle, ShoppingBag } from 'lucide-react';
import { normalizeWhatsappPhone } from '@/modules/business/validators';
import { getBogotaDateString } from '@/modules/shared/bogota-time';
import { formatCop } from '@/modules/shared/currency';
import type { CustomerSummaryItem } from './types';

interface CustomerCardProps {
  customer: CustomerSummaryItem;
  onEdit: (customer: CustomerSummaryItem) => void;
  onHistory: (customer: CustomerSummaryItem) => void;
}

/** Ficha resumida de un cliente con atajos a WhatsApp, edición e historial. */
export function CustomerCard({ customer, onEdit, onHistory }: CustomerCardProps) {
  const waNumber = customer.phone ? normalizeWhatsappPhone(customer.phone) : null;
  const lastPurchase = customer.lastPurchaseAt
    ? getBogotaDateString(new Date(customer.lastPurchaseAt))
    : 'Sin compras confirmadas';

  return (
    <article className="card-boleto p-4 flex flex-col justify-between gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-display text-lg font-bold text-ink truncate">{customer.name}</h3>
          {customer.phone && <p className="font-mono-cop text-xs font-semibold text-ink-muted">📞 {customer.phone}</p>}
          {customer.address && (
            <p className="text-xs text-ink-muted flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0 text-brand" />
              <span className="truncate">{customer.address}</span>
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <span className="block text-[11px] font-bold text-ink-muted">Total gastado</span>
          <span className="font-mono-cop text-lg font-extrabold text-profit">{formatCop(customer.totalSpentCop)}</span>
          <span className="block text-[11px] text-ink-muted">{customer.purchasesCount} compra(s)</span>
        </div>
      </div>

      {customer.notes && (
        <div className="rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink-soft flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          <span>{customer.notes}</span>
        </div>
      )}

      <div className="border-t border-dashed border-line pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-ink-muted flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Última compra: <strong>{lastPurchase}</strong>
        </span>

        <div className="flex items-center gap-1.5">
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noreferrer"
              title="Escribir por WhatsApp"
              aria-label={`Escribir por WhatsApp a ${customer.name}`}
              className="min-h-[38px] px-2.5 rounded-xl border border-profit bg-profit-soft font-bold text-profit inline-flex items-center gap-1"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => onEdit(customer)}
            aria-label={`Editar ficha de ${customer.name}`}
            className="min-h-[38px] px-2.5 rounded-xl border border-line bg-canvas font-bold text-ink inline-flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onHistory(customer)}
            aria-label={`Ver historial de ${customer.name}`}
            className="min-h-[38px] px-3 rounded-xl border border-ink bg-ink font-bold text-paper inline-flex items-center gap-1 cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Historial
          </button>
        </div>
      </div>
    </article>
  );
}

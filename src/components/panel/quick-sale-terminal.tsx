'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { formatCop } from '@/modules/shared/currency';
import { PendingOrdersTray } from './quick-sale/pending-orders-tray';
import { ProductKeypad } from './quick-sale/product-keypad';
import { SaleTicket } from './quick-sale/sale-ticket';
import { TodaySalesList } from './quick-sale/today-sales-list';
import type { QuickSaleInitialData } from './quick-sale/types';
import { useQuickSale } from './quick-sale/use-quick-sale';

export type {
  PendingOrderView,
  QuickCustomerOption,
  QuickSaleProduct,
  TodaySaleView,
} from './quick-sale/types';

/** Venta rápida y pedidos de WhatsApp (/panel/vender). Las piezas viven en `./quick-sale/`. */
export function QuickSaleTerminal({ initialData }: { initialData: QuickSaleInitialData }) {
  const sale = useQuickSale(initialData);

  return (
    <div className="space-y-6 pb-24">
      <div className="card-boleto p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Terminal de cobro · {initialData.todayBogota}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Venta rápida y pedidos</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-line bg-canvas px-3.5 py-2 text-right">
            <span className="block text-[11px] font-bold text-ink-muted">
              Vendido hoy ({sale.todaySummary.count} ventas)
            </span>
            <span className="font-mono-cop text-base font-extrabold text-profit">
              {formatCop(sale.todaySummary.totalSold)}
            </span>
          </div>
          <button
            type="button"
            onClick={sale.toggleSound}
            title={sale.soundEnabled ? 'Sonido de caja activado' : 'Sonido silenciado'}
            aria-label={sale.soundEnabled ? 'Silenciar sonido de venta' : 'Activar sonido de venta'}
            aria-pressed={sale.soundEnabled}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-line hover:border-ink bg-paper inline-flex items-center justify-center text-ink cursor-pointer transition-colors"
          >
            {sale.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-profit" />
            ) : (
              <VolumeX className="h-5 w-5 text-ink-faint" />
            )}
          </button>
        </div>
      </div>

      {/* Sello de celebración al anotar o confirmar una venta (E6) */}
      {sale.stampBanner && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border-2 border-profit bg-profit-soft p-4 shadow-[3px_3px_0_0_var(--color-profit)] flex items-center justify-between gap-3 motion-safe:animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-profit text-paper flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-base sm:text-lg font-extrabold text-profit-strong">
                {sale.stampBanner.title}
              </p>
              <p className="text-xs font-semibold text-profit">{sale.stampBanner.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={sale.dismissStamp}
            className="text-xs font-bold text-profit-strong underline cursor-pointer"
          >
            Listo
          </button>
        </div>
      )}

      {sale.errorMsg && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-danger bg-danger-soft p-4 text-sm font-bold text-danger flex items-center gap-2.5"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{sale.errorMsg}</span>
        </div>
      )}

      <PendingOrdersTray
        orders={sale.pendingOrders}
        busyOrderId={sale.busyOrderId}
        onConfirm={sale.confirmOrder}
        onCancel={sale.cancelOrder}
      />

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <ProductKeypad
          products={initialData.products}
          categories={initialData.categories}
          lines={sale.ticket.lines}
          onTap={sale.addProduct}
        />
        <SaleTicket ticket={sale.ticket} paymentMethods={initialData.paymentMethods} customers={sale.customers} />
      </div>

      <TodaySalesList todayBogota={initialData.todayBogota} sales={sale.todaySales} onVoid={sale.voidSale} />
    </div>
  );
}

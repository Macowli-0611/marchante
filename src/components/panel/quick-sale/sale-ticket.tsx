import React from 'react';
import { Minus, Plus, Trash2, UserPlus, Zap } from 'lucide-react';
import type { PaymentMethodCode, PaymentMethodConfig } from '@/db/schema';
import { formatCop, parseCopInput } from '@/modules/shared/currency';
import type { TicketState } from './use-quick-sale';
import type { QuickCustomerOption } from './types';

interface SaleTicketProps {
  ticket: TicketState;
  paymentMethods: PaymentMethodConfig[];
  customers: QuickCustomerOption[];
}

const FALLBACK_METHODS: Array<{ code: PaymentMethodCode; label: string }> = [
  { code: 'cash', label: 'Efectivo' },
  { code: 'nequi', label: 'Nequi' },
  { code: 'daviplata', label: 'Daviplata' },
];

const BILLS_COP = [10000, 20000, 50000, 100000];

/** Tiquete de venta rápida: líneas con precio editable, pago, cliente y vueltas (E2). */
export function SaleTicket({ ticket, paymentMethods, customers }: SaleTicketProps) {
  const { lines, totals } = ticket;
  const methods = paymentMethods.length > 0 ? paymentMethods : FALLBACK_METHODS;

  return (
    <section className="lg:col-span-5 lg:sticky lg:top-24">
      <form onSubmit={ticket.submit} className="card-boleto-strong p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-3">
          <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand" />
            Tiquete de venta rápida
          </h2>
          {lines.length > 0 && (
            <button type="button" onClick={ticket.clear} className="text-xs font-bold text-danger underline cursor-pointer">
              Vaciar
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center space-y-1">
            <p className="text-sm font-bold text-ink">Toca cualquier producto de la lista</p>
            <p className="text-xs text-ink-muted">
              Puedes ajustar la cantidad y editar el precio en pesos antes de cobrar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line rounded-xl border border-line bg-canvas overflow-hidden">
            {lines.map((line) => (
              <div key={line.productId} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-ink truncate">{line.name}</span>
                  <div className="inline-flex items-center rounded-xl border border-ink bg-paper">
                    <button
                      type="button"
                      onClick={() => ticket.changeQuantity(line.productId, -1)}
                      aria-label={`Restar ${line.name}`}
                      className="h-8 w-8 inline-flex items-center justify-center cursor-pointer"
                    >
                      {line.quantity === 1 ? (
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="w-7 text-center font-mono-cop text-xs font-extrabold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => ticket.changeQuantity(line.productId, 1)}
                      aria-label={`Sumar ${line.name}`}
                      className="h-8 w-8 inline-flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-1.5 text-ink-muted font-semibold">
                    <span>Precio c/u ($):</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Precio unitario de ${line.name}`}
                      value={formatCop(line.unitPriceCop, { withSymbol: false })}
                      onChange={(e) => ticket.changeUnitPrice(line.productId, parseCopInput(e.target.value))}
                      className="w-24 min-h-[34px] rounded-lg border border-line bg-paper px-2 py-1 font-mono-cop font-bold text-ink"
                    />
                  </label>
                  <span className="font-mono-cop font-extrabold text-ink">
                    Subtotal: {formatCop(line.unitPriceCop * line.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. Método de pago */}
        <div className="space-y-1.5">
          <span id="ticket-payment-label" className="block text-xs font-bold text-ink">
            2. ¿Cómo te pagaron?
          </span>
          <div role="group" aria-labelledby="ticket-payment-label" className="grid grid-cols-3 gap-1.5">
            {methods.map((pm) => {
              const active = ticket.paymentMethod === pm.code;
              return (
                <button
                  key={pm.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => ticket.setPaymentMethod(pm.code)}
                  className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    active ? 'border-2 border-ink bg-ink text-paper' : 'border-line bg-canvas text-ink hover:bg-subtle'
                  }`}
                >
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Cliente opcional */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="quick-cust-select" className="text-xs font-bold text-ink">
              3. Cliente (opcional)
            </label>
            <button
              type="button"
              onClick={ticket.toggleNewCustomerFields}
              className="text-xs font-bold text-brand inline-flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {ticket.showNewCustomerFields ? 'Elegir existente' : '+ Anotar cliente nuevo'}
            </button>
          </div>

          {ticket.showNewCustomerFields ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                aria-label="Nombre del cliente"
                value={ticket.newCustomerName}
                onChange={(e) => ticket.setNewCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
                className="min-h-[40px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink"
              />
              <input
                type="tel"
                aria-label="Celular del cliente"
                value={ticket.newCustomerPhone}
                onChange={(e) => ticket.setNewCustomerPhone(e.target.value)}
                placeholder="Celular (opcional)"
                className="min-h-[40px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-mono-cop text-ink"
              />
            </div>
          ) : (
            <select
              id="quick-cust-select"
              value={ticket.selectedCustomerId}
              onChange={(e) => ticket.setSelectedCustomerId(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink"
            >
              <option value="">Venta de mostrador (sin cliente)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Total, ganancia y vueltas en efectivo */}
        <div className="rounded-xl border border-ink bg-canvas p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Total a cobrar</span>
            <span className="font-mono-cop text-2xl font-extrabold text-ink">{formatCop(totals.totalCop)}</span>
          </div>
          {totals.totalUnits > 0 && (
            <p className="text-xs font-semibold text-profit">
              Ganancia estimada en esta venta: {formatCop(totals.grossProfitCop)}
            </p>
          )}

          {ticket.paymentMethod === 'cash' && totals.totalCop > 0 && (
            <div className="border-t border-dashed border-line pt-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-ink-muted">¿Con qué billete paga?</span>
                <div className="flex flex-wrap items-center gap-1">
                  {BILLS_COP.filter((b) => b >= totals.totalCop).map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      aria-pressed={ticket.cashTenderedCop === bill}
                      onClick={() => ticket.setCashTenderedCop(bill)}
                      className={`px-2 py-0.5 rounded-md border font-mono-cop text-[11px] font-bold cursor-pointer ${
                        ticket.cashTenderedCop === bill ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink'
                      }`}
                    >
                      {formatCop(bill)}
                    </button>
                  ))}
                </div>
              </div>
              {ticket.cashTenderedCop >= totals.totalCop && (
                <div className="flex items-center justify-between rounded-lg bg-profit-soft border border-profit/40 px-2.5 py-1.5 text-xs">
                  <span className="font-bold text-profit-strong">💵 Vueltas / cambio a entregar:</span>
                  <span className="font-mono-cop font-extrabold text-profit">
                    {formatCop(ticket.cashTenderedCop - totals.totalCop)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={lines.length === 0 || ticket.submitting}
          className="w-full min-h-[54px] px-5 rounded-2xl border-2 border-ink bg-brand text-base font-extrabold text-paper shadow-stamp-3 hover:bg-brand-strong disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Zap className="h-5 w-5" />
          {ticket.submitting
            ? 'Anotando venta...'
            : lines.length === 0
              ? 'Elige un producto arriba'
              : `¡Vendí esto! · ${formatCop(totals.totalCop)}`}
        </button>
      </form>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { PaymentMethodCode } from '@/db/schema';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { formatCop } from '@/modules/shared/currency';
import type { CartState } from './use-cart';
import type { CheckoutState } from './use-checkout';
import type { PublicBusinessView, StorefrontTheme } from './types';

interface CheckoutDialogProps {
  business: PublicBusinessView;
  theme: StorefrontTheme;
  cart: CartState;
  checkout: CheckoutState;
  onClose: () => void;
}

const INPUT_CLASS = 'w-full min-h-[44px] rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink';

/** Carrito, datos del comprador y envío del pedido por WhatsApp (C4..C8). */
export function CheckoutDialog({ business, theme, cart, checkout, onClose }: CheckoutDialogProps) {
  const { confirmedOrder } = checkout;

  return (
    <Dialog labelledBy="cart-modal-title" onClose={onClose} scrollable>
      <div className="card-boleto-strong w-full max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5 rounded-b-none sm:rounded-b-2xl text-ink">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-3">
          <h2 id="cart-modal-title" className={`${theme.headingFont} text-xl flex items-center gap-2`}>
            <ShoppingBag className="h-5 w-5" style={{ color: theme.brandColor }} />
            {confirmedOrder ? `¡Pedido #${confirmedOrder.orderCode} registrado!` : 'Tu pedido'}
          </h2>
          <CloseButton label="Cerrar carrito" onClick={onClose} />
        </div>

        {confirmedOrder ? (
          <OrderConfirmation businessName={business.name} order={confirmedOrder} />
        ) : cart.cart.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">
            Tu carrito está vacío. Toca cualquier producto para armar tu pedido.
          </p>
        ) : (
          <CheckoutForm business={business} cart={cart} checkout={checkout} />
        )}
      </div>
    </Dialog>
  );
}

function OrderConfirmation({
  businessName,
  order,
}: {
  businessName: string;
  order: NonNullable<CheckoutState['confirmedOrder']>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-profit bg-profit-soft p-4 space-y-2">
        <div className="flex items-center gap-2 text-profit-strong font-bold">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            Guardamos tu pedido #{order.orderCode} como pendiente en {businessName}.
          </span>
        </div>
        <p className="text-xs text-profit-strong">
          Ahora toca el botón verde para enviar el mensaje armado al WhatsApp del vendedor y
          coordinar tu entrega.
        </p>
      </div>

      <a
        href={order.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="w-full min-h-[52px] px-5 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-profit text-base font-extrabold text-paper shadow-stamp-3"
      >
        <MessageCircle className="h-5 w-5" />
        Abrir WhatsApp con mi pedido →
      </a>

      <div className="rounded-xl border border-line bg-canvas p-3.5 space-y-1.5">
        <p className="text-xs font-bold text-ink-muted">Vista previa del mensaje generado:</p>
        <pre className="whitespace-pre-wrap text-xs font-mono-cop text-ink leading-relaxed">
          {order.whatsappMessage}
        </pre>
      </div>
    </div>
  );
}

function CartLines({ cart }: { cart: CartState }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-canvas overflow-hidden">
      {cart.cart.map((item) => (
        <div key={item.cartLineId} className="p-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-ink truncate">{item.name}</p>
            {item.notes && <p className="text-xs italic text-ink-muted">Nota: {item.notes}</p>}
            <p className="font-mono-cop text-xs font-bold text-ink-muted">
              {formatCop(item.unitPriceCop)} c/u →{' '}
              <strong className="text-ink">{formatCop(item.unitPriceCop * item.quantity)}</strong>
            </p>
          </div>

          <div className="inline-flex items-center rounded-xl border border-ink bg-paper">
            <button
              type="button"
              onClick={() => cart.changeQuantity(item.cartLineId, -1)}
              aria-label={`Quitar uno de ${item.name}`}
              className="h-9 w-9 inline-flex items-center justify-center text-ink cursor-pointer"
            >
              {item.quantity === 1 ? (
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </button>
            <span className="w-7 text-center font-mono-cop text-xs font-extrabold">{item.quantity}</span>
            <button
              type="button"
              onClick={() => cart.changeQuantity(item.cartLineId, 1)}
              aria-label={`Sumar uno de ${item.name}`}
              className="h-9 w-9 inline-flex items-center justify-center text-ink cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckoutForm({
  business,
  cart,
  checkout,
}: {
  business: PublicBusinessView;
  cart: CartState;
  checkout: CheckoutState;
}) {
  const f = checkout.fields;
  const payment = checkout.activePaymentConfig;
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const deliveryButton = (value: 'PICKUP' | 'DELIVERY', label: string) => (
    <button
      type="button"
      onClick={() => f.setDeliveryType(value)}
      aria-pressed={f.deliveryType === value}
      className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
        f.deliveryType === value ? 'border-ink bg-ink text-paper' : 'border-line bg-canvas text-ink'
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={checkout.submit} className="space-y-4">
      <CartLines cart={cart} />

      {/* Datos del comprador (C5) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cust-name" className="block text-xs font-bold text-ink mb-1">
            Tu nombre *
          </label>
          <input
            id="cust-name"
            type="text"
            required
            autoComplete="name"
            value={f.customerName}
            onChange={(e) => f.setCustomerName(e.target.value)}
            placeholder="Ej. Camila Ospina"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="cust-phone" className="block text-xs font-bold text-ink mb-1">
            Tu celular / WhatsApp
          </label>
          <input
            id="cust-phone"
            type="tel"
            autoComplete="tel"
            value={f.customerPhone}
            onChange={(e) => f.setCustomerPhone(e.target.value)}
            placeholder="300 123 4567"
            className={`${INPUT_CLASS} font-mono-cop`}
          />
        </div>
      </div>

      {/* Modalidad de entrega */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-ink">¿Cómo quieres recibir tu pedido?</span>
        <div className="grid grid-cols-2 gap-2">
          {deliveryButton('PICKUP', '🏪 Para recoger')}
          {deliveryButton('DELIVERY', '🛵 A domicilio')}
        </div>
        {f.deliveryType === 'DELIVERY' && (
          <input
            type="text"
            required
            aria-label="Dirección de entrega"
            autoComplete="street-address"
            value={f.deliveryAddress}
            onChange={(e) => f.setDeliveryAddress(e.target.value)}
            placeholder="Dirección completa y barrio (ej. Calle 15 # 8-30, apto 201)"
            className={INPUT_CLASS}
          />
        )}
      </div>

      {/* Método de pago con datos Nequi/Daviplata si aplica */}
      <div className="space-y-2">
        <label htmlFor="cust-payment" className="block text-xs font-bold text-ink">
          ¿Cómo vas a pagar?
        </label>
        <select
          id="cust-payment"
          value={f.paymentMethod}
          onChange={(e) => f.setPaymentMethod(e.target.value as PaymentMethodCode)}
          className={`${INPUT_CLASS} font-bold`}
        >
          {business.paymentMethods.map((pm) => (
            <option key={pm.code} value={pm.code}>
              {pm.label}
            </option>
          ))}
        </select>

        {payment && (payment.accountNumber || payment.instructions) && (
          <div className="rounded-xl border border-line bg-canvas p-3 text-xs space-y-1">
            {payment.accountNumber && (
              <div className="flex items-center justify-between gap-2">
                <span>
                  <strong>{payment.label}:</strong>{' '}
                  <code className="font-mono-cop font-bold">{payment.accountNumber}</code>
                  {payment.accountHolder ? ` (${payment.accountHolder})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(payment.accountNumber || '');
                    setCopiedAccount(payment.code);
                    setTimeout(() => setCopiedAccount(null), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-ink bg-paper px-2 py-1 font-bold cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  {copiedAccount === payment.code ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
            {payment.instructions && <p className="text-ink-muted">{payment.instructions}</p>}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="order-notes" className="block text-xs font-bold text-ink mb-1">
          Nota opcional para el vendedor
        </label>
        <input
          id="order-notes"
          type="text"
          maxLength={300}
          value={f.orderNotes}
          onChange={(e) => f.setOrderNotes(e.target.value)}
          placeholder="Ej. Pago con billete de $50.000, timbrar en el 2do piso..."
          className="w-full min-h-[42px] rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
        />
      </div>

      {/* Honeypot invisible anti-spam (C8) */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-hp">No llenar este campo</label>
        <input
          id="website-hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={f.websiteHoneypot}
          onChange={(e) => f.setWebsiteHoneypot(e.target.value)}
        />
      </div>

      {checkout.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger bg-danger-soft p-3 text-xs font-bold text-danger"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{checkout.error}</span>
        </div>
      )}

      <div className="rounded-xl border border-ink bg-canvas p-3.5 flex items-center justify-between">
        <span className="text-sm font-bold text-ink">Total del pedido</span>
        <span className="font-mono-cop text-xl font-extrabold text-ink">{formatCop(cart.summary.totalCop)}</span>
      </div>

      <button
        type="submit"
        disabled={checkout.submitting}
        className="w-full min-h-[52px] px-5 rounded-2xl border-2 border-ink bg-profit text-base font-extrabold text-paper shadow-stamp-3 hover:bg-profit-strong disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
      >
        <MessageCircle className="h-5 w-5" />
        {checkout.submitting ? 'Guardando pedido y abriendo WhatsApp...' : 'Enviar pedido por WhatsApp'}
      </button>
    </form>
  );
}

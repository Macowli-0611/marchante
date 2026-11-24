'use client';

import { useState } from 'react';
import type { PaymentMethodCode } from '@/db/schema';
import { generateClientOrderId } from './theme';
import type { CartState } from './use-cart';
import type { ConfirmedOrderResult, PublicBusinessView } from './types';

/**
 * Datos del comprador y envío del pedido (C5..C8): primero se guarda como PENDIENTE
 * en el servidor y luego se abre WhatsApp con el mensaje armado.
 */
export function useCheckout(business: PublicBusinessView, cart: CartState, isLivePreview: boolean) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(
    business.paymentMethods[0]?.code || 'cash',
  );
  const [orderNotes, setOrderNotes] = useState('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');
  const [clientOrderId, setClientOrderId] = useState<string>(() => generateClientOrderId());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrderResult | null>(null);

  const activePaymentConfig =
    business.paymentMethods.find((m) => m.code === paymentMethod) || business.paymentMethods[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.cart.length === 0) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: business.slug,
          clientOrderId,
          customerName,
          customerPhone,
          deliveryType,
          deliveryAddress,
          paymentMethod,
          notes: orderNotes,
          websiteHoneypot,
          items: cart.cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'No pudimos guardar tu pedido. Intenta de nuevo.');
        setSubmitting(false);
        return;
      }

      // Guardado como PENDIENTE: limpiamos carrito, rotamos la clave y abrimos WhatsApp
      setConfirmedOrder({
        orderCode: data.order.orderCode,
        whatsappUrl: data.whatsappUrl,
        whatsappMessage: data.whatsappMessage,
        totalCop: data.order.totalCop,
      });
      cart.clear();
      setClientOrderId(generateClientOrderId());
      setSubmitting(false);

      if (typeof window !== 'undefined' && !isLivePreview) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      setError('Error de conexión al registrar tu pedido. Intenta nuevamente.');
      setSubmitting(false);
    }
  }

  return {
    fields: {
      customerName,
      setCustomerName,
      customerPhone,
      setCustomerPhone,
      deliveryType,
      setDeliveryType,
      deliveryAddress,
      setDeliveryAddress,
      paymentMethod,
      setPaymentMethod,
      orderNotes,
      setOrderNotes,
      websiteHoneypot,
      setWebsiteHoneypot,
    },
    activePaymentConfig,
    submitting,
    error,
    confirmedOrder,
    resetConfirmation: () => setConfirmedOrder(null),
    submit,
  };
}

export type CheckoutState = ReturnType<typeof useCheckout>;

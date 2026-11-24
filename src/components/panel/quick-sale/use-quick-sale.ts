'use client';

import { useMemo, useState } from 'react';
import type { PaymentMethodCode } from '@/db/schema';
import { formatCop } from '@/modules/shared/currency';
import { triggerSaleFeedback } from './sale-feedback';
import type {
  PendingOrderView,
  QuickSaleInitialData,
  QuickSaleLine,
  QuickSaleProduct,
  StampBanner,
  TodaySaleView,
} from './types';

async function postJson(url: string, method: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok, data };
}

/**
 * Estado y acciones de /panel/vender: tiquete en curso (E2), pedidos pendientes
 * (E4, E5), ventas de hoy con anulación (E7) y sello de celebración (E6).
 */
export function useQuickSale(initialData: QuickSaleInitialData) {
  const [pendingOrders, setPendingOrders] = useState(initialData.pendingOrders);
  const [todaySales, setTodaySales] = useState(initialData.todaySales);
  const [customers, setCustomers] = useState(initialData.customers);

  // Tiquete en curso
  const [lines, setLines] = useState<QuickSaleLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>(
    initialData.paymentMethods[0]?.code || 'cash',
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showNewCustomerFields, setShowNewCustomerFields] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [cashTenderedCop, setCashTenderedCop] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [stampBanner, setStampBanner] = useState<StampBanner | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ticketTotals = useMemo(() => {
    let totalCop = 0;
    let totalCostCop = 0;
    let totalUnits = 0;
    for (const line of lines) {
      totalCop += line.unitPriceCop * line.quantity;
      totalCostCop += line.unitCostCop * line.quantity;
      totalUnits += line.quantity;
    }
    return { totalCop, totalCostCop, grossProfitCop: totalCop - totalCostCop, totalUnits };
  }, [lines]);

  const todaySummary = useMemo(() => {
    const active = todaySales.filter((s) => !s.voidedAt);
    return {
      count: active.length,
      totalSold: active.reduce((sum, s) => sum + s.totalCop, 0),
      totalProfit: active.reduce((sum, s) => sum + s.grossProfitCop, 0),
    };
  }, [todaySales]);

  async function refreshWorkspace() {
    const res = await fetch('/api/panel/sales');
    const data = await res.json();
    if (res.ok && data.ok) {
      setPendingOrders(data.pendingOrders as PendingOrderView[]);
      setTodaySales(data.todaySales as TodaySaleView[]);
      setCustomers(data.customers);
    }
  }

  // ------------------------------------------------------------ Tiquete (E2)
  function addProduct(prod: QuickSaleProduct) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === prod.id);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...prev,
        { productId: prod.id, name: prod.name, quantity: 1, unitPriceCop: prod.priceCop, unitCostCop: prod.costCop },
      ];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }

  function changeUnitPrice(productId: string, unitPriceCop: number) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, unitPriceCop } : l)));
  }

  async function recordSale(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const { ok, data } = await postJson('/api/panel/sales', 'POST', {
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPriceCop: l.unitPriceCop })),
        paymentMethod,
        customerId: selectedCustomerId || null,
        newCustomerName: showNewCustomerFields ? newCustomerName : undefined,
        newCustomerPhone: showNewCustomerFields ? newCustomerPhone : undefined,
        notes: saleNotes,
      });
      if (!ok) {
        setErrorMsg(data.error || 'No se pudo registrar la venta.');
        return;
      }

      triggerSaleFeedback(soundEnabled);
      setStampBanner({
        title: `¡Venta #${data.sale.saleCode} anotada! +${formatCop(data.sale.totalCop)}`,
        subtitle: `Ganancia libre de esta venta: ${formatCop(data.sale.grossProfitCop)}`,
      });
      setLines([]);
      setSelectedCustomerId('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setShowNewCustomerFields(false);
      setSaleNotes('');
      await refreshWorkspace();
    } catch {
      setErrorMsg('Error de conexión al guardar la venta.');
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------- Pedidos pendientes (E4, E5)
  async function confirmOrder(ord: PendingOrderView) {
    setBusyOrderId(ord.id);
    setErrorMsg(null);
    try {
      const { ok, data } = await postJson('/api/panel/orders', 'POST', {
        action: 'confirm',
        orderId: ord.id,
        paymentMethod: ord.paymentMethod,
      });
      if (!ok) {
        setErrorMsg(data.error || 'No se pudo confirmar el pedido.');
        return;
      }
      triggerSaleFeedback(soundEnabled);
      setStampBanner({
        title: `¡Pedido #${ord.orderCode} confirmado como venta #${data.sale.saleCode}!`,
        subtitle: `${ord.customerName} · +${formatCop(data.sale.totalCop)} pa' la cuenta`,
      });
      await refreshWorkspace();
    } catch {
      setErrorMsg('Error de conexión al confirmar el pedido.');
    } finally {
      setBusyOrderId(null);
    }
  }

  async function cancelOrder(ord: PendingOrderView) {
    setBusyOrderId(ord.id);
    setErrorMsg(null);
    try {
      const { ok, data } = await postJson('/api/panel/orders', 'POST', {
        action: 'cancel',
        orderId: ord.id,
        reason: 'Pedido descartado desde el mostrador',
      });
      if (!ok) setErrorMsg(data.error || 'No se pudo descartar el pedido.');
      await refreshWorkspace();
    } catch {
      setErrorMsg('Error de conexión al descartar el pedido.');
    } finally {
      setBusyOrderId(null);
    }
  }

  // ---------------------------------------------------------- Anulación (E7)
  async function voidSale(sale: TodaySaleView) {
    setErrorMsg(null);
    const { ok, data } = await postJson('/api/panel/sales', 'PATCH', {
      saleId: sale.id,
      reason: 'Anulada por corrección del vendedor',
    });
    if (!ok) {
      setErrorMsg(data.error || 'No se pudo anular la venta.');
      return;
    }
    await refreshWorkspace();
  }

  return {
    pendingOrders,
    todaySales,
    customers,
    todaySummary,
    ticket: {
      lines,
      totals: ticketTotals,
      paymentMethod,
      setPaymentMethod,
      selectedCustomerId,
      setSelectedCustomerId,
      showNewCustomerFields,
      toggleNewCustomerFields: () => setShowNewCustomerFields((v) => !v),
      newCustomerName,
      setNewCustomerName,
      newCustomerPhone,
      setNewCustomerPhone,
      cashTenderedCop,
      setCashTenderedCop,
      clear: () => setLines([]),
      changeQuantity,
      changeUnitPrice,
      submitting,
      submit: recordSale,
    },
    addProduct,
    soundEnabled,
    toggleSound: () => setSoundEnabled((s) => !s),
    busyOrderId,
    confirmOrder,
    cancelOrder,
    voidSale,
    stampBanner,
    dismissStamp: () => setStampBanner(null),
    errorMsg,
  };
}

export type QuickSaleState = ReturnType<typeof useQuickSale>;
export type TicketState = QuickSaleState['ticket'];

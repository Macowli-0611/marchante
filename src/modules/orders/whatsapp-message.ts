import { formatCop } from '@/modules/shared/currency';
import { formatBogotaTime12h, getBogotaDateString } from '@/modules/shared/bogota-time';
import { normalizeWhatsappPhone } from '@/modules/business/validators';

export interface WhatsAppOrderItemLine {
  productName: string;
  quantity: number;
  unitPriceCop: number;
  lineTotalCop: number;
  notes?: string;
}

export interface BuildWhatsAppOrderMessageInput {
  orderCode: string;
  businessName: string;
  businessWhatsapp: string;
  customerName: string;
  customerPhone?: string;
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string;
  paymentMethodLabel: string;
  notes?: string;
  items: WhatsAppOrderItemLine[];
  totalCop: number;
  createdAt?: Date;
  /** El pedido llegó fuera del horario: se avisa para que el vendedor confirme la entrega. */
  receivedWhileClosed?: boolean;
}

/**
 * Limpia caracteres de formato de WhatsApp (* _ ~ `) enviados por el usuario
 * para que no descuadren el recibo, conservando caracteres habituales en direcciones
 * colombianas (# - ° .) y tildes.
 */
function sanitizeText(raw: string | undefined): string {
  if (!raw) return '';
  return raw.replace(/[*_~`]/g, '').trim();
}

/**
 * Construye el texto del pedido listo para enviar al WhatsApp del vendedor (Requisito C7).
 */
export function buildWhatsAppOrderMessage(input: BuildWhatsAppOrderMessageInput): string {
  const instant = input.createdAt ?? new Date();
  const dateStr = getBogotaDateString(instant);
  const timeStr = formatBogotaTime12h(instant);
  const isDelivery = input.deliveryType === 'DELIVERY';

  const itemLines = input.items.map((item, idx) => {
    const mainLine = `*${idx + 1}.* ${sanitizeText(item.productName)} × ${item.quantity} — *${formatCop(
      item.lineTotalCop,
    )}* (${formatCop(item.unitPriceCop)} c/u)`;
    if (item.notes?.trim()) {
      return `${mainLine}\n   _Nota: ${sanitizeText(item.notes)}_`;
    }
    return mainLine;
  });

  const sections: string[] = [
    `🧾 *NUEVO PEDIDO #${sanitizeText(input.orderCode)}*`,
    `🏪 *${sanitizeText(input.businessName)}*`,
    `🕐 ${dateStr} · ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🛒 *PRODUCTOS:*`,
    ...itemLines,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💰 *TOTAL A PAGAR: ${formatCop(input.totalCop)}*`,
    `💳 *Pago:* ${sanitizeText(input.paymentMethodLabel)}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 *CLIENTE:* ${sanitizeText(input.customerName)}`,
  ];

  if (input.customerPhone?.trim()) {
    sections.push(`📞 *WhatsApp:* ${sanitizeText(input.customerPhone)}`);
  }

  if (isDelivery) {
    sections.push(`🛵 *Entrega:* A domicilio`);
    sections.push(`📍 *Dirección:* ${sanitizeText(input.deliveryAddress || 'Por confirmar')}`);
  } else {
    sections.push(`🏪 *Entrega:* Para recoger en el negocio`);
  }

  if (input.notes?.trim()) {
    sections.push(`📝 *Nota del pedido:* ${sanitizeText(input.notes)}`);
  }

  if (input.receivedWhileClosed) {
    sections.push(`⏰ *Pedido hecho fuera del horario de atención* — confírmame cuándo lo entregas.`);
  }

  sections.push(`━━━━━━━━━━━━━━━━━━━━`);
  sections.push(`_Pedido guardado como PENDIENTE (#${sanitizeText(input.orderCode)}) en Marchante_`);

  return sections.join('\n');
}

/**
 * Genera el enlace oficial `https://wa.me/<telefono>?text=...` hacia el número registrado del vendedor.
 */
export function buildWhatsAppOrderUrl(input: BuildWhatsAppOrderMessageInput): {
  message: string;
  url: string;
} {
  const message = buildWhatsAppOrderMessage(input);
  const cleanPhone = normalizeWhatsappPhone(input.businessWhatsapp);
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  return { message, url };
}

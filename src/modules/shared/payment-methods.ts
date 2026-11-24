/** Nombre corto de cada método de pago, para listados y reportes. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  transfer: 'Transferencia',
  breb: 'Llave Bre-B',
  card: 'Tarjeta',
};

export function paymentMethodLabel(code: string): string {
  return PAYMENT_METHOD_LABELS[code] || code;
}

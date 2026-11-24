import { z } from 'zod';
import { MAX_COP_AMOUNT } from '@/modules/shared/currency';

export const quickSaleLineSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  quantity: z
    .number()
    .int('La cantidad debe ser entera')
    .min(1, 'Cantidad mínima: 1')
    .max(999, 'Cantidad máxima por línea: 999'),
  /**
   * Precio unitario en pesos COP editable en la venta rápida (Requisito E2).
   * Si no se envía, se usa el precio actual del producto.
   */
  unitPriceCop: z
    .number()
    .int('El precio debe ser un entero en pesos COP')
    .min(0, 'El precio no puede ser negativo')
    .max(MAX_COP_AMOUNT)
    .optional(),
});

export const recordQuickSaleSchema = z.object({
  items: z
    .array(quickSaleLineSchema)
    .min(1, 'Elige al menos un producto para registrar la venta')
    .max(100),
  paymentMethod: z
    .enum(['cash', 'nequi', 'daviplata', 'transfer', 'breb', 'card'])
    .default('cash'),
  customerId: z.string().uuid().nullable().optional(),
  newCustomerName: z.string().trim().max(100).optional(),
  newCustomerPhone: z.string().trim().max(25).optional(),
  notes: z.string().trim().max(300).optional().default(''),
  soldAt: z.date().optional(),
});

export const confirmPendingOrderSchema = z.object({
  orderId: z.string().uuid('Pedido inválido'),
  paymentMethod: z
    .enum(['cash', 'nequi', 'daviplata', 'transfer', 'breb', 'card'])
    .optional(),
  confirmedAt: z.date().optional(),
});

export const cancelPendingOrderSchema = z.object({
  orderId: z.string().uuid('Pedido inválido'),
  reason: z.string().trim().max(250).optional().default('Cancelado desde el mostrador'),
});

export const voidSaleSchema = z.object({
  saleId: z.string().uuid('Venta inválida'),
  reason: z
    .string()
    .trim()
    .min(2, 'Indica brevemente por qué anulas la venta')
    .max(250),
});

export type RecordQuickSaleInput = z.input<typeof recordQuickSaleSchema>;
export type ConfirmPendingOrderInput = z.input<typeof confirmPendingOrderSchema>;
export type CancelPendingOrderInput = z.input<typeof cancelPendingOrderSchema>;
export type VoidSaleInput = z.input<typeof voidSaleSchema>;

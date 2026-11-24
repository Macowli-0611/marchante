import { z } from 'zod';

export const PUBLIC_ORDER_MAX_ITEMS = 50;
export const PUBLIC_ORDER_MAX_QTY_PER_ITEM = 99;

export const publicOrderItemInputSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1')
    .max(PUBLIC_ORDER_MAX_QTY_PER_ITEM, 'Cantidad máxima por producto: 99'),
  notes: z.string().trim().max(160, 'La nota del producto es muy larga').optional().default(''),
});

export const createPublicOrderSchema = z
  .object({
    businessSlug: z.string().trim().min(2).max(60),
    clientOrderId: z
      .string()
      .trim()
      .min(8, 'Identificador de pedido inválido')
      .max(80, 'Identificador de pedido inválido'),
    customerName: z
      .string()
      .trim()
      .min(2, 'Por favor escribe tu nombre para el pedido')
      .max(100, 'Tu nombre es demasiado largo'),
    customerPhone: z
      .string()
      .trim()
      .max(25, 'Teléfono inválido')
      .optional()
      .default(''),
    deliveryType: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
    deliveryAddress: z.string().trim().max(250).optional().default(''),
    paymentMethod: z
      .enum(['cash', 'nequi', 'daviplata', 'transfer', 'breb', 'card'])
      .default('cash'),
    notes: z.string().trim().max(300, 'La nota no puede superar 300 caracteres').optional().default(''),
    items: z
      .array(publicOrderItemInputSchema)
      .min(1, 'Tu carrito está vacío. Agrega al menos un producto.')
      .max(PUBLIC_ORDER_MAX_ITEMS, 'El pedido tiene demasiados productos distintos.'),
    /**
     * Campo Honeypot invisible contra bots de spam (Requisito C8):
     * Un usuario real nunca lo ve ni lo llena; si trae texto, se rechaza el pedido.
     */
    websiteHoneypot: z.string().optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (val.websiteHoneypot && val.websiteHoneypot.trim().length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Solicitud bloqueada por protección anti-spam.',
        path: ['websiteHoneypot'],
      });
    }
    if (val.deliveryType === 'DELIVERY' && val.deliveryAddress.trim().length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe tu dirección para poder enviarte el domicilio.',
        path: ['deliveryAddress'],
      });
    }
  });

export type CreatePublicOrderInput = z.input<typeof createPublicOrderSchema>;

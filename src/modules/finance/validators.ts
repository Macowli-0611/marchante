import { z } from 'zod';
import { MAX_COP_AMOUNT } from '@/modules/shared/currency';

export const createExpenseCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre de la categoría debe tener al menos 2 letras')
    .max(60, 'El nombre no puede superar 60 caracteres'),
  icon: z.string().trim().max(30).optional().default('receipt'),
  /** true = compra de insumos o empaques (ya incluida en el costo de los productos). */
  isProductCost: z.boolean().optional().default(false),
});

export const recordFinancialMovementSchema = z.object({
  kind: z.enum(['EXPENSE', 'EXTRA_INCOME']).default('EXPENSE'),
  categoryId: z.string().uuid('Categoría inválida').nullable().optional(),
  customCategoryName: z.string().trim().max(60).optional(),
  amountCop: z
    .number({ invalid_type_error: 'El monto debe ser un número en pesos COP' })
    .int('El monto debe ser un entero en pesos COP (sin decimales)')
    .min(1, 'El monto debe ser mayor a $ 0')
    .max(MAX_COP_AMOUNT, 'El monto supera el límite permitido'),
  paymentMethod: z
    .enum(['cash', 'nequi', 'daviplata', 'transfer', 'breb', 'card'])
    .default('cash'),
  description: z
    .string()
    .trim()
    .min(2, 'Escribe una descripción corta (ej. "Harina y huevos" o "Domicilio en moto")')
    .max(250, 'La descripción no puede superar 250 caracteres'),
  occurredAt: z.date().optional(),
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
    .refine((v) => {
      const d = new Date(`${v}T12:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }, 'Fecha inválida (YYYY-MM-DD)')
    .optional(),
});

export const voidFinancialMovementSchema = z.object({
  movementId: z.string().uuid('Movimiento inválido'),
  reason: z
    .string()
    .trim()
    .min(2, 'Indica el motivo de la anulación')
    .max(200)
    .optional()
    .default('Anulado por corrección del vendedor'),
});

export const financeLedgerQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'custom']).optional().default('month'),
  fromYmd: z.string().optional(),
  toYmd: z.string().optional(),
  filterKind: z.enum(['all', 'sales', 'extra_income', 'expenses']).optional().default('all'),
});

export type CreateExpenseCategoryInput = z.input<typeof createExpenseCategorySchema>;
export type RecordFinancialMovementInput = z.input<typeof recordFinancialMovementSchema>;
export type VoidFinancialMovementInput = z.input<typeof voidFinancialMovementSchema>;
export type FinanceLedgerQueryInput = z.input<typeof financeLedgerQuerySchema>;

import { z } from 'zod';

export function cleanCustomerPhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

export const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre del cliente debe tener al menos 2 letras')
    .max(100, 'El nombre no puede superar 100 caracteres'),
  phone: z
    .string()
    .trim()
    .max(25, 'Teléfono demasiado largo')
    .optional()
    .default(''),
  address: z
    .string()
    .trim()
    .max(250, 'La dirección no puede superar 250 caracteres')
    .optional()
    .default(''),
  notes: z
    .string()
    .trim()
    .max(500, 'Las notas no pueden superar 500 caracteres')
    .optional()
    .default(''),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  customerId: z.string().uuid('Cliente inválido'),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  sortBy: z.enum(['top_spent', 'recent', 'name']).optional().default('top_spent'),
});

export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type ListCustomersQueryInput = z.input<typeof listCustomersQuerySchema>;

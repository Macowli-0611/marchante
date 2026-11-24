import { z } from 'zod';
import { MAX_COP_AMOUNT } from '@/modules/shared/currency';
import { isAllowedImageUrl } from '@/modules/shared/media-url';

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB máximo de entrada
export const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre de la categoría debe tener al menos 2 letras')
    .max(60, 'El nombre de la categoría no puede superar 60 caracteres'),
});

export const renameCategorySchema = z.object({
  categoryId: z.string().uuid('Categoría inválida'),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre de la categoría debe tener al menos 2 letras')
    .max(60, 'El nombre de la categoría no puede superar 60 caracteres'),
});

export const reorderCategoriesSchema = z.object({
  orderedCategoryIds: z
    .array(z.string().uuid())
    .min(1, 'Debes enviar al menos una categoría para ordenar'),
});

const integerCopField = (label: string) =>
  z
    .number({ invalid_type_error: `${label} debe ser un número en pesos COP` })
    .int(`${label} debe ser un entero en pesos COP (sin decimales)`)
    .min(0, `${label} no puede ser negativo`)
    .max(MAX_COP_AMOUNT, `${label} supera el límite permitido`);

export const createProductSchema = z.object({
  categoryId: z
    .string({ required_error: 'Elige una categoría antes de publicar el producto' })
    .uuid('Todo producto debe pertenecer a una categoría válida antes de publicarse'),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre del producto debe tener al menos 2 letras')
    .max(120, 'El nombre del producto no puede pasar de 120 caracteres'),
  description: z
    .string()
    .trim()
    .max(500, 'La descripción no puede pasar de 500 caracteres')
    .optional()
    .default(''),
  priceCop: integerCopField('El precio'),
  costCop: integerCopField('El costo unitario').optional().default(0),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(isAllowedImageUrl, 'La imagen debe subirse desde Marchante.')
    .nullable()
    .optional()
    .default(null),
  isHidden: z.boolean().optional().default(false),
  isSoldOut: z.boolean().optional().default(false),
});

export const updateProductSchema = createProductSchema.extend({
  productId: z.string().uuid('Producto inválido'),
});

export const toggleProductStatusSchema = z.object({
  productId: z.string().uuid('Producto inválido'),
  isHidden: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional().default(''),
  categoryId: z.string().trim().optional().default('all'),
  status: z.enum(['all', 'available', 'sold_out', 'hidden']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type ListProductsQueryInput = z.input<typeof listProductsQuerySchema>;

/** URL de imagen opcional que solo puede apuntar a nuestro almacenamiento. */
export const safeImageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(isAllowedImageUrl, 'La imagen debe subirse desde Marchante.')
  .nullable()
  .optional();

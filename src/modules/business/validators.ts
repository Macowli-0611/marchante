import { z } from 'zod';
import { validateBusinessSlug } from '@/modules/shared/slug';

export const BUSINESS_CATEGORY_OPTIONS = [
  { value: 'comida_casera', label: '🍲 Comida casera, almuerzos y comidas rápidas' },
  { value: 'reposteria', label: '🥐 Panadería, postres y repostería artesanal' },
  { value: 'moda_accesorios', label: '👗 Ropa, calzado, bolsos y accesorios' },
  { value: 'belleza_cuidado', label: '✨ Belleza, cosmética y cuidado personal' },
  { value: 'artesanias_regalos', label: '🎁 Artesanías, detalles, flores y regalos' },
  { value: 'mercado_fruver', label: '🥑 Fruver, café de origen, lácteos y despensa' },
  { value: 'mascotas', label: '🐾 Mascotas, snacks y accesorios' },
  { value: 'tecnologia_otros', label: '📱 Tecnología, hogar y otros emprendimientos' },
] as const;

export const COLOMBIA_CITY_PRESETS = [
  { name: 'Cali, Valle del Cauca', lat: 3.4516, lng: -76.532 },
  { name: 'Yumbo, Valle del Cauca', lat: 3.5823, lng: -76.4915 },
  { name: 'Bogotá D.C.', lat: 4.711, lng: -74.0721 },
  { name: 'Medellín, Antioquia', lat: 6.2442, lng: -75.5812 },
  { name: 'Barranquilla, Atlántico', lat: 10.9685, lng: -74.7813 },
  { name: 'Bucaramanga, Santander', lat: 7.1193, lng: -73.1227 },
  { name: 'Pereira, Risaralda', lat: 4.8133, lng: -75.6961 },
  { name: 'Cartagena, Bolívar', lat: 10.391, lng: -75.4794 },
] as const;

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().regex(hhmmRegex, 'Formato de hora inválido (HH:MM)'),
  closeTime: z.string().regex(hhmmRegex, 'Formato de hora inválido (HH:MM)'),
});

export const weeklyScheduleSchema = z.object({
  lun: dayScheduleSchema,
  mar: dayScheduleSchema,
  mie: dayScheduleSchema,
  jue: dayScheduleSchema,
  vie: dayScheduleSchema,
  sab: dayScheduleSchema,
  dom: dayScheduleSchema,
});

export const paymentMethodConfigSchema = z.object({
  code: z.enum(['cash', 'nequi', 'daviplata', 'transfer', 'breb', 'card']),
  label: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
  accountNumber: z.string().trim().max(80).optional().default(''),
  accountHolder: z.string().trim().max(100).optional().default(''),
  instructions: z.string().trim().max(200).optional().default(''),
});

/**
 * Normaliza un número de WhatsApp para Colombia/Latinoamérica:
 * - Deja solo dígitos.
 * - Si tiene 10 dígitos y empieza por 3 (celular colombiano, ej. 3001234567), antepone "57".
 */
export function normalizeWhatsappPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
}

/**
 * Limpia un usuario o enlace de red social (Instagram, TikTok, Facebook, Web).
 * Bloquea cualquier esquema peligroso (`javascript:`, `data:`, `vbscript:`) contra XSS.
 */
export function normalizeSocialHandleOrUrl(
  raw: string | undefined,
  network: 'instagram' | 'tiktok' | 'facebook' | 'website',
): string {
  const clean = (raw || '').trim();
  if (!clean) return '';

  // Bloquear esquemas peligrosos en cualquier red social
  if (/^(javascript|data|vbscript|file):/i.test(clean)) {
    throw new Error('Enlace no permitido por seguridad.');
  }

  if (network === 'website') {
    const candidate = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Protocolo inválido');
      }
      return parsed.toString().replace(/\/$/, '');
    } catch {
      throw new Error('Escribe una dirección web válida (ej. https://mitienda.co)');
    }
  }

  if (/^https?:\/\//i.test(clean)) {
    return clean.replace(/[<>"'`]/g, '');
  }
  return clean.replace(/^@+/, '').replace(/[<>"'`\s]/g, '');
}

export const socialLinksSchema = z.object({
  instagram: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => normalizeSocialHandleOrUrl(v, 'instagram')),
  tiktok: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => normalizeSocialHandleOrUrl(v, 'tiktok')),
  facebook: z
    .string()
    .trim()
    .max(150)
    .optional()
    .transform((v) => normalizeSocialHandleOrUrl(v, 'facebook')),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => normalizeSocialHandleOrUrl(v, 'website')),
});

export const updateBusinessProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'El nombre del negocio debe tener al menos 2 letras').max(100),
    ownerName: z
      .string()
      .trim()
      .min(2, 'El nombre del dueño debe tener al menos 2 letras')
      .max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .superRefine((val, ctx) => {
        const res = validateBusinessSlug(val);
        if (!res.valid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: res.error || 'Slug inválido',
          });
        }
      }),
    description: z.string().trim().max(400, 'La descripción no puede pasar de 400 caracteres'),
    category: z.string().trim().min(2).max(60),
    whatsappPhone: z
      .string()
      .trim()
      .transform(normalizeWhatsappPhone)
      .refine(
        (digits) => digits.length >= 10 && digits.length <= 15,
        'Escribe un número de WhatsApp válido (ej. 300 123 4567)',
      ),
    address: z.string().trim().max(250),
    city: z.string().trim().min(2, 'Indica la ciudad o municipio').max(100),
    latitude: z
      .number()
      .min(-90, 'Latitud fuera de rango')
      .max(90, 'Latitud fuera de rango'),
    longitude: z
      .number()
      .min(-180, 'Longitud fuera de rango')
      .max(180, 'Longitud fuera de rango'),
    schedule: weeklyScheduleSchema,
    paymentMethods: z
      .array(paymentMethodConfigSchema)
      .min(1)
      .refine(
        (methods) => methods.some((m) => m.enabled),
        'Activa al menos un método de pago para que tus clientes puedan comprarte',
      ),
    socialLinks: socialLinksSchema,
  });

export type UpdateBusinessProfileInput = z.input<typeof updateBusinessProfileSchema>;

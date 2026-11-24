import { safeImageUrlSchema } from '@/modules/catalog/validators';
import { z } from 'zod';
import type {
  CatalogBackgroundPreset,
  CatalogCardStyle,
  CatalogFontPreset,
} from '@/db/schema';

export const CURATED_BRAND_PALETTES = [
  { name: 'Rojo Achiote', hex: '#C83E2B', vibe: 'Cálido y apetitoso' },
  { name: 'Verde Bijao', hex: '#1B6B4A', vibe: 'Fresco y natural' },
  { name: 'Añil de Ráquira', hex: '#1D4E89', vibe: 'Artesanal y confiable' },
  { name: 'Cacao Tostado', hex: '#5C3A21', vibe: 'Panadería y café de origen' },
  { name: 'Mora Silvestre', hex: '#6B2D5C', vibe: 'Repostería, moda y detalles' },
  { name: 'Terracota Viva', hex: '#B5530D', vibe: 'Asados y cocina criolla' },
  { name: 'Tinto Carbón', hex: '#1C1714', vibe: 'Sobrio y minimalista' },
] as const;

export const BACKGROUND_PRESET_OPTIONS: Array<{
  id: CatalogBackgroundPreset;
  name: string;
  description: string;
}> = [
  { id: 'kraft', name: 'Papel Kraft', description: 'Crema cálido con puntos de libreta' },
  { id: 'crema', name: 'Almendra Liso', description: 'Fondo limpio y luminoso' },
  { id: 'canasto', name: 'Trama de Canasto', description: 'Tejido diagonal artesanal' },
  { id: 'baldosin', name: 'Baldosín Tradicional', description: 'Cuadrícula sutil de casona' },
  { id: 'bijao', name: 'Hoja de Bijao', description: 'Tono orgánico suave' },
  { id: 'nocturno', name: 'Tinto Nocturno', description: 'Modo oscuro tipo pizarra de café' },
];

export const FONT_PRESET_OPTIONS: Array<{
  id: CatalogFontPreset;
  name: string;
  sample: string;
}> = [
  { id: 'artesanal', name: 'Artesanal Serif', sample: 'Hecho en casa con cariño' },
  { id: 'mercado', name: 'Mercado Moderno', sample: 'Fresco, directo y claro' },
  { id: 'cartel', name: 'Cartel Popular', sample: 'ESPECIALES DEL DÍA' },
  { id: 'editorial', name: 'Editorial Fino', sample: 'Recetas de autor y detalles' },
];

export const CARD_STYLE_OPTIONS: Array<{
  id: CatalogCardStyle;
  name: string;
  description: string;
}> = [
  { id: 'boleto', name: 'Boleto con Sello', description: 'Borde de tinta y sombra marcada' },
  { id: 'mostrador', name: 'Mostrador (2 cols)', description: 'Tarjetas amplias tipo vitrina' },
  { id: 'compacta', name: 'Lista Compacta', description: 'Ideal para catálogos con muchos ítems' },
];

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Calcula la relación de contraste WCAG entre un color HEX y blanco (#FFFDF9).
 * Así aseguramos que el texto de los botones del catálogo siempre sea legible (>= 3.0:1).
 */
export function getContrastRatioWithWhite(hex: string): number {
  if (!HEX_COLOR_REGEX.test(hex)) return 1;
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const whiteLum = 0.98; // #FFFDF9
  return Number(((whiteLum + 0.05) / (lum + 0.05)).toFixed(2));
}

export const updateCatalogCustomizationSchema = z.object({
  logoUrl: safeImageUrlSchema,
  coverUrl: safeImageUrlSchema,
  primaryColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_REGEX, 'El color principal debe ser un código HEX válido (ej. #C83E2B)')
    .refine(
      (hex) => getContrastRatioWithWhite(hex) >= 3.0,
      'Ese color es demasiado claro y las letras de los botones no se leerían bien. Elige un tono más intenso.',
    ),
  backgroundPreset: z.enum(['kraft', 'crema', 'canasto', 'baldosin', 'bijao', 'nocturno']),
  fontPreset: z.enum(['artesanal', 'mercado', 'cartel', 'editorial']),
  cardStyle: z.enum(['boleto', 'mostrador', 'compacta']),
  orderedCategoryIds: z.array(z.string().uuid()).optional(),
});

export type UpdateCatalogCustomizationInput = z.input<typeof updateCatalogCustomizationSchema>;

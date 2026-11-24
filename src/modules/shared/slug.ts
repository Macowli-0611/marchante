/**
 * Validación de Slugs de Negocios y Protección de Rutas Reservadas.
 *
 * El catálogo público vive en `/{slug}` (ej. `/postres-dona-clara`).
 * Por eso debemos bloquear cualquier ruta del sistema o palabra reservada.
 */

export const RESERVED_SLUGS = new Set([
  'admin',
  'ajustes',
  'api',
  'app',
  'auth',
  'ayuda',
  'catalogo',
  'checkout',
  'clientes',
  'configuracion',
  'contacto',
  'costos',
  'cuentas',
  'dashboard',
  'demo',
  'diseno',
  'estadisticas',
  'explorar',
  'favicon',
  'favicon.ico',
  'feed',
  'finanzas',
  'gastos',
  'historial',
  'home',
  'icon.svg',
  'ingresos',
  'inicio',
  'legal',
  'login',
  'logout',
  'manifest',
  'manifest.json',
  'manifest.webmanifest',
  'mapa',
  'marchante',
  'menu',
  'movimientos',
  'negocio',
  'onboarding',
  'ordenes',
  'pagos',
  'panel',
  'pedidos',
  'perfil',
  'precios',
  'privacidad',
  'productos',
  'public',
  'qr',
  'recuperar',
  'registro',
  'reportes',
  'resumen',
  'robots.txt',
  'salir',
  'settings',
  'signin',
  'signup',
  'sitemap.xml',
  'soporte',
  'static',
  'super-admin',
  'terminos',
  'tienda',
  'uploads',
  'vender',
  'ventas',
  'whatsapp',
  '_next',
]);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Convierte un nombre de negocio ("Repostería Doña María & Cía.") en un slug limpio
 * ("reposteria-dona-maria-cia").
 */
export function slugifyBusinessName(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita tildes y diacríticos (ñ -> n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

export interface SlugValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Valida que un slug sea seguro, tenga longitud adecuada y no choque con rutas reservadas.
 */
export function validateBusinessSlug(rawSlug: string): SlugValidationResult {
  const normalized = rawSlug.trim().toLowerCase();

  if (normalized.length < 3) {
    return {
      valid: false,
      normalized,
      error: 'El enlace debe tener al menos 3 caracteres (ej. "dulces-elena").',
    };
  }

  if (normalized.length > 48) {
    return {
      valid: false,
      normalized,
      error: 'El enlace no puede superar los 48 caracteres.',
    };
  }

  if (!SLUG_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Usa solo letras minúsculas (sin tildes ni ñ), números y guiones intermedios.',
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `"/${normalized}" es una ruta reservada del sistema. Elige otro enlace para tu tienda.`,
    };
  }

  return {
    valid: true,
    normalized,
  };
}

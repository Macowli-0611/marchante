export const DEMO_EMAIL = 'elena@marchante.co';
export const DEMO_SLUG = 'horno-y-canela';

/**
 * La tienda demo solo existe si se pide explícitamente con ENABLE_DEMO=true.
 * En desarrollo está activa por defecto (ENABLE_DEMO=false la apaga).
 */
export function isDemoEnabled(): boolean {
  const flag = process.env.ENABLE_DEMO?.trim().toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

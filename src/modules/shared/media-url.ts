/**
 * Reglas de URL de imagen sin dependencias de Node (se puede importar en el navegador).
 * Una imagen es aceptable si es nuestra: `/media/...`, `/uploads/...` (imágenes antiguas)
 * o del bucket público de Supabase configurado.
 */
export function getRemoteMediaOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isAllowedImageUrl(value: string): boolean {
  if (/^\/(media|uploads)\/[A-Za-z0-9/_.-]+$/.test(value) && !value.includes('..')) return true;
  const origin = getRemoteMediaOrigin();
  if (!origin) return false;
  try {
    const parsed = new URL(value);
    return parsed.origin === origin && parsed.pathname.startsWith('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

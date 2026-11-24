/**
 * Se ejecuta una vez al arrancar el servidor: en producción valida AUTH_SECRET
 * para que un despliegue mal configurado falle de inmediato y no con la primera visita.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { getJwtSecretKey } = await import('@/modules/auth/session');
    getJwtSecretKey();
  }
}

import { NextResponse } from 'next/server';
import { getServerSession, type SellerSessionPayload } from '@/modules/auth/session';
import { AppError, toErrorResponse } from './errors';

type SellerHandler = (session: SellerSessionPayload, request: Request) => Promise<Response>;

/**
 * Envuelve una ruta del panel: exige sesión válida y convierte cualquier error
 * en una respuesta segura (sin filtrar detalles internos de la base de datos).
 */
export function sellerRoute(handler: SellerHandler, fallbackMessage: string) {
  return async (request: Request): Promise<Response> => {
    try {
      const session = await getServerSession();
      if (!session) {
        return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
      }
      return await handler(session, request);
    } catch (err) {
      return toErrorResponse(err, fallbackMessage);
    }
  };
}

/** Rutas públicas o de autenticación: solo el manejo seguro de errores. */
export function publicRoute(handler: (request: Request) => Promise<Response>, fallbackMessage: string) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (err) {
      return toErrorResponse(err, fallbackMessage);
    }
  };
}

/** La tienda demo es compartida: no puede cambiar datos de contacto ni la vitrina. */
export function assertNotDemo(session: SellerSessionPayload, action: string): void {
  if (session.isDemo) {
    throw new AppError(`La tienda de demostración no permite ${action}.`, 403);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError('Solicitud con formato inválido.');
  }
  return body as Record<string, unknown>;
}

export function ok(data: Record<string, unknown> = {}, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}

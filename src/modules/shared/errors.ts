import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Error pensado para mostrarse tal cual al usuario (mensaje en español, sin detalles internos).
 */
export class AppError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/** Errores que vienen del motor PostgreSQL (pg o PGlite): traen un código SQLSTATE. */
export function isDatabaseError(err: unknown): err is Error & { code: string; constraint?: string } {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code);
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (!isDatabaseError(err) || err.code !== '23505') return false;
  if (!constraint) return true;
  return err.constraint === constraint || String(err.message).includes(constraint);
}

/**
 * Convierte cualquier error en una respuesta JSON segura:
 * - ZodError → 400 con el primer mensaje de validación.
 * - Errores de base de datos → mensaje genérico (el detalle solo va al log del servidor).
 * - Error de dominio → su mensaje (escrito por nosotros) con 400 o el estado de AppError.
 */
export function toErrorResponse(err: unknown, fallbackMessage: string): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: err.errors[0]?.message || fallbackMessage },
      { status: 400 },
    );
  }
  if (err instanceof AppError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  if (isDatabaseError(err)) {
    console.error('[marchante] Error de base de datos:', err);
    if (err.code === '23505') {
      return NextResponse.json(
        { ok: false, error: 'Ese registro ya existe. Recarga la página e intenta de nuevo.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ ok: false, error: 'Solicitud con formato inválido.' }, { status: 400 });
  }
  // Solo los `Error` simples son mensajes de dominio escritos por nosotros;
  // TypeError, RangeError, etc. son fallos internos y no se muestran al usuario.
  if (err instanceof Error && err.constructor === Error) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
  console.error('[marchante] Error desconocido:', err);
  return NextResponse.json({ ok: false, error: fallbackMessage }, { status: 500 });
}

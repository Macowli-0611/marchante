import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { eq, sql } from 'drizzle-orm';
import { withSystemDb } from '@/db';
import { users } from '@/db/schema';

export const SESSION_COOKIE_NAME = 'marchante_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14; // 14 días
const JWT_ISSUER = 'marchante';
const JWT_AUDIENCE = 'marchante-panel';

/** Clave solo para desarrollo local. En producción se exige AUTH_SECRET propio. */
const DEV_ONLY_SECRET = 'marchante-solo-desarrollo-local-no-usar-en-produccion';
const KNOWN_PUBLIC_SECRETS = new Set([
  DEV_ONLY_SECRET,
  'marchante-dev-local-secret-key-colombia-2026-seguro',
  'cambia-esto-por-un-secreto-de-32-caracteres-o-mas',
]);

export interface SellerSessionPayload {
  userId: string;
  businessId: string;
  slug: string;
  email: string;
  ownerName: string;
  businessName: string;
  /** Versión de sesión del usuario; si cambia en la base, el token deja de valer. */
  sessionVersion?: number;
  /** Sesión de la tienda de demostración (no puede cambiar perfil ni diseño). */
  isDemo?: boolean;
}

let cachedKey: Uint8Array | null = null;

export function getJwtSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const secret = process.env.AUTH_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error('AUTH_SECRET no está configurado. Genera uno con `openssl rand -hex 32`.');
    }
    cachedKey = new TextEncoder().encode(DEV_ONLY_SECRET);
    return cachedKey;
  }
  if (isProduction && (secret.length < 32 || KNOWN_PUBLIC_SECRETS.has(secret))) {
    throw new Error(
      'AUTH_SECRET es demasiado corto o es un valor de ejemplo público. Genera uno con `openssl rand -hex 32`.',
    );
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function createSessionToken(payload: SellerSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecretKey());
}

/** Verifica solo la firma y la forma del token (sin consultar la base). */
export async function verifySessionToken(token: string): Promise<SellerSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.businessId !== 'string' ||
      typeof payload.slug !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      businessId: payload.businessId,
      slug: payload.slug,
      email: String(payload.email || ''),
      ownerName: String(payload.ownerName || ''),
      businessName: String(payload.businessName || ''),
      sessionVersion: typeof payload.sessionVersion === 'number' ? payload.sessionVersion : 0,
      isDemo: payload.isDemo === true,
    };
  } catch {
    return null;
  }
}

/** Comprueba que el usuario siga existiendo y que su versión de sesión coincida. */
async function isSessionStillValid(payload: SellerSessionPayload): Promise<boolean> {
  const [row] = await withSystemDb((db) =>
    db
      .select({ sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1),
  );
  return Boolean(row) && row!.sessionVersion === payload.sessionVersion;
}

export async function setSessionCookie(payload: SellerSessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Invalida todos los tokens emitidos para el usuario (logout, cambio de contraseña).
 * Devuelve la nueva versión.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const [row] = await withSystemDb((db) =>
    db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning(),
  );
  return row?.sessionVersion ?? 0;
}

export async function getServerSession(): Promise<SellerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  if (!(await isSessionStillValid(payload))) return null;
  return payload;
}

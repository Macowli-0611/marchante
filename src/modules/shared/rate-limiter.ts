import { sql } from 'drizzle-orm';
import { withSystemDb } from '@/db';

/**
 * Rate Limiter en memoria por ventana deslizante para proteger el catálogo público
 * contra ráfagas de spam o abuso automatizado (Requisito C8).
 */

interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitCheckOptions {
  key: string;
  windowMs: number;
  maxRequests: number;
  nowMs?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(opts: RateLimitCheckOptions): RateLimitCheckResult {
  const now = opts.nowMs ?? Date.now();
  const cutoff = now - opts.windowMs;

  const existing = buckets.get(opts.key);
  const validTimestamps = existing ? existing.timestamps.filter((t) => t > cutoff) : [];

  if (validTimestamps.length >= opts.maxRequests) {
    const oldest = validTimestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    buckets.set(opts.key, { timestamps: validTimestamps });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  buckets.set(opts.key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, opts.maxRequests - validTimestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}

// ============================================================================
// Límite compartido entre instancias (guardado en PostgreSQL, ventana fija)
// ============================================================================


const MAX_MEMORY_BUCKETS = 10_000;

/**
 * IP del cliente sin confiar en lo que el propio cliente escriba en `X-Forwarded-For`:
 * - `x-real-ip` lo fija el proxy (Vercel, Nginx) y el cliente no puede añadirlo.
 * - Si no existe, se toma la entrada que agregó el proxy más cercano: la de la derecha,
 *   saltando `TRUSTED_PROXY_HOPS - 1` proxies propios (por defecto 1 salto).
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS || 1));
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    const candidate = parts[Math.max(0, parts.length - hops)];
    if (candidate) return candidate;
  }
  return 'ip-desconocida';
}

/**
 * Igual que checkRateLimit pero el contador vive en la base de datos, así que
 * funciona con varias instancias o funciones serverless. Si la base falla,
 * cae al contador en memoria para no dejar la ruta sin protección.
 */
export async function checkSharedRateLimit(opts: RateLimitCheckOptions): Promise<RateLimitCheckResult> {
  const windowSeconds = Math.max(1, Math.round(opts.windowMs / 1000));
  try {
    const result = await withSystemDb(async (db) => {
      const res = await db.execute(sql`
        INSERT INTO rate_limit_buckets (key, window_start, hits)
        VALUES (${opts.key}, now(), 1)
        ON CONFLICT (key) DO UPDATE SET
          hits = CASE WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSeconds})
                      THEN 1 ELSE rate_limit_buckets.hits + 1 END,
          window_start = CASE WHEN rate_limit_buckets.window_start < now() - make_interval(secs => ${windowSeconds})
                      THEN now() ELSE rate_limit_buckets.window_start END
        RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSeconds}) - now()))))::int AS retry_after
      `);
      if (Math.random() < 0.01) {
        await db.execute(sql`DELETE FROM rate_limit_buckets WHERE window_start < now() - interval '1 day'`);
      }
      const rows = (res as unknown as { rows: Array<{ hits: number; retry_after: number }> }).rows;
      return rows[0]!;
    });
    const hits = Number(result.hits);
    if (hits > opts.maxRequests) {
      return { allowed: false, remaining: 0, retryAfterSeconds: Number(result.retry_after) };
    }
    return { allowed: true, remaining: opts.maxRequests - hits, retryAfterSeconds: 0 };
  } catch (err) {
    console.error('[marchante] Límite compartido no disponible, uso el de memoria:', err);
    if (buckets.size > MAX_MEMORY_BUCKETS) buckets.clear();
    return checkRateLimit(opts);
  }
}

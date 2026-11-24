import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const tileOrigin =
  originOf(process.env.NEXT_PUBLIC_MAP_TILE_URL?.replace(/\{[a-z]\}/g, 'a')) ||
  'https://tile.openstreetmap.org';
const mediaOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inyecta scripts en línea para hidratar; 'unsafe-eval' solo en desarrollo (HMR).
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${tileOrigin}${mediaOrigin ? ` ${mediaOrigin}` : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' ${tileOrigin}${isProduction ? '' : ' ws: wss:'}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'pg', 'sharp'],
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          ...(isProduction
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
        ],
      },
      {
        // Las respuestas del panel y la API llevan datos privados del negocio.
        source: '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;

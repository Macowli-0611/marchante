import fs from 'fs/promises';
import path from 'path';
import { getLocalMediaDir } from '@/modules/shared/storage';

/**
 * Sirve las imágenes guardadas con el driver `local` (fuera de `public/`), para que
 * funcionen también con `next start` tras compilar.
 */
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await context.params;
  if (!segments?.length || segments.some((s) => !/^[A-Za-z0-9_.-]+$/.test(s) || s.startsWith('.'))) {
    return new Response('No encontrado', { status: 404 });
  }
  if (!segments[segments.length - 1]!.endsWith('.webp')) {
    return new Response('No encontrado', { status: 404 });
  }

  const baseDir = getLocalMediaDir();
  const absPath = path.join(baseDir, ...segments);
  if (!absPath.startsWith(baseDir + path.sep)) {
    return new Response('No encontrado', { status: 404 });
  }

  try {
    const data = await fs.readFile(absPath);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('No encontrado', { status: 404 });
  }
}

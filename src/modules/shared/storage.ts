import fs from 'fs/promises';
import path from 'path';

/**
 * Almacenamiento de imágenes:
 * - `supabase`: Supabase Storage (bucket público) vía su API REST. Recomendado en producción
 *   y obligatorio en plataformas sin disco persistente (Vercel, funciones serverless).
 * - `local`: disco del servidor en `MEDIA_DIR` (por defecto `.data/media`), servido por la
 *   ruta `/media/...`. Sirve en desarrollo o en un servidor propio con disco persistente.
 *
 * Antes las imágenes se escribían en `public/`, que `next start` no sirve si el archivo
 * se creó después de compilar.
 */

export type StorageDriver = 'supabase' | 'local';

export function getStorageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === 'supabase' || explicit === 'local') return explicit;
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local';
}

export function getLocalMediaDir(): string {
  const dir = process.env.MEDIA_DIR || '.data/media';
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'marchante-media';
  if (!url || !key) {
    throw new Error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para guardar imágenes.');
  }
  return { url, key, bucket };
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_-]*\.webp$/i;

/** Guarda un archivo y devuelve la URL pública con la que se mostrará. */
export async function saveMediaObject(key: string, body: Buffer, contentType = 'image/webp'): Promise<string> {
  if (!SAFE_KEY.test(key) || key.includes('..')) {
    throw new Error('Nombre de archivo inválido.');
  }

  if (getStorageDriver() === 'supabase') {
    const { url, key: serviceKey, bucket } = getSupabaseConfig();
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-upsert': 'false',
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      console.error('[marchante] Supabase Storage respondió', res.status, await res.text().catch(() => ''));
      throw new Error('No se pudo guardar la imagen en el almacenamiento.');
    }
    return `${url}/storage/v1/object/public/${bucket}/${key}`;
  }

  if (process.env.VERCEL) {
    throw new Error(
      'En Vercel no hay disco persistente: configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para guardar imágenes.',
    );
  }

  const absPath = path.join(getLocalMediaDir(), key);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, body);
  return `/media/${key}`;
}

export { isAllowedImageUrl, getRemoteMediaOrigin } from './media-url';

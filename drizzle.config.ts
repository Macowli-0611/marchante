import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL || 'pglite://.data/marchante-pg';
const isPglite = url.startsWith('pglite://');

// Las migraciones que corre la app son las de `drizzle/NNNN_*.sql` (ver src/db/index.ts).
// drizzle-kit queda para comparar el esquema (`drizzle-kit generate`/`check`) y para studio.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(isPglite
    ? { driver: 'pglite' as const, dbCredentials: { url: url.replace(/^pglite:\/\//, '') } }
    : { dbCredentials: { url } }),
});

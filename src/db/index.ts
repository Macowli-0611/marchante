import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle as drizzleNodePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export type MarchanteDb = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

type GlobalDbCache = {
  dbInstance?: MarchanteDb;
  pgliteInstance?: PGlite;
  pgPoolInstance?: Pool;
  migrationPromise?: Promise<void>;
};

const globalForDb = globalThis as unknown as GlobalDbCache;

function resolveDatabaseUrl(): string {
  if (process.env.VITEST && !process.env.TEST_DATABASE_URL) {
    return 'memory://';
  }
  return process.env.DATABASE_URL || 'pglite://.data/marchante-pg';
}

export function getDb(): MarchanteDb {
  if (globalForDb.dbInstance) {
    return globalForDb.dbInstance;
  }

  const dbUrl = resolveDatabaseUrl();

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    const pool = new Pool({
      connectionString: dbUrl,
      max: 10,
    });
    globalForDb.pgPoolInstance = pool;
    globalForDb.dbInstance = drizzleNodePg(pool, { schema });
    return globalForDb.dbInstance;
  }

  // Modo local / pruebas: PGlite (PostgreSQL real compilado a WASM con soporte completo de RLS)
  if (dbUrl === 'memory://') {
    const client = new PGlite();
    globalForDb.pgliteInstance = client;
    globalForDb.dbInstance = drizzlePglite(client, { schema });
    return globalForDb.dbInstance;
  }

  const dataDir = dbUrl.replace(/^pglite:\/\//, '');
  const resolvedDir = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
  fs.mkdirSync(path.dirname(resolvedDir), { recursive: true });

  const client = new PGlite(resolvedDir);
  globalForDb.pgliteInstance = client;
  globalForDb.dbInstance = drizzlePglite(client, { schema });
  return globalForDb.dbInstance;
}

const MIGRATIONS_LOCK_KEY = 727274001;

function listMigrationFiles(): Array<{ version: string; sql: string }> {
  const dir = path.join(process.cwd(), 'drizzle');
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.replace(/\.sql$/, ''), sql: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "schema_migrations" (
  "version" text PRIMARY KEY,
  "applied_at" timestamptz NOT NULL DEFAULT now()
);`;

/**
 * Aplica en orden las migraciones `drizzle/NNNN_*.sql` que aún no estén registradas
 * en `schema_migrations`. Cada migración corre en su propia transacción y un
 * advisory lock evita que dos instancias migren a la vez.
 */
export async function ensureDatabaseMigrated(): Promise<void> {
  if (globalForDb.migrationPromise) {
    return globalForDb.migrationPromise;
  }

  globalForDb.migrationPromise = (async () => {
    getDb();
    const files = listMigrationFiles();

    if (globalForDb.pgliteInstance) {
      const client = globalForDb.pgliteInstance;
      await client.exec(CREATE_MIGRATIONS_TABLE);
      const applied = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
      const done = new Set(applied.rows.map((r) => r.version));
      for (const file of files) {
        if (done.has(file.version)) continue;
        await client.transaction(async (tx) => {
          await tx.exec(file.sql);
          await tx.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file.version]);
        });
      }
      return;
    }

    const pool = globalForDb.pgPoolInstance!;
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK_KEY]);
      await client.query(CREATE_MIGRATIONS_TABLE);
      const applied = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
      const done = new Set(applied.rows.map((r) => r.version));
      for (const file of files) {
        if (done.has(file.version)) continue;
        await client.query('BEGIN');
        try {
          await client.query(file.sql);
          await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file.version]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK_KEY]).catch(() => {});
      client.release();
    }
  })().catch((err) => {
    // Permite reintentar en la siguiente petición en vez de quedar envenenado.
    globalForDb.migrationPromise = undefined;
    throw err;
  });

  return globalForDb.migrationPromise;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ejecuta una operación de base de datos AISLADA a nivel de motor PostgreSQL (RLS)
 * para el negocio `businessId`.
 *
 * Dentro de la transacción:
 * 1. Activa el rol `marchante_tenant` (que no es superusuario y está sujeto a RLS).
 * 2. Fija `app.current_business_id = businessId` solo para la transacción (`SET LOCAL`).
 * Cualquier `SELECT`, `INSERT`, `UPDATE` o `DELETE` que intente tocar otro `business_id`
 * es filtrado o rechazado directamente por PostgreSQL.
 */
export async function withTenantContext<T>(
  businessId: string,
  callback: (tx: MarchanteDb) => Promise<T>,
): Promise<T> {
  if (!UUID_REGEX.test(businessId)) {
    throw new Error('Identificador de negocio inválido para contexto multi-tenant.');
  }

  await ensureDatabaseMigrated();
  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL ROLE marchante_tenant;`));
    await tx.execute(sql`SELECT set_config('app.current_business_id', ${businessId}, true);`);
    return callback(tx as unknown as MarchanteDb);
  });
}

/**
 * Ejecuta una operación administrativa o pública controlada (ej. registro de cuenta,
 * login o lectura del catálogo público por slug).
 */
export async function withSystemDb<T>(callback: (db: MarchanteDb) => Promise<T>): Promise<T> {
  await ensureDatabaseMigrated();
  const db = getDb();
  return callback(db);
}

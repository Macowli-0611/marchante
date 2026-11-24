-- ============================================================================
-- Migración 0002: Endurecimiento tras la auditoría (21-nov-2026)
-- Solo cambios aditivos: columnas nuevas con valor por defecto, índices,
-- tablas nuevas y retiro de permisos. No borra ni reescribe datos de negocio.
-- ============================================================================

-- 1. El rol de tenant NO debe poder leer usuarios (hashes de contraseña).
REVOKE ALL ON TABLE "users" FROM marchante_tenant;

-- 2. Versión de sesión: permite revocar todos los tokens de un usuario
--    (cerrar sesión, cambio de contraseña).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 1;

-- 3. El usuario con el que se conecta la app debe poder hacer SET ROLE marchante_tenant.
--    En PostgreSQL 16+ el creador ya es miembro; en versiones anteriores hace falta el GRANT.
DO $$
BEGIN
  EXECUTE format('GRANT marchante_tenant TO %I', current_user);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'No se pudo otorgar marchante_tenant a %: %', current_user, SQLERRM;
END
$$;

-- 4. Consecutivos únicos por negocio (evita #M-102 o #V-205 repetidos).
CREATE UNIQUE INDEX IF NOT EXISTS "orders_business_code_idx" ON "orders" ("business_id", "order_code");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_business_code_idx" ON "sales" ("business_id", "sale_code");

-- 5. Gastos que son compra de insumos/empaques: ya están dentro del costo de cada
--    producto vendido, así que NO deben restarse otra vez de la ganancia neta.
ALTER TABLE "expense_categories" ADD COLUMN IF NOT EXISTS "is_product_cost" boolean NOT NULL DEFAULT false;
ALTER TABLE "financial_movements" ADD COLUMN IF NOT EXISTS "is_product_cost" boolean NOT NULL DEFAULT false;

UPDATE "expense_categories"
   SET "is_product_cost" = true
 WHERE "is_default" = true
   AND "name" IN ('Materia prima e insumos', 'Empaques y bolsas')
   AND "is_product_cost" = false;

UPDATE "financial_movements" fm
   SET "is_product_cost" = true
  FROM "expense_categories" ec
 WHERE fm."category_id" = ec."id"
   AND ec."is_product_cost" = true
   AND fm."kind" = 'EXPENSE'
   AND fm."is_product_cost" = false;

-- 6. Historial de enlaces (slugs): los links viejos redirigen y nadie más puede tomarlos.
CREATE TABLE IF NOT EXISTS "business_slug_history" (
  "slug" text PRIMARY KEY,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "business_slug_history_business_idx" ON "business_slug_history" ("business_id");
REVOKE ALL ON TABLE "business_slug_history" FROM marchante_tenant;

-- 7. Límite de intentos compartido entre instancias (ventana fija por clave).
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" text PRIMARY KEY,
  "window_start" timestamptz NOT NULL,
  "hits" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_window_idx" ON "rate_limit_buckets" ("window_start");
REVOKE ALL ON TABLE "rate_limit_buckets" FROM marchante_tenant;

-- 8. Tabla de control de migraciones fuera del alcance del tenant.
REVOKE ALL ON TABLE "schema_migrations" FROM marchante_tenant;

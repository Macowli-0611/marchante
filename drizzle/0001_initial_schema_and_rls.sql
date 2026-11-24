-- ============================================================================
-- Migración 0001: Esquema Inicial de Marchante + Aislamiento Multi-Tenant (RLS)
-- ============================================================================
-- Nota: gen_random_uuid() es nativo en PostgreSQL 13+ (sin necesidad de extensión externa).

-- 1. Usuarios
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

-- 2. Negocios (Tenant)
CREATE TABLE IF NOT EXISTS "businesses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "owner_name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "category" text NOT NULL DEFAULT 'comida_casera',
  "whatsapp_phone" text NOT NULL,
  "address" text NOT NULL DEFAULT '',
  "city" text NOT NULL DEFAULT 'Cali, Colombia',
  "latitude" double precision NOT NULL DEFAULT 3.4516,
  "longitude" double precision NOT NULL DEFAULT -76.532,
  "schedule" jsonb NOT NULL,
  "payment_methods" jsonb NOT NULL,
  "social_links" jsonb NOT NULL,
  "logo_url" text,
  "cover_url" text,
  "primary_color" text NOT NULL DEFAULT '#C83E2B',
  "background_preset" text NOT NULL DEFAULT 'kraft',
  "font_preset" text NOT NULL DEFAULT 'artesanal',
  "card_style" text NOT NULL DEFAULT 'boleto',
  "next_order_seq" integer NOT NULL DEFAULT 101,
  "next_sale_seq" integer NOT NULL DEFAULT 101,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_slug_idx" ON "businesses" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "businesses_owner_idx" ON "businesses" ("owner_id");

-- 3. Categorías
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "categories_business_order_idx" ON "categories" ("business_id", "sort_order");

-- 4. Productos (Precios y costos en enteros COP, con CHECK >= 0)
CREATE TABLE IF NOT EXISTS "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "image_url" text,
  "price_cop" integer NOT NULL CHECK ("price_cop" >= 0),
  "cost_cop" integer NOT NULL DEFAULT 0 CHECK ("cost_cop" >= 0),
  "cost_breakdown" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "is_hidden" boolean NOT NULL DEFAULT false,
  "is_sold_out" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "products_business_category_idx" ON "products" ("business_id", "category_id", "sort_order");

-- 5. Clientes
CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "phone" text,
  "address" text NOT NULL DEFAULT '',
  "notes" text NOT NULL DEFAULT '',
  "total_spent_cop" bigint NOT NULL DEFAULT 0,
  "purchases_count" integer NOT NULL DEFAULT 0,
  "last_purchase_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "customers_business_phone_idx" ON "customers" ("business_id", "phone");
CREATE INDEX IF NOT EXISTS "customers_business_spent_idx" ON "customers" ("business_id", "total_spent_cop");

-- 6. Pedidos y líneas de pedido
CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "order_code" text NOT NULL,
  "client_order_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING',
  "customer_name" text NOT NULL,
  "customer_phone" text NOT NULL DEFAULT '',
  "delivery_type" text NOT NULL DEFAULT 'PICKUP',
  "delivery_address" text NOT NULL DEFAULT '',
  "payment_method" text NOT NULL DEFAULT 'cash',
  "notes" text NOT NULL DEFAULT '',
  "total_cop" integer NOT NULL CHECK ("total_cop" >= 0),
  "confirmed_sale_id" uuid,
  "cancel_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "confirmed_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "orders_business_client_id_idx" ON "orders" ("business_id", "client_order_id");
CREATE INDEX IF NOT EXISTS "orders_business_status_idx" ON "orders" ("business_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "product_name_snapshot" text NOT NULL,
  "category_name_snapshot" text NOT NULL DEFAULT 'General',
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "unit_price_cop" integer NOT NULL CHECK ("unit_price_cop" >= 0),
  "unit_cost_cop" integer NOT NULL CHECK ("unit_cost_cop" >= 0),
  "line_total_cop" integer NOT NULL CHECK ("line_total_cop" >= 0),
  "notes" text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" ("order_id");

-- 7. Ventas confirmadas y líneas con snapshot histórico
CREATE TABLE IF NOT EXISTS "sales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "sale_code" text NOT NULL,
  "source" text NOT NULL DEFAULT 'QUICK_SALE',
  "payment_method" text NOT NULL DEFAULT 'cash',
  "customer_name_snapshot" text,
  "total_cop" integer NOT NULL CHECK ("total_cop" >= 0),
  "total_cost_cop" integer NOT NULL CHECK ("total_cost_cop" >= 0),
  "gross_profit_cop" integer NOT NULL,
  "notes" text NOT NULL DEFAULT '',
  "sold_at" timestamptz NOT NULL DEFAULT now(),
  "business_date" date NOT NULL,
  "bogota_hour" smallint NOT NULL CHECK ("bogota_hour" >= 0 AND "bogota_hour" <= 23),
  "voided_at" timestamptz,
  "void_reason" text
);
CREATE INDEX IF NOT EXISTS "sales_business_date_idx" ON "sales" ("business_id", "business_date");
CREATE INDEX IF NOT EXISTS "sales_business_customer_idx" ON "sales" ("business_id", "customer_id");

CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "product_name_snapshot" text NOT NULL,
  "category_name_snapshot" text NOT NULL DEFAULT 'General',
  "quantity" integer NOT NULL CHECK ("quantity" > 0),
  "unit_price_cop" integer NOT NULL CHECK ("unit_price_cop" >= 0),
  "unit_cost_cop" integer NOT NULL CHECK ("unit_cost_cop" >= 0),
  "line_total_cop" integer NOT NULL CHECK ("line_total_cop" >= 0),
  "line_profit_cop" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "sale_items_sale_idx" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_business_product_idx" ON "sale_items" ("business_id", "product_id");

-- 8. Categorías de gasto y movimientos financieros
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text NOT NULL DEFAULT 'receipt',
  "is_default" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "expense_categories_business_idx" ON "expense_categories" ("business_id", "sort_order");

CREATE TABLE IF NOT EXISTS "financial_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "kind" text NOT NULL DEFAULT 'EXPENSE',
  "category_id" uuid REFERENCES "expense_categories"("id") ON DELETE SET NULL,
  "category_name_snapshot" text NOT NULL,
  "amount_cop" integer NOT NULL CHECK ("amount_cop" > 0),
  "payment_method" text NOT NULL DEFAULT 'cash',
  "description" text NOT NULL DEFAULT '',
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "business_date" date NOT NULL,
  "voided_at" timestamptz,
  "void_reason" text
);
CREATE INDEX IF NOT EXISTS "financial_movements_business_date_idx" ON "financial_movements" ("business_id", "business_date", "kind");

-- ============================================================================
-- 9. AISLAMIENTO MULTI-TENANT A NIVEL DE BASE DE DATOS (ROW LEVEL SECURITY)
-- ============================================================================
-- Creamos el rol no-superusuario `marchante_tenant` y políticas RLS basadas en
-- `current_setting('app.current_business_id', true)::uuid`.
-- Así, cuando una transacción ejecuta `SET LOCAL ROLE marchante_tenant` y
-- `set_config('app.current_business_id', '<uuid>', true)`, el propio motor
-- PostgreSQL impide leer o modificar filas de otro negocio.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marchante_tenant') THEN
    CREATE ROLE marchante_tenant NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO marchante_tenant;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marchante_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO marchante_tenant;

-- Activar RLS en la tabla de negocios
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_businesses" ON "businesses";
CREATE POLICY "tenant_isolation_businesses" ON "businesses"
  FOR ALL TO marchante_tenant
  USING ("id" = NULLIF(current_setting('app.current_business_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_business_id', true), '')::uuid);

-- Activar RLS en todas las tablas hijas con columna business_id
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories',
    'products',
    'customers',
    'orders',
    'order_items',
    'sales',
    'sale_items',
    'expense_categories',
    'financial_movements'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%I ON %I FOR ALL TO marchante_tenant ' ||
      'USING (business_id = NULLIF(current_setting(''app.current_business_id'', true), '''')::uuid) ' ||
      'WITH CHECK (business_id = NULLIF(current_setting(''app.current_business_id'', true), '''')::uuid);',
      t, t
    );
  END LOOP;
END
$$;

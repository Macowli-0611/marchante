import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  smallint,
  doublePrecision,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ============================================================================
// TIPOS JSONB ESTRUCTURADOS DEL DOMINIO
// ============================================================================

export type DayScheduleConfig = {
  isOpen: boolean;
  openTime: string; // "08:00"
  closeTime: string; // "18:00"
};

export type WeeklyScheduleConfig = {
  lun: DayScheduleConfig;
  mar: DayScheduleConfig;
  mie: DayScheduleConfig;
  jue: DayScheduleConfig;
  vie: DayScheduleConfig;
  sab: DayScheduleConfig;
  dom: DayScheduleConfig;
};

export type PaymentMethodCode = 'cash' | 'nequi' | 'daviplata' | 'transfer' | 'breb' | 'card';

export type PaymentMethodConfig = {
  code: PaymentMethodCode;
  label: string;
  enabled: boolean;
  accountNumber?: string; // Ej. celular Nequi / cuenta Bancolombia / llave Bre-B
  accountHolder?: string; // Titular
  instructions?: string; // Ej. "Envíanos el comprobante por WhatsApp"
};

export type SocialLinksConfig = {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
};

export type CatalogBackgroundPreset =
  | 'kraft'
  | 'crema'
  | 'canasto'
  | 'baldosin'
  | 'bijao'
  | 'nocturno';

export type CatalogFontPreset = 'artesanal' | 'mercado' | 'cartel' | 'editorial';
export type CatalogCardStyle = 'boleto' | 'mostrador' | 'compacta';

export type CostBreakdownItem = {
  id: string;
  name: string;
  costCop: number; // Entero en pesos COP
};

// ============================================================================
// 1. USUARIOS (VENDEDORES / DUEÑOS)
// ============================================================================

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    sessionVersion: integer('session_version').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

// ============================================================================
// 2. NEGOCIOS (TENANT PRINCIPAL — CADA VENDEDOR TIENE SU NEGOCIO AISLADO)
// ============================================================================

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    ownerName: text('owner_name').notNull(),
    description: text('description').default('').notNull(),
    category: text('category').default('comida_casera').notNull(),
    whatsappPhone: text('whatsapp_phone').notNull(),
    address: text('address').default('').notNull(),
    city: text('city').default('Cali, Colombia').notNull(),
    latitude: doublePrecision('latitude').default(3.4516).notNull(),
    longitude: doublePrecision('longitude').default(-76.532).notNull(),
    schedule: jsonb('schedule').$type<WeeklyScheduleConfig>().notNull(),
    paymentMethods: jsonb('payment_methods').$type<PaymentMethodConfig[]>().notNull(),
    socialLinks: jsonb('social_links').$type<SocialLinksConfig>().notNull(),
    // Personalización del catálogo público (Sección D)
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    primaryColor: text('primary_color').default('#C83E2B').notNull(),
    backgroundPreset: text('background_preset')
      .$type<CatalogBackgroundPreset>()
      .default('kraft')
      .notNull(),
    fontPreset: text('font_preset').$type<CatalogFontPreset>().default('artesanal').notNull(),
    cardStyle: text('card_style').$type<CatalogCardStyle>().default('boleto').notNull(),
    // Contadores secuenciales por negocio para códigos legibles (#M-101, #V-101)
    nextOrderSeq: integer('next_order_seq').default(101).notNull(),
    nextSaleSeq: integer('next_sale_seq').default(101).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('businesses_slug_idx').on(table.slug),
    uniqueIndex('businesses_owner_idx').on(table.ownerId),
  ],
);

// ============================================================================
// 3. CATEGORÍAS DEL CATÁLOGO (Sección B y D)
// ============================================================================

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('categories_business_order_idx').on(table.businessId, table.sortOrder)],
);

// ============================================================================
// 4. PRODUCTOS (Sección B y H — Dinero en enteros COP, nunca se borran con ventas)
// ============================================================================

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').default('').notNull(),
    imageUrl: text('image_url'),
    // Dinero siempre en enteros (pesos COP sin decimales)
    priceCop: integer('price_cop').notNull(),
    costCop: integer('cost_cop').default(0).notNull(),
    costBreakdown: jsonb('cost_breakdown').$type<CostBreakdownItem[]>().default([]).notNull(),
    isHidden: boolean('is_hidden').default(false).notNull(),
    isSoldOut: boolean('is_sold_out').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('products_business_category_idx').on(table.businessId, table.categoryId, table.sortOrder),
  ],
);

// ============================================================================
// 5. CLIENTES (Sección F)
// ============================================================================

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address').default('').notNull(),
    notes: text('notes').default('').notNull(),
    totalSpentCop: bigint('total_spent_cop', { mode: 'number' }).default(0).notNull(),
    purchasesCount: integer('purchases_count').default(0).notNull(),
    lastPurchaseAt: timestamp('last_purchase_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('customers_business_phone_idx').on(table.businessId, table.phone),
    index('customers_business_spent_idx').on(table.businessId, table.totalSpentCop),
  ],
);

// ============================================================================
// 6. PEDIDOS PÚBLICOS POR CATÁLOGO / WHATSAPP (Sección C y E)
// ============================================================================

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type DeliveryType = 'PICKUP' | 'DELIVERY';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    orderCode: text('order_code').notNull(), // Ej. "M-101"
    clientOrderId: text('client_order_id').notNull(), // Clave de idempotencia del cliente
    status: text('status').$type<OrderStatus>().default('PENDING').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').default('').notNull(),
    deliveryType: text('delivery_type').$type<DeliveryType>().default('PICKUP').notNull(),
    deliveryAddress: text('delivery_address').default('').notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethodCode>().default('cash').notNull(),
    notes: text('notes').default('').notNull(),
    totalCop: integer('total_cop').notNull(),
    confirmedSaleId: uuid('confirmed_sale_id'),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_business_client_id_idx').on(table.businessId, table.clientOrderId),
    uniqueIndex('orders_business_code_idx').on(table.businessId, table.orderCode),
    index('orders_business_status_idx').on(table.businessId, table.status, table.createdAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    categoryNameSnapshot: text('category_name_snapshot').default('General').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceCop: integer('unit_price_cop').notNull(),
    unitCostCop: integer('unit_cost_cop').notNull(),
    lineTotalCop: integer('line_total_cop').notNull(),
    notes: text('notes').default('').notNull(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)],
);

// ============================================================================
// 7. VENTAS CONFIRMADAS Y SNAPSHOTS HISTÓRICOS (Sección E, I y J)
// ============================================================================

export type SaleSource = 'QUICK_SALE' | 'CATALOG_ORDER';

export const sales = pgTable(
  'sales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    saleCode: text('sale_code').notNull(), // Ej. "V-101"
    source: text('source').$type<SaleSource>().default('QUICK_SALE').notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethodCode>().default('cash').notNull(),
    customerNameSnapshot: text('customer_name_snapshot'),
    totalCop: integer('total_cop').notNull(),
    totalCostCop: integer('total_cost_cop').notNull(),
    grossProfitCop: integer('gross_profit_cop').notNull(),
    notes: text('notes').default('').notNull(),
    soldAt: timestamp('sold_at', { withTimezone: true }).defaultNow().notNull(),
    // Día civil exacto en America/Bogota ("YYYY-MM-DD") y hora (0..23) al momento de la venta
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    bogotaHour: smallint('bogota_hour').notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
  },
  (table) => [
    index('sales_business_date_idx').on(table.businessId, table.businessDate),
    uniqueIndex('sales_business_code_idx').on(table.businessId, table.saleCode),
    index('sales_business_customer_idx').on(table.businessId, table.customerId),
  ],
);

export const saleItems = pgTable(
  'sale_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    categoryNameSnapshot: text('category_name_snapshot').default('General').notNull(),
    quantity: integer('quantity').notNull(),
    // Foto inmutable del precio y costo unitario al instante de la venta
    unitPriceCop: integer('unit_price_cop').notNull(),
    unitCostCop: integer('unit_cost_cop').notNull(),
    lineTotalCop: integer('line_total_cop').notNull(),
    lineProfitCop: integer('line_profit_cop').notNull(),
  },
  (table) => [
    index('sale_items_sale_idx').on(table.saleId),
    index('sale_items_business_product_idx').on(table.businessId, table.productId),
  ],
);

// ============================================================================
// 8. GASTOS E INGRESOS EXTRA (Sección G)
// ============================================================================

export type FinancialMovementKind = 'EXPENSE' | 'EXTRA_INCOME';

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').default('receipt').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    // true = compra de insumos/empaques: ya está dentro del costo de cada producto vendido
    isProductCost: boolean('is_product_cost').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('expense_categories_business_idx').on(table.businessId, table.sortOrder)],
);

export const financialMovements = pgTable(
  'financial_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<FinancialMovementKind>().default('EXPENSE').notNull(),
    categoryId: uuid('category_id').references(() => expenseCategories.id, {
      onDelete: 'set null',
    }),
    categoryNameSnapshot: text('category_name_snapshot').notNull(),
    amountCop: integer('amount_cop').notNull(),
    paymentMethod: text('payment_method').$type<PaymentMethodCode>().default('cash').notNull(),
    description: text('description').default('').notNull(),
    // Copia de expense_categories.is_product_cost al registrar el movimiento
    isProductCost: boolean('is_product_cost').default(false).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
  },
  (table) => [
    index('financial_movements_business_date_idx').on(
      table.businessId,
      table.businessDate,
      table.kind,
    ),
  ],
);

// ============================================================================
// 9. TABLAS DE SISTEMA (sin acceso del rol marchante_tenant)
// ============================================================================

export const businessSlugHistory = pgTable(
  'business_slug_history',
  {
    slug: text('slug').primaryKey(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('business_slug_history_business_idx').on(table.businessId)],
);

export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    key: text('key').primaryKey(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    hits: integer('hits').notNull(),
  },
  (table) => [index('rate_limit_buckets_window_idx').on(table.windowStart)],
);

import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

/* ── Enums ─────────────────────────────────────────────────── */

export const productStatus = pgEnum('product_status', ['draft', 'active', 'archived'])
export const mediaKind = pgEnum('media_kind', ['front', 'back', 'detail', 'editorial', 'flat', 'turnaround'])
export const model3dStatus = pgEnum('model3d_status', ['pending', 'processing', 'ready', 'failed', 'quarantined'])
export const model3dRoute = pgEnum('model3d_route', ['procedural', 'generative', 'relief_2_5d'])

/* ── Catálogo ──────────────────────────────────────────────── */

export const colors = pgTable(
  'colors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** Hex sin almohadilla, p. ej. "A9542E" */
    hex: text('hex').notNull(),
    /** Orden de aparición en el selector */
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('colors_slug_key').on(t.slug)],
)

export const sizes = pgTable(
  'sizes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Medidas de confección en cm, para el Fit Finder (módulo 11) */
    chestCm: integer('chest_cm'),
    lengthCm: integer('length_cm'),
    sleeveCm: integer('sleeve_cm'),
  },
  (t) => [unique('sizes_slug_key').on(t.slug)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    subtitle: text('subtitle'),
    description: text('description').notNull().default(''),
    /** MITOS | CHILLOUT */
    line: text('line').notNull().default('CHILLOUT'),
    category: text('category').notNull(),
    /** hoodie | quarter-zip | crew | tee | pants */
    fit: text('fit').notNull().default('regular'),
    fabric: text('fabric'),
    /** Precio en pesos colombianos, entero, IVA incluido. Null = por definir. */
    priceCop: integer('price_cop'),
    compareAtCop: integer('compare_at_cop'),
    status: productStatus('status').notNull().default('draft'),
    featured: boolean('featured').notNull().default(false),
    /** Etiquetas para filtros rápidos (módulo 16) */
    tags: text('tags').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('products_slug_key').on(t.slug),
    index('products_status_idx').on(t.status),
    index('products_category_idx').on(t.category),
  ],
)

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    colorId: uuid('color_id')
      .notNull()
      .references(() => colors.id, { onDelete: 'restrict' }),
    sizeId: uuid('size_id')
      .notNull()
      .references(() => sizes.id, { onDelete: 'restrict' }),
    sku: text('sku').notNull(),
    priceCop: integer('price_cop'),
    /** Stock real; alimenta el indicador de disponibilidad crítica (módulo 15) */
    stock: integer('stock').notNull().default(0),
    /** Umbral para "solo quedan N unidades" */
    lowStockThreshold: integer('low_stock_threshold').notNull().default(3),
  },
  (t) => [
    unique('product_variants_sku_key').on(t.sku),
    unique('product_variants_combo_key').on(t.productId, t.colorId, t.sizeId),
    index('product_variants_product_idx').on(t.productId),
  ],
)

export const productMedia = pgTable(
  'product_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Si es null, la foto aplica a todos los colores del producto */
    colorId: uuid('color_id').references(() => colors.id, { onDelete: 'set null' }),
    kind: mediaKind('kind').notNull().default('front'),
    url: text('url').notNull(),
    alt: text('alt').notNull().default(''),
    width: integer('width'),
    height: integer('height'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** Fotos de modelo → alimentan lookbook y home editorial */
    isEditorial: boolean('is_editorial').notNull().default(false),
  },
  (t) => [index('product_media_product_idx').on(t.productId)],
)

/* ── 3D ────────────────────────────────────────────────────── */

export const models3d = pgTable(
  'models_3d',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    colorId: uuid('color_id').references(() => colors.id, { onDelete: 'set null' }),
    status: model3dStatus('status').notNull().default('pending'),
    route: model3dRoute('route'),
    /** GLB optimizado (meshopt + texturas WebP) */
    glbUrl: text('glb_url'),
    usdzUrl: text('usdz_url'),
    posterUrl: text('poster_url'),
    glbBytes: integer('glb_bytes'),
    /** SSIM frente a la foto original; decide publicación automática */
    qualityScore: integer('quality_score'),
    /** Motivo legible cuando el modelo queda en cuarentena */
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('models_3d_product_idx').on(t.productId)],
)

export const model3dRuns = pgTable(
  'model_3d_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    modelId: uuid('model_id')
      .notNull()
      .references(() => models3d.id, { onDelete: 'cascade' }),
    /** Etapa: ingest | matte | classify | geometry | texture | optimize | score | publish */
    stage: text('stage').notNull(),
    /** queued | running | succeeded | failed */
    outcome: text('outcome').notNull(),
    durationMs: integer('duration_ms'),
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('model_3d_runs_model_idx').on(t.modelId)],
)

/* ── Colecciones ───────────────────────────────────────────── */

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    heroImageUrl: text('hero_image_url'),
    published: boolean('published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [unique('collections_slug_key').on(t.slug)],
)

export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
)

/* ── Relaciones ────────────────────────────────────────────── */

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
  media: many(productMedia),
  models: many(models3d),
  collectionProducts: many(collectionProducts),
}))

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  color: one(colors, { fields: [productVariants.colorId], references: [colors.id] }),
  size: one(sizes, { fields: [productVariants.sizeId], references: [sizes.id] }),
}))

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
  color: one(colors, { fields: [productMedia.colorId], references: [colors.id] }),
}))

export const models3dRelations = relations(models3d, ({ one, many }) => ({
  product: one(products, { fields: [models3d.productId], references: [products.id] }),
  color: one(colors, { fields: [models3d.colorId], references: [colors.id] }),
  runs: many(model3dRuns),
}))

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionProducts: many(collectionProducts),
}))

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}))

/* ── Pedidos ───────────────────────────────────────────────── */

export const orderStatus = pgEnum('order_status', [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
])

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Código legible para el cliente, p. ej. CHL-2601-0042 */
    code: text('code').notNull(),
    /** Enlace privado de seguimiento, sin datos personales en la URL. */
    token: text('token').notNull(),
    status: orderStatus('status').notNull().default('pending'),

    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email'),
    city: text('city'),
    address: text('address'),
    notes: text('notes'),

    /** Valores recalculados en servidor; el cliente nunca define el total. */
    subtotalCop: integer('subtotal_cop').notNull(),
    shippingCop: integer('shipping_cop').notNull().default(0),
    /** Descuento aplicado por cupón, siempre validado en el servidor. */
    discountCop: integer('discount_cop').notNull().default(0),
    couponCode: text('coupon_code'),
    totalCop: integer('total_cop').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('orders_code_key').on(t.code),
    unique('orders_token_key').on(t.token),
    index('orders_status_idx').on(t.status),
  ],
)

/** Cupones de descuento. El servidor es quien los valida y aplica. */
export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Se guarda en mayúsculas para comparar sin ambigüedad. */
    code: text('code').notNull(),
    kind: text('kind').notNull().default('percent'),
    /** Porcentaje (1–100) o pesos, según `kind`. */
    value: integer('value').notNull(),
    /** Compra mínima en COP para que el cupón aplique. */
    minSubtotalCop: integer('min_subtotal_cop').notNull().default(0),
    active: boolean('active').notNull().default(true),
    /** Usos totales permitidos; null = sin límite. */
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').notNull().default(0),
    /** La fecha se guarda como texto ISO para no arrastrar husos. */
    validFrom: text('valid_from'),
    validUntil: text('valid_until'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('coupons_code_key').on(t.code), index('coupons_active_idx').on(t.active)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productSlug: text('product_slug').notNull(),
    variantId: uuid('variant_id'),
    name: text('name').notNull(),
    colorName: text('color_name').notNull(),
    size: text('size').notNull(),
    qty: integer('qty').notNull(),
    /** Precio congelado al momento de la compra. */
    unitPriceCop: integer('unit_price_cop').notNull(),
    lineTotalCop: integer('line_total_cop').notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatus('status').notNull(),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId)],
)

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}))

/* ── Tipos inferidos ───────────────────────────────────────── */

export type Product = typeof products.$inferSelect
export type ProductVariant = typeof productVariants.$inferSelect
export type ProductMedia = typeof productMedia.$inferSelect
export type Color = typeof colors.$inferSelect
export type Size = typeof sizes.$inferSelect
export type Collection = typeof collections.$inferSelect
export type Model3d = typeof models3d.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type OrderEvent = typeof orderEvents.$inferSelect

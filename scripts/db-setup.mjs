/**
 * Crea el esquema y siembra el catálogo en Neon.
 *
 *   node scripts/db-setup.mjs
 *
 * Usa el driver HTTP de Neon y Node puro: en este entorno `drizzle-kit` no
 * puede ejecutarse porque esbuild no logra levantar su service worker.
 * El esquema refleja exactamente src/db/schema.ts.
 */
import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file)
    break
  } catch {
    /* sin archivo de entorno */
  }
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Falta DATABASE_URL (.env.local)')
  process.exit(1)
}

const sql = neon(url)

const log = (...a) => console.log('[db]', ...a)

/* ── Enums (se crean solo si no existen) ───────────────────── */

const ENUMS = {
  product_status: ['draft', 'active', 'archived'],
  media_kind: ['front', 'back', 'detail', 'editorial', 'flat', 'turnaround'],
  model3d_status: ['pending', 'processing', 'ready', 'failed', 'quarantined'],
  model3d_route: ['procedural', 'generative', 'relief_2_5d'],
  order_status: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'],
}

async function ensureEnums() {
  for (const [name, values] of Object.entries(ENUMS)) {
    const existing = await sql`SELECT 1 FROM pg_type WHERE typname = ${name}`
    if (existing.length > 0) continue
    const literal = values.map((v) => `'${v}'`).join(', ')
    await sql.query(`CREATE TYPE ${name} AS ENUM (${literal})`)
    log('enum creado:', name)
  }
}

/* ── Tablas ────────────────────────────────────────────────── */

const TABLES = [
  `CREATE TABLE IF NOT EXISTS colors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    name text NOT NULL,
    hex text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT colors_slug_key UNIQUE (slug)
  )`,
  `CREATE TABLE IF NOT EXISTS sizes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    label text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    chest_cm integer,
    length_cm integer,
    sleeve_cm integer,
    CONSTRAINT sizes_slug_key UNIQUE (slug)
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    name text NOT NULL,
    subtitle text,
    description text NOT NULL DEFAULT '',
    line text NOT NULL DEFAULT 'CHILLOUT',
    category text NOT NULL,
    fit text NOT NULL DEFAULT 'regular',
    fabric text,
    price_cop integer,
    compare_at_cop integer,
    status product_status NOT NULL DEFAULT 'draft',
    featured boolean NOT NULL DEFAULT false,
    tags text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT products_slug_key UNIQUE (slug)
  )`,
  `CREATE INDEX IF NOT EXISTS products_status_idx ON products (status)`,
  `CREATE INDEX IF NOT EXISTS products_category_idx ON products (category)`,
  `CREATE TABLE IF NOT EXISTS product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    color_id uuid NOT NULL REFERENCES colors (id) ON DELETE RESTRICT,
    size_id uuid NOT NULL REFERENCES sizes (id) ON DELETE RESTRICT,
    sku text NOT NULL,
    price_cop integer,
    stock integer NOT NULL DEFAULT 0,
    low_stock_threshold integer NOT NULL DEFAULT 3,
    CONSTRAINT product_variants_sku_key UNIQUE (sku),
    CONSTRAINT product_variants_combo_key UNIQUE (product_id, color_id, size_id)
  )`,
  `CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants (product_id)`,
  `CREATE TABLE IF NOT EXISTS product_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    color_id uuid REFERENCES colors (id) ON DELETE SET NULL,
    kind media_kind NOT NULL DEFAULT 'front',
    url text NOT NULL,
    alt text NOT NULL DEFAULT '',
    width integer,
    height integer,
    sort_order integer NOT NULL DEFAULT 0,
    is_editorial boolean NOT NULL DEFAULT false
  )`,
  `CREATE INDEX IF NOT EXISTS product_media_product_idx ON product_media (product_id)`,
  `CREATE TABLE IF NOT EXISTS models_3d (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    color_id uuid REFERENCES colors (id) ON DELETE SET NULL,
    status model3d_status NOT NULL DEFAULT 'pending',
    route model3d_route,
    glb_url text,
    usdz_url text,
    poster_url text,
    glb_bytes integer,
    quality_score integer,
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS models_3d_product_idx ON models_3d (product_id)`,
  `CREATE TABLE IF NOT EXISTS model_3d_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id uuid NOT NULL REFERENCES models_3d (id) ON DELETE CASCADE,
    stage text NOT NULL,
    outcome text NOT NULL,
    duration_ms integer,
    detail text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS model_3d_runs_model_idx ON model_3d_runs (model_id)`,
  `CREATE TABLE IF NOT EXISTS collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    hero_image_url text,
    published boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    CONSTRAINT collections_slug_key UNIQUE (slug)
  )`,
  `CREATE TABLE IF NOT EXISTS collection_products (
    collection_id uuid NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sort_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    token text NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text,
    city text,
    address text,
    notes text,
    subtotal_cop integer NOT NULL,
    shipping_cop integer NOT NULL DEFAULT 0,
    total_cop integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT orders_code_key UNIQUE (code),
    CONSTRAINT orders_token_key UNIQUE (token)
  )`,
  `CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status)`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_slug text NOT NULL,
    variant_id uuid,
    name text NOT NULL,
    color_name text NOT NULL,
    size text NOT NULL,
    qty integer NOT NULL,
    unit_price_cop integer NOT NULL,
    line_total_cop integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id)`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status order_status NOT NULL,
    message text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id)`
]

async function ensureTables() {
  for (const statement of TABLES) {
    await sql.query(statement)
  }
  log('esquema listo:', TABLES.length, 'sentencias')
}

/* ── Seed ──────────────────────────────────────────────────── */

async function seed() {
  const raw = await readFile('src/db/seed.json', 'utf8')
  const data = JSON.parse(raw)

  for (const [index, color] of data.colors.entries()) {
    await sql`
      INSERT INTO colors (slug, name, hex, sort_order)
      VALUES (${color.slug}, ${color.name}, ${color.hex}, ${index})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name, hex = EXCLUDED.hex, sort_order = EXCLUDED.sort_order
    `
  }

  for (const size of data.sizes) {
    await sql`
      INSERT INTO sizes (slug, label, sort_order, chest_cm, length_cm, sleeve_cm)
      VALUES (${size.slug}, ${size.label}, ${size.sortOrder}, ${size.chestCm}, ${size.lengthCm}, ${size.sleeveCm})
      ON CONFLICT (slug) DO UPDATE
        SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order,
            chest_cm = EXCLUDED.chest_cm, length_cm = EXCLUDED.length_cm, sleeve_cm = EXCLUDED.sleeve_cm
    `
  }

  for (const [index, collection] of data.collections.entries()) {
    await sql`
      INSERT INTO collections (slug, name, description, published, sort_order)
      VALUES (${collection.slug}, ${collection.name}, ${collection.description}, true, ${index})
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name, description = EXCLUDED.description
    `
  }

  const colors = await sql`SELECT id, slug FROM colors`
  const sizes = await sql`SELECT id, slug FROM sizes`
  const colorId = new Map(colors.map((c) => [c.slug, c.id]))
  const sizeId = new Map(sizes.map((s) => [s.slug, s.id]))

  for (const product of data.products) {
    // El driver HTTP no serializa arrays de JS a text[]; se envía un literal.
    const tagsLiteral = `{${product.tags.map((t) => `"${String(t).replace(/"/g, '\\"')}"`).join(',')}}`

    await sql`
      INSERT INTO products (slug, name, subtitle, description, line, category, fit, fabric, price_cop, compare_at_cop, status, featured, tags)
      VALUES (
        ${product.slug}, ${product.name}, ${product.subtitle}, ${product.description},
        ${product.line}, ${product.category}, ${product.fit}, ${product.fabric},
        ${product.priceCop}, ${product.compareAtCop}, 'active', ${product.featured}, ${tagsLiteral}::text[]
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, subtitle = EXCLUDED.subtitle, description = EXCLUDED.description,
        line = EXCLUDED.line, category = EXCLUDED.category, fit = EXCLUDED.fit,
        fabric = EXCLUDED.fabric, price_cop = EXCLUDED.price_cop,
        compare_at_cop = EXCLUDED.compare_at_cop, status = 'active',
        featured = EXCLUDED.featured, tags = EXCLUDED.tags, updated_at = now()
    `

    const [row] = await sql`SELECT id FROM products WHERE slug = ${product.slug}`
    const productId = row.id

    // Idempotencia: se reconstruyen las variantes y los medios del producto.
    await sql`DELETE FROM product_variants WHERE product_id = ${productId}`
    await sql`DELETE FROM product_media WHERE product_id = ${productId}`

    for (const variant of product.colors) {
      const cid = colorId.get(variant.colorSlug)
      if (!cid) {
        console.warn('  ! color desconocido:', variant.colorSlug)
        continue
      }

      for (const [sizeSlug, stock] of Object.entries(variant.stock)) {
        const sid = sizeId.get(sizeSlug)
        if (!sid) continue
        const sku = `CHL-${product.slug.toUpperCase().replace(/-/g, '')}-${variant.colorSlug
          .slice(0, 3)
          .toUpperCase()}-${sizeSlug.toUpperCase()}`
        await sql`
          INSERT INTO product_variants (product_id, color_id, size_id, sku, price_cop, stock)
          VALUES (${productId}, ${cid}, ${sid}, ${sku}, ${product.priceCop}, ${stock})
          ON CONFLICT (sku) DO UPDATE SET stock = EXCLUDED.stock
        `
      }

      for (const [order, image] of variant.images.entries()) {
        await sql`
          INSERT INTO product_media (product_id, color_id, kind, url, alt, sort_order, is_editorial)
          VALUES (${productId}, ${cid}, ${image.kind}, ${image.url}, ${image.alt}, ${order}, ${Boolean(image.isEditorial)})
        `
      }
    }

    log('producto sembrado:', product.slug)
  }
}

async function main() {
  await ensureEnums()
  await ensureTables()
  await seed()
  const [count] = await sql`SELECT count(*)::int AS n FROM product_variants`
  const [products] = await sql`SELECT count(*)::int AS n FROM products`
  log(`✓ listo — ${products.n} productos, ${count.n} variantes`)
}

main().catch((err) => {
  console.error('[db] falló:', err.message ?? err)
  process.exit(1)
})

# CHILLOUT

Tienda de prendas tejidas con **visor 3D por producto**. Next.js 16 · Postgres (Neon Free) · sin dependencia de API keys para funcionar.

---

## Estado

| Área | Estado |
|---|---|
| Design system (tokens, tipografía, marca) | ✅ |
| Home, catálogo y ficha de producto | ✅ |
| Catálogo semilla (3 SKU reales, 19 fotos) | ✅ |
| Esquema de datos + migraciones Drizzle | ✅ |
| Pipeline 3D (foto → GLB) | ⏳ siguiente |
| Carrito, checkout, pedidos | ⏳ |
| Admin / 3D Studio | ⏳ |
| Módulos 1–20 del brief | ⏳ por fases |

---

## Requisitos

Este proyecto se desarrolló con el runtime de Node que trae el harness (Node 24 + pnpm 11). **No hace falta instalarlos en el sistema.**

Node: `C:\Users\user\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`
pnpm: `…\dependencies\pnpm\bin\pnpm.mjs`
git portable: `.tools\git\cmd\git.exe` (instalado por `scripts/bootstrap-git.mjs`)

### Atajos

```powershell
# Instalar dependencias
& $node $pnpm install

# Desarrollo
& $node node_modules\next\dist\bin\next dev

# Migraciones y seed
& $node $pnpm db:generate
& $node $pnpm db:seed

# Preparar las fotos de marca (normaliza y renombra)
& $node $pnpm assets
```

---

## Modo Cero

La aplicación arranca **sin ninguna credencial**. Todo proveedor externo vive detrás de un adaptador y se degrada con elegancia.

```
PROVIDER_MODE=local          # local | cloud
DATABASE_URL=                # vacío ⇒ PGlite (WASM, .data/chillout)
PAYMENTS_PROVIDER=mock       # mock | wompi
EMAIL_PROVIDER=outbox        # outbox | resend
WHATSAPP_PROVIDER=wa_me      # wa_me (gratis) | cloud_api (cobra)
```

- **Base de datos:** con `DATABASE_URL` usa Neon; sin ella, PGlite persiste en `.data/` con el mismo esquema Drizzle.
- **Pagos:** el gateway `mock` replica los estados de Wompi (`PENDING / APPROVED / DECLINED / VOIDED`), así el checkout se prueba completo sin cuenta de comercio.
- **Email:** escribe en `.data/outbox/` en lugar de enviar.
- **WhatsApp:** enlaces `wa.me` (gratis e ilimitados). La Cloud API —que **cobra por mensaje**— queda apagada por defecto.
- **3D:** malla procedural local. Los proveedores generativos son opcionales.

---

## Notificaciones gratuitas

WhatsApp Business Cloud API **cobra por mensaje entregado** desde julio de 2025 ([tarifas de Meta](https://developers.prod.facebook.com/documentation/business-messaging/whatsapp/pricing.md)). Por eso el stack por defecto es:

| Canal | Costo | Implementación |
|---|---|---|
| `wa.me` | $0, ilimitado | `waLink()` en `src/lib/brand.ts` |
| Web Push (VAPID) | $0, ilimitado | pendiente (Fase 3) |
| Email (Resend) | $0 hasta 3.000/mes | pendiente (Fase 3) |

---

## Estructura

```
src/
  app/                    rutas (App Router)
    producto/[slug]/      ficha de producto
    coleccion/            catálogo
  components/
    product/              tarjeta y ficha
    site/                 header, footer, marca
  db/
    schema.ts             esquema Drizzle (catálogo, 3D, pedidos)
    seed-data.ts          catálogo semilla (fuente de verdad inicial)
    seed.ts               siembra idempotente
    client.ts             Neon | PGlite
  lib/
    catalog.ts            capa de lectura del catálogo
    brand.ts              marca, navegación, wa.me
scripts/
  bootstrap-git.mjs       descarga Git portable a .tools/
  prepare-assets.ts       normaliza las 19 fotos a public/media
Chillout_imagenes/        19 fotos originales de la marca (sin tocar)
```

---

## Fotografías

Las 19 imágenes originales llegan comprimidas por WhatsApp (máx. 1280×1600). Sirven para el catálogo, **no** para el zoom macro 4× ni el hero cinematográfico: hacen falta los originales de cámara.

---

## Pendientes del cliente

1. `DATABASE_URL` de Neon Free ([console.neon.tech](https://console.neon.tech/signup), sin tarjeta).
2. Fotos originales de cámara.
3. Logo vectorial (el actual es un JPEG).
4. Precios, tallas, SKU y tabla de medidas reales.
5. Cuenta Wompi aprobada.

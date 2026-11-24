# Marchante — Tu mostrador digital, tus cuentas claras y tus pedidos por WhatsApp

> **Marchante** es una aplicación web móvil-primero (*PWA*) construida desde cero para pequeños emprendedores de Colombia y Latinoamérica (repostería, comida casera, ropa, artesanías, mascotas, belleza, fruver, tiendas de barrio y negocios por Instagram o WhatsApp).
>
> Reemplaza el cuaderno, la calculadora y las hojas sueltas por un sistema rápido que se maneja con una sola mano desde el celular: **vitrina pública con link propio (`/[slug]`), pedidos directos a WhatsApp previamente guardados como pendientes, venta rápida en 2 toques, confirmación de pedidos en 1 toque, cuaderno de clientes, libro de gastos e ingresos, estudio de costos y márgenes, resumen diario en lenguaje humano y gráficas con frases explicativas.**

---

## 1. Arquitectura y Stack Tecnológico

| Capa | Tecnología | Por qué se eligió |
|---|---|---|
| **Framework Full-Stack** | **Next.js 15 (App Router) + React 19 + TypeScript estricto** | Unifica interfaz móvil, Server Components ultraligeros (`~114 kB` First Load JS en `/[slug]`) y rutas API tipadas sin duplicar servidores Express + Next. |
| **Estilos y Sistema de Diseño** | **Tailwind CSS 4** + tokens CSS (*"Tierra, Tinta y Achiote"*) | Identidad visual cálida inspirada en la cartelería comercial colombiana, papel kraft (`#FAF6EE`), tinta (`#1C1714`) y rojo achiote (`#C83E2B`), con tipografías `Fraunces`, `Plus Jakarta Sans` y `JetBrains Mono`. |
| **Base de Datos y Multi-Tenant** | **PostgreSQL + Drizzle ORM + Row Level Security (RLS)** | Esquema SQL versionado (`drizzle/0001_initial_schema_and_rls.sql`) con rol `marchante_tenant` y políticas `ENABLE` + `FORCE ROW LEVEL SECURITY` basadas en `current_setting('app.current_business_id', true)` en las 10 tablas de negocio. |
| **Conector PostgreSQL Dual** | **`pg` (Pool) + `@electric-sql/pglite`** (`src/db/index.ts`) | Funciona en local con **cero configuración externa** usando PostgreSQL real embebido (`.data/marchante-pg`) y conmuta automáticamente a cualquier cluster PostgreSQL en la nube (Supabase, Railway, Neon, Docker) cuando `DATABASE_URL` empieza por `postgresql://` o `postgres://`. |
| **Dinero y Zona Horaria** | **Enteros en pesos COP (`integer`) + `America/Bogota` (`UTC-5`)** | Cero decimales flotantes: todo monto (`price_cop`, `cost_cop`, `total_cop`, `amount_cop`) es un entero validado en aplicación y base de datos. Todo cálculo de *"Hoy"*, *"Esta semana"*, *"Este mes"* y *"Abierto ahora"* se evalúa en hora civil de Colombia (`America/Bogota`). |
| **Imágenes y Mapas** | **`sharp` (WebP) + `<canvas>` + MapLibre GL / OpenStreetMap** | Recorte interactivo en el navegador y compresión automática en servidor a WebP (`720×720`, `< 250 KB`), más mapa con marcador arrastrable y controles accesibles Norte/Sur/Este/Oeste (WCAG 2.2 SC 2.5.7). |
| **Calidad y Pruebas** | **Vitest (54 pruebas) + Playwright E2E (Chromium)** | Pruebas unitarias y de integración sobre Postgres real con RLS + prueba End-to-End completa en navegador. |

### Estructura modular del código (`src/`)

```text
src/
├── app/
│   ├── (auth)/login & registro/     # Entrada de vendedores y registro con onboarding
│   ├── [slug]/                      # Catálogo público móvil (Server Component + carrito)
│   ├── panel/                       # Panel del emprendedor (Resumen, Vender, Catálogo, Diseño, Clientes, Movimientos, Costos, Estadísticas, Perfil)
│   └── api/                         # Endpoints REST protegidos por sesión y rate limiting
├── components/
│   ├── ui/                          # Primitivas compartidas: Dialog (Escape + foco), FeedbackBanner, SegmentedControl,
│   │                                #   PeriodSelector, SectionCard, Pagination, MarginBadge, color-tokens (solo canvas/SVG)
│   ├── catalog/
│   │   ├── public-storefront.tsx    # Orquestador de la vitrina pública
│   │   └── storefront/              # Cabecera, filtros, tarjeta, carrito (useCart), checkout (useCheckout), modales
│   └── panel/
│       ├── <pantalla>.tsx           # Orquestador delgado de cada pantalla del panel
│       └── <pantalla>/              # catalog/, quick-sale/, profile/, finance/, customers/, design/, costing/, statistics/
│                                    #   types.ts + use-<pantalla>.ts (estado y llamadas a la API) + piezas visuales
├── db/
│   ├── schema.ts                    # Esquema Drizzle ORM de las 11 tablas
│   ├── index.ts                     # Conector PostgreSQL dual + withTenantContext (SET LOCAL ROLE marchante_tenant)
│   ├── migrate.ts                   # Ejecutor de migraciones SQL
│   └── seed.ts                      # Semilla de la tienda demo "Horno & Canela"
└── modules/                         # Lógica de negocio pura separada de la UI
    ├── shared/                      # Moneda COP entera, hora Bogotá, validador de slug, rate limiter
    ├── auth/                        # Hashing scrypt, cookies JWT HTTP-only (jose), cuenta demo
    ├── business/                    # Perfil, horarios en Bogotá, personalización visual y contraste WCAG
    ├── catalog/                     # Categorías, productos, archivado seguro, costeo/margen y optimizador WebP (sharp)
    ├── orders/                      # Catálogo público, pedidos PENDIENTES idempotentes y generador de mensaje WhatsApp
    ├── sales/                       # Venta rápida en 2 toques, confirmación 1-toque y snapshots históricos inmutables
    ├── customers/                   # CRM ligero con upsert automático por teléfono, notas e historial
    ├── finance/                     # Libro de gastos, categorías propias e ingresos extra
    └── analytics/                   # Resumen diario narrativo y estadísticas con frases explicativas
```

---

### Sistema de diseño (tokens)

Los colores viven **solo** en `src/app/globals.css`: primitivos (`--p-*`) → semánticos (`--text-ink`, `--bg-card`…) → utilidades de Tailwind generadas con `@theme inline`. En los componentes se usan clases como `text-ink`, `text-ink-muted`, `bg-paper`, `bg-canvas`, `border-line`, `bg-brand`, `text-profit`, `bg-danger-soft` y las sombras `shadow-stamp-1/2/3`. **No escribas colores en hex dentro de los componentes**; para cambiar un color se toca solo `:root`. Las únicas excepciones (canvas 2D, marcador del mapa, atributos SVG de Recharts) usan `src/components/ui/color-tokens.ts`.

## 2. Cómo correrlo en local (en 1 minuto)

### Requisitos previos
- **Node.js 20+**
- **pnpm** (`npm install -g pnpm`)

### Pasos
```bash
# 1. Entrar al directorio del proyecto
cd /Users/usuario/.gemini/antigravity/scratch/marchante

# 2. Instalar dependencias
pnpm install

# 3. Copiar variables de entorno (si aún no existe .env)
cp -n .env.example .env

# 4. Aplicar migraciones SQL (incluyendo políticas RLS) y sembrar la tienda de demostración
pnpm db:migrate
pnpm db:seed

# 5. Iniciar el servidor de desarrollo en http://localhost:3100
pnpm dev
```

> **Nota sobre la base de datos local:** Por defecto `.env` usa `DATABASE_URL="pglite://.data/marchante-pg"`, que levanta un motor **PostgreSQL real embebido** persistido en la carpeta `.data/marchante-pg` con todas las tablas, restricciones `CHECK` y políticas `ROW LEVEL SECURITY` activas, sin que tengas que instalar Docker ni Postgres aparte.

---

## 3. Datos de Prueba Realistas (`seed`: *"Horno & Canela"*)

Al ejecutar `pnpm db:seed` (o al tocar el botón **"Probar tienda de demostración en 1 toque"** en la portada o en `/login`), se crea y puebla el negocio colombiano **"Horno & Canela"** de **Doña Elena**:

- **URL del panel:** `http://localhost:3100/login` (o botón **"Probar tienda de demostración en 1 toque"**)
  - **Correo:** `elena@marchante.co`
  - **Contraseña:** `demo-marchante-2026`
- **URL del catálogo público:** `http://localhost:3100/horno-y-canela`
- **Qué incluye la semilla:**
  - **Perfil completo (`A1..A7`):** Ubicación en Chapinero Alto (Bogotá) con coordenadas en el mapa, horario de lunes a domingo, pagos por Efectivo, Nequi, Daviplata y Llave Bre-B, Instagram y WhatsApp.
  - **3 categorías y 6 productos (`B1..B7`, `H1..H4`):** *Amasijos Recién Salidos* (Almojábana Cundiboyacense, Pan de Yuca con Queso Doble Crema, Envuelto de Mazorca Tierna), *Tortas y Postres de Casa* (Torta de Almojábana y Guayaba, Rollo de Canela y Panela) y *Bebidas Calientes* (Chocolate Santafereño Completo), todos con precios, costos e insumos desglosados.
  - **Clientes con historial y notas (`F1..F4`):** Camila Restrepo (*"Prefiere las almojábanas bien doraditas. Paga siempre por Nequi"*), Andrés Felipe Mora y Valentina Gómez.
  - **Ventas históricas y de hoy + Gastos del día (`E1..E7`, `G1..G4`, `I1..I4`, `J1..J6`):** Ventas de la semana pasada y ventas de hoy en hora de Bogotá, más gastos de materia prima y empaques para ver de inmediato el **Resumen Diario narrativo** y las **Estadísticas comparativas**.
  - **Pedido pendiente de WhatsApp (`#M-101`):** Un pedido `PENDIENTE` en `/panel/vender` listo para que pruebes el botón verde **"✓ Confirmar venta"** de un solo toque.

---

## 4. Variables de Entorno (`.env.example`)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | **Sí** | `pglite://.data/marchante-pg` (Postgres embebido local) o `postgresql://...` (Supabase / Railway / Neon / Docker). |
| `AUTH_SECRET` | **Sí en producción** | Mínimo 32 caracteres (`openssl rand -hex 32`). En producción el servidor **falla al arrancar** si falta, es corto o es un valor de ejemplo. |
| `NEXT_PUBLIC_APP_URL` | **Sí** | Dominio público (enlaces del catálogo). |
| `ENABLE_DEMO` | No | Tienda demo *Horno & Canela*: activa en desarrollo, **apagada en producción** salvo `ENABLE_DEMO=true`. La demo nunca puede cambiar perfil, diseño ni subir imágenes. |
| `TRUSTED_PROXY_HOPS` | No | Proxies delante de la app (por defecto 1) para leer la IP real en los límites de intentos. |
| `STORAGE_DRIVER`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | **Sí en Vercel/serverless** | Imágenes en un bucket **público** de Supabase Storage. Sin ellas se usa el disco local (`MEDIA_DIR`, por defecto `.data/media`) servido en `/media/...`. |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | Recomendado en producción | Proveedor de teselas del mapa; `tile.openstreetmap.org` no admite uso comercial intensivo. |

---

## 5. Comandos Disponibles

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo en `http://localhost:3100`. |
| `pnpm build` / `pnpm start` | Compila y levanta producción en el puerto `3100`. |
| `pnpm db:migrate` | Aplica en orden las migraciones `drizzle/NNNN_*.sql` pendientes (tabla `schema_migrations`, con bloqueo para que dos instancias no migren a la vez). La app también las aplica sola al arrancar. |
| `pnpm db:seed` | Crea la tienda de demostración *Horno & Canela*. |
| `pnpm typecheck` | `tsc --noEmit` en modo estricto. |
| `pnpm test` | Pruebas Vitest sobre PostgreSQL (PGlite) con RLS real. |
| `pnpm test:e2e` | Prueba End-to-End en Playwright. |

> **Migraciones nuevas:** crea `drizzle/0003_lo_que_sea.sql` con cambios aditivos y refleja lo mismo en `src/db/schema.ts`. Nunca edites una migración ya aplicada.

---

## 6. Guía de Despliegue a Producción

1. **Base de datos PostgreSQL** (Supabase, Railway, Neon…): usa la cadena de conexión directa (puerto 5432). La migración `0002` otorga al usuario de la app el rol `marchante_tenant` (necesario en PostgreSQL 15 o anterior para `SET LOCAL ROLE`).
2. **Variables:** `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -hex 32`), `NEXT_PUBLIC_APP_URL`, y el almacenamiento de imágenes:
   - **Vercel / serverless:** obligatorio Supabase Storage (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, bucket público `SUPABASE_STORAGE_BUCKET`).
   - **Servidor propio / Docker / Railway con volumen:** basta montar un volumen persistente en `MEDIA_DIR`.
3. **Migrar** (opcional, la app lo hace al arrancar): `pnpm db:migrate`. No corras `pnpm db:seed` en producción salvo que quieras la demo (`ENABLE_DEMO=true`).
4. **Compilar y arrancar:** `pnpm build && pnpm start`.
5. **Mapa:** configura `NEXT_PUBLIC_MAP_TILE_URL` con tu proveedor de teselas.

### Seguridad que trae el despliegue

- Sesiones JWT `httpOnly` firmadas con `AUTH_SECRET`, revocables: cerrar sesión o cambiar la contraseña invalida todos los tokens del usuario.
- Aislamiento por negocio con RLS (`FORCE ROW LEVEL SECURITY`); el rol `marchante_tenant` no tiene acceso a `users` ni a tablas de sistema.
- Límites de intentos guardados en PostgreSQL (funcionan con varias instancias) e IP leída sin confiar en `X-Forwarded-For` del cliente.
- Cabeceras: CSP, HSTS (producción), `X-Frame-Options`, `no-store` en la API.
- Los errores de base de datos nunca se muestran al usuario (solo van al log del servidor).

### Cuentas: ganancia vs. caja

- **Ganancia** = ventas − costo de lo vendido (congelado en cada venta) + ingresos extra − **gastos del negocio** (arriendo, transporte, publicidad…).
- Las **compras de insumos y empaques** (categorías marcadas «compra de insumos») ya están dentro del costo de cada producto, por eso **no se restan otra vez** de la ganancia; sí aparecen en el **balance de caja** (todo lo que entró − todo lo que salió).

---

## 7. Mejoras Futuras (Fuera del Alcance Actual)

Las siguientes ideas quedaron identificadas para futuras versiones sin complicar la versión actual:
1. **Recuperar contraseña por correo:** hoy se puede cambiar estando dentro (Perfil → Cambiar contraseña), pero no hay recuperación por correo porque el proyecto no tiene proveedor de email.
2. **Variantes simples de producto (talla o sabor):** Permitir que un producto de ropa o repostería tenga opciones simples (*Talla S/M/L* o *Porción / Completa*) sin caer en la complejidad de modificadores anidados de restaurantes.
3. **Generador de afiche PDF / PNG con código QR de la vitrina:** Para que el emprendedor pueda imprimir un hablador de mostrador con el color de su marca y el QR hacia `/[slug]`.
4. **Recibo de venta en imagen para enviar por WhatsApp:** Generar una tarjeta PNG del tiquete `#V-101` para compartírsela al comprador como comprobante.
5. **Modo multi-usuario básico (Dueño + Ayudante):** Permitir que un ayudante registre ventas rápidas sin poder editar costos ni borrar movimientos históricos.

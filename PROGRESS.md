# PROGRESS.md — Bitácora de Fases y Decisiones (Marchante)

## Estado General
- **Fase actual:** Fase 14 — CIERRE (`PROYECTO 100% COMPLETADO Y VERIFICADO` — Todas las fases `0 a 14` y todos los requisitos `T1..T7`, `A1..A7`, `B1..B7`, `C1..C8`, `D1..D6`, `E1..E7`, `F1..F4`, `G1..G4`, `H1..H4`, `I1..I4`, `J1..J6` y `K1..K5` están en estado `verificado`).
- **Directorio del proyecto nuevo:** `/Users/usuario/.gemini/antigravity/scratch/marchante`
- **Proyecto de referencia (SOLO LECTURA, intacto):** `/Users/usuario/Desktop/NAMI/nami` y `/Users/usuario/Desktop/CRM_NAMI/nami-crm-web`

---

## Fase 14 — Cierre: Documentación, Guía de Despliegue, Semilla Realista y Verificación Final (`K5`) (2026-11-21)

### 1. Qué entregamos en esta fase final
1. **Documentación completa (`README.md` y `.env.example`):**
   - Guía clara de qué es **Marchante**, arquitectura modular y stack tecnológico, puesta en marcha local en 1 minuto sin dependencias externas, explicación de cada variable de entorno, tabla de comandos (`pnpm dev`, `pnpm build`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm test`, `pnpm test:e2e`), guía paso a paso de despliegue a producción para el compañero del usuario (Supabase / Railway / Docker / Vercel), detalle de los datos de prueba (`Horno & Canela`) y lista honesta de mejoras futuras.
2. **Semilla realista verificada (`pnpm db:seed` / `src/db/seed.ts`):**
   - Puebla el negocio colombiano **"Horno & Canela"** (`/horno-y-canela`, `elena@marchante.co` / `demo-marchante-2026`) con perfil completo, 3 categorías, 6 productos con costos e insumos, 3 clientes con notas e historial, ventas de la semana pasada y de hoy en hora de Bogotá, gastos del día y el pedido pendiente `#M-101` listo para confirmar con 1 toque.
3. **Matriz `FEATURES.md` al 100% en estado `verificado`:**
   - Los 61 requisitos de `FEATURES.md` (`T1..T7`, `A1..A7`, `B1..B7`, `C1..C8`, `D1..D6`, `E1..E7`, `F1..F4`, `G1..G4`, `H1..H4`, `I1..I4`, `J1..J6`, `K1..K5`) están implementados, probados y marcados como `verificado`.

---

## Fase 13 — Revisión de Código, Seguridad, Rendimiento, Accesibilidad y Pruebas Unitarias + E2E (`K2, K3, K4`) (2026-11-21)

### 1. Informe de Hallazgos de Auditoría y Correcciones Aplicadas
1. **Protección contra URI peligrosas (`javascript:` / `data:`) en enlaces de redes sociales y web externa (`src/modules/business/validators.ts`):**
   - *Hallazgo:* Si un usuario introducía un esquema peligroso como `javascript:alert(1)` o `data:text/html,...` en el campo de sitio web o redes sociales, podía renderizarse en un `<a href="...">` del catálogo público.
   - *Corrección:* Endurecimos `normalizeSocialHandleOrUrl` para rechazar cualquier protocolo distinto de `http:` / `https:` (`javascript:`, `data:`, `vbscript:`, `file:`) y validar la estructura de la URL con `new URL(...)`. Verificado con prueba unitaria dedicada.
2. **Rate Limiting contra fuerza bruta en `/api/auth/login` y `/api/auth/register`:**
   - *Hallazgo:* El catálogo público (`/api/public/orders`) ya tenía `checkRateLimit`, pero las rutas de login y registro no limitaban intentos repetidos por IP.
   - *Corrección:* Añadimos `checkRateLimit` en `src/app/api/auth/login/route.ts` (12 intentos / 5 min por IP) y `src/app/api/auth/register/route.ts` (8 registros / 10 min por IP), devolviendo HTTP `429` con cabecera `Retry-After`.
3. **Guardas contra desbordamiento entero en multiplicaciones `precio * cantidad` (`src/modules/orders/service.ts` y `src/modules/sales/service.ts`):**
   - *Hallazgo:* Aunque precios y cantidades se validan como enteros, añadimos `assertIntegerCop(lineTotalCop)` y `assertIntegerCop(totalCop)` al multiplicar `priceCop * quantity` en pedidos públicos y ventas rápidas para garantizar que ningún total supere `MAX_SAFE_COP` (`999.999.999.999 COP`).
4. **Defensa contra Path Traversal en almacenamiento de imágenes WebP (`src/modules/catalog/image-optimizer.ts`):**
   - *Hallazgo:* `businessId` se usa para construir el prefijo del archivo WebP (`biz-${businessId.slice(0, 8)}`).
   - *Corrección:* Añadimos validación explícita por expresión regular (`UUID_PREFIX_REGEX = /^[0-9a-f]{8}/i`) antes de construir la ruta en `public/uploads`, bloqueando cualquier intento de inyección de rutas (`../../etc/passwd`).
5. **Cabeceras HTTP de seguridad en todas las rutas (`next.config.ts`):**
   - *Corrección:* Configuramos `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
6. **Accesibilidad WCAG 2.2 AA y Core Web Vitals (LCP / CLS / INP):**
   - *Corrección:* Añadimos enlace de salto rápido por teclado (`Saltar al contenido principal` → `#panel-main-content`) en `src/components/panel/panel-shell.tsx`, dimensiones explícitas `width` / `height` y `loading="lazy"` / `decoding="async"` en las imágenes del catálogo público (`src/components/catalog/public-storefront.tsx`) para evitar saltos de layout (CLS = 0), y verificamos áreas táctiles mínimas de `44×44 px` (`min-h-11`, `h-11`, `h-12`).
7. **Escaneo de secretos (`secrets-scan`):**
   - *Resultado:* `0` credenciales, llaves privadas o tokens expuestos en el código fuente; `.env` y `.data/` excluidos en `.gitignore`.

### 2. Pruebas Automáticas Verificadas (`K3` y `K4`)
- **Vitest (`pnpm test`):** **14 suites / 35 pruebas** en verde (`6.64s`), cubriendo:
  - Dinero en enteros COP, ganancia en pesos, margen porcentual y simulador de precio sugerido (`foundation.test.ts`, `costing.test.ts`).
  - Zona horaria `America/Bogota` en cambios de día (`23:59` vs `00:01` Colombia), semanas y meses (`foundation.test.ts`, `business-profile.test.ts`, `daily-summary.test.ts`, `statistics.test.ts`).
  - Formato del mensaje de WhatsApp, snapshot inmutable de precios/costos, idempotencia y anti-spam (`public-catalog-orders.test.ts`, `sales-and-orders.test.ts`).
  - Aislamiento multi-tenant a nivel PostgreSQL RLS y bloqueo de ataques BOLA / IDOR cruzados entre dos vendedores en todos los módulos (`rls-multitenant.test.ts`, `security-and-logic-audit.test.ts`).
- **Playwright End-to-End (`pnpm test:e2e`):** Flujo completo automatizado en navegador Chromium real (`tests/e2e/main-flow.spec.ts`): registro de emprendedor → creación de producto en `/panel/catalogo` → pedido de cliente en vitrina pública `/[slug]` (`#M-101`) → confirmación de venta en 1 toque en `/panel/vender` (`#V-101`) → verificación de totales y producto estrella en `/panel` y `/panel/estadisticas`.

---

## Fase 12 — Revisión de Completitud 1 a 1 y Paridad Mejorada contra `ñami` (2026-11-21)

### 1. Hallazgos encontrados y corregidos en la Fase 12
1. **Separación de constantes cliente vs. servicio de base de datos en Personalización (`D2..D4`):** Al ejecutar el build real de producción (`pnpm build`), detectamos que `catalog-customization-studio.tsx` (`'use client'`) importaba constantes desde `src/modules/business/customization.ts`, lo que arrastraba `src/db/index.ts` (`pg`) al bundle de cliente. **Corregido:** Extraímos las opciones y el cálculo de contraste WCAG a `src/modules/business/customization-options.ts` (100% puro sin imports de DB) y `next build` compiló las 32 rutas estáticas/dinámicas en `2.4s` con `0` errores.
2. **Calculadora rápida de vueltas (cambio) en efectivo en Venta Rápida (`E2`):** Al revisar las utilidades de caja de `ñami` (`cash-labels.ts`), añadimos en `src/components/panel/quick-sale-terminal.tsx` los botones rápidos de billete (`$ 10.000`, `$ 20.000`, `$ 50.000`, `$ 100.000`) cuando el pago es en Efectivo, mostrando al instante **"💵 Vueltas / cambio a entregar: $ XX.XXX"**.
3. **Exportación a CSV (Excel) desde el Libro de Gastos e Ingresos (`G4`):** Añadimos el botón **"Exportar CSV"** en `src/components/panel/finance-movements-manager.tsx` para descargar en 1 clic los movimientos del periodo.
4. **Tienda de demostración rica en datos (`ensureDemoSellerAccount` y `src/db/seed.ts`):** Enriquecimos *Horno & Canela* para que nazca con 3 categorías, 6 productos (con desglose de costos por ingredientes), clientes con historial, ventas de la semana pasada y de hoy, gastos del día y un pedido pendiente de WhatsApp (`#M-101`) listo para confirmar con 1 toque.

### 2. Paridad contra funciones de `ñami`: Equivalentes Mejorados vs. Descartados con Razón Explícita

| Función en `ñami` | Estado en **Marchante** | Cómo se mejoró o por qué se descartó explícitamente |
|---|---|---|
| Perfil del negocio, mapa, horarios en Bogotá, pagos (Nequi/Daviplata/Bre-B) y redes | **Mejorado (`A1..A7`)** | Dividido en 4 pestañas móviles limpias con pin arrastrable + botones accesibles Norte/Sur/Este/Oeste (WCAG 2.2 SC 2.5.7) y botón para probar WhatsApp. |
| Catálogo, categorías, agotado, oculto, soft-delete y fotos WebP | **Mejorado (`B1..B7`)** | Interruptores de 1 toque en la tarjeta del producto, recortador interactivo en `<canvas>` + `sharp` a WebP y archivado seguro (`archived_at`) que jamás borra productos con ventas. |
| Carta pública `/[slug]`, carrito, pedido `PENDING` idempotente y mensaje `wa.me` | **Mejorado (`C1..C8`)** | Server Component ultraligero en 3G/4G (`~118 kB` First Load JS frente a `299 kB` de `ñami`), idempotencia por `clientOrderId`, honeypot anti-spam y rate limiter. |
| Estudio de diseño de la carta con vista previa de celular | **Mejorado (`D1..D6`)** | Vista previa en vivo 1:1 con `PublicStorefront`, 7 paletas curadas + medidor de contraste WCAG en tiempo real, 6 fondos artesanales, 4 tipografías y orden de categorías. |
| POS / Caja con turnos Z obligatorios y arqueo a ciegas | **Reemplazado por Venta Rápida (`E1..E7`)** | Un pequeño emprendedor no necesita abrir ni cerrar un turno fiscal Z para anotar una venta. En Marchante vende en **2 toques**, edita el precio al vuelo, calcula vueltas y confirma pedidos de WhatsApp en **1 toque**. |
| Clientes, historial y notas | **Mejorado (`F1..F4`)** | Auto-registro al pedir por catálogo o en venta rápida + notas visibles en la tarjeta + hoja con historial detallado de compras y botón directo a WhatsApp. |
| Finanzas (Movimientos, Cuentas, Extractos bancarios, PUC) | **Simplificado y Mejorado (`G1..G4`)** | Sin códigos contables PUC ni importación de extractos bancarios. Libro directo de Ventas + Ingresos extra − Gastos por categoría + exportación CSV. |
| Costeo, margen y recetas | **Mejorado (`H1..H4`)** | Estudio visual con ganancia en pesos (`$`), margen (`%`), semáforo de salud, simulador de precio sugerido y calculadora opcional de costo desglosado por ingredientes/insumos. |
| Inicio y Reportes | **Mejorado (`I1..I4`, `J1..J6`)** | Resumen diario en **lenguaje humano conversacional** con el producto estrella del día, y gráficas Recharts con una **frase explicativa clara arriba de cada gráfica**. |
| Plano 2D de mesas de restaurante, comandas de cocina/bar, agentes Go/Android de impresión ESC/POS, facturación electrónica DIAN (Factus), boletería de conciertos y directorio de Yumbo | **Descartado a propósito** | Son módulos exclusivos de restaurantes grandes con salón físico y facturación DIAN en Yumbo que añaden enorme fricción y no aplican al objetivo de un sistema simple y transversal para pequeños emprendedores. |

---

## Fase 11 — Estadísticas, Gráficas con Frases Explicativas y Filtros en Bogotá (Sección J: J1 a J6) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Estadísticas y Gráficas (`/panel/estadisticas`):** Gráficas simples que cualquiera entiende a la primera: arriba un selector de periodo en `America/Bogota` (*Hoy · Esta semana · Este mes · Personalizado*) y 3 tarjetas de totales (*Ventas del periodo con % frente al anterior, Ganancia libre tras costos y gastos, y Gastos del periodo*). Debajo va una gráfica de barras Recharts día por día (**Ventas, Ganancia de productos y Gastos**) y 5 tableros (*Productos más vendidos, Ventas por categoría, Métodos de pago, Mejores clientes y Horas fuertes*), **cada uno encabezado por una frase explicativa humana en un recuadro crema** (*"💡 Esta semana vendiste 18% más que la semana pasada"*).

### 2. Qué construimos y probamos
- **Motor estadístico en zona horaria `America/Bogota` (`src/modules/analytics/statistics.ts`):**
  - `getBusinessStatistics` resuelve el rango civil en Bogotá y su periodo inmediatamente anterior (`resolveBogotaPeriod`) para calcular el cambio porcentual real (`salesChangePercent`).
  - Construye 6 frases explicativas humanas (`explanations`: `timelineExplanation`, `topProductsExplanation`, `categoriesExplanation`, `paymentMethodsExplanation`, `topCustomersExplanation`, `peakHoursExplanation`).
  - Agrega en memoria sobre los snapshots históricos (`sale_items` y `sales`) la serie diaria (`dailyTimeline`), el ranking de productos (`topProducts`), las categorías (`categoryBreakdown`), los métodos de pago (`paymentMethodBreakdown`), los mejores clientes (`topCustomers`) y las horas fuertes (`peakHours` por `bogota_hour`).
- **Tablero interactivo (`src/components/panel/statistics-dashboard.tsx` y `src/app/panel/estadisticas/page.tsx`) y API (`src/app/api/panel/statistics/route.ts`).**
- **Pruebas automáticas (`tests/unit/statistics.test.ts`):** Prueba completa verificando el escenario exacto *"Esta semana vendiste 18% más que la semana pasada"*, ganancias netas, ranking de productos, categorías, pagos, mejores clientes y hora fuerte en Bogotá (`30/30` pruebas totales en verde).

---

## Fase 10 — Resumen Diario en Lenguaje Humano (Sección I: I1 a I4) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Resumen Diario (`/panel`):** La primera pantalla que ve el emprendedor al abrir Marchante: si tiene pedidos pendientes de WhatsApp, arriba brilla un aviso con botón verde para confirmarlos en 1 toque. Debajo, una tarjeta principal estilo boleto con sello que le cuenta en palabras humanas cómo va su día en hora de Bogotá (*"¡Buen día, Doña Elena! Hoy la caja va dejando $ 78.000 libres..."*), botones para copiar/compartir su link en WhatsApp y 4 tarjetas grandes con cifras en `JetBrains Mono` (**1. Cuánto vendiste hoy · 2. Cuánto ganaste hoy · 3. Cuánto gastaste hoy · 4. Producto estrella hoy**), seguidas de las ventas recientes del día.

### 2. Qué construimos y probamos
- **Motor de resumen diario y narrativa humana (`src/modules/analytics/daily-summary.ts`):**
  - `getDailySummary(businessId)` consulta bajo RLS las ventas confirmadas, ítems vendidos, gastos, ingresos extra y pedidos pendientes del día actual en `America/Bogota`, además de las ventas del día anterior (`yesterdaySoldCop`) para comparar.
  - Identifica automáticamente el **Producto estrella de hoy** (`starProduct`, por unidades vendidas con desempate por ingresos en COP).
  - `buildHumanDailyNarrative` genera párrafos conversacionales claros adaptados al estado del día (día por estrenar, día con gastos iniciales o día con ventas activas).
- **Portada interactiva (`src/components/panel/daily-summary-view.tsx` y `src/app/panel/page.tsx`):** Muestra la narrativa, los 4 indicadores grandes, botón para compartir la vitrina directo en WhatsApp, alerta de pedidos pendientes y lista de ventas recientes del día.
- **Pruebas automáticas (`tests/unit/daily-summary.test.ts`):** Verificación de estado vacío humano, cálculo exacto de ventas, ganancias netas tras costos y gastos, identificación del producto estrella y frases narrativas (`29/29` pruebas totales en verde).

---

## Fase 9 — Estudio de Costos, Ganancia en Pesos, Margen (%) y Desglose por Insumos (Sección H: H1 a H4) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Estudio de Costos y Margen (`/panel/costos`):** Una mesa de costeo clara y directa: arriba un deslizador de *"Meta de margen deseado (%)"* y 4 indicadores de salud (*Margen promedio, Productos con buen margen, Sin costo anotado y En pérdida*). Abajo, cada producto tiene su fila tipo boleto con dos campos editables en vivo (**Costo unitario** y **Precio de venta** en COP), dos recuadros grandes que muestran al instante la **Ganancia en pesos (`$`)** y el **Margen en porcentaje (`%`)** con su etiqueta de salud, un botón para aplicar el **Precio sugerido** en 1 toque y el botón **"Insumos"** que abre la calculadora opcional de costo desglosado por ingredientes o empaques.

### 2. Qué construimos y probamos
- **Costo unitario, Ganancia en pesos y Margen porcentual (`H1`, `H2`):**
  - `listProductsWithCostingSummary` y `updateProductCosting` (`src/modules/catalog/costing.ts`) calculan para todo el catálogo `profitCop = priceCop - costCop` y `marginPercent = ((priceCop - costCop) / priceCop) * 100`, clasificando cada producto en *Buen margen (≥ 30%)*, *Margen ajustado (12–29.9%)*, *Margen muy bajito (< 12%)* o *Vendes a pérdida (< 0%)*.
- **Calculadora de costo desglosado por ingredientes o insumos (`H3`):**
  - Permite agregar las líneas de ingredientes/insumos/empaque de un producto (`costBreakdown: Array<{ id, name, costCop }>`) y calcular automáticamente el costo unitario como su suma exacta en pesos COP (`sumCostBreakdownCop`).
- **Simulador de precio sugerido (`H4`):**
  - Con `suggestCommercialPriceCop(costCop, targetMargin, 500)`, sugiere el precio de venta redondeado a múltiplos comerciales de `$500 COP` y permite aplicarlo con un toque.
- **Pruebas automáticas (`tests/unit/costing.test.ts`):** Verificación de suma de insumos, cálculo de ganancia en pesos y margen porcentual, resumen de salud del catálogo y precio sugerido (`28/28` pruebas totales en verde).

---

## Fase 8 — Gastos, Categorías e Ingresos (Sección G: G1 a G4) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Libro de Gastos e Ingresos (`/panel/movimientos`):** Diseñado para que el emprendedor entienda sus entradas y salidas de un vistazo sin lenguaje contable: arriba dos botones de acción rápida (**+ Ingreso extra** en verde bijao y **− Registrar gasto** en rojo achiote) y selector de periodo en hora de Bogotá (*Hoy · Esta semana · Este mes · Fechas*). Debajo, 4 tarjetas con números grandes (*Ingresos por ventas, Ingresos extra manuales, Gastos registrados y Balance neto*), un bloque de barras que muestra en qué categorías se fue la plata (*Materia prima, Empaques, Transporte...*) y el libro cronológico filtrable con opción de anular errores.

### 2. Qué construimos y probamos
- **Registro de gastos y categorías personalizables (`G1`, `G2`):**
  - `recordFinancialMovement` y `createExpenseCategory` (`src/modules/finance/service.ts`): valida montos enteros COP, congela el nombre de la categoría (`categoryNameSnapshot`), asigna `businessDate` en `America/Bogota` y permite crear nuevas categorías de gasto al vuelo desde el mismo modal.
- **Ingresos de ventas + ingresos extra manuales y libro unificado (`G3`, `G4`):**
  - `getFinanceLedger` combina en tiempo real los ingresos de ventas confirmadas (`sales`) con los gastos e ingresos extra (`financial_movements`), calcula el desglose porcentual por categoría de gasto y entrega tanto el balance neto de caja (`Entró − Salió`) como la ganancia libre después de costos y gastos.
  - `voidFinancialMovement` permite anular cualquier gasto o ingreso extra digitado por error.
- **Pruebas automáticas (`tests/unit/finance-movements.test.ts`):** Verificación de categorías iniciales, creación de categoría personalizada, cruce de ingresos por ventas + ingresos extra − gastos en hora Bogotá y anulación (`27/27` pruebas totales en verde).

---

## Fase 7 — Cuaderno de Clientes, Historial de Compras y Notas (Sección F: F1 a F4) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Cuaderno de Clientes (`/panel/clientes`):** Luce como el tarjetero de clientes consentidos de la tienda: arriba un buscador rápido por nombre, celular o nota, y un selector de orden (*Más han comprado · Más recientes · A–Z*). Cada cliente tiene una tarjeta tipo boleto con su nombre, teléfono, dirección, nota destacada en papel crema (ej. *"Pide sin hielo y paga por Nequi"*), **total gastado en pesos COP**, fecha de última compra y tres botones directos: **WhatsApp**, **Editar** e **Historial** (que despliega una hoja con todas las compras detalladas que ha hecho ese cliente).

### 2. Qué construimos y probamos
- **Base automática + manual (`F1`, `F2`):**
  - Se llena sola cuando el comprador hace un pedido en el catálogo público o cuando el vendedor anota un cliente en Venta Rápida, y además cuenta con modal de creación y edición manual (`createCustomer`, `updateCustomer` en `src/modules/customers/service.ts`).
- **Historial completo por cliente (`F3`) y búsqueda/ordenamiento (`F4`):**
  - `getCustomerDetailWithHistory` devuelve bajo `withTenantContext(businessId, ...)` la ficha del cliente, todas sus ventas confirmadas con las líneas de producto compradas (`sale_items`), total gastado (`totalSpentCop`), número de compras (`purchasesCount`) y fecha de última compra.
  - `listCustomers` filtra por nombre, teléfono, dirección o texto dentro de las notas, y ordena por mayor gasto, compra más reciente o alfabético.
- **Pruebas automáticas (`tests/unit/customers.test.ts`):** Verificación de creación manual, acumulación tras múltiples ventas, edición de notas, consulta de historial detallado y búsqueda por contenido de notas (`26/26` pruebas totales en verde).

---

## Fase 6 — Venta Rápida en 2 Toques y Confirmación de Pedidos en 1 Toque (Sección E: E1 a E7) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Terminal de Venta Rápida (`/panel/vender`):** La pantalla más veloz de Marchante: si hay pedidos pendientes que llegaron por WhatsApp desde el catálogo, aparecen arriba en una bandeja color ocre-panela con el botón verde **"✓ Confirmar venta"** de 1 solo toque. Debajo, a la izquierda va un teclado táctil de tarjetas grandes de producto (cada toque suma `+1`) y a la derecha el tiquete en vivo donde el vendedor puede editar el precio unitario en COP si hizo una rebaja, tocar el chip del método de pago (*Efectivo, Nequi, Daviplata...*), asociar un cliente opcional y pulsar **"¡Vendí esto!"** con sello visual, timbre de caja en Web Audio API y vibración háptica.

### 2. Qué construimos y probamos
- **Venta rápida relámpago con precio editable y snapshot inmutable (`E2`, `E3`):**
  - `recordQuickSale` (`src/modules/sales/service.ts`): Toma el `unitPriceCop` editable del tiquete y congela tanto el precio como el `costCop` actual del producto en `sale_items`, asignando `business_date` y `bogota_hour` en `America/Bogota`.
  - Si más adelante el producto sube o baja de precio o costo en el catálogo, las ventas y ganancias históricas quedan 100 % intactas.
- **Bandeja de pedidos pendientes y confirmación en 1 toque (`E4`, `E5`):**
  - `confirmPendingOrderOneTap` convierte cualquier pedido `PENDING` (`#M-101`) en una venta confirmada (`#V-101`), marca el pedido como `CONFIRMED` y actualiza el historial del cliente (`totalSpentCop`, `purchasesCount`, `lastPurchaseAt`).
- **Microinteracción de venta (`E6`) y anulación auditable (`E7`):**
  - `triggerSaleFeedback` reproduce un timbre corto de mostrador sintetizado con Web Audio API (activable/silenciable) + vibración `navigator.vibrate`.
  - `voidSale` anula una venta errónea con motivo sin borrar la fila y revierte el acumulado del cliente si estaba vinculado.
- **Pruebas automáticas (`tests/unit/sales-and-orders.test.ts`):** Verificación de venta rápida con precio editado, invariancia histórica del snapshot cuando cambia el producto después, confirmación de pedido en 1 toque y anulación de venta (`25/25` pruebas totales en verde).

---

## Fase 5 — Personalización del Catálogo Público con Vista Previa en Vivo (Sección D: D1 a D6) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Estudio de Personalización (`/panel/diseno`):** Un taller visual dividido en dos: a la izquierda (o pestaña *1. Editar estilo* en móvil), 5 tarjetas limpias para subir y recortar Logo y Portada, elegir entre 7 paletas colombianas curadas o color libre con medidor de contraste en vivo, 6 fondos/patrones artesanales (*Papel Kraft, Almendra, Trama de Canasto, Baldosín, Hoja de Bijao, Tinto Nocturno*), 4 voces tipográficas + 3 estilos de tarjeta y el orden de categorías; a la derecha (o pestaña *2. Vista previa en vivo* en móvil), un marco de celular interactivo que pinta la vitrina real `PublicStorefront` al instante mientras el dueño toca cada opción, con botones **Deshacer** y **Publicar diseño**.

### 2. Qué construimos y probamos
- **Módulo de personalización y contraste WCAG (`src/modules/business/customization.ts`):**
  - `getContrastRatioWithWhite`: Calcula la luminancia relativa WCAG de cualquier HEX contra `#FFFDF9` y bloquea colores con contraste `< 3.0:1` para que ningún vendedor deje sus botones de pedir ilegibles por accidente.
  - `updateCatalogCustomization`: Persiste logo, portada, color principal, fondo, tipografía, estilo de tarjetas y el orden de categorías en una sola transacción multi-tenant con RLS.
- **API protegida (`src/app/api/panel/customization/route.ts`):** `PUT /api/panel/customization`.
- **Estudio en vivo (`src/components/panel/catalog-customization-studio.tsx` y `src/app/panel/diseno/page.tsx`):** Reutiliza el componente real `PublicStorefront` (`isLivePreview={true}`) dentro de un marco de smartphone de `380×640px`, garantizando fidelidad 1:1 entre la vista previa y `/[slug]`.
- **Pruebas automáticas (`tests/unit/customization.test.ts`):** Verificación de contraste WCAG, actualización de todos los ejes visuales y reordenamiento de categorías reflejado en `getPublicCatalogBySlug` (`23/23` pruebas totales en verde).

---

## Fase 4 — Catálogo Público `/[slug]`, Carrito, Pedido Pendiente y WhatsApp (Sección C: C1 a C8) (2026-11-21)

### 1. Idea visual de las pantallas programadas en esta fase (3-5 líneas)
- **Catálogo Público (`/[slug]`):** Se siente como la vitrina propia de cada emprendedor y no como una plantilla genérica: arriba luce su portada y una tarjeta flotante con su logo, pastilla en vivo *"Abierto ahora / Cerrado"* (en hora de Bogotá), botón de horarios semanales, ubicación con enlace al mapa, métodos de pago y redes. Debajo, píldoras horizontales de categorías en el orden del vendedor y tarjetas de producto que, al tocarse, abren una hoja de detalle con foto grande, nota opcional y selector `- 1 +`; abajo flota siempre la barra del pedido en el color del negocio que abre el recibo final y envía a WhatsApp.

### 2. Qué construimos y probamos
- **Carga pública rápida y segura (`getPublicCatalogBySlug` en `src/modules/orders/service.ts`):** Server Component en `src/app/[slug]/page.tsx` que filtra productos ocultos y archivados, conserva los agotados con su insignia *"Agotado hoy"* (no agregables) y respeta el orden de categorías del vendedor.
- **Detalle de producto y carrito persistente (`C3`, `C4` en `src/components/catalog/public-storefront.tsx`):** Persistencia en `localStorage` aislada por `slug`, soporte de nota individual por producto y barra flotante inferior con conteo de unidades y subtotal en COP.
- **Checkout, guardado previo como `PENDIENTE` y mensaje de WhatsApp (`C5`, `C6`, `C7`):**
  - El comprador elige *Para recoger* o *A domicilio* (con dirección), método de pago (mostrando número de Nequi/Daviplata/cuenta y botón **Copiar** si aplica), nombre, celular y nota opcional.
  - **Antes de abrir WhatsApp**, `createPublicPendingOrder` recalcula todos los precios desde la base de datos (sin confiar en el navegador), congela `unit_price_cop` y `unit_cost_cop` en `order_items`, hace upsert del cliente en `customers` (`F1`), asigna código consecutivo (`#M-101`) y guarda el pedido en `orders` con `status = 'PENDING'`.
  - `buildWhatsAppOrderUrl` (`src/modules/orders/whatsapp-message.ts`) arma el recibo estructurado con hora Bogotá y abre `https://wa.me/<numero>?text=...`.
- **Protección contra spam y abuso (`C8`):**
  - Rate limiter por ventana deslizante (`src/modules/shared/rate-limiter.ts`, 15 pedidos / 5 min por IP + tienda).
  - Campo *honeypot* invisible (`websiteHoneypot`) validado con Zod.
  - Clave de idempotencia `clientOrderId` (`UNIQUE(business_id, client_order_id)`): si el comprador toca dos veces, devuelve el mismo pedido `#M-101` sin duplicarlo.
- **Pruebas automáticas (`tests/unit/public-catalog-orders.test.ts`):** 3 suites completas verificando filtrado de vitrina, creación de pedido pendiente + snapshot + auto-creación de cliente + formato WhatsApp + idempotencia + bloqueo de spam/honeypot/rate-limit (`21/21` pruebas totales en verde).

---

## Fase 3 — Categorías y Administrador de Catálogo (Sección B: B1 a B7) (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Administrador de Catálogo (`/panel/catalogo`):** Una mesa de trabajo ágil para celular: arriba, una tira horizontal de categorías como etiquetas de madera/papel con conteo de productos, flechas (`←` `→`) para reordenarlas al vuelo y lápiz de renombrado; en medio, buscador instantáneo y filtro de estados (*Todos · Disponibles · Agotados · Ocultos*); abajo, tarjetas tipo boleto donde cada producto tiene su miniatura WebP, su precio en COP, su ganancia en vivo y **dos botones táctiles de 1 toque** (*Disponible / Agotado hoy* y *Visible / Oculto*) sin tener que abrir ningún formulario.

### 2. Qué construimos y probamos
- **Gestión de categorías (`B1`):** Creación, renombrado, reordenamiento (`reorderCategories`) y archivado seguro que impide eliminar una categoría mientras tenga productos activos.
- **Gestión de productos (`B2`, `B4`, `B5`, `B6`, `B7`):**
  - Validación estricta con Zod (`src/modules/catalog/validators.ts`): precio y costo en enteros COP (`integer`), categoría obligatoria antes de publicar.
  - Interruptores rápidos de 1 toque (`PATCH /api/panel/products`) para marcar **Agotado por hoy** (`isSoldOut`) u **Ocultar de la vitrina** (`isHidden`) con actualización optimista en pantalla.
  - Protección histórica (`archiveProductSafely` en `src/modules/catalog/service.ts`): jamás borra físicamente un producto con ventas o pedidos (`archivedAt`), conservando intactas las estadísticas históricas.
  - Buscador por texto, filtro por categoría/estado y paginación real.
- **Recorte y optimización de imágenes a WebP (`B3`):**
  - En cliente: `ImageCropperUploader` (`src/components/panel/image-cropper-uploader.tsx`) con encuadre interactivo en `<canvas>` (zoom + desplazamiento horizontal/vertical).
  - En servidor: `optimizeAndSaveWebpImage` (`src/modules/catalog/image-optimizer.ts`) con **`sharp`**, validando límite de 5 MB y formato, rotando según EXIF y comprimiendo a **WebP** ligero (`720×720`, quality 82).
- **Pruebas automáticas (`tests/unit/catalog.test.ts`):** 4 suites nuevas probando categorías, validación entera COP, archivado seguro de productos con ventas y optimización WebP con `sharp` (`18/18` pruebas totales en verde).

---

## Fase 2 — Perfil del Negocio: Identidad, Mapa Movible, Horarios, Pagos y Redes (2026-11-21)

### 1. Idea visual de la pantalla programada en esta fase (3-5 líneas)
- **Perfil del Negocio (`/panel/perfil`):** En lugar de un formulario interminable que agota en el celular, diseñamos una tarjeta-cabecera tipo boleto con pastilla en vivo de *"Abierto ahora / Cerrado"* (calculada en `America/Bogota`) y botones para copiar o abrir el link `/[slug]`, seguida de un riel táctil de 4 pasos (*1. Datos y WhatsApp · 2. Dirección y Mapa · 3. Horarios · 4. Pagos y Redes*) y un botón fijo inferior en Rojo Achiote para guardar desde cualquier pestaña.

### 2. Qué construimos y probamos
- **Lógica de dominio pura (`src/modules/business/*`):**
  - `schedule.ts`: Evaluación determinista de horario semanal en hora de Colombia (`evaluateBusinessOpenStatus`), soportando días cerrados y turnos que cruzan la medianoche.
  - `validators.ts`: Esquemas Zod para perfil completo, normalización automática de WhatsApp colombiano (`315 890 1234` → `573158901234`), limpieza de usuarios/URLs de redes sociales (`@usuario` o `https://...`) y validación de al menos un método de pago activo.
  - `service.ts`: Lectura y actualización del perfil bajo `withTenantContext(businessId, ...)` con verificación previa de colisión de `slug` y bloqueo de rutas reservadas.
- **API y sincronización de sesión (`src/app/api/panel/business/route.ts`):** `GET` y `PUT` protegidos por sesión; si el dueño cambia el nombre del negocio o el `slug`, la cookie `httpOnly` se actualiza al instante.
- **Mapa interactivo con marcador movible (`src/components/panel/movable-location-map.tsx`):** MapLibre GL con cartografía libre OpenStreetMap, pin rojo arrastrable, clic directo en el mapa, geolocalización GPS del navegador, presets de ciudades de Colombia y botones de ajuste fino Norte/Sur/Este/Oeste para cumplir WCAG 2.2 SC 2.5.7 (alternativa a gestos de arrastre).
- **Pruebas automáticas (`tests/unit/business-profile.test.ts`):** 4 suites nuevas verificando normalización de WhatsApp/redes, apertura/cierre en `America/Bogota`, persistencia completa bajo RLS y protección de `slug` único/reservado (`14/14` pruebas totales en verde).

---

## Fase 1 — Cimientos: Proyecto, Base de Datos con RLS, Auth y Sistema de Diseño (2026-11-21)

### 1. Idea visual de las pantallas de esta fase (3-5 líneas)
- **Portada, Login y Registro (`/`, `/login`, `/registro`):** Fondo cálido de papel kraft punteado (`#FAF6EE`) coronado por una cinta de toldo de tienda de barrio en Rojo Achiote (`#C83E2B`), tarjetas tipo boleto con borde de tinta (`#1C1714`) y sombra de sello, vista previa en vivo del enlace `marchante.co/tu-negocio` al escribir y botón de demostración en 1 toque (*"Horno & Canela"* de Doña Elena).
- **Layout base del Panel (`/panel`):** Diseñado móvil-primero (390 px) con cabecera compacta que muestra la fecha en `America/Bogota` y botón directo a la vitrina pública (`/[slug]`), menú lateral "El Mostrador" en escritorio y barra fija inferior para el pulgar con el botón central elevado **+ Vender** en Rojo Achiote.

### 2. Qué construimos y probamos
- Configuración completa del proyecto Next.js 15 (App Router) + TypeScript estricto + Tailwind CSS 4 + Drizzle ORM + Vitest + Playwright (`package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`).
- Base de datos PostgreSQL dual (`src/db/index.ts`): corre localmente sin configuración externa usando PostgreSQL embebido real (`@electric-sql/pglite` en `.data/marchante-pg`) y se conecta automáticamente a Supabase / Railway / Docker Postgres cuando `DATABASE_URL` empieza por `postgresql://`.
- Migración SQL versionada (`drizzle/0001_initial_schema_and_rls.sql`) con las 11 tablas del dominio, restricciones `CHECK` para montos enteros COP y **Row Level Security (`ENABLE` + `FORCE ROW LEVEL SECURITY`)** con el rol `marchante_tenant` y la variable de sesión transaccional `app.current_business_id`.
- Autenticación completa con `scrypt` + cookie `httpOnly` firmada con `jose` (`HS256`), registro con creación automática de negocio, categorías de gasto predeterminadas y cuenta demo de 1 toque.
- 10 pruebas automáticas en Vitest (`tests/unit/foundation.test.ts` y `tests/unit/rls-multitenant.test.ts`) pasando al 100%, incluyendo la prueba de fuego de aislamiento RLS en PostgreSQL entre dos vendedores.

---

## Fase 0 — Reconocimiento y Diseño del Producto (2026-11-21)

### 1. Qué hicimos
- Inspección **100% solo lectura** de `ñami` (`/Users/usuario/Desktop/NAMI/nami`) y su mini-CRM (`/Users/usuario/Desktop/CRM_NAMI/nami-crm-web`). No se modificó, instaló ni ejecutó nada en `ñami`.
- Análisis completo de `Docs/guia/PRODUCTO.md`, `Docs/guia/MAPA_DASHBOARD.md`, `Docs/auditorias/AUDITORIA_SISTEMA_2026-10-24.md`, `Docs/diseno/DISENO_CARTA.md`, `Docs/diseno/UI_PANEL.md`, `backend/prisma/schema.prisma` (4.962 líneas, 99 modelos) y `packages/core/src/*` (`order-format.ts`, `bogota-time.ts`, `cash-labels.ts`).
- Definición de identidad propia (**Marchante**), arquitectura limpia modular, modelo de datos con dinero en enteros (`COP`) y aislamiento multi-tenant en base de datos, y creación de `FEATURES.md` con todos los requisitos desglosados de `A` a `J` (más `T` de cimientos y `K` de calidad).

### 2. Decisiones tomadas y justificadas
1. **Nombre e identidad elegida:** **Marchante** (entre las 3 opciones propuestas: *Marchante*, *La Vitrina*, *AlDía*). Representa la cercanía de la tienda y plaza colombiana sin sonar corporativo ni copiar nada de ñami.
2. **Dinero 100% en enteros (`integer` / `bigint` en COP):** A diferencia de `ñami`, que mezcla `Decimal(10,2)`, `Decimal(12,2)`, `Decimal(14,2)` e `Int` y requiere conversiones continuas, en **Marchante** todo valor monetario (`price_cop`, `cost_cop`, `total_cop`, `amount_cop`) se almacena como entero en pesos colombianos sin decimales.
3. **ORM — Drizzle ORM sobre PostgreSQL (compatible con Supabase):** Elegimos **Drizzle ORM** en lugar de Prisma porque en la propia auditoría de `ñami` quedó documentado que Prisma superó el límite de profundidad de tipos de TypeScript (`Excessive stack depth` en `schema.prisma` al pasar de ~80 modelos), obligándolos a romper llaves foráneas en el ORM. Drizzle genera SQL transparente, tipos livianos instantáneos, migraciones SQL versionadas limpias y permite declarar políticas **Row Level Security (RLS)** directamente en el esquema.
4. **Arquitectura Next.js Full-Stack Modular (sin servidor Express duplicado):** `ñami` separa un backend Express en el puerto 8001 y un frontend Next.js en el 4000, lo que duplica validaciones y despliegue. En **Marchante** usamos un monolito modular en **Next.js (App Router) + TypeScript**, manteniendo una separación estricta por capas (`src/modules/<modulo>/{domain,application,infrastructure,validators}`) para que los componentes de UI jamás contengan lógica de negocio ni consultas a base de datos.
5. **Base de datos local y producción (Supabase / PostgreSQL):** Soportaremos conexión PostgreSQL estándar (Supabase en la nube o Postgres local vía variable `DATABASE_URL`) con Row Level Security (RLS) real por `business_id` + verificación en la capa de aplicación, e imágenes procesadas con `sharp` a WebP (en Supabase Storage con fallback local en `public/uploads` para desarrollo sin fricción).
6. **Sin sobre-ingeniería gastronómica:** Descartamos de raíz lo que vuelve pesado a `ñami` para un pequeño emprendedor (planos 2D de mesas, comandas de cocina por estación, agentes Go/Android de impresión térmica ESC/POS, facturación DIAN vía Factus, turnos Z con arqueo ciego, conciliación de extractos bancarios y configuradores de mitades de pizza). Nos concentramos en que vender, llevar gastos, ver márgenes y recibir pedidos por WhatsApp tome segundos desde el celular.

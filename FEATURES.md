# FEATURES.md — Matriz Maestra de Requisitos (Marchante)

> **Regla:** Ninguna función se deja "para después" sin estar registrada aquí.
> **Estados válidos:** `pendiente` · `en curso` · `hecho` · `verificado`

---

## F1. Cimientos, Seguridad, Multi-tenant y Arquitectura Base (Fase 1)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **T1** | Proyecto Next.js (App Router) + TypeScript estricto + Tailwind CSS + variables de diseño ("Tierra, Tinta y Achiote") | `verificado` | `package.json`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/marchante-logo.tsx` |
| **T2** | Esquema PostgreSQL + Drizzle ORM con migraciones versionadas y dinero siempre en enteros (`integer` / `bigint` en pesos COP, nunca flotantes) | `verificado` | `src/db/schema.ts`, `drizzle/0001_initial_schema_and_rls.sql`, `src/db/migrate.ts` |
| **T3** | Autenticación de vendedores (registro, login, logout, sesión segura) + onboarding automático de negocio | `verificado` | `src/modules/auth/*`, `src/app/api/auth/*`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/registro/page.tsx` |
| **T4** | Multi-tenant seguro: aislamiento por `business_id` a nivel de base de datos (políticas RLS en Postgres + helper de alcance obligatorio en servidor) | `verificado` | `drizzle/0001_initial_schema_and_rls.sql`, `src/db/index.ts` (`withTenantContext`), `tests/unit/rls-multitenant.test.ts` |
| **T5** | Utilidades de moneda COP (`$ 18.500`, entrada formateada en vivo, validación entera) y zona horaria `America/Bogota` (UTC-5 fijo) para "hoy", "esta semana" y "este mes" | `verificado` | `src/modules/shared/currency.ts`, `src/modules/shared/bogota-time.ts`, `tests/unit/foundation.test.ts` |
| **T6** | Validador de `slug` único y bloqueo de rutas reservadas (`panel`, `api`, `login`, `registro`, `ajustes`, `admin`, `catalogo`, `estaticos`, etc.) | `verificado` | `src/modules/shared/slug.ts`, `tests/unit/foundation.test.ts` |
| **T7** | PWA instalable (`manifest.webmanifest`, íconos, metadatos móviles) y layout móvil-primero con barra inferior y botón de Venta Rápida al alcance del pulgar | `verificado` | `public/manifest.webmanifest`, `public/icon.svg`, `src/components/panel/panel-shell.tsx`, `src/app/panel/layout.tsx` |

---

## A. Perfil del Negocio (Fase 2)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **A1** | Nombre del negocio, nombre del dueño, slug público (`/nombre-del-negocio`) con validación en vivo y descripción corta con carácter | `verificado` | `src/modules/business/service.ts`, `src/modules/business/validators.ts`, `src/components/panel/business-profile-form.tsx`, `src/app/panel/perfil/page.tsx` |
| **A2** | Categoría principal de lo que vende el negocio (comida casera, repostería, ropa/moda, artesanías, belleza, mascotas, tecnología, mercado/fruver, otros) | `verificado` | `src/modules/business/validators.ts` (`BUSINESS_CATEGORY_OPTIONS`), `src/components/panel/business-profile-form.tsx` |
| **A3** | Ubicación con dirección escrita, barrio/ciudad y mapa interactivo (MapLibre / OpenStreetMap) con marcador movible (drag & drop) que guarda latitud y longitud | `verificado` | `src/components/panel/movable-location-map.tsx`, `src/modules/business/service.ts`, `tests/unit/business-profile.test.ts` |
| **A4** | Horarios de apertura y cierre por cada día de la semana (lunes a domingo), soporte de días cerrados y cálculo en tiempo real de "Abierto ahora / Cerrado" en hora Bogotá | `verificado` | `src/modules/business/schedule.ts` (`evaluateBusinessOpenStatus`), `src/components/panel/business-profile-form.tsx`, `tests/unit/business-profile.test.ts` |
| **A5** | Métodos de pago configurables (Efectivo, Nequi, Daviplata, Transferencia bancaria, Llave Bre-B, Tarjeta/Datáfono) con datos opcionales (número de cuenta/celular, titular, instrucciones) | `verificado` | `src/modules/business/validators.ts`, `src/components/panel/business-profile-form.tsx`, `tests/unit/business-profile.test.ts` |
| **A6** | Redes sociales (Instagram, TikTok, Facebook, sitio web externo) normalizando usuario o URL | `verificado` | `src/modules/business/validators.ts` (`normalizeSocialHandleOrUrl`), `src/components/panel/business-profile-form.tsx`, `tests/unit/business-profile.test.ts` |
| **A7** | Número de WhatsApp principal registrado (con prefijo `+57` por defecto, validación de formato celular y prueba de enlace `wa.me`) | `verificado` | `src/modules/business/validators.ts` (`normalizeWhatsappPhone`), `src/components/panel/business-profile-form.tsx`, `tests/unit/business-profile.test.ts` |

---

## B. Administrador de Catálogo y Categorías (Fase 3)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **B1** | Gestión de categorías: crear, renombrar, ordenar (subir/bajar o arrastrar) y archivar/eliminar solo si no deja productos huérfanos | `verificado` | `src/modules/catalog/service.ts`, `src/app/api/panel/categories/route.ts`, `src/components/panel/catalog-manager.tsx`, `tests/unit/catalog.test.ts` |
| **B2** | Crear y editar productos con nombre, precio en COP entero, descripción, categoría obligatoria antes de publicar y orden dentro de la categoría | `verificado` | `src/modules/catalog/service.ts`, `src/modules/catalog/validators.ts`, `src/app/api/panel/products/route.ts`, `src/components/panel/catalog-manager.tsx` |
| **B3** | Subida de imagen de producto con recorte interactivo (encuadre 1:1 o 4:3), conversión y optimización automática a WebP y límite de tamaño (máx. 5 MB entrada, salida optimizada < 250 KB) | `verificado` | `src/modules/catalog/image-optimizer.ts` (`sharp`), `src/components/panel/image-cropper-uploader.tsx`, `src/app/api/panel/upload-image/route.ts`, `tests/unit/catalog.test.ts` |
| **B4** | Estado "Visible / Oculto" para esconder un producto del catálogo público sin borrarlo | `verificado` | `src/modules/catalog/service.ts` (`toggleProductStatus`), `src/components/panel/catalog-manager.tsx`, `tests/unit/catalog.test.ts` |
| **B5** | Estado "Disponible / Agotado por hoy" con interruptor rápido de un toque desde la lista de productos | `verificado` | `src/modules/catalog/service.ts` (`toggleProductStatus`), `src/components/panel/catalog-manager.tsx`, `tests/unit/catalog.test.ts` |
| **B6** | Protección histórica: los productos con ventas o pedidos asociados nunca se borran físicamente (`archived_at`), preservando estadísticas e historial | `verificado` | `src/modules/catalog/service.ts` (`archiveProductSafely`), `tests/unit/catalog.test.ts` |
| **B7** | Buscador rápido y filtro por categoría/estado en el administrador de catálogo, con paginación para catálogos grandes | `verificado` | `src/modules/catalog/service.ts` (`listProducts`), `src/components/panel/catalog-manager.tsx`, `tests/unit/catalog.test.ts` |

---

## C. Catálogo Público con Link Propio y Pedidos por WhatsApp (Fase 4)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **C1** | Ruta pública `/[slug]` optimizada para móvil (3G/4G), mostrando cabecera del negocio, estado abierto/cerrado, horario, ubicación con mapa/cómo llegar, redes y métodos de pago aceptados | `verificado` | `src/app/[slug]/page.tsx`, `src/components/catalog/public-storefront.tsx`, `src/modules/orders/service.ts` (`getPublicCatalogBySlug`) |
| **C2** | Navegación de productos agrupados por categoría (según el orden del vendedor), buscador rápido y distinción clara de productos "Agotados" (no agregables) y exclusión de "Ocultos" | `verificado` | `src/modules/orders/service.ts`, `src/components/catalog/public-storefront.tsx`, `tests/unit/public-catalog-orders.test.ts` |
| **C3** | Modal/hoja de detalle de producto con imagen optimizada, descripción completa, precio en COP, selector de cantidad y nota opcional por producto | `verificado` | `src/components/catalog/public-storefront.tsx` |
| **C4** | Carrito persistente en el navegador del cliente: agregar, cambiar cantidades, quitar ítems, ver subtotal y barra flotante inferior con total en vivo | `verificado` | `src/components/catalog/public-storefront.tsx` (`localStorage` por `slug`) |
| **C5** | Formulario de cierre de pedido: nombre del cliente (obligatorio), teléfono/WhatsApp del cliente, modalidad (Recoger o Domicilio con dirección), método de pago elegido (mostrando datos Nequi/Daviplata si aplica) y nota general opcional | `verificado` | `src/components/catalog/public-storefront.tsx`, `src/modules/orders/validators.ts` |
| **C6** | Guardado previo en base de datos como pedido `PENDIENTE` (con código corto tipo `#M-101`, snapshot de precios/costos del momento y clave de idempotencia `client_order_id`) **antes** de abrir WhatsApp | `verificado` | `src/modules/orders/service.ts` (`createPublicPendingOrder`), `src/app/api/public/orders/route.ts`, `tests/unit/public-catalog-orders.test.ts` |
| **C7** | Generación del mensaje de WhatsApp bien estructurado (código de pedido, productos, cantidades, precios unitarios y por línea, total, cliente, método de pago, entrega y nota) y apertura hacia el número del vendedor | `verificado` | `src/modules/orders/whatsapp-message.ts` (`buildWhatsAppOrderMessage`, `buildWhatsAppOrderUrl`), `tests/unit/public-catalog-orders.test.ts` |
| **C8** | Protección contra spam y abuso en el catálogo público: rate limiting por IP/teléfono, campo honeypot invisible, validación Zod en servidor e idempotencia ante doble clic | `verificado` | `src/modules/shared/rate-limiter.ts`, `src/modules/orders/validators.ts`, `src/app/api/public/orders/route.ts`, `tests/unit/public-catalog-orders.test.ts` |

---

## D. Personalización del Catálogo Público (Fase 5)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **D1** | Subida, recorte y optimización WebP de Logo y Portada del negocio | `verificado` | `src/components/panel/catalog-customization-studio.tsx`, `src/components/panel/image-cropper-uploader.tsx`, `src/modules/catalog/image-optimizer.ts` |
| **D2** | Selector de color principal de marca (paletas curadas con buen contraste AA + color personalizado con verificación automática de legibilidad) | `verificado` | `src/modules/business/customization.ts` (`CURATED_BRAND_PALETTES`, `getContrastRatioWithWhite`), `src/components/panel/catalog-customization-studio.tsx`, `tests/unit/customization.test.ts` |
| **D3** | Selector de fondo o patrón de la vitrina (Papel Kraft, Crema Liso, Tinto Nocturno, Trama de Canasto, Baldosín Hidráulico, Hoja de Plátano sutil) | `verificado` | `src/modules/business/customization.ts` (`BACKGROUND_PRESET_OPTIONS`), `src/components/catalog/public-storefront.tsx` (`resolveBackgroundStyle`) |
| **D4** | Selector de estilo tipográfico del catálogo entre 4 opciones con carácter (Artesanal Serif, Mercado Moderno, Cartel Popular, Editorial Limpio) y estilo de tarjetas (Boleto, Mostrador, Compacta) | `verificado` | `src/modules/business/customization.ts` (`FONT_PRESET_OPTIONS`, `CARD_STYLE_OPTIONS`), `src/components/catalog/public-storefront.tsx` (`resolveHeadingFontClass`) |
| **D5** | Reordenamiento directo de categorías desde el estudio de personalización | `verificado` | `src/components/panel/catalog-customization-studio.tsx`, `src/modules/business/customization.ts` (`updateCatalogCustomization`), `tests/unit/customization.test.ts` |
| **D6** | Vista previa interactiva en vivo (marco de celular en tiempo real) mientras el emprendedor edita, con botón "Publicar cambios" y "Deshacer" | `verificado` | `src/components/panel/catalog-customization-studio.tsx` (renderiza `PublicStorefront` con `isLivePreview`), `src/app/panel/diseno/page.tsx` |

---

## E. Venta Rápida y Confirmación de Pedidos (Fase 6)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **E1** | Botón de "Venta rápida" siempre fijo al alcance del pulgar en todo el panel móvil | `verificado` | `src/components/panel/panel-shell.tsx` (botón central elevado `+ Vender` en la barra móvil y destacado en menú lateral) |
| **E2** | Flujo relámpago de Venta Rápida en 2-3 toques: tocar producto(s) (con los más vendidos primero), ajustar cantidad, precio editable al vuelo, elegir método de pago (chips grandes: Efectivo, Nequi, Daviplata, etc.) y cliente opcional | `verificado` | `src/components/panel/quick-sale-terminal.tsx`, `src/modules/sales/service.ts` (`recordQuickSale`), `src/app/panel/vender/page.tsx` |
| **E3** | Snapshot inmutable en cada venta: guarda `unit_price_cop` y `unit_cost_cop` vigentes al instante de la venta para que cambios futuros de precio o costo jamás alteren la historia | `verificado` | `src/modules/sales/service.ts`, `src/db/schema.ts` (`sale_items`), `tests/unit/sales-and-orders.test.ts` |
| **E4** | Bandeja de pedidos `PENDIENTES` recibidos desde el catálogo público con indicador en vivo | `verificado` | `src/components/panel/quick-sale-terminal.tsx`, `src/modules/sales/service.ts` (`getQuickSaleWorkspaceData`) |
| **E5** | Confirmar pedido pendiente con **un solo toque** (convirtiéndolo en venta confirmada, registrando el ingreso y actualizando al cliente) o rechazar/cancelar con motivo opcional | `verificado` | `src/modules/sales/service.ts` (`confirmPendingOrderOneTap`, `cancelPendingOrder`), `src/app/api/panel/orders/route.ts`, `tests/unit/sales-and-orders.test.ts` |
| **E6** | Microinteracción satisfactoria al registrar o confirmar venta (animación de tiquete sellado + sonido de caja/moneda o vibración háptica opcional activable por el usuario) | `verificado` | `src/components/panel/quick-sale-terminal.tsx` (`triggerSaleFeedback` con Web Audio API + `navigator.vibrate`) |
| **E7** | Anulación segura de una venta errónea con motivo (sin borrar el rastro auditable, restándola de los totales del día) | `verificado` | `src/modules/sales/service.ts` (`voidSale`), `src/app/api/panel/sales/route.ts`, `tests/unit/sales-and-orders.test.ts` |

---

## F. Clientes (Fase 7)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **F1** | Auto-creación o actualización de cliente (`upsert` por teléfono normalizado dentro del negocio) cuando alguien pide por el catálogo público o se asocia en una venta rápida | `verificado` | `src/modules/orders/service.ts` (`createPublicPendingOrder`), `src/modules/sales/service.ts` (`recordQuickSale`, `confirmPendingOrderOneTap`) |
| **F2** | Creación y edición manual de clientes (nombre, WhatsApp/teléfono, dirección habitual, notas personales como "le gusta sin cilantro" o "paga por Nequi") | `verificado` | `src/modules/customers/service.ts` (`createCustomer`, `updateCustomer`), `src/app/api/panel/customers/route.ts`, `src/components/panel/customers-manager.tsx` |
| **F3** | Ficha e historial por cliente: lista de todas sus compras, total gastado histórico (`total_spent_cop`), cantidad de compras, fecha de última compra y botón directo para escribirle por WhatsApp | `verificado` | `src/modules/customers/service.ts` (`getCustomerDetailWithHistory`), `src/components/panel/customers-manager.tsx`, `src/app/panel/clientes/page.tsx`, `tests/unit/customers.test.ts` |
| **F4** | Buscador y ordenamiento de clientes (por total gastado, más recientes, alfabético) | `verificado` | `src/modules/customers/service.ts` (`listCustomers`), `src/components/panel/customers-manager.tsx`, `tests/unit/customers.test.ts` |

---

## G. Gastos e Ingresos (Fase 8)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **G1** | Registro rápido de gastos con monto en COP entero, fecha/hora (por defecto ahora en Bogotá), método de pago, nota y categoría (Materia prima / insumos, Empaques, Transporte / domicilios, Arriendo / servicios, Publicidad / redes, Herramientas, Otros) | `verificado` | `src/modules/finance/service.ts` (`recordFinancialMovement`), `src/components/panel/finance-movements-manager.tsx`, `src/app/panel/movimientos/page.tsx` |
| **G2** | Gestión de categorías de gasto (las predeterminadas + posibilidad de crear categorías propias del negocio) | `verificado` | `src/modules/finance/service.ts` (`listExpenseCategories`, `createExpenseCategory`), `src/modules/auth/defaults.ts` |
| **G3** | Ingresos automáticos provenientes de las ventas confirmadas + registro opcional de "Ingresos extra manuales" (ej. venta de un equipo usado, encargo especial fuera de catálogo, aporte) | `verificado` | `src/modules/finance/service.ts` (`getFinanceLedger`, `recordFinancialMovement` con `kind: 'EXTRA_INCOME'`), `tests/unit/finance-movements.test.ts` |
| **G4** | Libro de movimientos (entradas vs. salidas) filtrable por tipo y fecha, con opción de anular/eliminar un gasto o ingreso manual mal digitado | `verificado` | `src/modules/finance/service.ts` (`getFinanceLedger`, `voidFinancialMovement`), `src/app/api/panel/finance/route.ts`, `tests/unit/finance-movements.test.ts` |

---

## H. Costos y Margen (Fase 9)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **H1** | Registro de costo unitario (`cost_cop`) por producto desde el catálogo o desde una vista dedicada de "Costos y márgenes" | `verificado` | `src/modules/catalog/costing.ts` (`updateProductCosting`), `src/components/panel/costing-studio.tsx`, `src/app/panel/costos/page.tsx` |
| **H2** | Cálculo y visualización clara por producto: Precio de venta, Costo unitario, **Ganancia en pesos** (`precio - costo`) y **Margen en porcentaje** (`((precio - costo) / precio) * 100`), con semáforo visual (saludable / apretado / en pérdida) | `verificado` | `src/modules/shared/currency.ts` (`calculateProductMargin`), `src/modules/catalog/costing.ts` (`listProductsWithCostingSummary`), `src/components/panel/costing-studio.tsx` |
| **H3** | Calculadora opcional de costo desglosado por ingredientes o insumos para cada producto (lista de insumos + costo por porción = costo unitario calculado automáticamente) | `verificado` | `src/modules/catalog/costing.ts` (`sumCostBreakdownCop`), `src/components/panel/costing-studio.tsx`, `tests/unit/costing.test.ts` |
| **H4** | Simulador de precio sugerido: dado el costo y un margen deseado (ej. "quiero ganarle el 40%"), sugiere el precio de venta redondeado a pesos colombianos comerciales (múltiplos de $100 o $500) | `verificado` | `src/modules/shared/currency.ts` (`suggestCommercialPriceCop`), `src/components/panel/costing-studio.tsx`, `tests/unit/costing.test.ts` |

---

## I. Resumen Diario (Fase 10)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **I1** | Primera pantalla del panel ("Hoy en tu negocio") definida estrictamente por la fecha actual en `America/Bogota` | `verificado` | `src/app/panel/page.tsx`, `src/modules/analytics/daily-summary.ts` (`getDailySummary`) |
| **I2** | Tarjeta principal con narrativa en lenguaje claro y humano (ej. *"Hoy has vendido $ 145.000 en 8 ventas. Descontando costos y $ 25.000 en gastos, te quedan $ 78.000 libres."*), no solo números fríos | `verificado` | `src/modules/analytics/daily-summary.ts` (`buildHumanDailyNarrative`), `src/components/panel/daily-summary-view.tsx`, `tests/unit/daily-summary.test.ts` |
| **I3** | Cuatro indicadores grandes y legibles: **Cuánto vendió** (ingresos por ventas), **Cuánto ganó** (ganancia bruta de productos vendidos y ganancia neta tras gastos del día), **Cuánto gastó** (gastos del día) y **Producto estrella del día** (el más vendido hoy en unidades/pesos) | `verificado` | `src/modules/analytics/daily-summary.ts`, `src/components/panel/daily-summary-view.tsx`, `tests/unit/daily-summary.test.ts` |
| **I4** | Accesos directos de acción inmediata en la portada: confirmar pedidos pendientes (si los hay), botón gigante de Venta Rápida, registrar gasto rápido y compartir link del catálogo por WhatsApp | `verificado` | `src/components/panel/daily-summary-view.tsx` |

---

## J. Estadísticas y Gráficas (Fase 11)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **J1** | Selector de periodo con zona horaria `America/Bogota`: **Hoy**, **Esta semana**, **Este mes** y **Rango personalizado** (con calendario propio accesible) | `verificado` | `src/modules/shared/bogota-time.ts` (`resolveBogotaPeriod`), `src/modules/analytics/statistics.ts` (`getBusinessStatistics`), `src/components/panel/statistics-dashboard.tsx` |
| **J2** | Frase explicativa humana arriba de cada gráfica comparando contra el periodo equivalente anterior (ej. *"Esta semana vendiste 18% más que la semana pasada"* o *"Tu día más movido fue el sábado con $ 210.000"*) | `verificado` | `src/modules/analytics/statistics.ts` (`explanations`), `src/components/panel/statistics-dashboard.tsx`, `tests/unit/statistics.test.ts` |
| **J3** | Gráfica y serie de **Ventas, Ganancias y Gastos** a lo largo del periodo elegido | `verificado` | `src/modules/analytics/statistics.ts` (`dailyTimeline`), `src/components/panel/statistics-dashboard.tsx` (Recharts `BarChart`) |
| **J4** | Ranking de **Productos más vendidos** (en unidades, ingresos y ganancia que dejó cada uno) y **Ventas por categoría** | `verificado` | `src/modules/analytics/statistics.ts` (`topProducts`, `categoryBreakdown`), `src/components/panel/statistics-dashboard.tsx`, `tests/unit/statistics.test.ts` |
| **J5** | Distribución por **Métodos de pago** (cuánto entró por Efectivo, Nequi, Daviplata, Transferencia, etc.) | `verificado` | `src/modules/analytics/statistics.ts` (`paymentMethodBreakdown`), `src/components/panel/statistics-dashboard.tsx`, `tests/unit/statistics.test.ts` |
| **J6** | Ranking de **Mejores clientes** del periodo y gráfica de **Horas fuertes** (en qué franjas del día se vende más en hora Colombia) | `verificado` | `src/modules/analytics/statistics.ts` (`topCustomers`, `peakHours`), `src/components/panel/statistics-dashboard.tsx`, `tests/unit/statistics.test.ts` |

---

## K. Calidad, Auditoría, Accesibilidad y Cierre (Fases 12, 13 y 14)

| Código | Requisito | Estado | Dónde está implementado |
|---|---|---|---|
| **K1** | Revisión de completitud 1 a 1 contra `FEATURES.md` y paridad mejorada respecto a las funciones útiles de ñami (Fase 12) | `verificado` | `tests/unit/completeness-phase12.test.ts`, `PROGRESS.md` (Fase 12) |
| **K2** | Auditoría de seguridad, multi-tenant, validaciones, tiempos de carga, accesibilidad WCAG 2.2 AA (contraste, 44×44 px táctiles, teclado) y cero secretos expuestos (Fase 13) | `verificado` | `next.config.ts`, `src/modules/business/validators.ts`, `src/modules/catalog/image-optimizer.ts`, `src/app/api/auth/{login,register}/route.ts`, `tests/unit/security-and-logic-audit.test.ts` |
| **K3** | Suite de pruebas unitarias/integración (Vitest) para cálculos de dinero, márgenes, fechas `America/Bogota`, mensaje de WhatsApp y aislamiento entre vendedores (Fase 13) | `verificado` | `tests/unit/*.test.ts` (14 archivos de prueba, 35 tests pasando al 100%) |
| **K4** | Suite de pruebas End-to-End (Playwright) del flujo completo: crear producto → pedido en catálogo público → confirmar venta en panel → verificar en resumen y estadísticas (Fase 13) | `verificado` | `playwright.config.ts`, `tests/e2e/main-flow.spec.ts` |
| **K5** | Documentación (`README.md`, `.env.example`, guía de despliegue), seed realista de negocio colombiano para demo y lista de mejoras futuras (Fase 14) | `verificado` | `README.md`, `.env.example`, `src/db/seed.ts`, `src/modules/auth/service.ts` (`ensureDemoSellerAccount`) |

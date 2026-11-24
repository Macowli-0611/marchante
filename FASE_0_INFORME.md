# FASE 0 — Informe de Reconocimiento de `ñami` y Diseño de **Marchante**

> **Estado:** Completado · **Fecha:** 2026-11-21
> **Regla de solo lectura cumplida:** `ñami` (`/Users/usuario/Desktop/NAMI/nami` y `/Users/usuario/Desktop/CRM_NAMI/nami-crm-web`) fue inspeccionado **únicamente en modo lectura**. No se modificó ningún archivo, no se instalaron dependencias, no se corrieron migraciones ni se hicieron commits en él.

---

## 1. Reconocimiento de `ñami` (Solo Lectura)

### 1.1 Inventario de secciones y funciones encontradas en `ñami`
`ñami` es un monorepo (`pnpm`) con `backend` (Express 5 + Prisma + PostgreSQL), `frontend` (Next.js 15 App Router, 1.477 archivos), `landing` (Astro), `packages/core` (lógica compartida) y agentes de impresión (`print-agent` en Go y `print-agent-android`). Está enfocado en **restaurantes gastronómicos de Yumbo (Valle)** y se divide en tres bloques:

1. **Panel del restaurante (`/dashboard`, gobernado por 5 niveles de plan: `GRATIS`, `PRESENCIA`, `PLUS`, `PRO`, `CUSTOM`):**
   - **Inicio:** Resumen de visitas al menú, clics a WhatsApp, estado de apertura y visibilidad en el directorio.
   - **Operación (`Vender · Órdenes · Mesas`):** Terminal POS para tomar pedidos, bandeja de órdenes (*Pendientes, Salón, Domicilio, Para llevar, Encargos*) y plano 2D de mesas por zonas.
   - **Caja (`Caja · Impresión`):** Turnos de caja (`CashSession`) con apertura, arqueo en vivo, cierre Z a ciegas, registro de día pasado (`dia-pasado`) y ruteo de impresión térmica ESC/POS por estaciones (caja, cocina, bar).
   - **Domiciliarios (`Despacho del día · Liquidación`):** Control de entregas y liquidación de pagos a domiciliarios propios.
   - **Finanzas (`Cuentas · Movimientos · Proveedores · Flujo de caja · Conciliación`):** Cajas y cuentas bancarias, traslados, libro general de entradas/salidas, cuentas por pagar a proveedores y conciliación contra extractos bancarios importados.
   - **Ventas (`Ventas · Reportes · Facturación`):** Historial de pedidos, Estado de Resultados mensual, exportación para contador (con códigos PUC) y facturación electrónica DIAN vía Factus.
   - **Clientes (`Contactos · Te deben · Fidelización · Cupones`):** Base de clientes, cartera de fiados/crédito, tarjetas de sellos/puntos en Google Wallet y cupones.
   - **Reservas:** Solicitudes de mesa por cubiertos.
   - **Menú (`Productos · Diseño · Enlaces · QR`):** Platos, categorías, grupos de adiciones, estudio de diseño en 4 pasos (*Plantilla · Marca · Portada · Estilo*) con vista previa de celular, página bio multilink (`/l/{slug}`) y códigos QR.
   - **Inventario y Costeo:** Modo *Simple* (espejo 1:1 plato↔stock) y modo *Recetas* (insumos, sub-recetas, kardex, conteos de auditoría), más calculadora de margen objetivo y precios sugeridos.
   - **Mi página (`Datos · Eventos`) y Equipo y sedes (`Equipo · Sedes`):** Perfil (Negocio, Pedidos y cobros, Redes y reseñas), eventos con boletería y operación multi-sucursal (`Organization` + `Branch`).
2. **Vistas públicas para comensales:**
   - Directorio `/feed`, mapa `/mapa`, eventos `/eventos`, bio `/l/[slug]`, reseñas `/r/[slug]`, carta de salón `/ver/[slug]` y catálogo público `/[slug]` (y `/menu/[slug]`).
3. **Panel Super-Admin (`/super-admin`) y Mini-CRM (`nami-crm-web`):**
   - 18 pantallas para aprobar negocios, activar features a mano, cobrar mensualidades de plataforma y emitir facturas DIAN.

---

### 1.2 Modelo de datos deducido (`backend/prisma/schema.prisma`)
- **Tamaño:** `4.962` líneas, **99 modelos**, `191` índices y `239` migraciones.
- **Tenant (`Restaurant`):** Tabla central con ~115 columnas que mezcla perfil, ~25 columnas de diseño de carta, ~15 de bio multilink, columnas sueltas por método de pago (`paymentNequiNumber`, `paymentTransferAccount`, `paymentLlaveKey`), horarios en JSON (`schedule`), zonas de domicilio en JSON (`deliveryZones`) y corte de día operativo (`businessDayCutoffMin`).
- **Catálogo (`MenuCategory`, `MenuItem`, `AdditionGroup`, `InventoryGroup`):** Usa borrado lógico (`deletedAt`) en categorías y platos; las variantes (pizzas por mitades, tamaños, combos, 2x1) viven dentro de un JSON `customization`.
- **Pedidos (`Order`) vs. Facturas (`Invoice`):**
  - `Order` guarda `items` como un **snapshot JSON** (`CartItem[]`) para congelar lo pedido, además de `customerNameSnapshot`, `customerPhoneSnapshot` y `clientOrderId` (`@@unique([restaurantId, clientOrderId])` para idempotencia).
  - `Invoice` es el documento fiscal/POS inmutable ligado obligatoriamente a un turno `CashSession`, con líneas de pago en `PosPayment` y anulaciones en `InvoiceVoid`.
- **Gastos e Ingresos (`PosExpense` + `MovementCategory`):** Llamado históricamente `PosExpense` con `kind: EXPENSE | INCOME`, anulación sin borrado físico (`voidedAt`, `voidReason`) y categorías jerárquicas clasificadas por `MovementCategoryGroup`.
- **Clientes (`Customer`):** Identificados por `@@unique([phone, restaurantId])`.

---

### 1.3 Flujos clave analizados en `ñami`
1. **Catálogo público → Pedido pendiente → WhatsApp:**
   - El comprador entra a `/[slug]`, arma su carrito y completa el checkout.
   - El cliente genera un UUID v4 (`generateClientOrderId`, con fallback sin Web Crypto) y envía `POST /api/orders`.
   - El servidor valida con Zod (con topes `PUBLIC_ORDER_MAX_LINES = 100`, `PUBLIC_ORDER_MAX_LINE_QTY = 99`), aplica rate limiting compuesto por `IP + teléfono` (`ordersLimiter`, 30 pedidos / 5 min, eximiendo reintentos idempotentes del mismo `clientOrderId`), crea o actualiza el `Customer`, guarda el `Order` en estado `PENDING` y devuelve `comandaDisplay` (ej. `DO1592`).
   - Con esa respuesta, `buildWhatsAppOrderUrl` (`packages/core/src/orders/order-format.ts`) arma el texto para `https://wa.me/<phone>?text=...` usando bloques monoespaciados (```` ``` ````) para alinear los totales y sanitizando caracteres de Markdown. Si el `POST` no confirmó a tiempo, el mensaje inserta `⚠️ NO CONFIRMADO EN EL SISTEMA`.
2. **Zona horaria Colombia (`America/Bogota`):**
   - `packages/core/src/schedule/bogota-time.ts` fija `BOGOTA_OFFSET_MS = -5 * 60 * 60 * 1000` (Colombia no tiene horario de verano) y calcula `year, month, day, weekday, hour, minute` con aritmética UTC determinista para que SSR (servidor en UTC) y navegador nunca discrepen.

---

### 1.4 Puntos débiles, huecos y oportunidades de mejora

1. **Complejidad excesiva para un pequeño emprendedor:**
   - `ñami` fue diseñado para restaurantes con meseros, comandas de cocina, planos de salón, turnos Z con arqueo ciego, facturación electrónica DIAN, retenciones (`retefuente`, `reteICA`, `reteIVA`), códigos contables PUC y conciliación de extractos bancarios.
   - **Nuestra mejora:** Un emprendedor que vende postres, ropa, cosméticos, desayunos o artesanías por WhatsApp e Instagram no quiere abrir ni cerrar un "turno de caja Z" para anotar que vendió dos tortas por Nequi.En **Marchante**, la **Venta Rápida** toma 2 toques sin turnos obligatorios, y confirmar un pedido de WhatsApp toma **1 toque**.
2. **Dinero almacenado con tipos inconsistentes (`Decimal` vs. `Int`):**
   - En `ñami` conviven `Decimal(10,2)`, `Decimal(12,2)`, `Decimal(14,2)` e `Int` (`cashPaidAmount Int?`, `stampMinAmount Int`), obligando a convertir y redondear en decenas de lugares.
   - **Nuestra mejora:** Todo monto en **Marchante** se guarda como **entero en pesos COP (`INTEGER` / `BIGINT`)**, jamás flotantes ni decimales.
3. **Aislamiento multi-tenant confiado a llamadas manuales en código:**
   - Su propia auditoría (`AUDITORIA_SISTEMA_2026-10-24.md`, hallazgo `QA-01`) advierte que dependen de llamadas manuales `assertBelongsToRestaurant` en los servicios y carecen de verificación E2E de aislamiento.
   - **Nuestra mejora:** Aislamiento **a nivel de base de datos con Row Level Security (RLS)** en PostgreSQL por `business_id`, reforzado por un contexto de base de datos obligatorio en cada operación del servidor.
4. **Colapso de tipos en Prisma (`Excessive stack depth`):**
   - Documentado en los comentarios de `schema.prisma` (líneas 874, 1410, 1838, 2661, 3477): al crecer el esquema tuvieron que **eliminar relaciones y llaves foráneas de Prisma** porque `tsc` reventaba por profundidad de tipos.
   - **Nuestra mejora:** Usaremos **Drizzle ORM**, que genera tipos planos e instantáneos, permite declarar políticas RLS y produce SQL limpio sin sobrecarga.
5. **Snapshot de costo y ganancia por ítem:**
   - En `ñami`, `Order.items` es un JSON libre del carrito pensado para modificadores de pizza, y el costo vive aparte en el kardex.
   - **Nuestra mejora:** En **Marchante**, cada venta confirmada guarda sus líneas en `sale_items` con **`unit_price_cop` y `unit_cost_cop` congelados al momento de la venta**, garantizando que si mañana sube el precio o el costo de un producto, las ganancias y márgenes históricos jamás se alteren.
6. **Peso del catálogo público en móvil (`PERF-03`):**
   - La auditoría de `ñami` reporta `299 KB` de JS inicial en el menú público y componentes de más de `2.500` líneas.
   - **Nuestra mejora:** Catálogo público renderizado con Server Components e islas cliente mínimas para que cargue al instante en 3G/4G, y módulos pequeños con límite estricto de responsabilidad.

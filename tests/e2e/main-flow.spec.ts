import { test, expect } from '@playwright/test';

test.describe('Flujo E2E Principal de Marchante', () => {
  test('Crear cuenta/producto → Pedido en catálogo público → Confirmar venta en 1 toque → Ver en resumen y estadísticas', async ({
    page,
  }) => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const slug = `arepas-e2e-${uniqueSuffix}`;
    const email = `e2e-${uniqueSuffix}@marchante.co`;

    // 1. Registro de un nuevo emprendedor
    await page.goto('/registro');
    await page.fill('#ownerName', 'Doña Marina E2E');
    await page.fill('#businessName', `Arepas Marina ${uniqueSuffix}`);
    await page.fill('#slug', slug);
    await page.fill('#whatsappPhone', '3157778899');
    await page.fill('#email', email);
    await page.fill('#password', 'clave-segura-2026');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/panel/);
    await expect(page.locator('h1')).toContainText('Marina');

    // 2. Ir al Catálogo y crear un producto nuevo con precio y costo en COP
    await page.goto('/panel/catalogo');
    await page.click('button:has-text("Nuevo producto")');
    await page.fill('#prod-name', 'Arepa de Queso Campesino E2E');
    await page.fill('#prod-price', '10000');
    await page.fill('#prod-cost', '4000');
    await page.fill('#prod-desc', 'Asada al carbón con mantequilla y queso doble crema.');
    await page.click('button:has-text("Publicar en mi catálogo")');

    await expect(page.locator('text=Arepa de Queso Campesino E2E').first()).toBeVisible();

    // 3. Abrir el Catálogo Público (/[slug]), armar carrito y crear pedido PENDIENTE antes de WhatsApp
    await page.goto(`/${slug}`);
    await expect(page.locator('h1')).toContainText(`Arepas Marina ${uniqueSuffix}`);
    await page.click('text=Arepa de Queso Campesino E2E');

    // Aumentar cantidad a 2 unidades ($ 20.000 total)
    await page.click('button[aria-label="Aumentar cantidad"]');
    await page.click('button:has-text("Agregar al pedido")');

    // Abrir carrito y completar checkout
    await page.click('button:has-text("Ver mi pedido y enviar por WhatsApp")');
    await page.fill('#cust-name', 'Carlos Comprador E2E');
    await page.fill('#cust-phone', '3101239876');
    await page.click('button:has-text("Enviar pedido por WhatsApp")');

    // Verificar que el pedido quedó registrado como pendiente (#M-101) y armó el mensaje de WhatsApp
    await expect(page.locator('text=Pedido #M-101 registrado')).toBeVisible();
    await expect(page.locator('pre')).toContainText('Arepa de Queso Campesino E2E × 2');
    await expect(page.locator('pre')).toContainText('$ 20.000');

    // 4. Volver al panel (/panel/vender) y confirmar el pedido pendiente con UN SOLO TOQUE
    await page.goto('/panel/vender');
    await expect(page.locator('text=#M-101').first()).toBeVisible();
    await expect(page.locator('text=Carlos Comprador E2E').first()).toBeVisible();
    await page.click('button:has-text("Confirmar venta")');

    await expect(page.locator('text=confirmado como venta #V-101').first()).toBeVisible();

    // 5. Verificar en el Resumen Diario (/panel)
    await page.goto('/panel');
    await expect(page.locator('text=$ 20.000').first()).toBeVisible();
    await expect(page.locator('text=Arepa de Queso Campesino E2E').first()).toBeVisible();

    // 6. Verificar en Estadísticas y Gráficas (/panel/estadisticas)
    await page.goto('/panel/estadisticas');
    await expect(page.locator('text=$ 20.000').first()).toBeVisible();
    await expect(page.locator('text=Arepa de Queso Campesino E2E').first()).toBeVisible();
    await expect(page.locator('text=Carlos Comprador E2E').first()).toBeVisible();
  });
});

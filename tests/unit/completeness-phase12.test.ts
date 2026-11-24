import { describe, expect, it } from 'vitest';
import { ensureDemoSellerAccount } from '@/modules/auth/service';
import { getBusinessProfile } from '@/modules/business/service';
import { listCategories, listProducts } from '@/modules/catalog/service';
import { listProductsWithCostingSummary } from '@/modules/catalog/costing';
import { getPublicCatalogBySlug } from '@/modules/orders/service';
import {
  confirmPendingOrderOneTap,
  getQuickSaleWorkspaceData,
} from '@/modules/sales/service';
import { listCustomers } from '@/modules/customers/service';
import { getFinanceLedger } from '@/modules/finance/service';
import { getDailySummary } from '@/modules/analytics/daily-summary';
import { getBusinessStatistics } from '@/modules/analytics/statistics';

describe('Fase 12 — Verificación de Completitud de Punta a Punta (Secciones A a J)', () => {
  it('recorre y verifica el flujo completo en la cuenta demo: perfil (A), catálogo (B), vitrina pública (C), diseño (D), venta rápida y confirmación 1-toque (E), clientes (F), gastos/ingresos (G), costos/margen (H), resumen diario (I) y estadísticas (J)', async () => {
    const demoSession = await ensureDemoSellerAccount();
    expect(demoSession.slug).toBe('horno-y-canela');

    // A. Perfil del negocio
    const profile = await getBusinessProfile(demoSession.businessId);
    expect(profile.name).toBe('Horno & Canela');
    expect(profile.ownerName).toBe('Doña Elena Restrepo');
    expect(profile.paymentMethods.some((m) => m.enabled)).toBe(true);
    expect(profile.schedule.lun.isOpen).toBe(true);

    // B. Categorías y catálogo
    const cats = await listCategories(demoSession.businessId);
    expect(cats.length).toBeGreaterThanOrEqual(3);
    const prods = await listProducts(demoSession.businessId);
    expect(prods.items.length).toBeGreaterThanOrEqual(6);

    // C & D. Catálogo público y personalización
    const publicCatalog = await getPublicCatalogBySlug('horno-y-canela');
    expect(publicCatalog).not.toBeNull();
    expect(publicCatalog?.categories.length).toBeGreaterThanOrEqual(3);
    expect(publicCatalog?.business.primaryColor).toBe('#C83E2B');

    // E. Venta rápida y confirmación de pedido pendiente en 1 toque
    const quickWorkspace = await getQuickSaleWorkspaceData(demoSession.businessId);
    expect(quickWorkspace.pendingOrders.length).toBeGreaterThanOrEqual(1);
    const pendingOrder = quickWorkspace.pendingOrders[0]!;
    expect(pendingOrder.status).toBe('PENDING');

    const confirmed = await confirmPendingOrderOneTap(demoSession.businessId, {
      orderId: pendingOrder.id,
    });
    expect(confirmed.order.status).toBe('CONFIRMED');

    // F. Clientes
    const customers = await listCustomers(demoSession.businessId);
    expect(customers.length).toBeGreaterThanOrEqual(4);

    // G. Gastos e ingresos
    const ledger = await getFinanceLedger(demoSession.businessId, { period: 'today' });
    expect(ledger.totals.salesIncomeCop).toBeGreaterThan(0);
    expect(ledger.totals.expensesCop).toBe(28000);

    // H. Costos y margen
    const costing = await listProductsWithCostingSummary(demoSession.businessId);
    expect(costing.summary.totalProducts).toBeGreaterThanOrEqual(6);
    expect(costing.summary.averageMarginPercent).toBeGreaterThan(40);
    expect(costing.products[0]?.costBreakdown.length).toBeGreaterThan(0);

    // I. Resumen diario
    const daily = await getDailySummary(demoSession.businessId);
    expect(daily.metrics.totalSoldCop).toBeGreaterThan(100000);
    expect(daily.starProduct).not.toBeNull();
    expect(daily.narrative.storyParagraph).toContain('libres');

    // J. Estadísticas y gráficas
    const stats = await getBusinessStatistics(demoSession.businessId, { period: 'week' });
    expect(stats.overview.salesCop).toBeGreaterThan(100000);
    expect(stats.topProducts.length).toBeGreaterThan(0);
    expect(stats.categoryBreakdown.length).toBeGreaterThan(0);
    expect(stats.paymentMethodBreakdown.length).toBeGreaterThan(0);
    expect(stats.topCustomers.length).toBeGreaterThan(0);
    expect(stats.peakHours.length).toBeGreaterThan(0);
    expect(stats.explanations.timelineExplanation.length).toBeGreaterThan(10);
  });
});

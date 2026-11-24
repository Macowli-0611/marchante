'use client';

import { paymentMethodLabel } from '@/modules/shared/payment-methods';
import React, { useState } from 'react';
import Link from 'next/link';
import type { DailySummaryData } from '@/modules/analytics/daily-summary';
import { formatCop } from '@/modules/shared/currency';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Award,
  ShoppingBag,
  Share2,
  Copy,
  ExternalLink,
  PlusCircle,
  BarChart3,
  Package,
  Palette,
  Users,
  Calculator,
  Store,
  Clock,
  Sparkles,
} from 'lucide-react';

export function DailySummaryView({ summary }: { summary: DailySummaryData }) {
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleCopyStoreLink() {
    const url = `${window.location.origin}/${summary.business.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  }

  const shareOnWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(
    `¡Hola! Te comparto el catálogo digital de *${summary.business.name}* para que veas nuestros productos y pidas directo por WhatsApp: ${
      typeof window !== 'undefined' ? window.location.origin : 'https://marchante.co'
    }/${summary.business.slug}`,
  )}`;

  return (
    <div className="space-y-6 pb-20">
      {/* Alerta prioritaria si hay pedidos pendientes de WhatsApp por confirmar */}
      {summary.pendingOrdersCount > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning-soft/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning text-paper flex items-center justify-center shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-base sm:text-lg font-bold text-ink">
                Tienes {summary.pendingOrdersCount} pedido(s) pendiente(s) del catálogo
              </p>
              <p className="text-xs text-ink-muted">
                Confírmalos para que se sumen a las ventas y ganancia de hoy.
              </p>
            </div>
          </div>

          <Link
            href="/panel/vender"
            className="min-h-[42px] px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-profit text-xs sm:text-sm font-bold text-paper hover:bg-profit-strong shadow-xs transition-colors shrink-0"
          >
            Confirmar en 1 toque →
          </Link>
        </div>
      )}

      {/* TARJETA NARRATIVA CONVERSACIONAL DEL DÍA */}
      <section className="card-boleto p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-canvas border border-line px-3 py-1 text-xs font-semibold text-ink inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-ink-muted" />
              {summary.dateHumanLabel} · <span className="font-mono-cop">{summary.currentTimeBogota}</span>
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 ${
                summary.openStatus.isOpen
                  ? 'bg-profit-soft border-profit/30 text-profit'
                  : 'bg-warning-soft border-warning/30 text-warning'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {summary.openStatus.statusMessage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="min-h-[36px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-canvas text-xs font-medium text-ink transition-colors cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-brand" />
              {copiedLink ? '¡Link copiado!' : `/${summary.business.slug}`}
            </button>

            <a
              href={shareOnWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[36px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-profit/30 bg-profit-soft text-xs font-semibold text-profit hover:bg-profit-soft/80 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartir en WhatsApp
            </a>
          </div>
        </div>

        {/* Narrativa humana del negocio */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {summary.narrative.headline}
          </h1>
          <p className="text-sm sm:text-base text-ink-soft leading-relaxed max-w-3xl">
            {summary.narrative.storyParagraph}
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-profit bg-profit-soft/50 px-2.5 py-1 rounded-lg">
            <Sparkles className="h-3.5 w-3.5 text-profit" />
            <span>{summary.narrative.starProductSentence}</span>
          </div>
        </div>

        {/* Acciones principales de trabajo */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Link
            href="/panel/vender"
            className="min-h-[44px] px-5 inline-flex items-center gap-2 rounded-xl bg-brand text-sm font-bold text-paper hover:bg-brand-strong transition-all shadow-xs"
          >
            <Zap className="h-4 w-4" />
            Registrar venta rápida
          </Link>

          <Link
            href="/panel/movimientos"
            className="min-h-[44px] px-4 inline-flex items-center gap-2 rounded-xl border border-line bg-canvas text-xs sm:text-sm font-semibold text-ink hover:bg-subtle transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-brand" />
            Anotar gasto
          </Link>

          <Link
            href={`/${summary.business.slug}`}
            target="_blank"
            className="min-h-[44px] px-4 inline-flex items-center gap-2 rounded-xl border border-line bg-canvas text-xs sm:text-sm font-semibold text-ink hover:bg-subtle transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-ink-muted" />
            Ver vitrina pública
          </Link>
        </div>
      </section>

      {/* LOS 4 INDICADORES ESENCIALES (KPIs limpios sin numeración forzada) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Ventas de hoy */}
        <div className="card-boleto p-4.5 sm:p-5 flex flex-col justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
            <span>Ventas de hoy</span>
            <TrendingUp className="h-4 w-4 text-ink-muted" />
          </span>
          <div>
            <p className="font-mono-cop text-2xl sm:text-3xl font-bold text-ink">
              {formatCop(summary.metrics.totalSoldCop)}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              <strong>{summary.metrics.salesCount}</strong> venta(s) · {summary.metrics.vsYesterdayText}
            </p>
          </div>
        </div>

        {/* 2. Ganancia libre */}
        <div className="card-boleto p-4.5 sm:p-5 flex flex-col justify-between gap-3 bg-profit-soft/30 border-profit/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-profit flex items-center justify-between">
            <span>Ganancia libre</span>
            <TrendingUp className="h-4 w-4 text-profit" />
          </span>
          <div>
            <p
              className={`font-mono-cop text-2xl sm:text-3xl font-bold ${
                summary.metrics.netProfitCop >= 0 ? 'text-profit' : 'text-danger'
              }`}
            >
              {formatCop(summary.metrics.netProfitCop)}
            </p>
            <p className="text-xs text-profit-strong mt-1">
              Tras costos ({formatCop(summary.metrics.totalCostOfSoldCop)}) y gastos operativos
            </p>
          </div>
        </div>

        {/* 3. Gastos de hoy */}
        <div className="card-boleto p-4.5 sm:p-5 flex flex-col justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
            <span>Gastos registrados</span>
            <TrendingDown className="h-4 w-4 text-danger" />
          </span>
          <div>
            <p className="font-mono-cop text-2xl sm:text-3xl font-bold text-danger">
              {formatCop(summary.metrics.expensesCop)}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              En <strong>{summary.metrics.expensesCount}</strong> movimiento(s) de hoy
            </p>
          </div>
          {summary.metrics.productCostPurchasesCop > 0 && (
            <p className="text-[10px] text-ink-muted bg-canvas border border-line rounded px-2 py-1 leading-normal">
              {formatCop(summary.metrics.productCostPurchasesCop)} en compras de insumos (ya costeados en productos).
            </p>
          )}
        </div>

        {/* 4. Producto estrella de hoy */}
        <div className="card-boleto p-4.5 sm:p-5 flex flex-col justify-between gap-3 bg-warning-soft/40 border-warning/30">
          <span className="text-[11px] font-bold uppercase tracking-wider text-warning flex items-center justify-between">
            <span>Producto estrella</span>
            <Award className="h-4 w-4 text-warning" />
          </span>
          <div>
            {summary.starProduct ? (
              <>
                <p className="font-display text-base sm:text-lg font-bold text-ink leading-snug line-clamp-2">
                  {summary.starProduct.productName}
                </p>
                <p className="text-xs text-ink-soft mt-1">
                  <strong>{summary.starProduct.unitsSold}</strong> uds ·{' '}
                  <span className="font-mono-cop font-bold text-profit">
                    {formatCop(summary.starProduct.revenueCop)}
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-sm font-semibold text-ink-muted">
                  Aún por descubrir hoy
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Se actualizará con tu primera venta.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Ventas del día y Atajos rápidos organizados */}
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 card-boleto p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              Ventas registradas hoy ({summary.recentSalesToday.length})
            </h2>
            <Link
              href="/panel/vender"
              className="text-xs font-bold text-brand hover:underline"
            >
              Ir a caja →
            </Link>
          </div>

          {summary.recentSalesToday.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs text-ink-muted">
                Todavía no hay ventas hoy.
              </p>
              <p className="text-[11px] text-ink-muted">
                Toca &ldquo;Registrar venta rápida&rdquo; cuando atiendas a tu primer marchante.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {summary.recentSalesToday.map((s) => (
                <div
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">
                      #{s.saleCode} · {s.itemsSummary}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {s.timeLabel} · {paymentMethodLabel(s.paymentMethod)}
                      {s.customerNameSnapshot ? ` · ${s.customerNameSnapshot}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono-cop text-sm font-bold text-ink">
                      {formatCop(s.totalCop)}
                    </span>
                    <span className="block font-mono-cop text-[11px] font-semibold text-profit">
                      +{formatCop(s.grossProfitCop)} libre
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 card-boleto p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">
              Gestión de tu negocio
            </h2>
            <span className="text-[11px] text-ink-muted">Acceso directo</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/panel/catalogo', label: `Catálogo (${summary.activeProductsCount})`, icon: Package },
              { href: '/panel/clientes', label: 'Clientes', icon: Users },
              { href: '/panel/costos', label: 'Costos y margen', icon: Calculator },
              { href: '/panel/estadisticas', label: 'Estadísticas', icon: BarChart3 },
              { href: '/panel/diseno', label: 'Diseño vitrina', icon: Palette },
              { href: '/panel/perfil', label: 'Perfil y horarios', icon: Store },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-h-[48px] p-2.5 rounded-xl border border-line bg-canvas hover:border-ink flex items-center gap-2 text-xs font-semibold text-ink transition-colors"
                >
                  <Icon className="h-4 w-4 text-brand shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

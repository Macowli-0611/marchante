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
      {/* Alerta prioritaria si hay pedidos pendientes de WhatsApp por confirmar (I4, E4) */}
      {summary.pendingOrdersCount > 0 && (
        <div className="rounded-2xl border-2 border-ink bg-warning-soft p-4 sm:p-5 shadow-stamp-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-warning text-paper flex items-center justify-center shrink-0">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold text-ink">
                Tienes {summary.pendingOrdersCount} pedido(s) pendiente(s) del catálogo
              </p>
              <p className="text-xs font-semibold text-ink-muted">
                Confírmalos con un solo toque para que entren a las ventas y ganancias de hoy.
              </p>
            </div>
          </div>

          <Link
            href="/panel/vender"
            className="min-h-[46px] px-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-profit text-sm font-extrabold text-paper shadow-stamp-2 shrink-0"
          >
            Confirmar en 1 toque →
          </Link>
        </div>
      )}

      {/* TARJETA NARRATIVA HUMANA DEL DÍA (I1, I2) */}
      <section className="card-boleto-strong p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-line pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-canvas border border-ink px-3 py-1 text-xs font-bold text-ink">
              📅 {summary.dateHumanLabel} · {summary.currentTimeBogota} (Hora Bogotá)
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                summary.openStatus.isOpen
                  ? 'bg-profit-soft border-profit text-profit'
                  : 'bg-warning-soft border-warning text-warning'
              }`}
            >
              ● {summary.openStatus.statusMessage}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyStoreLink}
              className="min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-canvas text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-brand" />
              {copiedLink ? '¡Link copiado!' : `/${summary.business.slug}`}
            </button>

            <a
              href={shareOnWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-profit bg-profit-soft text-xs font-bold text-profit"
            >
              <Share2 className="h-3.5 w-3.5" />
              Compartir en WhatsApp
            </a>
          </div>
        </div>

        {/* Narrativa en lenguaje humano claro (Requisito I2) */}
        <div className="space-y-2.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {summary.narrative.headline}
          </h1>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed">
            {summary.narrative.storyParagraph}
          </p>
          <p className="text-sm font-semibold text-profit">
            ⭐ {summary.narrative.starProductSentence}
          </p>
        </div>

        {/* Botones grandes de trabajo diario (I4) */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href="/panel/vender"
            className="min-h-[50px] px-6 inline-flex items-center gap-2 rounded-2xl border-2 border-ink bg-brand text-base font-extrabold text-paper shadow-stamp-3 hover:bg-brand-strong transition-all"
          >
            <Zap className="h-5 w-5" />
            Registrar venta rápida
          </Link>

          <Link
            href="/panel/movimientos"
            className="min-h-[50px] px-5 inline-flex items-center gap-2 rounded-2xl border-2 border-ink bg-paper text-sm font-bold text-ink hover:bg-subtle transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-brand" />
            Anotar un gasto
          </Link>

          <Link
            href={`/${summary.business.slug}`}
            target="_blank"
            className="min-h-[50px] px-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-canvas text-sm font-bold text-ink hover:bg-subtle transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-brand" />
            Ver mi vitrina
          </Link>
        </div>
      </section>

      {/* LOS 4 INDICADORES ESENCIALES DEL RESUMEN DIARIO (Requisito I3) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Cuánto vendió hoy */}
        <div className="card-boleto p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-ink" />
            1. Cuánto vendiste hoy
          </span>
          <p className="font-mono-cop text-3xl font-extrabold text-ink">
            {formatCop(summary.metrics.totalSoldCop)}
          </p>
          <p className="text-xs text-ink-muted">
            En <strong>{summary.metrics.salesCount}</strong> venta(s) ·{' '}
            {summary.metrics.vsYesterdayText}
          </p>
        </div>

        {/* 2. Cuánto ganó hoy */}
        <div className="card-boleto p-5 flex flex-col justify-between gap-2 bg-profit-soft/45 border-profit">
          <span className="text-xs font-bold uppercase tracking-wider text-profit-strong flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-profit" />
            2. Cuánto ganaste hoy
          </span>
          <p
            className={`font-mono-cop text-3xl font-extrabold ${
              summary.metrics.netProfitCop >= 0 ? 'text-profit' : 'text-danger'
            }`}
          >
            {formatCop(summary.metrics.netProfitCop)}
          </p>
          <p className="text-xs text-profit-strong">
            Libre tras costos ({formatCop(summary.metrics.totalCostOfSoldCop)}) y gastos del negocio
          </p>
        </div>

        {/* 3. Cuánto gastó hoy */}
        <div className="card-boleto p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-danger" />
            3. Cuánto gastaste hoy
          </span>
          <p className="font-mono-cop text-3xl font-extrabold text-danger">
            {formatCop(summary.metrics.expensesCop)}
          </p>
          <p className="text-xs text-ink-muted">
            En <strong>{summary.metrics.expensesCount}</strong> gasto(s) registrado(s) hoy
          </p>
          {summary.metrics.productCostPurchasesCop > 0 && (
            <p className="text-[11px] text-ink-muted">
              De eso, {formatCop(summary.metrics.productCostPurchasesCop)} son compras de insumos y
              empaques: ya están dentro del costo de tus productos, por eso no se restan otra vez de
              la ganancia.
            </p>
          )}
        </div>

        {/* 4. Producto estrella de hoy */}
        <div className="card-boleto p-5 flex flex-col justify-between gap-2 bg-warning-soft/60 border-warning">
          <span className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
            <Award className="h-4 w-4 text-warning" />
            4. Producto estrella hoy
          </span>
          {summary.starProduct ? (
            <>
              <p className="font-display text-lg font-extrabold text-ink leading-snug line-clamp-2">
                {summary.starProduct.productName}
              </p>
              <p className="text-xs font-semibold text-ink-soft">
                <strong>{summary.starProduct.unitsSold}</strong> vendidos ·{' '}
                <span className="font-mono-cop font-bold text-profit">
                  {formatCop(summary.starProduct.revenueCop)}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-base font-bold text-ink-muted">
                Aún por descubrir hoy
              </p>
              <p className="text-xs text-ink-muted">
                Se coronará con la primera venta del día.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Últimas ventas del día + Accesos rápidos a las demás secciones */}
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 card-boleto p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-dashed border-line pb-2.5">
            <h2 className="font-display text-lg font-bold text-ink">
              Movimientos de venta de hoy ({summary.recentSalesToday.length})
            </h2>
            <Link
              href="/panel/vender"
              className="text-xs font-bold text-brand underline"
            >
              Ir a vender →
            </Link>
          </div>

          {summary.recentSalesToday.length === 0 ? (
            <p className="text-xs text-ink-muted py-6 text-center">
              Todavía no hay ventas hoy. ¡Toca &ldquo;Registrar venta rápida&rdquo; cuando atiendas
              a tu primer marchante!
            </p>
          ) : (
            <div className="divide-y divide-line">
              {summary.recentSalesToday.map((s) => (
                <div
                  key={s.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">
                      #{s.saleCode} · {s.itemsSummary}
                    </p>
                    <p className="text-ink-muted">
                      {s.timeLabel} · {paymentMethodLabel(s.paymentMethod)}
                      {s.customerNameSnapshot ? ` · 👤 ${s.customerNameSnapshot}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono-cop text-sm font-extrabold text-ink">
                      {formatCop(s.totalCop)}
                    </span>
                    <span className="block font-mono-cop text-[11px] font-bold text-profit">
                      +{formatCop(s.grossProfitCop)} libre
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 card-boleto p-5 space-y-3">
          <h2 className="font-display text-lg font-bold text-ink border-b border-dashed border-line pb-2.5">
            Atajos de tu tienda
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { href: '/panel/estadisticas', label: 'Estadísticas y gráficas', icon: BarChart3 },
              { href: '/panel/catalogo', label: `Catálogo (${summary.activeProductsCount})`, icon: Package },
              { href: '/panel/costos', label: 'Costos y márgenes', icon: Calculator },
              { href: '/panel/clientes', label: 'Cuaderno de clientes', icon: Users },
              { href: '/panel/diseno', label: 'Personalizar vitrina', icon: Palette },
              { href: '/panel/perfil', label: 'Perfil, mapa y pagos', icon: Store },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-h-[54px] p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center gap-2.5 text-xs font-bold text-ink transition-colors"
                >
                  <Icon className="h-4 w-4 text-brand shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

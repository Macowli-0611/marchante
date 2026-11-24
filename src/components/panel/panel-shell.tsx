'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MarchanteLogo } from '@/components/ui/marchante-logo';
import {
  Sun,
  Zap,
  Package,
  Palette,
  Users,
  Wallet,
  BarChart3,
  Store,
  ExternalLink,
  LogOut,
  Calculator,
} from 'lucide-react';

export interface PanelShellBusinessInfo {
  id: string;
  name: string;
  ownerName: string;
  slug: string;
  category: string;
  bogotaDateLabel: string;
}

const SIDEBAR_ITEMS = [
  { href: '/panel', label: 'Hoy en tu negocio', icon: Sun, exact: true },
  { href: '/panel/vender', label: 'Venta rápida y pedidos', icon: Zap, highlight: true },
  { href: '/panel/catalogo', label: 'Catálogo y categorías', icon: Package },
  { href: '/panel/costos', label: 'Costos y márgenes', icon: Calculator },
  { href: '/panel/diseno', label: 'Personalizar vitrina', icon: Palette },
  { href: '/panel/clientes', label: 'Clientes', icon: Users },
  { href: '/panel/movimientos', label: 'Gastos e ingresos', icon: Wallet },
  { href: '/panel/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { href: '/panel/perfil', label: 'Perfil del negocio', icon: Store },
];

export function PanelShell({
  business,
  children,
}: {
  business: PanelShellBusinessInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function isRouteActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)]">
      {/* Enlace accesible para saltar al contenido principal con teclado (WCAG 2.2 SC 2.4.1) */}
      <a
        href="#panel-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Saltar al contenido principal
      </a>

      {/* Cinta artesanal de toldo */}
      <div className="h-2 w-full toldo-stripe border-b border-ink sticky top-0 z-40" />

      {/* Cabecera superior móvil y escritorio */}
      <header className="sticky top-2 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/panel" className="shrink-0">
              <MarchanteLogo size="sm" />
            </Link>
            <span className="hidden sm:inline-block text-line">|</span>
            <div className="min-w-0">
              <p className="font-display text-sm sm:text-base font-bold text-ink truncate">
                {business.name}
              </p>
              <p className="text-xs text-ink-muted truncate">
                {business.ownerName} · {business.bogotaDateLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="min-h-[44px] px-3 sm:px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-canvas text-xs sm:text-sm font-semibold text-ink hover:bg-subtle transition-colors"
              title="Ver mi catálogo público"
            >
              <ExternalLink className="h-4 w-4 text-brand" />
              <span className="hidden xs:inline">Mi vitrina</span>
              <span className="font-mono-cop text-xs text-ink-muted hidden md:inline">
                /{business.slug}
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión en todos tus dispositivos"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-line bg-paper text-ink-muted hover:text-danger hover:border-danger transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo principal con barra lateral en escritorio y contenido */}
      <div className="mx-auto w-full max-w-7xl flex-1 grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6 px-4 pt-5 pb-28 lg:pb-10">
        {/* Navegación lateral de escritorio ("El Mostrador") */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Menú principal del negocio"
            className="card-boleto p-3 space-y-1.5 sticky top-24"
          >
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.href, item.exact);
              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-[46px] px-3.5 py-2.5 flex items-center gap-3 rounded-xl border-2 border-ink font-bold text-sm transition-all ${
                      active
                        ? 'bg-brand-strong text-paper shadow-stamp-2'
                        : 'bg-brand text-paper shadow-stamp-2 hover:bg-brand-strong'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-[44px] px-3.5 py-2 flex items-center gap-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-ink text-paper'
                      : 'text-ink-soft hover:bg-subtle'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Área de trabajo principal */}
        <main id="panel-main-content" className="min-w-0">
          {children}
        </main>
      </div>

      {/* Barra inferior móvil al alcance del pulgar (con botón central de Venta Rápida) */}
      <nav
        aria-label="Navegación rápida móvil"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-ink bg-paper px-2 pb-safe"
      >
        <div className="mx-auto max-w-md grid grid-cols-5 items-center h-16 gap-1">
          <Link
            href="/panel"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold ${
              pathname === '/panel' ? 'text-brand' : 'text-ink-muted'
            }`}
          >
            <Sun className="h-5 w-5" />
            <span>Hoy</span>
          </Link>

          <Link
            href="/panel/catalogo"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold ${
              pathname.startsWith('/panel/catalogo') ? 'text-brand' : 'text-ink-muted'
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Catálogo</span>
          </Link>

          {/* Botón central elevado de VENTA RÁPIDA siempre al alcance del pulgar */}
          <div className="flex justify-center -mt-5">
            <Link
              href="/panel/vender"
              className="min-h-[54px] px-4 inline-flex flex-col items-center justify-center rounded-2xl border-2 border-ink bg-brand text-paper shadow-[2px_3px_0_0_var(--color-ink)] active:translate-y-0.5 transition-transform"
            >
              <Zap className="h-5 w-5" />
              <span className="text-[11px] font-extrabold leading-tight">Vender</span>
            </Link>
          </div>

          <Link
            href="/panel/movimientos"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold ${
              pathname.startsWith('/panel/movimientos') ? 'text-brand' : 'text-ink-muted'
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span>Gastos</span>
          </Link>

          <Link
            href="/panel/perfil"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold ${
              pathname.startsWith('/panel/perfil') ? 'text-brand' : 'text-ink-muted'
            }`}
          >
            <Store className="h-5 w-5" />
            <span>Negocio</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

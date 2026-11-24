'use client';

import React, { useEffect, useState } from 'react';
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
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';

export interface PanelShellBusinessInfo {
  id: string;
  name: string;
  ownerName: string;
  slug: string;
  category: string;
  bogotaDateLabel: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  highlight?: boolean;
  badge?: string;
}

const SIDEBAR_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Operación diaria',
    items: [
      { href: '/panel', label: 'Hoy en tu negocio', icon: Sun, exact: true },
      { href: '/panel/vender', label: 'Venta rápida y pedidos', icon: Zap, highlight: true },
      { href: '/panel/movimientos', label: 'Gastos e ingresos', icon: Wallet },
    ],
  },
  {
    title: 'Gestión y clientes',
    items: [
      { href: '/panel/catalogo', label: 'Catálogo y productos', icon: Package },
      { href: '/panel/clientes', label: 'Cuaderno de clientes', icon: Users },
      { href: '/panel/costos', label: 'Costos y márgenes', icon: Calculator },
    ],
  },
  {
    title: 'Crecimiento y ajustes',
    items: [
      { href: '/panel/estadisticas', label: 'Estadísticas y métricas', icon: BarChart3 },
      { href: '/panel/diseno', label: 'Personalizar vitrina', icon: Palette },
      { href: '/panel/perfil', label: 'Perfil del negocio', icon: Store },
    ],
  },
];

const MORE_MENU_ROUTES = [
  '/panel/clientes',
  '/panel/costos',
  '/panel/estadisticas',
  '/panel/diseno',
  '/panel/perfil',
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Cerrar menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Manejar tecla Escape para accesibilidad
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [mobileMenuOpen]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function isRouteActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const isMoreActive = MORE_MENU_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)]">
      {/* Enlace accesible para saltar al contenido principal con teclado (WCAG 2.2 SC 2.4.1) */}
      <a
        href="#panel-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-ink focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Saltar al contenido principal
      </a>

      {/* Acento fino de toldo superior */}
      <div className="h-1.5 w-full toldo-stripe border-b border-line sticky top-0 z-40" />

      {/* Cabecera superior moderna con menos saturación visual */}
      <header className="sticky top-1.5 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/panel" className="shrink-0 flex items-center">
              <MarchanteLogo size="sm" />
            </Link>
            <span className="hidden sm:inline-block text-line">/</span>
            <div className="min-w-0">
              <p className="font-display text-sm sm:text-base font-bold text-ink truncate leading-snug">
                {business.name}
              </p>
              <p className="text-xs text-ink-muted truncate">
                {business.ownerName} · <span className="font-mono-cop text-[11px]">{business.bogotaDateLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/${business.slug}`}
              target="_blank"
              className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-canvas text-xs sm:text-sm font-semibold text-ink hover:bg-subtle transition-all"
              title="Ver mi vitrina pública"
            >
              <ExternalLink className="h-3.5 w-3.5 text-brand" />
              <span className="hidden xs:inline">Mi vitrina</span>
              <span className="font-mono-cop text-xs text-ink-muted hidden md:inline">
                /{business.slug}
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-line bg-paper text-ink-muted hover:text-danger hover:border-danger transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo principal: barra lateral en escritorio y contenido principal */}
      <div className="mx-auto w-full max-w-7xl flex-1 grid lg:grid-cols-[250px_minmax(0,1fr)] gap-6 px-4 pt-5 pb-28 lg:pb-12">
        {/* Navegación lateral de escritorio organizada por categorías lógicas */}
        <aside className="hidden lg:block">
          <nav
            aria-label="Menú principal del negocio"
            className="card-boleto p-3.5 space-y-5 sticky top-20"
          >
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-ink-muted block">
                  {group.title}
                </span>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.href, item.exact);

                    if (item.highlight) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`min-h-[42px] px-3 py-2 flex items-center justify-between rounded-xl font-bold text-sm transition-all ${
                            active
                              ? 'bg-brand text-paper shadow-sm'
                              : 'bg-brand/10 text-brand hover:bg-brand/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono-cop bg-brand-strong/20 px-1.5 py-0.5 rounded text-paper">
                            1-toque
                          </span>
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`min-h-[38px] px-3 py-1.5 flex items-center gap-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-ink text-paper font-semibold shadow-xs'
                            : 'text-ink-soft hover:bg-subtle hover:text-ink'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Área de trabajo principal */}
        <main id="panel-main-content" className="min-w-0">
          {children}
        </main>
      </div>

      {/* Barra de navegación inferior móvil (con acceso central a Vender y botón 'Más') */}
      <nav
        aria-label="Navegación rápida móvil"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/98 backdrop-blur-md px-2 pb-safe shadow-lg"
      >
        <div className="mx-auto max-w-md grid grid-cols-5 items-center h-16 gap-1">
          <Link
            href="/panel"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors ${
              pathname === '/panel' ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Sun className="h-5 w-5" />
            <span>Hoy</span>
          </Link>

          <Link
            href="/panel/catalogo"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors ${
              pathname.startsWith('/panel/catalogo') ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Package className="h-5 w-5" />
            <span>Catálogo</span>
          </Link>

          {/* Botón central elevado para Venta Rápida */}
          <div className="flex justify-center -mt-4">
            <Link
              href="/panel/vender"
              className="min-h-[50px] min-w-[50px] px-3.5 inline-flex flex-col items-center justify-center rounded-2xl bg-brand text-paper shadow-md hover:bg-brand-strong active:scale-95 transition-all"
            >
              <Zap className="h-5 w-5" />
              <span className="text-[10px] font-extrabold leading-tight">Vender</span>
            </Link>
          </div>

          <Link
            href="/panel/movimientos"
            className={`min-h-[44px] flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors ${
              pathname.startsWith('/panel/movimientos') ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span>Gastos</span>
          </Link>

          {/* Botón 'Más' para acceder a Clientes, Costos, Estadísticas, Vitrina y Perfil */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir más opciones"
            className={`min-h-[44px] relative flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
              isMoreActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {isMoreActive && (
              <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-brand" />
            )}
            <MoreHorizontal className="h-5 w-5" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      {/* Menú deslizable 'Más' en móvil para que nada quede disperso */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Telón de fondo */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Hoja deslizable */}
          <div className="relative z-10 bg-paper rounded-t-3xl border-t border-line shadow-2xl p-5 pb-safe max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="font-display text-base font-bold text-ink">Todas las secciones</p>
                <p className="text-xs text-ink-muted">Gestión, costos y configuración de {business.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-xl border border-line bg-canvas text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted block mb-1.5 px-1">
                  Gestión y clientes
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/panel/clientes"
                    className="p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center gap-2.5 text-xs font-bold text-ink transition-colors"
                  >
                    <Users className="h-4 w-4 text-brand" />
                    <span>Clientes</span>
                  </Link>
                  <Link
                    href="/panel/costos"
                    className="p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center gap-2.5 text-xs font-bold text-ink transition-colors"
                  >
                    <Calculator className="h-4 w-4 text-brand" />
                    <span>Costos & Margen</span>
                  </Link>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted block mb-1.5 px-1">
                  Crecimiento y ajustes
                </span>
                <div className="space-y-1.5">
                  <Link
                    href="/panel/estadisticas"
                    className="p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center justify-between text-xs font-bold text-ink transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="h-4 w-4 text-brand" />
                      <span>Estadísticas y reportes</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </Link>
                  <Link
                    href="/panel/diseno"
                    className="p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center justify-between text-xs font-bold text-ink transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className="h-4 w-4 text-brand" />
                      <span>Personalizar vitrina</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </Link>
                  <Link
                    href="/panel/perfil"
                    className="p-3 rounded-xl border border-line bg-canvas hover:border-ink flex items-center justify-between text-xs font-bold text-ink transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="h-4 w-4 text-brand" />
                      <span>Perfil, horarios y pagos</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-muted" />
                  </Link>
                </div>
              </div>

              <div className="pt-2 border-t border-line flex items-center justify-between gap-3">
                <Link
                  href={`/${business.slug}`}
                  target="_blank"
                  className="min-h-[42px] px-4 flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-xs font-bold text-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-brand" />
                  Ver mi vitrina (/{business.slug})
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[42px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger/30 text-danger hover:bg-danger-soft text-xs font-bold cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

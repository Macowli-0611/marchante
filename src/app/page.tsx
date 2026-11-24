import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { MarchanteLogo } from '@/components/ui/marchante-logo';
import { DemoLoginButton } from '@/components/auth/demo-login-button';
import { Store, MessageCircle, Zap, TrendingUp, ShieldCheck } from 'lucide-react';

export default async function HomePage() {
  const session = await getServerSession();
  if (session) {
    redirect('/panel');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-kraft-dots">
      {/* Cinta superior de toldo de tienda de barrio */}
      <div className="h-2.5 w-full toldo-stripe border-b border-ink" />

      <header className="mx-auto w-full max-w-5xl px-4 py-5 flex items-center justify-between">
        <MarchanteLogo size="md" showTagline />
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-xl border-2 border-ink bg-paper text-sm font-semibold text-ink hover:bg-subtle transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/registro"
            className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-xl border-2 border-ink bg-brand text-sm font-semibold text-paper shadow-stamp-2 hover:bg-brand-strong transition-colors"
          >
            Abrir mi tienda
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-14 flex flex-col justify-center">
        <div className="grid gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink bg-warning-soft px-3.5 py-1.5 text-xs font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Hecho para emprendedores de Colombia y Latinoamérica
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.1]">
              Jubila el cuaderno y las notas sueltas del celular.
            </h1>

            <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-xl">
              Con <strong>Marchante</strong> tienes tu vitrina pública con link propio, recibes
              pedidos listos en tu WhatsApp, anotas ventas en dos toques y sabes al instante
              cuánto vendiste, cuánto gastaste y cuánto te quedó libre en pesos.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/registro"
                className="min-h-[48px] px-6 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-brand text-base font-bold text-paper shadow-stamp-3 hover:bg-brand-strong transition-all"
              >
                <Store className="h-5 w-5" />
                Crear mi vitrina gratis
              </Link>
              <DemoLoginButton />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs font-medium text-ink-muted">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-profit shrink-0" />
                <span>Pedidos directo a tu WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand shrink-0" />
                <span>Venta rápida en 2 toques</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-profit shrink-0" />
                <span>Cuentas en pesos COP exactos</span>
              </div>
            </div>
          </div>

          {/* Tarjeta visual estilo libreta de mostrador */}
          <div className="lg:col-span-5">
            <div className="card-boleto-strong p-6 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-dashed border-line pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Resumen del día · Hora Bogotá
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Horno &amp; Canela
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-profit-soft border border-profit px-3 py-1 text-xs font-bold text-profit">
                  ● Abierto
                </span>
              </div>

              <div className="rounded-xl bg-canvas border border-line p-4 space-y-1">
                <p className="text-xs font-semibold text-ink-muted">Lo que llevas vendido hoy</p>
                <p className="font-mono-cop text-3xl font-bold text-ink">$ 186.500</p>
                <p className="text-xs font-medium text-profit flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Te quedan $ 112.000 libres después de costos y gastos
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-paper border border-line px-3.5 py-2.5">
                  <div>
                    <p className="font-semibold text-ink">⭐ Producto estrella de hoy</p>
                    <p className="text-xs text-ink-muted">Almojábana tibia con cuajada (9 uds)</p>
                  </div>
                  <span className="font-mono-cop font-bold text-profit">$ 108.000</span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-warning-soft border border-warning/40 px-3.5 py-2.5">
                  <div>
                    <p className="font-semibold text-ink">📲 Pedido #M-104 por WhatsApp</p>
                    <p className="text-xs text-ink-muted">Camila P. · Nequi · Pendiente</p>
                  </div>
                  <span className="rounded-lg bg-profit px-2.5 py-1 text-xs font-bold text-paper">
                    Confirmar 1-toque
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

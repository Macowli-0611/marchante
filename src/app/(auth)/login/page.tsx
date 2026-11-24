'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarchanteLogo } from '@/components/ui/marchante-logo';
import { DemoLoginButton } from '@/components/auth/demo-login-button';
import { LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Revisa tu correo y contraseña.');
        setLoading(false);
        return;
      }
      router.push('/panel');
      router.refresh();
    } catch {
      setError('No pudimos conectar con el servidor. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-kraft-dots">
      <div className="h-2.5 w-full toldo-stripe border-b border-ink" />

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8 flex flex-col justify-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/">
            <MarchanteLogo size="lg" />
          </Link>
          <p className="mt-2 text-sm text-ink-muted">
            Abre el mostrador de tu negocio y revisa cómo va el día.
          </p>
        </div>

        <div className="card-boleto-strong p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold text-ink">
            Entrar a mi negocio
          </h1>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-danger bg-danger-soft p-3.5 text-sm font-medium text-danger"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-ink mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-correo@ejemplo.com"
                className="w-full min-h-[44px] rounded-xl border-1.5 border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-ink mb-1.5"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] rounded-xl border-1.5 border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-faint"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-brand px-5 py-3 text-base font-bold text-paper shadow-stamp-2 hover:bg-brand-strong disabled:opacity-60 transition-all cursor-pointer"
            >
              <LogIn className="h-5 w-5" />
              {loading ? 'Abriendo tu mostrador...' : 'Entrar al panel'}
            </button>
          </form>

          <div className="relative py-1">
            <div className="border-t border-dashed border-line" />
          </div>

          <DemoLoginButton />

          <p className="text-center text-sm text-ink-muted">
            ¿Todavía no tienes tu vitrina?{' '}
            <Link href="/registro" className="font-bold text-brand underline">
              Ábrela gratis aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

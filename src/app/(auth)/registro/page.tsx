'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarchanteLogo } from '@/components/ui/marchante-logo';
import { slugifyBusinessName, validateBusinessSlug } from '@/modules/shared/slug';
import { Store, AlertCircle, CheckCircle2 } from 'lucide-react';

const BUSINESS_CATEGORIES = [
  { value: 'comida_casera', label: '🍲 Comida casera y almuerzos' },
  { value: 'reposteria', label: '🥐 Panadería, postres y repostería' },
  { value: 'moda_accesorios', label: '👗 Ropa, calzado y accesorios' },
  { value: 'belleza_cuidado', label: '✨ Belleza y cuidado personal' },
  { value: 'artesanias_regalos', label: '🎁 Artesanías, detalles y regalos' },
  { value: 'mercado_fruver', label: '🥑 Fruver, café, quesos y despensa' },
  { value: 'mascotas', label: '🐾 Mascotas y accesorios' },
  { value: 'tecnologia_otros', label: '📱 Tecnología y otros negocios' },
];

export default function RegistroPage() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState('comida_casera');
  const [whatsappPhone, setWhatsappPhone] = useState('300');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveSlug = slugTouched ? customSlug : slugifyBusinessName(businessName);
  const slugValidation = effectiveSlug ? validateBusinessSlug(effectiveSlug) : null;

  function handleBusinessNameChange(val: string) {
    setBusinessName(val);
    if (!slugTouched) {
      setCustomSlug(slugifyBusinessName(val));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (slugValidation && !slugValidation.valid) {
      setError(slugValidation.error || 'Revisa el link de tu negocio.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName,
          businessName,
          slug: effectiveSlug,
          category,
          whatsappPhone,
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo crear la cuenta.');
        setLoading(false);
        return;
      }
      router.push('/panel');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-kraft-dots">
      <div className="h-2.5 w-full toldo-stripe border-b border-ink" />

      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 flex flex-col justify-center">
        <div className="mb-5 flex flex-col items-center text-center">
          <Link href="/">
            <MarchanteLogo size="lg" />
          </Link>
          <p className="mt-1.5 text-sm text-ink-muted">
            En menos de 1 minuto queda lista tu vitrina con link propio y tu cuaderno digital.
          </p>
        </div>

        <div className="card-boleto-strong p-6 space-y-5">
          <h1 className="font-display text-2xl font-bold text-ink">
            Abre tu negocio en Marchante
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ownerName"
                  className="block text-sm font-semibold text-ink mb-1"
                >
                  ¿Cómo te llamas? (Dueño/a)
                </label>
                <input
                  id="ownerName"
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ej. Claudia Gómez"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-semibold text-ink mb-1"
                >
                  Nombre de tu negocio
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  placeholder="Ej. Delicias de Claudia"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
                />
              </div>
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-semibold text-ink mb-1">
                Link público de tu catálogo
              </label>
              <div className="flex items-center rounded-xl border border-line bg-canvas overflow-hidden">
                <span className="px-3 text-xs sm:text-sm font-mono-cop text-ink-muted select-none border-r border-line">
                  marchante.co/
                </span>
                <input
                  id="slug"
                  type="text"
                  required
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  placeholder="delicias-de-claudia"
                  className="flex-1 min-h-[44px] bg-paper px-3 py-2 text-sm font-mono-cop font-semibold text-ink focus:outline-none"
                />
              </div>
              {slugValidation && (
                <p
                  className={`mt-1 text-xs font-medium flex items-center gap-1 ${
                    slugValidation.valid ? 'text-profit' : 'text-danger'
                  }`}
                >
                  {slugValidation.valid ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Tu catálogo quedará en /{slugValidation.normalized}</span>
                    </>
                  ) : (
                    <span>{slugValidation.error}</span>
                  )}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-semibold text-ink mb-1"
                >
                  ¿Qué vendes principalmente?
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="whatsappPhone"
                  className="block text-sm font-semibold text-ink mb-1"
                >
                  WhatsApp de pedidos (+57)
                </label>
                <input
                  id="whatsappPhone"
                  type="tel"
                  required
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="300 123 4567"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base font-mono-cop text-ink"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-ink mb-1">
                  Correo para entrar
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="claudia@correo.com"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-ink mb-1"
                >
                  Contraseña (mín. 8 caracteres)
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-brand px-5 py-3 text-base font-bold text-paper shadow-stamp-2 hover:bg-brand-strong disabled:opacity-60 transition-all cursor-pointer"
            >
              <Store className="h-5 w-5" />
              {loading ? 'Armando tu tienda...' : 'Crear mi negocio ahora'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-muted">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-bold text-brand underline">
              Entra aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

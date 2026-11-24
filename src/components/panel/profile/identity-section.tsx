import React from 'react';
import { MessageCircle } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import { BUSINESS_CATEGORY_OPTIONS } from '@/modules/business/validators';
import type { BusinessProfileState } from './use-business-profile';

const LABEL = 'block text-sm font-semibold text-ink mb-1.5';
const INPUT = 'w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base text-ink';

/** Pestaña 1: nombre, dueño, link, categoría, descripción y WhatsApp (A1, A2, A7). */
export function IdentitySection({ profile }: { profile: BusinessProfileState }) {
  const { values, setField, slugCheck, normalizedWhatsapp } = profile;

  return (
    <SectionCard
      title="Identidad del negocio y WhatsApp de pedidos"
      description="Así te reconocen tus clientes cuando abren tu link."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="biz-name" className={LABEL}>
            Nombre del negocio *
          </label>
          <input
            id="biz-name"
            type="text"
            required
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Ej. Horno & Canela"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="owner-name" className={LABEL}>
            Nombre del dueño o anfitrión *
          </label>
          <input
            id="owner-name"
            type="text"
            required
            value={values.ownerName}
            onChange={(e) => setField('ownerName', e.target.value)}
            placeholder="Ej. Doña Elena Restrepo"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="biz-slug" className={LABEL}>
            Link propio de tu catálogo *
          </label>
          <div className="flex items-center rounded-xl border border-line bg-canvas overflow-hidden">
            <span className="px-3 text-xs font-mono-cop text-ink-muted border-r border-line select-none" aria-hidden="true">
              marchante.co/
            </span>
            <input
              id="biz-slug"
              type="text"
              required
              aria-describedby="biz-slug-status"
              value={values.slug}
              onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 min-h-[44px] bg-paper px-3 py-2 text-sm font-mono-cop font-bold text-ink focus:outline-none"
            />
          </div>
          <p
            id="biz-slug-status"
            className={`mt-1 text-xs font-medium ${slugCheck.valid ? 'text-profit' : 'text-danger'}`}
          >
            {slugCheck.valid ? `✓ Enlace válido: /${slugCheck.normalized}` : slugCheck.error}
          </p>
        </div>

        <div>
          <label htmlFor="biz-category" className={LABEL}>
            ¿Qué vende tu negocio? *
          </label>
          <select
            id="biz-category"
            value={values.category}
            onChange={(e) => setField('category', e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm font-medium text-ink"
          >
            {BUSINESS_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="biz-description" className={LABEL}>
          Descripción corta de tu negocio (lo que hace especial lo que vendes)
        </label>
        <textarea
          id="biz-description"
          rows={3}
          maxLength={400}
          value={values.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Ej. Amasamos todos los días desde las 6 a. m. con queso campesino fresco y café del Quindío."
          className="w-full rounded-xl border border-line bg-paper p-3.5 text-sm text-ink"
        />
        <p className="mt-1 text-xs text-ink-muted text-right">{values.description.length}/400 caracteres</p>
      </div>

      {/* Número de WhatsApp registrado (A7) */}
      <div className="rounded-2xl border-1.5 border-profit/40 bg-profit-soft/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="biz-whatsapp" className="text-sm font-bold text-ink flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-profit" />
            Número de WhatsApp donde recibes los pedidos *
          </label>
          {normalizedWhatsapp.length >= 10 && (
            <a
              href={`https://wa.me/${normalizedWhatsapp}?text=${encodeURIComponent(
                `¡Hola ${values.name}! Estoy probando el enlace de pedidos de Marchante.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="min-h-[38px] px-3 inline-flex items-center gap-1.5 rounded-xl border border-profit bg-paper text-xs font-bold text-profit hover:bg-profit-soft"
            >
              Probar mi WhatsApp →
            </a>
          )}
        </div>
        <input
          id="biz-whatsapp"
          type="tel"
          required
          aria-describedby="biz-whatsapp-help"
          value={values.whatsappPhone}
          onChange={(e) => setField('whatsappPhone', e.target.value)}
          placeholder="Ej. 315 890 1234 o 573158901234"
          className="w-full sm:max-w-sm min-h-[44px] rounded-xl border border-profit bg-paper px-3.5 py-2 text-base font-mono-cop font-bold text-ink"
        />
        <p id="biz-whatsapp-help" className="text-xs text-profit-strong">
          Si escribes tus 10 dígitos de celular colombiano (ej. <code>3158901234</code>), agregamos el prefijo{' '}
          <code>+57</code> automáticamente (quedará:{' '}
          <strong className="font-mono-cop">+{normalizedWhatsapp || '57...'}</strong>).
        </p>
      </div>
    </SectionCard>
  );
}

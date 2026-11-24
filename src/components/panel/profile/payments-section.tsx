import React from 'react';
import { Share2 } from 'lucide-react';
import { SectionCard } from '@/components/ui/section-card';
import type { SocialLinksConfig } from '@/db/schema';
import type { BusinessProfileState } from './use-business-profile';

const SMALL_LABEL = 'block text-xs font-semibold text-ink-muted mb-1';
const SMALL_INPUT = 'w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 py-1.5 text-sm text-ink';

/** Pestaña 4a: métodos de pago activos y sus datos (A5). */
export function PaymentsSection({ profile }: { profile: BusinessProfileState }) {
  const { values, updatePaymentMethod } = profile;

  return (
    <SectionCard
      title="Métodos de pago que recibes"
      description="Activa cómo te pueden pagar. Si activas Nequi, Daviplata, Transferencia o Bre-B, anota el número para que el cliente lo vea al pedir."
      className="space-y-4"
    >
      <div className="space-y-3">
        {values.paymentMethods.map((pm, idx) => {
          const needsAccountData = pm.code !== 'cash' && pm.code !== 'card';
          const fieldId = (name: string) => `pm-${pm.code}-${name}`;
          return (
            <div
              key={pm.code}
              className={`rounded-2xl border p-4 transition-colors ${
                pm.enabled ? 'border-ink bg-paper' : 'border-line bg-canvas/70 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pm.enabled}
                    onChange={(e) => updatePaymentMethod(idx, { enabled: e.target.checked })}
                    className="h-5 w-5 accent-brand rounded cursor-pointer"
                  />
                  <span className="font-display text-base font-bold text-ink">{pm.label}</span>
                </label>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    pm.enabled ? 'bg-profit-soft text-profit' : 'bg-subtle text-ink-muted'
                  }`}
                >
                  {pm.enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {pm.enabled && (
                <div className="mt-3 pt-3 border-t border-dashed border-line grid gap-3 sm:grid-cols-3">
                  {needsAccountData && (
                    <>
                      <div>
                        <label htmlFor={fieldId('account')} className={SMALL_LABEL}>
                          Número / Cuenta / Llave ({pm.label})
                        </label>
                        <input
                          id={fieldId('account')}
                          type="text"
                          value={pm.accountNumber || ''}
                          onChange={(e) => updatePaymentMethod(idx, { accountNumber: e.target.value })}
                          placeholder="Ej. 300 123 4567"
                          className={`${SMALL_INPUT} font-mono-cop font-bold`}
                        />
                      </div>
                      <div>
                        <label htmlFor={fieldId('holder')} className={SMALL_LABEL}>
                          A nombre de (Titular)
                        </label>
                        <input
                          id={fieldId('holder')}
                          type="text"
                          value={pm.accountHolder || ''}
                          onChange={(e) => updatePaymentMethod(idx, { accountHolder: e.target.value })}
                          placeholder="Ej. Elena Restrepo"
                          className={SMALL_INPUT}
                        />
                      </div>
                    </>
                  )}
                  <div className={needsAccountData ? '' : 'sm:col-span-3'}>
                    <label htmlFor={fieldId('instructions')} className={SMALL_LABEL}>
                      Instrucción corta para el cliente
                    </label>
                    <input
                      id={fieldId('instructions')}
                      type="text"
                      value={pm.instructions || ''}
                      onChange={(e) => updatePaymentMethod(idx, { instructions: e.target.value })}
                      placeholder="Ej. Envíanos el comprobante por WhatsApp"
                      className={SMALL_INPUT}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

const SOCIAL_FIELDS: Array<{ key: keyof SocialLinksConfig; id: string; label: string; placeholder: string }> = [
  { key: 'instagram', id: 'social-ig', label: 'Instagram', placeholder: '@tu_negocio' },
  { key: 'tiktok', id: 'social-tiktok', label: 'TikTok', placeholder: '@tu_negocio' },
  { key: 'facebook', id: 'social-fb', label: 'Facebook', placeholder: 'facebook.com/tunegocio' },
  { key: 'website', id: 'social-web', label: 'Página web externa (opcional)', placeholder: 'https://...' },
];

/** Pestaña 4b: redes sociales y web (A6). */
export function SocialLinksSection({ profile }: { profile: BusinessProfileState }) {
  const { values, setField } = profile;

  return (
    <SectionCard
      title="Redes sociales y página web"
      description={
        <>
          Puedes escribir solo tu usuario (ej. <code>@hornoycanela</code>) o el enlace completo.
        </>
      }
      icon={<Share2 className="h-5 w-5 text-brand" />}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.id} className="block text-sm font-semibold text-ink mb-1">
              {field.label}
            </label>
            <input
              id={field.id}
              type="text"
              value={values.socialLinks[field.key] || ''}
              onChange={(e) => setField('socialLinks', { ...values.socialLinks, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-sm text-ink"
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

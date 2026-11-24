'use client';

import React, { useState } from 'react';
import { Copy, ExternalLink, Save } from 'lucide-react';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { IdentitySection } from './profile/identity-section';
import { LocationSection } from './profile/location-section';
import { PaymentsSection, SocialLinksSection } from './profile/payments-section';
import { panelId, ProfileTabs, tabId } from './profile/profile-tabs';
import { ScheduleSection } from './profile/schedule-section';
import type { BusinessProfileFormData, ProfileTab } from './profile/types';
import { useBusinessProfile } from './profile/use-business-profile';

export type { BusinessProfileFormData } from './profile/types';

/** Perfil del negocio (/panel/perfil): una pestaña por archivo en `./profile/`. */
export function BusinessProfileForm({ initialData }: { initialData: BusinessProfileFormData }) {
  const profile = useBusinessProfile(initialData);
  const [activeTab, setActiveTab] = useState<ProfileTab>('identidad');
  const [copiedLink, setCopiedLink] = useState(false);
  const { slugCheck, openStatus } = profile;

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slugCheck.normalized}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Sin permiso de portapapeles
    }
  }

  return (
    <form onSubmit={profile.submit} className="space-y-6 pb-20">
      <div className="card-boleto p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                openStatus.isOpen
                  ? 'bg-profit-soft border-profit/30 text-profit'
                  : 'bg-warning-soft border-warning/30 text-warning'
              }`}
            >
              ● {openStatus.statusMessage}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Perfil de tu negocio</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Configura los datos que tus clientes verán en tu vitrina{' '}
            <span className="font-mono-cop font-semibold text-ink">/{slugCheck.normalized}</span> y en tus pedidos de WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copyPublicUrl}
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-canvas text-xs font-semibold text-ink hover:bg-subtle transition-colors cursor-pointer"
          >
            <Copy className="h-4 w-4 text-brand" />
            <span aria-live="polite">{copiedLink ? '¡Link copiado!' : 'Copiar link'}</span>
          </button>
          <a
            href={`/${slugCheck.normalized}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-paper text-xs font-semibold text-ink hover:bg-subtle transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-brand" />
            Ver vitrina
          </a>
        </div>
      </div>

      <FeedbackBanner feedback={profile.feedback} />

      <ProfileTabs active={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id={panelId(activeTab)} aria-labelledby={tabId(activeTab)}>
        {activeTab === 'identidad' && <IdentitySection profile={profile} />}
        {activeTab === 'ubicacion' && <LocationSection profile={profile} />}
        {activeTab === 'horarios' && <ScheduleSection profile={profile} />}
        {activeTab === 'pagos_redes' && (
          <div className="space-y-6">
            <PaymentsSection profile={profile} />
            <SocialLinksSection profile={profile} />
          </div>
        )}
      </div>

      {/* Barra fija de guardado al alcance del pulgar */}
      <div className="sticky bottom-20 lg:bottom-4 z-20 flex justify-end">
        <button
          type="submit"
          disabled={profile.saving}
          className="w-full sm:w-auto min-h-[50px] px-7 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-brand text-base font-extrabold text-paper shadow-stamp-3 hover:bg-brand-strong disabled:opacity-60 transition-all cursor-pointer"
        >
          <Save className="h-5 w-5" />
          {profile.saving ? 'Guardando cambios...' : 'Guardar perfil del negocio'}
        </button>
      </div>
    </form>
  );
}

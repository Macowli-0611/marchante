'use client';

import React, { useState } from 'react';
import { ExternalLink, Palette, RotateCcw, Save, Smartphone } from 'lucide-react';
import type { PublicBusinessView, PublicCategoryView } from '@/components/catalog/public-storefront';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import type { BusinessOpenStatus } from '@/modules/business/schedule';
import {
  BackgroundSection,
  BrandColorSection,
  CategoryOrderSection,
  ImagesSection,
  TypographySection,
} from './design/design-sections';
import { PhonePreview } from './design/phone-preview';
import { useCatalogDesign } from './design/use-catalog-design';

interface CatalogCustomizationStudioProps {
  initialBusiness: PublicBusinessView;
  initialOpenStatus: BusinessOpenStatus;
  initialCategories: PublicCategoryView[];
}

/** Personalizar la vitrina (/panel/diseno). Las piezas viven en `./design/`. */
export function CatalogCustomizationStudio({
  initialBusiness,
  initialOpenStatus,
  initialCategories,
}: CatalogCustomizationStudioProps) {
  const studio = useCatalogDesign(initialBusiness, initialCategories);
  // En el celular se alterna entre los controles y la vista previa a pantalla completa
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls');

  const toggleClass = (active: boolean) =>
    `min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
      active ? 'bg-paper text-ink border border-ink' : 'text-ink-muted'
    }`;

  return (
    <div className="space-y-6 pb-20">
      <div className="card-boleto p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Identidad de tu vitrina</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Personalizar vitrina pública</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Personaliza cómo ven tus clientes <span className="font-mono-cop font-semibold text-ink">/{initialBusiness.slug}</span>:
            logo, portada, paleta de colores, tipografía y orden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={studio.reset}
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-canvas text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Deshacer
          </button>
          <a
            href={`/${initialBusiness.slug}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line hover:border-ink bg-paper text-xs font-semibold text-ink hover:bg-subtle transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-brand" />
            Abrir vitrina real
          </a>
        </div>
      </div>

      <FeedbackBanner feedback={studio.feedback} />

      <div
        role="group"
        aria-label="Modo de vista"
        className="xl:hidden grid grid-cols-2 gap-2 rounded-2xl border border-line bg-subtle p-1.5"
      >
        <button
          type="button"
          aria-pressed={mobileView === 'controls'}
          onClick={() => setMobileView('controls')}
          className={toggleClass(mobileView === 'controls')}
        >
          <Palette className="h-4 w-4" />
          1. Editar estilo
        </button>
        <button
          type="button"
          aria-pressed={mobileView === 'preview'}
          onClick={() => setMobileView('preview')}
          className={toggleClass(mobileView === 'preview')}
        >
          <Smartphone className="h-4 w-4 text-brand" />
          2. Vista previa en vivo
        </button>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={studio.publish}
          className={`xl:col-span-7 space-y-6 ${mobileView === 'preview' ? 'hidden xl:block' : 'block'}`}
        >
          <ImagesSection studio={studio} />
          <BrandColorSection studio={studio} />
          <BackgroundSection studio={studio} />
          <TypographySection studio={studio} />
          <CategoryOrderSection studio={studio} />

          <div className="sticky bottom-20 lg:bottom-4 z-20 flex justify-end">
            <button
              type="submit"
              disabled={studio.saving}
              className="w-full sm:w-auto min-h-[50px] px-7 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-brand text-base font-extrabold text-paper shadow-stamp-3 hover:bg-brand-strong disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-5 w-5" />
              {studio.saving ? 'Publicando diseño...' : 'Publicar diseño en mi vitrina'}
            </button>
          </div>
        </form>

        <PhonePreview
          business={studio.previewBusiness}
          openStatus={initialOpenStatus}
          categories={studio.categories}
          className={`xl:col-span-5 xl:sticky xl:top-24 ${mobileView === 'controls' ? 'hidden xl:block' : 'block'}`}
        />
      </div>
    </div>
  );
}

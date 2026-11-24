import React from 'react';
import { ArrowDown, ArrowUp, Image as ImageIcon, Layers, Palette, Type } from 'lucide-react';
import { ImageCropperUploader } from '@/components/panel/image-cropper-uploader';
import { SectionCard } from '@/components/ui/section-card';
import {
  BACKGROUND_PRESET_OPTIONS,
  CARD_STYLE_OPTIONS,
  CURATED_BRAND_PALETTES,
  FONT_PRESET_OPTIONS,
} from '@/modules/business/customization-options';
import { ChoiceCard } from './choice-card';
import { MIN_BRAND_CONTRAST, type CatalogDesignState } from './use-catalog-design';

const ICON = 'h-5 w-5 text-brand';

/** D1: logo y portada. */
export function ImagesSection({ studio }: { studio: CatalogDesignState }) {
  return (
    <SectionCard
      compact
      icon={<ImageIcon className={ICON} />}
      title="1. Logo y foto de portada"
      description="Sube tus imágenes: puedes recortarlas y se optimizan solas a WebP."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageCropperUploader
          currentImageUrl={studio.design.logoUrl}
          onImageUploaded={(url) => studio.set('logoUrl', url)}
          kind="logo"
          label="Logo cuadrado (1:1)"
        />
        <ImageCropperUploader
          currentImageUrl={studio.design.coverUrl}
          onImageUploaded={(url) => studio.set('coverUrl', url)}
          kind="cover"
          label="Portada panorámica"
        />
      </div>
    </SectionCard>
  );
}

function contrastBadgeClass(ratio: number): string {
  if (ratio >= 4.5) return 'bg-profit-soft text-profit';
  if (ratio >= MIN_BRAND_CONTRAST) return 'bg-warning-soft text-warning';
  return 'bg-danger-soft text-danger';
}

/** D2: color principal con verificación de contraste. */
export function BrandColorSection({ studio }: { studio: CatalogDesignState }) {
  const { primaryColor } = studio.design;
  const ratio = studio.contrastRatio;

  return (
    <SectionCard
      compact
      className="space-y-4"
      icon={<Palette className={ICON} />}
      title="2. Color principal de tu marca"
      description="Pinta tus botones de pedir, categorías activas y cabecera."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {CURATED_BRAND_PALETTES.map((p) => (
          <ChoiceCard
            key={p.hex}
            selected={primaryColor.toUpperCase() === p.hex.toUpperCase()}
            onSelect={() => studio.set('primaryColor', p.hex)}
            className="min-h-[54px] p-2.5 flex items-center gap-2.5"
          >
            <span className="h-7 w-7 rounded-full border border-ink shrink-0" style={{ backgroundColor: p.hex }} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">{p.name}</p>
              <p className="text-[10px] text-ink-muted truncate">{p.vibe}</p>
            </div>
          </ChoiceCard>
        ))}
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas p-3">
        <label htmlFor="custom-hex-picker" className="text-xs font-bold text-ink flex items-center gap-2 cursor-pointer">
          <input
            id="custom-hex-picker"
            type="color"
            value={primaryColor}
            onChange={(e) => studio.set('primaryColor', e.target.value.toUpperCase())}
            className="h-9 w-11 rounded border border-ink cursor-pointer"
          />
          <span>O elige un color propio:</span>
          <code className="font-mono-cop font-bold">{primaryColor}</code>
        </label>
        <span aria-live="polite" className={`text-xs font-bold px-2.5 py-1 rounded-full ${contrastBadgeClass(ratio)}`}>
          Contraste: {ratio}:1 {ratio >= MIN_BRAND_CONTRAST ? '✓ Legible' : '✗ Muy claro'}
        </span>
      </div>
    </SectionCard>
  );
}

/** D3: fondo o patrón de la vitrina. */
export function BackgroundSection({ studio }: { studio: CatalogDesignState }) {
  return (
    <SectionCard
      compact
      className="space-y-4"
      icon={<Layers className={ICON} />}
      title="3. Fondo o patrón artesanal"
      description="El ambiente sobre el que se exhiben tus productos."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {BACKGROUND_PRESET_OPTIONS.map((bg) => (
          <ChoiceCard
            key={bg.id}
            selected={studio.design.backgroundPreset === bg.id}
            onSelect={() => studio.set('backgroundPreset', bg.id)}
            selectedClass="bg-brand-soft"
            className="min-h-[64px] p-3"
          >
            <p className="text-xs font-bold text-ink">{bg.name}</p>
            <p className="mt-0.5 text-[11px] text-ink-muted leading-snug">{bg.description}</p>
          </ChoiceCard>
        ))}
      </div>
    </SectionCard>
  );
}

/** D4: letra de los títulos y disposición de tarjetas. */
export function TypographySection({ studio }: { studio: CatalogDesignState }) {
  return (
    <SectionCard
      compact
      icon={<Type className={ICON} />}
      title="4. Tipografía y estilo de tarjetas"
      description="Dale la voz visual que mejor le quede a lo que vendes."
    >
      <div role="group" aria-labelledby="font-group-label" className="space-y-2">
        <span id="font-group-label" className="text-xs font-bold text-ink-muted uppercase tracking-wider">
          Letra de los títulos
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {FONT_PRESET_OPTIONS.map((f) => (
            <ChoiceCard key={f.id} selected={studio.design.fontPreset === f.id} onSelect={() => studio.set('fontPreset', f.id)}>
              <p className="text-xs font-bold text-ink-muted">{f.name}</p>
              <p className="mt-1 text-base text-ink font-display font-bold">{f.sample}</p>
            </ChoiceCard>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="card-group-label" className="space-y-2">
        <span id="card-group-label" className="text-xs font-bold text-ink-muted uppercase tracking-wider">
          Disposición de tarjetas
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CARD_STYLE_OPTIONS.map((cs) => (
            <ChoiceCard key={cs.id} selected={studio.design.cardStyle === cs.id} onSelect={() => studio.set('cardStyle', cs.id)}>
              <p className="text-xs font-bold text-ink">{cs.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{cs.description}</p>
            </ChoiceCard>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/** D5: orden de las categorías en la vitrina. */
export function CategoryOrderSection({ studio }: { studio: CatalogDesignState }) {
  const { categories, moveCategory } = studio;
  const arrowClass =
    'h-9 w-9 rounded-lg border border-line bg-canvas inline-flex items-center justify-center disabled:opacity-30 cursor-pointer';

  return (
    <SectionCard
      compact
      className="space-y-4"
      title="5. Orden de las categorías en tu vitrina"
      description="Pon arriba lo que más quieres que tus clientes vean al entrar."
    >
      {categories.length === 0 ? (
        <p className="text-xs text-ink-muted">Aún no tienes categorías con productos visibles.</p>
      ) : (
        <ol className="divide-y divide-line rounded-xl border border-line bg-paper overflow-hidden">
          {categories.map((cat, idx) => (
            <li key={cat.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-6 w-6 rounded-full bg-subtle font-mono-cop text-xs font-bold flex items-center justify-center text-ink">
                  {idx + 1}
                </span>
                <span className="font-bold text-sm text-ink">{cat.name}</span>
                <span className="text-xs text-ink-muted">({cat.products.length} prod.)</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" disabled={idx === 0} onClick={() => moveCategory(idx, -1)} aria-label={`Subir ${cat.name}`} className={arrowClass}>
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === categories.length - 1}
                  onClick={() => moveCategory(idx, 1)}
                  aria-label={`Bajar ${cat.name}`}
                  className={arrowClass}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicBusinessView, PublicCategoryView } from '@/components/catalog/public-storefront';
import type { Feedback } from '@/components/ui/feedback-banner';
import type { CatalogBackgroundPreset, CatalogCardStyle, CatalogFontPreset } from '@/db/schema';
import { getContrastRatioWithWhite } from '@/modules/business/customization-options';

/** Contraste mínimo del color de marca contra el texto blanco de los botones. */
export const MIN_BRAND_CONTRAST = 3;

export interface DesignValues {
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  backgroundPreset: CatalogBackgroundPreset;
  fontPreset: CatalogFontPreset;
  cardStyle: CatalogCardStyle;
}

function pickDesign(b: PublicBusinessView): DesignValues {
  return {
    logoUrl: b.logoUrl,
    coverUrl: b.coverUrl,
    primaryColor: b.primaryColor,
    backgroundPreset: b.backgroundPreset,
    fontPreset: b.fontPreset,
    cardStyle: b.cardStyle,
  };
}

/** Estado editable en vivo de la vitrina (D1..D6) y publicación. */
export function useCatalogDesign(initialBusiness: PublicBusinessView, initialCategories: PublicCategoryView[]) {
  const router = useRouter();
  const [design, setDesign] = useState<DesignValues>(() => pickDesign(initialBusiness));
  const [categories, setCategories] = useState(initialCategories);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const contrastRatio = useMemo(() => getContrastRatioWithWhite(design.primaryColor), [design.primaryColor]);

  /** Negocio combinado para la vista previa (un color ilegible no se previsualiza). */
  const previewBusiness: PublicBusinessView = useMemo(
    () => ({
      ...initialBusiness,
      ...design,
      primaryColor: contrastRatio >= MIN_BRAND_CONTRAST ? design.primaryColor : initialBusiness.primaryColor,
    }),
    [initialBusiness, design, contrastRatio],
  );

  function set<K extends keyof DesignValues>(key: K, value: DesignValues[K]) {
    setDesign((prev) => ({ ...prev, [key]: value }));
  }

  function moveCategory(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const copy = [...categories];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved!);
    setCategories(copy.map((c, idx) => ({ ...c, sortOrder: idx + 1 })));
  }

  function reset() {
    setDesign(pickDesign(initialBusiness));
    setCategories(initialCategories);
    setFeedback({ type: 'success', message: 'Volvimos al último diseño publicado.' });
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (contrastRatio < MIN_BRAND_CONTRAST) {
      setFeedback({
        type: 'error',
        message: 'El color elegido es muy claro y no tiene buen contraste. Elige un color más intenso.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/panel/customization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...design, orderedCategoryIds: categories.map((c) => c.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo publicar el diseño.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: '¡Vitrina actualizada! Tus clientes ya ven el nuevo diseño en tu link público.',
      });
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al publicar el diseño.' });
    } finally {
      setSaving(false);
    }
  }

  return { design, set, categories, moveCategory, contrastRatio, previewBusiness, saving, feedback, reset, publish };
}

export type CatalogDesignState = ReturnType<typeof useCatalogDesign>;

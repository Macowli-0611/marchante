'use client';

import React, { useMemo, useState } from 'react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { ImageCropperUploader } from '@/components/panel/image-cropper-uploader';
import { calculateProductMargin, formatCop, parseCopInput } from '@/modules/shared/currency';
import type { CatalogCategoryItem, ProductFormValues } from './types';

interface ProductFormDialogProps {
  /** null = producto nuevo. */
  productId: string | null;
  initialValues: ProductFormValues;
  categories: CatalogCategoryItem[];
  onClose: () => void;
  /** Devuelve true si se guardó (entonces se cierra). */
  onSave: (values: ProductFormValues, productId: string | null) => Promise<boolean>;
}

const LABEL = 'block text-sm font-semibold text-ink mb-1';

/** Crear o editar un producto con foto optimizada a WebP (B2, B3). */
export function ProductFormDialog({ productId, initialValues, categories, onClose, onSave }: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const margin = useMemo(
    () => calculateProductMargin(values.priceCop, values.costCop),
    [values.priceCop, values.costCop],
  );

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (await onSave(values, productId)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog labelledBy="prod-modal-title" onClose={onClose} scrollable>
      <div className="card-boleto-strong w-full max-w-xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-5 rounded-b-none sm:rounded-b-2xl">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-3">
          <h2 id="prod-modal-title" className="font-display text-2xl font-bold text-ink">
            {productId ? 'Editar producto' : 'Nuevo producto para tu vitrina'}
          </h2>
          <CloseButton label="Cerrar formulario" onClick={onClose} size="lg" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageCropperUploader
            currentImageUrl={values.imageUrl}
            onImageUploaded={(url) => set('imageUrl', url)}
            kind="product"
            label="Foto del producto (se recorta y optimiza a WebP)"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className={LABEL}>
                Nombre del producto *
              </label>
              <input
                id="prod-name"
                type="text"
                required
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej. Torta casera de almojábana y bocadillo"
                className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prod-cat" className={LABEL}>
                Categoría (obligatoria antes de publicar) *
              </label>
              <select
                id="prod-cat"
                required
                value={values.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-sm font-bold text-ink"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-price" className={LABEL}>
                Precio de venta (COP) *
              </label>
              <input
                id="prod-price"
                type="text"
                inputMode="numeric"
                required
                value={formatCop(values.priceCop, { withSymbol: false })}
                onChange={(e) => set('priceCop', parseCopInput(e.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-ink bg-paper px-3.5 py-2 text-base font-mono-cop font-extrabold text-ink"
              />
              <p className="mt-1 text-xs text-ink-muted">
                Se mostrará como: <strong>{formatCop(values.priceCop)}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="prod-cost" className={LABEL}>
                Cuánto te cuesta hacerlo (COP)
              </label>
              <input
                id="prod-cost"
                type="text"
                inputMode="numeric"
                value={formatCop(values.costCop, { withSymbol: false })}
                onChange={(e) => set('costCop', parseCopInput(e.target.value))}
                className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base font-mono-cop font-bold text-ink"
              />
              <p className="mt-1 text-xs font-semibold text-profit">
                Te ganas {formatCop(margin.profitCop)} ({margin.marginPercent}%)
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="prod-desc" className={LABEL}>
              Descripción apetitosa o detalles (talla, porción, ingredientes)
            </label>
            <textarea
              id="prod-desc"
              rows={2}
              maxLength={500}
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej. Porción generosa horneada hoy, con corazón de bocadillo veleño."
              className="w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-canvas p-3">
            <label className="inline-flex items-center gap-2.5 text-xs font-bold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={values.isSoldOut}
                onChange={(e) => set('isSoldOut', e.target.checked)}
                className="h-4 w-4 accent-danger"
              />
              <span>Marcar &ldquo;Agotado por hoy&rdquo;</span>
            </label>
            <label className="inline-flex items-center gap-2.5 text-xs font-bold text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={values.isHidden}
                onChange={(e) => set('isHidden', e.target.checked)}
                className="h-4 w-4 accent-warning"
              />
              <span>Ocultar de la vitrina pública</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 rounded-xl border border-line bg-paper text-sm font-bold text-ink-muted cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[46px] px-6 rounded-xl border-2 border-ink bg-brand text-sm font-extrabold text-paper shadow-stamp-2 cursor-pointer"
            >
              {saving ? 'Guardando...' : productId ? 'Guardar cambios' : 'Publicar en mi catálogo'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

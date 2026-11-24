import React from 'react';
import { ArrowLeft, ArrowRight, Edit3, X } from 'lucide-react';
import type { CatalogCategoryItem, CategoryDialogState } from './types';

interface CategoryStripProps {
  categories: CatalogCategoryItem[];
  totalProducts: number;
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRename: (state: CategoryDialogState) => void;
  onArchive: (category: CatalogCategoryItem) => void;
}

const ICON_BUTTON = 'h-8 w-7 inline-flex items-center justify-center cursor-pointer';

/** Tira de categorías con orden, renombrado y borrado de las vacías (B1). */
export function CategoryStrip({
  categories,
  totalProducts,
  selectedCategoryId,
  onSelect,
  onMove,
  onRename,
  onArchive,
}: CategoryStripProps) {
  return (
    <section className="card-boleto p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-ink">Categorías ({categories.length})</h2>
        <span className="text-xs text-ink-muted">Usa las flechas ← → para cambiar el orden en tu vitrina</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect('all')}
          aria-pressed={selectedCategoryId === 'all'}
          className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'border-ink bg-ink text-paper'
              : 'border-line bg-canvas text-ink-soft hover:bg-subtle'
          }`}
        >
          Todas ({totalProducts})
        </button>

        {categories.map((cat, idx) => {
          const active = selectedCategoryId === cat.id;
          return (
            <div
              key={cat.id}
              className={`inline-flex items-center rounded-xl border overflow-hidden ${
                active ? 'border-ink bg-brand-soft' : 'border-line bg-paper'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(cat.id)}
                aria-pressed={active}
                className="min-h-[42px] px-3 text-xs font-bold text-ink hover:bg-subtle/60 cursor-pointer"
              >
                {cat.name} <span className="font-mono-cop text-ink-muted">({cat.productCount})</span>
              </button>

              <div className="flex items-center border-l border-line bg-canvas px-1">
                <button
                  type="button"
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  title="Mover categoría antes"
                  aria-label={`Mover ${cat.name} antes`}
                  className={`${ICON_BUTTON} text-ink-muted hover:text-ink disabled:opacity-30`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === categories.length - 1}
                  title="Mover categoría después"
                  aria-label={`Mover ${cat.name} después`}
                  className={`${ICON_BUTTON} text-ink-muted hover:text-ink disabled:opacity-30`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRename({ mode: 'rename', categoryId: cat.id, name: cat.name })}
                  title="Renombrar categoría"
                  aria-label={`Renombrar ${cat.name}`}
                  className={`${ICON_BUTTON} text-ink-muted hover:text-brand`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                {cat.productCount === 0 && categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onArchive(cat)}
                    title="Eliminar categoría vacía"
                    aria-label={`Eliminar categoría ${cat.name}`}
                    className={`${ICON_BUTTON} text-danger hover:bg-danger-soft`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

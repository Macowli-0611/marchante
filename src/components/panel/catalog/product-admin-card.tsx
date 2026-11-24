import React from 'react';
import { Archive, CheckCircle2, Edit3, Eye, EyeOff, XCircle } from 'lucide-react';
import { MarginBadge } from '@/components/ui/margin-badge';
import { formatCop } from '@/modules/shared/currency';
import type { CatalogProductItem } from './types';

interface ProductAdminCardProps {
  product: CatalogProductItem;
  onToggle: (product: CatalogProductItem, patch: { isHidden?: boolean; isSoldOut?: boolean }) => void;
  onEdit: (product: CatalogProductItem) => void;
  onArchive: (product: CatalogProductItem) => void;
}

const TOGGLE_BASE =
  'min-h-[38px] px-3 inline-flex items-center gap-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer';

/** Tarjeta de producto en el panel con controles de 1 toque (B4, B5). */
export function ProductAdminCard({ product, onToggle, onEdit, onArchive }: ProductAdminCardProps) {
  return (
    <article
      className={`card-boleto p-4 flex flex-col justify-between gap-4 transition-all ${
        product.isHidden ? 'bg-canvas/80 border-dashed' : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-20 w-20 rounded-xl object-cover border border-ink bg-canvas shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-xl border border-line bg-canvas flex flex-col items-center justify-center text-ink-muted shrink-0">
            <span className="font-display text-xl font-bold text-brand">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-bold text-ink-muted">
              {product.categoryName}
            </span>
            {product.isSoldOut && (
              <span className="rounded-md bg-danger-soft border border-danger/40 px-2 py-0.5 text-[11px] font-bold text-danger">
                Agotado hoy
              </span>
            )}
            {product.isHidden && (
              <span className="rounded-md bg-warning-soft border border-warning/40 px-2 py-0.5 text-[11px] font-bold text-warning">
                Oculto en vitrina
              </span>
            )}
          </div>

          <h3 className="font-display text-base sm:text-lg font-bold text-ink leading-snug">{product.name}</h3>
          {product.description && <p className="text-xs text-ink-muted line-clamp-2">{product.description}</p>}

          <div className="pt-1 flex flex-wrap items-baseline gap-2.5">
            <span className="font-mono-cop text-lg font-extrabold text-ink">{formatCop(product.priceCop)}</span>
            {product.costCop > 0 && <MarginBadge priceCop={product.priceCop} costCop={product.costCop} />}
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-line pt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(product, { isSoldOut: !product.isSoldOut })}
            aria-pressed={product.isSoldOut}
            className={`${TOGGLE_BASE} ${
              product.isSoldOut ? 'border-danger bg-danger-soft text-danger' : 'border-profit bg-profit-soft text-profit'
            }`}
          >
            {product.isSoldOut ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>{product.isSoldOut ? 'Agotado (activar)' : 'Disponible'}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggle(product, { isHidden: !product.isHidden })}
            aria-pressed={product.isHidden}
            className={`${TOGGLE_BASE} ${
              product.isHidden ? 'border-warning bg-warning-soft text-warning' : 'border-line bg-canvas text-ink-soft'
            }`}
          >
            {product.isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{product.isHidden ? 'Oculto (mostrar)' : 'Visible'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="min-h-[38px] px-3 inline-flex items-center gap-1 rounded-xl border border-ink bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onArchive(product)}
            title="Archivar sin borrar historial de ventas"
            aria-label={`Archivar ${product.name}`}
            className="min-h-[38px] px-2.5 inline-flex items-center justify-center rounded-xl border border-line bg-paper text-xs font-bold text-ink-muted hover:text-danger hover:border-danger cursor-pointer"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

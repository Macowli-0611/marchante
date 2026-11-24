import React from 'react';
import { Layers, Save, Sparkles } from 'lucide-react';
import { marginHealthClass, marginHealthTextClass } from '@/components/ui/margin-badge';
import { calculateProductMargin, formatCop, parseCopInput, suggestCommercialPriceCop } from '@/modules/shared/currency';
import type { CostingPatch, ProductCostingView } from './types';
import { SUGGESTED_PRICE_ROUNDING_COP } from './use-costing';

interface ProductCostingRowProps {
  product: ProductCostingView;
  targetMargin: number;
  saving: boolean;
  onChange: (productId: string, patch: CostingPatch) => void;
  onOpenBreakdown: (product: ProductCostingView) => void;
  onSave: (product: ProductCostingView) => void;
}

/** Costo, precio, ganancia y margen de un producto, con precio sugerido (H1, H2, H4). */
export function ProductCostingRow({ product, targetMargin, saving, onChange, onOpenBreakdown, onSave }: ProductCostingRowProps) {
  const margin = calculateProductMargin(product.priceCop, product.costCop);
  const suggestedCop = suggestCommercialPriceCop(product.costCop, targetMargin, SUGGESTED_PRICE_ROUNDING_COP);
  const costId = `cost-${product.id}`;
  const priceId = `price-${product.id}`;

  return (
    <article className="card-boleto p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1 min-w-0 lg:max-w-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-subtle px-2 py-0.5 text-[11px] font-bold text-ink-muted">{product.categoryName}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${marginHealthClass(margin.health)}`}>
            {margin.healthLabel}
          </span>
        </div>
        <h3 className="font-display text-lg font-bold text-ink">{product.name}</h3>
        {product.costBreakdown.length > 0 && (
          <p className="text-xs text-profit font-semibold">✓ Calculado con {product.costBreakdown.length} insumo(s)</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center flex-1">
        <div>
          <label htmlFor={costId} className="block text-[11px] font-bold text-ink-muted mb-1">
            Costo unitario (COP)
          </label>
          <input
            id={costId}
            type="text"
            inputMode="numeric"
            value={formatCop(product.costCop, { withSymbol: false })}
            onChange={(e) => onChange(product.id, { costCop: parseCopInput(e.target.value) })}
            className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 py-1.5 font-mono-cop text-sm font-bold text-ink"
          />
        </div>
        <div>
          <label htmlFor={priceId} className="block text-[11px] font-bold text-ink-muted mb-1">
            Precio de venta (COP)
          </label>
          <input
            id={priceId}
            type="text"
            inputMode="numeric"
            value={formatCop(product.priceCop, { withSymbol: false })}
            onChange={(e) => onChange(product.id, { priceCop: parseCopInput(e.target.value) })}
            className="w-full min-h-[42px] rounded-xl border border-ink bg-paper px-3 py-1.5 font-mono-cop text-sm font-extrabold text-ink"
          />
        </div>
        <div className="rounded-xl border border-line bg-canvas p-2.5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted">Ganancia ($)</span>
          <span className={`font-mono-cop text-base font-extrabold ${margin.profitCop >= 0 ? 'text-profit' : 'text-danger'}`}>
            {formatCop(margin.profitCop)}
          </span>
        </div>
        <div className="rounded-xl border border-line bg-canvas p-2.5">
          <span className="block text-[10px] font-bold uppercase text-ink-muted">Margen (%)</span>
          <span className={`font-mono-cop text-base font-extrabold ${marginHealthTextClass(margin.health)}`}>
            {margin.marginPercent}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
        {product.costCop > 0 && suggestedCop !== product.priceCop && (
          <button
            type="button"
            onClick={() => onChange(product.id, { priceCop: suggestedCop })}
            title={`Aplicar precio sugerido para ganar ${targetMargin}%`}
            className="min-h-[40px] px-3 rounded-xl border border-warning bg-warning-soft text-xs font-bold text-warning inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Sugerido ({targetMargin}%): {formatCop(suggestedCop)}
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenBreakdown(product)}
          className="min-h-[40px] px-3 rounded-xl border border-ink bg-canvas text-xs font-bold text-ink hover:bg-subtle inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5 text-brand" />
          Insumos ({product.costBreakdown.length})
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(product)}
          aria-label={`Guardar costos de ${product.name}`}
          className="min-h-[40px] px-4 rounded-xl border-2 border-ink bg-brand text-xs font-extrabold text-paper shadow-stamp-2 hover:bg-brand-strong inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </article>
  );
}

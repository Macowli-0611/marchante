'use client';

import React, { useState } from 'react';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { BreakdownDialog } from './costing/breakdown-dialog';
import { MarginSummary } from './costing/margin-summary';
import { ProductCostingRow } from './costing/product-costing-row';
import type { CostingInitialData, ProductCostingView } from './costing/types';
import { useCosting } from './costing/use-costing';

export type { ProductCostingView } from './costing/types';

/** Costos y margen (/panel/costos). Las piezas viven en `./costing/`. */
export function CostingStudio({ initialData }: { initialData: CostingInitialData }) {
  const costing = useCosting(initialData);
  const [breakdownProduct, setBreakdownProduct] = useState<ProductCostingView | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <div className="card-boleto-strong p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">Rentabilidad por producto</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Costos y margen de ganancia</h1>
          <p className="text-sm text-ink-muted">
            Anota cuánto te cuesta hacer cada producto (de un golpe o desglosado por ingredientes) y mira cuánto te
            queda libre en pesos y en porcentaje.
          </p>
        </div>

        {/* Meta de margen del simulador (H4) */}
        <div className="rounded-2xl border-2 border-ink bg-canvas p-3.5 space-y-1 shrink-0">
          <label htmlFor="target-margin-range" className="text-xs font-bold text-ink flex items-center justify-between gap-3">
            <span>Meta de margen deseado:</span>
            <strong className="font-mono-cop text-sm text-brand">{costing.targetMargin}%</strong>
          </label>
          <input
            id="target-margin-range"
            type="range"
            min="15"
            max="75"
            step="5"
            value={costing.targetMargin}
            onChange={(e) => costing.setTargetMargin(Number(e.target.value))}
            className="w-48 accent-brand"
          />
          <p className="text-[11px] text-ink-muted">Calcula el precio sugerido en cada producto</p>
        </div>
      </div>

      <FeedbackBanner feedback={costing.feedback} />

      <MarginSummary {...costing.summary} />

      <div className="space-y-3">
        {costing.products.map((prod) => (
          <ProductCostingRow
            key={prod.id}
            product={prod}
            targetMargin={costing.targetMargin}
            saving={costing.savingId === prod.id}
            onChange={costing.updateLocal}
            onOpenBreakdown={setBreakdownProduct}
            onSave={(p) => costing.save(p)}
          />
        ))}
      </div>

      {breakdownProduct && (
        <BreakdownDialog
          product={breakdownProduct}
          onClose={() => setBreakdownProduct(null)}
          onApply={(lines) =>
            costing.save(breakdownProduct, {
              costCop: lines.reduce((acc, i) => acc + i.costCop, 0),
              costBreakdown: lines,
              useBreakdownSum: true,
            })
          }
        />
      )}
    </div>
  );
}

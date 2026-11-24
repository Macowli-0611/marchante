'use client';

import { useMemo, useState } from 'react';
import type { Feedback } from '@/components/ui/feedback-banner';
import type { CostBreakdownItem } from '@/db/schema';
import { calculateProductMargin, formatCop, suggestCommercialPriceCop } from '@/modules/shared/currency';
import type { CostingInitialData, CostingPatch, ProductCostingView } from './types';

/** Redondeo comercial del precio sugerido (a los $500 más cercanos). */
export const SUGGESTED_PRICE_ROUNDING_COP = 500;

/** Costos, precio y margen por producto (H1..H4) con edición en vivo y guardado. */
export function useCosting(initialData: CostingInitialData) {
  const [products, setProducts] = useState(initialData.products);
  const [targetMargin, setTargetMargin] = useState(initialData.targetMarginPercent);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const summary = useMemo(() => {
    const margins = products.map((p) => ({ p, m: calculateProductMargin(p.priceCop, p.costCop) }));
    const withCost = margins.filter(({ p }) => p.costCop > 0);
    const avg =
      withCost.length > 0
        ? Math.round((withCost.reduce((sum, { m }) => sum + m.marginPercent, 0) / withCost.length) * 10) / 10
        : 0;
    return {
      averageMarginPercent: avg,
      healthyCount: withCost.filter(({ m }) => m.health === 'healthy').length,
      lossCount: margins.filter(({ m }) => m.health === 'loss').length,
      missingCostCount: products.filter((p) => p.costCop === 0).length,
    };
  }, [products]);

  function updateLocal(productId: string, patch: CostingPatch) {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        const priceCop = patch.priceCop ?? item.priceCop;
        const costCop = patch.costCop ?? item.costCop;
        const m = calculateProductMargin(priceCop, costCop);
        return {
          ...item,
          priceCop,
          costCop,
          costBreakdown: patch.costBreakdown ?? item.costBreakdown,
          profitCop: m.profitCop,
          marginPercent: m.marginPercent,
          health: m.health,
          healthLabel: m.healthLabel,
          suggestedPriceCop: suggestCommercialPriceCop(costCop, targetMargin, SUGGESTED_PRICE_ROUNDING_COP),
        };
      }),
    );
  }

  async function save(
    prod: ProductCostingView,
    override?: { costCop?: number; costBreakdown?: CostBreakdownItem[]; useBreakdownSum?: boolean },
  ) {
    setSavingId(prod.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/panel/costing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: prod.id,
          priceCop: prod.priceCop,
          costCop: override?.costCop ?? prod.costCop,
          costBreakdown: override?.costBreakdown ?? prod.costBreakdown,
          useBreakdownSum: override?.useBreakdownSum ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo guardar el costo' });
        return;
      }
      updateLocal(prod.id, {
        priceCop: data.product.priceCop,
        costCop: data.product.costCop,
        costBreakdown: data.product.costBreakdown,
      });
      setFeedback({
        type: 'success',
        message: `Costos de "${prod.name}" guardados: ganas ${formatCop(data.margin.profitCop)} (${data.margin.marginPercent}%).`,
      });
    } finally {
      setSavingId(null);
    }
  }

  return { products, summary, targetMargin, setTargetMargin, savingId, feedback, updateLocal, save };
}

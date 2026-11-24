import type { CostBreakdownItem } from '@/db/schema';

export interface ProductCostingView {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  priceCop: number;
  costCop: number;
  costBreakdown: CostBreakdownItem[];
  profitCop: number;
  marginPercent: number;
  health: 'healthy' | 'tight' | 'low' | 'loss';
  healthLabel: string;
  suggestedPriceCop: number;
}

export interface CostingInitialData {
  targetMarginPercent: number;
  summary: {
    totalProducts: number;
    averageMarginPercent: number;
    healthyCount: number;
    tightOrLowCount: number;
    lossCount: number;
    missingCostCount: number;
  };
  products: ProductCostingView[];
}

export type CostingPatch = Partial<{ priceCop: number; costCop: number; costBreakdown: CostBreakdownItem[] }>;

import type { PeriodPreset } from '@/components/ui/period-selector';

export interface StatisticsPayload {
  period: {
    preset: PeriodPreset;
    label: string;
    comparisonLabel: string;
    fromYmd: string;
    toYmd: string;
  };
  overview: {
    salesCop: number;
    prevSalesCop: number;
    salesChangePercent: number | null;
    salesCount: number;
    grossProfitCop: number;
    expensesCop: number;
    extraIncomeCop: number;
    netProfitCop: number;
  };
  explanations: {
    timelineExplanation: string;
    topProductsExplanation: string;
    categoriesExplanation: string;
    paymentMethodsExplanation: string;
    topCustomersExplanation: string;
    peakHoursExplanation: string;
  };
  dailyTimeline: Array<{
    date: string;
    shortLabel: string;
    salesCop: number;
    grossProfitCop: number;
    expensesCop: number;
    profitCop: number;
  }>;
  topProducts: Array<{
    productId: string | null;
    productName: string;
    categoryName: string;
    unitsSold: number;
    revenueCop: number;
    profitCop: number;
    sharePercent: number;
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    unitsSold: number;
    revenueCop: number;
    profitCop: number;
    sharePercent: number;
  }>;
  paymentMethodBreakdown: Array<{
    methodCode: string;
    methodLabel: string;
    salesCount: number;
    totalCop: number;
    sharePercent: number;
  }>;
  topCustomers: Array<{
    customerId: string | null;
    customerName: string;
    purchasesCount: number;
    totalSpentCop: number;
  }>;
  peakHours: Array<{
    hour: number;
    label12h: string;
    salesCount: number;
    totalCop: number;
  }>;
}

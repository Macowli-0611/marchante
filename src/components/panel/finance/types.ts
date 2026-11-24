import type { PeriodPreset } from '@/components/ui/period-selector';

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
}

export interface ExpenseByCategorySummary {
  categoryName: string;
  totalCop: number;
  percent: number;
}

export interface LedgerEntryItem {
  id: string;
  entryType: 'SALE_INCOME' | 'EXTRA_INCOME' | 'EXPENSE';
  title: string;
  categoryLabel: string;
  amountCop: number;
  paymentMethod: string;
  businessDate: string;
  occurredAt: string | Date;
  canVoidFromFinance: boolean;
}

export type LedgerFilter = 'all' | 'sales' | 'extra_income' | 'expenses';
export type MovementKind = 'EXPENSE' | 'EXTRA_INCOME';

export interface LedgerData {
  period: { preset: PeriodPreset; label: string; fromYmd: string; toYmd: string };
  totals: {
    salesIncomeCop: number;
    salesCount: number;
    salesGrossProfitCop: number;
    extraIncomeCop: number;
    totalIncomeCop: number;
    expensesCop: number;
    expensesCount: number;
    productCostPurchasesCop?: number;
    operatingExpensesCop?: number;
    netCashBalanceCop: number;
    netProfitAfterExpensesCop: number;
  };
  expensesByCategory: ExpenseByCategorySummary[];
  categories: ExpenseCategoryItem[];
  entries: LedgerEntryItem[];
}

export interface MovementFormValues {
  kind: MovementKind;
  amountCop: number;
  categoryId: string;
  customCategoryName: string;
  paymentMethod: string;
  description: string;
}

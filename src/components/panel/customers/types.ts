export interface CustomerSummaryItem {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  notes: string;
  totalSpentCop: number;
  purchasesCount: number;
  lastPurchaseAt: string | Date | null;
  createdAt: string | Date;
}

export interface CustomerPurchaseItem {
  id: string;
  saleCode: string;
  source: 'QUICK_SALE' | 'CATALOG_ORDER';
  paymentMethod: string;
  totalCop: number;
  grossProfitCop: number;
  soldAt: string | Date;
  businessDate: string;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    unitPriceCop: number;
    lineTotalCop: number;
  }>;
}

export type CustomerSort = 'top_spent' | 'recent' | 'name';

export interface CustomerFormValues {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

export interface CustomerDetail {
  customer: CustomerSummaryItem;
  purchases: CustomerPurchaseItem[];
}

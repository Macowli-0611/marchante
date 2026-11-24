import type { PaymentMethodCode, PaymentMethodConfig } from '@/db/schema';

export interface QuickSaleProduct {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  priceCop: number;
  costCop: number;
  imageUrl: string | null;
  isSoldOut: boolean;
}

export interface PendingOrderView {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress: string;
  paymentMethod: PaymentMethodCode;
  notes: string;
  totalCop: number;
  createdAt: string | Date;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    unitPriceCop: number;
    lineTotalCop: number;
    notes: string;
  }>;
}

export interface TodaySaleView {
  id: string;
  saleCode: string;
  source: 'QUICK_SALE' | 'CATALOG_ORDER';
  paymentMethod: PaymentMethodCode;
  customerNameSnapshot: string | null;
  totalCop: number;
  totalCostCop: number;
  grossProfitCop: number;
  soldAt: string | Date;
  voidedAt: string | Date | null;
  voidReason: string | null;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    quantity: number;
    unitPriceCop: number;
    unitCostCop: number;
    lineTotalCop: number;
    lineProfitCop: number;
  }>;
}

export interface QuickCustomerOption {
  id: string;
  name: string;
  phone: string | null;
  totalSpentCop: number;
}

/** Línea del tiquete en curso; el precio unitario se puede editar al vuelo (E2). */
export interface QuickSaleLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCop: number;
  unitCostCop: number;
}

export interface QuickSaleInitialData {
  todayBogota: string;
  paymentMethods: PaymentMethodConfig[];
  categories: Array<{ id: string; name: string }>;
  products: QuickSaleProduct[];
  pendingOrders: PendingOrderView[];
  todaySales: TodaySaleView[];
  customers: QuickCustomerOption[];
}

export interface StampBanner {
  title: string;
  subtitle: string;
}

import type {
  CatalogBackgroundPreset,
  CatalogCardStyle,
  CatalogFontPreset,
  PaymentMethodConfig,
  SocialLinksConfig,
  WeeklyScheduleConfig,
} from '@/db/schema';

export interface PublicProductView {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceCop: number;
  isSoldOut: boolean;
}

export interface PublicCategoryView {
  id: string;
  name: string;
  sortOrder: number;
  products: PublicProductView[];
}

export interface PublicBusinessView {
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  description: string;
  category: string;
  whatsappPhone: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  schedule: WeeklyScheduleConfig;
  paymentMethods: PaymentMethodConfig[];
  socialLinks: SocialLinksConfig;
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string;
  backgroundPreset: CatalogBackgroundPreset;
  fontPreset: CatalogFontPreset;
  cardStyle: CatalogCardStyle;
}

export interface CartItem {
  cartLineId: string;
  productId: string;
  name: string;
  unitPriceCop: number;
  quantity: number;
  notes: string;
  imageUrl: string | null;
}

export interface ConfirmedOrderResult {
  orderCode: string;
  whatsappUrl: string;
  whatsappMessage: string;
  totalCop: number;
}

/** Apariencia que comparten las piezas de la vitrina (según el diseño del vendedor). */
export interface StorefrontTheme {
  brandColor: string;
  headingFont: string;
  isDark: boolean;
  /** Clases de superficie de las tarjetas según el fondo claro u oscuro. */
  cardSurfaceClass: string;
}

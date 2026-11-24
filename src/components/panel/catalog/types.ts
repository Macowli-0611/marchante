export interface CatalogCategoryItem {
  id: string;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface CatalogProductItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrl: string | null;
  priceCop: number;
  costCop: number;
  isHidden: boolean;
  isSoldOut: boolean;
  sortOrder: number;
}

export interface CatalogPagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ProductStatusFilter = 'all' | 'available' | 'sold_out' | 'hidden';

/** Datos que envía el formulario de producto (crear o editar). */
export interface ProductFormValues {
  categoryId: string;
  name: string;
  description: string;
  priceCop: number;
  costCop: number;
  imageUrl: string | null;
  isHidden: boolean;
  isSoldOut: boolean;
}

export type CategoryDialogState = { mode: 'create' | 'rename'; categoryId?: string; name: string };

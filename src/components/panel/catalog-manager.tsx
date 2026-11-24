'use client';

import React, { useState } from 'react';
import { FolderPlus, Package, Plus } from 'lucide-react';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Pagination } from '@/components/ui/pagination';
import { CatalogToolbar } from './catalog/catalog-toolbar';
import { CategoryDialog } from './catalog/category-dialog';
import { CategoryStrip } from './catalog/category-strip';
import { ProductAdminCard } from './catalog/product-admin-card';
import { ProductFormDialog } from './catalog/product-form-dialog';
import type {
  CatalogCategoryItem,
  CatalogPagination,
  CatalogProductItem,
  CategoryDialogState,
  ProductFormValues,
} from './catalog/types';
import { useCatalog } from './catalog/use-catalog';

export type { CatalogCategoryItem, CatalogProductItem } from './catalog/types';

interface CatalogManagerProps {
  initialCategories: CatalogCategoryItem[];
  initialProducts: CatalogProductItem[];
  initialPagination: CatalogPagination;
  businessSlug: string;
}

type ProductDialogState = { productId: string | null; values: ProductFormValues };

/** Administrador del catálogo (/panel/catalogo). Las piezas viven en `./catalog/`. */
export function CatalogManager({
  initialCategories,
  initialProducts,
  initialPagination,
  businessSlug,
}: CatalogManagerProps) {
  const catalog = useCatalog({
    categories: initialCategories,
    products: initialProducts,
    pagination: initialPagination,
  });
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState | null>(null);
  const [productDialog, setProductDialog] = useState<ProductDialogState | null>(null);

  function openNewProduct() {
    setProductDialog({
      productId: null,
      values: {
        categoryId:
          catalog.selectedCategoryId !== 'all' ? catalog.selectedCategoryId : catalog.categories[0]?.id || '',
        name: '',
        description: '',
        priceCop: 15000,
        costCop: 6000,
        imageUrl: null,
        isHidden: false,
        isSoldOut: false,
      },
    });
  }

  function openEditProduct(prod: CatalogProductItem) {
    setProductDialog({
      productId: prod.id,
      values: {
        categoryId: prod.categoryId,
        name: prod.name,
        description: prod.description,
        priceCop: prod.priceCop,
        costCop: prod.costCop,
        imageUrl: prod.imageUrl,
        isHidden: prod.isHidden,
        isSoldOut: prod.isSoldOut,
      },
    });
  }

  const hasFilters = Boolean(catalog.search) || catalog.statusFilter !== 'all';

  return (
    <div className="space-y-6 pb-20">
      <div className="card-boleto-strong p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">Vitrina /{businessSlug}</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Catálogo de productos y categorías</h1>
          <p className="text-sm text-ink-muted">
            Sube tus productos con foto optimizada, ordénalos por categoría y marca &ldquo;Agotado por
            hoy&rdquo; con un solo toque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCategoryDialog({ mode: 'create', name: '' })}
            className="min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-canvas text-xs sm:text-sm font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            <FolderPlus className="h-4 w-4 text-brand" />
            Nueva categoría
          </button>
          <button
            type="button"
            onClick={openNewProduct}
            className="min-h-[44px] px-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-brand text-xs sm:text-sm font-bold text-paper shadow-stamp-2 hover:bg-brand-strong cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo producto
          </button>
        </div>
      </div>

      <FeedbackBanner feedback={catalog.feedback} onDismiss={catalog.clearFeedback} />

      <CategoryStrip
        categories={catalog.categories}
        totalProducts={catalog.pagination.total}
        selectedCategoryId={catalog.selectedCategoryId}
        onSelect={catalog.changeCategory}
        onMove={catalog.moveCategory}
        onRename={setCategoryDialog}
        onArchive={catalog.archiveCategory}
      />

      <CatalogToolbar
        search={catalog.search}
        onSearchChange={catalog.changeSearch}
        status={catalog.statusFilter}
        onStatusChange={catalog.changeStatus}
      />

      {catalog.products.length === 0 ? (
        <div className="card-boleto p-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-soft border border-brand/30 flex items-center justify-center text-brand">
            <Package className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xl font-bold text-ink">Todavía no hay productos en esta vista</h3>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            {hasFilters
              ? 'Prueba limpiando el buscador o cambiando el filtro de estado.'
              : 'Anímate a subir tu primer producto con su precio en pesos y su foto para estrenar la vitrina.'}
          </p>
          <button
            type="button"
            onClick={openNewProduct}
            className="min-h-[44px] px-5 inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-brand text-sm font-bold text-paper shadow-stamp-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Crear producto ahora
          </button>
        </div>
      ) : (
        <div
          aria-busy={catalog.loadingList}
          className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${catalog.loadingList ? 'opacity-60' : ''}`}
        >
          {catalog.products.map((prod) => (
            <ProductAdminCard
              key={prod.id}
              product={prod}
              onToggle={catalog.quickToggle}
              onEdit={openEditProduct}
              onArchive={catalog.archiveProduct}
            />
          ))}
        </div>
      )}

      <Pagination
        page={catalog.pagination.page}
        totalPages={catalog.pagination.totalPages}
        onPageChange={catalog.goToPage}
      />

      {categoryDialog && (
        <CategoryDialog
          initial={categoryDialog}
          onClose={() => setCategoryDialog(null)}
          onSave={(state) => catalog.saveCategory(state.mode, state.name, state.categoryId)}
        />
      )}

      {productDialog && (
        <ProductFormDialog
          productId={productDialog.productId}
          initialValues={productDialog.values}
          categories={catalog.categories}
          onClose={() => setProductDialog(null)}
          onSave={catalog.saveProduct}
        />
      )}
    </div>
  );
}

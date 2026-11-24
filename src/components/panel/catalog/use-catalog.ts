'use client';

import { useState } from 'react';
import type { Feedback } from '@/components/ui/feedback-banner';
import type {
  CatalogCategoryItem,
  CatalogPagination,
  CatalogProductItem,
  ProductFormValues,
  ProductStatusFilter,
} from './types';

interface RefreshOptions {
  search?: string;
  categoryId?: string;
  status?: ProductStatusFilter;
  page?: number;
}

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok, data };
}

/**
 * Estado y acciones del administrador de catálogo (B1..B7): filtros, categorías,
 * productos y avisos. Los componentes visuales solo llaman estas funciones.
 */
export function useCatalog(initial: {
  categories: CatalogCategoryItem[];
  products: CatalogProductItem[];
  pagination: CatalogPagination;
}) {
  const [categories, setCategories] = useState(initial.categories);
  const [products, setProducts] = useState(initial.products);
  const [pagination, setPagination] = useState(initial.pagination);
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [loadingList, setLoadingList] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function refresh(opts?: RefreshOptions) {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        search: opts?.search ?? search,
        categoryId: opts?.categoryId ?? selectedCategoryId,
        status: opts?.status ?? statusFilter,
        page: String(opts?.page ?? pagination.page),
        pageSize: String(pagination.pageSize),
      });
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/panel/categories'),
        fetch(`/api/panel/products?${params.toString()}`),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();
      if (catRes.ok && catData.ok) setCategories(catData.categories);
      if (prodRes.ok && prodData.ok) {
        setProducts(prodData.items);
        setPagination(prodData.pagination);
      }
    } finally {
      setLoadingList(false);
    }
  }

  // ---------------------------------------------------------------- Filtros (B7)
  function changeSearch(value: string) {
    setSearch(value);
    refresh({ search: value, page: 1 });
  }
  function changeCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    refresh({ categoryId, page: 1 });
  }
  function changeStatus(status: ProductStatusFilter) {
    setStatusFilter(status);
    refresh({ status, page: 1 });
  }
  function goToPage(page: number) {
    refresh({ page });
  }

  // ------------------------------------------------------------- Categorías (B1)
  async function saveCategory(mode: 'create' | 'rename', name: string, categoryId?: string) {
    setFeedback(null);
    const isCreate = mode === 'create';
    const { ok, data } = await sendJson(
      '/api/panel/categories',
      isCreate ? 'POST' : 'PATCH',
      isCreate ? { name } : { categoryId, name },
    );
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo guardar la categoría' });
      return false;
    }
    setFeedback({ type: 'success', message: isCreate ? '¡Categoría creada!' : '¡Categoría renombrada!' });
    await refresh();
    return true;
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved!);
    setCategories(reordered);
    await sendJson('/api/panel/categories', 'PATCH', { orderedCategoryIds: reordered.map((c) => c.id) });
  }

  async function archiveCategory(cat: CatalogCategoryItem) {
    setFeedback(null);
    const { ok, data } = await sendJson(`/api/panel/categories?id=${cat.id}`, 'DELETE');
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo eliminar la categoría' });
      return;
    }
    if (selectedCategoryId === cat.id) setSelectedCategoryId('all');
    setFeedback({ type: 'success', message: `Categoría "${cat.name}" eliminada.` });
    await refresh({ categoryId: 'all' });
  }

  // -------------------------------------------------------------- Productos (B2..B6)
  async function saveProduct(values: ProductFormValues, productId: string | null) {
    setFeedback(null);
    if (!values.categoryId) {
      setFeedback({ type: 'error', message: 'Primero crea o elige una categoría para tu producto.' });
      return false;
    }
    const isEdit = Boolean(productId);
    const { ok, data } = await sendJson('/api/panel/products', isEdit ? 'PUT' : 'POST', {
      ...(isEdit ? { productId } : {}),
      ...values,
    });
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo guardar el producto' });
      return false;
    }
    setFeedback({
      type: 'success',
      message: isEdit
        ? `¡"${values.name}" actualizado en tu vitrina!`
        : `¡"${values.name}" publicado en tu catálogo!`,
    });
    await refresh();
    return true;
  }

  /** Cambio de 1 toque (B4/B5) con actualización optimista. */
  async function quickToggle(prod: CatalogProductItem, patch: { isHidden?: boolean; isSoldOut?: boolean }) {
    setProducts((prev) => prev.map((item) => (item.id === prod.id ? { ...item, ...patch } : item)));
    const { ok } = await sendJson('/api/panel/products', 'PATCH', { productId: prod.id, ...patch });
    if (!ok) await refresh();
  }

  async function archiveProduct(prod: CatalogProductItem) {
    setFeedback(null);
    const { ok, data } = await sendJson(`/api/panel/products?id=${prod.id}`, 'DELETE');
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo archivar el producto' });
      return;
    }
    setFeedback({
      type: 'success',
      message: `"${prod.name}" fue archivado y retirado de la vitrina (sus ventas históricas se conservan intactas).`,
    });
    await refresh();
  }

  return {
    categories,
    products,
    pagination,
    search,
    selectedCategoryId,
    statusFilter,
    loadingList,
    feedback,
    clearFeedback: () => setFeedback(null),
    changeSearch,
    changeCategory,
    changeStatus,
    goToPage,
    saveCategory,
    moveCategory,
    archiveCategory,
    saveProduct,
    quickToggle,
    archiveProduct,
  };
}

export type CatalogState = ReturnType<typeof useCatalog>;

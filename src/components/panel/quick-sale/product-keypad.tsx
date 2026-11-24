'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { formatCop } from '@/modules/shared/currency';
import type { QuickSaleLine, QuickSaleProduct } from './types';

interface ProductKeypadProps {
  products: QuickSaleProduct[];
  categories: Array<{ id: string; name: string }>;
  lines: QuickSaleLine[];
  onTap: (product: QuickSaleProduct) => void;
}

/** Teclado táctil de productos: cada toque suma una unidad al tiquete (E2). */
export function ProductKeypad({ products, categories, lines, onTap }: ProductKeypadProps) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) => (categoryId === 'all' || p.categoryId === categoryId) && (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, categoryId, search]);

  return (
    <section className="lg:col-span-7 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Buscar producto para vender"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto para vender..."
            className="w-full min-h-[44px] rounded-xl border border-line bg-paper pl-10 pr-4 py-2 text-sm text-ink"
          />
        </div>

        {categories.length > 1 && (
          <select
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-line bg-paper px-3 py-2 text-xs font-bold text-ink"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="text-xs font-semibold text-ink-muted">
        1. Toca un producto para sumarlo a la venta (tócalo varias veces para más unidades):
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filtered.map((prod) => {
          const inTicket = lines.find((l) => l.productId === prod.id);
          return (
            <button
              key={prod.id}
              type="button"
              onClick={() => onTap(prod)}
              className={`min-h-[96px] p-3 rounded-2xl border-2 text-left flex flex-col justify-between gap-2 transition-all cursor-pointer active:scale-[0.98] ${
                inTicket ? 'border-ink bg-brand-soft shadow-stamp-2' : 'border-line bg-paper hover:border-ink'
              }`}
            >
              <div className="flex items-start justify-between gap-1.5 w-full">
                <span className="font-display text-sm font-bold text-ink line-clamp-2 leading-snug">{prod.name}</span>
                {inTicket && (
                  <span className="h-6 min-w-[24px] px-1.5 rounded-full bg-brand text-paper font-mono-cop text-xs font-extrabold flex items-center justify-center shrink-0">
                    ×{inTicket.quantity}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between w-full pt-1">
                <span className="font-mono-cop text-sm font-extrabold text-ink">{formatCop(prod.priceCop)}</span>
                <span className="text-[11px] font-bold text-brand">+ Sumar</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

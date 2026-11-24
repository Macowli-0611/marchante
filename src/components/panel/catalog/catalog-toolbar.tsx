import React from 'react';
import { Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { ProductStatusFilter } from './types';

const STATUS_OPTIONS: Array<{ id: ProductStatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'available', label: 'Disponibles' },
  { id: 'sold_out', label: 'Agotados' },
  { id: 'hidden', label: 'Ocultos' },
];

interface CatalogToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: ProductStatusFilter;
  onStatusChange: (status: ProductStatusFilter) => void;
}

/** Buscador y filtro por estado del catálogo (B7). */
export function CatalogToolbar({ search, onSearchChange, status, onStatusChange }: CatalogToolbarProps) {
  return (
    <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div className="relative flex-1 sm:max-w-md">
        <Search className="h-4 w-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          aria-label="Buscar producto"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar producto por nombre o descripción..."
          className="w-full min-h-[44px] rounded-xl border border-line bg-paper pl-10 pr-4 py-2 text-sm text-ink"
        />
      </div>
      <SegmentedControl label="Filtrar por estado" options={STATUS_OPTIONS} value={status} onChange={onStatusChange} />
    </section>
  );
}

import React from 'react';
import { Search } from 'lucide-react';
import type { PublicCategoryView } from './types';

interface CatalogFiltersProps {
  businessName: string;
  categories: PublicCategoryView[];
  search: string;
  onSearchChange: (value: string) => void;
  activeCategoryId: string;
  onCategoryChange: (id: string) => void;
  brandColor: string;
}

/** Búsqueda y pestañas de categorías (C2). */
export function CatalogFilters({
  businessName,
  categories,
  search,
  onSearchChange,
  activeCategoryId,
  onCategoryChange,
  brandColor,
}: CatalogFiltersProps) {
  const chips = [{ id: 'all', name: 'Todos' }, ...categories.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-5 space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Buscar en ${businessName}...`}
          className="w-full min-h-[44px] rounded-xl border border-ink bg-paper pl-10 pr-4 py-2 text-sm text-ink shadow-stamp-2"
        />
      </div>

      {categories.length > 1 && (
        <div
          role="tablist"
          aria-label="Categorías del catálogo"
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {chips.map((chip) => {
            const selected = activeCategoryId === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onCategoryChange(chip.id)}
                style={selected ? { backgroundColor: brandColor, color: 'var(--color-paper)' } : undefined}
                className={`min-h-[40px] px-4 rounded-xl border border-ink text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                  selected ? 'shadow-stamp-2' : 'bg-paper text-ink'
                }`}
              >
                {chip.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

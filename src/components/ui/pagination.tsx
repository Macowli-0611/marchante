import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Paginación simple Anterior / Siguiente. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const buttonClass =
    'min-h-[42px] px-4 rounded-xl border border-ink bg-paper text-xs font-bold text-ink disabled:opacity-40 cursor-pointer';
  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3 pt-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>
        ← Anterior
      </button>
      <span className="text-xs font-bold text-ink-muted">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={buttonClass}
      >
        Siguiente →
      </button>
    </nav>
  );
}

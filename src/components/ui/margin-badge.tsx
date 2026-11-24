import React from 'react';
import { calculateProductMargin, formatCop } from '@/modules/shared/currency';

/** Clases de color según la salud del margen (sano, bajo o pérdida). */
export function marginHealthClass(health: ReturnType<typeof calculateProductMargin>['health']): string {
  if (health === 'healthy') return 'bg-profit-soft text-profit';
  if (health === 'loss') return 'bg-danger-soft text-danger';
  return 'bg-warning-soft text-warning';
}

/** Píldora "Ganancia: $ X (Y%)" calculada desde precio y costo. */
export function MarginBadge({ priceCop, costCop }: { priceCop: number; costCop: number }) {
  const margin = calculateProductMargin(priceCop, costCop);
  return (
    <span className={`text-xs font-mono-cop font-bold px-2 py-0.5 rounded-full ${marginHealthClass(margin.health)}`}>
      Ganancia: {formatCop(margin.profitCop)} ({margin.marginPercent}%)
    </span>
  );
}

/** Solo el color de texto según la salud del margen. */
export function marginHealthTextClass(health: ReturnType<typeof calculateProductMargin>['health']): string {
  if (health === 'healthy') return 'text-profit';
  if (health === 'loss') return 'text-danger';
  return 'text-warning';
}

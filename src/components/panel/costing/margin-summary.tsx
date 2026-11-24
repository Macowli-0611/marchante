import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface MarginSummaryProps {
  averageMarginPercent: number;
  healthyCount: number;
  missingCostCount: number;
  lossCount: number;
}

/** Cuatro indicadores de la salud de los márgenes. */
export function MarginSummary(s: MarginSummaryProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="card-boleto p-4">
        <span className="text-xs font-bold text-ink-muted">Margen promedio</span>
        <p className="mt-1 font-mono-cop text-2xl font-extrabold text-ink">{s.averageMarginPercent}%</p>
        <p className="text-[11px] text-ink-muted">Sobre el precio de venta</p>
      </div>
      <div className="card-boleto p-4">
        <span className="text-xs font-bold text-profit flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" /> Buen margen (≥ 30%)
        </span>
        <p className="mt-1 font-mono-cop text-2xl font-extrabold text-profit">{s.healthyCount}</p>
        <p className="text-[11px] text-ink-muted">Productos saludables</p>
      </div>
      <div className="card-boleto p-4">
        <span className="text-xs font-bold text-warning">Sin costo anotado</span>
        <p className="mt-1 font-mono-cop text-2xl font-extrabold text-warning">{s.missingCostCount}</p>
        <p className="text-[11px] text-ink-muted">Ponles costo abajo</p>
      </div>
      <div className="card-boleto p-4">
        <span className="text-xs font-bold text-danger flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" /> En pérdida
        </span>
        <p className="mt-1 font-mono-cop text-2xl font-extrabold text-danger">{s.lossCount}</p>
        <p className="text-[11px] text-ink-muted">Costo mayor al precio</p>
      </div>
    </div>
  );
}

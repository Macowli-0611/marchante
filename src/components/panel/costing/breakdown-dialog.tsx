'use client';

import React, { useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import type { CostBreakdownItem } from '@/db/schema';
import { formatCop, parseCopInput } from '@/modules/shared/currency';
import type { ProductCostingView } from './types';

interface BreakdownDialogProps {
  product: ProductCostingView;
  onClose: () => void;
  /** Guarda el costo como la suma de los insumos. */
  onApply: (lines: CostBreakdownItem[]) => Promise<void>;
}

/** Calculadora de receta: el costo unitario es la suma de ingredientes y empaques (H3). */
export function BreakdownDialog({ product, onClose, onApply }: BreakdownDialogProps) {
  const [lines, setLines] = useState<CostBreakdownItem[]>(product.costBreakdown || []);
  const [name, setName] = useState('');
  const [costCop, setCostCop] = useState(1000);
  const totalCop = lines.reduce((acc, i) => acc + i.costCop, 0);

  function addLine(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLines((prev) => [
      ...prev,
      { id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), costCop },
    ]);
    setName('');
    setCostCop(1000);
  }

  return (
    <Dialog labelledBy="bd-modal-title" onClose={onClose} placement="center">
      <div className="card-boleto-strong w-full max-w-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-line pb-3">
          <div>
            <span className="text-xs font-bold text-brand flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5" /> Calculadora de receta / insumos
            </span>
            <h2 id="bd-modal-title" className="font-display text-xl font-bold text-ink">
              {product.name}
            </h2>
          </div>
          <CloseButton label="Cerrar calculadora" onClick={onClose} />
        </div>

        <form onSubmit={addLine} className="grid sm:grid-cols-12 gap-2">
          <input
            type="text"
            aria-label="Nombre del ingrediente o insumo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ingrediente o insumo (ej. Queso, Caja, Bolsa)"
            className="sm:col-span-6 min-h-[42px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs"
          />
          <input
            type="text"
            inputMode="numeric"
            aria-label="Costo del insumo en pesos"
            value={formatCop(costCop, { withSymbol: false })}
            onChange={(e) => setCostCop(parseCopInput(e.target.value))}
            placeholder="Costo ($)"
            className="sm:col-span-3 min-h-[42px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-mono-cop font-bold"
          />
          <button
            type="submit"
            className="sm:col-span-3 min-h-[42px] rounded-xl border border-ink bg-ink text-xs font-bold text-paper inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Sumar
          </button>
        </form>

        {lines.length === 0 ? (
          <p className="text-xs text-ink-muted text-center py-4">
            Agrega cada ingrediente o empaque arriba para sumar el costo unitario exacto.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-canvas overflow-hidden">
            {lines.map((line) => (
              <li key={line.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-ink">{line.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono-cop font-extrabold">{formatCop(line.costCop)}</span>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((i) => i.id !== line.id))}
                    aria-label={`Quitar ${line.name}`}
                    className="text-danger cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl border border-ink bg-canvas p-3.5 flex items-center justify-between">
          <span className="text-xs font-bold text-ink">Costo unitario total calculado:</span>
          <span className="font-mono-cop text-lg font-extrabold text-ink">{formatCop(totalCop)}</span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 rounded-xl border border-line bg-paper text-xs font-bold text-ink-muted cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              await onApply(lines);
              onClose();
            }}
            className="min-h-[42px] px-5 rounded-xl border-2 border-ink bg-profit text-xs font-extrabold text-paper shadow-stamp-2 cursor-pointer"
          >
            Usar este costo y guardar
          </button>
        </div>
      </div>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { formatCop, parseCopInput } from '@/modules/shared/currency';
import type { ExpenseCategoryItem, MovementFormValues, MovementKind } from './types';

interface MovementDialogProps {
  kind: MovementKind;
  categories: ExpenseCategoryItem[];
  onClose: () => void;
  onSave: (values: MovementFormValues) => Promise<boolean>;
  onCreateCategory: (name: string, isProductCost: boolean) => Promise<string | null>;
}

const LABEL = 'block text-xs font-bold text-ink mb-1';
const SELECT = 'w-full min-h-[44px] rounded-xl border border-line bg-paper px-3 py-2 text-sm font-bold text-ink';

/** Registrar un gasto (G1, con categoría propia G2) o un ingreso extra (G3). */
export function MovementDialog({ kind, categories, onClose, onSave, onCreateCategory }: MovementDialogProps) {
  const isExpense = kind === 'EXPENSE';
  const [values, setValues] = useState<MovementFormValues>({
    kind,
    amountCop: isExpense ? 25000 : 50000,
    categoryId: categories[0]?.id || '',
    customCategoryName: isExpense ? '' : 'Encargo especial / Otro ingreso',
    paymentMethod: 'cash',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIsProductCost, setNewCategoryIsProductCost] = useState(false);

  function set<K extends keyof MovementFormValues>(key: K, value: MovementFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateCategory() {
    const id = await onCreateCategory(newCategoryName, newCategoryIsProductCost);
    if (id) {
      setNewCategoryName('');
      setNewCategoryIsProductCost(false);
      setShowNewCategory(false);
      set('categoryId', id);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (await onSave(values)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog labelledBy="mov-modal-title" onClose={onClose} placement="center">
      <div className="card-boleto-strong w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-3">
          <h2 id="mov-modal-title" className="font-display text-xl font-bold text-ink">
            {isExpense ? 'Registrar un gasto del negocio' : 'Registrar un ingreso extra'}
          </h2>
          <CloseButton label="Cerrar ventana" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mov-amount" className={LABEL}>
              Monto en pesos (COP) *
            </label>
            <input
              id="mov-amount"
              type="text"
              inputMode="numeric"
              required
              value={formatCop(values.amountCop, { withSymbol: false })}
              onChange={(e) => set('amountCop', parseCopInput(e.target.value))}
              className="w-full min-h-[48px] rounded-xl border-2 border-ink bg-paper px-3.5 py-2 text-xl font-mono-cop font-extrabold text-ink"
            />
          </div>

          {isExpense ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="mov-cat" className="text-xs font-bold text-ink">
                  Categoría del gasto *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory((v) => !v)}
                  aria-expanded={showNewCategory}
                  className="text-xs font-bold text-brand inline-flex items-center gap-1 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  + Crear categoría
                </button>
              </div>

              {showNewCategory && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      aria-label="Nombre de la nueva categoría de gasto"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ej. Gas propano, Mantenimiento..."
                      className="flex-1 min-h-[40px] rounded-xl border border-line bg-canvas px-3 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="min-h-[40px] px-3 rounded-xl border border-ink bg-ink text-xs font-bold text-paper cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-ink-muted">
                    <input
                      type="checkbox"
                      checked={newCategoryIsProductCost}
                      onChange={(e) => setNewCategoryIsProductCost(e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    Es compra de insumos o empaques (ya va dentro del costo de mis productos)
                  </label>
                </div>
              )}

              <select id="mov-cat" value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={SELECT}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="mov-extra-cat" className={LABEL}>
                Tipo de ingreso extra
              </label>
              <input
                id="mov-extra-cat"
                type="text"
                value={values.customCategoryName}
                onChange={(e) => set('customCategoryName', e.target.value)}
                placeholder="Ej. Encargo especial, taller, aporte..."
                className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-sm text-ink"
              />
            </div>
          )}

          <div>
            <label htmlFor="mov-desc" className={LABEL}>
              ¿En qué consistió? (Descripción) *
            </label>
            <input
              id="mov-desc"
              type="text"
              required
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={
                isExpense
                  ? 'Ej. Bulto de harina, cajas de cartón, carrera en moto...'
                  : 'Ej. Servicio de catering cumpleaños...'
              }
              className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="mov-pm" className={LABEL}>
              ¿Con qué medio se pagó / recibió?
            </label>
            <select id="mov-pm" value={values.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={SELECT}>
              <option value="cash">Efectivo</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="transfer">Transferencia Bancaria</option>
              <option value="breb">Llave Bre-B</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-line bg-paper text-xs font-bold text-ink-muted cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`min-h-[44px] px-5 rounded-xl border-2 border-ink text-xs font-extrabold text-paper shadow-stamp-2 cursor-pointer ${
                isExpense ? 'bg-brand' : 'bg-profit'
              }`}
            >
              {saving ? 'Guardando...' : isExpense ? 'Guardar gasto' : 'Guardar ingreso extra'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

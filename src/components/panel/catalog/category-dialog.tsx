'use client';

import React, { useState } from 'react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import type { CategoryDialogState } from './types';

interface CategoryDialogProps {
  initial: CategoryDialogState;
  onClose: () => void;
  /** Devuelve true si se guardó (entonces se cierra). */
  onSave: (state: CategoryDialogState) => Promise<boolean>;
}

/** Crear o renombrar una categoría (B1). */
export function CategoryDialog({ initial, onClose, onSave }: CategoryDialogProps) {
  const [name, setName] = useState(initial.name);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (await onSave({ ...initial, name })) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog labelledBy="cat-modal-title" onClose={onClose} placement="center">
      <div className="card-boleto-strong w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="cat-modal-title" className="font-display text-xl font-bold text-ink">
            {initial.mode === 'create' ? 'Crear nueva categoría' : 'Renombrar categoría'}
          </h2>
          <CloseButton label="Cerrar ventana" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cat-name-input" className="block text-sm font-semibold text-ink mb-1.5">
              Nombre de la categoría
            </label>
            <input
              id="cat-name-input"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Tortas frías, Bebidas calientes, Combos..."
              className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-line bg-paper text-sm font-bold text-ink-muted cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-xl border-2 border-ink bg-brand text-sm font-bold text-paper shadow-stamp-2 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar categoría'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

'use client';

import React, { useState } from 'react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import type { CustomerFormValues } from './types';

interface CustomerFormDialogProps {
  customerId: string | null;
  initialValues: CustomerFormValues;
  onClose: () => void;
  onSave: (values: CustomerFormValues, customerId: string | null) => Promise<boolean>;
}

const LABEL = 'block text-xs font-bold text-ink mb-1';
const INPUT = 'w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-sm text-ink';

/** Anotar o editar un cliente (F2). */
export function CustomerFormDialog({ customerId, initialValues, onClose, onSave }: CustomerFormDialogProps) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof CustomerFormValues, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (await onSave(values, customerId)) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog labelledBy="cust-form-title" onClose={onClose} placement="center">
      <div className="card-boleto-strong w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-3">
          <h2 id="cust-form-title" className="font-display text-xl font-bold text-ink">
            {customerId ? 'Editar ficha del cliente' : 'Anotar nuevo cliente'}
          </h2>
          <CloseButton label="Cerrar ventana" onClick={onClose} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="c-name" className={LABEL}>
              Nombre completo o apodo *
            </label>
            <input
              id="c-name"
              type="text"
              required
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej. Doña Gloria (Vecina del 302)"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="c-phone" className={LABEL}>
              Celular / WhatsApp
            </label>
            <input
              id="c-phone"
              type="tel"
              value={values.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="Ej. 310 555 6677"
              className={`${INPUT} font-mono-cop`}
            />
          </div>
          <div>
            <label htmlFor="c-address" className={LABEL}>
              Dirección habitual de entrega
            </label>
            <input
              id="c-address"
              type="text"
              value={values.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Ej. Carrera 12 # 4-50, Barrio San Antonio"
              className={INPUT}
            />
          </div>
          <div>
            <label htmlFor="c-notes" className={LABEL}>
              Notas (gustos, preferencias, cómo paga)
            </label>
            <textarea
              id="c-notes"
              rows={3}
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Ej. Le encanta la torta sin azúcar, pide los viernes por la tarde y paga por Nequi."
              className="w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink"
            />
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
              className="min-h-[44px] px-5 rounded-xl border-2 border-ink bg-brand text-xs font-extrabold text-paper shadow-stamp-2 cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

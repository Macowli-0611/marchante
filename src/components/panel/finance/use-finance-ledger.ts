'use client';

import { useState } from 'react';
import type { Feedback } from '@/components/ui/feedback-banner';
import type { PeriodPreset } from '@/components/ui/period-selector';
import { formatCop } from '@/modules/shared/currency';
import type { LedgerData, LedgerEntryItem, LedgerFilter, MovementFormValues } from './types';

async function sendJson(method: string, body: unknown) {
  const res = await fetch('/api/panel/finance', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok, data };
}

/** Libro de gastos e ingresos (G1..G4): periodo, filtros, registro y anulación. */
export function useFinanceLedger(initialData: LedgerData) {
  const [ledger, setLedger] = useState(initialData);
  const [period, setPeriod] = useState<PeriodPreset>(initialData.period.preset);
  const [range, setRange] = useState({ fromYmd: initialData.period.fromYmd, toYmd: initialData.period.toYmd });
  const [filterKind, setFilterKind] = useState<LedgerFilter>('all');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function refresh(opts?: { period?: PeriodPreset; filterKind?: LedgerFilter; fromYmd?: string; toYmd?: string }) {
    setLoading(true);
    const p = opts?.period ?? period;
    try {
      const params = new URLSearchParams({
        period: p,
        filterKind: opts?.filterKind ?? filterKind,
        ...(p === 'custom'
          ? { fromYmd: opts?.fromYmd ?? range.fromYmd, toYmd: opts?.toYmd ?? range.toYmd }
          : {}),
      });
      const res = await fetch(`/api/panel/finance?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.ok) setLedger(data);
    } finally {
      setLoading(false);
    }
  }

  function changePeriod(next: PeriodPreset, customRange?: { fromYmd: string; toYmd: string }) {
    setPeriod(next);
    if (customRange) setRange(customRange);
    refresh({ period: next, ...customRange });
  }

  function changeFilter(next: LedgerFilter) {
    setFilterKind(next);
    refresh({ filterKind: next });
  }

  async function saveMovement(values: MovementFormValues): Promise<boolean> {
    setFeedback(null);
    const isExpense = values.kind === 'EXPENSE';
    const { ok, data } = await sendJson('POST', {
      kind: values.kind,
      categoryId: isExpense ? values.categoryId || null : null,
      customCategoryName: isExpense ? undefined : values.customCategoryName,
      amountCop: values.amountCop,
      paymentMethod: values.paymentMethod,
      description: values.description,
    });
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo guardar' });
      return false;
    }
    setFeedback({
      type: 'success',
      message: isExpense
        ? `Gasto de ${formatCop(values.amountCop)} registrado.`
        : `Ingreso extra de ${formatCop(values.amountCop)} registrado.`,
    });
    await refresh();
    return true;
  }

  /** Devuelve el id de la categoría creada, o null si falló. */
  async function createCategory(name: string, isProductCost: boolean): Promise<string | null> {
    if (!name.trim()) return null;
    const { ok, data } = await sendJson('POST', { action: 'create_category', name, isProductCost });
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'Error al crear categoría' });
      return null;
    }
    await refresh();
    return data.category.id as string;
  }

  async function voidEntry(entry: LedgerEntryItem) {
    const { ok, data } = await sendJson('PATCH', {
      movementId: entry.id,
      reason: 'Anulado por corrección del vendedor',
    });
    if (!ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo anular el movimiento' });
      return;
    }
    setFeedback({ type: 'success', message: `Movimiento "${entry.title}" anulado.` });
    await refresh();
  }

  return {
    ledger,
    period,
    filterKind,
    loading,
    feedback,
    changePeriod,
    changeFilter,
    saveMovement,
    createCategory,
    voidEntry,
  };
}

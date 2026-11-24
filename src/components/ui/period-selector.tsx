'use client';

import React, { useState } from 'react';
import { SegmentedControl } from './segmented-control';

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

interface PeriodSelectorProps {
  value: PeriodPreset;
  /** Se llama al elegir Hoy / Semana / Mes, o al aplicar un rango. */
  onChange: (period: PeriodPreset, range?: { fromYmd: string; toYmd: string }) => void;
  initialFromYmd: string;
  initialToYmd: string;
  customLabel?: string;
  applyLabel?: string;
}

/** Filtro de periodo en hora de Bogotá con rango de fechas personalizado. */
export function PeriodSelector({
  value,
  onChange,
  initialFromYmd,
  initialToYmd,
  customLabel = 'Fechas',
  applyLabel = 'Aplicar',
}: PeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');
  const [fromYmd, setFromYmd] = useState(initialFromYmd);
  const [toYmd, setToYmd] = useState(initialToYmd);

  const options = [
    { id: 'today' as const, label: 'Hoy' },
    { id: 'week' as const, label: 'Esta semana' },
    { id: 'month' as const, label: 'Este mes' },
    { id: 'custom' as const, label: customLabel },
  ];

  const dateClass = 'min-h-[40px] rounded-xl border border-line bg-paper px-3 py-1 text-xs font-mono-cop font-bold';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        label="Periodo"
        options={options}
        value={showCustom ? 'custom' : value}
        onChange={(next) => {
          setShowCustom(next === 'custom');
          if (next !== 'custom') onChange(next);
        }}
      />

      {showCustom && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Fecha desde"
            value={fromYmd}
            onChange={(e) => setFromYmd(e.target.value)}
            className={dateClass}
          />
          <span className="text-xs text-ink-muted">a</span>
          <input
            type="date"
            aria-label="Fecha hasta"
            value={toYmd}
            onChange={(e) => setToYmd(e.target.value)}
            className={dateClass}
          />
          <button
            type="button"
            onClick={() => onChange('custom', { fromYmd, toYmd })}
            className="min-h-[40px] px-3.5 rounded-xl border border-ink bg-ink text-xs font-bold text-paper cursor-pointer"
          >
            {applyLabel}
          </button>
        </div>
      )}
    </div>
  );
}

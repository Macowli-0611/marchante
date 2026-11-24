'use client';

import { useState } from 'react';
import type { PeriodPreset } from '@/components/ui/period-selector';
import type { StatisticsPayload } from './types';

/** Estadísticas del periodo elegido en hora de Bogotá (J1). */
export function useStatistics(initialStats: StatisticsPayload) {
  const [stats, setStats] = useState(initialStats);
  const [period, setPeriod] = useState<PeriodPreset>(initialStats.period.preset);
  const [loading, setLoading] = useState(false);

  async function changePeriod(next: PeriodPreset, range?: { fromYmd: string; toYmd: string }) {
    setPeriod(next);
    setLoading(true);
    try {
      const params = new URLSearchParams({ period: next, ...(next === 'custom' && range ? range : {}) });
      const res = await fetch(`/api/panel/statistics?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.ok) setStats(data);
    } finally {
      setLoading(false);
    }
  }

  return { stats, period, loading, changePeriod };
}

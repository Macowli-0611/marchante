'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLOR } from '@/components/ui/color-tokens';
import { formatCop } from '@/modules/shared/currency';
import type { StatisticsPayload } from './types';

/** Barras diarias de ventas, ganancia de productos y gastos (J2, J3). */
export function SalesTimelineChart({ stats }: { stats: StatisticsPayload }) {
  return (
    <section className="card-boleto p-5 space-y-4">
      <div className="space-y-1 border-b border-dashed border-line pb-3">
        <h2 className="font-display text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand" />
          Ventas, ganancias y gastos por día
        </h2>
        <p id="timeline-explanation" className="rounded-xl bg-canvas border border-line px-3.5 py-2 text-sm font-semibold text-ink">
          💡 {stats.explanations.timelineExplanation}
        </p>
      </div>

      <div className="h-64 w-full" role="img" aria-describedby="timeline-explanation" aria-label="Gráfica de barras por día">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.dailyTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLOR.line} />
            <XAxis dataKey="shortLabel" tick={{ fill: COLOR.inkMuted, fontSize: 12 }} />
            <YAxis
              tick={{ fill: COLOR.inkMuted, fontSize: 11 }}
              tickFormatter={(val) => `$${Math.round(Number(val) / 1000)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCop(Number(value)), name]}
              contentStyle={{ backgroundColor: COLOR.paper, borderColor: COLOR.ink, borderRadius: '12px', fontSize: '12px' }}
            />
            <Bar dataKey="salesCop" name="Ventas" fill={COLOR.ink} radius={[6, 6, 0, 0]} />
            <Bar dataKey="grossProfitCop" name="Ganancia productos" fill={COLOR.profit} radius={[6, 6, 0, 0]} />
            <Bar dataKey="expensesCop" name="Gastos" fill={COLOR.brand} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

import React from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { DAY_LABELS_ES, ORDERED_DAY_KEYS } from '@/modules/shared/bogota-time';
import type { BusinessProfileState } from './use-business-profile';

const TIME_INPUT =
  'min-h-[42px] rounded-xl border border-line bg-canvas px-3 py-1.5 text-sm font-mono-cop font-bold text-ink';

/** Pestaña 3: horario por día, con días cerrados (A4). */
export function ScheduleSection({ profile }: { profile: BusinessProfileState }) {
  const { values, updateDay, copyMondayToWeekdays } = profile;

  return (
    <SectionCard
      title="Horarios de apertura y cierre"
      description={
        <>
          Calculados siempre con la hora oficial de Colombia (<code>America/Bogota</code>).
        </>
      }
      actions={
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-canvas text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
        >
          Copiar lunes a lun–vie
        </button>
      }
    >
      <div className="divide-y divide-line rounded-2xl border border-line bg-paper overflow-hidden">
        {ORDERED_DAY_KEYS.map((dayKey) => {
          const day = values.schedule[dayKey];
          const dayLabel = DAY_LABELS_ES[dayKey];
          return (
            <div key={dayKey} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[160px]">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={day.isOpen}
                    onChange={(e) => updateDay(dayKey, { isOpen: e.target.checked })}
                    className="h-5 w-5 accent-profit rounded cursor-pointer"
                  />
                  <span className="font-bold text-sm text-ink">{dayLabel}</span>
                </label>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    day.isOpen ? 'bg-profit-soft text-profit' : 'bg-danger-soft text-danger'
                  }`}
                >
                  {day.isOpen ? 'Abierto' : 'Cerrado'}
                </span>
              </div>

              {day.isOpen ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-ink-muted">Abre:</span>
                    <input
                      type="time"
                      aria-label={`Hora de apertura ${dayLabel}`}
                      value={day.openTime}
                      onChange={(e) => updateDay(dayKey, { openTime: e.target.value })}
                      className={TIME_INPUT}
                    />
                  </div>
                  <span className="text-ink-muted">—</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-ink-muted">Cierra:</span>
                    <input
                      type="time"
                      aria-label={`Hora de cierre ${dayLabel}`}
                      value={day.closeTime}
                      onChange={(e) => updateDay(dayKey, { closeTime: e.target.value })}
                      className={TIME_INPUT}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs italic text-ink-faint">
                  Día de descanso (tu vitrina avisará que hoy no hay atención).
                </p>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

import React from 'react';
import type { WeeklyScheduleConfig } from '@/db/schema';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { DAY_LABELS_ES, ORDERED_DAY_KEYS } from '@/modules/shared/bogota-time';

interface ScheduleDialogProps {
  schedule: WeeklyScheduleConfig;
  headingFont: string;
  onClose: () => void;
}

/** Horarios de atención de la semana. */
export function ScheduleDialog({ schedule, headingFont, onClose }: ScheduleDialogProps) {
  return (
    <Dialog labelledBy="sched-modal-title" onClose={onClose} placement="center">
      <div className="card-boleto-strong w-full max-w-sm p-5 space-y-4 text-ink">
        <div className="flex items-center justify-between border-b border-dashed border-line pb-2.5">
          <h3 id="sched-modal-title" className={`${headingFont} text-lg`}>
            Horarios de atención
          </h3>
          <CloseButton label="Cerrar horarios" onClick={onClose} size="sm" />
        </div>
        <div className="divide-y divide-line text-xs">
          {ORDERED_DAY_KEYS.map((dayKey) => {
            const cfg = schedule[dayKey];
            return (
              <div key={dayKey} className="py-2 flex items-center justify-between">
                <span className="font-bold">{DAY_LABELS_ES[dayKey]}</span>
                {cfg?.isOpen ? (
                  <span className="font-mono-cop font-semibold text-profit">
                    {cfg.openTime} – {cfg.closeTime}
                  </span>
                ) : (
                  <span className="text-danger font-semibold">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

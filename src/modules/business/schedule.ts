import type { WeeklyScheduleConfig } from '@/db/schema';
import {
  DAY_KEYS_BY_UTC_DAY,
  DAY_LABELS_ES,
  getBogotaParts,
  type DayOfWeekKey,
} from '@/modules/shared/bogota-time';

export interface BusinessOpenStatus {
  isOpen: boolean;
  dayKey: DayOfWeekKey;
  dayLabel: string;
  todayHoursLabel: string;
  statusMessage: string;
}

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatTime12hFromHhmm(hhmm: string): string {
  const mins = parseTimeToMinutes(hhmm);
  if (mins === null) return hhmm;
  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? 'a. m.' : 'p. m.';
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Evalúa si el negocio está abierto en el instante dado según su horario semanal
 * y la hora oficial de Colombia (America/Bogota, UTC-5).
 */
export function evaluateBusinessOpenStatus(
  schedule: WeeklyScheduleConfig,
  instant: Date = new Date(),
): BusinessOpenStatus {
  const parts = getBogotaParts(instant);
  const dayKey = DAY_KEYS_BY_UTC_DAY[parts.weekday]!;
  const dayLabel = DAY_LABELS_ES[dayKey];
  const dayConfig = schedule?.[dayKey];
  const nowMinsEarly = parts.hour * 60 + parts.minute;

  // Madrugada: si el horario de AYER cruza la medianoche (ej. vie 18:00 – 01:00),
  // a las 00:30 del sábado el negocio sigue abierto con el horario del viernes.
  const prevDayKey = DAY_KEYS_BY_UTC_DAY[(parts.weekday + 6) % 7]!;
  const prevConfig = schedule?.[prevDayKey];
  if (prevConfig?.isOpen) {
    const prevOpen = parseTimeToMinutes(prevConfig.openTime);
    const prevClose = parseTimeToMinutes(prevConfig.closeTime);
    if (prevOpen !== null && prevClose !== null && prevClose < prevOpen && nowMinsEarly < prevClose) {
      return {
        isOpen: true,
        dayKey,
        dayLabel,
        todayHoursLabel: `${formatTime12hFromHhmm(prevConfig.openTime)} – ${formatTime12hFromHhmm(
          prevConfig.closeTime,
        )}`,
        statusMessage: `Abierto ahora · Hasta las ${formatTime12hFromHhmm(prevConfig.closeTime)}`,
      };
    }
  }

  if (!dayConfig || !dayConfig.isOpen) {
    return {
      isOpen: false,
      dayKey,
      dayLabel,
      todayHoursLabel: 'Cerrado hoy',
      statusMessage: `Cerrado hoy (${dayLabel.toLowerCase()})`,
    };
  }

  const openMins = parseTimeToMinutes(dayConfig.openTime);
  const closeMins = parseTimeToMinutes(dayConfig.closeTime);
  const nowMins = parts.hour * 60 + parts.minute;
  const formattedRange = `${formatTime12hFromHhmm(dayConfig.openTime)} – ${formatTime12hFromHhmm(
    dayConfig.closeTime,
  )}`;

  if (openMins === null || closeMins === null) {
    return {
      isOpen: true,
      dayKey,
      dayLabel,
      todayHoursLabel: formattedRange,
      statusMessage: 'Abierto hoy',
    };
  }

  let isOpenNow = false;
  if (closeMins >= openMins) {
    isOpenNow = nowMins >= openMins && nowMins < closeMins;
  } else {
    // Horario de hoy que cruza la medianoche (ej. 18:00 a 01:00): la parte de
    // madrugada (00:00–01:00) pertenece al día anterior y ya se evaluó arriba.
    isOpenNow = nowMins >= openMins;
  }

  return {
    isOpen: isOpenNow,
    dayKey,
    dayLabel,
    todayHoursLabel: formattedRange,
    statusMessage: isOpenNow
      ? `Abierto ahora · Hasta las ${formatTime12hFromHhmm(dayConfig.closeTime)}`
      : nowMins < openMins
        ? `Cerrado ahora · Abre hoy a las ${formatTime12hFromHhmm(dayConfig.openTime)}`
        : `Cerrado por hoy · Horario: ${formattedRange}`,
  };
}

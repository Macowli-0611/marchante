/**
 * Utilidades de Fecha y Hora en Zona Horaria America/Bogota (UTC-5 fijo).
 *
 * Colombia no tiene horario de verano (DST) desde 1993.
 * Toda definición de "hoy", "ayer", "esta semana" y "este mes" se calcula en UTC-5,
 * de modo que el servidor (aunque corra en UTC) y el celular del vendedor siempre coincidan.
 */

export const BOGOTA_TIMEZONE = 'America/Bogota';
export const BOGOTA_OFFSET_HOURS = -5;
export const BOGOTA_OFFSET_MS = BOGOTA_OFFSET_HOURS * 60 * 60 * 1000;

export type DayOfWeekKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

/** Días en el orden en que se muestran en Colombia (la semana empieza el lunes). */
export const ORDERED_DAY_KEYS: readonly DayOfWeekKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

export const DAY_KEYS_BY_UTC_DAY: readonly DayOfWeekKey[] = [
  'dom',
  'lun',
  'mar',
  'mie',
  'jue',
  'vie',
  'sab',
];

export const DAY_LABELS_ES: Record<DayOfWeekKey, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
};

export interface BogotaDateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  weekday: number; // 0 (domingo) .. 6 (sábado)
  dayKey: DayOfWeekKey;
  hour: number; // 0..23
  minute: number; // 0..59
  second: number; // 0..59
  dateString: string; // YYYY-MM-DD
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Descompone un instante Date en sus partes civiles exactas en America/Bogota.
 */
export function getBogotaParts(instant: Date = new Date()): BogotaDateParts {
  const ms = instant.getTime();
  if (Number.isNaN(ms)) {
    throw new RangeError('Fecha inválida al calcular hora de Bogotá');
  }
  const shifted = new Date(ms + BOGOTA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const weekday = shifted.getUTCDay();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const second = shifted.getUTCSeconds();

  return {
    year,
    month,
    day,
    weekday,
    dayKey: DAY_KEYS_BY_UTC_DAY[weekday]!,
    hour,
    minute,
    second,
    dateString: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

/**
 * Devuelve la fecha civil en Bogotá en formato "YYYY-MM-DD".
 */
export function getBogotaDateString(instant: Date = new Date()): string {
  return getBogotaParts(instant).dateString;
}

/**
 * Suma o resta días calendario a una fecha "YYYY-MM-DD" en Bogotá.
 */
export function addBogotaDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Formato de fecha inválido: ${ymd}. Se esperaba YYYY-MM-DD.`);
  }
  const noonBogota = new Date(`${y}-${pad2(m)}-${pad2(d)}T12:00:00-05:00`);
  noonBogota.setUTCDate(noonBogota.getUTCDate() + deltaDays);
  return getBogotaDateString(noonBogota);
}

/**
 * Convierte un rango de fechas civiles en Bogotá ("YYYY-MM-DD" .. "YYYY-MM-DD" inclusivo)
 * a sus instantes Date UTC exactos (desde 00:00:00.000-05:00 hasta 23:59:59.999-05:00).
 */
export function bogotaDateRangeToUtc(fromYmd: string, toYmd: string): {
  fromYmd: string;
  toYmd: string;
  startUtc: Date;
  endUtc: Date;
} {
  const startUtc = new Date(`${fromYmd}T00:00:00.000-05:00`);
  const endUtc = new Date(`${toYmd}T23:59:59.999-05:00`);
  if (Number.isNaN(startUtc.getTime()) || Number.isNaN(endUtc.getTime())) {
    throw new Error(`Rango de fechas inválido: ${fromYmd} a ${toYmd}`);
  }
  return { fromYmd, toYmd, startUtc, endUtc };
}

export type StatsPeriodPreset = 'today' | 'week' | 'month' | 'custom';

export interface ResolvedBogotaPeriod {
  preset: StatsPeriodPreset;
  label: string;
  comparisonLabel: string;
  fromYmd: string;
  toYmd: string;
  startUtc: Date;
  endUtc: Date;
  prevFromYmd: string;
  prevToYmd: string;
  prevStartUtc: Date;
  prevEndUtc: Date;
}

/**
 * Resuelve "hoy", "esta semana" (lunes a domingo en Colombia), "este mes" o un rango personalizado
 * junto con su periodo inmediatamente anterior equivalente (para frases como
 * "Esta semana vendiste 18% más que la semana anterior").
 */
export function resolveBogotaPeriod(
  preset: StatsPeriodPreset,
  now: Date = new Date(),
  custom?: { fromYmd?: string; toYmd?: string },
): ResolvedBogotaPeriod {
  const parts = getBogotaParts(now);
  const todayYmd = parts.dateString;

  if (preset === 'today') {
    const yesterdayYmd = addBogotaDays(todayYmd, -1);
    const curr = bogotaDateRangeToUtc(todayYmd, todayYmd);
    const prev = bogotaDateRangeToUtc(yesterdayYmd, yesterdayYmd);
    return {
      preset,
      label: 'Hoy',
      comparisonLabel: 'ayer',
      ...curr,
      prevFromYmd: prev.fromYmd,
      prevToYmd: prev.toYmd,
      prevStartUtc: prev.startUtc,
      prevEndUtc: prev.endUtc,
    };
  }

  if (preset === 'week') {
    // En Colombia la semana empieza el lunes (weekday: 1=lun .. 6=sab, 0=dom -> offset 6)
    const daysSinceMonday = parts.weekday === 0 ? 6 : parts.weekday - 1;
    const mondayYmd = addBogotaDays(todayYmd, -daysSinceMonday);
    const curr = bogotaDateRangeToUtc(mondayYmd, todayYmd);
    const prevMondayYmd = addBogotaDays(mondayYmd, -7);
    const prevEndYmd = addBogotaDays(todayYmd, -7);
    const prev = bogotaDateRangeToUtc(prevMondayYmd, prevEndYmd);
    return {
      preset,
      label: 'Esta semana',
      comparisonLabel: 'la semana pasada',
      ...curr,
      prevFromYmd: prev.fromYmd,
      prevToYmd: prev.toYmd,
      prevStartUtc: prev.startUtc,
      prevEndUtc: prev.endUtc,
    };
  }

  if (preset === 'month') {
    const firstOfMonthYmd = `${parts.year}-${pad2(parts.month)}-01`;
    const curr = bogotaDateRangeToUtc(firstOfMonthYmd, todayYmd);

    const prevMonthYear = parts.month === 1 ? parts.year - 1 : parts.year;
    const prevMonthNum = parts.month === 1 ? 12 : parts.month - 1;
    const daysInPrevMonth = new Date(Date.UTC(prevMonthYear, prevMonthNum, 0)).getUTCDate();
    const prevDay = Math.min(parts.day, daysInPrevMonth);
    const prevFirstYmd = `${prevMonthYear}-${pad2(prevMonthNum)}-01`;
    const prevEndYmd = `${prevMonthYear}-${pad2(prevMonthNum)}-${pad2(prevDay)}`;
    const prev = bogotaDateRangeToUtc(prevFirstYmd, prevEndYmd);

    return {
      preset,
      label: 'Este mes',
      comparisonLabel: 'el mes pasado',
      ...curr,
      prevFromYmd: prev.fromYmd,
      prevToYmd: prev.toYmd,
      prevStartUtc: prev.startUtc,
      prevEndUtc: prev.endUtc,
    };
  }

  // Rango personalizado
  const fromYmd = custom?.fromYmd || todayYmd;
  let toYmd = custom?.toYmd && custom.toYmd >= fromYmd ? custom.toYmd : fromYmd;
  // Máximo un año por consulta para no cargar todo el historial en memoria.
  const maxToYmd = addBogotaDays(fromYmd, 365);
  if (toYmd > maxToYmd) toYmd = maxToYmd;
  const curr = bogotaDateRangeToUtc(fromYmd, toYmd);
  const spanDays =
    Math.round((curr.endUtc.getTime() - curr.startUtc.getTime()) / (24 * 60 * 60 * 1000)) || 1;
  const prevToYmd = addBogotaDays(fromYmd, -1);
  const prevFromYmd = addBogotaDays(prevToYmd, -(spanDays - 1));
  const prev = bogotaDateRangeToUtc(prevFromYmd, prevToYmd);

  return {
    preset: 'custom',
    label: `${fromYmd} a ${toYmd}`,
    comparisonLabel: 'el periodo anterior',
    ...curr,
    prevFromYmd: prev.fromYmd,
    prevToYmd: prev.toYmd,
    prevStartUtc: prev.startUtc,
    prevEndUtc: prev.endUtc,
  };
}

/**
 * Formatea una hora Date a "3:45 p. m." en hora de Bogotá.
 */
export function formatBogotaTime12h(instant: Date = new Date()): string {
  const { hour, minute } = getBogotaParts(instant);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'a. m.' : 'p. m.';
  return `${h12}:${pad2(minute)} ${suffix}`;
}

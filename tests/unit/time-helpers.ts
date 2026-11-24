const DAY_OF_MONTH = { lun: 16, mar: 17, mie: 18, jue: 19, vie: 20, sab: 21, dom: 22 } as const;

/** Instante en hora de Bogotá dentro de la semana del lunes 16-nov-2026. */
export function buildBogotaInstant(day: keyof typeof DAY_OF_MONTH, hour: number, minute: number): Date {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`2026-11-${DAY_OF_MONTH[day]}T${hh}:${mm}:00-05:00`);
}

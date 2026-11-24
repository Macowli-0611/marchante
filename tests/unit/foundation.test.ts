import { describe, expect, it } from 'vitest';
import {
  assertIntegerCop,
  calculateProductMargin,
  formatCop,
  parseCopInput,
  suggestCommercialPriceCop,
} from '@/modules/shared/currency';
import {
  addBogotaDays,
  getBogotaParts,
  resolveBogotaPeriod,
} from '@/modules/shared/bogota-time';
import { slugifyBusinessName, validateBusinessSlug } from '@/modules/shared/slug';

describe('T5 — Moneda COP en enteros (nunca flotantes)', () => {
  it('acepta enteros válidos y rechaza decimales o negativos', () => {
    expect(assertIntegerCop(18500)).toBe(18500);
    expect(assertIntegerCop(0)).toBe(0);
    expect(() => assertIntegerCop(18500.5)).toThrow(/entero en pesos COP/);
    expect(() => assertIntegerCop(-100)).toThrow(/negativo/);
  });

  it('formatea pesos colombianos con punto de miles sin depender de ICU', () => {
    expect(formatCop(0)).toBe('$ 0');
    expect(formatCop(18500)).toBe('$ 18.500');
    expect(formatCop(1250000)).toBe('$ 1.250.000');
    expect(formatCop(24000, { showPlus: true })).toBe('+$ 24.000');
  });

  it('parsea entradas de texto con formato COP a entero limpio', () => {
    expect(parseCopInput('$ 18.500')).toBe(18500);
    expect(parseCopInput('120.000')).toBe(120000);
    expect(parseCopInput('')).toBe(0);
  });

  it('calcula ganancia en pesos y margen en porcentaje correctamente', () => {
    const m = calculateProductMargin(20000, 12000);
    expect(m.profitCop).toBe(8000);
    expect(m.marginPercent).toBe(40);
    expect(m.health).toBe('healthy');

    const loss = calculateProductMargin(10000, 14000);
    expect(loss.profitCop).toBe(-4000);
    expect(loss.health).toBe('loss');
  });

  it('sugiere precio comercial redondeado a múltiplos de $500 COP', () => {
    // Costo $6.000 con margen objetivo 50% -> $12.000
    expect(suggestCommercialPriceCop(6000, 50, 500)).toBe(12000);
  });
});

describe('T5 — Zona horaria America/Bogota (UTC-5)', () => {
  it('convierte un instante UTC pasada la medianoche UTC al día correcto en Bogotá', () => {
    // 2026-11-21T03:30:00Z son las 22:30 del 2026-11-20 en Bogotá (UTC-5)
    const instant = new Date('2026-11-21T03:30:00.000Z');
    const parts = getBogotaParts(instant);
    expect(parts.dateString).toBe('2026-11-20');
    expect(parts.hour).toBe(22);
    expect(parts.minute).toBe(30);
    expect(parts.dayKey).toBe('vie');
  });

  it('resuelve rangos de hoy, esta semana y este mes en hora Bogotá', () => {
    const anchor = new Date('2026-11-21T15:00:00.000Z'); // Sábado 21 nov 2026 10:00 a.m. Bogotá
    const today = resolveBogotaPeriod('today', anchor);
    expect(today.fromYmd).toBe('2026-11-21');
    expect(today.prevFromYmd).toBe('2026-11-20');

    const week = resolveBogotaPeriod('week', anchor);
    expect(week.fromYmd).toBe('2026-11-16'); // Lunes de esa semana
    expect(week.toYmd).toBe('2026-11-21');

    expect(addBogotaDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('T6 — Validación de Slugs y bloqueo de rutas reservadas', () => {
  it('normaliza nombres con tildes, eñes y símbolos', () => {
    expect(slugifyBusinessName('Panadería & Café Doña Ñata')).toBe(
      'panaderia-cafe-dona-nata',
    );
  });

  it('bloquea rutas reservadas del sistema y aprueba slugs válidos', () => {
    expect(validateBusinessSlug('panel').valid).toBe(false);
    expect(validateBusinessSlug('api').valid).toBe(false);
    expect(validateBusinessSlug('login').valid).toBe(false);
    expect(validateBusinessSlug('ab').valid).toBe(false);
    expect(validateBusinessSlug('postres-dona-elena').valid).toBe(true);
  });
});

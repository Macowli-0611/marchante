/**
 * Utilidades de Dinero en Pesos Colombianos (COP).
 *
 * REGLA CRÍTICA:
 * - Todo el dinero en Marchante se almacena y opera en ENTEROS (pesos sin decimales).
 * - Jamás se permiten flotantes en precios, costos, ventas o gastos.
 */

export const MAX_COP_AMOUNT = 999_999_999; // Hasta ~1.000 millones COP en entero de 32 bits seguro

/**
 * Verifica que un número sea un entero válido en pesos COP.
 */
export function assertIntegerCop(amount: number, fieldName = 'monto'): number {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error(`El campo ${fieldName} debe ser un número válido.`);
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`El campo ${fieldName} debe ser un entero en pesos COP (sin centavos ni decimales).`);
  }
  if (amount < 0) {
    throw new Error(`El campo ${fieldName} no puede ser negativo.`);
  }
  if (amount > MAX_COP_AMOUNT) {
    throw new Error(`El campo ${fieldName} supera el límite permitido.`);
  }
  return amount;
}

/**
 * Formatea un entero en pesos COP al estándar colombiano: "$ 18.500"
 * No depende del locale del motor ICU para garantizar salida idéntica en servidor y cliente.
 */
export function formatCop(amount: number, options?: { withSymbol?: boolean; showPlus?: boolean }): string {
  const withSymbol = options?.withSymbol ?? true;
  const showPlus = options?.showPlus ?? false;
  const safe = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const isNegative = safe < 0;
  const absStr = Math.abs(safe)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const sign = isNegative ? '-' : showPlus && safe > 0 ? '+' : '';
  if (!withSymbol) {
    return `${sign}${absStr}`;
  }
  return `${sign}$ ${absStr}`;
}

/**
 * Convierte texto escrito por el usuario en un input ("$ 18.500", "18500", "18.500")
 * a un entero en pesos COP. Devuelve 0 si está vacío.
 */
export function parseCopInput(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.round(raw));
  }
  if (!raw) return 0;
  const digitsOnly = String(raw).replace(/\D/g, '');
  if (!digitsOnly) return 0;
  const parsed = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_COP_AMOUNT);
}

export interface ProductMarginResult {
  priceCop: number;
  costCop: number;
  /** Ganancia unitaria en pesos (puede ser negativa si vende a pérdida) */
  profitCop: number;
  /** Margen sobre el precio de venta en porcentaje entero o con 1 decimal (ej. 42.5) */
  marginPercent: number;
  /** Semáforo humano: 'healthy' (>= 30%), 'tight' (10% - 29.9%), 'low' (0% - 9.9%), 'loss' (< 0%) */
  health: 'healthy' | 'tight' | 'low' | 'loss';
  healthLabel: string;
}

/**
 * Calcula la ganancia en pesos y el margen porcentual sobre la venta:
 * Margen % = ((Precio - Costo) / Precio) * 100
 */
export function calculateProductMargin(priceCop: number, costCop: number): ProductMarginResult {
  const price = Math.trunc(priceCop || 0);
  const cost = Math.trunc(costCop || 0);
  const profitCop = price - cost;

  if (price <= 0) {
    return {
      priceCop: price,
      costCop: cost,
      profitCop,
      marginPercent: 0,
      health: profitCop < 0 ? 'loss' : 'low',
      healthLabel: profitCop < 0 ? 'En pérdida' : 'Sin precio',
    };
  }

  const rawPercent = (profitCop / price) * 100;
  const marginPercent = Math.round(rawPercent * 10) / 10;

  let health: ProductMarginResult['health'] = 'healthy';
  let healthLabel = 'Buen margen';
  if (profitCop < 0) {
    health = 'loss';
    healthLabel = 'Vendes a pérdida';
  } else if (marginPercent < 12) {
    health = 'low';
    healthLabel = 'Margen muy bajito';
  } else if (marginPercent < 30) {
    health = 'tight';
    healthLabel = 'Margen ajustado';
  }

  return {
    priceCop: price,
    costCop: cost,
    profitCop,
    marginPercent,
    health,
    healthLabel,
  };
}

/**
 * Sugiere un precio de venta en pesos COP (redondeado hacia arriba al múltiplo de $100 o $500)
 * para alcanzar un margen objetivo (0 < targetMarginPercent < 95).
 */
export function suggestCommercialPriceCop(
  costCop: number,
  targetMarginPercent: number,
  roundStep: 100 | 500 = 500,
): number {
  const cost = Math.max(0, Math.trunc(costCop || 0));
  if (cost === 0) return 0;
  const clampedMargin = Math.min(90, Math.max(1, targetMarginPercent));
  const exactPrice = cost / (1 - clampedMargin / 100);
  return Math.ceil(exactPrice / roundStep) * roundStep;
}

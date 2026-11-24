import React from 'react';

interface InsightCardProps {
  title: string;
  icon: React.ReactNode;
  /** Frase humana que explica la gráfica (Requisito J2). */
  explanation: string;
  isEmpty: boolean;
  emptyText: string;
  /** Tamaño del texto de la explicación según el ancho de la columna. */
  explanationSize?: 'sm' | 'xs';
  children: React.ReactNode;
}

/** Tarjeta de estadística: título con icono, frase explicativa y contenido o vacío. */
export function InsightCard({
  title,
  icon,
  explanation,
  isEmpty,
  emptyText,
  explanationSize = 'sm',
  children,
}: InsightCardProps) {
  return (
    <section className="card-boleto p-5 space-y-4">
      <div className="space-y-1.5 border-b border-dashed border-line pb-3">
        <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <p
          className={`rounded-xl bg-canvas border border-line font-semibold text-ink ${
            explanationSize === 'sm' ? 'px-3.5 py-2 text-xs sm:text-sm' : 'px-3 py-2 text-xs'
          }`}
        >
          💡 {explanation}
        </p>
      </div>
      {isEmpty ? <p className="text-xs text-ink-muted py-4">{emptyText}</p> : children}
    </section>
  );
}

/** Fila con barra de participación (productos y categorías). */
export function ShareBar({
  label,
  value,
  sharePercent,
  barClass,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sharePercent: number;
  barClass: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-ink">{label}</span>
        {value}
      </div>
      <div className="h-2.5 w-full rounded-full bg-subtle overflow-hidden" role="img" aria-label={`${sharePercent}% del total`}>
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(6, sharePercent)}%` }} />
      </div>
    </div>
  );
}

/** Fila de lista con título, detalle y monto (pagos, clientes, horas). */
export function StatRow({
  title,
  detail,
  amount,
  amountClass = 'text-ink',
}: {
  title: string;
  detail: string;
  amount: string;
  amountClass?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3 flex items-center justify-between text-xs">
      <div>
        <p className="font-bold text-ink">{title}</p>
        <p className="text-ink-muted">{detail}</p>
      </div>
      <span className={`font-mono-cop font-extrabold ${amountClass}`}>{amount}</span>
    </div>
  );
}

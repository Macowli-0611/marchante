import React from 'react';

interface SectionCardProps {
  title: string;
  description?: React.ReactNode;
  /** Icono a la izquierda del título. */
  icon?: React.ReactNode;
  /** Botones a la derecha de la cabecera. */
  actions?: React.ReactNode;
  className?: string;
  /** Variante compacta: menos relleno y título más pequeño. */
  compact?: boolean;
  children: React.ReactNode;
}

/** Tarjeta "boleto" con cabecera punteada: título, descripción y acciones opcionales. */
export function SectionCard({
  title,
  description,
  icon,
  actions,
  className = 'space-y-5',
  compact = false,
  children,
}: SectionCardProps) {
  return (
    <section className={`card-boleto ${compact ? 'p-5' : 'p-5 sm:p-6'} ${className}`}>
      <div
        className={`border-b border-dashed border-line pb-3 ${
          actions ? 'flex flex-wrap items-center justify-between gap-3' : icon ? 'flex items-center gap-2' : ''
        }`}
      >
        {icon}
        <div>
          <h2 className={`font-display ${compact ? 'text-lg' : 'text-xl'} font-bold text-ink`}>{title}</h2>
          {description && <p className="text-xs text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

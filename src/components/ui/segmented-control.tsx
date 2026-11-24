import React from 'react';

interface SegmentedControlProps<T extends string> {
  /** Nombre accesible del grupo (ej. "Filtrar por estado"). */
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Grupo de botones excluyentes (filtros de periodo, estado, etc.). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-subtle p-1 ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.id)}
            className={`min-h-[38px] px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selected ? 'bg-paper text-ink border border-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

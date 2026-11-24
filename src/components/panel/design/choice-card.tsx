import React from 'react';

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  /** Fondo cuando está elegida (por defecto, papel kraft). */
  selectedClass?: string;
  className?: string;
  children: React.ReactNode;
}

/** Opción seleccionable en forma de tarjeta (paletas, fondos, letras, tarjetas). */
export function ChoiceCard({
  selected,
  onSelect,
  selectedClass = 'bg-canvas',
  className = 'p-3',
  children,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-xl border text-left transition-all cursor-pointer ${className} ${
        selected ? `border-2 border-ink ${selectedClass} shadow-stamp-2` : 'border-line bg-paper hover:bg-canvas'
      }`}
    >
      {children}
    </button>
  );
}

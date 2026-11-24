import React from 'react';
import { formatCop } from '@/modules/shared/currency';

interface CartBarProps {
  totalUnits: number;
  totalCop: number;
  brandColor: string;
  onOpen: () => void;
}

/** Barra flotante inferior con el resumen del carrito (C4). */
export function CartBar({ totalUnits, totalCop, brandColor, onOpen }: CartBarProps) {
  if (totalUnits <= 0) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-ink/40 to-transparent">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={onOpen}
          style={{ backgroundColor: brandColor }}
          className="w-full min-h-[56px] px-5 py-3 rounded-2xl border-2 border-ink text-paper shadow-stamp-3 flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-xl bg-ink text-paper font-mono-cop text-sm font-extrabold flex items-center justify-center">
              {totalUnits}
            </span>
            <span className="font-bold text-sm sm:text-base">Ver mi pedido y enviar por WhatsApp</span>
          </div>
          <span className="font-mono-cop text-base sm:text-lg font-extrabold">{formatCop(totalCop)}</span>
        </button>
      </div>
    </div>
  );
}

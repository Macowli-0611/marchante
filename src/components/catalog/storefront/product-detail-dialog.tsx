'use client';

import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { CloseButton, Dialog } from '@/components/ui/dialog';
import { formatCop } from '@/modules/shared/currency';
import type { PublicProductView, StorefrontTheme } from './types';

interface ProductDetailDialogProps {
  product: PublicProductView;
  theme: StorefrontTheme;
  onClose: () => void;
  onAdd: (product: PublicProductView, quantity: number, notes: string) => void;
}

/** Detalle del producto con cantidad y nota (C3). */
export function ProductDetailDialog({ product, theme, onClose, onAdd }: ProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  return (
    <Dialog labelledBy="detail-prod-title" onClose={onClose}>
      <div className="card-boleto-strong w-full max-w-md p-5 sm:p-6 space-y-4 rounded-b-none sm:rounded-b-2xl text-ink">
        <div className="flex items-start justify-between gap-3">
          <h3 id="detail-prod-title" className={`${theme.headingFont} text-xl`}>
            {product.name}
          </h3>
          <CloseButton label="Cerrar detalle" onClick={onClose} />
        </div>

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-56 rounded-2xl object-cover border border-ink"
          />
        )}

        {product.description && (
          <p className="text-sm text-ink-soft leading-relaxed">{product.description}</p>
        )}

        <div className="text-2xl font-mono-cop font-extrabold text-ink">{formatCop(product.priceCop)}</div>

        <div>
          <label htmlFor="item-note" className="block text-xs font-bold text-ink-muted mb-1">
            Nota opcional para este producto
          </label>
          <input
            id="item-note"
            type="text"
            maxLength={160}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Sin salsa, bien doradito, para regalo..."
            className="w-full min-h-[42px] rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="inline-flex items-center rounded-xl border-2 border-ink bg-canvas">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Disminuir cantidad"
              className="h-11 w-11 inline-flex items-center justify-center font-bold cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-9 text-center font-mono-cop text-base font-extrabold" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              aria-label="Aumentar cantidad"
              className="h-11 w-11 inline-flex items-center justify-center font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAdd(product, quantity, notes)}
            style={{ backgroundColor: theme.brandColor }}
            className="flex-1 min-h-[48px] px-4 rounded-xl border-2 border-ink text-sm font-extrabold text-paper shadow-stamp-2 flex items-center justify-between cursor-pointer"
          >
            <span>Agregar al pedido</span>
            <span className="font-mono-cop">{formatCop(product.priceCop * quantity)}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}

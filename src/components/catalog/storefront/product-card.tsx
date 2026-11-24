import React from 'react';
import { Plus } from 'lucide-react';
import type { CatalogCardStyle } from '@/db/schema';
import { formatCop } from '@/modules/shared/currency';
import type { PublicProductView, StorefrontTheme } from './types';

interface ProductCardProps {
  product: PublicProductView;
  cardStyle: CatalogCardStyle;
  theme: StorefrontTheme;
  quantityInCart: number;
  onOpen: (product: PublicProductView) => void;
}

/** Tarjeta de producto de la vitrina con su botón "Pedir". */
export function ProductCard({ product, cardStyle, theme, quantityInCart, onOpen }: ProductCardProps) {
  const { brandColor, headingFont, cardSurfaceClass } = theme;
  const thumbSize = cardStyle === 'compacta' ? 'h-16 w-16' : 'h-20 w-20 sm:h-24 sm:w-24';

  return (
    <article
      onClick={() => onOpen(product)}
      className={`rounded-2xl border-2 p-3.5 sm:p-4 transition-all ${cardSurfaceClass} ${
        cardStyle === 'boleto' ? 'border-ink shadow-stamp-2' : ''
      } ${product.isSoldOut ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}`}
    >
      <div className="flex items-center gap-3.5">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className={`rounded-xl object-cover border border-ink bg-canvas shrink-0 ${thumbSize}`}
          />
        ) : (
          <div
            className={`rounded-xl border border-ink flex items-center justify-center font-display font-bold text-lg text-paper shrink-0 ${
              cardStyle === 'compacta' ? 'h-16 w-16' : 'h-20 w-20'
            }`}
            style={{ backgroundColor: brandColor }}
          >
            {product.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${headingFont} text-base sm:text-lg leading-snug`}>{product.name}</h3>
            {quantityInCart > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-mono-cop font-extrabold text-paper shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {quantityInCart} en pedido
              </span>
            )}
          </div>

          {product.description && <p className="text-xs opacity-80 line-clamp-2">{product.description}</p>}

          <div className="pt-1.5 flex items-center justify-between gap-2">
            <span className="font-mono-cop text-base sm:text-lg font-extrabold">{formatCop(product.priceCop)}</span>

            {product.isSoldOut ? (
              <span className="rounded-lg bg-danger-soft border border-danger px-2.5 py-1 text-xs font-bold text-danger">
                Agotado hoy
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(product);
                }}
                style={{ backgroundColor: brandColor }}
                className="min-h-[38px] px-3.5 inline-flex items-center gap-1 rounded-xl border border-ink text-xs font-bold text-paper shadow-stamp-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Pedir
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

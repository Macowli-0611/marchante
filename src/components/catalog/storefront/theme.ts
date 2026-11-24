import type React from 'react';
import type { CatalogBackgroundPreset, CatalogFontPreset } from '@/db/schema';

/** Clave de idempotencia del pedido (una por carrito enviado). */
export function generateClientOrderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Devuelve las clases y estilos de fondo según el preset elegido por el vendedor (Sección D).
 */
export function resolveBackgroundStyle(preset: CatalogBackgroundPreset): {
  bgClass: string;
  isDark: boolean;
  inlineStyle?: React.CSSProperties;
} {
  switch (preset) {
    case 'nocturno':
      return {
        bgClass: 'bg-ink-hover text-canvas',
        isDark: true,
        inlineStyle: {
          backgroundImage: 'radial-gradient(var(--color-ink-soft) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
      };
    case 'crema':
      return { bgClass: 'bg-paper text-ink', isDark: false };
    case 'canasto':
      return {
        bgClass: 'bg-subtle text-ink',
        isDark: false,
        inlineStyle: {
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(196,179,157,0.16) 0px, rgba(196,179,157,0.16) 8px, transparent 8px, transparent 16px)',
        },
      };
    case 'baldosin':
      return {
        bgClass: 'bg-canvas text-ink',
        isDark: false,
        inlineStyle: {
          backgroundImage:
            'linear-gradient(to right, rgba(200,62,43,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(200,62,43,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        },
      };
    case 'bijao':
      return {
        bgClass: 'bg-profit-soft text-ink',
        isDark: false,
        inlineStyle: {
          backgroundImage: 'radial-gradient(rgba(27,107,74,0.15) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        },
      };
    case 'kraft':
    default:
      return { bgClass: 'bg-kraft-dots text-ink', isDark: false };
  }
}

export function resolveHeadingFontClass(fontPreset: CatalogFontPreset): string {
  switch (fontPreset) {
    case 'mercado':
      return 'font-sans tracking-tight font-extrabold';
    case 'cartel':
      return 'font-display uppercase tracking-wide font-extrabold';
    case 'editorial':
      return 'font-display italic font-semibold';
    case 'artesanal':
    default:
      return 'font-display font-bold';
  }
}

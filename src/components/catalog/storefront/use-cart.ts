'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CartItem, PublicProductView } from './types';

/**
 * Carrito del catálogo público (C4): se guarda en localStorage por tienda,
 * salvo en la vista previa del panel de diseño.
 */
export function useCart(businessSlug: string, persist: boolean) {
  const storageKey = `marchante_cart_${businessSlug}`;
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!persist) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      // Sin acceso a storage (modo privado): el carrito vive solo en memoria
    }
  }, [storageKey, persist]);

  useEffect(() => {
    if (!persist) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Ignorar
    }
  }, [cart, storageKey, persist]);

  const summary = useMemo(
    () => ({
      totalUnits: cart.reduce((acc, item) => acc + item.quantity, 0),
      totalCop: cart.reduce((acc, item) => acc + item.unitPriceCop * item.quantity, 0),
    }),
    [cart],
  );

  /** Suma unidades; la misma nota en el mismo producto se junta en una línea. */
  function addProduct(product: PublicProductView, quantity: number, notes: string) {
    if (product.isSoldOut) return;
    const cleanNote = notes.trim();
    const cartLineId = `${product.id}::${cleanNote.toLowerCase()}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartLineId === cartLineId);
      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item,
        );
      }
      return [
        ...prev,
        {
          cartLineId,
          productId: product.id,
          name: product.name,
          unitPriceCop: product.priceCop,
          quantity,
          notes: cleanNote,
          imageUrl: product.imageUrl,
        },
      ];
    });
  }

  function changeQuantity(cartLineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartLineId === cartLineId ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function quantityOf(productId: string): number {
    return cart.filter((c) => c.productId === productId).reduce((sum, c) => sum + c.quantity, 0);
  }

  return {
    cart,
    summary,
    addProduct,
    changeQuantity,
    quantityOf,
    clear: () => setCart([]),
  };
}

export type CartState = ReturnType<typeof useCart>;

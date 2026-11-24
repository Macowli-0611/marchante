'use client';

import React, { useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import { COLOR } from '@/components/ui/color-tokens';
import type { BusinessOpenStatus } from '@/modules/business/schedule';
import { CartBar } from './storefront/cart-bar';
import { CatalogFilters } from './storefront/catalog-filters';
import { CheckoutDialog } from './storefront/checkout-dialog';
import { ProductCard } from './storefront/product-card';
import { ProductDetailDialog } from './storefront/product-detail-dialog';
import { ScheduleDialog } from './storefront/schedule-dialog';
import { StorefrontHeader } from './storefront/storefront-header';
import { resolveBackgroundStyle, resolveHeadingFontClass } from './storefront/theme';
import type {
  PublicBusinessView,
  PublicCategoryView,
  PublicProductView,
  StorefrontTheme,
} from './storefront/types';
import { useCart } from './storefront/use-cart';
import { useCheckout } from './storefront/use-checkout';

export type {
  CartItem,
  PublicBusinessView,
  PublicCategoryView,
  PublicProductView,
} from './storefront/types';
export { resolveBackgroundStyle, resolveHeadingFontClass } from './storefront/theme';

interface PublicStorefrontProps {
  business: PublicBusinessView;
  openStatus: BusinessOpenStatus;
  categories: PublicCategoryView[];
  /** Vista previa dentro del panel de diseño: no guarda carrito ni abre WhatsApp. */
  isLivePreview?: boolean;
}

/**
 * Vitrina pública del negocio (/[slug]): portada, búsqueda, productos por categoría,
 * carrito y envío del pedido por WhatsApp. Cada parte vive en `./storefront/`.
 */
export function PublicStorefront({
  business,
  openStatus,
  categories,
  isLivePreview = false,
}: PublicStorefrontProps) {
  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<PublicProductView | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(business.slug, !isLivePreview);
  const checkout = useCheckout(business, cart, isLivePreview);

  const background = resolveBackgroundStyle(business.backgroundPreset);
  const theme: StorefrontTheme = {
    brandColor: business.primaryColor || COLOR.brand,
    headingFont: resolveHeadingFontClass(business.fontPreset),
    isDark: background.isDark,
    cardSurfaceClass: background.isDark
      ? 'bg-ink-hover border-ink-soft text-canvas'
      : 'bg-paper border-line text-ink',
  };

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .filter((cat) => activeCategoryId === 'all' || cat.id === activeCategoryId)
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, activeCategoryId, search]);

  function openProduct(product: PublicProductView) {
    if (!product.isSoldOut) setSelectedProduct(product);
  }

  return (
    <div className={`min-h-dvh flex flex-col ${background.bgClass}`} style={background.inlineStyle}>
      <StorefrontHeader
        business={business}
        openStatus={openStatus}
        theme={theme}
        onShowSchedule={() => setShowSchedule(true)}
      />

      <CatalogFilters
        businessName={business.name}
        categories={categories}
        search={search}
        onSearchChange={setSearch}
        activeCategoryId={activeCategoryId}
        onCategoryChange={setActiveCategoryId}
        brandColor={theme.brandColor}
      />

      {/* Productos agrupados por categoría (C2) */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-32 space-y-7">
        {filteredCategories.length === 0 ? (
          <div className={`rounded-2xl border-2 p-10 text-center space-y-2 ${theme.cardSurfaceClass}`}>
            <Store className="h-8 w-8 mx-auto opacity-70" />
            <h2 className={`${theme.headingFont} text-xl`}>No encontramos productos</h2>
            <p className="text-xs opacity-80">
              {search
                ? 'Prueba buscando con otra palabra.'
                : 'Este negocio está preparando sus productos del día.'}
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className={`${theme.headingFont} text-xl sm:text-2xl`}>{cat.name}</h2>
                <div className="flex-1 border-t border-dashed border-line-strong" />
              </div>
              <div
                className={
                  business.cardStyle === 'mostrador'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                    : 'grid grid-cols-1 gap-3.5'
                }
              >
                {cat.products.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    cardStyle={business.cardStyle}
                    theme={theme}
                    quantityInCart={cart.quantityOf(prod.id)}
                    onOpen={openProduct}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <CartBar
        totalUnits={cart.summary.totalUnits}
        totalCop={cart.summary.totalCop}
        brandColor={theme.brandColor}
        onOpen={() => {
          checkout.resetConfirmation();
          setCartOpen(true);
        }}
      />

      {selectedProduct && (
        <ProductDetailDialog
          key={selectedProduct.id}
          product={selectedProduct}
          theme={theme}
          onClose={() => setSelectedProduct(null)}
          onAdd={(product, quantity, notes) => {
            cart.addProduct(product, quantity, notes);
            setSelectedProduct(null);
          }}
        />
      )}

      {cartOpen && (
        <CheckoutDialog
          business={business}
          theme={theme}
          cart={cart}
          checkout={checkout}
          onClose={() => setCartOpen(false)}
        />
      )}

      {showSchedule && (
        <ScheduleDialog
          schedule={business.schedule}
          headingFont={theme.headingFont}
          onClose={() => setShowSchedule(false)}
        />
      )}
    </div>
  );
}

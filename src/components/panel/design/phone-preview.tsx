import React from 'react';
import { Smartphone } from 'lucide-react';
import {
  PublicStorefront,
  type PublicBusinessView,
  type PublicCategoryView,
} from '@/components/catalog/public-storefront';
import type { BusinessOpenStatus } from '@/modules/business/schedule';

interface PhonePreviewProps {
  business: PublicBusinessView;
  openStatus: BusinessOpenStatus;
  categories: PublicCategoryView[];
  className?: string;
}

/** Vista previa en vivo de la vitrina dentro de un marco de celular (D6). */
export function PhonePreview({ business, openStatus, categories, className = '' }: PhonePreviewProps) {
  return (
    <aside aria-label="Vista previa de la vitrina" className={className}>
      <div className="card-boleto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-ink">
            <Smartphone className="h-4 w-4 text-brand" />
            Vista previa en vivo (Celular)
          </span>
          <span className="font-mono-cop text-xs text-ink-muted">/{business.slug}</span>
        </div>

        <div className="mx-auto w-full max-w-[380px] rounded-[2.2rem] border-4 border-ink bg-ink p-2 shadow-[4px_4px_0_0_var(--color-line)]">
          <div className="mx-auto mb-1.5 h-1.5 w-16 rounded-full bg-ink-muted" />
          <div className="h-[640px] w-full overflow-y-auto rounded-[1.7rem] bg-canvas">
            <PublicStorefront business={business} openStatus={openStatus} categories={categories} isLivePreview />
          </div>
        </div>
      </div>
    </aside>
  );
}

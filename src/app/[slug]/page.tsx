import React from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicCatalogBySlug, resolvePublicSlugRedirect } from '@/modules/orders/service';
import { PublicStorefront } from '@/components/catalog/public-storefront';

export default async function PublicCatalogSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalogData = await getPublicCatalogBySlug(slug);

  if (!catalogData) {
    // Link viejo de un negocio que cambió su enlace: lo llevamos al nuevo.
    const currentSlug = await resolvePublicSlugRedirect(slug);
    if (currentSlug) permanentRedirect(`/${currentSlug}`);
    notFound();
  }

  return (
    <PublicStorefront
      business={catalogData.business}
      openStatus={catalogData.openStatus}
      categories={catalogData.categories}
    />
  );
}

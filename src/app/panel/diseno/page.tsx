import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getPublicCatalogBySlug } from '@/modules/orders/service';
import { CatalogCustomizationStudio } from '@/components/panel/catalog-customization-studio';

export default async function DisenoCatalogoPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const catalogData = await getPublicCatalogBySlug(session.slug);
  if (!catalogData) {
    redirect('/panel');
  }

  return (
    <CatalogCustomizationStudio
      initialBusiness={catalogData.business}
      initialOpenStatus={catalogData.openStatus}
      initialCategories={catalogData.categories}
    />
  );
}

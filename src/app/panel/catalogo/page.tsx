import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { listCategories, listProducts } from '@/modules/catalog/service';
import { CatalogManager } from '@/components/panel/catalog-manager';

export default async function CatalogoPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const [categories, productsResult] = await Promise.all([
    listCategories(session.businessId),
    listProducts(session.businessId, { page: 1, pageSize: 12 }),
  ]);

  return (
    <CatalogManager
      initialCategories={categories}
      initialProducts={productsResult.items}
      initialPagination={productsResult.pagination}
      businessSlug={session.slug}
    />
  );
}

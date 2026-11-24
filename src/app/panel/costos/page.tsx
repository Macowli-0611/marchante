import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { listProductsWithCostingSummary } from '@/modules/catalog/costing';
import { CostingStudio } from '@/components/panel/costing-studio';

export default async function CostosPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const costingData = await listProductsWithCostingSummary(session.businessId, 45);

  return <CostingStudio initialData={costingData} />;
}

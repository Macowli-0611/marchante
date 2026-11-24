import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getQuickSaleWorkspaceData } from '@/modules/sales/service';
import { QuickSaleTerminal } from '@/components/panel/quick-sale-terminal';

export default async function VenderPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const workspaceData = await getQuickSaleWorkspaceData(session.businessId);

  return <QuickSaleTerminal initialData={workspaceData} />;
}

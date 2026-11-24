import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getFinanceLedger } from '@/modules/finance/service';
import { FinanceMovementsManager } from '@/components/panel/finance-movements-manager';

export default async function MovimientosPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const ledgerData = await getFinanceLedger(session.businessId, {
    period: 'month',
    filterKind: 'all',
  });

  return <FinanceMovementsManager initialData={ledgerData} />;
}

import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getBusinessStatistics } from '@/modules/analytics/statistics';
import { StatisticsDashboard } from '@/components/panel/statistics-dashboard';

export default async function EstadisticasPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const initialStats = await getBusinessStatistics(session.businessId, {
    period: 'week',
  });

  return <StatisticsDashboard initialStats={initialStats} />;
}

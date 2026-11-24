import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getDailySummary } from '@/modules/analytics/daily-summary';
import { DailySummaryView } from '@/components/panel/daily-summary-view';

export default async function PanelHomePage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const summary = await getDailySummary(session.businessId);

  return <DailySummaryView summary={summary} />;
}

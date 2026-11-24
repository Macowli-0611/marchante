import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { listCustomers } from '@/modules/customers/service';
import { CustomersManager } from '@/components/panel/customers-manager';

export default async function ClientesPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const customers = await listCustomers(session.businessId, { sortBy: 'top_spent' });

  return <CustomersManager initialCustomers={customers} />;
}

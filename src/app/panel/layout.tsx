import React from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getServerSession } from '@/modules/auth/session';
import { withTenantContext } from '@/db';
import { businesses } from '@/db/schema';
import { DAY_LABELS_ES, getBogotaParts } from '@/modules/shared/bogota-time';
import { PanelShell } from '@/components/panel/panel-shell';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  // Consulta protegida con RLS a nivel de base de datos para el businessId de la sesión
  const [business] = await withTenantContext(session.businessId, async (tx) => {
    return tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, session.businessId))
      .limit(1);
  });

  if (!business) {
    redirect('/login');
  }

  const bogota = getBogotaParts();
  const bogotaDateLabel = `${DAY_LABELS_ES[bogota.dayKey]} ${bogota.dateString}`;

  return (
    <PanelShell
      business={{
        id: business.id,
        name: business.name,
        ownerName: business.ownerName,
        slug: business.slug,
        category: business.category,
        bogotaDateLabel,
      }}
    >
      {children}
    </PanelShell>
  );
}

import { getBusinessStatistics } from '@/modules/analytics/statistics';
import { ok, sellerRoute } from '@/modules/shared/route';

export const GET = sellerRoute(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const stats = await getBusinessStatistics(session.businessId, {
    period: (searchParams.get('period') || 'week') as never,
    fromYmd: searchParams.get('fromYmd') || undefined,
    toYmd: searchParams.get('toYmd') || undefined,
  });
  return ok({ ...stats });
}, 'Error al calcular estadísticas');

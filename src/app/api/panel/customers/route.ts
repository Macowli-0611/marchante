import {
  createCustomer,
  getCustomerDetailWithHistory,
  listCustomers,
  updateCustomer,
} from '@/modules/customers/service';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';

const SORTS = new Set(['top_spent', 'recent', 'name']);

export const GET = sellerRoute(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const detailId = searchParams.get('id');
  if (detailId) {
    return ok({ ...(await getCustomerDetailWithHistory(session.businessId, detailId)) });
  }
  const sortParam = searchParams.get('sortBy') || 'top_spent';
  const items = await listCustomers(session.businessId, {
    search: (searchParams.get('search') || '').slice(0, 100),
    sortBy: (SORTS.has(sortParam) ? sortParam : 'top_spent') as 'top_spent' | 'recent' | 'name',
  });
  return ok({ customers: items });
}, 'Error al cargar clientes');

export const POST = sellerRoute(async (session, request) => {
  const customer = await createCustomer(session.businessId, (await readJson(request)) as never);
  return ok({ customer }, 201);
}, 'No se pudo crear el cliente');

export const PUT = sellerRoute(async (session, request) => {
  const customer = await updateCustomer(session.businessId, (await readJson(request)) as never);
  return ok({ customer });
}, 'No se pudo actualizar el cliente');

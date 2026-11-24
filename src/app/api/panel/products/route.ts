import { AppError } from '@/modules/shared/errors';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';
import {
  archiveProductSafely,
  createProduct,
  listProducts,
  toggleProductStatus,
  updateProduct,
} from '@/modules/catalog/service';

export const GET = sellerRoute(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const result = await listProducts(session.businessId, {
    search: (searchParams.get('search') || '').slice(0, 100),
    categoryId: searchParams.get('categoryId') || 'all',
    status: (searchParams.get('status') || 'all') as never,
    page: Number(searchParams.get('page') || 1),
    pageSize: Number(searchParams.get('pageSize') || 12),
  });
  return ok({ ...result });
}, 'Error al listar productos');

export const POST = sellerRoute(async (session, request) => {
  const product = await createProduct(session.businessId, (await readJson(request)) as never);
  return ok({ product }, 201);
}, 'No se pudo crear el producto');

export const PUT = sellerRoute(async (session, request) => {
  return ok({ product: await updateProduct(session.businessId, (await readJson(request)) as never) });
}, 'No se pudo actualizar el producto');

export const PATCH = sellerRoute(async (session, request) => {
  return ok({ product: await toggleProductStatus(session.businessId, (await readJson(request)) as never) });
}, 'No se pudo cambiar el estado');

export const DELETE = sellerRoute(async (session, request) => {
  const productId = new URL(request.url).searchParams.get('id');
  if (!productId) throw new AppError('Falta el id del producto');
  return ok({ ...(await archiveProductSafely(session.businessId, productId)) });
}, 'No se pudo archivar el producto');

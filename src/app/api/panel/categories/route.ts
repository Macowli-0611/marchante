import { AppError } from '@/modules/shared/errors';
import { ok, readJson, sellerRoute } from '@/modules/shared/route';
import {
  archiveCategory,
  createCategory,
  listCategories,
  renameCategory,
  reorderCategories,
} from '@/modules/catalog/service';

export const GET = sellerRoute(async (session) => {
  return ok({ categories: await listCategories(session.businessId) });
}, 'Error al cargar categorías');

export const POST = sellerRoute(async (session, request) => {
  const category = await createCategory(session.businessId, (await readJson(request)) as never);
  return ok({ category }, 201);
}, 'No se pudo crear la categoría');

export const PATCH = sellerRoute(async (session, request) => {
  const body = await readJson(request);
  if (Array.isArray(body.orderedCategoryIds)) {
    const updated = await reorderCategories(session.businessId, {
      orderedCategoryIds: body.orderedCategoryIds as string[],
    });
    return ok({ categories: updated });
  }
  return ok({ category: await renameCategory(session.businessId, body as never) });
}, 'No se pudo actualizar la categoría');

export const DELETE = sellerRoute(async (session, request) => {
  const categoryId = new URL(request.url).searchParams.get('id');
  if (!categoryId) throw new AppError('Falta el id de la categoría');
  await archiveCategory(session.businessId, categoryId);
  return ok();
}, 'No se pudo eliminar la categoría');

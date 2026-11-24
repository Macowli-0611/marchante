import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withSystemDb } from '@/db';
import { businesses, categories, expenseCategories, products, users } from '@/db/schema';
import { slugifyBusinessName, validateBusinessSlug } from '@/modules/shared/slug';
import { AppError, isUniqueViolation } from '@/modules/shared/errors';
import { normalizeWhatsappPhone } from '@/modules/business/validators';
import { isSlugTakenByAnotherBusiness } from '@/modules/business/slug-registry';
import { hashPassword, verifyPassword } from './password';
import { DEMO_EMAIL, DEMO_SLUG, isDemoEnabled } from './demo';
import {
  buildDefaultPaymentMethods,
  buildDefaultSchedule,
  DEFAULT_EXPENSE_CATEGORIES,
} from './defaults';
import type { SellerSessionPayload } from './session';

export const registerSellerSchema = z.object({
  ownerName: z.string().trim().min(2, 'Escribe tu nombre (mínimo 2 letras)').max(80),
  businessName: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre de tu negocio (mínimo 2 letras)')
    .max(100),
  slug: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email('Escribe un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
  whatsappPhone: z
    .string()
    .trim()
    .max(25)
    .transform(normalizeWhatsappPhone)
    .refine(
      (digits) => digits.length >= 10 && digits.length <= 15,
      'Escribe un número de WhatsApp válido (ej. 300 123 4567)',
    ),
  category: z.string().trim().default('comida_casera'),
});

export const loginSellerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Escribe tu contraseña actual').max(200),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(100),
});

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('marchante-usuario-inexistente');
  return dummyHashPromise;
}

export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
export type LoginSellerInput = z.infer<typeof loginSellerSchema>;

/**
 * Registra un nuevo vendedor, crea su negocio (tenant aislado), sus categorías
 * predeterminadas de gasto y una categoría inicial de catálogo.
 */
export async function registerSeller(rawInput: RegisterSellerInput): Promise<SellerSessionPayload> {
  const input = registerSellerSchema.parse(rawInput);

  const candidateSlug = input.slug?.trim()
    ? slugifyBusinessName(input.slug)
    : slugifyBusinessName(input.businessName);
  const slugCheck = validateBusinessSlug(candidateSlug);
  if (!slugCheck.valid) {
    throw new AppError(slugCheck.error || 'El enlace elegido no es válido.');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await withSystemDb((rootDb) =>
      rootDb.transaction(async (txRaw) => {
        const db = txRaw as unknown as typeof rootDb;
        const existingEmail = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingEmail.length > 0) {
          throw new AppError('Ya existe una cuenta registrada con ese correo electrónico.', 409);
        }

        if (await isSlugTakenByAnotherBusiness(db, slugCheck.normalized)) {
          throw new AppError(
            `El enlace "/${slugCheck.normalized}" ya está ocupado por otro negocio. Prueba otro nombre.`,
            409,
          );
        }

        const [createdUser] = await db
          .insert(users)
          .values({ email: input.email, passwordHash, fullName: input.ownerName })
          .returning();
        if (!createdUser) throw new Error('No se pudo crear el usuario.');

        const [createdBusiness] = await db
          .insert(businesses)
          .values({
            ownerId: createdUser.id,
            slug: slugCheck.normalized,
            name: input.businessName,
            ownerName: input.ownerName,
            description: `Bienvenido a la vitrina oficial de ${input.businessName}. Haz tu pedido y te atendemos directo por WhatsApp.`,
            category: input.category || 'comida_casera',
            whatsappPhone: input.whatsappPhone,
            // Sin dirección inventada: el vendedor la completa en su perfil.
            address: '',
            city: 'Cali, Colombia',
            schedule: buildDefaultSchedule(),
            paymentMethods: buildDefaultPaymentMethods(input.whatsappPhone),
            socialLinks: {},
          })
          .returning();
        if (!createdBusiness) throw new Error('No se pudo crear el negocio.');

        await db.insert(expenseCategories).values(
          DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
            businessId: createdBusiness.id,
            name: cat.name,
            icon: cat.icon,
            isDefault: true,
            isProductCost: cat.isProductCost,
            sortOrder: cat.sortOrder,
          })),
        );

        await db.insert(categories).values({
          businessId: createdBusiness.id,
          name: 'Favoritos de la casa',
          sortOrder: 1,
        });

        return {
          userId: createdUser.id,
          businessId: createdBusiness.id,
          slug: createdBusiness.slug,
          email: createdUser.email,
          ownerName: createdBusiness.ownerName,
          businessName: createdBusiness.name,
          sessionVersion: createdUser.sessionVersion,
        } satisfies SellerSessionPayload;
      }),
    );
  } catch (err) {
    if (isUniqueViolation(err, 'users_email_idx')) {
      throw new AppError('Ya existe una cuenta registrada con ese correo electrónico.', 409);
    }
    if (isUniqueViolation(err, 'businesses_slug_idx')) {
      throw new AppError(`El enlace "/${slugCheck.normalized}" ya está ocupado. Prueba otro nombre.`, 409);
    }
    throw err;
  }
}

/**
 * Autentica un vendedor por correo y contraseña.
 */
export async function loginSeller(rawInput: LoginSellerInput): Promise<SellerSessionPayload> {
  const input = loginSellerSchema.parse(rawInput);

  return withSystemDb(async (db) => {
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!foundUser) {
      await verifyPassword(input.password, await getDummyHash());
      throw new AppError('Correo o contraseña incorrectos.', 401);
    }

    const valid = await verifyPassword(input.password, foundUser.passwordHash);
    if (!valid) {
      throw new AppError('Correo o contraseña incorrectos.', 401);
    }

    const [foundBusiness] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, foundUser.id))
      .limit(1);

    if (!foundBusiness) {
      throw new AppError('Tu cuenta no tiene un negocio asociado.', 401);
    }

    return {
      userId: foundUser.id,
      businessId: foundBusiness.id,
      slug: foundBusiness.slug,
      email: foundUser.email,
      ownerName: foundBusiness.ownerName,
      businessName: foundBusiness.name,
      sessionVersion: foundUser.sessionVersion,
      isDemo: foundUser.email === DEMO_EMAIL,
    };
  });
}

/**
 * Cambia la contraseña verificando la actual. El llamador debe revocar las sesiones
 * (revokeAllSessions) y emitir una cookie nueva.
 */
export async function changeSellerPassword(
  userId: string,
  rawInput: z.input<typeof changePasswordSchema>,
): Promise<void> {
  const input = changePasswordSchema.parse(rawInput);
  await withSystemDb(async (db) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new AppError('Tu sesión ya no es válida. Vuelve a entrar.', 401);
    if (user.email === DEMO_EMAIL) {
      throw new AppError('La tienda de demostración no permite cambiar la contraseña.', 403);
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      throw new AppError('La contraseña actual no es correcta.', 400);
    }
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() })
      .where(eq(users.id, userId));
  });
}

/**
 * Crea o recupera una tienda colombiana de demostración lista para probar con un toque.
 */
export async function ensureDemoSellerAccount(): Promise<SellerSessionPayload> {
  if (!isDemoEnabled()) {
    throw new AppError('La tienda de demostración no está disponible.', 404);
  }
  const demoEmail = DEMO_EMAIL;
  return withSystemDb(async (db) => {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, demoEmail))
      .limit(1);

    if (existing) {
      const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.ownerId, existing.id))
        .limit(1);

      if (biz) {
        return {
          userId: existing.id,
          businessId: biz.id,
          slug: biz.slug,
          email: existing.email,
          ownerName: biz.ownerName,
          businessName: biz.name,
          sessionVersion: existing.sessionVersion,
          isDemo: true,
        };
      }
    }

    const registered = await registerSeller({
      ownerName: 'Doña Elena Restrepo',
      businessName: 'Horno & Canela',
      slug: DEMO_SLUG,
      email: demoEmail,
      password: 'demo-marchante-2026',
      whatsappPhone: '573158901234',
      category: 'reposteria',
    });
    const session: SellerSessionPayload = { ...registered, isDemo: true };
    await db
      .update(businesses)
      .set({ address: 'Calle 10 # 15-24, Barrio Centro' })
      .where(eq(businesses.id, registered.businessId));

    // Sembrar datos completos y realistas para la tienda demo (categorías, productos con desglose de costos,
    // clientes con notas, pedidos pendientes de WhatsApp, ventas de la semana pasada y de hoy, y gastos).
    const [catFavoritos] = await db
      .select()
      .from(categories)
      .where(eq(categories.businessId, session.businessId))
      .limit(1);

    const [catTortas] = await db
      .insert(categories)
      .values({
        businessId: session.businessId,
        name: 'Tortas y Postres de la Abuela',
        sortOrder: 2,
      })
      .returning();

    const [catBebidas] = await db
      .insert(categories)
      .values({
        businessId: session.businessId,
        name: 'Café del Quindío y Bebidas',
        sortOrder: 3,
      })
      .returning();

    if (catFavoritos && catTortas && catBebidas) {
      const insertedProds = await db
        .insert(products)
        .values([
          {
            businessId: session.businessId,
            categoryId: catFavoritos.id,
            name: 'Almojábana tibia con cuajada (x4)',
            description: 'Recién salidas del horno de leña, con queso campesino fresco.',
            priceCop: 12000,
            costCop: 5200,
            costBreakdown: [
              { id: 'b1', name: 'Cuajada fresca y maíz', costCop: 3800 },
              { id: 'b2', name: 'Mantequilla y horneado', costCop: 900 },
              { id: 'b3', name: 'Bolsa de papel kraft', costCop: 500 },
            ],
            sortOrder: 1,
          },
          {
            businessId: session.businessId,
            categoryId: catFavoritos.id,
            name: 'Pandebono Valluno Especial (x4)',
            description: 'Con almidón agrio de yuca, queso costeño y bocadillo opcional.',
            priceCop: 11000,
            costCop: 4500,
            costBreakdown: [
              { id: 'p1', name: 'Queso costeño y almidón', costCop: 3600 },
              { id: 'p2', name: 'Empaque térmico', costCop: 900 },
            ],
            sortOrder: 2,
          },
          {
            businessId: session.businessId,
            categoryId: catTortas.id,
            name: 'Torta casera de almojábana y bocadillo',
            description: 'Porción generosa con corazón de bocadillo veleño derretido.',
            priceCop: 14500,
            costCop: 5800,
            costBreakdown: [
              { id: 't1', name: 'Masa de almojábana y cuajada', costCop: 3900 },
              { id: 't2', name: 'Bocadillo veleño seleccionado', costCop: 1100 },
              { id: 't3', name: 'Cajita individual kraft', costCop: 800 },
            ],
            sortOrder: 1,
          },
          {
            businessId: session.businessId,
            categoryId: catTortas.id,
            name: 'Cheesecake artesanal de maracuyá',
            description: 'Base crocante de galleta con reducción natural de maracuyá valluno.',
            priceCop: 15500,
            costCop: 6200,
            sortOrder: 2,
          },
          {
            businessId: session.businessId,
            categoryId: catBebidas.id,
            name: 'Café de origen en leche de almendras',
            description: 'Tostión media del Quindío, 12 oz.',
            priceCop: 8500,
            costCop: 2900,
            sortOrder: 1,
          },
          {
            businessId: session.businessId,
            categoryId: catBebidas.id,
            name: 'Chocolate santafereño espumoso en jarra',
            description: 'Preparado con clavos, canela en astilla y queso para sumergir.',
            priceCop: 10000,
            costCop: 3800,
            sortOrder: 2,
          },
        ])
        .returning();

      const almojabana = insertedProds[0];
      const pandebono = insertedProds[1];
      const torta = insertedProds[2];
      const cafe = insertedProds[4];

      if (almojabana && pandebono && torta && cafe) {
        // Sembrar ventas de la semana pasada y de hoy + un pedido pendiente y un gasto usando los servicios del dominio
        const { recordQuickSale } = await import('@/modules/sales/service');
        const { createPublicPendingOrder } = await import('@/modules/orders/service');
        const { recordFinancialMovement } = await import('@/modules/finance/service');
        const { addBogotaDays, getBogotaDateString } = await import(
          '@/modules/shared/bogota-time'
        );

        const todayYmd = getBogotaDateString();
        const lastWeekYmd = addBogotaDays(todayYmd, -6);

        // Venta de la semana pasada
        await recordQuickSale(session.businessId, {
          paymentMethod: 'cash',
          newCustomerName: 'Don Jorge (Taller del Barrio)',
          newCustomerPhone: '3105551122',
          soldAt: new Date(`${lastWeekYmd}T15:00:00.000-05:00`),
          items: [
            { productId: almojabana.id, quantity: 4 }, // $48.000
            { productId: torta.id, quantity: 2 }, // $29.000 -> $77.000
          ],
        });

        // Ventas de HOY en Bogotá
        await recordQuickSale(session.businessId, {
          paymentMethod: 'nequi',
          newCustomerName: 'Camila Ospina',
          newCustomerPhone: '3154448899',
          items: [
            { productId: almojabana.id, quantity: 5 }, // $60.000
            { productId: cafe.id, quantity: 3 }, // $25.500 -> $85.500
          ],
        });

        await recordQuickSale(session.businessId, {
          paymentMethod: 'daviplata',
          newCustomerName: 'Valentina Ríos',
          newCustomerPhone: '3207773344',
          items: [
            { productId: torta.id, quantity: 2 }, // $29.000
            { productId: pandebono.id, quantity: 2 }, // $22.000 -> $51.000
          ],
        });

        // Gasto de hoy: compra de insumos (ya va dentro del costo de los productos)
        const [insumosCat] = await db
          .select({ id: expenseCategories.id })
          .from(expenseCategories)
          .where(eq(expenseCategories.businessId, session.businessId))
          .orderBy(expenseCategories.sortOrder)
          .limit(1);
        await recordFinancialMovement(session.businessId, {
          categoryId: insumosCat?.id ?? null,
          kind: 'EXPENSE',
          amountCop: 28000,
          paymentMethod: 'cash',
          description: 'Cuajada campesina fresca y bolsas kraft',
        });

        // Pedido pendiente entrante por WhatsApp listo para confirmar con 1 toque
        await createPublicPendingOrder({
          businessSlug: session.slug,
          clientOrderId: 'demo-pending-order-101',
          customerName: 'Sebastián Mejía',
          customerPhone: '3186665544',
          deliveryType: 'DELIVERY',
          deliveryAddress: 'Calle 14 # 8-45, Apto 301',
          paymentMethod: 'nequi',
          notes: 'Por favor mandar las almojábanas bien calienticas',
          items: [
            { productId: almojabana.id, quantity: 2, notes: 'Con buen queso' },
            { productId: torta.id, quantity: 1 },
          ],
        });
      }
    }

    return session;
  });
}

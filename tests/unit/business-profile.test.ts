import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { buildDefaultPaymentMethods, buildDefaultSchedule } from '@/modules/auth/defaults';
import { evaluateBusinessOpenStatus } from '@/modules/business/schedule';
import { getBusinessProfile, updateBusinessProfile } from '@/modules/business/service';
import {
  normalizeSocialHandleOrUrl,
  normalizeWhatsappPhone,
} from '@/modules/business/validators';

describe('Sección A — Perfil del negocio (A1 a A7)', () => {
  it('A7 & A6: normaliza celulares de WhatsApp colombianos (+57) y usuarios de redes sociales', () => {
    expect(normalizeWhatsappPhone('315 890 1234')).toBe('573158901234');
    expect(normalizeWhatsappPhone('+57 (300) 111-2233')).toBe('573001112233');
    expect(normalizeSocialHandleOrUrl('@hornoycanela', 'instagram')).toBe('hornoycanela');
    expect(normalizeSocialHandleOrUrl('mitienda.co', 'website')).toBe('https://mitienda.co');
  });

  it('A4: calcula correctamente si el negocio está Abierto o Cerrado en America/Bogota', () => {
    const schedule = buildDefaultSchedule(); // Lun-Vie 08:00 a 19:00, Dom cerrado

    // Lunes 2026-11-16 a las 10:30 a.m. Bogotá (15:30 UTC) -> Abierto
    const mondayMorning = new Date('2026-11-16T15:30:00.000Z');
    const openRes = evaluateBusinessOpenStatus(schedule, mondayMorning);
    expect(openRes.isOpen).toBe(true);
    expect(openRes.dayKey).toBe('lun');

    // Lunes 2026-11-16 a las 8:30 p.m. Bogotá (2026-11-17T01:30:00.000Z) -> Cerrado
    const mondayNight = new Date('2026-11-17T01:30:00.000Z');
    const closedNightRes = evaluateBusinessOpenStatus(schedule, mondayNight);
    expect(closedNightRes.isOpen).toBe(false);

    // Domingo 2026-11-22 a las 11:00 a.m. Bogotá (16:00 UTC) -> Cerrado por día de descanso
    const sundayNoon = new Date('2026-11-22T16:00:00.000Z');
    const sundayRes = evaluateBusinessOpenStatus(schedule, sundayNoon);
    expect(sundayRes.isOpen).toBe(false);
    expect(sundayRes.todayHoursLabel).toBe('Cerrado hoy');
  });

  it('A1..A7: actualiza y persiste nombre, dueño, categoría, dirección, coordenadas de mapa, horarios, pagos (Nequi/Daviplata) y redes bajo RLS', async () => {
    const seller = await registerSeller({
      ownerName: 'Carlos Pérez',
      businessName: 'Empanadas El Parque',
      slug: 'empanadas-el-parque',
      email: 'carlos-perfil@marchante.co',
      password: 'password123',
      whatsappPhone: '3105556677',
      category: 'comida_casera',
    });

    const customSchedule = buildDefaultSchedule();
    customSchedule.sab.isOpen = true;
    customSchedule.sab.openTime = '10:00';
    customSchedule.sab.closeTime = '22:00';
    customSchedule.dom.isOpen = false;

    const customPayments = buildDefaultPaymentMethods('3105556677').map((pm) =>
      pm.code === 'nequi'
        ? {
            ...pm,
            enabled: true,
            accountNumber: '3105556677',
            accountHolder: 'Carlos Pérez',
            instructions: 'Mandar comprobante al WhatsApp',
          }
        : pm,
    );

    const updated = await updateBusinessProfile(seller.businessId, {
      name: 'Empanadas & Ají El Parque',
      ownerName: 'Don Carlos Pérez',
      slug: 'empanadas-aji-parque',
      description: 'Las mejores empanadas vallunas con ají de lulo casero.',
      category: 'comida_casera',
      whatsappPhone: '310 555 6677',
      address: 'Carrera 5 # 12-08, Parque Principal',
      city: 'Yumbo, Valle del Cauca',
      latitude: 3.5845,
      longitude: -76.4951,
      schedule: customSchedule,
      paymentMethods: customPayments,
      socialLinks: {
        instagram: '@empanadaselparque',
        tiktok: '@empanadaselparque',
        facebook: 'empanadaselparque',
        website: 'empanadaselparque.co',
      },
    });

    expect(updated.name).toBe('Empanadas & Ají El Parque');
    expect(updated.slug).toBe('empanadas-aji-parque');
    expect(updated.whatsappPhone).toBe('573105556677');
    expect(updated.latitude).toBeCloseTo(3.5845, 4);
    expect(updated.longitude).toBeCloseTo(-76.4951, 4);
    expect(updated.schedule.sab.closeTime).toBe('22:00');
    expect(updated.socialLinks.instagram).toBe('empanadaselparque');
    expect(updated.socialLinks.website).toBe('https://empanadaselparque.co');

    const reloaded = await getBusinessProfile(seller.businessId);
    expect(reloaded.ownerName).toBe('Don Carlos Pérez');
    const nequi = reloaded.paymentMethods.find((m) => m.code === 'nequi');
    expect(nequi?.accountHolder).toBe('Carlos Pérez');
  });

  it('impide usar el slug de otro negocio existente o una ruta reservada', async () => {
    const seller1 = await registerSeller({
      ownerName: 'Vendedor Uno',
      businessName: 'Tienda Uno',
      slug: 'tienda-uno-unica',
      email: 'uno-slug@marchante.co',
      password: 'password123',
      whatsappPhone: '3112223344',
      category: 'reposteria',
    });

    const seller2 = await registerSeller({
      ownerName: 'Vendedor Dos',
      businessName: 'Tienda Dos',
      slug: 'tienda-dos-unica',
      email: 'dos-slug@marchante.co',
      password: 'password123',
      whatsappPhone: '3112223355',
      category: 'reposteria',
    });

    const profile2 = await getBusinessProfile(seller2.businessId);

    await expect(
      updateBusinessProfile(seller2.businessId, {
        ...profile2,
        slug: seller1.slug, // Intenta robarle el slug a Tienda Uno
      }),
    ).rejects.toThrow(/ya está siendo usado por otro negocio/);

    await expect(
      updateBusinessProfile(seller2.businessId, {
        ...profile2,
        slug: 'panel', // Ruta reservada
      }),
    ).rejects.toThrow(/ruta reservada/);
  });
});

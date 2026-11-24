import type { PaymentMethodConfig, WeeklyScheduleConfig } from '@/db/schema';

export function buildDefaultSchedule(): WeeklyScheduleConfig {
  return {
    lun: { isOpen: true, openTime: '08:00', closeTime: '19:00' },
    mar: { isOpen: true, openTime: '08:00', closeTime: '19:00' },
    mie: { isOpen: true, openTime: '08:00', closeTime: '19:00' },
    jue: { isOpen: true, openTime: '08:00', closeTime: '19:00' },
    vie: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
    sab: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
    dom: { isOpen: false, openTime: '09:00', closeTime: '15:00' },
  };
}

export function buildDefaultPaymentMethods(whatsappPhone?: string): PaymentMethodConfig[] {
  const cleanPhone = (whatsappPhone || '').replace(/\D/g, '').replace(/^57/, '');
  return [
    {
      code: 'cash',
      label: 'Efectivo',
      enabled: true,
      instructions: 'Pago al recibir o en el punto',
    },
    {
      code: 'nequi',
      label: 'Nequi',
      enabled: true,
      accountNumber: cleanPhone,
      accountHolder: '',
      instructions: 'Envíanos el pantallazo por WhatsApp',
    },
    {
      code: 'daviplata',
      label: 'Daviplata',
      enabled: true,
      accountNumber: cleanPhone,
      accountHolder: '',
      instructions: 'Envíanos el pantallazo por WhatsApp',
    },
    {
      code: 'transfer',
      label: 'Transferencia Bancaria',
      enabled: false,
      accountNumber: '',
      accountHolder: '',
      instructions: 'Bancolombia / Nu / Davivienda',
    },
    {
      code: 'breb',
      label: 'Llave Bre-B',
      enabled: false,
      accountNumber: '',
      accountHolder: '',
      instructions: 'Transferencia inmediata con llave',
    },
    {
      code: 'card',
      label: 'Tarjeta / Datáfono',
      enabled: false,
      accountNumber: '',
      accountHolder: '',
      instructions: 'Aceptamos débito y crédito',
    },
  ];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Materia prima e insumos', isProductCost: true, icon: 'wheat', sortOrder: 1 },
  { name: 'Empaques y bolsas', isProductCost: true, icon: 'package', sortOrder: 2 },
  { name: 'Transporte y domicilios', isProductCost: false, icon: 'bike', sortOrder: 3 },
  { name: 'Servicios y arriendo', isProductCost: false, icon: 'store', sortOrder: 4 },
  { name: 'Publicidad y redes', isProductCost: false, icon: 'megaphone', sortOrder: 5 },
  { name: 'Otros gastos del día', isProductCost: false, icon: 'receipt', sortOrder: 6 },
];

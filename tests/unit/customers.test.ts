import { describe, expect, it } from 'vitest';
import { registerSeller } from '@/modules/auth/service';
import { createProduct, listCategories } from '@/modules/catalog/service';
import {
  createCustomer,
  getCustomerDetailWithHistory,
  listCustomers,
  updateCustomer,
} from '@/modules/customers/service';
import { recordQuickSale } from '@/modules/sales/service';

describe('Sección F — Clientes: Base Automática/Manual, Historial, Total Gastado y Notas (F1 a F4)', () => {
  it('F1..F4: crea clientes manualmente o por venta, actualiza notas, acumula total gastado/última compra y consulta el historial completo', async () => {
    const seller = await registerSeller({
      ownerName: 'Gloria Pineda',
      businessName: 'Almuerzos Doña Gloria',
      slug: 'almuerzos-dona-gloria',
      email: 'gloria-crm@marchante.co',
      password: 'password123',
      whatsappPhone: '3193334455',
      category: 'comida_casera',
    });

    const cats = await listCategories(seller.businessId);
    const prod = await createProduct(seller.businessId, {
      categoryId: cats[0]!.id,
      name: 'Bandeja Ejecutiva con Sancocho',
      priceCop: 18000,
      costCop: 8000,
    });

    // F2: Crear cliente a mano con notas
    const manualCustomer = await createCustomer(seller.businessId, {
      name: 'Don Jorge (Taller Mecánico)',
      phone: '315 222 1100',
      address: 'Calle 8 # 4-20',
      notes: 'Siempre pide limonada sin hielo y paga por Nequi',
    });

    expect(manualCustomer.name).toBe('Don Jorge (Taller Mecánico)');
    expect(manualCustomer.phone).toBe('3152221100');
    expect(manualCustomer.totalSpentCop).toBe(0);

    // Registrar 2 ventas para Don Jorge
    await recordQuickSale(seller.businessId, {
      customerId: manualCustomer.id,
      paymentMethod: 'nequi',
      items: [{ productId: prod.id, quantity: 2 }], // $36.000
    });

    await recordQuickSale(seller.businessId, {
      customerId: manualCustomer.id,
      paymentMethod: 'cash',
      items: [{ productId: prod.id, quantity: 1 }], // $18.000
    });

    // Editar notas del cliente
    const updatedCustomer = await updateCustomer(seller.businessId, {
      customerId: manualCustomer.id,
      name: 'Don Jorge (Taller Mecánico)',
      phone: '3152221100',
      address: 'Calle 8 # 4-20',
      notes: 'Cliente VIP: le gusta el ají aparte',
    });
    expect(updatedCustomer.notes).toBe('Cliente VIP: le gusta el ají aparte');

    // F3: Consultar historial completo del cliente
    const history = await getCustomerDetailWithHistory(seller.businessId, manualCustomer.id);
    expect(history.customer.totalSpentCop).toBe(54000);
    expect(history.customer.purchasesCount).toBe(2);
    expect(history.customer.lastPurchaseAt).not.toBeNull();
    expect(history.purchases).toHaveLength(2);
    expect(history.purchases[0]?.items[0]?.productNameSnapshot).toBe(
      'Bandeja Ejecutiva con Sancocho',
    );

    // F4: Buscar por nota o nombre
    const searchVip = await listCustomers(seller.businessId, {
      search: 'ají aparte',
      sortBy: 'top_spent',
    });
    expect(searchVip).toHaveLength(1);
    expect(searchVip[0]?.id).toBe(manualCustomer.id);
  });
});

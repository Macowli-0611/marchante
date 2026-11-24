'use client';

import React, { useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CustomerCard } from './customers/customer-card';
import { CustomerFormDialog } from './customers/customer-form-dialog';
import { CustomerHistoryDialog } from './customers/customer-history-dialog';
import type { CustomerFormValues, CustomerSort, CustomerSummaryItem } from './customers/types';
import { useCustomers } from './customers/use-customers';

export type { CustomerSummaryItem } from './customers/types';

const SORT_OPTIONS: Array<{ id: CustomerSort; label: string }> = [
  { id: 'top_spent', label: 'Más han comprado' },
  { id: 'recent', label: 'Más recientes' },
  { id: 'name', label: 'A–Z' },
];

type FormState = { customerId: string | null; values: CustomerFormValues };

/** Cuaderno de clientes (/panel/clientes). Las piezas viven en `./customers/`. */
export function CustomersManager({ initialCustomers }: { initialCustomers: CustomerSummaryItem[] }) {
  const book = useCustomers(initialCustomers);
  const [form, setForm] = useState<FormState | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <div className="card-boleto-strong p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Tu clientela fiel ({book.customers.length})
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">Cuaderno de clientes</h1>
          <p className="text-sm text-ink-muted">
            Se llena solo cuando te piden por el catálogo y también puedes anotar clientes a mano con sus gustos,
            notas e historial de compras.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ customerId: null, values: { name: '', phone: '', address: '', notes: '' } })}
          className="min-h-[44px] px-4 inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-brand text-sm font-bold text-paper shadow-stamp-2 hover:bg-brand-strong shrink-0 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      <FeedbackBanner feedback={book.feedback} />

      {/* Buscador y ordenamiento (F4) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="h-4 w-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            aria-label="Buscar cliente"
            value={book.search}
            onChange={(e) => book.changeSearch(e.target.value)}
            placeholder="Buscar por nombre, celular o nota..."
            className="w-full min-h-[44px] rounded-xl border border-line bg-paper pl-10 pr-4 py-2 text-sm text-ink"
          />
        </div>
        <SegmentedControl label="Ordenar clientes" options={SORT_OPTIONS} value={book.sortBy} onChange={book.changeSort} />
      </div>

      {book.customers.length === 0 ? (
        <div className="card-boleto p-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-soft border border-brand/30 flex items-center justify-center text-brand">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">Aún no hay clientes registrados</h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            Cuando alguien haga un pedido desde tu vitrina pública o lo anotes aquí, aparecerá su ficha con todo lo
            que ha comprado.
          </p>
        </div>
      ) : (
        <div aria-busy={book.loading} className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${book.loading ? 'opacity-60' : ''}`}>
          {book.customers.map((cust) => (
            <CustomerCard
              key={cust.id}
              customer={cust}
              onEdit={(c) =>
                setForm({
                  customerId: c.id,
                  values: { name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' },
                })
              }
              onHistory={book.openHistory}
            />
          ))}
        </div>
      )}

      {form && (
        <CustomerFormDialog
          customerId={form.customerId}
          initialValues={form.values}
          onClose={() => setForm(null)}
          onSave={book.saveCustomer}
        />
      )}

      {(book.detail || book.loadingDetail) && (
        <CustomerHistoryDialog detail={book.detail} loading={book.loadingDetail} onClose={book.closeHistory} />
      )}
    </div>
  );
}

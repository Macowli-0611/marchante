'use client';

import { useState } from 'react';
import type { Feedback } from '@/components/ui/feedback-banner';
import type { CustomerDetail, CustomerFormValues, CustomerSort, CustomerSummaryItem } from './types';

/** Cuaderno de clientes (F1..F4): búsqueda, orden, alta/edición e historial. */
export function useCustomers(initialCustomers: CustomerSummaryItem[]) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CustomerSort>('top_spent');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function refresh(opts?: { search?: string; sortBy?: CustomerSort }) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: opts?.search ?? search, sortBy: opts?.sortBy ?? sortBy });
      const res = await fetch(`/api/panel/customers?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.ok) setCustomers(data.customers);
    } finally {
      setLoading(false);
    }
  }

  function changeSearch(value: string) {
    setSearch(value);
    refresh({ search: value });
  }

  function changeSort(value: CustomerSort) {
    setSortBy(value);
    refresh({ sortBy: value });
  }

  async function openHistory(customer: Pick<CustomerSummaryItem, 'id'>) {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/panel/customers?id=${customer.id}`);
      const data = await res.json();
      if (res.ok && data.ok) setDetail({ customer: data.customer, purchases: data.purchases });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function saveCustomer(values: CustomerFormValues, customerId: string | null): Promise<boolean> {
    setFeedback(null);
    const isEdit = Boolean(customerId);
    const res = await fetch('/api/panel/customers', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(isEdit ? { customerId } : {}), ...values }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setFeedback({ type: 'error', message: data.error || 'No se pudo guardar el cliente' });
      return false;
    }
    setFeedback({
      type: 'success',
      message: isEdit ? `Ficha de "${values.name}" actualizada.` : `¡Cliente "${values.name}" agregado a tu cuaderno!`,
    });
    await refresh();
    if (detail && detail.customer.id === customerId) await openHistory(data.customer);
    return true;
  }

  return {
    customers,
    search,
    sortBy,
    loading,
    feedback,
    detail,
    loadingDetail,
    changeSearch,
    changeSort,
    openHistory,
    closeHistory: () => setDetail(null),
    saveCustomer,
  };
}

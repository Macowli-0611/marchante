'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Feedback } from '@/components/ui/feedback-banner';
import type { PaymentMethodConfig } from '@/db/schema';
import { evaluateBusinessOpenStatus } from '@/modules/business/schedule';
import { normalizeWhatsappPhone } from '@/modules/business/validators';
import type { DayOfWeekKey } from '@/modules/shared/bogota-time';
import { validateBusinessSlug } from '@/modules/shared/slug';
import type { BusinessProfileFormData, ProfileValues } from './types';

/** Estado, validaciones en vivo y guardado del perfil del negocio (A1..A7). */
export function useBusinessProfile(initialData: BusinessProfileFormData) {
  const router = useRouter();
  const { id: _id, ...initialValues } = initialData;
  const [values, setValues] = useState<ProfileValues>({
    ...initialValues,
    socialLinks: initialData.socialLinks || {},
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const slugCheck = useMemo(() => validateBusinessSlug(values.slug), [values.slug]);
  const openStatus = useMemo(() => evaluateBusinessOpenStatus(values.schedule), [values.schedule]);
  const normalizedWhatsapp = useMemo(() => normalizeWhatsappPhone(values.whatsappPhone), [values.whatsappPhone]);

  function setField<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateDay(day: DayOfWeekKey, patch: Partial<{ isOpen: boolean; openTime: string; closeTime: string }>) {
    setValues((prev) => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], ...patch } } }));
  }

  function copyMondayToWeekdays() {
    setValues((prev) => {
      const mon = prev.schedule.lun;
      return {
        ...prev,
        schedule: { ...prev.schedule, mar: { ...mon }, mie: { ...mon }, jue: { ...mon }, vie: { ...mon } },
      };
    });
    setFeedback({
      type: 'success',
      message: 'Copiamos el horario del lunes a martes, miércoles, jueves y viernes.',
    });
  }

  function updatePaymentMethod(index: number, patch: Partial<PaymentMethodConfig>) {
    setValues((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    if (!slugCheck.valid) {
      setFeedback({ type: 'error', message: slugCheck.error || 'El link elegido no es válido.' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/panel/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, slug: slugCheck.normalized }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'error', message: data.error || 'No pudimos guardar los cambios.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: '¡Listo! Los datos de tu negocio quedaron guardados y publicados en tu vitrina.',
      });
      router.refresh();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al guardar. Revisa tu internet e intenta otra vez.' });
    } finally {
      setSaving(false);
    }
  }

  return {
    values,
    setField,
    updateDay,
    copyMondayToWeekdays,
    updatePaymentMethod,
    slugCheck,
    openStatus,
    normalizedWhatsapp,
    saving,
    feedback,
    submit,
  };
}

export type BusinessProfileState = ReturnType<typeof useBusinessProfile>;

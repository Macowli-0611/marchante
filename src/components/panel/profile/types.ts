import type { PaymentMethodConfig, SocialLinksConfig, WeeklyScheduleConfig } from '@/db/schema';

export interface BusinessProfileFormData {
  id: string;
  name: string;
  ownerName: string;
  slug: string;
  description: string;
  category: string;
  whatsappPhone: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  schedule: WeeklyScheduleConfig;
  paymentMethods: PaymentMethodConfig[];
  socialLinks: SocialLinksConfig;
}

export type ProfileTab = 'identidad' | 'ubicacion' | 'horarios' | 'pagos_redes';

/** Valores editables del formulario (todo menos el id). */
export type ProfileValues = Omit<BusinessProfileFormData, 'id'>;

export type SetProfileField = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => void;

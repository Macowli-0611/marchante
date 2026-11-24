import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/modules/auth/session';
import { getBusinessProfile } from '@/modules/business/service';
import { BusinessProfileForm } from '@/components/panel/business-profile-form';
import { PasswordChangeForm } from '@/components/panel/password-change-form';

export default async function BusinessProfilePage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }

  const business = await getBusinessProfile(session.businessId);

  return (
    <>
    <BusinessProfileForm
      initialData={{
        id: business.id,
        name: business.name,
        ownerName: business.ownerName,
        slug: business.slug,
        description: business.description,
        category: business.category,
        whatsappPhone: business.whatsappPhone,
        address: business.address,
        city: business.city,
        latitude: business.latitude,
        longitude: business.longitude,
        schedule: business.schedule,
        paymentMethods: business.paymentMethods,
        socialLinks: business.socialLinks,
      }}
    />
    {!session.isDemo && <PasswordChangeForm />}
    </>
  );
}

import React from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { MovableLocationMap } from '@/components/panel/movable-location-map';
import type { BusinessProfileState } from './use-business-profile';

const LABEL = 'block text-sm font-semibold text-ink mb-1.5';
const INPUT = 'w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base text-ink';

/** Pestaña 2: dirección, ciudad y punto movible en el mapa (A3). */
export function LocationSection({ profile }: { profile: BusinessProfileState }) {
  const { values, setField } = profile;

  return (
    <SectionCard
      title="Ubicación, dirección y punto en el mapa"
      description="Para que tus clientes sepan dónde recoger o desde qué barrio despachas."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="biz-address" className={LABEL}>
            Dirección o punto de referencia
          </label>
          <input
            id="biz-address"
            type="text"
            autoComplete="street-address"
            value={values.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="Ej. Calle 10 # 15-24, frente al parque"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="biz-city" className={LABEL}>
            Barrio / Ciudad *
          </label>
          <input
            id="biz-city"
            type="text"
            required
            value={values.city}
            onChange={(e) => setField('city', e.target.value)}
            placeholder="Ej. Cali, Valle del Cauca"
            className={INPUT}
          />
        </div>
      </div>

      <MovableLocationMap
        latitude={values.latitude}
        longitude={values.longitude}
        city={values.city}
        onChange={(coords) => {
          setField('latitude', coords.latitude);
          setField('longitude', coords.longitude);
          if (coords.city) setField('city', coords.city);
        }}
      />
    </SectionCard>
  );
}

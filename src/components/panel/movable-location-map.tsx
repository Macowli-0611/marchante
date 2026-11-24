'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { COLOR } from '@/components/ui/color-tokens';

const MAP_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '© OpenStreetMap contributors';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COLOMBIA_CITY_PRESETS } from '@/modules/business/validators';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface MovableLocationMapProps {
  latitude: number;
  longitude: number;
  city: string;
  onChange: (coords: { latitude: number; longitude: number; city?: string }) => void;
}

/**
 * Mapa interactivo (MapLibre GL + OpenStreetMap) con marcador arrastrable,
 * toque directo en el mapa, geolocalización GPS del navegador, selector de ciudades
 * colombianas y controles accesibles sin arrastre (WCAG 2.2 SC 2.5.7).
 */
export function MovableLocationMap({
  latitude,
  longitude,
  city,
  onChange,
}: MovableLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              // En producción usa un proveedor de teselas propio (MapTiler, Stadia, etc.):
              // la política de tile.openstreetmap.org no admite uso comercial intensivo.
              tiles: [MAP_TILE_URL],
              tileSize: 256,
              attribution: MAP_TILE_ATTRIBUTION,
            },
          },
          layers: [
            {
              id: 'osm-layer',
              type: 'raster',
              source: 'osm',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [longitude, latitude],
        zoom: 15,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      const marker = new maplibregl.Marker({
        color: COLOR.brand,
        draggable: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onChange({
          latitude: Number(lngLat.lat.toFixed(6)),
          longitude: Number(lngLat.lng.toFixed(6)),
        });
      });

      map.on('click', (e) => {
        const lat = Number(e.lngLat.lat.toFixed(6));
        const lng = Number(e.lngLat.lng.toFixed(6));
        marker.setLngLat([lng, lat]);
        onChange({ latitude: lat, longitude: lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
    } catch {
      // Fallback silencioso en entornos sin WebGL (ej. headless tests)
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar cuando las coordenadas cambian desde los botones o presets de ciudad
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const current = markerRef.current.getLngLat();
      if (
        Math.abs(current.lat - latitude) > 0.00001 ||
        Math.abs(current.lng - longitude) > 0.00001
      ) {
        markerRef.current.setLngLat([longitude, latitude]);
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15, duration: 500 });
      }
    }
  }, [latitude, longitude]);

  function handleUseMyGps() {
    if (!navigator.geolocation) {
      setGpsStatus('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setGpsStatus('Buscando tu ubicación...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChange({ latitude: lat, longitude: lng });
        setGpsStatus('¡Ubicación actualizada con tu GPS!');
      },
      () => {
        setGpsStatus('No pudimos leer el GPS. Puedes arrastrar el pin o tocar el mapa.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function nudgeCoordinates(dLat: number, dLng: number) {
    onChange({
      latitude: Number((latitude + dLat).toFixed(6)),
      longitude: Number((longitude + dLng).toFixed(6)),
    });
  }

  return (
    <div className="space-y-3">
      {/* Atajos de ciudad y GPS */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="city-preset" className="text-xs font-bold text-ink-muted">
            Centrar rápido en:
          </label>
          <select
            id="city-preset"
            value=""
            onChange={(e) => {
              const preset = COLOMBIA_CITY_PRESETS.find((c) => c.name === e.target.value);
              if (preset) {
                onChange({
                  latitude: preset.lat,
                  longitude: preset.lng,
                  city: preset.name,
                });
              }
            }}
            className="min-h-[40px] rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink"
          >
            <option value="">Elegir ciudad de Colombia...</option>
            {COLOMBIA_CITY_PRESETS.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleUseMyGps}
          className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-canvas text-xs font-bold text-ink hover:bg-subtle transition-colors cursor-pointer"
        >
          <Navigation className="h-3.5 w-3.5 text-brand" />
          Usar mi ubicación GPS
        </button>
      </div>

      {gpsStatus && <p className="text-xs font-medium text-profit">{gpsStatus}</p>}

      {/* Lienzo del mapa con marcador movible */}
      <div className="relative rounded-2xl border-2 border-ink overflow-hidden bg-subtle shadow-stamp-2">
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full"
          aria-label={`Mapa de ubicación del negocio en ${city}. Arrastra el marcador rojo o toca cualquier punto para moverlo.`}
        />
        <div className="bg-paper/95 border-t border-line px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-ink flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-brand shrink-0" />
            Arrastra el pin rojo o toca el mapa donde queda tu punto
          </span>
          <span className="font-mono-cop text-ink-muted">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>
      </div>

      {/* Alternativa accesible sin arrastre (WCAG 2.2 SC 2.5.7) + edición fina de coordenadas */}
      <div className="rounded-xl border border-line bg-canvas p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
          <Compass className="h-4 w-4 text-brand" />
          <span>Ajuste fino del marcador (accesible por toque o teclado):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => nudgeCoordinates(0.0005, 0)}
            className="min-h-[38px] px-2.5 rounded-lg border border-line bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            ↑ Norte
          </button>
          <button
            type="button"
            onClick={() => nudgeCoordinates(-0.0005, 0)}
            className="min-h-[38px] px-2.5 rounded-lg border border-line bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            ↓ Sur
          </button>
          <button
            type="button"
            onClick={() => nudgeCoordinates(0, -0.0005)}
            className="min-h-[38px] px-2.5 rounded-lg border border-line bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            ← Oeste
          </button>
          <button
            type="button"
            onClick={() => nudgeCoordinates(0, 0.0005)}
            className="min-h-[38px] px-2.5 rounded-lg border border-line bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
          >
            → Este
          </button>
        </div>
      </div>
    </div>
  );
}

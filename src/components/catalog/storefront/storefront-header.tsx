import React from 'react';
import { Clock, ExternalLink, Globe, MapPin } from 'lucide-react';
import type { BusinessOpenStatus } from '@/modules/business/schedule';
import type { PublicBusinessView, StorefrontTheme } from './types';

interface StorefrontHeaderProps {
  business: PublicBusinessView;
  openStatus: BusinessOpenStatus;
  theme: StorefrontTheme;
  onShowSchedule: () => void;
}

/** Portada y ficha del negocio (C1, D1..D4). */
export function StorefrontHeader({ business, openStatus, theme, onShowSchedule }: StorefrontHeaderProps) {
  const { brandColor, headingFont, isDark } = theme;

  return (
    <header className="relative">
      {/* Franja de portada o imagen de portada */}
      <div
        className="h-36 sm:h-48 w-full relative overflow-hidden border-b-2 border-ink"
        style={{
          backgroundColor: brandColor,
          backgroundImage: business.coverUrl
            ? `url(${business.coverUrl})`
            : 'repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 16px, transparent 16px, transparent 32px)',
          backgroundSize: business.coverUrl ? 'cover' : undefined,
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
      </div>

      {/* Ficha flotante del negocio */}
      <div className="mx-auto max-w-3xl px-4 -mt-14 relative z-10">
        <div
          className={`rounded-2xl border-2 border-ink p-4 sm:p-5 shadow-stamp-3 ${
            isDark ? 'bg-ink-hover text-canvas' : 'bg-paper text-ink'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`Logo de ${business.name}`}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-ink bg-paper shrink-0"
              />
            ) : (
              <div
                className="h-20 w-20 rounded-2xl border-2 border-ink flex items-center justify-center text-2xl font-extrabold text-paper shrink-0 shadow-stamp-2"
                style={{ backgroundColor: brandColor }}
              >
                {business.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    openStatus.isOpen
                      ? 'bg-profit-soft border-profit text-profit'
                      : 'bg-warning-soft border-warning text-warning'
                  }`}
                >
                  ● {openStatus.statusMessage}
                </span>

                <button
                  type="button"
                  onClick={onShowSchedule}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink hover:bg-subtle cursor-pointer"
                >
                  <Clock className="h-3 w-3" />
                  Ver horarios
                </button>
              </div>

              <h1 className={`${headingFont} text-2xl sm:text-3xl leading-tight`}>{business.name}</h1>

              {business.description && (
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-line' : 'text-ink-muted'}`}
                >
                  {business.description}
                </p>
              )}
            </div>
          </div>

          {/* Ubicación y métodos de pago */}
          <div className="mt-4 pt-3 border-t border-dashed border-line/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {(business.address || business.city) && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${business.latitude}&mlon=${business.longitude}#map=16/${business.latitude}/${business.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: brandColor }} />
                  <span>
                    {business.address ? `${business.address}, ` : ''}
                    {business.city}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {business.paymentMethods.map((pm) => (
                <span
                  key={pm.code}
                  className="rounded-md border border-line bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink"
                >
                  {pm.label}
                </span>
              ))}
            </div>
          </div>

          <SocialLinks links={business.socialLinks} />
        </div>
      </div>
    </header>
  );
}

const SOCIAL_LINK_CLASS = 'rounded-lg border border-line bg-canvas px-2.5 py-1 text-ink hover:bg-subtle';

function toProfileUrl(value: string, base: string): string {
  return value.startsWith('http') ? value : `${base}${value}`;
}

function SocialLinks({ links }: { links: PublicBusinessView['socialLinks'] }) {
  if (!links?.instagram && !links?.tiktok && !links?.facebook && !links?.website) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold">
      {links.instagram && (
        <a
          href={toProfileUrl(links.instagram, 'https://instagram.com/')}
          target="_blank"
          rel="noreferrer"
          className={SOCIAL_LINK_CLASS}
        >
          Instagram @{links.instagram.replace(/^https?:\/\/[^/]+\//, '')}
        </a>
      )}
      {links.tiktok && (
        <a href={toProfileUrl(links.tiktok, 'https://tiktok.com/@')} target="_blank" rel="noreferrer" className={SOCIAL_LINK_CLASS}>
          TikTok
        </a>
      )}
      {links.facebook && (
        <a href={toProfileUrl(links.facebook, 'https://facebook.com/')} target="_blank" rel="noreferrer" className={SOCIAL_LINK_CLASS}>
          Facebook
        </a>
      )}
      {links.website && (
        <a href={links.website} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 ${SOCIAL_LINK_CLASS}`}>
          <Globe className="h-3 w-3" /> Web
        </a>
      )}
    </div>
  );
}

import React from 'react';
import { Clock, CreditCard, MapPin, Store } from 'lucide-react';
import type { ProfileTab } from './types';

export const PROFILE_TABS: Array<{ id: ProfileTab; label: string; icon: typeof Store }> = [
  { id: 'identidad', label: '1. Datos y WhatsApp', icon: Store },
  { id: 'ubicacion', label: '2. Dirección y Mapa', icon: MapPin },
  { id: 'horarios', label: '3. Horarios', icon: Clock },
  { id: 'pagos_redes', label: '4. Pagos y Redes', icon: CreditCard },
];

export const tabId = (tab: ProfileTab) => `profile-tab-${tab}`;
export const panelId = (tab: ProfileTab) => `profile-panel-${tab}`;

/** Riel de pestañas móvil-primero (44px táctiles). */
export function ProfileTabs({ active, onChange }: { active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = PROFILE_TABS[(index + (e.key === 'ArrowRight' ? 1 : PROFILE_TABS.length - 1)) % PROFILE_TABS.length]!;
    onChange(next.id);
    document.getElementById(tabId(next.id))?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Secciones del perfil del negocio"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border border-line bg-subtle p-1.5"
    >
      {PROFILE_TABS.map((tab, index) => {
        const Icon = tab.icon;
        const isSelected = active === tab.id;
        return (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={panelId(tab.id)}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`min-h-[44px] px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              isSelected ? 'bg-paper text-ink border border-ink shadow-stamp-1' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

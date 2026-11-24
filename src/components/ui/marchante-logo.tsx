import React from 'react';

interface MarchanteLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

/**
 * Logo propio de Marchante:
 * Un toldo de tienda de barrio de 3 ondas en Rojo Achiote (token --color-brand) con sello tipográfico en Fraunces.
 */
export function MarchanteLogo({ size = 'md', showTagline = false }: MarchanteLogoProps) {
  const iconDimensions = size === 'sm' ? 34 : size === 'lg' ? 48 : 40;
  const titleClass =
    size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={iconDimensions}
        height={iconDimensions}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="6"
          y="6"
          width="108"
          height="108"
          rx="22"
          className="fill-paper stroke-ink"
          strokeWidth="5"
        />
        <path
          d="M16 24H104L108 44C108 51.5 101.5 57 93 57C84.5 57 78 51.5 78 44C78 51.5 70 57 60 57C50 57 42 51.5 42 44C42 51.5 35.5 57 27 57C18.5 57 12 51.5 12 44L16 24Z"
          className="fill-brand stroke-ink"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        <path
          d="M42 25V43M78 25V43"
          className="stroke-canvas"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M34 92V66L47 82L60 65L73 82L86 66V92"
          className="stroke-ink"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy="93" r="4.5" className="fill-profit" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={`font-display font-bold tracking-tight text-ink ${titleClass}`}>
          Marchante
        </span>
        {showTagline && (
          <span className="mt-0.5 text-xs font-medium text-ink-muted">
            Tu mostrador y vitrina al día
          </span>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type DialogPlacement = 'sheet' | 'center';

interface DialogProps {
  /** id del título que nombra el diálogo (aria-labelledby). */
  labelledBy: string;
  onClose: () => void;
  /** `sheet`: sube desde abajo en el celular y se centra en pantallas grandes. */
  placement?: DialogPlacement;
  /** Permite desplazar el fondo cuando el contenido es más alto que la pantalla. */
  scrollable?: boolean;
  /** Capa por encima de otros diálogos (ej. confirmaciones sobre un modal). */
  zIndexClass?: string;
  children: React.ReactNode;
}

/**
 * Capa modal accesible: role="dialog", cierre con Escape y foco inicial dentro
 * del diálogo (devuelve el foco al elemento que lo abrió al cerrarse).
 */
export function Dialog({
  labelledBy,
  onClose,
  placement = 'sheet',
  scrollable = false,
  zIndexClass = 'z-50',
  children,
}: DialogProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    overlayRef.current?.focus({ preventScroll: true });
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, []);

  const placementClass =
    placement === 'sheet'
      ? 'items-end sm:items-center p-0 sm:p-4'
      : 'items-center p-4';

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className={`fixed inset-0 ${zIndexClass} flex justify-center bg-ink/65 outline-none ${placementClass} ${
        scrollable ? 'overflow-y-auto' : ''
      }`}
    >
      {children}
    </div>
  );
}

interface CloseButtonProps {
  label: string;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Botón cuadrado con una X, usado en la cabecera de los diálogos. */
export function CloseButton({ label, onClick, size = 'md', className = '' }: CloseButtonProps) {
  const sizeClass =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-10 w-10 rounded-xl' : 'h-9 w-9 rounded-xl';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`${sizeClass} border border-line inline-flex items-center justify-center cursor-pointer ${className}`}
    >
      <X className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
    </button>
  );
}

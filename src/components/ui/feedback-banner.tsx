import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface Feedback {
  type: 'success' | 'error';
  message: string;
}

interface FeedbackBannerProps {
  feedback: Feedback | null;
  /** Si se da, muestra el enlace "Cerrar". */
  onDismiss?: () => void;
}

/**
 * Aviso de resultado de una acción. Los errores se anuncian de inmediato
 * a lectores de pantalla (role="alert"); los éxitos, de forma educada (role="status").
 */
export function FeedbackBanner({ feedback, onDismiss }: FeedbackBannerProps) {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
      className={`flex items-start gap-2.5 rounded-2xl border-2 p-4 text-sm font-semibold ${
        onDismiss ? 'justify-between gap-3' : ''
      } ${
        isSuccess
          ? 'border-profit bg-profit-soft text-profit-strong'
          : 'border-danger bg-danger-soft text-danger'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <span>{feedback.message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          className="text-xs underline cursor-pointer"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}

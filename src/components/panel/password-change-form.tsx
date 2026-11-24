'use client';

import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';

/** Cambio de contraseña: verifica la actual y cierra la sesión en los demás dispositivos. */
export function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setFeedback({
          type: 'ok',
          message: 'Contraseña cambiada. Cerramos tu sesión en los demás dispositivos.',
        });
      } else {
        setFeedback({ type: 'error', message: data.error || 'No se pudo cambiar la contraseña.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="password-change-title"
      className="card-boleto mx-auto mt-6 max-w-3xl space-y-3 p-5"
    >
      <h2
        id="password-change-title"
        className="flex items-center gap-2 font-display text-lg font-bold text-ink"
      >
        <KeyRound className="h-5 w-5 text-brand" aria-hidden="true" />
        Cambiar contraseña
      </h2>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-semibold text-ink">
            Contraseña actual
          </label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-semibold text-ink">
            Nueva contraseña (mín. 8 caracteres)
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-line bg-paper px-3.5 py-2 text-base text-ink"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] rounded-xl border-2 border-ink bg-ink px-4 text-sm font-bold text-paper disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
          {feedback && (
            <p
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`text-sm font-semibold ${
                feedback.type === 'error' ? 'text-danger' : 'text-profit'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

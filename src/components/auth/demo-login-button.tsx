'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

export function DemoLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/demo')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEnabled(Boolean(d?.enabled));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDemoLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo iniciar la demo');
        setLoading(false);
        return;
      }
      router.push('/panel');
      router.refresh();
    } catch {
      setError('Error de conexión al preparar la demo.');
      setLoading(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={loading}
        className="min-h-[48px] px-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper text-sm font-bold text-ink hover:bg-subtle disabled:opacity-60 transition-colors cursor-pointer"
      >
        <Sparkles className="h-4 w-4 text-warning" />
        {loading ? 'Abriendo mostrador demo...' : 'Entrar con tienda de demostración'}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

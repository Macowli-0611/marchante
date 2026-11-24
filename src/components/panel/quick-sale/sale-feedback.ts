/**
 * Timbre corto de caja registradora con Web Audio API (sin archivos) más vibración
 * en celulares compatibles (Requisito E6).
 */
export function triggerSaleFeedback(soundEnabled: boolean) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([35, 25, 55]);
    } catch {
      // El navegador puede bloquear vibrate
    }
  }

  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    // Dos notas ascendentes estilo timbre de mostrador (Mi6 -> Si6)
    [1318.5, 1975.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  } catch {
    // Web Audio no disponible
  }
}

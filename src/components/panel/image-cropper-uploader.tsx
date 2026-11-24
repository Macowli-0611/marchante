'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, ZoomIn, Check, X, Trash2, Image as ImageIcon } from 'lucide-react';
import { COLOR } from '@/components/ui/color-tokens';

interface ImageCropperUploaderProps {
  currentImageUrl: string | null;
  onImageUploaded: (url: string | null) => void;
  kind?: 'product' | 'logo' | 'cover';
  label?: string;
}

/**
 * Subidor de imagen con recortador interactivo en canvas (zoom + encuadre horizontal/vertical)
 * que envía el recorte al servidor donde `sharp` lo valida y optimiza a WebP ligero.
 */
export function ImageCropperUploader({
  currentImageUrl,
  onImageUploaded,
  kind = 'product',
  label = 'Foto del producto',
}: ImageCropperUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -100 .. 100 %
  const [offsetY, setOffsetY] = useState(0); // -100 .. 100 %
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSizeKb, setLastSizeKb] = useState<number | null>(null);

  const canvasWidth = kind === 'cover' ? 600 : 360;
  const canvasHeight = kind === 'cover' ? 240 : 360;

  useEffect(() => {
    if (!rawPreviewUrl || !canvasRef.current) return;
    const img = new window.Image();
    img.onload = () => {
      loadedImageRef.current = img;
      drawCropPreview();
    };
    img.src = rawPreviewUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPreviewUrl]);

  useEffect(() => {
    drawCropPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, offsetX, offsetY]);

  function drawCropPreview() {
    const canvas = canvasRef.current;
    const img = loadedImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = COLOR.canvas;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const scaleBase = Math.max(canvasWidth / img.width, canvasHeight / img.height);
    const scale = scaleBase * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const maxShiftX = Math.max(0, (drawW - canvasWidth) / 2);
    const maxShiftY = Math.max(0, (drawH - canvasHeight) / 2);

    const dx = (canvasWidth - drawW) / 2 + (offsetX / 100) * maxShiftX;
    const dy = (canvasHeight - drawH) / 2 + (offsetY / 100) * maxShiftY;

    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen pesa más de 5 MB. Elige una foto más liviana.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRawPreviewUrl(objectUrl);
  }

  async function handleConfirmCropAndUpload() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setUploading(true);
    setError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.9),
      );
      if (!blob) {
        throw new Error('No se pudo preparar el recorte.');
      }

      const formData = new FormData();
      formData.append('file', new File([blob], `${kind}-crop.webp`, { type: 'image/webp' }));
      formData.append('kind', kind);

      const res = await fetch('/api/panel/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      onImageUploaded(data.imageUrl);
      setLastSizeKb(Math.max(1, Math.round((data.sizeBytes || blob.size) / 1024)));
      setRawPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al optimizar la imagen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {lastSizeKb && (
          <span className="text-xs font-mono-cop font-bold text-profit">
            ✓ Optimizada a WebP ({lastSizeKb} KB)
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Recortador interactivo cuando el usuario acaba de elegir un archivo */}
      {rawPreviewUrl ? (
        <div className="rounded-2xl border-2 border-ink bg-canvas p-4 space-y-3">
          <p className="text-xs font-bold text-ink">
            Encuadra y recorta tu imagen antes de optimizarla:
          </p>

          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="max-w-full h-auto rounded-xl border border-ink bg-paper"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <label className="space-y-1">
              <span className="font-semibold text-ink-muted flex items-center gap-1">
                <ZoomIn className="h-3.5 w-3.5" /> Zoom ({zoom.toFixed(1)}x)
              </span>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-ink-muted">Mover horizontal</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </label>

            <label className="space-y-1">
              <span className="font-semibold text-ink-muted">Mover vertical</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="2"
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRawPreviewUrl(null)}
              disabled={uploading}
              className="min-h-[42px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-line bg-paper text-xs font-bold text-ink-muted cursor-pointer"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmCropAndUpload}
              disabled={uploading}
              className="min-h-[42px] px-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-profit text-xs font-bold text-paper shadow-stamp-2 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {uploading ? 'Optimizando a WebP...' : 'Recortar y usar foto'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-canvas p-3.5">
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Vista previa"
              className="h-20 w-20 rounded-xl object-cover border border-ink bg-paper shrink-0"
            />
          ) : (
            <div className="h-20 w-20 rounded-xl border border-line bg-paper flex flex-col items-center justify-center text-ink-faint shrink-0">
              <ImageIcon className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">Sin foto</span>
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-xs text-ink-muted">
              JPG, PNG o WebP (máx. 5 MB). Se recorta y optimiza sola a WebP ligero.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink bg-paper text-xs font-bold text-ink hover:bg-subtle cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-brand" />
                {currentImageUrl ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {currentImageUrl && (
                <button
                  type="button"
                  onClick={() => onImageUploaded(null)}
                  className="min-h-[40px] px-3 inline-flex items-center gap-1 rounded-xl border border-line bg-paper text-xs font-bold text-danger hover:bg-danger-soft cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

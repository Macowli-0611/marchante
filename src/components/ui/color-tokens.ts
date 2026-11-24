/**
 * Colores para los pocos lugares que NO aceptan clases ni variables CSS
 * (canvas 2D, marcador de MapLibre, atributos SVG de Recharts).
 * Deben coincidir con los primitivos de `src/app/globals.css` (:root).
 * En componentes normales usa las clases de Tailwind: text-ink, bg-paper, border-line…
 */
export const COLOR = {
  ink: '#1C1714',
  inkSoft: '#382F2A',
  inkMuted: '#5C5148',
  canvas: '#FAF6EE',
  paper: '#FFFDF9',
  line: '#DFD3C3',
  brand: '#C83E2B',
  profit: '#1B6B4A',
} as const;

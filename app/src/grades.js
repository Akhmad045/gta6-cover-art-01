// Colour grades: multi-stop gradient maps applied through a 256-entry lookup table, so a whole
// cover is re-graded in one pass over its pixels. Each grade also carries the overlay tints,
// halftone strength and lettering palette the cover composer pairs with it.

/** Parses a hex colour into [r, g, b]. */
function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Builds a 256x3 LUT by interpolating the grade's stops across luminance. */
function buildLut(stops) {
  const pts = stops.map(([o, c]) => [o * 255, rgb(c)]);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    let a = pts[0], b = pts[pts.length - 1];
    for (let i = 0; i < pts.length - 1; i++) if (v >= pts[i][0] && v <= pts[i + 1][0]) { a = pts[i]; b = pts[i + 1]; break; }
    const t = b[0] === a[0] ? 0 : (v - a[0]) / (b[0] - a[0]);
    for (let ch = 0; ch < 3; ch++) lut[v * 3 + ch] = a[1][ch] + (b[1][ch] - a[1][ch]) * t;
  }
  return lut;
}

/** The five grades: gradient-map stops, blend strength, texture and lettering colours. */
export const GRADES = [
  {
    id: 'vice', name: 'Vice Sunset',
    stops: [[0, '#1c0533'], [0.28, '#6d1160'], [0.52, '#d6336c'], [0.74, '#ff7a3c'], [1, '#ffe9a8']],
    blend: 0.82, halftone: 0.07, titleTop: '#fff3c4', titleBottom: '#ff5e3a', script: '#ff8fb5',
  },
  {
    id: 'neon', name: 'Neon Night',
    stops: [[0, '#04060f'], [0.30, '#0e2a6e'], [0.55, '#0e7c86'], [0.78, '#ff2e88'], [1, '#c8f7ff']],
    blend: 0.85, halftone: 0.10, titleTop: '#d9fbff', titleBottom: '#22d3ee', script: '#ff5ea8',
  },
  {
    id: 'teal', name: 'Teal Heat',
    stops: [[0, '#03222b'], [0.32, '#0b5563'], [0.58, '#12a594'], [0.80, '#f59e0b'], [1, '#fef3c7']],
    blend: 0.78, halftone: 0.12, titleTop: '#fef9e7', titleBottom: '#fbbf24', script: '#5eead4',
  },
  {
    id: 'golden', name: 'Golden Hour',
    stops: [[0, '#2b1206'], [0.30, '#7c2d12'], [0.55, '#c2570b'], [0.78, '#f59e0b'], [1, '#fff7d6']],
    blend: 0.80, halftone: 0.08, titleTop: '#fffbe8', titleBottom: '#ffb300', script: '#ffe082',
  },
  {
    id: 'ink', name: 'Ink Poster',
    stops: [[0, '#14100e'], [0.34, '#59331f'], [0.52, '#c1442e'], [0.72, '#e8a34c'], [1, '#f7efdc']],
    blend: 1.0, halftone: 0.34, titleTop: '#f7efdc', titleBottom: '#e8a34c', script: '#ff7a59',
  },
];
for (const g of GRADES) g.lut = buildLut(g.stops);

/** Finds a grade by id, falling back to Vice Sunset. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/**
 * Applies a grade to a canvas in place: luminance is remapped through the grade's LUT and
 * blended back with the original pixels, then contrast is lifted slightly so panels stay punchy.
 */
export function applyGrade(canvas, grade) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = grade.lut;
  const keep = 1 - grade.blend;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    const li = lum * 3;
    d[i] = d[i] * keep + lut[li] * grade.blend;
    d[i + 1] = d[i + 1] * keep + lut[li + 1] * grade.blend;
    d[i + 2] = d[i + 2] * keep + lut[li + 2] * grade.blend;
  }
  ctx.putImageData(img, 0, 0);
}

/** A reusable offscreen grain tile: random speckle at low alpha, drawn tiled over the cover. */
const grainTile = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 140;
  const g = c.getContext('2d');
  const img = g.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255 | 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  g.putImageData(img, 0, 0);
  return c;
})();

/** Finishes a cover: halftone dots in the shadows, film grain and a soft vignette. */
export function applyTexture(ctx, w, h, grade) {
  if (grade.halftone > 0) {
    ctx.save();
    ctx.globalAlpha = grade.halftone;
    ctx.fillStyle = '#000';
    const step = Math.max(8, w * 0.010);
    for (let yy = step / 2; yy < h; yy += step) {
      for (let xx = step / 2; xx < w; xx += step) {
        const depth = 0.25 + (yy / h) * 0.75;
        const r = step * 0.15 * depth;
        ctx.beginPath();
        ctx.arc(xx, yy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = 0.5;
  const pattern = ctx.createPattern(grainTile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(10,0,20,0)');
  vig.addColorStop(1, 'rgba(10,0,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

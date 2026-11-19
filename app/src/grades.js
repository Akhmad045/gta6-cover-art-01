// grades.js — colour grades and print effects for Neon Coast covers.
//
// A grade is a gradient map: each pixel's luminance is pushed through a
// multi-stop colour ramp, then blended back with the original pixel so
// detail survives, with per-grade saturation, contrast and split-tone
// settings on top. The mapping is baked into a 256-entry lookup table per
// channel once per grade, so grading a panel is a fast table walk over its
// ImageData. Halftone, film grain and vignette are separate finishing
// passes the cover composer applies after the panels are placed.

/** Multi-stop ramps: [luminance 0..1, [r, g, b]] from shadow to highlight. */
export const GRADES = [
  {
    id: 'vice', name: 'Vice Sunset', saturation: 1.18, contrast: 1.08, blend: 0.62,
    stops: [[0, [26, 8, 46]], [0.28, [94, 20, 92]], [0.52, [232, 62, 107]], [0.74, [255, 138, 60]], [0.9, [255, 196, 107]], [1, [255, 244, 214]]],
  },
  {
    id: 'neon', name: 'Neon Night', saturation: 1.34, contrast: 1.16, blend: 0.66,
    stops: [[0, [5, 4, 26]], [0.3, [38, 16, 92]], [0.52, [150, 32, 160]], [0.7, [255, 46, 136]], [0.86, [25, 227, 255]], [1, [240, 253, 255]]],
  },
  {
    id: 'teal', name: 'Teal Heat', saturation: 1.12, contrast: 1.05, blend: 0.58,
    stops: [[0, [4, 32, 40]], [0.3, [8, 94, 106]], [0.55, [18, 165, 180]], [0.76, [94, 224, 205]], [0.9, [255, 196, 107]], [1, [255, 248, 224]]],
  },
  {
    id: 'golden', name: 'Golden Hour', saturation: 1.08, contrast: 1.03, blend: 0.55,
    stops: [[0, [32, 16, 8]], [0.3, [112, 52, 16]], [0.55, [216, 116, 32]], [0.78, [255, 178, 64]], [1, [255, 240, 200]]],
  },
  {
    id: 'ink', name: 'Ink Poster', saturation: 1.22, contrast: 1.32, blend: 0.78, posterize: 9,
    stops: [[0, [10, 8, 24]], [0.34, [70, 16, 66]], [0.58, [198, 30, 62]], [0.8, [255, 122, 60]], [1, [250, 240, 214]]],
  },
  {
    id: 'mono', name: 'Noir Mono', saturation: 0.06, contrast: 1.22, blend: 0.35,
    stops: [[0, [8, 8, 14]], [0.4, [70, 66, 84]], [0.7, [168, 162, 178]], [1, [250, 248, 244]]],
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

function rampAt(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / Math.max(1e-6, t1 - t0);
      return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * f);
    }
  }
  return stops[stops.length - 1][1];
}

/**
 * Builds the per-channel lookup tables for a grade. Each output channel is
 * the original channel bent by an S-curve, saturation and contrast, then
 * mixed with the gradient-map colour for that pixel's luminance — the LUT
 * stores the luminance-independent part; applyGrade finishes the mix.
 */
export function buildGradeLUT(grade) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    const curved = Math.min(1, Math.max(0, (t - 0.5) * grade.contrast + 0.5));
    const mapped = rampAt(grade.stops, curved);
    for (let k = 0; k < 3; k++) {
      lut[v * 3 + k] = mapped[k];
    }
  }
  return lut;
}

const lutCache = new Map();
export function gradeLUT(grade) {
  if (!lutCache.has(grade.id)) lutCache.set(grade.id, buildGradeLUT(grade));
  return lutCache.get(grade.id);
}

/** Grades an offscreen canvas in place: LUT mix + saturation + posterize. */
export function applyGrade(canvas, grade) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = canvas;
  if (!w || !h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = gradeLUT(grade);
  const blend = grade.blend;
  const sat = grade.saturation;
  const levels = grade.posterize ?? 0;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (levels > 1) {
      const step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const mr = lut[lum * 3], mg = lut[lum * 3 + 1], mb = lut[lum * 3 + 2];
    // Scale the mapped colour by the pixel's own brightness so highlights
    // stay bright and shadows stay deep instead of flattening to the ramp.
    const scale = (lum / 255) * 1.6 + 0.22;
    r = r * (1 - blend) + mr * scale * blend;
    g = g * (1 - blend) + mg * scale * blend;
    b = b * (1 - blend) + mb * scale * blend;
    const avg = (r + g + b) / 3;
    d[i] = avg + (r - avg) * sat;
    d[i + 1] = avg + (g - avg) * sat;
    d[i + 2] = avg + (b - avg) * sat;
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------- finishing --

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement('canvas');
  noiseTile.width = 180; noiseTile.height = 180;
  const nctx = noiseTile.getContext('2d');
  const img = nctx.createImageData(180, 180);
  let a = 987654321;
  for (let i = 0; i < img.data.length; i += 4) {
    a = (Math.imul(a, 1103515245) + 12345) | 0;
    const v = (a >>> 16) & 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nctx.putImageData(img, 0, 0);
  return noiseTile;
}

/** Film grain: the noise tile at low alpha, tiled over the whole cover. */
export function applyGrain(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  const tile = getNoiseTile();
  ctx.save();
  ctx.globalAlpha = amount * 0.16;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Vignette: a soft dark falloff toward the corners. */
export function applyVignette(ctx, w, h, amount) {
  if (amount <= 0.01) return;
  const r = Math.hypot(w, h) * 0.62;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.42, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(8,2,18,0)');
  g.addColorStop(1, `rgba(8,2,18,${0.52 * amount})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Halftone dots: a regular dot grid whose radius follows local darkness,
 * sampled from the finished cover itself. Drawn in ink colour at low alpha
 * it gives flat shadow areas the printed-poster texture of a comic cover.
 */
export function applyHalftone(ctx, w, h, amount, sourceCanvas) {
  if (amount <= 0.01) return;
  const cell = Math.max(7, Math.round(w / 130));
  const probe = document.createElement('canvas');
  const pw = Math.ceil(w / cell), ph = Math.ceil(h / cell);
  probe.width = pw; probe.height = ph;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  pctx.drawImage(sourceCanvas, 0, 0, pw, ph);
  let data;
  try { data = pctx.getImageData(0, 0, pw, ph).data; } catch { return; }
  ctx.save();
  ctx.fillStyle = `rgba(10,4,24,${0.34 * amount})`;
  for (let gy = 0; gy < ph; gy++) {
    for (let gx = 0; gx < pw; gx++) {
      const i = (gy * pw + gx) * 4;
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const radius = (1 - lum) * cell * 0.52 * amount;
      if (radius < 0.6) continue;
      ctx.beginPath();
      ctx.arc(gx * cell + cell / 2, gy * cell + cell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

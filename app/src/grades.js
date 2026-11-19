// Colour grades for Viceframe. Each grade is a gradient map: a photo's brightness is
// pushed through a ramp of hand-picked colours, then blended back with the original
// pixels so faces and details survive. Ramps are original values chosen for a neon
// coast mood — hot shadow, bright sky — and none of them imitates any shipped game art.

const RAMPS = {
  sunset: [
    [0.0, [26, 10, 44]],
    [0.28, [94, 30, 92]],
    [0.52, [219, 64, 110]],
    [0.74, [255, 138, 61]],
    [1.0, [255, 224, 158]],
  ],
  neon: [
    [0.0, [8, 10, 38]],
    [0.3, [24, 64, 120]],
    [0.55, [16, 178, 172]],
    [0.78, [240, 84, 178]],
    [1.0, [246, 240, 255]],
  ],
  tealheat: [
    [0.0, [6, 34, 40]],
    [0.35, [10, 110, 110]],
    [0.62, [64, 196, 160]],
    [0.85, [255, 178, 64]],
    [1.0, [255, 244, 200]],
  ],
  golden: [
    [0.0, [38, 20, 10]],
    [0.35, [122, 66, 26]],
    [0.62, [214, 132, 52]],
    [0.85, [252, 196, 104]],
    [1.0, [255, 242, 214]],
  ],
  ink: [
    [0.0, [16, 14, 26]],
    [0.4, [70, 62, 96]],
    [0.68, [168, 156, 190]],
    [1.0, [250, 246, 238]],
  ],
};

const STRENGTH = { sunset: 0.62, neon: 0.66, tealheat: 0.58, golden: 0.5, ink: 0.72 };

function buildLookup(stops) {
  const table = new Uint8Array(256 * 3);
  for (let level = 0; level < 256; level++) {
    const t = level / 255;
    let lower = stops[0];
    let upper = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        lower = stops[s];
        upper = stops[s + 1];
        break;
      }
    }
    const span = upper[0] - lower[0] || 1;
    const mix = Math.min(1, Math.max(0, (t - lower[0]) / span));
    for (let channel = 0; channel < 3; channel++) {
      table[level * 3 + channel] = Math.round(lower[1][channel] + (upper[1][channel] - lower[1][channel]) * mix);
    }
  }
  return table;
}

const lookupCache = new Map();
function lookupFor(gradeId) {
  if (!lookupCache.has(gradeId)) lookupCache.set(gradeId, buildLookup(RAMPS[gradeId]));
  return lookupCache.get(gradeId);
}

const gradedCache = new Map();

/** Returns a canvas holding `image` with the grade applied, capped at 1100 px wide. */
export function gradedPhoto(image, gradeId) {
  if (!gradeId || gradeId === 'none' || !RAMPS[gradeId]) return image;
  const key = `${image.src?.slice(0, 80)}|${image.naturalWidth}x${image.naturalHeight}|${gradeId}`;
  if (gradedCache.has(key)) return gradedCache.get(key);
  const scale = Math.min(1, 1100 / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(2, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  const table = lookupFor(gradeId);
  const keep = 1 - (STRENGTH[gradeId] ?? 0.6);
  const push = STRENGTH[gradeId] ?? 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    const base = lum * 3;
    data[i] = data[i] * keep + table[base] * push;
    data[i + 1] = data[i + 1] * keep + table[base + 1] * push;
    data[i + 2] = data[i + 2] * keep + table[base + 2] * push;
  }
  ctx.putImageData(pixels, 0, 0);
  gradedCache.set(key, canvas);
  return canvas;
}

export function gradeLabel(gradeId) {
  return {
    sunset: 'Vice sunset', neon: 'Neon night', tealheat: 'Teal heat',
    golden: 'Golden hour', ink: 'Ink poster', none: 'No grade',
  }[gradeId] ?? gradeId;
}

// Fixed scenes for screenshots, driven by the query string so a headless browser
// can photograph the app deterministically:
//   ?shot=cover   — the cover alone fills the window (an exported cover, as drawn)
//   ?shot=editor  — the full editor with photos loaded and a panel selected
// Photos come from `photo=a,b,c` (sample file names without extension), and
// `layout`, `grade`, `caption` and `sub` pick the rest of the scene.
// window.__shotReady flips true once the scene has painted two frames.

export async function loadSampleImage(name) {
  const path = name.includes('/') ? name : `samples/${name}.jpg`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = path;
  });
}

export function parseShotQuery(search) {
  const query = new URLSearchParams(search);
  if (!query.get('shot')) return null;
  return {
    kind: query.get('shot'),
    photos: (query.get('photo') ?? 'neon-night,rooftop,boulevard,pier').split(',').filter(Boolean),
    layout: query.get('layout') ?? 'grid6',
    grade: query.get('grade') ?? 'sunset',
    caption: query.get('caption') ?? 'Neon Coast',
    sub: query.get('sub') ?? 'vice nights, volume one',
    panel: Number(query.get('panel') ?? 0),
    zooms: (query.get('zooms') ?? '').split(',').filter(Boolean).map(Number),
  };
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

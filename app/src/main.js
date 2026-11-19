// Neon Coast Cover Studio: wires the page. The studio opens on a finished cover composed
// from the painted sample scenes; the visitor swaps scenes or drops in their own photos,
// re-grades, re-letters and exports a PNG — all locally, with no network request.

import { drawCover } from './cover.js';
import { runShot } from './shots.js';
import { SCENES } from './scenes.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, layoutById, panelRects, EXPORT_SIZES } from './layouts.js';
import { drawTitleBlock, drawRibbon } from './lettering.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const DEFAULT_SCENES = ['boulevard', 'pier', 'neon', 'beach', 'lowrider', 'marina', 'boulevard', 'neon', 'pier'];

const state = {
  layout: layoutById('hero'),
  grade: gradeById('vice'),
  title: 'NEON COAST',
  subtitle: 'tales from the sunset strip',
  ribbon: 'ONE CITY • ONE SUMMER • NO BRAKES',
  size: EXPORT_SIZES[1],
  panels: DEFAULT_SCENES.map((scene) => ({ scene, img: null, zoom: 1, ox: 0, oy: 0 })),
  selected: 0,
};

/** Sizes the on-screen canvas to fit the stage while keeping the cover's aspect ratio. */
function fitCanvas() {
  const stage = canvas.parentElement.getBoundingClientRect();
  const ar = state.size.w / state.size.h;
  let cw = Math.min(stage.width - 36, (stage.height - 36) * ar);
  let ch = cw / ar;
  if (document.body.classList.contains('shot-cover')) return;
  canvas.style.width = `${Math.max(200, cw)}px`;
  canvas.style.height = `${Math.max(200, ch)}px`;
}

/** Redraws the cover at the current export size and refreshes the panel caption. */
function redraw() {
  canvas.width = state.size.w;
  canvas.height = state.size.h;
  fitCanvas();
  const lettering = (ctx, w, h, s) => {
    drawTitleBlock(ctx, w, h, s.title, s.subtitle, s.grade);
    drawRibbon(ctx, w, h, s.ribbon, s.grade);
  };
  drawCover(canvas, state, lettering);
  document.getElementById('panel-label').textContent =
    `Panel ${state.selected + 1} of ${panelRects(state.layout, 100, 100).length} — ${state.panels[state.selected].img ? 'your photo' : SCENES.find((s) => s.id === state.panels[state.selected].scene).name}`;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout.id));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade.id));
  document.querySelectorAll('[data-scene]').forEach((b) => b.classList.toggle('on', !state.panels[state.selected].img && b.dataset.scene === state.panels[state.selected].scene));
}

/** Loads an image from a URL or object URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Puts a loaded photo into the selected panel (or every panel when fill is true). */
function placePhoto(img, fill) {
  if (fill) for (const p of state.panels) { p.img = img; p.zoom = 1; p.ox = 0; p.oy = 0; }
  else { const p = state.panels[state.selected]; p.img = img; p.zoom = 1; p.ox = 0; p.oy = 0; }
  redraw();
}

function buildButtons(containerId, items, attr, label, onPick) {
  const box = document.getElementById(containerId);
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset[attr] = item.id;
    b.textContent = label(item);
    b.addEventListener('click', () => onPick(item));
    box.appendChild(b);
  }
}

buildButtons('layout-row', LAYOUTS, 'layout', (l) => l.name, (l) => { state.layout = l; redraw(); });
buildButtons('grade-row', GRADES, 'grade', (g) => g.name, (g) => { state.grade = g; redraw(); });
buildButtons('scene-row', SCENES, 'scene', (s) => s.name, (s) => {
  const p = state.panels[state.selected];
  p.scene = s.id;
  p.img = null;
  redraw();
});

for (const input of ['title', 'subtitle', 'ribbon']) {
  document.getElementById(input).addEventListener('input', (e) => { state[input] = e.target.value; redraw(); });
}
document.getElementById('size').addEventListener('change', (e) => {
  state.size = EXPORT_SIZES.find((s) => s.id === e.target.value) ?? EXPORT_SIZES[0];
  redraw();
});
for (const [id, key, fmt] of [['zoom', 'zoom'], ['panx', 'ox'], ['pany', 'oy']]) {
  document.getElementById(id).addEventListener('input', (e) => {
    state.panels[state.selected][key] = Number(e.target.value);
    redraw();
  });
}
document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  placePhoto(await loadImage(URL.createObjectURL(file)), document.getElementById('fill-all').checked);
  status.textContent = 'Photo placed — drag the sliders to crop it, then export.';
});
document.getElementById('fill-photo').addEventListener('click', () => {
  const src = state.panels[state.selected];
  for (const p of state.panels) { p.img = src.img; p.scene = src.scene; }
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.zoom = 1; p.ox = 0; p.oy = 0;
  document.getElementById('zoom').value = 1;
  document.getElementById('panx').value = 0;
  document.getElementById('pany').value = 0;
  redraw();
});
canvas.addEventListener('click', (e) => {
  const box = canvas.getBoundingClientRect();
  const fx = (e.clientX - box.left) / box.width;
  const fy = (e.clientY - box.top) / box.height;
  const rects = panelRects(state.layout, 1000, 1000 * (state.size.h / state.size.w));
  const idx = rects.findIndex((r) => fx * 1000 >= r.x && fx * 1000 < r.x + r.w && fy * 1000 * (state.size.h / state.size.w) >= r.y && fy * 1000 * (state.size.h / state.size.w) < r.y + r.h);
  if (idx >= 0) { state.selected = idx; redraw(); }
});
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) placePhoto(await loadImage(URL.createObjectURL(file)), document.getElementById('fill-all').checked);
});
document.getElementById('export-top').addEventListener('click', () => document.getElementById('export').click());
document.getElementById('export').addEventListener('click', () => {
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${state.size.id}.png`;
    a.click();
    status.textContent = `Saved neon-coast-cover-${state.size.id}.png`;
  }, 'image/png');
});

/** Applies screenshot parameters (or the defaults) and paints the opening cover. */
async function applyShot({ layout, grade, photo, title, subtitle, ribbon, size }) {
  if (layout) state.layout = layoutById(layout);
  if (grade) state.grade = gradeById(grade);
  if (photo) state.panels[0].scene = photo;
  if (title) { state.title = title; document.getElementById('title').value = title; }
  if (subtitle) { state.subtitle = subtitle; document.getElementById('subtitle').value = subtitle; }
  if (ribbon) { state.ribbon = ribbon; document.getElementById('ribbon').value = ribbon; }
  if (size) state.size = EXPORT_SIZES.find((s) => s.id === size) ?? state.size;
  if (document.body.classList.contains('shot-cover')) {
    state.size = { id: 'shot', w: window.innerWidth, h: window.innerHeight };
  }
  redraw();
}

window.addEventListener('resize', fitCanvas);

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), applyShot);
} else {
  redraw();
}

// main.js — wires the Neon Coast Cover Studio page.
//
// The studio opens on a finished cover: the Hero + Strip layout filled with
// painted scenes under the Vice Sunset grade, lettered and badged. Every
// control edits one shared state object and re-renders the preview; photos
// the reader picks are read locally, land in the selected panel (or every
// panel), and can be panned by dragging and cropped with the zoom slider.
// Export re-renders the same state at full post size and downloads a PNG.

import { SCENES, sceneById } from './scenes.js';
import { GRADES } from './grades.js';
import { EXPORT_SIZES, LAYOUTS, layoutById, renderCover, sizeById } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const photoStatus = document.getElementById('photo-status');
const panelStatus = document.getElementById('panel-status');
const sizeStatus = document.getElementById('size-status');

/** The one shared cover state every control edits. */
export const state = {
  layout: 'hero',
  grade: 'vice',
  title: 'Neon Coast',
  subtitle: 'one last ride at golden hour',
  kicker: 'Vice Shores · Issue 06 · Launch Week',
  heat: 4,
  heatLabel: 'Heat',
  size: 'wide',
  grain: 0.35,
  halftone: 0.3,
  vignette: 0.55,
  selectedPanel: 0,
  assignments: [],
};

/** Rebuilds panel assignments for the current layout, keeping photos. */
function syncAssignments(keepPhotos = true) {
  const panels = layoutById(state.layout).panels(100, 100);
  const next = panels.map((panel, i) => {
    const prev = keepPhotos ? state.assignments[i] : null;
    return {
      scene: panel.scene,
      photo: prev?.photo ?? null,
      photoName: prev?.photoName ?? '',
      dx: prev?.dx ?? 0,
      dy: prev?.dy ?? 0,
      zoom: prev?.zoom ?? 1,
    };
  });
  state.assignments = next;
  if (state.selectedPanel >= next.length) state.selectedPanel = 0;
}

let lastPanels = [];
export function redraw() {
  fitPreviewCanvas();
  lastPanels = renderCover(canvas, state);
  sizeStatus.textContent = `${sizeById(state.size).name} · Layout: ${layoutById(state.layout).name}`;
  markSelectedPanel();
}

function fitPreviewCanvas() {
  const size = sizeById(state.size);
  const scale = Math.min(1, 1120 / size.w, 760 / size.h);
  const w = Math.round(size.w * scale);
  const h = Math.round(size.h * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

// ------------------------------------------------------------ undo / redo --

const undoStack = [];
const redoStack = [];
function snapshot() {
  return JSON.stringify({
    ...state,
    assignments: state.assignments.map((a) => ({ ...a, photo: undefined })),
    photoRefs: state.assignments.map((a) => a.photo),
  });
}
function restore(snap) {
  const data = JSON.parse(snap);
  const refs = data.photoRefs;
  delete data.photoRefs;
  Object.assign(state, data);
  state.assignments.forEach((a, i) => { a.photo = refs[i] ?? null; });
  syncControls();
  redraw();
}
export function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  redoStack.length = 0;
}
document.getElementById('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
});
document.getElementById('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
});

// ---------------------------------------------------------------- pickers --

function buildScenePicker() {
  const host = document.getElementById('scene-picker');
  for (const scene of SCENES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    const thumb = document.createElement('canvas');
    thumb.width = 192; thumb.height = 144;
    scene.paint(thumb.getContext('2d'), 0, 0, 192, 144);
    const label = document.createElement('span');
    label.textContent = scene.name;
    btn.append(thumb, label);
    btn.addEventListener('click', () => {
      pushHistory();
      const a = state.assignments[state.selectedPanel];
      a.scene = scene.id;
      a.photo = null;
      a.photoName = '';
      photoStatus.textContent = `Panel ${state.selectedPanel + 1} now shows the painted scene “${scene.name}”.`;
      redraw();
    });
    host.append(btn);
  }
}

function buildChipPicker(hostId, items, current, onPick, swatchFor) {
  const host = document.getElementById(hostId);
  host.innerHTML = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (item.id === current() ? ' active' : '');
    if (swatchFor) {
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = swatchFor(item);
      btn.append(sw);
    }
    btn.append(document.createTextNode(item.name));
    btn.addEventListener('click', () => onPick(item.id));
    host.append(btn);
  }
}

function refreshPickers() {
  buildChipPicker('layout-picker', LAYOUTS, () => state.layout, (id) => {
    pushHistory();
    state.layout = id;
    syncAssignments();
    refreshPickers();
    redraw();
  });
  buildChipPicker('grade-picker', GRADES, () => state.grade, (id) => {
    pushHistory();
    state.grade = id;
    refreshPickers();
    redraw();
  }, (grade) => `linear-gradient(90deg, ${grade.stops.map(([t, c]) => `rgb(${c[0]},${c[1]},${c[2]}) ${Math.round(t * 100)}%`).join(', ')})`);
}

// ----------------------------------------------------------------- photos --

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function takePhoto(file, fillAll) {
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  pushHistory();
  const targets = fillAll ? state.assignments : [state.assignments[state.selectedPanel]];
  for (const a of targets) {
    a.photo = img;
    a.photoName = file.name;
    a.dx = 0; a.dy = 0; a.zoom = 1;
  }
  photoStatus.textContent = fillAll
    ? `“${file.name}” now fills every panel. Drag on the cover to reposition it.`
    : `“${file.name}” is in panel ${state.selectedPanel + 1}. Drag on the cover to reposition it, zoom to crop.`;
  document.getElementById('photo-zoom').value = '1';
  redraw();
}

document.getElementById('photo').addEventListener('change', (e) => {
  takePhoto(e.target.files[0], false);
});
document.getElementById('fill-all').addEventListener('click', () => {
  const input = document.getElementById('photo');
  if (input.files[0]) { takePhoto(input.files[0], true); return; }
  const current = state.assignments.find((a) => a.photo);
  if (!current) {
    photoStatus.textContent = 'Pick a photo first, then fill every panel with it.';
    return;
  }
  pushHistory();
  for (const a of state.assignments) {
    a.photo = current.photo;
    a.photoName = current.photoName;
  }
  photoStatus.textContent = `“${current.photoName}” now fills every panel.`;
  redraw();
});
document.getElementById('clear-photo').addEventListener('click', () => {
  pushHistory();
  const a = state.assignments[state.selectedPanel];
  a.photo = null;
  a.photoName = '';
  photoStatus.textContent = `Panel ${state.selectedPanel + 1} is back to its painted scene.`;
  redraw();
});

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragging');
  const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
  if (file) takePhoto(file, false);
});

// ------------------------------------------- panel selection, pan & zoom --

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
function panelAt(point) {
  const i = lastPanels.findIndex((p) => point.x >= p.x && point.x <= p.x + p.w && point.y >= p.y && point.y <= p.y + p.h);
  return i === -1 ? state.selectedPanel : i;
}
function markSelectedPanel() {
  const a = state.assignments[state.selectedPanel];
  const what = a?.photo ? `your photo “${a.photoName}”` : `scene “${sceneById(a?.scene ?? 'boulevard').name}”`;
  panelStatus.textContent = `Panel ${state.selectedPanel + 1} of ${state.assignments.length} selected — ${what}. Drag to pan a photo.`;
  document.getElementById('photo-zoom').value = String(a?.zoom ?? 1);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const idx = panelAt(point);
  if (idx !== state.selectedPanel) {
    state.selectedPanel = idx;
    markSelectedPanel();
  }
  const a = state.assignments[state.selectedPanel];
  if (a?.photo) {
    drag = { x: e.clientX, y: e.clientY, dx: a.dx, dy: a.dy };
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const a = state.assignments[state.selectedPanel];
  a.dx = drag.dx + (e.clientX - drag.x) / rect.width;
  a.dy = drag.dy + (e.clientY - drag.y) / rect.height;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const a = state.assignments[state.selectedPanel];
  if (!a?.photo) return;
  e.preventDefault();
  a.zoom = Math.min(3, Math.max(1, a.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
  document.getElementById('photo-zoom').value = String(a.zoom);
  redraw();
}, { passive: false });

document.getElementById('photo-zoom').addEventListener('input', (e) => {
  const a = state.assignments[state.selectedPanel];
  if (a) a.zoom = Number(e.target.value);
  redraw();
});
document.addEventListener('keydown', (e) => {
  const a = state.assignments[state.selectedPanel];
  if (!a?.photo || /input|select|textarea/i.test(document.activeElement?.tagName ?? '')) return;
  const step = 0.02;
  if (e.key === 'ArrowLeft') a.dx -= step;
  else if (e.key === 'ArrowRight') a.dx += step;
  else if (e.key === 'ArrowUp') a.dy -= step;
  else if (e.key === 'ArrowDown') a.dy += step;
  else if (e.key === '+' || e.key === '=') a.zoom = Math.min(3, a.zoom + 0.08);
  else if (e.key === '-') a.zoom = Math.max(1, a.zoom - 0.08);
  else return;
  e.preventDefault();
  redraw();
});

// ------------------------------------------------------------- text & fx --

function bindText(id, key) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    redraw();
  });
}
bindText('title', 'title');
bindText('subtitle', 'subtitle');
bindText('kicker', 'kicker');
document.getElementById('heat').addEventListener('input', (e) => {
  state.heat = Number(e.target.value);
  document.getElementById('heat-value').textContent = '★★★★★'.slice(0, state.heat) + '☆☆☆☆☆'.slice(0, 5 - state.heat);
  redraw();
});
for (const id of ['grain', 'halftone', 'vignette']) {
  document.getElementById(id).addEventListener('input', (e) => {
    state[id] = Number(e.target.value);
    redraw();
  });
}
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('kicker').value = state.kicker;
  document.getElementById('heat').value = String(state.heat);
  document.getElementById('grain').value = String(state.grain);
  document.getElementById('halftone').value = String(state.halftone);
  document.getElementById('vignette').value = String(state.vignette);
  document.getElementById('size').value = state.size;
  refreshPickers();
}

// ----------------------------------------------------------------- export --

export function exportPNG() {
  const size = sizeById(state.size);
  const out = document.createElement('canvas');
  out.width = size.w;
  out.height = size.h;
  renderCover(out, state);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    statusEl.textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png — ready to post.`;
  }, 'image/png');
}
document.getElementById('export').addEventListener('click', exportPNG);
document.getElementById('export-top').addEventListener('click', exportPNG);

// ------------------------------------------------------------------- boot --

syncAssignments(false);
buildScenePicker();
refreshPickers();
syncControls();
redraw();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, redraw, syncAssignments, syncControls, refreshPickers, loadImage,
    setStatus: (text) => { photoStatus.textContent = text; },
  });
}

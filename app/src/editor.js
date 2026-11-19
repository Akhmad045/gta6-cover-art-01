// Viceframe editor: wires the control panel to the cover engine. Photos are read
// with object URLs from the person's own machine and never leave it — the app
// makes no network request at all. State lives in one object; every change
// repaints the preview canvas through render.js's drawCover.

import { drawCover, panelBox } from './render.js';
import { layoutPanels, panelCount } from './layouts.js';
import { loadSampleImage, parseShotQuery, markShotReady } from './shots.js';

const canvas = document.getElementById('stage-canvas');
const status = document.getElementById('status');

const state = {
  photos: [],
  photoNames: [],
  layout: 'grid6',
  grade: 'sunset',
  title: 'Neon Coast',
  subtitle: 'vice nights, volume one',
  ribbon: '100% ORIGINAL FAN ART',
  stars: 5,
  fx: { halftone: true, grain: true, vignette: true, ribbon: true },
  panels: [],
  selected: 0,
};

function freshPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

function resetPanels(fillPhoto = 0) {
  // Panel i takes photo i when several photos are loaded (wrapping around);
  // with a single photo every panel takes that one.
  const count = panelCount(state.layout);
  state.panels = Array.from({ length: count }, (_, i) =>
    freshPanel(state.photos.length > 1 ? i % state.photos.length : state.photos.length ? fillPhoto : -1));
  state.selected = 0;
}

function repaint() {
  drawCover(canvas, state);
  syncPanelControls();
}

function el(id) { return document.getElementById(id); }

function syncPanelControls() {
  const chips = el('panel-chips');
  chips.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip panel-chip${i === state.selected ? ' active' : ''}`;
    chip.textContent = `Panel ${i + 1}`;
    chip.addEventListener('click', () => { state.selected = i; repaint(); });
    chips.appendChild(chip);
  });
  const select = el('panel-photo-select');
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '-1';
  none.textContent = 'Empty panel';
  select.appendChild(none);
  state.photoNames.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = name;
    select.appendChild(option);
  });
  const current = state.panels[state.selected];
  if (current) {
    select.value = String(current.photo);
    el('zoom').value = current.zoom;
    el('ox').value = current.ox;
    el('oy').value = current.oy;
    el('zoom-val').textContent = `${current.zoom.toFixed(2)}×`;
    el('ox-val').textContent = current.ox.toFixed(2);
    el('oy-val').textContent = current.oy.toFixed(2);
  }
  const thumbs = el('thumbs');
  thumbs.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const figure = document.createElement('figure');
    if (current && current.photo === i) figure.className = 'active';
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = state.photoNames[i];
    const cap = document.createElement('figcaption');
    cap.textContent = state.photoNames[i];
    figure.append(img, cap);
    figure.addEventListener('click', () => {
      if (state.panels[state.selected]) state.panels[state.selected].photo = i;
      repaint();
    });
    thumbs.appendChild(figure);
  });
}

async function addPhoto(source, name) {
  const img = typeof source === 'string' ? await loadSampleImage(source) : source;
  state.photos.push(img);
  state.photoNames.push(name);
  if (state.photos.length === 1) resetPanels(0);
  else state.panels.forEach((panel, i) => { if (panel.photo === -1) panel.photo = state.photos.length - 1; if (i === state.panels.length - 1) panel.photo = state.photos.length - 1; });
  repaint();
}

function loadFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadFile(file);
    state.photos.push(img);
    state.photoNames.push(file.name.replace(/\.[^.]+$/, ''));
  }
  if (state.photos.length) {
    resetPanels(0);
    status.textContent = `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — pick a layout, then export.`;
  }
  repaint();
}

function bindControls() {
  el('photo-input').addEventListener('change', (event) => addFiles([...event.target.files]));
  const drop = el('dropzone');
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('over');
    addFiles([...event.dataTransfer.files]);
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const path = button.getAttribute('data-sample');
      await addPhoto(path, path.split('/').pop().replace('.jpg', ''));
      status.textContent = `Sample ${path.split('/').pop()} loaded.`;
    });
  });
  el('layout-select').addEventListener('change', (event) => {
    state.layout = event.target.value;
    resetPanels(0);
    repaint();
  });
  el('panel-photo-select').addEventListener('change', (event) => {
    state.panels[state.selected].photo = Number(event.target.value);
    repaint();
  });
  el('fill-all').addEventListener('click', () => {
    const photo = state.panels[state.selected]?.photo ?? 0;
    state.panels.forEach((panel) => { panel.photo = photo; });
    repaint();
  });
  const bindSlider = (id, key) => {
    el(id).addEventListener('input', (event) => {
      state.panels[state.selected][key] = Number(event.target.value);
      repaint();
    });
  };
  bindSlider('zoom', 'zoom');
  bindSlider('ox', 'ox');
  bindSlider('oy', 'oy');
  el('caption-title').addEventListener('input', (event) => { state.title = event.target.value; repaint(); });
  el('caption-sub').addEventListener('input', (event) => { state.subtitle = event.target.value; repaint(); });
  el('caption-ribbon').addEventListener('input', (event) => { state.ribbon = event.target.value; repaint(); });
  el('grade-select').addEventListener('change', (event) => { state.grade = event.target.value; repaint(); });
  el('stars').addEventListener('input', (event) => { state.stars = Number(event.target.value); repaint(); });
  const bindFx = (id, key) => el(id).addEventListener('change', (event) => { state.fx[key] = event.target.checked; repaint(); });
  bindFx('opt-halftone', 'halftone');
  bindFx('opt-grain', 'grain');
  bindFx('opt-vignette', 'vignette');
  bindFx('opt-ribbon', 'ribbon');
  document.querySelectorAll('.export-btn').forEach((button) => {
    button.addEventListener('click', () => exportPng(button.getAttribute('data-size')));
  });
  bindCanvasGestures();
}

function exportPng(sizeLabel) {
  const [w, h] = sizeLabel.split('x').map(Number);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out, state);
  out.toBlob((blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `viceframe-cover-${w}x${h}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    status.textContent = `Saved viceframe-cover-${w}x${h}.png`;
  }, 'image/png');
}

function bindCanvasGestures() {
  let drag = null;
  const toCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = toCanvasPoint(event);
    const panels = layoutPanels(state.layout);
    for (let i = panels.length - 1; i >= 0; i--) {
      const box = panelBox(canvas.width, canvas.height, state.layout, i);
      if (box && point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h) {
        state.selected = i;
        break;
      }
    }
    drag = { x: event.clientX, y: event.clientY, panel: { ...state.panels[state.selected] } };
    canvas.setPointerCapture(event.pointerId);
    repaint();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const setting = state.panels[state.selected];
    setting.ox = Math.min(1, Math.max(-1, drag.panel.ox + ((event.clientX - drag.x) / rect.width) * 2.4));
    setting.oy = Math.min(1, Math.max(-1, drag.panel.oy + ((event.clientY - drag.y) / rect.height) * 2.4));
    repaint();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const setting = state.panels[state.selected];
    setting.zoom = Math.min(3.5, Math.max(1, setting.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
    repaint();
  }, { passive: false });
}

async function boot() {
  bindControls();
  const shot = parseShotQuery(location.search);
  if (shot) {
    for (const name of shot.photos) await addPhoto(name, name);
    state.layout = shot.layout;
    state.grade = shot.grade;
    state.title = shot.caption;
    state.subtitle = shot.sub;
    el('layout-select').value = shot.layout;
    el('grade-select').value = shot.grade;
    el('caption-title').value = shot.caption;
    el('caption-sub').value = shot.sub;
    resetPanels(0);
    shot.zooms.forEach((zoom, i) => { if (state.panels[i] && zoom > 0) state.panels[i].zoom = zoom; });
    state.selected = Math.min(shot.panel, state.panels.length - 1);
    if (shot.kind === 'cover') {
      document.body.classList.add('shot-cover');
      const params = new URLSearchParams(location.search);
      canvas.width = Number(params.get('w') ?? 1080);
      canvas.height = Number(params.get('h') ?? 1080);
    }
    repaint();
    markShotReady();
    return;
  }
  await addPhoto('samples/neon-night.jpg', 'neon night');
  await addPhoto('samples/rooftop.jpg', 'rooftop');
  await addPhoto('samples/boulevard.jpg', 'boulevard');
  await addPhoto('samples/pier.jpg', 'pier');
  await addPhoto('samples/harbour.jpg', 'harbour');
  resetPanels(0);
  repaint();
}

boot();

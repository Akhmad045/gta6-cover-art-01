// cover.js — panel layouts and the cover composer.
//
// A cover is a set of rectangular panels filled with painted scenes or the
// reader's own photos, separated by clean keylines, graded as one picture,
// finished with grain / halftone / vignette, and lettered. Layouts are pure
// geometry: given the canvas size they return panel rectangles plus the
// default scene for each, so the editor, the exporter and the screenshot
// scenes all compose exactly the same cover.

import { sceneById } from './scenes.js';
import { applyGrade, applyGrain, applyHalftone, applyVignette, gradeById } from './grades.js';
import { drawCoverLettering } from './lettering.js';

/** Export sizes the studio offers, in pixels. */
export const EXPORT_SIZES = [
  { id: 'wide', name: 'Landscape 1920 × 1080', w: 1920, h: 1080 },
  { id: 'square', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'story', name: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

export function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) ?? EXPORT_SIZES[0];
}

/**
 * Layout geometry. Each returns { panels: [{x,y,w,h,scene}], letterAnchor }.
 * Rectangles are fractions of the canvas so one layout serves every size.
 */
export const LAYOUTS = [
  {
    id: 'hero', name: 'Hero + Strip', letterAnchor: 'bottom',
    panels(w, h) {
      const stripH = h * 0.27;
      return [
        { x: 0, y: 0, w, h: h - stripH, scene: 'boulevard' },
        { x: 0, y: h - stripH, w: w / 3, h: stripH, scene: 'lowrider' },
        { x: w / 3, y: h - stripH, w: w / 3, h: stripH, scene: 'neon' },
        { x: (2 * w) / 3, y: h - stripH, w: w / 3, h: stripH, scene: 'pier' },
      ];
    },
  },
  {
    id: 'grid', name: 'Panel Grid', letterAnchor: 'bottom',
    panels(w, h) {
      const scenes = ['boulevard', 'neon', 'beach', 'lowrider', 'pier', 'rooftop'];
      const out = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: (c * w) / 3, y: (r * h) / 2, w: w / 3, h: h / 2, scene: scenes[r * 3 + c] });
        }
      }
      return out;
    },
  },
  {
    id: 'mosaic', name: 'Mosaic', letterAnchor: 'bottom',
    panels(w, h) {
      return [
        { x: 0, y: 0, w: w * 0.42, h, scene: 'boulevard' },
        { x: w * 0.42, y: 0, w: w * 0.58, h: h * 0.52, scene: 'neon' },
        { x: w * 0.42, y: h * 0.52, w: w * 0.29, h: h * 0.48, scene: 'beach' },
        { x: w * 0.71, y: h * 0.52, w: w * 0.29, h: h * 0.48, scene: 'rooftop' },
      ];
    },
  },
  {
    id: 'bleed', name: 'Full Bleed', letterAnchor: 'top',
    panels(w, h) {
      return [{ x: 0, y: 0, w, h, scene: 'boulevard' }];
    },
  },
  {
    id: 'snapshots', name: 'Tilted Snapshots', letterAnchor: 'bottom', tilted: true,
    panels(w, h) {
      return [
        { x: w * 0.03, y: h * 0.05, w: w * 0.44, h: h * 0.6, scene: 'pier', tilt: -0.045 },
        { x: w * 0.5, y: h * 0.03, w: w * 0.44, h: h * 0.58, scene: 'beach', tilt: 0.04 },
        { x: w * 0.16, y: h * 0.52, w: w * 0.5, h: h * 0.42, scene: 'neon', tilt: -0.02 },
        { x: w * 0.6, y: h * 0.5, w: w * 0.36, h: h * 0.44, scene: 'rooftop', tilt: 0.055 },
      ];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** Draws a user photo into a rect with cover-fit plus pan/zoom offsets. */
export function drawPhotoCover(ctx, img, rect, view) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (view?.zoom ?? 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (view?.dx ?? 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (view?.dy ?? 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Renders one panel's picture (photo or painted scene) to an offscreen. */
function renderPanel(panel, assignment, grade) {
  const pw = Math.max(2, Math.round(panel.w));
  const ph = Math.max(2, Math.round(panel.h));
  const off = document.createElement('canvas');
  off.width = pw; off.height = ph;
  const octx = off.getContext('2d');
  if (assignment?.photo) {
    drawPhotoCover(octx, assignment.photo, { x: 0, y: 0, w: pw, h: ph }, assignment);
  } else {
    sceneById(assignment?.scene ?? panel.scene).paint(octx, 0, 0, pw, ph);
  }
  applyGrade(off, grade);
  return off;
}

/**
 * Composes the whole cover onto `canvas` at the canvas's own size.
 * state: { layout, grade, title, subtitle, kicker, heat, heatLabel,
 *          grain, halftone, vignette, assignments: [{scene, photo, dx, dy, zoom}] }
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const panels = layout.panels(w, h);
  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((panel, i) => {
    const img = renderPanel(panel, state.assignments?.[i], grade);
    ctx.save();
    if (panel.tilt) {
      const cx = panel.x + panel.w / 2, cy = panel.y + panel.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(panel.tilt);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.min(w, h) * 0.03;
      ctx.fillStyle = '#fdfbf5';
      const pad = Math.min(w, h) * 0.014;
      ctx.fillRect(-panel.w / 2 - pad, -panel.h / 2 - pad, panel.w + pad * 2, panel.h + pad * 2.6);
      ctx.shadowBlur = 0;
      ctx.drawImage(img, -panel.w / 2, -panel.h / 2);
    } else {
      ctx.drawImage(img, panel.x, panel.y);
    }
    ctx.restore();
  });

  // Keylines: bright inner rules between panels plus a fine outer frame.
  if (!layout.tilted) {
    const lw = Math.max(3, Math.round(Math.min(w, h) * 0.008));
    ctx.strokeStyle = '#fdfbf5';
    ctx.lineWidth = lw;
    for (const p of panels) ctx.strokeRect(p.x + lw / 2, p.y + lw / 2, p.w - lw, p.h - lw);
    ctx.strokeStyle = 'rgba(12,3,26,0.9)';
    ctx.lineWidth = Math.max(6, lw * 2.2);
    ctx.strokeRect(0, 0, w, h);
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = Math.max(2, lw * 0.45);
    ctx.strokeRect(lw * 1.6, lw * 1.6, w - lw * 3.2, h - lw * 3.2);
  }

  if (state.halftone > 0.01) applyHalftone(ctx, w, h, state.halftone, canvas);
  drawCoverLettering(ctx, w, h, {
    title: state.title, subtitle: state.subtitle, kicker: state.kicker,
    heat: state.heat, heatLabel: state.heatLabel,
  }, layout.letterAnchor);
  applyVignette(ctx, w, h, state.vignette);
  applyGrain(ctx, w, h, state.grain);
  return panels;
}

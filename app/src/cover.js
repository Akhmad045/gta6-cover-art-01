// Composes the finished cover: panels painted or filled with the user's photos, a global
// gradient-map grade, white keylines between panels, film texture, then the lettering.
// Rendering happens on an offscreen canvas so the grade can treat the whole poster at once.

import { sceneById } from './scenes.js';
import { applyGrade, applyTexture } from './grades.js';
import { panelRects } from './layouts.js';

const renderCanvas = document.createElement('canvas');

/** Draws one panel's content: the user's photo cropped by zoom/pan, or its painted scene. */
function paintPanel(ctx, rect, panel) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.img) {
    const iw = panel.img.naturalWidth, ih = panel.img.naturalHeight;
    const scale = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
    const dw = iw * scale, dh = ih * scale;
    const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
    ctx.drawImage(panel.img, dx, dy, dw, dh);
  } else {
    sceneById(panel.scene).paint(ctx, rect.x, rect.y, rect.w, rect.h);
  }
  const shade = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(255,255,255,0.10)');
  shade.addColorStop(0.25, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,10,0.16)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** White keylines around every panel and a heavier frame around the whole cover. */
function drawKeylines(ctx, rects, w, h) {
  const lw = Math.max(3, Math.round(w * 0.0055));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lw;
  for (const r of rects) ctx.strokeRect(r.x + lw / 2, r.y + lw / 2, r.w - lw, r.h - lw);
  ctx.lineWidth = lw * 2.2;
  ctx.strokeRect(lw, lw, w - lw * 2, h - lw * 2);
}

/**
 * Draws the whole cover described by `state` onto `canvas` at the canvas's own size.
 * state: { layout, grade, title, subtitle, ribbon, panels: [{scene, img, zoom, ox, oy}] }
 */
export function drawCover(canvas, state, lettering) {
  const { width: w, height: h } = canvas;
  renderCanvas.width = w;
  renderCanvas.height = h;
  const rctx = renderCanvas.getContext('2d');
  rctx.fillStyle = '#180a2a';
  rctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  rects.forEach((rect, i) => paintPanel(rctx, rect, state.panels[i] ?? state.panels[0]));
  applyGrade(renderCanvas, state.grade);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(renderCanvas, 0, 0);
  drawKeylines(ctx, rects, w, h);
  applyTexture(ctx, w, h, state.grade);
  lettering(ctx, w, h, state);
  return rects;
}

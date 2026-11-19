// The cover drawing engine. drawCover paints a whole cover onto any 2D context at
// whatever size the canvas is, so the editor preview, the PNG exports and the
// screenshot scenes all show exactly the same art. Drawing order: paper backing,
// photo panels with white gutters, a light leak over the panels, then the title
// block with its halftone dots, big gradient lettering, script subtitle, heat
// stars and ribbon badge, and finally grain and vignette over everything.

import { gradedPhoto } from './grades.js';
import { layoutPanels, TITLE_BLOCK_RATIO } from './layouts.js';

const PAPER = '#f7ead2';
const INK = '#1b1030';

function photoSize(source) {
  return {
    w: source.naturalWidth ?? source.width,
    h: source.naturalHeight ?? source.height,
  };
}

/** Draws one photo into a panel rectangle, honouring zoom and pan, clipped to the panel. */
function paintPanel(ctx, source, box, setting) {
  const { w: sw, h: sh } = photoSize(source);
  if (!sw || !sh) return;
  const coverScale = Math.max(box.w / sw, box.h / sh) * (setting?.zoom ?? 1);
  const drawnW = sw * coverScale;
  const drawnH = sh * coverScale;
  const slackX = Math.max(0, (drawnW - box.w) / 2);
  const slackY = Math.max(0, (drawnH - box.h) / 2);
  const dx = box.x + (box.w - drawnW) / 2 + (setting?.ox ?? 0) * slackX;
  const dy = box.y + (box.h - drawnH) / 2 + (setting?.oy ?? 0) * slackY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.drawImage(source, dx, dy, drawnW, drawnH);
  ctx.restore();
}

function paintTiltedPanel(ctx, source, box, setting) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((box.tilt ?? 0) * Math.PI) / 180);
  ctx.fillStyle = '#ffffff';
  const pad = Math.min(box.w, box.h) * 0.045;
  ctx.shadowColor = 'rgba(10, 4, 24, 0.45)';
  ctx.shadowBlur = Math.min(box.w, box.h) * 0.09;
  ctx.shadowOffsetY = Math.min(box.w, box.h) * 0.03;
  ctx.fillRect(-box.w / 2 - pad, -box.h / 2 - pad, box.w + pad * 2, box.h + pad * 2.6);
  ctx.shadowColor = 'transparent';
  paintPanel(ctx, source, { x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h }, setting);
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 79, 154, 0.35)';
  for (let row = 0; row * unit < h + unit; row++) {
    for (let col = 0; col * unit < w + unit; col++) {
      const radius = unit * 0.16 * (1 - (row * unit) / (h + unit)) + unit * 0.03;
      ctx.beginPath();
      ctx.arc(x + col * unit + (row % 2 ? unit / 2 : 0), y + row * unit, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitFontSize(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  const set = () => { ctx.font = `${weight} ${size}px ${family}`; };
  set();
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 3;
    set();
  }
  return size;
}

const TITLE_FAMILY = '"Arial Black", "Archivo Black", "Franklin Gothic Heavy", sans-serif';
const SCRIPT_FAMILY = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';

function drawTitleBlock(ctx, w, h, state) {
  const blockY = h * (1 - TITLE_BLOCK_RATIO);
  const blockH = h - blockY;
  const sunset = ctx.createLinearGradient(0, blockY, 0, h);
  sunset.addColorStop(0, '#2a1450');
  sunset.addColorStop(0.55, '#571d63');
  sunset.addColorStop(1, '#8f2160');
  ctx.fillStyle = sunset;
  ctx.fillRect(0, blockY, w, blockH);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(0, blockY, w, Math.max(3, h * 0.006));
  if (state.fx.halftone) drawHalftone(ctx, 0, blockY, w, blockH, Math.max(9, w * 0.016));

  const title = (state.title || '').trim().toUpperCase();
  const centreY = blockY + blockH * 0.46;
  if (title) {
    ctx.save();
    ctx.translate(w / 2, centreY);
    ctx.transform(0.86, 0, -0.06, 1, 0, 0);
    const size = fitFontSize(ctx, title, TITLE_FAMILY, 900, blockH * 0.52, w * 0.94 / 0.86);
    ctx.font = `900 ${size}px ${TITLE_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fill = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    fill.addColorStop(0, '#fff3c4');
    fill.addColorStop(0.45, '#ffb340');
    fill.addColorStop(0.75, '#ff4f9a');
    fill.addColorStop(1, '#ff2e7e');
    ctx.lineWidth = size * 0.14;
    ctx.strokeStyle = '#ffffff';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(12, 2, 26, 0.65)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.07;
    ctx.strokeText(title, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.font = `italic 700 ${Math.max(15, blockH * 0.17)}px ${SCRIPT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(25, 211, 197, 0.9)';
    ctx.shadowBlur = blockH * 0.07;
    ctx.fillStyle = '#aef7ef';
    ctx.fillText(sub, w / 2, blockY + blockH * 0.8);
    ctx.restore();
  }

  if (state.stars > 0) drawStars(ctx, w, blockY, blockH, state.stars);
  if (state.fx.ribbon && state.ribbon.trim()) drawRibbon(ctx, w, blockY, blockH, state.ribbon.trim().toUpperCase());
}

function drawStars(ctx, w, blockY, blockH, count) {
  const size = blockH * 0.13;
  const gap = size * 1.45;
  const total = gap * 4 + size;
  let x = w - total - w * 0.025;
  const y = blockY + blockH * 0.16;
  ctx.save();
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = 'rgba(27, 16, 48, 0.6)';
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = i < count ? 1 : 0.25;
    starPath(ctx, x + size / 2, y, size / 2);
    ctx.fill();
    ctx.stroke();
    x += gap;
  }
  ctx.restore();
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawRibbon(ctx, w, blockY, blockH, text) {
  ctx.save();
  ctx.font = `800 ${Math.max(11, blockH * 0.105)}px "Avenir Next", "Segoe UI", sans-serif`;
  const width = ctx.measureText(text).width + blockH * 0.3;
  const height = blockH * 0.21;
  const x = w * 0.025;
  const y = blockY + blockH * 0.07;
  ctx.translate(x + width / 2, y + height / 2);
  ctx.rotate(-0.035);
  ctx.fillStyle = '#19d3c5';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function drawGrain(ctx, w, h, seedText) {
  let seed = 2166136261;
  for (const ch of seedText) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519);
    seed ^= seed >>> 13;
    return ((seed >>> 0) % 10000) / 10000;
  };
  ctx.save();
  const dots = Math.round((w * h) / 2600);
  for (let i = 0; i < dots; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  grad.addColorStop(0, 'rgba(10, 2, 22, 0)');
  grad.addColorStop(1, 'rgba(10, 2, 22, 0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Paints the full cover described by `state` onto `canvas`.
 * state: { photos, panels: [{photo, zoom, ox, oy}], layout, grade, title,
 *          subtitle, ribbon, stars, fx: {halftone, grain, vignette, ribbon} }
 * photos are images (or graded canvases); panels index into photos, -1 = empty.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  const posterH = h * (1 - TITLE_BLOCK_RATIO);
  const gutter = Math.max(4, w * 0.008);
  const panels = layoutPanels(state.layout);
  const graded = state.photos.map((photo) => (photo ? gradedPhoto(photo, state.grade) : null));

  panels.forEach((panel, index) => {
    const setting = state.panels[index] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const box = {
      x: gutter + panel.x * (w - gutter * 2),
      y: gutter + panel.y * (posterH - gutter * 2),
      w: panel.w * (w - gutter * 2),
      h: panel.h * (posterH - gutter * 2),
      tilt: panel.tilt ?? 0,
    };
    const source = setting.photo >= 0 ? graded[setting.photo] : null;
    if (!source) {
      ctx.fillStyle = '#31204d';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = 'rgba(253, 246, 236, 0.55)';
      ctx.font = `700 ${Math.max(13, w * 0.018)}px "Avenir Next", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', box.x + box.w / 2, box.y + box.h / 2);
      return;
    }
    if (box.tilt) paintTiltedPanel(ctx, source, box, setting);
    else paintPanel(ctx, source, box, setting);
  });

  // A warm light leak sweeping the panels, brightest at the top-left corner.
  const leak = ctx.createLinearGradient(0, 0, w * 0.7, posterH);
  leak.addColorStop(0, 'rgba(255, 170, 80, 0.20)');
  leak.addColorStop(0.5, 'rgba(255, 79, 154, 0.05)');
  leak.addColorStop(1, 'rgba(25, 211, 197, 0.10)');
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, w, posterH);

  drawTitleBlock(ctx, w, h, state);
  if (state.fx.vignette) drawVignette(ctx, w, h);
  if (state.fx.grain) drawGrain(ctx, w, h, `${state.title}|${state.layout}|${state.grade}`);
}

/** Pixel rectangle of panel `index` on a canvas of the given size (for hit-testing). */
export function panelBox(canvasW, canvasH, layoutId, index) {
  const posterH = canvasH * (1 - TITLE_BLOCK_RATIO);
  const gutter = Math.max(4, canvasW * 0.008);
  const panel = layoutPanels(layoutId)[index];
  if (!panel) return null;
  return {
    x: gutter + panel.x * (canvasW - gutter * 2),
    y: gutter + panel.y * (posterH - gutter * 2),
    w: panel.w * (canvasW - gutter * 2),
    h: panel.h * (posterH - gutter * 2),
  };
}

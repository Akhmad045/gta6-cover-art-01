// Caption lettering drawn on canvas with system fonts only: a heavy condensed title with a
// sunset gradient fill, a thick dark outline and a soft under-glow; a glowing script subtitle
// tucked over it; a ribbon banner and a five-star heat meter along the foot of the cover.

const TITLE_FONT = '"Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif';

/** Fits a font size so `text` at `weight size px family` spans at most maxWidth. */
function fitSize(ctx, text, family, weight, start, maxWidth) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the title block near the top of the cover: script subtitle first (it sits behind),
 * then the big title with gradient fill, dark outline and glow, letterspaced like a poster.
 */
export function drawTitleBlock(ctx, w, h, title, subtitle, grade) {
  const text = (title || '').trim().toUpperCase();
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (text) {
    const size = fitSize(ctx, text, TITLE_FONT, 900, h * 0.115, w * 0.92);
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older engines */ }
    const ty = h * 0.055 + size;
    ctx.save();
    ctx.shadowColor = 'rgba(255,60,120,0.55)';
    ctx.shadowBlur = size * 0.35;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16041f';
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(text, cx, ty);
    ctx.restore();
    const fill = ctx.createLinearGradient(0, ty - size, 0, ty);
    fill.addColorStop(0, grade.titleTop);
    fill.addColorStop(0.55, grade.titleBottom);
    fill.addColorStop(1, '#d6336c');
    ctx.fillStyle = fill;
    ctx.fillText(text, cx, ty);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
    if (subtitle && subtitle.trim()) {
      const sub = subtitle.trim();
      const ssize = fitSize(ctx, sub, 'Georgia, serif', 'italic 700', size * 0.40, w * 0.7);
      ctx.font = `italic 700 ${ssize}px Georgia, "Times New Roman", serif`;
      ctx.save();
      ctx.translate(cx + size * 0.6, ty + ssize * 0.55);
      ctx.rotate(-0.045);
      ctx.shadowColor = grade.script;
      ctx.shadowBlur = ssize * 0.6;
      ctx.fillStyle = grade.script;
      ctx.fillText(sub, 0, 0);
      ctx.fillText(sub, 0, 0);
      ctx.restore();
    }
  }
}

/** A five-star heat meter: filled stars for the cover's heat rating, dimmed for the rest. */
export function drawStarMeter(ctx, cx, y, r, filled) {
  ctx.save();
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    const sx = cx + (i - 2) * r * 2.5;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const rad = p % 2 === 0 ? r : r * 0.45;
      const px = sx + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (i < filled) {
      ctx.fillStyle = '#ffd76a';
      ctx.shadowColor = 'rgba(255,180,60,0.8)';
      ctx.shadowBlur = r * 0.7;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The foot ribbon: a dark band with a neon top edge carrying the ribbon text on the left,
 * the heat meter in the middle-right and a small round badge at the right end.
 */
export function drawRibbon(ctx, w, h, ribbonText, grade) {
  const bandH = h * 0.075;
  const y = h - bandH;
  ctx.fillStyle = 'rgba(10,3,20,0.88)';
  ctx.fillRect(0, y, w, bandH);
  const edge = ctx.createLinearGradient(0, 0, w, 0);
  edge.addColorStop(0, '#ff2e88');
  edge.addColorStop(0.5, '#ffb300');
  edge.addColorStop(1, '#22d3ee');
  ctx.fillStyle = edge;
  ctx.fillRect(0, y, w, Math.max(2, h * 0.004));
  const label = (ribbonText || '').trim().toUpperCase();
  ctx.textAlign = 'left';
  if (label) {
    const size = fitSize(ctx, label, TITLE_FONT, 700, bandH * 0.42, w * 0.52);
    ctx.font = `700 ${size}px ${TITLE_FONT}`;
    ctx.fillStyle = '#fdf6e3';
    ctx.fillText(label, w * 0.035, y + bandH * 0.64);
  }
  drawStarMeter(ctx, w * 0.72, y + bandH * 0.52, bandH * 0.20, 5);
  const br = bandH * 0.34;
  const bx = w * 0.945, by = y + bandH * 0.5;
  ctx.save();
  ctx.beginPath();
  for (let p = 0; p < 16; p++) {
    const a = p * Math.PI / 8;
    const rad = p % 2 === 0 ? br : br * 0.82;
    const px = bx + Math.cos(a) * rad, py = by + Math.sin(a) * rad;
    if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = grade.titleBottom;
  ctx.fill();
  ctx.fillStyle = '#16041f';
  ctx.font = `900 ${br * 0.62}px ${TITLE_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('NC', bx, by + br * 0.23);
  ctx.restore();
}

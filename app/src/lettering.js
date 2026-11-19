// lettering.js — the magazine furniture of a Neon Coast cover.
//
// Everything a newsstand cover needs, drawn on canvas over the panels:
// a letterspaced kicker, a condensed display title with a sunset gradient
// fill, hard outline and neon glow, a script subtitle, and along the foot a
// ribbon carrying the star heat meter and a circular badge. Type uses
// system font stacks only — condensed sans for the title, a cursive stack
// for the script — so the app stays fully offline with no font files.

const DISPLAY = '"Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif';
const SCRIPT = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const SANS = 'system-ui, "Segoe UI", Arial, sans-serif';

/** Letterspaced uppercase text, drawn centred at (cx, y). */
function drawKicker(ctx, text, cx, y, size, colour) {
  ctx.save();
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const spacing = size * 0.42;
  const chars = [...text.toUpperCase()];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  ctx.fillStyle = colour;
  chars.forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing; });
  ctx.restore();
  return total;
}

/** One star centred at (cx, cy); filled or hollow by `filled`. */
function drawStar(ctx, cx, cy, r, filled, colour) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = r * 0.7;
    ctx.fill();
  } else {
    ctx.strokeStyle = colour;
    ctx.lineWidth = r * 0.14;
    ctx.stroke();
  }
  ctx.restore();
}

/** Splits the title into lines and shrinks it until every line fits. */
function computeTitleLines(ctx, title, maxWidth, baseSize) {
  const words = title.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { lines: [], size: baseSize, lineHeight: 0 };
  const lines = words.length > 1 && maxWidth < baseSize * 7
    ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
    : [words.join(' ')];
  let size = baseSize;
  ctx.save();
  ctx.font = `900 ${size}px ${DISPLAY}`;
  while (lines.some((line) => ctx.measureText(line).width * 0.86 > maxWidth) && size > 14) {
    size -= 3;
    ctx.font = `900 ${size}px ${DISPLAY}`;
  }
  ctx.restore();
  return { lines, size, lineHeight: size * 0.94 };
}

/**
 * The display title: up to two lines of condensed capitals, gradient-filled
 * top-to-bottom (cream through gold to hot pink), with a deep outline and a
 * soft magenta glow. Returns the block height used.
 */
export function drawDisplayTitle(ctx, title, cx, top, maxWidth, baseSize) {
  const { lines, size, lineHeight } = computeTitleLines(ctx, title, maxWidth, baseSize);
  if (!lines.length) return 0;
  ctx.save();
  ctx.font = `900 ${size}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(0.86, 1); // condense the stack further, poster-style
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#fff7dd');
    grad.addColorStop(0.38, '#ffd23c');
    grad.addColorStop(0.72, '#ff7a3c');
    grad.addColorStop(1, '#ff2e88');
    ctx.font = `900 ${size}px ${DISPLAY}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c0530';
    ctx.lineWidth = size * 0.14;
    ctx.shadowColor = 'rgba(10,2,24,0.85)';
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(line, 0, 0);
    ctx.shadowColor = 'rgba(255,46,136,0.75)';
    ctx.shadowBlur = size * 0.34;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = grad;
    ctx.fillText(line, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `900 ${size}px ${DISPLAY}`;
    ctx.globalAlpha = 0.28;
    ctx.fillText(line, 0, -size * 0.03);
    ctx.restore();
  });
  ctx.restore();
  return lines.length * lineHeight;
}

/** The script subtitle: flowing cursive in neon pink with a dark halo. */
export function drawScriptSubtitle(ctx, text, cx, y, size) {
  if (!text.trim()) return 0;
  ctx.save();
  ctx.font = `italic 700 ${size}px ${SCRIPT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(8,2,20,0.9)';
  ctx.shadowBlur = size * 0.32;
  ctx.fillStyle = '#ff5ea8';
  ctx.fillText(text, cx, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `italic 700 ${size * 0.98}px ${SCRIPT}`;
  ctx.globalAlpha = 0.35;
  ctx.fillText(text, cx, y - size * 0.04);
  ctx.restore();
  return size * 1.25;
}

/** A round badge: double ring, star, and two arcs of small capitals. */
export function drawBadge(ctx, cx, cy, r, topText, bottomText) {
  ctx.save();
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, '#ff7a3c');
  grad.addColorStop(1, '#c2185b');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(8,2,20,0.6)';
  ctx.shadowBlur = r * 0.3;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = r * 0.035;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  drawStar(ctx, cx, cy + r * 0.05, r * 0.3, true, '#fff3d6');
  ctx.fillStyle = '#fff3d6';
  ctx.textAlign = 'center';
  ctx.font = `700 ${r * 0.19}px ${SANS}`;
  ctx.fillText(topText, cx, cy - r * 0.42);
  ctx.font = `700 ${r * 0.16}px ${SANS}`;
  ctx.fillText(bottomText, cx, cy + r * 0.52);
  ctx.restore();
}

/**
 * The foot ribbon: a slanted banner with the heat label and star meter,
 * sitting bottom-left, with the round badge overlapping its right end.
 */
export function drawHeatRibbon(ctx, x, y, w, heat, label) {
  const h = w * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, -0.035, 0, 1, 0, 0); // a slight newsstand slant
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#160a2e');
  grad.addColorStop(0.75, '#3d1154');
  grad.addColorStop(1, '#7c1d6e');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,210,130,0.9)';
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.18);
  ctx.lineTo(w, 0);
  ctx.lineTo(w - h * 0.3, h);
  ctx.lineTo(h * 0.22, h * 0.86);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd23c';
  ctx.font = `800 ${h * 0.34}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), h * 0.42, h * 0.47);
  const labelW = ctx.measureText(label.toUpperCase()).width;
  const starR = h * 0.21;
  const startX = h * 0.42 + labelW + h * 0.5;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, startX + i * starR * 2.35, h * 0.47, starR, i < heat, i < heat ? '#ffd23c' : 'rgba(255,220,150,0.5)');
  }
  ctx.restore();
  return h;
}

/**
 * The full lettering stack for a cover of size w x h. `anchor` is 'bottom'
 * for panel layouts (title sits over the foot) or 'top' for full bleed.
 */
export function drawCoverLettering(ctx, w, h, copy, anchor = 'bottom') {
  const cx = w / 2;
  const unit = Math.min(w, h);
  if (anchor === 'top') {
    // Scrim so type reads over a full-bleed picture.
    const scrim = ctx.createLinearGradient(0, 0, 0, h * 0.52);
    scrim.addColorStop(0, 'rgba(10,3,24,0.72)');
    scrim.addColorStop(1, 'rgba(10,3,24,0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h * 0.52);
    drawKicker(ctx, copy.kicker, cx, h * 0.055, unit * 0.026, '#ffd9ec');
    const used = drawDisplayTitle(ctx, copy.title, cx, h * 0.085, w * 0.92, unit * 0.155);
    drawScriptSubtitle(ctx, copy.subtitle, cx, h * 0.085 + used + unit * 0.02, unit * 0.052);
  } else {
    const base = h * 0.995;
    drawKicker(ctx, copy.kicker, cx, h * 0.042, unit * 0.024, 'rgba(255,240,214,0.95)');
    // Measure first, then stack upward from the foot: ribbon at the base,
    // subtitle above it, title above that — the three never overlap.
    const ribbonW = w * 0.46;
    const ribbonH = ribbonW * 0.16;
    const ribbonTop = base - ribbonH - unit * 0.018;
    const titleZoneW = w * 0.66;
    const titleZoneCx = w * 0.05 + titleZoneW / 2;
    const { lineHeight, lines } = computeTitleLines(ctx, copy.title, titleZoneW, unit * 0.148);
    const titleH = lines.length * lineHeight;
    const subtitleH = unit * 0.062;
    const titleTop = ribbonTop - subtitleH - titleH - unit * 0.035;
    // Halftone-flavoured dark block behind the title for print texture.
    const block = ctx.createLinearGradient(0, titleTop - unit * 0.06, 0, base);
    block.addColorStop(0, 'rgba(12,3,26,0)');
    block.addColorStop(0.35, 'rgba(12,3,26,0.55)');
    block.addColorStop(1, 'rgba(12,3,26,0.88)');
    ctx.fillStyle = block;
    ctx.fillRect(0, titleTop - unit * 0.06, w, base - titleTop + unit * 0.06);
    drawDisplayTitle(ctx, copy.title, titleZoneCx, titleTop, titleZoneW, unit * 0.148);
    drawScriptSubtitle(ctx, copy.subtitle, titleZoneCx, titleTop + titleH + unit * 0.012, unit * 0.05);
    drawHeatRibbon(ctx, w * 0.05, ribbonTop, ribbonW, copy.heat, copy.heatLabel);
  }
  drawBadge(ctx, w * 0.925, anchor === 'top' ? h * 0.885 : h * 0.885, unit * 0.082, 'NEON', 'COAST');
}

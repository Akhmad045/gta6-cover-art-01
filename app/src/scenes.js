// Painterly sample scenes, drawn entirely with canvas paths: layered sky bands, a glowing sun,
// silhouetted palms, water with a reflected light column, neon streets and a lowrider profile.
// Every scene paints into whatever rectangle it is given, so the same art fills a hero panel,
// a small grid cell or a full-bleed cover. No images are loaded: the art is the code.

/** Mixes two hex colours, t from 0 (a) to 1 (b), returning an rgb() string. */
function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

/** Paints a vertical multi-stop sky (array of [offset, colour]) over the rect. */
function paintSky(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A low sun: soft halo, bright core and a thin banded retro shadow across its lower half. */
function paintSun(ctx, cx, cy, r) {
  const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
  halo.addColorStop(0, 'rgba(255,190,90,0.55)');
  halo.addColorStop(0.5, 'rgba(255,110,90,0.18)');
  halo.addColorStop(1, 'rgba(255,110,90,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
  const core = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  core.addColorStop(0, '#fff6d8');
  core.addColorStop(0.55, '#ffd76a');
  core.addColorStop(1, '#ff8a3c');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214,51,108,0.20)';
  for (let i = 0; i < 3; i++) ctx.fillRect(cx - r, cy + r * (0.18 + i * 0.24), r * 2, r * 0.07);
}

/** Horizontal painterly clouds: stacked soft ellipses in two tones. */
function paintClouds(ctx, x, y, w, seed, tone) {
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const cx = x + w * ((seed * (i + 3) * 37) % 100) / 100;
    const cy = y + (i % 3) * 14 - 6;
    const cw = w * (0.16 + ((seed * (i + 1) * 13) % 10) / 60);
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + cw * 0.4, cy + 3, cw * 0.6, cw * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A silhouetted palm: curved trunk and nine long fronds that arc up then droop past the crown. */
export function drawPalm(ctx, x, baseY, s, lean, colour) {
  const topX = x + lean * s;
  const topY = baseY - s;
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * s * 0.25, baseY - s * 0.62, topX, topY);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, s * 0.032);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const dir = t * 2 - 1;
    const len = s * (0.44 - Math.abs(dir) * 0.08) * (0.9 + (i % 3) * 0.08);
    const ex = topX + dir * len;
    const ey = topY + len * (0.42 + Math.abs(dir) * 0.22) - (1 - Math.abs(dir)) * len * 0.38;
    const cpx = topX + dir * len * 0.40;
    const cpy = topY - len * 0.36;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.03, s * 0.034, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.045, topY + s * 0.05, s * 0.027, 0, Math.PI * 2);
  ctx.fill();
}

/** A row of distant art-deco hotel silhouettes with a few lit windows. */
function paintSkyline(ctx, x, y, w, baseY, colour, lit) {
  ctx.fillStyle = colour;
  let cx = x;
  let i = 0;
  while (cx < x + w) {
    const bw = w * (0.07 + ((i * 29) % 10) / 90);
    const bh = (baseY - y) * (0.35 + ((i * 41) % 10) / 22);
    ctx.fillRect(cx, baseY - bh, bw, bh);
    ctx.fillRect(cx + bw * 0.3, baseY - bh - bh * 0.1, bw * 0.4, bh * 0.1);
    if (lit) {
      ctx.fillStyle = lit;
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 2; wx++) {
        if ((i * 7 + wy * 3 + wx) % 3 === 0) ctx.fillRect(cx + bw * (0.2 + wx * 0.35), baseY - bh + bh * (0.15 + wy * 0.2), bw * 0.14, bh * 0.08);
      }
      ctx.fillStyle = colour;
    }
    cx += bw + w * 0.012;
    i++;
  }
}

/** Sparkles on water: short horizontal dashes, denser near the light column. */
function paintSparkle(ctx, x, y, w, h, cx, seed) {
  for (let i = 0; i < 90; i++) {
    const px = x + ((seed * (i + 5) * 53) % 1000) / 1000 * w;
    const py = y + ((seed * (i + 11) * 31) % 1000) / 1000 * h;
    const near = 1 - Math.min(1, Math.abs(px - cx) / (w * 0.3));
    ctx.fillStyle = `rgba(255,230,170,${0.10 + near * 0.5})`;
    ctx.fillRect(px, py, 3 + near * 14, 1.6);
  }
}

/** Palm boulevard at sunset: a road vanishing into the sun, palms receding on both sides. */
export function paintBoulevard(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h, [[0, '#3b1d63'], [0.34, '#a12c6e'], [0.58, '#e8503a'], [0.78, '#ff9a3c'], [1, '#ffc65c']]);
  paintClouds(ctx, x + w * 0.06, y + h * 0.10, w * 0.9, 3, 'rgba(255,150,120,0.35)');
  paintClouds(ctx, x + w * 0.02, y + h * 0.24, w * 0.9, 7, 'rgba(120,40,110,0.30)');
  const horizon = y + h * 0.66;
  paintSkyline(ctx, x, y + h * 0.44, w, horizon, '#57164a', null);
  paintSun(ctx, x + w * 0.5, horizon - h * 0.02, h * 0.17);
  const road = ctx.createLinearGradient(0, horizon, 0, y + h);
  road.addColorStop(0, '#a03a54');
  road.addColorStop(1, '#3a1138');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.415, horizon);
  ctx.lineTo(x + w * 0.585, horizon);
  ctx.lineTo(x + w * 1.04, y + h);
  ctx.lineTo(x - w * 0.04, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,140,0.85)';
  ctx.lineWidth = Math.max(1.5, h * 0.006);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.415, horizon);
  ctx.lineTo(x - w * 0.04, y + h);
  ctx.moveTo(x + w * 0.585, horizon);
  ctx.lineTo(x + w * 1.04, y + h);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.6) / 5.6;
    const dy = horizon + (h * 0.32) * t * t;
    ctx.fillRect(x + w * 0.5 - 2, dy, 4, h * 0.055 * (0.3 + t));
  }
  ctx.fillStyle = '#8c2a5c';
  ctx.beginPath();
  ctx.moveTo(x, horizon);
  ctx.lineTo(x + w * 0.415, horizon);
  ctx.lineTo(x - w * 0.04, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w, horizon);
  ctx.lineTo(x + w * 0.585, horizon);
  ctx.lineTo(x + w * 1.04, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,150,90,0.5)';
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(x + w * (0.03 + (i % 4) * 0.09), horizon + h * (0.05 + Math.floor(i / 4) * 0.13), w * 0.012, h * 0.02);
    ctx.fillRect(x + w * (0.64 + (i % 4) * 0.09), horizon + h * (0.05 + Math.floor(i / 4) * 0.13), w * 0.012, h * 0.02);
  }
  const ink = '#1d0724';
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const s = h * (0.16 + t * 0.30);
    drawPalm(ctx, x + w * (0.335 - t * 0.10), horizon + h * 0.30 * t * t + s * 0.92, s, -0.16, ink);
    drawPalm(ctx, x + w * (0.665 + t * 0.10), horizon + h * 0.30 * t * t + s * 0.92, s, 0.16, ink);
  }
  drawPalm(ctx, x + w * 0.06, y + h * 0.99, h * 0.52, 0.20, ink);
  drawPalm(ctx, x + w * 0.97, y + h * 0.99, h * 0.58, -0.22, ink);
}

/** A wooden pier and a speedboat over turquoise water, sun path glittering to the horizon. */
export function paintPier(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h * 0.52, [[0, '#2e5aa8'], [0.55, '#e86a92'], [1, '#ffb35c']]);
  const horizon = y + h * 0.52;
  paintSun(ctx, x + w * 0.66, horizon - h * 0.03, h * 0.11);
  paintClouds(ctx, x + w * 0.05, y + h * 0.08, w * 0.8, 5, 'rgba(255,190,160,0.4)');
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, '#ffb35c');
  sea.addColorStop(0.25, '#2fa8a0');
  sea.addColorStop(1, '#0b4f6e');
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, h * 0.48);
  ctx.fillStyle = 'rgba(255,190,110,0.5)';
  for (let i = 0; i < 16; i++) ctx.fillRect(x + w * 0.66 - (i % 5) * 3, horizon + 4 + i * h * 0.026, w * (0.02 + (i % 4) * 0.012), 2);
  paintSparkle(ctx, x, horizon, w, h * 0.46, x + w * 0.66, 9);
  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.46, horizon + h * 0.05);
  ctx.lineTo(x + w * 0.60, horizon + h * 0.05);
  ctx.lineTo(x + w * 0.30, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    ctx.beginPath();
    ctx.moveTo(x + w * (0.035 + t * 0.27), y + h - t * h * 0.44);
    ctx.lineTo(x + w * (0.475 + t * 0.115), y + h - t * h * 0.44);
    ctx.stroke();
  }
  ctx.fillStyle = '#241407';
  for (let i = 0; i < 3; i++) {
    const px = x + w * (0.47 + i * 0.035);
    ctx.fillRect(px, horizon + h * 0.02, w * 0.016, h * 0.16);
  }
  ctx.fillRect(x + w * 0.44, horizon + h * 0.015, w * 0.20, h * 0.018);
  const bx = x + w * 0.60, by = horizon + h * 0.16, bw = w * 0.34, bh = h * 0.10;
  ctx.fillStyle = 'rgba(6,40,60,0.35)';
  ctx.beginPath();
  ctx.ellipse(bx + bw * 0.5, by + bh * 1.15, bw * 0.52, bh * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw * 0.86, by);
  ctx.lineTo(bx + bw, by + bh * 0.42);
  ctx.lineTo(bx + bw * 0.78, by + bh);
  ctx.lineTo(bx + bw * 0.14, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6336c';
  ctx.fillRect(bx + bw * 0.05, by + bh * 0.52, bw * 0.82, bh * 0.16);
  ctx.fillStyle = '#173a52';
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.30, by);
  ctx.lineTo(bx + bw * 0.44, by - bh * 0.52);
  ctx.lineTo(bx + bw * 0.66, by - bh * 0.52);
  ctx.lineTo(bx + bw * 0.74, by);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(bx - i * 9 - 4, by + bh * (0.75 + i * 0.16));
    ctx.quadraticCurveTo(bx - bw * 0.16, by + bh * (0.9 + i * 0.16), bx - bw * 0.30, by + bh * (0.8 + i * 0.16));
    ctx.stroke();
  }
  drawPalm(ctx, x + w * 0.05, horizon + h * 0.10, h * 0.30, 0.24, '#122b1e');
}

/** A building face with a grid of lit windows, used by the neon street. */
function paintBuildingFace(ctx, bx, by, bw, bh, seed) {
  ctx.fillStyle = '#0d0b26';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#181238';
  ctx.fillRect(bx, by, bw, bh * 0.03);
  const cols = Math.max(2, Math.floor(bw / 15));
  const rows = Math.max(3, Math.floor(bh / 19));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if ((r * 13 + c * 7 + seed * 5) % 5 > 1) continue;
    ctx.fillStyle = (r + c + seed) % 5 === 0 ? 'rgba(34,211,238,0.8)' : 'rgba(255,205,110,0.85)';
    ctx.fillRect(bx + (c + 0.5) * (bw / cols) - 3, by + (r + 0.5) * (bh / rows) - 3.5, 6, 7);
  }
  ctx.fillStyle = 'rgba(140,120,255,0.35)';
  ctx.fillRect(bx, by, 2, bh);
  ctx.fillRect(bx + bw - 2, by, 2, bh);
}

/** A neon sign: dark plaque, glowing border and glowing letters, with a smear of reflection. */
function paintNeonSign(ctx, sx, sy, sw, sh, colour, word, vertical) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,4,18,0.92)';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.shadowColor = colour;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(sx, sy, sw, sh);
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  if (vertical) {
    ctx.font = `700 ${Math.min(sw * 0.52, sh / (word.length + 1))}px "Arial Narrow", sans-serif`;
    [...word].forEach((ch, i) => ctx.fillText(ch, sx + sw / 2, sy + sh * (i + 1) / (word.length + 0.4)));
  } else {
    ctx.font = `700 ${Math.min(sh * 0.44, sw / (word.length * 0.62))}px "Arial Narrow", sans-serif`;
    ctx.fillText(word, sx + sw / 2, sy + sh * 0.64);
  }
  ctx.restore();
}

/** Neon downtown at night: two lit building faces, glowing signs and a wet street. */
export function paintNeonStreet(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h * 0.66, [[0, '#070818'], [0.6, '#1b1040'], [1, '#3d1154']]);
  ctx.fillStyle = '#f6f3d8';
  ctx.beginPath();
  ctx.arc(x + w * 0.50, y + h * 0.10, h * 0.038, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(246,243,216,0.15)';
  ctx.beginPath();
  ctx.arc(x + w * 0.50, y + h * 0.10, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  paintBuildingFace(ctx, x - w * 0.02, y, w * 0.40, h * 0.68, 2);
  paintBuildingFace(ctx, x + w * 0.62, y, w * 0.40, h * 0.68, 5);
  paintBuildingFace(ctx, x + w * 0.40, y + h * 0.10, w * 0.22, h * 0.58, 8);
  paintNeonSign(ctx, x + w * 0.045, y + h * 0.10, w * 0.085, h * 0.44, '#ff2e88', 'HOTEL', true);
  paintNeonSign(ctx, x + w * 0.665, y + h * 0.16, w * 0.27, h * 0.13, '#22d3ee', 'DINER', false);
  paintNeonSign(ctx, x + w * 0.13, y + h * 0.40, w * 0.22, h * 0.115, '#ffb300', 'VICE BAR', false);
  const street = ctx.createLinearGradient(0, y + h * 0.68, 0, y + h);
  street.addColorStop(0, '#221243');
  street.addColorStop(1, '#05050f');
  ctx.fillStyle = street;
  ctx.fillRect(x, y + h * 0.68, w, h * 0.32);
  const smears = [['#ff2e88', 0.085], ['#ffb300', 0.22], ['#22d3ee', 0.78]];
  for (const [colour, fx] of smears) {
    const grad = ctx.createLinearGradient(0, y + h * 0.68, 0, y + h);
    grad.addColorStop(0, colour);
    grad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = grad;
    ctx.fillRect(x + w * fx, y + h * 0.68, w * 0.055, h * 0.30);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 20; i++) ctx.fillRect(x + ((i * 67) % 100) / 100 * w, y + h * (0.72 + ((i * 37) % 24) / 100), w * 0.045, 1.4);
  drawPalm(ctx, x + w * 0.585, y + h * 0.70, h * 0.30, 0.14, '#05050f');
}

/** Aerial beach: a diagonal shoreline, foam edge, umbrella dots and long palm shadows on sand. */
export function paintBeachAerial(ctx, x, y, w, h) {
  const sea = ctx.createLinearGradient(x, y, x + w, y + h);
  sea.addColorStop(0, '#0b6e8c');
  sea.addColorStop(0.45, '#17b6a6');
  sea.addColorStop(0.62, '#7fe8d8');
  sea.addColorStop(0.68, '#f7e3ae');
  sea.addColorStop(1, '#eec27f');
  ctx.fillStyle = sea;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1.6, h * 0.009);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let px = 0; px <= 20; px++) {
      const t = px / 20;
      const lx = x + w * t;
      const ly = y + h * (0.66 - t * 0.30) + Math.sin(t * 9 + i) * h * 0.012 - i * h * 0.022;
      if (px === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }
  paintSparkle(ctx, x, y, w * 0.7, h * 0.5, x + w * 0.3, 4);
  const dots = ['#ff2e88', '#ffb300', '#22d3ee', '#ff5e3a', '#7c3aed'];
  for (let i = 0; i < 11; i++) {
    const along = (i * 37 % 90) / 100;
    const ux = x + w * (0.16 + along * 0.80);
    const uy = y + h * (0.86 - along * 0.42) + ((i * 29) % 10) / 100 * h * 0.14;
    const r = Math.min(w, h) * 0.048;
    ctx.fillStyle = 'rgba(120,72,20,0.35)';
    ctx.beginPath();
    ctx.ellipse(ux + r * 1.6, uy + r * 1.1, r * 1.5, r * 0.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dots[i % dots.length];
    ctx.beginPath();
    ctx.arc(ux, uy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(ux, uy, r * 0.30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x + w * 0.90, y + h * 0.86);
  ctx.rotate(0.6);
  ctx.fillStyle = 'rgba(90,50,10,0.30)';
  ctx.fillRect(-h * 0.10, -h * 0.012, h * 0.30, h * 0.024);
  ctx.restore();
  drawPalm(ctx, x + w * 0.93, y + h * 0.97, h * 0.30, -0.3, 'rgba(16,60,40,0.55)');
}

/** A lowrider-style car in profile against a sunset skyline, chrome catching the last light. */
export function paintLowrider(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h, [[0, '#2b1055'], [0.45, '#b02a6e'], [0.72, '#ff7a3c'], [1, '#2a0f2e']]);
  paintSun(ctx, x + w * 0.24, y + h * 0.60, h * 0.13);
  paintSkyline(ctx, x + w * 0.3, y + h * 0.46, w * 0.7, y + h * 0.78, '#33092e', '#ffd76a');
  ctx.fillStyle = '#1c0722';
  ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  ctx.fillStyle = 'rgba(255,110,80,0.28)';
  ctx.fillRect(x, y + h * 0.78, w, h * 0.02);
  const cw = w * 0.82, ch = h * 0.30, cx0 = x + w * 0.09, cy0 = y + h * 0.78 - ch * 0.62;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx0 + cw * 0.5, cy0 + ch * 1.02, cw * 0.52, ch * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = ctx.createLinearGradient(0, cy0 - ch * 0.4, 0, cy0 + ch);
  body.addColorStop(0, '#ff5e7a');
  body.addColorStop(0.45, '#c2185b');
  body.addColorStop(1, '#5e0f38');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx0 + cw * 0.015, cy0 + ch * 0.86);
  ctx.quadraticCurveTo(cx0 - cw * 0.005, cy0 + ch * 0.38, cx0 + cw * 0.10, cy0 + ch * 0.30);
  ctx.quadraticCurveTo(cx0 + cw * 0.24, cy0 + ch * 0.22, cx0 + cw * 0.345, cy0 + ch * 0.20);
  ctx.quadraticCurveTo(cx0 + cw * 0.385, cy0 - ch * 0.10, cx0 + cw * 0.50, cy0 - ch * 0.115);
  ctx.quadraticCurveTo(cx0 + cw * 0.615, cy0 - ch * 0.10, cx0 + cw * 0.675, cy0 + ch * 0.18);
  ctx.quadraticCurveTo(cx0 + cw * 0.86, cy0 + ch * 0.20, cx0 + cw * 0.955, cy0 + ch * 0.34);
  ctx.quadraticCurveTo(cx0 + cw * 1.005, cy0 + ch * 0.42, cx0 + cw * 0.995, cy0 + ch * 0.72);
  ctx.quadraticCurveTo(cx0 + cw * 0.99, cy0 + ch * 0.92, cx0 + cw * 0.93, cy0 + ch * 0.94);
  ctx.lineTo(cx0 + cw * 0.07, cy0 + ch * 0.94);
  ctx.quadraticCurveTo(cx0 + cw * 0.02, cy0 + ch * 0.94, cx0 + cw * 0.015, cy0 + ch * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0e0a18';
  for (const t of [0.20, 0.80]) {
    ctx.beginPath();
    ctx.arc(cx0 + cw * t, cy0 + ch * 0.94, ch * 0.40, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  const glass = ctx.createLinearGradient(0, cy0 - ch * 0.3, 0, cy0 + ch * 0.2);
  glass.addColorStop(0, '#ffe9c9');
  glass.addColorStop(1, '#7dd7f0');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(cx0 + cw * 0.405, cy0 + ch * 0.13);
  ctx.quadraticCurveTo(cx0 + cw * 0.43, cy0 - ch * 0.045, cx0 + cw * 0.495, cy0 - ch * 0.055);
  ctx.lineTo(cx0 + cw * 0.495, cy0 + ch * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx0 + cw * 0.525, cy0 + ch * 0.13);
  ctx.lineTo(cx0 + cw * 0.525, cy0 - ch * 0.055);
  ctx.quadraticCurveTo(cx0 + cw * 0.605, cy0 - ch * 0.045, cx0 + cw * 0.645, cy0 + ch * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,235,190,0.95)';
  ctx.fillRect(cx0 + cw * 0.045, cy0 + ch * 0.42, cw * 0.90, ch * 0.05);
  ctx.fillStyle = 'rgba(20,4,24,0.55)';
  ctx.fillRect(cx0 + cw * 0.30, cy0 + ch * 0.60, cw * 0.16, ch * 0.045);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(cx0 + cw * 0.965, cy0 + ch * 0.60, ch * 0.075, 0, Math.PI * 2);
  ctx.fill();
  for (const t of [0.20, 0.80]) {
    const wx = cx0 + cw * t, wy = cy0 + ch * 0.94, wr = ch * 0.335;
    ctx.fillStyle = '#0c0c12';
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = ch * 0.075;
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d7dde6';
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a93a3';
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(wx + Math.cos(a) * wr * 0.20, wy + Math.sin(a) * wr * 0.20, wr * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const refl = ctx.createLinearGradient(0, cy0 + ch * 1.12, 0, cy0 + ch * 1.55);
  refl.addColorStop(0, 'rgba(255,94,122,0.22)');
  refl.addColorStop(1, 'rgba(255,94,122,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(cx0 + cw * 0.08, cy0 + ch * 1.12, cw * 0.84, ch * 0.43);
  drawPalm(ctx, x + w * 0.05, y + h * 0.80, h * 0.36, 0.18, '#16041c');
  drawPalm(ctx, x + w * 0.97, y + h * 0.80, h * 0.30, -0.2, '#16041c');
}

/** Marina at dusk: masts and hulls silhouetted on violet water under a banded sky. */
export function paintMarina(ctx, x, y, w, h) {
  paintSky(ctx, x, y, w, h * 0.58, [[0, '#1d2a6e'], [0.5, '#7c2d8e'], [0.8, '#e8503a'], [1, '#ffab4a']]);
  paintSun(ctx, x + w * 0.38, y + h * 0.50, h * 0.09);
  paintClouds(ctx, x + w * 0.04, y + h * 0.12, w * 0.9, 11, 'rgba(60,30,110,0.35)');
  const horizon = y + h * 0.58;
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, '#93355f');
  sea.addColorStop(0.3, '#3d2a6e');
  sea.addColorStop(1, '#0d1440');
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, h * 0.42);
  paintSparkle(ctx, x, horizon, w, h * 0.4, x + w * 0.38, 6);
  const ink = '#0b0620';
  for (let i = 0; i < 4; i++) {
    const bx = x + w * (0.10 + i * 0.22), bw = w * (0.13 + (i % 2) * 0.03), by = horizon + h * (0.05 + (i % 3) * 0.045);
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.6, w * 0.004);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by - h * 0.30);
    ctx.lineTo(bx + bw * 0.5, by);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.5, by - h * 0.30);
    ctx.lineTo(bx + bw * 0.5, by - h * 0.02);
    ctx.lineTo(bx + bw * 0.86, by - h * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw * 0.82, by + h * 0.035);
    ctx.lineTo(bx + bw * 0.16, by + h * 0.035);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,0.75)';
    ctx.fillRect(bx + bw * 0.42, by - h * 0.012, bw * 0.10, h * 0.010);
    ctx.fillStyle = ink;
  }
  drawPalm(ctx, x + w * 0.985, y + h * 0.60, h * 0.34, -0.24, ink);
}

/** The scene catalogue: id, display name and painter, in the order the studio offers them. */
export const SCENES = [
  { id: 'boulevard', name: 'Palm Boulevard', paint: paintBoulevard },
  { id: 'pier', name: 'Pier & Speedboat', paint: paintPier },
  { id: 'neon', name: 'Neon Downtown', paint: paintNeonStreet },
  { id: 'beach', name: 'Beach Aerial', paint: paintBeachAerial },
  { id: 'lowrider', name: 'Lowrider Dusk', paint: paintLowrider },
  { id: 'marina', name: 'Marina Dusk', paint: paintMarina },
];

/** Finds a scene painter by id, falling back to the boulevard. */
export function sceneById(id) {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

// scenes.js — the Neon Coast picture library.
//
// Every panel picture in the studio is painted here, in code, at draw time:
// layered gradients, silhouettes, glow and grain, with a seeded random source
// so a scene looks identical every time it is rendered (screenshots and
// exports must match). No photographs, no external assets — the covers the
// app makes are these paintings, graded and lettered by the other modules.
//
// Each painter receives (ctx, x, y, w, h) and paints inside that rectangle,
// clipped by the caller. Painters work in a local 1000x1000 design space via
// the `stage` helper so proportions survive any panel aspect ratio: the
// scene is centre-cropped into the panel, like a photograph would be.

/** Deterministic random source (mulberry32) so scenes never flicker. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

/** Vertical gradient helper: stops are [offset, colour] pairs. */
function sky(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  return g;
}

/** Sets up a centre-cropped 1000-unit stage inside the panel rect. The
 *  focus point (0..1 in design space) biases the crop toward the scene's
 *  subject, so a tall panel frames the car or the road, not empty sky. */
function stage(ctx, x, y, w, h, focusX = 0.5, focusY = 0.5) {
  const s = Math.max(w, h) / 1000;
  const spanX = 1000 - w / s;
  const spanY = 1000 - h / s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x - focusX * spanX * s, y - focusY * spanY * s);
  ctx.scale(s, s);
  return () => ctx.restore();
}

/** A banded poster sun: a disc sliced by sky-coloured bars, low on the sky. */
function bandedSun(ctx, cx, cy, r, top, bottom, bands = 7) {
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(24,8,44,0.55)';
  for (let i = 0; i < bands; i++) {
    const by = cy + r * 0.08 + i * r * 0.13;
    ctx.fillRect(cx - r, by, r * 2, r * (0.028 + i * 0.012));
  }
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
  glow.addColorStop(0, 'rgba(255,150,80,0.35)');
  glow.addColorStop(1, 'rgba(255,80,160,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.1, cy - r * 2.1, r * 4.2, r * 4.2);
  ctx.restore();
}

/** One palm silhouette: a curved trunk and a crown of drooping fronds. */
function palm(ctx, bx, by, height, lean, colour, rng) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  const topX = bx + lean * height;
  const topY = by - height;
  ctx.lineWidth = height * 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(bx + lean * height * 0.3, by - height * 0.6, topX, topY);
  ctx.stroke();
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI * (0.08 + (i / (fronds - 1)) * 0.95) + (rng() - 0.5) * 0.12;
    const len = height * (0.34 + rng() * 0.14);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY - Math.sin(ang) * len * 0.42 + len * 0.24;
    ctx.lineWidth = height * 0.02;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(ang) * len * 0.55, topY - Math.sin(ang) * len * 0.55, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX - height * 0.03, topY + height * 0.03, height * 0.028, 0, Math.PI * 2);
  ctx.arc(topX + height * 0.035, topY + height * 0.045, height * 0.024, 0, Math.PI * 2);
  ctx.fill();
}

/** A row of distant rooftops with a few lit windows. */
function skyline(ctx, baseY, height, colour, rng, windowColour) {
  ctx.fillStyle = colour;
  let x = -40;
  while (x < 1040) {
    const bw = 46 + rng() * 110;
    const bh = height * (0.35 + rng() * 0.65);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rng() > 0.72) ctx.fillRect(x + bw * 0.3, baseY - bh - 16, bw * 0.16, 16);
    if (windowColour) {
      ctx.fillStyle = windowColour;
      for (let wy = baseY - bh + 12; wy < baseY - 14; wy += 22) {
        for (let wx = x + 8; wx < x + bw - 10; wx += 18) {
          if (rng() > 0.62) ctx.fillRect(wx, wy, 7, 10);
        }
      }
      ctx.fillStyle = colour;
    }
    x += bw + 6 + rng() * 26;
  }
}

/** Thin horizontal cloud bands catching the light. */
function cloudBands(ctx, rng, colour, count, yMin, yMax) {
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const cy = yMin + rng() * (yMax - yMin);
    const cw = 140 + rng() * 380;
    const cx = rng() * (1000 - cw);
    const ch = 5 + rng() * 11;
    ctx.beginPath();
    ctx.ellipse(cx + cw / 2, cy, cw / 2, ch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + cw * 0.3, cy - ch * 0.7, cw * 0.22, ch * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function birds(ctx, rng, colour, count) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const bx = 90 + rng() * 820;
    const by = 70 + rng() * 260;
    const s = 9 + rng() * 13;
    ctx.beginPath();
    ctx.moveTo(bx - s, by);
    ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.7, bx + s, by);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- scenes --

/** Palm Boulevard: a road vanishing into a banded sun, palms receding. */
export function paintPalmBoulevard(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.5, 0.55);
  const rng = seededRandom(1101);
  sky(ctx, 0, 0, 1000, 1000, [
    [0, '#2a1052'], [0.3, '#7c1d6e'], [0.52, '#e83e6b'],
    [0.66, '#ff7a3c'], [0.78, '#ffb347'], [1, '#3a1440'],
  ]);
  bandedSun(ctx, 500, 655, 265, '#ffe9a3', '#ff5e62');
  cloudBands(ctx, rng, 'rgba(255,170,150,0.35)', 7, 60, 420);
  skyline(ctx, 668, 190, '#33124d', rng, 'rgba(255,205,120,0.8)');
  // Ground and the boulevard itself.
  ctx.fillStyle = '#200b33';
  ctx.fillRect(0, 668, 1000, 332);
  const road = ctx.createLinearGradient(0, 668, 0, 1000);
  road.addColorStop(0, '#4a2358');
  road.addColorStop(1, '#12061f');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(408, 668); ctx.lineTo(592, 668); ctx.lineTo(920, 1000); ctx.lineTo(80, 1000);
  ctx.closePath(); ctx.fill();
  // Sun path glittering down the asphalt.
  const glit = ctx.createLinearGradient(0, 668, 0, 1000);
  glit.addColorStop(0, 'rgba(255,190,90,0.75)');
  glit.addColorStop(1, 'rgba(255,90,140,0.05)');
  ctx.fillStyle = glit;
  ctx.beginPath();
  ctx.moveTo(478, 668); ctx.lineTo(522, 668); ctx.lineTo(610, 1000); ctx.lineTo(390, 1000);
  ctx.closePath(); ctx.fill();
  // Lane dashes in perspective.
  ctx.fillStyle = 'rgba(255,240,200,0.9)';
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const dy = 690 + Math.pow(t, 1.7) * 300;
    const dw = lerp(3, 26, t);
    const dh = lerp(4, 34, t);
    ctx.fillRect(500 - dw / 2, dy, dw, dh);
  }
  // Sidewalks and neon curb glow.
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath(); ctx.moveTo(398, 668); ctx.lineTo(408, 668); ctx.lineTo(80, 1000); ctx.lineTo(38, 1000); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#19d3e6';
  ctx.beginPath(); ctx.moveTo(592, 668); ctx.lineTo(602, 668); ctx.lineTo(962, 1000); ctx.lineTo(920, 1000); ctx.closePath(); ctx.fill();
  // Receding palms, large in front, small at the vanishing point.
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const px = 500 + side * lerp(430, 118, Math.pow(t, 0.8));
      const py = lerp(1010, 690, Math.pow(t, 1.25));
      const ph = lerp(430, 62, Math.pow(t, 1.1));
      palm(ctx, px, py, ph, -side * 0.16, '#160826', rng);
    }
  }
  birds(ctx, rng, 'rgba(30,8,40,0.8)', 5);
  done();
}

/** The Pier: boards over turquoise water, a speedboat planing past. */
export function paintPierSpeedboat(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.45, 0.55);
  const rng = seededRandom(2202);
  sky(ctx, 0, 0, 1000, 1000, [
    [0, '#3b2a6e'], [0.34, '#b0307c'], [0.5, '#ff6b4a'],
    [0.62, '#ffc46b'], [0.72, '#7fd8c9'], [1, '#0e7d8c'],
  ]);
  bandedSun(ctx, 690, 585, 170, '#fff3b0', '#ff7a59', 5);
  cloudBands(ctx, rng, 'rgba(255,190,170,0.4)', 6, 50, 380);
  // Sea with light streaks.
  const sea = ctx.createLinearGradient(0, 600, 0, 1000);
  sea.addColorStop(0, '#39b8a6');
  sea.addColorStop(1, '#075a70');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 600, 1000, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  for (let i = 0; i < 46; i++) {
    const sy = 620 + rng() * 360;
    const sw = 26 + rng() * 130 * (sy / 1000);
    ctx.fillRect(rng() * 1000, sy, sw, 3 + rng() * 4);
  }
  // Sun glitter path.
  const glit = ctx.createLinearGradient(0, 600, 0, 1000);
  glit.addColorStop(0, 'rgba(255,205,110,0.8)');
  glit.addColorStop(1, 'rgba(255,205,110,0)');
  ctx.fillStyle = glit;
  ctx.beginPath();
  ctx.moveTo(640, 600); ctx.lineTo(740, 600); ctx.lineTo(830, 1000); ctx.lineTo(520, 1000);
  ctx.closePath(); ctx.fill();
  // Speedboat, planing right with a foam wake.
  ctx.save();
  ctx.translate(120, 690);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(-30, 118); ctx.lineTo(210, 92); ctx.lineTo(420, 108); ctx.lineTo(150, 128); ctx.lineTo(10, 132);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0b2239';
  ctx.beginPath();
  ctx.moveTo(30, 96); ctx.lineTo(560, 78); ctx.lineTo(668, 96); ctx.lineTo(596, 128); ctx.lineTo(96, 122);
  ctx.closePath(); ctx.fill();
  const hull = ctx.createLinearGradient(0, 60, 0, 130);
  hull.addColorStop(0, '#ff3860'); hull.addColorStop(1, '#a30f45');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(60, 62); ctx.lineTo(590, 44); ctx.lineTo(700, 66); ctx.lineTo(640, 100); ctx.lineTo(120, 100);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dff7ff';
  ctx.beginPath(); // windshield
  ctx.moveTo(330, 44); ctx.lineTo(430, 40); ctx.lineTo(478, 62); ctx.lineTo(352, 64);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd23c';
  ctx.fillRect(96, 78, 470, 9);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; // spray
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.arc(640 + rng() * 90, 96 + rng() * 30, 3 + rng() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // The pier: diagonal boards in the foreground with posts and lamps.
  ctx.fillStyle = '#4a2c17';
  ctx.beginPath();
  ctx.moveTo(0, 1000); ctx.lineTo(0, 760); ctx.lineTo(430, 640); ctx.lineTo(760, 1000);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,4,0.65)';
  ctx.lineWidth = 5;
  for (let i = 0; i < 9; i++) {
    const t = i / 9;
    ctx.beginPath();
    ctx.moveTo(lerp(0, 430, t) - 60, lerp(770, 640, t) + 40);
    ctx.lineTo(lerp(120, 720, t), lerp(1000, 1000, t));
    ctx.stroke();
  }
  ctx.fillStyle = '#2c1a0c';
  for (const [px, py, ps] of [[70, 800, 1], [210, 730, 0.8], [350, 680, 0.62]]) {
    ctx.fillRect(px - 10 * ps, py, 20 * ps, 220 * ps);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lamp = ctx.createRadialGradient(px, py - 14 * ps, 2, px, py - 14 * ps, 90 * ps);
    lamp.addColorStop(0, 'rgba(255,214,120,0.95)');
    lamp.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(px - 90 * ps, py - 104 * ps, 180 * ps, 180 * ps);
    ctx.restore();
    ctx.fillStyle = '#ffe6a3';
    ctx.beginPath(); ctx.arc(px, py - 14 * ps, 11 * ps, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c1a0c';
  }
  palm(ctx, 940, 640, 210, -0.2, '#123043', rng);
  birds(ctx, rng, 'rgba(20,20,50,0.75)', 4);
  done();
}

/** Neon Downtown: lit towers, vertical signs, a rain-wet street. */
export function paintNeonDowntown(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.5, 0.48);
  const rng = seededRandom(3303);
  sky(ctx, 0, 0, 1000, 1000, [
    [0, '#070418'], [0.45, '#1b0f3d'], [0.72, '#3d1154'], [1, '#120826'],
  ]);
  // Moon and haze.
  ctx.fillStyle = '#f4f0ff';
  ctx.beginPath(); ctx.arc(845, 130, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(160,120,255,0.16)';
  ctx.beginPath(); ctx.arc(845, 130, 120, 0, Math.PI * 2); ctx.fill();
  const towers = [
    [0, 300, 150, 470], [140, 210, 120, 560], [252, 330, 105, 440], [350, 150, 135, 620],
    [478, 280, 110, 490], [580, 190, 125, 580], [698, 320, 105, 450], [796, 240, 120, 530],
    [908, 330, 92, 440],
  ];
  const faceTints = ['#241243', '#2c1450', '#1d0e3c', '#311757', '#22103f'];
  towers.forEach(([tx, ty, tw, th], i) => {
    ctx.fillStyle = faceTints[i % faceTints.length];
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(tx, ty, 7, th);
    // Lit windows in warm and cool mixes.
    for (let wy = ty + 18; wy < ty + th - 16; wy += 30) {
      for (let wx = tx + 13; wx < tx + tw - 14; wx += 24) {
        if (rng() > 0.52) {
          ctx.fillStyle = rng() > 0.4 ? 'rgba(255,205,110,0.95)' : 'rgba(140,240,255,0.9)';
          ctx.fillRect(wx, wy, 11, 15);
        }
      }
    }
  });
  // Vertical neon signs with glow.
  const signs = [
    { x: 168, y: 250, w: 44, h: 300, c: '#ff2e88', label: 'VICE' },
    { x: 610, y: 240, w: 44, h: 330, c: '#19e3ff', label: 'HOTEL' },
    { x: 822, y: 290, w: 40, h: 250, c: '#ffb300', label: 'BAR' },
    { x: 372, y: 210, w: 40, h: 260, c: '#7cff4f', label: '24H' },
  ];
  ctx.textAlign = 'center';
  for (const s of signs) {
    ctx.save();
    ctx.shadowColor = s.c;
    ctx.shadowBlur = 34;
    ctx.fillStyle = 'rgba(10,4,24,0.92)';
    ctx.strokeStyle = s.c;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(s.x, s.y, s.w, s.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 16;
    ctx.fillStyle = s.c;
    ctx.font = `700 ${s.w * 0.52}px "Arial Narrow", sans-serif`;
    [...s.label].forEach((ch, i) => {
      ctx.fillText(ch, s.x + s.w / 2, s.y + 40 + i * (s.w * 0.62));
    });
    ctx.restore();
  }
  // Street level: awnings, storefront glow, wet asphalt.
  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 770, 1000, 230);
  const wet = ctx.createLinearGradient(0, 770, 0, 1000);
  wet.addColorStop(0, 'rgba(70,30,110,0.55)');
  wet.addColorStop(1, 'rgba(6,3,16,0.9)');
  ctx.fillStyle = wet;
  ctx.fillRect(0, 770, 1000, 230);
  // Reflections: smeared neon columns shimmering on the wet street.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of signs) {
    const rg = ctx.createLinearGradient(0, 780, 0, 990);
    rg.addColorStop(0, s.c + 'aa');
    rg.addColorStop(1, s.c + '00');
    ctx.fillStyle = rg;
    for (let i = 0; i < 5; i++) {
      const rx = s.x + 4 + rng() * (s.w - 8);
      ctx.fillRect(rx, 786 + rng() * 20, 5 + rng() * 7, 120 + rng() * 80);
    }
  }
  for (let i = 0; i < 30; i++) { // warm window reflections
    ctx.fillStyle = `rgba(255,190,90,${0.1 + rng() * 0.22})`;
    ctx.fillRect(rng() * 1000, 790 + rng() * 180, 8 + rng() * 30, 4 + rng() * 6);
  }
  ctx.restore();
  // Storefront band and headlight sweep.
  const shop = ctx.createLinearGradient(0, 700, 0, 772);
  shop.addColorStop(0, 'rgba(255,120,190,0)');
  shop.addColorStop(1, 'rgba(255,120,190,0.35)');
  ctx.fillStyle = shop;
  ctx.fillRect(0, 700, 1000, 72);
  ctx.fillStyle = '#ffd9ec';
  for (let i = 0; i < 12; i++) ctx.fillRect(30 + i * 82, 716, 52, 40);
  ctx.fillStyle = 'rgba(10,4,20,0.85)';
  for (let i = 0; i < 12; i++) ctx.fillRect(30 + i * 82, 748, 52, 8);
  done();
}

/** Beach Aerial: a diagonal shoreline from above, foam and umbrellas. */
export function paintBeachAerial(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.55, 0.5);
  const rng = seededRandom(4404);
  // Sea base.
  const sea = ctx.createLinearGradient(0, 0, 1000, 1000);
  sea.addColorStop(0, '#0b6e8c');
  sea.addColorStop(0.55, '#12a5b4');
  sea.addColorStop(1, '#5fe0cd');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, 1000, 1000);
  // Light caustic streaks in the shallows.
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = 2 + rng() * 4;
    const sx = rng() * 700;
    const sy = rng() * 1000;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 30 + rng() * 70, sy + 12 + rng() * 26);
    ctx.stroke();
  }
  // Sand: a big diagonal sweep from the lower right.
  const sand = ctx.createLinearGradient(300, 1000, 1000, 200);
  sand.addColorStop(0, '#e8b06a');
  sand.addColorStop(1, '#ffe3ae');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(240, 1000);
  ctx.bezierCurveTo(430, 720, 620, 520, 1000, 330);
  ctx.lineTo(1000, 1000);
  ctx.closePath(); ctx.fill();
  // Wet sand sheen along the waterline.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(268, 1000);
  ctx.bezierCurveTo(452, 726, 636, 528, 1000, 352);
  ctx.stroke();
  // Foam: scalloped white bands following the shore.
  for (let band = 0; band < 3; band++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.85 - band * 0.22})`;
    ctx.lineWidth = 13 - band * 3;
    ctx.beginPath();
    const off = band * 34;
    ctx.moveTo(210 - off, 1000);
    ctx.bezierCurveTo(400 - off, 712, 590 - off, 512, 990, 318 - off * 0.6);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.7 - band * 0.2})`;
    for (let i = 0; i < 16; i++) {
      const t = rng();
      const fx = lerp(230 - off, 980, t) + (rng() - 0.5) * 30;
      const fy = lerp(990, 330 - off * 0.6, Math.pow(t, 1.25)) + (rng() - 0.5) * 24;
      ctx.beginPath(); ctx.arc(fx, fy, 5 + rng() * 12, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Sand speckle and beach furniture on the dry side of the shore.
  ctx.fillStyle = 'rgba(160,100,40,0.25)';
  for (let i = 0; i < 260; i++) {
    const sx = 330 + rng() * 660;
    const sy = lerp(990, 360, Math.pow(rng(), 1.4)) + (rng() - 0.5) * 60;
    if (sx - sy * 0.62 > 60) ctx.fillRect(sx, sy, 3, 3);
  }
  const umbrellaCols = ['#ff3860', '#ffb300', '#19b3e6', '#ff7a3c', '#7c4dff', '#00c853'];
  for (let i = 0; i < 9; i++) {
    const ux = 520 + rng() * 430;
    const uy = 470 + rng() * 470;
    if (ux - uy * 0.62 < 130) continue;
    ctx.fillStyle = 'rgba(120,70,20,0.35)'; // shadow
    ctx.beginPath(); ctx.ellipse(ux + 16, uy + 14, 40, 15, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = umbrellaCols[i % umbrellaCols.length];
    ctx.beginPath(); ctx.arc(ux, uy, 34 + rng() * 10, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(ux, uy, 34 + rng() * 10, Math.PI * 1.25, Math.PI * 1.5); ctx.fill();
    ctx.strokeStyle = '#7a4a1c';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux + 5, uy + 22); ctx.stroke();
    ctx.fillStyle = umbrellaCols[(i + 2) % umbrellaCols.length]; // towel
    ctx.save();
    ctx.translate(ux - 52, uy + 34);
    ctx.rotate(0.4 + rng() * 0.5);
    ctx.fillRect(-24, -8, 48, 16);
    ctx.restore();
  }
  // A lone boat and its wake, top left.
  ctx.save();
  ctx.translate(210, 190);
  ctx.rotate(-0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.moveTo(-90, 26); ctx.lineTo(70, 0); ctx.lineTo(-90, -26); ctx.lineTo(-58, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 0, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff3860';
  ctx.beginPath(); ctx.ellipse(4, 0, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  done();
}

/** Lowrider at Dusk: a profile cruiser, whitewalls and chrome. */
export function paintLowriderDusk(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.5, 0.62);
  const rng = seededRandom(5505);
  sky(ctx, 0, 0, 1000, 1000, [
    [0, '#1d0b38'], [0.36, '#6d1a5e'], [0.55, '#e83e6b'],
    [0.68, '#ff8a3c'], [0.78, '#ffc46b'], [1, '#241031'],
  ]);
  bandedSun(ctx, 300, 700, 215, '#ffedb0', '#ff5e62', 6);
  cloudBands(ctx, rng, 'rgba(255,180,150,0.32)', 6, 60, 400);
  skyline(ctx, 712, 230, '#2a0f42', rng, 'rgba(255,205,120,0.75)');
  palm(ctx, 872, 716, 300, -0.14, '#170826', rng);
  palm(ctx, 70, 720, 240, 0.18, '#170826', rng);
  // Asphalt with a sunset sheen.
  const roadG = ctx.createLinearGradient(0, 712, 0, 1000);
  roadG.addColorStop(0, '#3d174f');
  roadG.addColorStop(0.25, '#2a0f38');
  roadG.addColorStop(1, '#0d0518');
  ctx.fillStyle = roadG;
  ctx.fillRect(0, 712, 1000, 288);
  ctx.fillStyle = 'rgba(255,150,80,0.30)';
  ctx.fillRect(0, 712, 1000, 7);
  ctx.strokeStyle = 'rgba(255,210,130,0.5)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const ry = 760 + i * 30 + rng() * 10;
    ctx.beginPath(); ctx.moveTo(rng() * 500, ry); ctx.lineTo(500 + rng() * 500, ry); ctx.stroke();
  }
  // The car, in profile, sitting low.
  ctx.save();
  ctx.translate(88, 596);
  // Ground shadow and underglow.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.ellipse(410, 252, 400, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const under = ctx.createRadialGradient(410, 246, 30, 410, 246, 380);
  under.addColorStop(0, 'rgba(255,46,136,0.5)');
  under.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = under;
  ctx.fillRect(10, 130, 800, 180);
  ctx.restore();
  // Cabin and roof.
  const body = ctx.createLinearGradient(0, 40, 0, 220);
  body.addColorStop(0, '#ff7ab0');
  body.addColorStop(0.35, '#e83e6b');
  body.addColorStop(0.75, '#9c1450');
  body.addColorStop(1, '#5e0a30');
  ctx.fillStyle = body;
  ctx.beginPath(); // main body shell
  ctx.moveTo(28, 168);
  ctx.bezierCurveTo(30, 128, 90, 112, 190, 104);
  ctx.lineTo(268, 100);
  ctx.bezierCurveTo(310, 52, 380, 30, 470, 32);
  ctx.bezierCurveTo(560, 34, 622, 62, 668, 102);
  ctx.bezierCurveTo(748, 110, 806, 128, 812, 164);
  ctx.bezierCurveTo(814, 196, 790, 214, 736, 218);
  ctx.lineTo(96, 222);
  ctx.bezierCurveTo(48, 220, 26, 202, 28, 168);
  ctx.closePath(); ctx.fill();
  // Glasshouse.
  ctx.fillStyle = '#1b2f4a';
  ctx.beginPath();
  ctx.moveTo(292, 96);
  ctx.bezierCurveTo(330, 52, 386, 40, 452, 42);
  ctx.lineTo(452, 96);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(468, 42);
  ctx.bezierCurveTo(548, 44, 606, 66, 646, 100);
  ctx.lineTo(468, 98);
  ctx.closePath(); ctx.fill();
  const glass = ctx.createLinearGradient(290, 40, 640, 100);
  glass.addColorStop(0, 'rgba(160,230,255,0.55)');
  glass.addColorStop(0.5, 'rgba(255,170,210,0.30)');
  glass.addColorStop(1, 'rgba(160,230,255,0.12)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(292, 96);
  ctx.bezierCurveTo(330, 52, 386, 40, 452, 42);
  ctx.lineTo(452, 96);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(468, 42);
  ctx.bezierCurveTo(548, 44, 606, 66, 646, 100);
  ctx.lineTo(468, 98);
  ctx.closePath(); ctx.fill();
  // Chrome: side spear, window trim, bumpers.
  ctx.strokeStyle = '#f4f8ff';
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(60, 150); ctx.lineTo(780, 138); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(286, 98); ctx.lineTo(656, 102); ctx.stroke();
  ctx.fillStyle = '#e8eefc';
  ctx.beginPath(); ctx.roundRect(6, 176, 62, 20, 9); ctx.fill();
  ctx.beginPath(); ctx.roundRect(758, 172, 66, 20, 9); ctx.fill();
  // Door cut and handle.
  ctx.strokeStyle = 'rgba(60,4,30,0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(452, 104); ctx.lineTo(452, 214); ctx.stroke();
  ctx.fillStyle = '#ffe9a3';
  ctx.beginPath(); ctx.roundRect(478, 122, 42, 9, 4); ctx.fill();
  // Headlight glow.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createRadialGradient(806, 156, 4, 806, 156, 120);
  beam.addColorStop(0, 'rgba(255,240,190,0.95)');
  beam.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = beam;
  ctx.fillRect(686, 36, 240, 240);
  ctx.restore();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.ellipse(798, 156, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
  // Wheel arches cut out, then whitewall wheels.
  for (const wx of [168, 652]) {
    ctx.fillStyle = '#0d0518';
    ctx.beginPath(); ctx.arc(wx, 218, 66, Math.PI, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(wx, 224, 58, 0, Math.PI * 2); ctx.fillStyle = '#0a0a0f'; ctx.fill();
    ctx.beginPath(); ctx.arc(wx, 224, 57, 0, Math.PI * 2); ctx.fillStyle = '#f6f2e8'; ctx.fill();
    ctx.beginPath(); ctx.arc(wx, 224, 44, 0, Math.PI * 2); ctx.fillStyle = '#101018'; ctx.fill();
    const chrome = ctx.createRadialGradient(wx - 10, 214, 4, wx, 224, 34);
    chrome.addColorStop(0, '#ffffff');
    chrome.addColorStop(0.6, '#b9c6de');
    chrome.addColorStop(1, '#5c6a86');
    ctx.beginPath(); ctx.arc(wx, 224, 33, 0, Math.PI * 2); ctx.fillStyle = chrome; ctx.fill();
    ctx.strokeStyle = '#39445e';
    ctx.lineWidth = 4;
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, 224);
      ctx.lineTo(wx + Math.cos(a) * 30, 224 + Math.sin(a) * 30);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(wx, 224, 9, 0, Math.PI * 2); ctx.fillStyle = '#ff3860'; ctx.fill();
  }
  // Sparkles on the chrome.
  ctx.fillStyle = '#ffffff';
  for (const [sx, sy] of [[120, 148], [560, 128], [700, 190]]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - 13); ctx.lineTo(sx + 3.4, sy - 3.4); ctx.lineTo(sx + 13, sy);
    ctx.lineTo(sx + 3.4, sy + 3.4); ctx.lineTo(sx, sy + 13); ctx.lineTo(sx - 3.4, sy + 3.4);
    ctx.lineTo(sx - 13, sy); ctx.lineTo(sx - 3.4, sy - 3.4);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  done();
}

/** Rooftop Palms: a hotel roof deck framing the sunset skyline. */
export function paintRooftopPalms(ctx, x, y, w, h) {
  const done = stage(ctx, x, y, w, h, 0.5, 0.55);
  const rng = seededRandom(6606);
  sky(ctx, 0, 0, 1000, 1000, [
    [0, '#241056'], [0.34, '#8c2064'], [0.55, '#ff5e62'],
    [0.7, '#ffa53c'], [1, '#2a0f38'],
  ]);
  bandedSun(ctx, 470, 640, 235, '#fff0ae', '#ff5e62');
  cloudBands(ctx, rng, 'rgba(255,180,160,0.35)', 6, 60, 380);
  skyline(ctx, 656, 300, '#31124d', rng, 'rgba(255,214,130,0.85)');
  // Rooftop deck: parapet, pool strip and deck boards.
  ctx.fillStyle = '#1c0b30';
  ctx.fillRect(0, 656, 1000, 344);
  const pool = ctx.createLinearGradient(0, 700, 0, 830);
  pool.addColorStop(0, '#19d3e6');
  pool.addColorStop(1, '#0a6d9e');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.moveTo(120, 1000); ctx.lineTo(330, 712); ctx.lineTo(760, 712); ctx.lineTo(920, 1000);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    ctx.beginPath();
    ctx.moveTo(lerp(210, 130, t), lerp(712, 1000, t));
    ctx.lineTo(lerp(680, 910, t), lerp(712, 1000, t));
    ctx.stroke();
  }
  ctx.fillStyle = '#0f0620';
  ctx.fillRect(0, 640, 1000, 20);
  // String lights across the parapet.
  ctx.strokeStyle = 'rgba(20,8,30,0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 600); ctx.quadraticCurveTo(500, 690, 1000, 596); ctx.stroke();
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const lx = lerp(10, 990, t);
    const ly = lerp(602, 598, t) + Math.sin(t * Math.PI) * 44;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(lx, ly + 10, 1, lx, ly + 10, 26);
    glow.addColorStop(0, 'rgba(255,205,110,0.9)');
    glow.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lx - 26, ly - 16, 52, 52);
    ctx.restore();
    ctx.fillStyle = '#ffd76b';
    ctx.beginPath(); ctx.arc(lx, ly + 10, 5.5, 0, Math.PI * 2); ctx.fill();
  }
  // Framing palms, huge in the foreground corners.
  palm(ctx, 36, 1030, 620, 0.24, '#0d0418', rng);
  palm(ctx, 968, 1030, 660, -0.22, '#0d0418', rng);
  birds(ctx, rng, 'rgba(25,6,38,0.8)', 5);
  done();
}

/** The scene catalogue: id, display name and painter, in picker order. */
export const SCENES = [
  { id: 'boulevard', name: 'Palm Boulevard', paint: paintPalmBoulevard },
  { id: 'neon', name: 'Neon Downtown', paint: paintNeonDowntown },
  { id: 'lowrider', name: 'Lowrider Dusk', paint: paintLowriderDusk },
  { id: 'pier', name: 'Pier & Speedboat', paint: paintPierSpeedboat },
  { id: 'beach', name: 'Beach Aerial', paint: paintBeachAerial },
  { id: 'rooftop', name: 'Rooftop Palms', paint: paintRooftopPalms },
];

export function sceneById(id) {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

// shots.js — fixed scenes for the entry's screenshots.
//
// ?shot=cover renders one finished cover edge to edge at the window size;
// the query picks the layout, grade and lettering so each screenshot shows
// a different, complete cover. ?shot=editor shows the studio itself with a
// photo loaded: to prove the photo path without shipping a photograph, the
// shot paints a scene to an offscreen canvas, turns it into an image and
// loads it into the hero panel exactly as a reader's file would be.
// window.__shotReady is set once the scene has painted.

import { paintLowriderDusk } from './scenes.js';

function applyQuery(query, studio) {
  const { state } = studio;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('kicker')) state.kicker = query.get('kicker');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('heat')) state.heat = Number(query.get('heat'));
  studio.syncAssignments(false);
  studio.syncControls();
}

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/**
 * Sizes the cover canvas to the settled viewport. A freshly opened page can
 * report a provisional height for its first frames, so poll until the size
 * is stable across two reads before painting the shot.
 */
async function settledViewportSize() {
  let last = [0, 0];
  for (let i = 0; i < 40; i++) {
    const now = [document.documentElement.clientWidth, document.documentElement.clientHeight];
    if (now[0] === last[0] && now[1] === last[1] && now[0] > 0) return now;
    last = now;
    await new Promise((r) => setTimeout(r, 60));
  }
  return last;
}

export async function runShot(shot, query, studio) {
  applyQuery(query, studio);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const coverCanvas = document.getElementById('cover');
    const [vw, vh] = await settledViewportSize();
    coverCanvas.width = vw;
    coverCanvas.height = vh;
    // renderCover is reached through redraw, but the shot canvas is sized to
    // the window rather than the preview fit, so render directly here.
    const { renderCover } = await import('./cover.js');
    renderCover(coverCanvas, studio.state);
    ready();
    return;
  }
  if (shot === 'editor') {
    // A "reader photo" made on the spot: paint, rasterise, load as a photo.
    const off = document.createElement('canvas');
    off.width = 880; off.height = 660;
    paintLowriderDusk(off.getContext('2d'), 0, 0, 880, 660);
    const img = await studio.loadImage(off.toDataURL('image/png'));
    const hero = studio.state.assignments[0];
    hero.photo = img;
    hero.photoName = 'sunset-drive.png';
    hero.zoom = 1.12;
    studio.state.selectedPanel = 0;
    studio.setStatus('Photo loaded: “sunset-drive.png” is in panel 1 — drag on the cover to reposition it, zoom to crop.');
    studio.redraw();
    ready();
    return;
  }
  ready();
}

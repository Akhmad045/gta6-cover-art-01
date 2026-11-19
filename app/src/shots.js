// Fixed scenes for screenshots: ?shot=cover shows the finished cover alone at the viewport
// size; ?shot=editor shows the studio with a cover composed. Query params pick the layout,
// grade, scene and words so every screenshot in shots.json is reproducible from the URL alone.

/** Applies the shot query to the studio state through the setters main.js hands in. */
export async function runShot(shot, query, apply) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply({
    layout: query.get('layout'),
    grade: query.get('grade'),
    photo: query.get('photo'),
    title: query.get('caption'),
    subtitle: query.get('subtitle'),
    ribbon: query.get('ribbon'),
    size: query.get('size'),
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

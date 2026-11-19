// Multi-panel layouts in the GTA cover tradition: a big hero scene broken by a grid of smaller
// moments, every panel separated by a white keyline. Each layout returns panel rectangles as
// fractions of the cover, so the same composition adapts to square, portrait and landscape.

/** Hero top with a three-panel strip beneath: the iconic cover composition. */
function heroPanels(portrait) {
  const heroH = portrait ? 0.52 : 0.60;
  return [
    { x: 0, y: 0, w: 1, h: heroH, hero: true },
    { x: 0, y: heroH, w: 1 / 3, h: 1 - heroH },
    { x: 1 / 3, y: heroH, w: 1 / 3, h: 1 - heroH },
    { x: 2 / 3, y: heroH, w: 1 / 3, h: 1 - heroH },
  ];
}

/** Six equal panels, arranged for the cover's orientation. */
function gridSixPanels(portrait) {
  const cols = portrait ? 2 : 3;
  const rows = portrait ? 3 : 2;
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    out.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
  }
  return out;
}

/** Nine-panel mosaic with a raised centre panel the title block leans on. */
function mosaicNinePanels() {
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    out.push({ x: c / 3, y: r / 3, w: 1 / 3, h: 1 / 3, hero: r === 1 && c === 1 });
  }
  return out;
}

/** One full-bleed scene with three snapshot strips stacked along the side (or foot). */
function bleedStripPanels(portrait) {
  if (portrait) {
    return [
      { x: 0, y: 0, w: 1, h: 0.70, hero: true },
      { x: 0, y: 0.70, w: 1 / 3, h: 0.30 },
      { x: 1 / 3, y: 0.70, w: 1 / 3, h: 0.30 },
      { x: 2 / 3, y: 0.70, w: 1 / 3, h: 0.30 },
    ];
  }
  return [
    { x: 0, y: 0, w: 0.72, h: 1, hero: true },
    { x: 0.72, y: 0, w: 0.28, h: 1 / 3 },
    { x: 0.72, y: 1 / 3, w: 0.28, h: 1 / 3 },
    { x: 0.72, y: 2 / 3, w: 0.28, h: 1 / 3 },
  ];
}

/** The four layouts the studio offers, in display order. */
export const LAYOUTS = [
  { id: 'hero', name: 'Hero + Strip', panels: heroPanels },
  { id: 'grid6', name: 'Six Panel Grid', panels: gridSixPanels },
  { id: 'mosaic9', name: 'Nine Panel Mosaic', panels: mosaicNinePanels },
  { id: 'bleed', name: 'Full Bleed + Strips', panels: bleedStripPanels },
];

/** Finds a layout by id, falling back to the hero composition. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** Panel rectangles in pixels for a layout on a w x h cover. */
export function panelRects(layout, w, h) {
  return layout.panels(h > w).map((p) => ({
    x: Math.round(p.x * w), y: Math.round(p.y * h),
    w: Math.round(p.w * w), h: Math.round(p.h * h), hero: !!p.hero,
  }));
}

/** Export sizes the studio offers: the common post sizes plus story portrait. */
export const EXPORT_SIZES = [
  { id: '1080x1080', name: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', name: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', name: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: '1080x1920', name: 'Story 1080 × 1920', w: 1080, h: 1920 },
];

// Cover layouts. A layout divides the poster area (the part of the canvas above the
// title block) into panel rectangles given as fractions of that area, so the same
// arrangement works at every export size. `tilt` is a rotation in degrees used by
// the snapshot layout; every other panel is upright. The title block always sits
// under the panels, like the foot of a game cover.

export const TITLE_BLOCK_RATIO = 0.235;

function rect(x, y, w, h, tilt = 0) {
  return { x, y, w, h, tilt };
}

function grid(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(rect(c / cols, r / rows, 1 / cols, 1 / rows));
    }
  }
  return cells;
}

export const LAYOUTS = {
  grid6: {
    label: 'Poster grid — 6 panels',
    panels: () => grid(3, 2),
  },
  hero: {
    label: 'Hero & side stories — 4 panels',
    panels: () => [
      rect(0, 0, 0.6, 1),
      rect(0.6, 0, 0.4, 0.34),
      rect(0.6, 0.34, 0.4, 0.33),
      rect(0.6, 0.67, 0.4, 0.33),
    ],
  },
  mosaic9: {
    label: 'Mosaic — 9 panels',
    panels: () => grid(3, 3),
  },
  snapshots: {
    label: 'Tilted snapshots — 3 panels',
    panels: () => [
      rect(0.03, 0.08, 0.56, 0.84, -4),
      rect(0.47, 0.03, 0.5, 0.6, 3.5),
      rect(0.5, 0.5, 0.46, 0.46, -2),
    ],
  },
  fullbleed: {
    label: 'Full bleed — 1 panel',
    panels: () => [rect(0, 0, 1, 1)],
  },
};

export function panelCount(layoutId) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.grid6).panels().length;
}

export function layoutPanels(layoutId) {
  return (LAYOUTS[layoutId] ?? LAYOUTS.grid6).panels();
}

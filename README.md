# Viceframe — Neon Coast Cover Maker

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Akhmad045/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Akhmad045/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into GTA 6-style
cover art: the multi-panel poster look, bold caption lettering and a Vice City
sunset / neon colour grade, exported as a PNG to share. Built for the make.fun
bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01?ref=4g7knchf).

## What it does

- **The art** — five original layouts (6-panel poster grid, hero & side stories,
  9-panel mosaic, tilted snapshots, full bleed) over a paper backing with white
  gutters, a warm light leak, and a sunset title block with halftone dots,
  gradient display lettering, a neon script subtitle, heat stars and a ribbon
  badge. Film grain and vignette finish the print look.
- **Any photo** — load photos from your own machine by file picker or drag and
  drop; they are read locally and never uploaded (the app makes no network
  request at all). Fill several panels with one photo or a different photo per
  panel, and crop each panel your way: click a panel, drag on the cover to pan,
  scroll to zoom, or use the sliders.
- **Fast and easy** — four steps down one panel: photos → layout → words and
  grade → export. One click exports a finished PNG at **1080×1080**,
  **1080×1350**, **1920×1080** or **1080×1920**, rendered by the same drawing
  code as the live preview.
- **Grades** — five hand-built gradient-map colour grades (Vice sunset, Neon
  night, Teal heat, Golden hour, Ink poster) applied per pixel on a canvas, so
  any photo takes on the neon-coast mood while keeping its detail.
- **Original** — every layout, colour ramp, lettering treatment and sample
  image is this project's own work. No Rockstar Games logo, wordmark, official
  artwork, characters or game fonts are used anywhere; lettering is drawn on
  canvas with system font stacks.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

Then open the page, add a photo, pick a layout, type your caption and export.
Node 22.18 or later; no build step and nothing to install.

## Hand in (program)

`main.ts` copies `app/` and `screenshots/` to the output folder and writes
`dossier.json` with the vendored `vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of this repository

- `app/index.html`, `app/style.css` — the page and its styling
- `app/src/editor.js` — editor wiring: photo loading, panel selection, gestures, export
- `app/src/render.js` — the cover drawing engine (panels, lettering, effects)
- `app/src/grades.js` — the gradient-map colour grades
- `app/src/layouts.js` — the five panel layouts
- `app/src/shots.js` — deterministic `?shot=` scenes used for the screenshots
- `app/samples/` — sample photos bundled with the app
- `screenshots/` — the app with photos loaded, and covers it exported
- `shots.json` — the screenshot scenes, in order

## License

MIT — see `LICENSE`.

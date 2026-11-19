# Neon Coast Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Akhmad045/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Akhmad045/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn a photo and a caption into GTA 6-style cover art: a multi-panel Vice City poster with
sunset and neon colour grades, bold poster lettering and a PNG export in the common post
sizes. It runs entirely in the browser from static files — your photos never leave your
machine and the app makes no network requests.

The studio opens on a finished cover, not an empty editor. Six sample scenes are painted
live on canvas (a palm boulevard at sunset, a pier with a speedboat, a neon downtown
street, a beach aerial, a lowrider at dusk and a marina), so the first thing you see is
the artwork itself; swap in your own photos panel by panel whenever you like.

## Features

- **Four multi-panel layouts** — Hero + Strip, Six Panel Grid, Nine Panel Mosaic and
  Full Bleed + Strips, all separated by white keylines like a real game cover.
- **Five colour grades** — Vice Sunset, Neon Night, Teal Heat, Golden Hour and Ink
  Poster: multi-stop gradient maps with halftone texture, film grain and a vignette.
- **Your photos, your crop** — click any panel, drop a photo onto it, then pan and zoom
  to frame it. One photo can fill every panel, or each panel can hold its own.
- **Poster lettering on canvas** — a big condensed title with a sunset gradient fill,
  dark outline and glow, a script subtitle, a ribbon banner and a five-star heat meter.
  System fonts only; every scene, letter and effect is original work drawn in code.
- **PNG export** at 1080 × 1080, 1080 × 1350, 1920 × 1080 and 1080 × 1920.

## Run it

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

No build step and no dependencies: `app/` is plain static files and works offline in any
desktop browser.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes the
`dossier.json` summary with the vendored make.fun library in `vendor/`.

## License

MIT — see `LICENSE`.

---

Built for the [make.fun GTA 6 cover art bounty](https://make.fun/bounty/gta6-cover-art-01).
Referral code: 4g7knchf

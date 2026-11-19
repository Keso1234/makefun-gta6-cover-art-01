[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Keso1234/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Keso1234/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
# Neon Coast — GTA 6-style Cover Studio

[![Make GTA 6 Cover Art](https://img.shields.io/badge/make.fun-bounty-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffd166)](./LICENSE)
[![Offline](https://img.shields.io/badge/offline-no%20network-00e5ff)](./app/index.html)

Neon Coast turns any photo and caption into GTA 6-style multi-panel cover art — hero-and-three, four-panel, nine-panel, full-bleed, tilted snapshots and triptych layouts, six Vice City sunset grades, Anton / Bebas Neue / Pacifico lettering with a neon script subtitle, a badge ribbon and a star heat meter — and exports it as a PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080, all offline in the browser.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and sample photo is a file under `app/`. Your photos are read on your own machine and never uploaded.

## How it works

1. Add your photos (or use the two built-in samples) — each panel takes its own photo.
2. Pick a layout and a sunset grade; drag a panel to move its photo, scroll to zoom, or use the crop sliders.
3. Write the title, neon subtitle, badge and heat meter; toggle grain, vignette, halftone and the retro sun.
4. Export one size, or all three at once. Undo and redo are on hand, plus a shuffle for a fresh look.

## Layout

- `app/index.html` — the editor page
- `app/style.css` — the Vice City editor theme
- `app/src/cover.js` — the cover renderer: layouts, grades, lettering, grain and vignette
- `app/src/main.js` — the editor: state, undo history, drag and zoom, exports, screenshot scenes
- `app/src/shots.js` — fixed `?shot=` scenes for the screenshots
- `app/fonts/` — Anton, Bebas Neue and Pacifico, vendored under the SIL Open Font License
- `app/samples/` — two free sample photos made for make.fun with an image model
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — the cover and the editor at work

## Originality

Everything here is original work: no Rockstar Games logo, wordmark, official artwork, character or font. The title fonts are SIL OFL fonts vendored with their licences in `app/fonts/`.

## License

MIT — see [LICENSE](./LICENSE).
Built for make.fun — sign up with referral code taaana65: https://make.fun/r/taaana65

# 英雄冲突 · Heroes Clash

HTML5 Canvas auto-battler demo (plain JS, no build step). Clash Royale-style presentation, HoMM3-inspired unit stats. Original art only.

- `index.html`, `style.css`, `game.js`: rendering, UI, game flow
- `core.js`: unit data, draft offers, enemy waves, battle simulation (shared with `sim.js`)
- `sim.js`: balance simulation (`node sim.js`)
- `slice.py`: sprite-sheet slicer (Pillow + SciPy). Outputs `assets/*.png` and `assets/manifest.json`

Play: https://merliniky.github.io/heroes-clash/

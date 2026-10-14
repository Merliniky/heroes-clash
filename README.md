# 英雄冲突 · Heroes Clash

HTML5 Canvas auto-battler demo (plain JS, no build step). Clash Royale-style presentation, HoMM3-inspired unit stats. Original art only.

- `index.html`, `style.css`, `game.js`: rendering (procedural rigs, formations, VFX), UI, game flow
- `audio.js`: procedural WebAudio SFX + battle music (mute toggle in HUD)
- `core.js`: unit data, draft offers, enemy waves, battle simulation (shared with `sim.js`)
- `sim.js`: balance simulation (`node sim.js`)
- `parts.py`: splits each sprite into body + weapon/arm (or jaw/claw) layer with a pivot (`assets/rig.json`), inpainting the hole
- `slice.py`: sprite-sheet slicer (Pillow + SciPy). Outputs `assets/*.png` and `assets/manifest.json`

Append `?debug` to expose test hooks for automated playtests.

Play: https://merliniky.github.io/heroes-clash/

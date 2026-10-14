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

## 兵种数据（HoMM3 原版）
Abilities, shot counts and hex size come from [VCMI](https://github.com/vcmi/vcmi) `config/creatures/*.json`. VCMI reads the numeric stats from the original game's `CRTRAITS.TXT`, so those numbers are taken from the HoMM3 creature table (heroes.thelazy.net), which matches CRTRAITS.

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 能力 |
|---|---|---|---|---|---|---|---|---|---|---|
| 枪兵 | Pikeman | 1 | 4 | 5 | 1-3 | 10 | 4 | – | 14 | 免疫冲锋 |
| 弓箭手 | Archer | 2 | 6 | 3 | 2-3 | 10 | 4 | 12 | 9 | 远程 |
| 狮鹫 | Griffin | 3 | 8 | 8 | 3-6 | 25 | 6 | – | 7 | 飞行, 反击2次 |
| 剑士 | Swordsman | 4 | 10 | 12 | 6-9 | 35 | 5 | – | 4 | |
| 僧侣 | Monk | 5 | 12 | 7 | 10-12 | 30 | 5 | 12 | 3 | 远程 |
| 骑士 | Cavalier | 6 | 15 | 15 | 15-25 | 100 | 7 | – | 2 | 冲锋 +5%/格 |
| 半人马 | Centaur | 1 | 5 | 3 | 2-3 | 8 | 6 | – | 14 | |
| 天使 | Angel | 7 | 20 | 20 | 50 | 200 | 12 | – | 1 | 飞行, 憎恨恶魔, 士气+1 |
| 骷髅兵 | Skeleton | 1 | 5 | 4 | 1-3 | 6 | 4 | – | 12 | 不死 |
| 僵尸 | Walking Dead | 2 | 5 | 5 | 2-3 | 15 | 3 | – | 8 | 不死 |
| 哥布林 | Goblin | 1 | 4 | 2 | 1-2 | 5 | 5 | – | 15 | |
| 兽人 | Orc | 3 | 8 | 4 | 2-5 | 15 | 4 | 12 | 7 | 远程(飞斧) |
| 狼骑兵 | Wolf Rider | 2 | 7 | 5 | 2-4 | 10 | 6 | – | 9 | |
| 小恶魔 | Imp | 1 | 2 | 3 | 1-2 | 4 | 5 | – | 15 | |
| 巫妖 | Lich | 5 | 13 | 10 | 11-13 | 30 | 6 | 12 | 3 | 不死, 死亡之云 |
| 绿龙 | Green Dragon | 7 | 18 | 18 | 40-50 | 180 | 10 | – | 1 | 飞行, 龙息, 免疫1-3级魔法 |

Damage uses the HoMM3 formula: ±5% per point of A−D, with a +300% cap and a −70% floor. Ranged units deal half damage in melee or beyond 10 hexes. Each stack retaliates once per 2.5 s round; the griffin retaliates twice. Movement speed is proportional to the Speed stat. Morale and spells are not simulated.

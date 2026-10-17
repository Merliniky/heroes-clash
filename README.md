# 英雄冲突 · Heroes Clash (r6 — 3D)

## v9: the retention update
- **Fast start:** on the first run you tap Start and land straight in a deploy screen with 2 stacks. The coach is one line, and the first win comes in about 16–26 s in tests.
- **Heroes:** Christian (Knight, free), Crag Hack (Barbarian, 150 gold) and Solmyr (Wizard, 250 gold). Each has its own starting stack, spells and passive.
- **Camp (meta, saved in localStorage):** gold earned per run. Upgrades: Recruiting Edict, Magic Academy, Field Hospital and Ancestral Vault. You can unlock 5 tier-7 units and 6 artifacts. There is a codex of 66 creatures and a best-stage record.
- **Daily challenge:** a date-seeded run, so every player gets the same offers, enemies and hero.
- **Share:** at the end of a run you get a result card (PNG with army, stage, kills and best streak) and a challenge link (`?vs=N` shows a banner to friends).
- **Juice:** hit-stop, luck crits (8% base, double damage), kill streaks, slow-motion on the boss kill, a much bigger Lightning (chains) and Meteor (8 impacts and scorch marks), and drop-in spawns.
- **Readability:** dashed attacker→target lines, bigger badges with an HP bar and buff icons, and a red ring on unit loss.
- **Deploy:** red enemy charge lanes, orange shooter target lines, and a "same formation as last time" toast.
- **Rewards:** artifact rarity colours (common, rare, epic, legendary) with a card-flip reveal and build tags. Synergy activation toasts.
- **Themed arenas:** per-theme ground palette, sky, props and ambient particles.
- **Audio:** CC0 music (menu, battle, boss), Kenney jingles, music and SFX volume sliders, and mute.
- **Balance:** 25% of losses are healed after each win. Balance from `node sim.js 400 [bot|mid|meta]`: a fresh account (Knight, no unlocks) has a median death at stage 7 and reaches stage 10 in 46% of runs. Partial upgrades give a median of stage 11. Fully upgraded reaches stage 15 in 60% of runs and clears it in 19%.


## v7: depth update
- **布阵 (deploy):** drag or tap-then-tap your stacks inside the blue zone (7 columns), respecting 1/2/4-cell footprints. The enemy formation is visible. Your formation is remembered between stages. Buttons: 自动布阵 (auto-arrange) and 开战 (fight).
- **Hero spells:** a mana bar that regenerates and 4 spell slots. Spells: Magic Arrow, Lightning, Haste, Bless, Slow, Cure, Resurrection, Fireball, Meteor, Bloodlust. The hero levels up each stage, and spell power ×1.3 per level. Targeting can be single-target, area (with a reticle) or mass. Each spell has VFX and SFX.
- **Upgrades:** picking the same creature merges it into the stack. The third merge, or an upgrade card, turns it into the exact HoMM3 upgraded creature, shown with a gold glow, tint and scale.
- **26 artifacts:** pick 1 of 3 after every even stage and every boss. Owned artifacts are shown in the HUD (long-press for details).
- **Themed stages:** 6 themes, each with a modifier and a weakness hint. Bosses: Lich King (stage 5), Red Wyrm with a breath sweep (stage 10), Archfiend with blink, summons and a fire shield (stage 15). Then endless mode.
- **Faction synergies (2/4/6):** Castle, Necropolis, Stronghold, Rampart, Inferno, with 6–7 units each. A synergy panel is shown, and draft cards show the faction tag and whether a pick completes a synergy.
- Long-press tooltips and a first-run coach for deploy and spells.

Balance (`node sim.js 400`, a bot that drafts with synergy awareness, auto-deploys, casts spells and picks artifacts):
v8 (3-card drafts): reached stage 5: 100%, stage 6: 70%, stage 10: 69%, stage 11: 53%, stage 15: 48%; full clear 33%. Deaths cluster at the boss walls on stages 5, 10 and 15.


**Play:** https://merliniky.github.io/heroes-clash/

- **Mode:** per-stage run.
  - Each stage you choose 1 of 2 reinforcement stacks.
  - The battle then plays out automatically on a 15×10 grid. Units occupy 1, 2 or 4 cells.
  - Survivors carry over to the next stage. There are 10 stages.
- **Controls:** tap an enemy to focus fire. Tap one of your melee stacks to make it hold or attack.
- **Rendering:** three.js r169, vendored in `lib/` with an import map and no build step.
  - Fixed perspective camera at 50–55° pitch, like Clash Royale.
  - Toon materials with rim light, hemisphere light plus a directional sun, soft PCF shadows (1024 map), ACES tone mapping.
  - CC0 skeletal-animated GLB models (see `CREDITS.md`).
  - Idle/walk/run are weight-blended by HoMM3 speed. The attack clip is time-scaled so its impact frame lands on the engine's hit moment. Hit-react, death clip, then the body sinks.
- **Rules:** HoMM3 stats and abilities are exact, unchanged from r4 (`units.js`, `core.js`).
- **Files:**
  - `game3d.js`: renderer and UI flow
  - `models.js`: unit → model mapping
  - `stage.js`: stage offer and enemy generation
  - `sim.js`: stage-mode balance sim


---
(Older notes below are from r4/r5. The strategic map was removed in r6.)

# 英雄冲突 · Heroes Clash

This is a plain-JS canvas game with no build step. It plays as a HoMM3 (Shadow of Death)-style strategic duel: 8 factions, 112 faction creatures plus 5 neutrals, and Clash Royale-style real-time grid battles.

Live: https://merliniky.github.io/heroes-clash/

## Files
- `units.js`: generated by `gen_units.py`. Holds every creature's exact HoMM3 stats and abilities.
- `core.js`: the real-time grid battle engine, shared by the browser and node.
- `strat.js`: the strategic map/town layer (economy, dwellings, neutral camps, AI). Shared by the browser and node.
- `game.js`: rendering, the procedural rigs and walk cycle, UI, and the game flow (title → faction → map → battles → game over).
- `sim.js`: the strategy simulation, AI against simple player strategies.
- `slice2.py`: slices the faction sheets into `assets/c/*.png`. `slice.py` and `parts.py` are the older castle rigs.
- Add `?debug` to the URL to expose test hooks.

## Data sources
- **Numbers** (attack, defense, damage, HP, speed, growth, AI value, cost) are the original values from `CRTRAITS.TXT`, taken from the heroes.thelazy.net *List of creatures*. VCMI itself loads these numbers from `CRTRAITS.TXT`.
- **Abilities, shots and size** (`doubleWide` gives a 2-hex footprint) are cross-checked against VCMI `config/creatures/*.json` ([vcmi/vcmi](https://github.com/vcmi/vcmi)).

**Implemented abilities:**
- Ranged attacks with a shot count.
- Ranged units deal half damage in melee, unless they have "no melee penalty". Half damage beyond 10 cells.
- Double attack (melee strikes twice; ranged shoots twice).
- No enemy retaliation.
- Retaliation once per round. The griffin retaliates twice; the royal griffin has unlimited retaliations.
- Flying.
- Jousting (+5% per cell moved); pikemen and halberdiers are immune.
- Dragon breath (also hits the cell behind the target).
- Lich death cloud (undead are immune) and magog fireball (area damage).
- Vampire Lord life drain.
- Regeneration (wight, wraith, troll).
- Petrify, blind and paralyze: 20% chance to stun the target.
- Black Knight curse: 25% chance the target deals minimum damage.
- Dread Knight death blow: 20% chance of double damage.
- Mighty Gorgon death stare.
- Attack all adjacent enemies (hydra, cerberus).
- Behemoths ignore 40% or 80% of the target's defense.
- Thunderbird lightning.
- Efreet Sultan fire shield.
- Hate (angel vs. devil, genie vs. efreet, titan vs. black dragon).

**Not simulated (listed on each card):** spells and magic resistance or immunity, morale and luck, binding, disease, aging, poison, resurrection, strike-and-return, teleport.

**Movement speed** is squeezed into a narrow band: `cells per round = 1.8 + 0.13 × speed`. Speed 3 gives 2.2 cells and speed 18 gives 4.1 cells, about 1.9×.

## Strategic design
- **Turns:** each turn you get a free 1-of-2 creature offer from your own dwellings (about half a week of growth). Then you take exactly one action:
  - **Build** a dwelling, upgrade one, or put up a resource building.
  - **Fight** one of 3 neutral camps (easy, medium or hard).
  - **Recruit** from the dwelling pools.
  - **Attack** the enemy town.
- **Win condition:** the first side to win 3 duels wins the game. The game ends at turn 40 at the latest.
- **Income:** 1000 gold, 2 wood and 2 ore per turn. Optional buildings:
  - Sawmill & mine (锯木厂·矿井): +2 wood and +2 ore per turn, costs 1500 gold.
  - Gem mine (宝石矿): +1 gem per turn, costs 2000 gold, 5 wood and 5 ore.
  - City hall (市政厅): +750 gold per turn, costs 2500 gold, 5 wood and 5 ore.
- **Starting state:** you start with 2500 gold, 5 wood, 5 ore and 1 gem, level 1 and 2 dwellings already built, and one week of level-1 units plus 0.6 weeks of level-2 units.
- **Dwelling costs:**
  - Level 3: 1200 gold, 5 wood.
  - Level 4: 2000 gold, 5 wood, 5 ore.
  - Level 5: 3000 gold, 5 ore, 2 gems.
  - Level 6: 4500 gold, 8 wood, 8 ore, 4 gems.
  - Level 7: 7000 gold, 10 wood, 10 ore, 8 gems.
- **Upgrade costs:** level 1 is 500 gold and 2 wood, rising to level 7 at 6000 gold, 5 wood, 5 ore and 6 gems.
- **Creature prices** are the HoMM3 gold costs. Level-7 creatures also cost gems equal to their HoMM3 rare-resource cost.
- **Growth:**
  - Dwelling pools refill every 3 turns (one week) at the HoMM3 weekly growth, capped at 3 weeks of growth.
  - Each faction has a growth multiplier, a balance tweak; creature stats stay exact. Castle 0.95, rampart 0.75, tower 1.0, inferno 0.95, necropolis 1.6, dungeon 0.85, stronghold 1.0, fortress 1.55.
  - Necropolis also gets Necromancy: after each won battle it raises skeletons from 20% of the HP it killed.
- **Neutral camps:**
  - Camp strength (in HoMM3 AI value) is `(800 + 450t + 25t²) × (0.55 | 1.0 | 1.7)`, where t is the turn number.
  - Rewards are gold, wood, ore and gems.
  - Hard camps have a 50% chance of an artifact (+1 or +2 attack and/or defense for your whole army).
  - Otherwise there is a 45% chance that some neutrals join you.
- **Duels:**
  - No duels before turn 5, and a 3-turn truce after every duel.
  - The defender gets town walls: +3 defense.
  - The winner gets 1500 gold, 3 wood, 3 ore and 1 gem.
  - If the defender loses, a week of militia rallies to them.
  - Survivors carry over. Each battle uses at most 7 stacks; same-type stacks merge automatically, and if you have more than 7 types you pick which 7 go.
- **AI turn order:**
  1. Take the more valuable offer.
  2. Attack if its top-7 army is ≥1.1× yours.
  3. Recruit if a duel is coming and you are close in strength.
  4. Otherwise build the next dwelling.
  5. Build the sawmill early.
  6. Recruit if the pool is worth ≥20% of its army.
  7. Farm a camp weaker than 55% of its army, preferring the best reward.
  8. Otherwise upgrade or build.

## Sim (`node sim.js 160`): AI against player strategies, factions randomized
In the first table the player uses the given strategy against the AI. The faction line is AI against AI over 800 games.

```
┌───────────┬───────────┬─────────────┬─────┬─────┬─────────────────────────────────────────────┬─────────────────────────────────────────────┐
│ (index)   │ playerWin │ medianTurns │ p10 │ p90 │ playerMix                                   │ aiMix                                       │
├───────────┼───────────┼─────────────┼─────┼─────┼─────────────────────────────────────────────┼─────────────────────────────────────────────┤
│ ai        │ '63%'     │ 21          │ 15  │ 29  │ 'build:21% recruit:58% attack:10% camp:11%' │ 'build:21% recruit:60% camp:11% attack:8%'  │
│ builder   │ '36%'     │ 41          │ 33  │ 41  │ 'build:17% recruit:83%'                     │ 'build:15% recruit:59% attack:5% camp:21%'  │
│ farmer    │ '28%'     │ 18          │ 13  │ 41  │ 'camp:77% recruit:23%'                      │ 'build:22% recruit:54% attack:15% camp:8%'  │
│ recruiter │ '38%'     │ 16          │ 13  │ 21  │ 'recruit:36% camp:25% attack:39%'           │ 'build:27% recruit:48% camp:16% attack:10%' │
│ rusher    │ '30%'     │ 13          │ 13  │ 17  │ 'recruit:7% attack:93%'                     │ 'build:31% recruit:47% camp:22%'            │
│ random    │ '28%'     │ 15          │ 13  │ 25  │ 'attack:27% camp:25% build:23% recruit:25%' │ 'build:27% recruit:49% attack:12% camp:12%' │
└───────────┴───────────┴─────────────┴─────┴─────┴─────────────────────────────────────────────┴─────────────────────────────────────────────┘
faction win% (AI vs AI): castle 40%, rampart 57%, tower 55%, inferno 54%, necro 37%, dungeon 18%, stronghold 71%, fortress 31%
```

## Art: missing or stand-in
- The silver pegasus art is a wingless armored horse. It flies in the game anyway.
- There is no gold golem (or other golem neutral) art, so those neutrals are not included.
- The fortress-sheet cell 7 (wyvern-like) and dungeon-sheet cells 3 and 4 (dragon, troll) are not used. The extra-sheet troll is the neutral troll.
- The necropolis sheet's cell 1 (purple-plumed skeleton) is unused; cells 13 and 14 are the Skeleton and Skeleton Warrior.
- The map is drawn procedurally (terrain, river, roads, mountains, forests, castles in faction colors, tents). A painted map background would improve it.

## Creature table

### 城堡 (castle)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 枪兵 | Pikeman | 1 | 4 | 5 | 1-3 | 10 | 4 | – | 14 | 60 | joustImm |  |
| 戟兵 | Halberdier | 1+ | 6 | 5 | 2-3 | 10 | 5 | – | 14 | 75 | joustImm |  |
| 弓箭手 | Archer | 2 | 6 | 3 | 2-3 | 10 | 4 | 12 | 9 | 100 |  |  |
| 神射手 | Marksman | 2+ | 6 | 3 | 2-3 | 10 | 6 | 24 | 9 | 150 | dbl |  |
| 狮鹫 | Griffin | 3 | 8 | 8 | 3-6 | 25 | 6 | – | 7 | 200 | retal:2, fly |  |
| 皇家狮鹫 | Royal Griffin | 3+ | 9 | 9 | 3-6 | 25 | 9 | – | 7 | 240 | retal:99, fly |  |
| 剑士 | Swordsman | 4 | 10 | 12 | 6-9 | 35 | 5 | – | 4 | 300 |  |  |
| 十字军 | Crusader | 4+ | 12 | 12 | 7-10 | 35 | 6 | – | 4 | 400 | dbl |  |
| 僧侣 | Monk | 5 | 12 | 7 | 10-12 | 30 | 5 | 12 | 3 | 400 |  |  |
| 狂热者 | Zealot | 5+ | 12 | 10 | 10-12 | 30 | 7 | 24 | 3 | 450 | noMP |  |
| 骑士 | Cavalier | 6 | 15 | 15 | 15-25 | 100 | 7 | – | 2 | 1000 | joust:0.05 |  |
| 冠军骑士 | Champion | 6+ | 16 | 16 | 20-25 | 100 | 9 | – | 2 | 1200 | joust:0.05 |  |
| 天使 | Angel | 7 | 20 | 20 | 50-50 | 200 | 12 | – | 1 | 3000 +1💎 | hate:{devil:0.5,archDevil:0.5}, fly | 士气+1 |
| 大天使 | Archangel | 7+ | 30 | 30 | 50-50 | 250 | 18 | – | 1 | 5000 +3💎 | hate:{devil:0.5,archDevil:0.5}, fly | 士气+1、复活 |

### 壁垒 (rampart)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 半人马 | Centaur | 1 | 5 | 3 | 2-3 | 8 | 6 | – | 14 | 70 |  |  |
| 半人马队长 | Centaur Captain | 1+ | 6 | 3 | 2-3 | 10 | 8 | – | 14 | 90 |  |  |
| 矮人 | Dwarf | 2 | 6 | 7 | 2-4 | 20 | 3 | – | 8 | 120 |  | 魔法抗性 |
| 战斗矮人 | Battle Dwarf | 2+ | 7 | 7 | 2-4 | 20 | 5 | – | 8 | 150 |  | 魔法抗性 |
| 木精灵 | Wood Elf | 3 | 9 | 5 | 3-5 | 15 | 6 | 24 | 7 | 200 |  |  |
| 大精灵 | Grand Elf | 3+ | 9 | 5 | 3-5 | 15 | 7 | 24 | 7 | 225 | dbl |  |
| 飞马 | Pegasus | 4 | 9 | 8 | 5-9 | 30 | 8 | – | 5 | 250 | fly | 魔法抑制 |
| 银飞马 | Silver Pegasus | 4+ | 9 | 10 | 5-9 | 30 | 12 | – | 5 | 275 | fly | 魔法抑制 |
| 树精卫士 | Dendroid Guard | 5 | 9 | 12 | 10-14 | 55 | 3 | – | 3 | 350 |  | 缠绕（禁止移动） |
| 树精战士 | Dendroid Soldier | 5+ | 9 | 12 | 10-14 | 65 | 4 | – | 3 | 425 |  | 缠绕（禁止移动） |
| 独角兽 | Unicorn | 6 | 15 | 14 | 18-22 | 90 | 7 | – | 2 | 850 | stun:[0.2,致盲] | 魔法抗性、抗魔光环 |
| 战斗独角兽 | War Unicorn | 6+ | 15 | 14 | 18-22 | 110 | 9 | – | 2 | 950 | stun:[0.2,致盲] | 魔法抗性、抗魔光环 |
| 绿龙 | Green Dragon | 7 | 18 | 18 | 40-50 | 180 | 10 | – | 1 | 2400 +1💎 | breath, fly | 魔法免疫 |
| 金龙 | Gold Dragon | 7+ | 27 | 27 | 40-50 | 250 | 16 | – | 1 | 4000 +2💎 | breath, fly | 魔法免疫 |

### 塔楼 (tower)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 小魔怪 | Gremlin | 1 | 3 | 3 | 1-2 | 4 | 4 | – | 16 | 30 |  |  |
| 高级小魔怪 | Master Gremlin | 1+ | 4 | 4 | 1-2 | 4 | 5 | 8 | 16 | 40 |  |  |
| 石像鬼 | Stone Gargoyle | 2 | 6 | 6 | 2-3 | 16 | 6 | – | 9 | 130 | unliving, fly |  |
| 黑曜石像鬼 | Obsidian Gargoyle | 2+ | 7 | 7 | 2-3 | 16 | 9 | – | 9 | 160 | unliving, fly |  |
| 石魔像 | Stone Golem | 3 | 7 | 10 | 4-5 | 30 | 3 | – | 6 | 150 | unliving | 法术伤害抗性 |
| 铁魔像 | Iron Golem | 3+ | 9 | 10 | 4-5 | 35 | 5 | – | 6 | 200 | unliving | 法术伤害抗性 |
| 法师 | Mage | 4 | 11 | 8 | 7-9 | 25 | 5 | 24 | 4 | 350 | noMP | 魔法通道、无障碍惩罚 |
| 大法师 | Arch Mage | 4+ | 12 | 9 | 7-9 | 30 | 7 | 24 | 4 | 450 | noMP | 魔法通道、无障碍惩罚 |
| 灯神 | Genie | 5 | 12 | 12 | 13-16 | 40 | 7 | – | 3 | 550 | hate:{efreet:0.5,efreetSultan:0.5}, fly |  |
| 高级灯神 | Master Genie | 5+ | 12 | 12 | 13-16 | 40 | 11 | – | 3 | 600 | hate:{efreet:0.5,efreetSultan:0.5}, fly | 施法 |
| 娜迦 | Naga | 6 | 16 | 13 | 20-20 | 110 | 5 | – | 2 | 1100 | noRet |  |
| 娜迦女王 | Naga Queen | 6+ | 16 | 13 | 30-30 | 110 | 7 | – | 2 | 1600 | noRet |  |
| 巨人 | Giant | 7 | 19 | 16 | 40-60 | 150 | 7 | – | 1 | 2000 +1💎 |  | 魔法免疫、免疫心智魔法 |
| 泰坦 | Titan | 7+ | 24 | 24 | 40-60 | 300 | 11 | 24 | 1 | 5000 +2💎 | noMP, hate:{blackDragon:0.5} | 魔法免疫、免疫心智魔法 |

### 地狱 (inferno)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 小恶魔 | Imp | 1 | 2 | 3 | 1-2 | 4 | 5 | – | 15 | 50 |  |  |
| 魔仆 | Familiar | 1+ | 4 | 4 | 1-2 | 4 | 7 | – | 15 | 60 |  | 魔法通道 |
| 歌革 | Gog | 2 | 6 | 4 | 2-4 | 13 | 4 | 12 | 8 | 125 |  |  |
| 玛各 | Magog | 2+ | 7 | 4 | 2-4 | 13 | 6 | 24 | 8 | 175 | fireball |  |
| 地狱猎犬 | Hell Hound | 3 | 10 | 6 | 2-7 | 25 | 7 | – | 5 | 200 |  |  |
| 地狱三头犬 | Cerberus | 3+ | 10 | 8 | 2-7 | 25 | 8 | – | 5 | 250 | noRet, allAdj |  |
| 恶魔 | Demon | 4 | 10 | 10 | 7-9 | 35 | 5 | – | 4 | 250 |  |  |
| 角魔 | Horned Demon | 4+ | 10 | 10 | 7-9 | 40 | 6 | – | 4 | 270 |  |  |
| 深渊魔 | Pit Fiend | 5 | 13 | 13 | 13-17 | 45 | 6 | – | 3 | 500 |  |  |
| 深渊领主 | Pit Lord | 5+ | 13 | 13 | 13-17 | 45 | 7 | – | 3 | 700 |  | 召唤恶魔 |
| 伊夫利特 | Efreeti | 6 | 16 | 12 | 16-24 | 90 | 9 | – | 2 | 900 | hate:{genie:0.5,masterGenie:0.5}, fly | 免疫火系 |
| 伊夫利特苏丹 | Efreet Sultan | 6+ | 16 | 14 | 16-24 | 90 | 13 | – | 2 | 1100 | hate:{genie:0.5,masterGenie:0.5}, fireShield, fly | 免疫火系 |
| 魔鬼 | Devil | 7 | 19 | 21 | 30-40 | 160 | 11 | – | 1 | 2700 +1💎 | noRet, hate:{angel:0.5,archangel:0.5} | 瞬移、敌方幸运-1 |
| 大魔鬼 | Arch Devil | 7+ | 26 | 28 | 30-40 | 200 | 17 | – | 1 | 4500 +2💎 | noRet, hate:{angel:0.5,archangel:0.5} | 瞬移、敌方幸运-1 |

### 墓园 (necro)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 骷髅兵 | Skeleton | 1 | 5 | 4 | 1-3 | 6 | 4 | – | 12 | 60 | undead |  |
| 骷髅勇士 | Skeleton Warrior | 1+ | 6 | 6 | 1-3 | 6 | 5 | – | 12 | 70 | undead |  |
| 行尸 | Walking Dead | 2 | 5 | 5 | 2-3 | 15 | 3 | – | 8 | 100 | undead |  |
| 僵尸 | Zombie | 2+ | 5 | 5 | 2-3 | 20 | 4 | – | 8 | 125 | undead | 疾病 |
| 尸妖 | Wight | 3 | 7 | 7 | 3-5 | 18 | 5 | – | 7 | 200 | undead, regen, fly |  |
| 怨灵 | Wraith | 3+ | 7 | 7 | 3-5 | 18 | 7 | – | 7 | 230 | undead, regen, fly | 吸取魔法 |
| 吸血鬼 | Vampire | 4 | 10 | 9 | 5-8 | 30 | 6 | – | 4 | 360 | undead, noRet, fly |  |
| 吸血鬼王 | Vampire Lord | 4+ | 10 | 10 | 5-8 | 40 | 9 | – | 4 | 500 | undead, noRet, drain, fly |  |
| 巫妖 | Lich | 5 | 13 | 10 | 11-13 | 30 | 6 | 12 | 3 | 550 | undead, cloud |  |
| 大巫妖 | Power Lich | 5+ | 13 | 10 | 11-15 | 40 | 7 | 24 | 3 | 600 | undead, cloud |  |
| 黑骑士 | Black Knight | 6 | 16 | 16 | 15-30 | 120 | 7 | – | 2 | 1200 | undead, curse |  |
| 恐怖骑士 | Dread Knight | 6+ | 18 | 18 | 15-30 | 120 | 9 | – | 2 | 1500 | undead, curse, deathBlow |  |
| 骨龙 | Bone Dragon | 7 | 17 | 15 | 25-50 | 150 | 9 | – | 1 | 1800 | undead, fly | 敌方士气-1 |
| 幽灵龙 | Ghost Dragon | 7+ | 19 | 17 | 25-50 | 200 | 14 | – | 1 | 3000 +1💎 | undead, fly | 敌方士气-1、衰老 |

### 地下城 (dungeon)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 穴居人 | Troglodyte | 1 | 4 | 3 | 1-3 | 5 | 4 | – | 14 | 50 |  | 免疫致盲/石化 |
| 地狱穴居人 | Infernal Troglodyte | 1+ | 5 | 4 | 1-3 | 6 | 5 | – | 14 | 65 |  | 免疫致盲/石化 |
| 鹰身女妖 | Harpy | 2 | 6 | 5 | 1-4 | 14 | 6 | – | 8 | 130 | fly | 攻击后返回 |
| 鹰身女巫 | Harpy Hag | 2+ | 6 | 6 | 1-4 | 14 | 9 | – | 8 | 170 | noRet, fly | 攻击后返回 |
| 眼魔 | Beholder | 3 | 9 | 7 | 3-5 | 22 | 5 | 12 | 7 | 250 | noMP |  |
| 邪眼 | Evil Eye | 3+ | 10 | 8 | 3-5 | 22 | 7 | 24 | 7 | 280 | noMP |  |
| 美杜莎 | Medusa | 4 | 9 | 9 | 6-8 | 25 | 5 | 4 | 4 | 300 | noMP, stun:[0.2,石化] |  |
| 美杜莎女王 | Medusa Queen | 4+ | 10 | 10 | 6-8 | 30 | 6 | 8 | 4 | 330 | noMP, stun:[0.2,石化] |  |
| 牛头人 | Minotaur | 5 | 14 | 12 | 12-20 | 50 | 6 | – | 3 | 500 |  | 士气始终为正 |
| 牛头人王 | Minotaur King | 5+ | 15 | 15 | 12-20 | 50 | 8 | – | 3 | 575 |  | 士气始终为正 |
| 蝎尾狮 | Manticore | 6 | 15 | 13 | 14-20 | 80 | 7 | – | 2 | 850 | fly |  |
| 蝎尾魔狮 | Scorpicore | 6+ | 16 | 14 | 14-20 | 80 | 11 | – | 2 | 1050 | stun:[0.2,麻痹], fly |  |
| 红龙 | Red Dragon | 7 | 19 | 19 | 40-50 | 180 | 11 | – | 1 | 2500 +1💎 | breath, fly | 魔法免疫 |
| 黑龙 | Black Dragon | 7+ | 25 | 25 | 40-50 | 300 | 15 | – | 1 | 4000 +2💎 | breath, hate:{titan:0.5}, fly | 魔法免疫 |

### 据点 (stronghold)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 哥布林 | Goblin | 1 | 4 | 2 | 1-2 | 5 | 5 | – | 15 | 40 |  |  |
| 大哥布林 | Hobgoblin | 1+ | 5 | 3 | 1-2 | 5 | 7 | – | 15 | 50 |  |  |
| 狼骑兵 | Wolf Rider | 2 | 7 | 5 | 2-4 | 10 | 6 | – | 9 | 100 |  |  |
| 狼骑掠夺者 | Wolf Raider | 2+ | 8 | 5 | 3-4 | 10 | 8 | – | 9 | 140 | dbl |  |
| 兽人 | Orc | 3 | 8 | 4 | 2-5 | 15 | 4 | 12 | 7 | 150 |  |  |
| 兽人酋长 | Orc Chieftain | 3+ | 8 | 4 | 2-5 | 20 | 5 | 24 | 7 | 165 |  |  |
| 食人魔 | Ogre | 4 | 13 | 7 | 6-12 | 40 | 4 | – | 4 | 300 |  |  |
| 食人魔法师 | Ogre Mage | 4+ | 13 | 7 | 6-12 | 60 | 5 | – | 4 | 400 |  | 施法 |
| 大鹏 | Roc | 5 | 13 | 11 | 11-15 | 60 | 7 | – | 3 | 600 | fly |  |
| 雷鸟 | Thunderbird | 5+ | 13 | 11 | 11-15 | 60 | 11 | – | 3 | 700 | lightning, fly |  |
| 独眼巨人 | Cyclops | 6 | 15 | 12 | 16-20 | 70 | 6 | 16 | 2 | 750 |  | 攻城 |
| 独眼巨人王 | Cyclops King | 6+ | 17 | 13 | 16-20 | 70 | 8 | 24 | 2 | 1100 |  | 攻城 |
| 比蒙 | Behemoth | 7 | 17 | 17 | 30-50 | 160 | 6 | – | 1 | 1500 | ignoreDef:0.4 |  |
| 远古比蒙 | Ancient Behemoth | 7+ | 19 | 19 | 30-50 | 300 | 9 | – | 1 | 3000 +1💎 | ignoreDef:0.8 |  |

### 要塞 (fortress)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 豺狼人 | Gnoll | 1 | 3 | 5 | 2-3 | 6 | 4 | – | 12 | 50 |  |  |
| 豺狼掠夺者 | Gnoll Marauder | 1+ | 4 | 6 | 2-3 | 6 | 5 | – | 12 | 70 |  |  |
| 蜥蜴人 | Lizardman | 2 | 5 | 6 | 2-3 | 14 | 4 | 12 | 9 | 110 |  |  |
| 蜥蜴勇士 | Lizard Warrior | 2+ | 6 | 8 | 2-5 | 15 | 5 | 24 | 9 | 140 |  |  |
| 毒蝇 | Serpent Fly | 3 | 7 | 9 | 2-5 | 20 | 9 | – | 8 | 220 | fly | 驱散增益 |
| 龙蝇 | Dragon Fly | 3+ | 8 | 10 | 2-5 | 20 | 13 | – | 8 | 240 | fly | 虚弱、驱散增益 |
| 石化蜥蜴 | Basilisk | 4 | 11 | 11 | 6-10 | 35 | 5 | – | 4 | 325 | stun:[0.2,石化] |  |
| 大石化蜥蜴 | Greater Basilisk | 4+ | 12 | 12 | 6-10 | 40 | 7 | – | 4 | 400 | stun:[0.2,石化] |  |
| 蛮牛 | Gorgon | 5 | 10 | 14 | 12-16 | 70 | 5 | – | 3 | 525 |  |  |
| 大蛮牛 | Mighty Gorgon | 5+ | 11 | 16 | 12-16 | 70 | 6 | – | 3 | 600 | deathStare |  |
| 双足飞龙 | Wyvern | 6 | 14 | 14 | 14-18 | 70 | 7 | – | 2 | 800 | fly |  |
| 双足飞龙王 | Wyvern Monarch | 6+ | 14 | 14 | 18-22 | 70 | 11 | – | 2 | 1100 | fly | 中毒 |
| 九头蛇 | Hydra | 7 | 16 | 18 | 25-45 | 175 | 5 | – | 1 | 2200 | noRet, allAdj |  |
| 混沌九头蛇 | Chaos Hydra | 7+ | 18 | 20 | 25-45 | 250 | 7 | – | 1 | 3500 +1💎 | noRet, allAdj |  |

### 中立 (neutral)

| 单位 | HoMM3 | 级 | 攻 | 防 | 伤害 | 生命 | 速度 | 射击 | 周产 | 金币 | 已实现能力 | 未模拟 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 农民 | Peasant | 1 | 1 | 1 | 1-1 | 1 | 3 | – | 25 | 10 |  |  |
| 野猪 | Boar | 2 | 6 | 5 | 2-3 | 15 | 6 | – | 8 | 150 |  |  |
| 盗贼 | Rogue | 2 | 8 | 3 | 2-4 | 10 | 6 | – | 8 | 100 |  |  |
| 游牧民 | Nomad | 3 | 9 | 8 | 2-6 | 30 | 7 | – | 7 | 200 |  |  |
| 巨魔 | Troll | 5 | 14 | 7 | 10-15 | 40 | 7 | – | 3 | 500 | regen |  |


## v10
- PWA: manifest, 192/512 + maskable icons, versioned service worker (`hc-v10`) with offline cache, install button (iOS hint), OG/Twitter card.
- Rage timer (38 s / boss 52 s → damage ramps +12%/s) keeps battles short; boss intro cutscene with camera zoom + name card.
- Procedural flapping wings for angel/archangel/pegasus; chest-opening gold reward; 17 achievements (camp tab, gold rewards, toasts).
- Settings (⚙️): hide tips, persistent 2× speed. Daily-challenge streak calendar (title + camp).

## v11
- Clash-Royale-style draft cards: fixed-scale 3D portraits rendered from the battlefield models (size reflects tier and footprint), level gem, 4 icon stats, a one-line ability, merge and synergy ribbons; tap a card for details, then confirm.
- Artifact pick: 3 equal cards (a vertical list on phones), rarity-glow icon frames, tap and confirm, small skip button.
- Battlefield readability: each unit's badge shows a portrait of its type, 5 new CC0 monster models, bat wings for imp and devil, distinct palettes.

## v12 (pilot)
- `?sprites=1` swaps pikeman, archer, skeleton and green dragon for Blender pre-rendered sprite atlases (camera-facing, mirrored by facing, contact shadow, hit flash). The default game is unchanged. Pipeline: `tools/render.py` and `tools/pack.py`.

## v13 — HD sprite pilots
`?sprites=1` now uses higher-detail CC0 models for **swordsman** (Quaternius UBC + Fantasy outfit + UAL animations), **skeleton** (OGA Skeleton Outlaw, 2K texture) and **behemoth** (OGA Cethiel's Dragon, textured spiky drake), plus the v12 pikeman/archer/greenDragon. Render adds a second cool rim light, thicker outline, and unsharp-mask after downsampling. Prep scripts live in the build box (`/workspace/hd/prep_*.py`).

## v14 — sprite polish (behind `?sprites=1`)
- 5 rendered directions (away, away-right, right, toward-right, toward) mirrored to 8; the engine picks the direction from the unit's facing relative to the camera, so units face their target when attacking/shooting and their path when walking.
- Rendered with a 55° camera matching the portrait game camera; soles placed on z=0 from mesh vertices; baked shadow-catcher contact shadow + small blob; billboards anchored at the projected ground point and pushed toward the camera along the view ray so the lower body/shadow is never clipped.
- Trimmed frames packed into 2048-wide atlas pages (GPU memory ~5–35 MB per unit instead of ~70+), premultiplied-alpha downscale (no fringes), 1 px external outline.
- Projectiles now spawn offset toward the target; facing locks onto the wind-up target.

## v15 — sprite roster expansion (behind `?sprites=1`)
- Sprites for Castle pikeman, archer (now with a bow), swordsman (upright idle), monk, cavalier, angel; early enemies skeleton, walking dead, goblin, imp, centaur, dwarf; plus behemoth (new hulking CC0 "Forest Monster" body) and green dragon (smaller 2×2 footprint, nose-up hover so the front view shows the head, matte darker scales).
- Upgrades reuse their base atlas with a tint + 8 % scale (halberdier, marksman, crusader, zealot, champion, archangel, …).
- Atlases are fetched lazily the first time a unit type appears (≈0.5–0.9 MB per type), so a battle only downloads what is on the field.
- Stronger baked contact shadows (faded with distance from the feet) + darker blob shadow.

## v16 — distinct upgrades, griffins, theme enemies (behind `?sprites=1`)
- New **Griffin** (now part of the Castle line) and **Royal Griffin**: CC0 wolf body + procedural eagle head and flapping wings.
- Upgrades get their own atlases with real differences: halberdier (halberd, blue tunic, plume), marksman (dark-brown ranger, longer bow), crusader (red tabard, gold sword, celtic shield, cape, plume), zealot (white/gold robe, gold staff, halo), champion (white horse, gold armour, celtic shield, plume), archangel (bigger wings, big sword, halo), hobgoblin / battle dwarf (helmets, shields).
- Style pass: walking dead, imp, monk, dwarf rebuilt on the same realistic UBC body set as the Castle units (no more cartoon Quaternius monsters among them); lich is now a skeleton in a robe; gog/imp/demons have horns; dwarf beard visible; dragon eyes amber.
- Angel / archangel / griffin / pit fiend / imp wings flap; cavalier rider legs hang astride; centaur torso enlarged and moved to the front.
- Theme enemies for stages 5–10: wight, vampire, vampire lord, black knight, bone dragon (necro); wolf rider, orc, ogre (stronghold); wood elf, pegasus, dendroid, unicorn, gold dragon (rampart); hell hound, demon, pit fiend (inferno); red/black dragons. Their upgrades use a tinted alias.

## v17 — griffin rebuild + first theme-enemy batch (behind `?sprites=1`)
- Griffin / royal griffin rebuilt: compact crouched lion body, eagle head lower and forward, larger spread wings; tier-3 sprite scale cut (no longer dragon-sized; royal griffin overlap fixed); lighter atlases.
- New enemy sprites: wight, vampire (necro), bone dragon, orc, ogre, wolf rider (stronghold), wood elf (rampart), hell hound, demon (inferno). Their upgrades (wraith, ghost dragon, vampire lord, orc chieftain, ogre mage, wolf raider, grand elf, cerberus, horned demon) and cyclops reuse the base atlas with a tint.
- Packer keeps animation duration when a unit is rendered with fewer frames.

## v18 — fixes + dragons + more enemies (behind `?sprites=1`)
- Zealot halo now bright and thick enough to read at phone scale; lich hood is a pointed cowl with a rim; crusader cape has cloth pleats and a top bar; centaur torso enlarged and moved to the front.
- Dedicated gold, red and black dragon atlases (material recolours; gold is glossier); green dragon eyes amber.
- New sprites: hobgoblin, battle dwarf, unicorn, pit fiend, vampire lord; wight now hovers (no baked contact shadow, blob shadow only).
- Upgrades war unicorn / pit lord reuse the base atlas with a tint.

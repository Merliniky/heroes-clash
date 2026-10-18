# Credits & licences — 3D assets

Every 3D model in `assets/models/` is **CC0 1.0 (public domain)**. No attribution is required, but we credit the authors anyway.
The files were trimmed (unused animations removed) and quantised (`KHR_mesh_quantization`) with gltf-transform. The geometry and animation data were not otherwise changed.

| File | Used for (HoMM3 unit) | Author | Source | Licence |
|---|---|---|---|---|
| k_Knight.glb | Pikeman, Swordsman, Crusader, Cavalier (rider) | Kay Lousberg (KayKit) | KayKit Character Pack: Adventurers 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | CC0 |
| k_Rogue_Hooded.glb | Archer | Kay Lousberg (KayKit) | same pack | CC0 |
| k_Mage.glb | Monk | Kay Lousberg (KayKit) | same pack | CC0 |
| k_Barbarian.glb | Battle Dwarf | Kay Lousberg (KayKit) | same pack | CC0 |
| k_Skeleton_Minion.glb | Skeleton | Kay Lousberg (KayKit) | KayKit Character Pack: Skeletons 1.0 — https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0 | CC0 |
| k_Skeleton_Warrior.glb | Skeleton Warrior | Kay Lousberg (KayKit) | same pack | CC0 |
| k_Skeleton_Mage.glb | Lich | Kay Lousberg (KayKit) | same pack | CC0 |
| k_Skeleton_Rogue.glb | Wight / Wraith | Kay Lousberg (KayKit) | same pack | CC0 |
| Skeleton_Blade / Skeleton_Axe / Skeleton_Shield_Small_A / Skeleton_Staff.glb | weapon props | Kay Lousberg (KayKit) | same pack (Assets/gltf) | CC0 |
| q_horse.glb | Cavalier (mount) | Quaternius | poly.pizza "Horse" — https://static.poly.pizza/d37dbc87-ca61-4b2c-a2da-d2f0c4240bef.glb | CC0 |
| q_wolf2.glb | Wolf Rider (mount) | Quaternius | poly.pizza "Wolf" — https://static.poly.pizza/611d25c7-430f-4bb5-ab2c-d8f5f3cb9712.glb | CC0 |
| q_goblin.glb | Goblin, Wolf Rider (rider) | Quaternius | poly.pizza "Goblin" — https://static.poly.pizza/6fbb8914-bd11-45e1-a906-51ace2ca5d2d.glb | CC0 |
| q_orc.glb | Orc | Quaternius | poly.pizza "Orc" — https://static.poly.pizza/52a479b3-a635-4a23-92cb-6697eaa5eed5.glb | CC0 |
| q_demon.glb | Demon, Imp | Quaternius | poly.pizza "Demon" — https://static.poly.pizza/46b52ba4-5d2a-4fc8-85cc-3e980f199141.glb | CC0 |
| q_yeti.glb | Troll | Quaternius | poly.pizza "Yeti" — https://static.poly.pizza/40a831b3-686a-4af8-b189-a13b38a3c26a.glb | CC0 |
| q_yeti2.glb | Ogre / Ogre Mage | Quaternius | poly.pizza Quaternius monster set (second yeti variant) | CC0 |
| q_giant.glb | Giant | Quaternius | poly.pizza "Giant" — https://static.poly.pizza/260aff73-1409-4a45-9746-b078229d8cf3.glb | CC0 |
| q_zombie.glb | Zombie | Quaternius | poly.pizza "Zombie" — https://static.poly.pizza/c4002f69-6979-42e8-ad6e-2f4e14fc3a9d.glb | CC0 |
| q_dragon2.glb | Green Dragon, Bone Dragon | Quaternius | poly.pizza "Dragon" — https://static.poly.pizza/ae5b8510-1fa5-4d53-b943-a4f3b88fb629.glb | CC0 |
| n_CommonTree_1/3, n_PineTree_1, n_Bush_1, n_BushBerries_1, n_Rock_1/2, n_Rock_Moss_1, n_Flowers, n_Grass | arena border props | Quaternius | Ultimate Nature Pack (mirror: https://github.com/trebeljahr/quaternius-showcase, public/glb/nature_pack) | CC0 |
| n_medieval_village_pack_Fence | arena fences | Quaternius | Medieval Village Pack (same mirror) | CC0 |
| n_medieval_weapons_pack_Spear | Pikeman spear | Quaternius | Medieval Weapons Pack (same mirror) | CC0 |

Engine: **three.js r169** (`lib/`), MIT licence — see `lib/THREE_LICENSE`. The files are vendored unchanged: three.module.min.js, GLTFLoader, SkeletonUtils, BufferGeometryUtils.

The 2D creature portraits on the draft cards (`assets/c/`) are the existing project art from earlier rounds.
Creature statistics come from Heroes of Might and Magic III: Shadow of Death (CRTRAITS via heroes.thelazy.net). Abilities come from the VCMI configs. These are game data, not assets.

Reuse notes (round 7): the Unicorn is q_horse with a procedural horn cone on the Head bone. The Centaur and Black Knight are q_horse with a rider model. Upgraded creatures reuse the base model with tint, scale and a gold rim-glow.

## Music & jingles (v9), all CC0
| File | Use | Author | Source | Licence |
|---|---|---|---|---|
| assets/audio/menu.mp3 | title / game over | Bobjt | "peacefull ville" — https://opengameart.org/content/peacefull-ville | CC0 |
| assets/audio/battle.mp3 | draft / deploy / battle | MintoDog | "Hope (Orchestral battle music)" — https://opengameart.org/content/hopeorchestral-battle-music | CC0 |
| assets/audio/boss.mp3 | boss stages | MintoDog | "Fairy Boss Battles" — https://opengameart.org/content/fairy-boss-battles | CC0 |
| assets/audio/sting.mp3, win.mp3, reward.mp3 | boss sting, boss kill, reward reveal | Kenney | "Music Jingles" (HIT15, STEEL02, PIZZI04) — https://kenney.nl/assets/music-jingles | CC0 |

All tracks were re-encoded to MP3 (72–96 kbps) with ffmpeg. Sound effects are procedural WebAudio.

## v10
- Angel / pegasus wings: procedural geometry (code in game3d.js), no external asset.
- App icons / OG image: derived from the game's own gold-dragon art and an in-game screenshot.

## v11 models (Quaternius "Ultimate Monsters", CC0, via poly.pizza)
| file | used for | source |
|---|---|---|
| q_ghost.glb | Wight / Wraith | https://static.poly.pizza/810f60a2-6e45-4c4e-a0d5-da91cd7288bd.glb |
| q_demon2.glb | Pit Fiend / Pit Lord | https://static.poly.pizza/c2e39eb4-4b8e-4d31-b014-d637bf4e15c6.glb |
| q_wizard.glb | Gog / Magog | https://static.poly.pizza/d206c071-7934-40eb-9091-35ebdf93c317.glb |
| q_hywirl.glb | Efreet / Efreet Sultan | https://static.poly.pizza/6500a805-0588-4823-bb8d-2f8ffdf338ab.glb |
| q_dragon3.glb | Bone / Ghost Dragon | https://static.poly.pizza/90ed3740-d8c4-4910-88ce-ac2ed426022d.glb |
| q_ghostskull.glb | (spare) | https://static.poly.pizza/0716bf8e-1894-4a90-8d10-34868975a239.glb |
Card portraits and badge icons are rendered at runtime from the same 3D models.

## v12 sprite pilot (?sprites=1)
`assets/spr/*.webp|json` are pre-rendered in Blender 4.2 LTS (headless, Cycles) by `tools/render.py` + `tools/pack.py` from the CC0 models already in this repo: KayKit Adventurers Knight/Rogue + KayKit Skeleton Minion (Kay Lousberg, CC0), Quaternius Dragon (CC0), Quaternius Medieval Weapons spear (CC0). No new third-party assets.

## v13 HD sprite pilots (rendered offline to sprite atlases, `?sprites=1`)
All CC0 (public domain); credit given as courtesy.
- **Swordsman** — Quaternius *Universal Base Characters* (head), *Modular Character Outfits – Fantasy* (Ranger outfit) and *Universal Animation Library* (Sword_Idle / Walk_Loop / Sword_Attack / Hit_Chest / Death01). CC0. https://quaternius.itch.io/universal-base-characters · https://quaternius.itch.io/modular-character-outfits-fantasy · https://quaternius.itch.io/universal-animation-library . Sword & shield meshes: KayKit Adventurers (Kay Lousberg), CC0.
- **Skeleton** — "Skeleton Outlaw" (rigged, animated, 2048px texture), OpenGameArt, CC0. https://opengameart.org/content/skeleton-outlaw
- **Behemoth** — "Cethiel's Dragon 3D" by Drummyfish (based on Cethiel's dragon art), OpenGameArt, CC0. https://opengameart.org/content/cethiels-dragon-3d
- Conversion tool: FBX2glTF (Meta, BSD) used offline only.

## v14 sprite pilots (`?sprites=1`) — all CC0
- **Swordsman / Archer / Pikeman** — bodies, heads and animations: Quaternius *Universal Base Characters*, *Modular Character Outfits – Fantasy* (Ranger outfit for swordsman (recoloured blue) and archer, Peasant outfit for pikeman) and *Universal Animation Library* (Sword_Idle/Attack, Pistol_Idle/Shoot, Punch_Jab, Walk_Loop, Hit_Chest, Death01) — https://quaternius.itch.io . Sword, heater shield, spear: Quaternius *Medieval Weapons Pack*; helmets: Quaternius *Knight* pack (via https://github.com/trebeljahr/quaternius-showcase). Crossbow: KayKit Adventurers (Kay Lousberg). All CC0.
- **Green Dragon** — Quaternius "Dragon Evolved" (Ultimate Monsters), https://poly.pizza/m/LlwD0QNUPj , CC0 (recoloured green).
- Skeleton (OGA Skeleton Outlaw) and Behemoth (OGA Cethiel's Dragon 3D, Drummyfish) as in v13, CC0.

## v15 sprites (`?sprites=1`) — all CC0
- **Behemoth** — "Forest Monster" by Čestmír Dammer (CDmir), OpenGameArt, CC0 — https://opengameart.org/content/forest-monster (tree removed, skin texture recoloured brown).
- **Cavalier / Centaur** — Quaternius *Animated Animals* Horse (poly.pizza, CC0) — https://poly.pizza/m/qvTrSG9pZF ; riders and centaur torso built from Quaternius *Universal Base Characters* + *Modular Character Outfits – Fantasy* + *Universal Animation Library* (CC0).
- **Monk / Angel / Goblin / Dwarf** — Quaternius UBC heads + hair (Hair_Long, Hair_Beard), Fantasy outfits (recoloured: brown monk robe, white/gold angel, green goblin skin), UAL animations. Weapons: Quaternius *Medieval Weapons* (Bow_Wooden, Sword_Golden, Axe_small, Shield_Round_2, Spear); monk staff: KayKit Adventurers (Kay Lousberg). Angel wings modelled procedurally in Blender for this project (CC0).
- **Imp** — Quaternius "Demon" (Ultimate Monsters), CC0 — https://poly.pizza/m/LnfIziKv4o
- **Walking Dead** — Quaternius "Zombie", CC0 — https://poly.pizza/m/VlXjG0N8Eg
- **Archer** now draws a wooden bow (Quaternius Medieval Weapons) — UAL has no bow clip, so the shoot is the UAL Pistol_Shoot two-arm aim with the bow held in the leading hand.
- Upgraded creatures (halberdier, marksman, crusader, zealot, champion, archangel, skeleton warrior, zombie, hobgoblin, battle dwarf, familiar, centaur captain, ancient behemoth) reuse the base atlas with a tint.

## v16 sprites (`?sprites=1`) — all CC0, no AI-generated assets
- **Griffin / Royal Griffin** — body: Quaternius *Low Poly Animals Animated* "Wolf" (poly.pizza, CC0) — https://poly.pizza/m/XU7oNeKShV (bundle: https://poly.pizza/bundle/Animated-Animal-Pack-ILAPXeUYiS), dog head removed and fur recoloured tawny/cream; eagle head, beak, ear tufts, feathered wings (flapping) and the royal collar are procedural Blender primitives made for this project (CC0). The 3D fallback for griffin is the existing Quaternius wolf (q_wolf2) with procedural wings.
- **Hell Hound / Wolf Rider** — same Quaternius Wolf (recoloured); wolf rider = goblin built from Quaternius UBC + outfits.
- **Champion / Unicorn / Pegasus / Black Knight** — Quaternius *Animated Animal Pack* Horse and White Horse (poly.pizza, CC0); unicorn horn, pegasus wings, plumes and capes are procedural primitives.
- **Restyled / new humanoids** (walking dead, imp, monk, dwarf, halberdier, marksman, crusader, zealot, hobgoblin, battle dwarf, wight, vampire, vampire lord, orc, ogre, wood elf, demon, pit fiend, all riders) — Quaternius *Universal Base Characters*, *Modular Character Outfits – Fantasy* (Peasant / Ranger outfits, recoloured textures), *Universal Animation Library*; weapons/helmets/shields: Quaternius *Medieval Weapons* + *Knight* packs. Horns, halos, capes, plumes, glowing eyes, bat wings and the monk/zealot staffs are procedural primitives (CC0).
- **Lich** — "Skeleton Outlaw" (OpenGameArt, CC0, as v13 skeleton) with a procedural robe, hood, staff and glowing eyes.
- **Dendroid Guard** — "Forest Monster" by CDmir (OpenGameArt, CC0), original bark/moss textures.
- **Red / Black / Gold / Bone dragons** — Quaternius "Dragon Evolved" (CC0) material recolours (gold: lower roughness, more specular).

## v17
No new third-party assets: the new enemy sprites (wight, vampire, orc, ogre, wolf rider, wood elf, hell hound, demon, bone dragon) use the same CC0 sources listed under v16 (Quaternius UBC/outfits/UAL/weapons, Quaternius Wolf, Quaternius Dragon Evolved) plus procedural primitives.

## v18
No new third-party assets (same CC0 sources as v16/v17: Quaternius UBC/outfits/UAL/weapons, Quaternius White Horse, Quaternius Dragon Evolved, plus procedural primitives).

## v19
No new third-party packs. Same CC0 sources as v16–v18: Quaternius Universal Base Characters / Modular Character Outfits – Fantasy / Universal Animation Library / weapons, Quaternius White Horse and Animated Animals (horse, wolf), plus procedural Blender primitives (halo, hood, cape pleats, horns, spikes, flames, wings, extra cerberus heads) made for this project (CC0).
- **Dendroid Guard** — "Forest Monster" by Čestmír Dammer (CDmir), OpenGameArt, CC0 — https://opengameart.org/content/forest-monster (used with its tree intact).
- **Pegasus** — Quaternius White Horse (CC0) with procedural feathered wings.
- **Black Knight** — Quaternius Animated Animals Horse (CC0), rider from Quaternius UBC + outfits (CC0).

## v20
No new third-party packs; every asset is CC0.
- Sprites for gremlin, mage, genie, naga, giant, stone gargoyle, stone golem, troglodyte, harpy, medusa, minotaur, gnoll and lizardman are built from Quaternius *Universal Base Characters*, *Modular Character Outfits – Fantasy*, *Universal Animation Library* and weapon models. Skin and outfit textures were recoloured with `tools/tint.py`. Horns, tails, turbans, snake hair, snouts, rocks, wings and crowns are procedural Blender primitives.
- Beholder and serpent fly are built entirely from procedural primitives, driven by a hidden UAL skeleton.
- Manticore and basilisk use the Quaternius *Animated Animals* Wolf; gorgon uses the Quaternius Horse; wyvern and hydra use Quaternius *Dragon Evolved* (Ultimate Monsters). All are recoloured, with procedural parts added: wings, scorpion tail, mane, spikes, horns, and extra hydra heads/necks.
- The 3D fallbacks reuse the CC0 models already listed above (KayKit and Quaternius), tinted per unit.

## v22 — Gem TD mode
- No new assets. The gems, pedestals, rocks and checkpoint markers are procedural three.js geometry. Enemies reuse the CC0 creature sprite atlases listed above, and the sounds are the existing procedural `audio.js` set.
- The game rules are inspired by the Warcraft III custom map *Gem TD*. No content from it is used.

## v23 — Gem TD polish
- The tower pedestals, special towers and cut gems in `assets/td/towers.glb` are original meshes, modelled procedurally in Blender 4.2 by `tools/td_models/build_towers.py`. No third-party assets are used.

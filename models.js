// 3D model assignment per HoMM3 creature (all CC0 - see CREDITS.md). h = target height in grid cells (x UNIT_SCALE in renderer).
// Upgraded creatures reuse the base creature's model with a size bump, tint shift and a golden glow (derived at the bottom).
(function(root){
const KK={idle:'Idle',walk:'Walking_A',run:'Running_A',atk:'1H_Melee_Attack_Chop',shoot:'1H_Ranged_Shoot',hit:'Hit_A',death:'Death_A',cheer:'Cheer',imp:0.42};
const KS=Object.assign({},KK,{walk:'Walking_D_Skeletons'});
const QC={idle:'Idle',walk:'Walk',run:'Run',atk:'Weapon',shoot:'Weapon',hit:'HitReact',death:'Death',imp:0.45};
const QP=Object.assign({},QC,{atk:'Punch',shoot:'Punch'});
const QE={idle:'Idle',walk:'Walk',run:'Run',atk:'Attack',shoot:'Attack',hit:'HitRecieve',death:'Death',imp:0.5};
const QA={idle:'Idle',walk:'Walk',run:'Gallop',atk:'Attack',hit:'Idle_HitReact_Left',death:'Death',imp:0.45};
const QH=Object.assign({},QA,{atk:'Attack_Kick'});
const QD={idle:'Dragon_Flying',walk:'Dragon_Flying',run:'Dragon_Flying',atk:'Dragon_Attack',hit:'Dragon_Hit',death:'Dragon_Death',imp:0.45};
const KKW=['1H_Sword_Offhand','Badge_Shield','Rectangle_Shield','Round_Shield','Spike_Shield','1H_Sword','2H_Sword','1H_Axe_Offhand','Barbarian_Round_Shield','1H_Axe','2H_Axe','Mug','Spellbook','Spellbook_open','1H_Wand','2H_Staff','Knife_Offhand','1H_Crossbow','2H_Crossbow','Knife','Throwable'];
const SPEAR={f:'n_medieval_weapons_pack_Spear',bone:'handslot.r',len:0.62,rot:[Math.PI/2,0,0]};
const HORN={f:'n_medieval_weapons_pack_Spear',bone:'Head',len:0.5,rot:[0,0,0],horn:1};
const M={
  // ---- Castle ----
  pikeman:{f:'k_Knight',c:KK,h:0.6,show:['Rectangle_Shield'],props:[SPEAR],atk:'1H_Melee_Attack_Stab',tint:0xb8c8ff,note:'KayKit Knight + spear'},
  archer:{f:'k_Rogue_Hooded',c:KK,h:0.6,show:['2H_Crossbow'],note:'KayKit Rogue (hooded), crossbow'},
  swordsman:{f:'k_Knight',c:KK,h:0.66,show:['1H_Sword','Badge_Shield'],note:'KayKit Knight, sword + badge shield'},
  monk:{f:'k_Mage',c:KK,h:0.64,show:['2H_Staff'],shoot:'Spellcast_Shoot',tint:0xfff0d0,note:'KayKit Mage, staff'},
  cavalier:{f:'q_horse',c:QH,h:0.78,rider:{f:'k_Knight',show:['1H_Sword','Round_Shield'],clip:'Sit_Chair_Idle',atk:'1H_Melee_Attack_Chop',h:0.62,bone:'Body',y:0.18},tint:0xd8c2a0,note:'Quaternius Horse + KayKit Knight rider'},
  angel:{f:'k_Knight',c:KK,h:0.95,show:['2H_Sword'],atk:'2H_Melee_Attack_Chop',tint:0xfff6dc,fly:0.3,glowC:0xfff0a0,note:'KayKit Knight, white/gold, hovering + halo glow (no wings)'},
  // ---- Necropolis ----
  skeleton:{f:'k_Skeleton_Minion',c:KS,h:0.56,props:[{f:'Skeleton_Blade',bone:'handslot.r',len:0.38}],note:'KayKit Skeleton Minion + blade'},
  walkingDead:{f:'q_zombie',c:QP,h:0.6,tint:0xb0c890,note:'Quaternius Zombie'},
  wight:{f:'k_Skeleton_Rogue',c:KS,h:0.58,fly:0.22,tint:0xa8c8ff,note:'KayKit Skeleton Rogue, spectral blue, floating'},
  vampire:{f:'k_Rogue_Hooded',c:KK,h:0.64,show:['Knife','Knife_Offhand'],atk:'1H_Melee_Attack_Stab',tint:0x8a3048,fly:0.12,note:'KayKit Rogue, crimson tint, hovering'},
  lich:{f:'k_Skeleton_Mage',c:KS,h:0.68,props:[{f:'Skeleton_Staff',bone:'handslot.r',len:0.6}],shoot:'Spellcast_Shoot',tint:0xd8c8ff,note:'KayKit Skeleton Mage + staff'},
  blackKnight:{f:'q_horse',c:QH,h:0.8,tint:0x3a3440,rider:{f:'k_Skeleton_Warrior',clip:'Sit_Chair_Idle',atk:'1H_Melee_Attack_Chop',h:0.6,bone:'Body',y:0.18},note:'Quaternius Horse (black) + KayKit Skeleton Warrior rider'},
  boneDragon:{f:'q_dragon2',c:QD,h:1.0,tint:0xe8e2cc,fly:0.25,note:'Quaternius Dragon, bone-white'},
  // ---- Stronghold ----
  goblin:{f:'q_goblin',c:QC,h:0.46,note:'Quaternius Goblin'},
  wolfRider:{f:'q_wolf2',c:QA,h:0.5,rider:{f:'q_goblin',clip:'Idle',atk:'Weapon',h:0.4,bone:'Body',y:0.12},tint:0x9a8a78,note:'Quaternius Wolf + Goblin rider'},
  orc:{f:'q_orc',c:QC,h:0.64,note:'Quaternius Orc (axe thrower)'},
  ogre:{f:'q_yeti2',c:QE,h:0.85,tint:0xc8a070,note:'Quaternius Yeti (enemy pack), tan tint'},
  cyclops:{f:'q_giant',c:QE,h:1.0,tint:0x9aa0a8,note:'Quaternius Giant, stone grey (rock thrower)'},
  behemoth:{f:'q_yeti',c:QP,h:1.2,tint:0x8a6a50,note:'Quaternius Yeti, big brown'},
  // ---- Rampart ----
  centaur:{f:'q_horse',c:QH,h:0.72,tint:0x8fb070,rider:{f:'k_Barbarian',show:['1H_Axe'],clip:'Sit_Chair_Idle',atk:'1H_Melee_Attack_Stab',h:0.55,bone:'Body',y:0.16},note:'Quaternius Horse + KayKit Barbarian (centaur stand-in)'},
  dwarf:{f:'k_Barbarian',c:KK,h:0.46,show:['1H_Axe','Barbarian_Round_Shield'],sx:1.25,tint:0xffc9a0,note:'KayKit Barbarian, squat scale'},
  woodElf:{f:'k_Rogue_Hooded',c:KK,h:0.62,show:['1H_Crossbow'],tint:0x9adf8a,note:'KayKit Rogue, forest-green tint'},
  pegasus:{f:'q_horse',c:QH,h:0.75,tint:0xf4f4ff,fly:0.3,note:'Quaternius Horse, white, flying (no wings)'},
  dendroidGuard:{f:'q_giant',c:QE,h:0.9,tint:0x8fae5a,note:'Quaternius Giant (wooden), leafy tint'},
  unicorn:{f:'q_horse',c:QH,h:0.8,tint:0xffffff,props:[HORN],note:'Quaternius Horse, white + horn'},
  greenDragon:{f:'q_dragon2',c:QD,h:1.05,tint:0x5ccf5c,fly:0.25,note:'Quaternius Dragon, green'},
  // ---- Inferno ----
  imp:{f:'q_demon',c:QP,h:0.42,tint:0xff8a70,note:'Quaternius Demon, small red'},
  gog:{f:'q_goblin',c:QC,h:0.52,tint:0xff6a40,note:'Quaternius Goblin, fire-red (fireball thrower)'},
  hellHound:{f:'q_wolf2',c:QA,h:0.55,tint:0xd04020,note:'Quaternius Wolf, hellfire red'},
  demon:{f:'q_demon',c:QC,h:0.74,note:'Quaternius Demon'},
  pitFiend:{f:'q_demon',c:QC,h:0.86,tint:0x7a4aa0,note:'Quaternius Demon, purple, bigger'},
  efreet:{f:'q_demon',c:QP,h:0.8,tint:0xffa030,fly:0.25,note:'Quaternius Demon, flame orange, floating'},
  devil:{f:'q_demon',c:QC,h:1.15,tint:0x50202a,note:'Quaternius Demon, near-black, large'},
  // ---- boss-only / neutral ----
  redDragon:{f:'q_dragon2',c:QD,h:1.15,tint:0xd84030,fly:0.25,note:'Quaternius Dragon, red'},
  giant:{f:'q_giant',c:QE,h:1.35,note:'Quaternius Giant'},
  troll:{f:'q_yeti',c:QP,h:0.9,tint:0x9fc59a,note:'Quaternius Yeti, mossy'},
};
const UPG={pikeman:'halberdier',archer:'marksman',swordsman:'crusader',monk:'zealot',cavalier:'champion',angel:'archangel',
  skeleton:'skeletonWarrior',walkingDead:'zombie',wight:'wraith',vampire:'vampireLord',lich:'powerLich',blackKnight:'dreadKnight',boneDragon:'ghostDragon',
  goblin:'hobgoblin',wolfRider:'wolfRaider',orc:'orcChieftain',ogre:'ogreMage',cyclops:'cyclopsKing',behemoth:'ancientBehemoth',
  centaur:'centaurCaptain',dwarf:'battleDwarf',woodElf:'grandElf',pegasus:'silverPegasus',dendroidGuard:'dendroidSoldier',unicorn:'warUnicorn',greenDragon:'goldDragon',
  imp:'familiar',gog:'magog',hellHound:'cerberus',demon:'hornedDemon',pitFiend:'pitLord',efreet:'efreetSultan',devil:'archDevil',redDragon:'blackDragon'};
// per-upgrade visual tweaks (tint override / extra hand item); everything else inherits + glow
const UPV={halberdier:{tint:0xd8e4ff},crusader:{show:['2H_Sword'],atk:'2H_Melee_Attack_Chop',tint:0xffe0a0},marksman:{tint:0xc8ffd0},zealot:{tint:0xffd890},
  skeletonWarrior:{f:'k_Skeleton_Warrior',props:[{f:'Skeleton_Axe',bone:'handslot.r',len:0.36},{f:'Skeleton_Shield_Small_A',bone:'handslot.l',len:0.3}],tint:null},
  zombie:{tint:null},goldDragon:{tint:0xffc840},ghostDragon:{tint:0xb8d8ff},blackDragon:{tint:0x302838},archDevil:{tint:0x701020},
  powerLich:{tint:0xb090ff},grandElf:{tint:0x7ad070},silverPegasus:{tint:0xd8e8ff},familiar:{tint:0xff5040},cerberus:{tint:0x902010},efreetSultan:{tint:0xffd040}};
for(const b in UPG){const u=UPG[b];if(!M[b])continue;M[u]=Object.assign({},M[b],{h:M[b].h*1.07,glow:1},UPV[u]||{});M[u].note=(M[b].note||'')+' · upgraded: larger + golden glow';}
const PROPS=['n_CommonTree_1','n_CommonTree_3','n_PineTree_1','n_Bush_1','n_BushBerries_1','n_Rock_1','n_Rock_2','n_Rock_Moss_1','n_medieval_village_pack_Fence','n_Flowers'];
const api={M,KKW,PROPS,UPG};if(typeof module!=='undefined')module.exports=api;else root.MODELS=api;
})(this);

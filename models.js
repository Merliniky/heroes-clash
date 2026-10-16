// 3D model assignment per HoMM3 creature (all CC0 - see CREDITS.md). h = target height in grid cells.
// fam: clip-name family. show: KayKit hand items to keep visible. props: extra CC0 meshes on a bone.
(function(root){
const KK={idle:'Idle',walk:'Walking_A',run:'Running_A',atk:'1H_Melee_Attack_Chop',shoot:'1H_Ranged_Shoot',hit:'Hit_A',death:'Death_A',cheer:'Cheer',imp:0.42};
const KS=Object.assign({},KK,{walk:'Walking_D_Skeletons'});
const QC={idle:'Idle',walk:'Walk',run:'Run',atk:'Weapon',shoot:'Weapon',hit:'HitReact',death:'Death',imp:0.45};
const QE={idle:'Idle',walk:'Walk',run:'Run',atk:'Attack',shoot:'Attack',hit:'HitRecieve',death:'Death',imp:0.5};
const QA={idle:'Idle',walk:'Walk',run:'Gallop',atk:'Attack',hit:'Idle_HitReact_Left',death:'Death',imp:0.45};
const QD={idle:'Dragon_Flying',walk:'Dragon_Flying',run:'Dragon_Flying',atk:'Dragon_Attack',hit:'Dragon_Hit',death:'Dragon_Death',imp:0.45};
const KKW=['1H_Sword_Offhand','Badge_Shield','Rectangle_Shield','Round_Shield','Spike_Shield','1H_Sword','2H_Sword','1H_Axe_Offhand','Barbarian_Round_Shield','1H_Axe','2H_Axe','Mug','Spellbook','Spellbook_open','1H_Wand','2H_Staff','Knife_Offhand','1H_Crossbow','2H_Crossbow','Knife','Throwable'];
const SPEAR={f:'n_medieval_weapons_pack_Spear',bone:'handslot.r',len:0.62,rot:[Math.PI/2,0,0]};
const M={
  pikeman:{f:'k_Knight',c:KK,h:0.6,show:['Rectangle_Shield'],props:[SPEAR],atk:'1H_Melee_Attack_Stab',tint:0xb8c8ff,note:'KayKit Knight + Quaternius spear, steel-blue tint'},
  swordsman:{f:'k_Knight',c:KK,h:0.66,show:['1H_Sword','Badge_Shield'],note:'KayKit Knight, sword + badge shield'},
  crusader:{f:'k_Knight',c:KK,h:0.7,show:['2H_Sword'],atk:'2H_Melee_Attack_Chop',tint:0xffe0a0,note:'KayKit Knight, two-hand sword, gold tint'},
  archer:{f:'k_Rogue_Hooded',c:KK,h:0.6,show:['2H_Crossbow'],shoot:'1H_Ranged_Shoot',note:'KayKit Rogue (hooded), crossbow'},
  monk:{f:'k_Mage',c:KK,h:0.64,show:['2H_Staff'],shoot:'Spellcast_Shoot',tint:0xfff0d0,note:'KayKit Mage, staff'},
  cavalier:{f:'q_horse',c:QA,h:0.78,atk:'Attack_Kick',rider:{f:'k_Knight',show:['1H_Sword','Round_Shield'],clip:'Sit_Chair_Idle',atk:'1H_Melee_Attack_Slice_Diagonal',h:0.62,bone:'Body',y:0.18},tint:0xd8c2a0,note:'Quaternius Horse + KayKit Knight rider'},
  battleDwarf:{f:'k_Barbarian',c:KK,h:0.48,show:['1H_Axe','Barbarian_Round_Shield'],sx:1.25,tint:0xffc9a0,note:'KayKit Barbarian, squat/wide scale, axe + shield'},
  greenDragon:{f:'q_dragon2',c:QD,h:1.05,tint:0x5ccf5c,fly:0.25,note:'Quaternius Dragon, green tint'},
  boneDragon:{f:'q_dragon2',c:QD,h:1.0,tint:0xe8e2cc,fly:0.25,note:'Quaternius Dragon, bone-white tint'},
  giant:{f:'q_giant',c:QE,h:1.35,note:'Quaternius Giant'},
  skeleton:{f:'k_Skeleton_Minion',c:KS,h:0.56,props:[{f:'Skeleton_Blade',bone:'handslot.r',len:0.38}],note:'KayKit Skeleton Minion + blade'},
  skeletonWarrior:{f:'k_Skeleton_Warrior',c:KS,h:0.6,props:[{f:'Skeleton_Axe',bone:'handslot.r',len:0.36},{f:'Skeleton_Shield_Small_A',bone:'handslot.l',len:0.3}],note:'KayKit Skeleton Warrior + axe + shield'},
  zombie:{f:'q_zombie',c:Object.assign({},QC,{atk:'Punch'}),h:0.62,note:'Quaternius Zombie'},
  lich:{f:'k_Skeleton_Mage',c:KS,h:0.68,props:[{f:'Skeleton_Staff',bone:'handslot.r',len:0.6}],shoot:'Spellcast_Shoot',tint:0xd8c8ff,note:'KayKit Skeleton Mage + staff'},
  goblin:{f:'q_goblin',c:QC,h:0.46,note:'Quaternius Goblin'},
  wolfRider:{f:'q_wolf2',c:QA,h:0.5,rider:{f:'q_goblin',clip:'Idle',atk:'Weapon',h:0.4,bone:'Body',y:0.12},tint:0x9a8a78,note:'Quaternius Wolf + Quaternius Goblin rider'},
  orc:{f:'q_orc',c:QC,h:0.64,note:'Quaternius Orc (axe thrower)'},
  troll:{f:'q_yeti',c:Object.assign({},QC,{atk:'Punch'}),h:0.9,tint:0x9fc59a,note:'Quaternius Yeti, mossy tint'},
  imp:{f:'q_demon',c:Object.assign({},QC,{atk:'Punch'}),h:0.42,tint:0xff8a70,note:'Quaternius Demon, small + red tint'},
  demon:{f:'q_demon',c:QC,h:0.74,note:'Quaternius Demon'},
};
const PROPS=['n_CommonTree_1','n_CommonTree_3','n_PineTree_1','n_Bush_1','n_BushBerries_1','n_Rock_1','n_Rock_2','n_Rock_Moss_1','n_medieval_village_pack_Fence','n_Flowers','n_Grass'];
root.MODELS={M,KKW,PROPS};
})(this);

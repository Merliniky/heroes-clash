import re,os,glob
R='/workspace/heroes-clash/';s=open(R+'game3d.js').read()
have=sorted(os.path.basename(f)[:-5] for f in glob.glob(R+'assets/spr/*.json'))
order=['pikeman','halberdier','archer','marksman','griffin','royalGriffin','swordsman','crusader','monk','zealot','cavalier','champion','angel','archangel',
 'skeleton','walkingDead','wight','vampire','vampireLord','lich','blackKnight','boneDragon',
 'goblin','hobgoblin','wolfRider','orc','ogre','behemoth',
 'centaur','dwarf','battleDwarf','woodElf','pegasus','dendroidGuard','unicorn','greenDragon','goldDragon',
 'imp','gog','hellHound','demon','pitFiend','redDragon','blackDragon']
units=[u for u in order if u in have]+[u for u in have if u not in order]
alias={'skeletonWarrior':('skeleton',0xc8d4ff),'zombie':('walkingDead',0xc8e8a0),'familiar':('imp',0xff9a7a),'centaurCaptain':('centaur',0xd8e8c0),
 'magog':('gog',0xffb070),'powerLich':('lich',0xd0b0ff),'ancientBehemoth':('behemoth',0xffb890),
 'wraith':('wight',0xc0ccff),'dreadKnight':('blackKnight',0xffb0a0),'ghostDragon':('boneDragon',0xb8d8ff),
 'wolfRaider':('wolfRider',0xffe0c0),'orcChieftain':('orc',0xffe0b0),'ogreMage':('ogre',0xc8d0ff),'cyclops':('ogre',0xd8e0c8),'cyclopsKing':('ogre',0xffe0a0),'roc':('griffin',0xa08060),'thunderbird':('griffin',0x90a0ff),
 'grandElf':('woodElf',0xe8ffd8),'silverPegasus':('pegasus',0xd8e8ff),'dendroidSoldier':('dendroidGuard',0xe0ffc0),'warUnicorn':('unicorn',0xfff0d0),
 'cerberus':('hellHound',0xffb0a0),'hornedDemon':('demon',0xffc8a0),'pitLord':('pitFiend',0xffd0a0),'devil':('pitFiend',0x9a6070),'archDevil':('pitFiend',0x8a4050),
 # fallbacks while dedicated atlases render
 'halberdier':('pikeman',0xc4d0ff),'marksman':('archer',0xc8f0c0),'crusader':('swordsman',0xffd28a),'zealot':('monk',0xffe2a8),'champion':('cavalier',0xdde4ff),'archangel':('angel',0xffe6a0),
 'hobgoblin':('goblin',0xffc48a),'battleDwarf':('dwarf',0xffcfa0),'vampireLord':('vampire',0xffc0c0),'goldDragon':('greenDragon',0xffc840),'blackDragon':('greenDragon',0x605868)}
al={k:v for k,v in alias.items() if k not in units and v[0] in units}
js="const SPR_ALIAS={"+",".join(f"{k}:['{b}',0x{t:06x}]" for k,(b,t) in al.items())+"};"
s=re.sub(r"const SPR_UNITS=\[[^\]]*\];","const SPR_UNITS=["+",".join(f"'{u}'" for u in units)+"];",s)
s=re.sub(r"const SPR_ALIAS=\{.*?\};",js,s,flags=re.S)
open(R+'game3d.js','w').write(s);print(len(units),units);print(len(al),list(al))

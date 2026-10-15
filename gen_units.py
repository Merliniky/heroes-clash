# Generates units.js: exact HoMM3 SoD stats (heroes.thelazy.net "List of creatures" == CRTRAITS.TXT)
# + VCMI config/creatures/*.json (doubleWide, ability names). Run: python3 gen_units.py
import json
S=json.load(open('/tmp/h3S.json'));V=json.load(open('/tmp/vcmiab.json'))
# id, wiki name, vcmi id, 中文名, fx/proj, implemented ability codes, art key
T={
'castle':[('pikeman','Pikeman','pikeman','枪兵','thrust','joustImm','R:pikeman'),('halberdier','Halberdier','halberdier','戟兵','thrust','joustImm',''),
 ('archer','Archer','archer','弓箭手','p:bolt','','R:crossbowman'),('marksman','Marksman','marksman','神射手','p:bolt','dbl',''),
 ('griffin','Griffin','griffin','狮鹫','dive','retal2','R:griffin'),('royalGriffin','Royal Griffin','royalGriffin','皇家狮鹫','dive','retal99',''),
 ('swordsman','Swordsman','swordsman','剑士','slash','','R:swordsman'),('crusader','Crusader','crusader','十字军','slash','dbl',''),
 ('monk','Monk','monk','僧侣','p:holy','','R:monk'),('zealot','Zealot','zealot','狂热者','p:holy','noMP',''),
 ('cavalier','Cavalier','cavalier','骑士','charge','joust','R:cavalier'),('champion','Champion','champion','冠军骑士','charge','joust',''),
 ('angel','Angel','angel','天使','flame','hate:devil,archDevil','R:angel'),('archangel','Archangel','archangel','大天使','flame','hate:devil,archDevil','')],
'rampart':[('centaur','Centaur','centaur','半人马','thrust','',''),('centaurCaptain','Centaur Captain','centaurCaptain','半人马队长','thrust','',''),
 ('dwarf','Dwarf','dwarf','矮人','cleave','',''),('battleDwarf','Battle Dwarf','battleDwarf','战斗矮人','cleave','',''),
 ('woodElf','Wood Elf','woodElf','木精灵','p:arrow','',''),('grandElf','Grand Elf','grandElf','大精灵','p:arrow','dbl',''),
 ('pegasus','Pegasus','pegasus','飞马','charge','',''),('silverPegasus','Silver Pegasus','silverPegasus','银飞马','charge','',''),
 ('dendroidGuard','Dendroid Guard','dendroidGuard','树精卫士','cleave','',''),('dendroidSoldier','Dendroid Soldier','dendroidSoldier','树精战士','cleave','',''),
 ('unicorn','Unicorn','unicorn','独角兽','charge','stun:0.2:致盲',''),('warUnicorn','War Unicorn','warUnicorn','战斗独角兽','charge','stun:0.2:致盲',''),
 ('greenDragon','Green Dragon','greenDragon','绿龙','breath','breath',''),('goldDragon','Gold Dragon','goldDragon','金龙','breath','breath','')],
'tower':[('gremlin','Gremlin','gremlin','小魔怪','cleave','',''),('masterGremlin','Master Gremlin','masterGremlin','高级小魔怪','p:bolt','',''),
 ('stoneGargoyle','Stone Gargoyle','stoneGargoyle','石像鬼','claw','unliving',''),('obsidianGargoyle','Obsidian Gargoyle','obsidianGargoyle','黑曜石像鬼','claw','unliving',''),
 ('stoneGolem','Stone Golem','stoneGolem','石魔像','cleave','unliving',''),('ironGolem','Iron Golem','ironGolem','铁魔像','cleave','unliving',''),
 ('mage','Mage','mage','法师','p:holy','noMP',''),('archMage','Arch Mage','archMage','大法师','p:holy','noMP',''),
 ('genie','Genie','genie','灯神','claw','hate:efreet,efreetSultan',''),('masterGenie','Master Genie','masterGenie','高级灯神','claw','hate:efreet,efreetSultan',''),
 ('naga','Naga','naga','娜迦','slash','noRet',''),('nagaQueen','Naga Queen','nagaQueen','娜迦女王','slash','noRet',''),
 ('giant','Giant','giant','巨人','cleave','',''),('titan','Titan','titan','泰坦','p:bolt2','noMP;hate:blackDragon','')],
'inferno':[('imp','Imp','imp','小恶魔','claw','',''),('familiar','Familiar','familiar','魔仆','claw','',''),
 ('gog','Gog','gog','歌革','p:fire','',''),('magog','Magog','magog','玛各','p:fire','fireball',''),
 ('hellHound','Hell Hound','hellHound','地狱猎犬','bite','',''),('cerberus','Cerberus','cerberus','地狱三头犬','bite','noRet;allAdj',''),
 ('demon','Demon','demon','恶魔','claw','',''),('hornedDemon','Horned Demon','hornedDemon','角魔','cleave','',''),
 ('pitFiend','Pit Fiend','pitFiend','深渊魔','cleave','',''),('pitLord','Pit Lord','pitLord','深渊领主','flame','',''),
 ('efreet','Efreeti','efreet','伊夫利特','flame','hate:genie,masterGenie',''),('efreetSultan','Efreet Sultan','efreetSultan','伊夫利特苏丹','slash','hate:genie,masterGenie;fireShield',''),
 ('devil','Devil','devil','魔鬼','thrust','noRet;hate:angel,archangel',''),('archDevil','Arch Devil','archDevil','大魔鬼','cleave','noRet;hate:angel,archangel','')],
'necro':[('skeleton','Skeleton','skeleton','骷髅兵','slash','undead',''),('skeletonWarrior','Skeleton Warrior','skeletonWarrior','骷髅勇士','slash','undead',''),
 ('walkingDead','Walking Dead','walkingDead','行尸','bite','undead',''),('zombie','Zombie','zombieLord','僵尸','bite','undead',''),
 ('wight','Wight','wight','尸妖','claw','undead;regen',''),('wraith','Wraith','wraith','怨灵','claw','undead;regen',''),
 ('vampire','Vampire','vampire','吸血鬼','bite','undead;noRet',''),('vampireLord','Vampire Lord','vampireLord','吸血鬼王','bite','undead;noRet;drain',''),
 ('lich','Lich','lich','巫妖','p:death','undead;cloud',''),('powerLich','Power Lich','powerLich','大巫妖','p:death','undead;cloud',''),
 ('blackKnight','Black Knight','blackKnight','黑骑士','charge','undead;curse',''),('dreadKnight','Dread Knight','dreadKnight','恐怖骑士','charge','undead;curse;deathBlow',''),
 ('boneDragon','Bone Dragon','boneDragon','骨龙','bite','undead',''),('ghostDragon','Ghost Dragon','ghostDragon','幽灵龙','bite','undead','')],
'dungeon':[('troglodyte','Troglodyte','troglodyte','穴居人','cleave','',''),('infernalTroglodyte','Infernal Troglodyte','infernalTroglodyte','地狱穴居人','cleave','',''),
 ('harpy','Harpy','harpy','鹰身女妖','claw','',''),('harpyHag','Harpy Hag','harpyHag','鹰身女巫','claw','noRet',''),
 ('beholder','Beholder','beholder','眼魔','p:death','noMP',''),('evilEye','Evil Eye','evilEye','邪眼','p:death','noMP',''),
 ('medusa','Medusa','medusa','美杜莎','p:arrow','noMP;stun:0.2:石化',''),('medusaQueen','Medusa Queen','medusaQueen','美杜莎女王','p:arrow','noMP;stun:0.2:石化',''),
 ('minotaur','Minotaur','minotaur','牛头人','cleave','',''),('minotaurKing','Minotaur King','minotaurKing','牛头人王','cleave','',''),
 ('manticore','Manticore','manticore','蝎尾狮','bite','',''),('scorpicore','Scorpicore','scorpicore','蝎尾魔狮','bite','stun:0.2:麻痹',''),
 ('redDragon','Red Dragon','redDragon','红龙','breath','breath',''),('blackDragon','Black Dragon','blackDragon','黑龙','breath','breath;hate:titan','')],
'stronghold':[('goblin','Goblin','goblin','哥布林','slash','',''),('hobgoblin','Hobgoblin','hobgoblin','大哥布林','cleave','',''),
 ('wolfRider','Wolf Rider','goblinWolfRider','狼骑兵','bite','',''),('wolfRaider','Wolf Raider','hobgoblinWolfRider','狼骑掠夺者','bite','dbl',''),
 ('orc','Orc','orc','兽人','p:axe','',''),('orcChieftain','Orc Chieftain','orcChieftain','兽人酋长','p:axe','',''),
 ('ogre','Ogre','ogre','食人魔','cleave','',''),('ogreMage','Ogre Mage','ogreMage','食人魔法师','cleave','',''),
 ('roc','Roc','roc','大鹏','dive','',''),('thunderbird','Thunderbird','thunderbird','雷鸟','dive','lightning',''),
 ('cyclops','Cyclops','cyclop','独眼巨人','p:rock','',''),('cyclopsKing','Cyclops King','cyclopKing','独眼巨人王','p:rock','',''),
 ('behemoth','Behemoth','behemoth','比蒙','bite','ignoreDef:0.4',''),('ancientBehemoth','Ancient Behemoth','ancientBehemoth','远古比蒙','bite','ignoreDef:0.8','')],
'fortress':[('gnoll','Gnoll','gnoll','豺狼人','cleave','',''),('gnollMarauder','Gnoll Marauder','gnollMarauder','豺狼掠夺者','cleave','',''),
 ('lizardman','Lizardman','lizardman','蜥蜴人','p:arrow','',''),('lizardWarrior','Lizard Warrior','lizardWarrior','蜥蜴勇士','p:arrow','',''),
 ('serpentFly','Serpent Fly','serpentFly','毒蝇','bite','',''),('dragonFly','Dragon Fly','fireDragonFly','龙蝇','bite','',''),
 ('basilisk','Basilisk','basilisk','石化蜥蜴','bite','stun:0.2:石化',''),('greaterBasilisk','Greater Basilisk','greaterBasilisk','大石化蜥蜴','bite','stun:0.2:石化',''),
 ('gorgon','Gorgon','gorgon','蛮牛','charge','',''),('mightyGorgon','Mighty Gorgon','mightyGorgon','大蛮牛','charge','deathStare',''),
 ('wyvern','Wyvern','wyvern','双足飞龙','bite','',''),('wyvernMonarch','Wyvern Monarch','wyvernMonarch','双足飞龙王','bite','',''),
 ('hydra','Hydra','hydra','九头蛇','bite','noRet;allAdj',''),('chaosHydra','Chaos Hydra','chaosHydra','混沌九头蛇','bite','noRet;allAdj','')],
'neutral':[('peasant','Peasant','peasant','农民','thrust','',''),('boar','Boar','boar','野猪','bite','',''),('rogue','Rogue','rogue','盗贼','slash','',''),
 ('nomad','Nomad','nomad','游牧民','slash','',''),('troll','Troll','troll','巨魔','cleave','regen','')],
}
FN={'castle':'城堡','rampart':'壁垒','tower':'塔楼','inferno':'地狱','necro':'墓园','dungeon':'地下城','stronghold':'据点','fortress':'要塞','neutral':'中立'}
# H3 specials that are spell/morale/luck/siege-related -> listed only
UNIMPL={'Resistance':'魔法抗性','Magic damper':'魔法抑制','Binding':'缠绕（禁止移动）','Aura of Resistance':'抗魔光环','spells immunity':'魔法免疫','Magic immunity':'魔法免疫',
 'Spell damage resistance':'法术伤害抗性','Mind spells immunity':'免疫心智魔法','Magic channel':'魔法通道','Magic channeler':'魔法通道','Spellcaster':'施法','Summon demons':'召唤恶魔',
 'Fire immunity':'免疫火系','Teleporting':'瞬移','Luck':'敌方幸运-1','Morale +1':'士气+1','Morale -1':'敌方士气-1','Positive Morale':'士气始终为正','Disease':'疾病','Mana drain':'吸取魔法',
 'Aging':'衰老','Resurrection':'复活','Strike and return':'攻击后返回','Weakness':'虚弱','Dispels':'驱散增益','Can attack siege walls':'攻城','No obstacle penalty':'无障碍惩罚',
 'Immune to Blinding':'免疫致盲/石化','Natural Fire Shield':None,'Lightning':None,'Poisonous':'中毒','Death stare':None}
out={};order={}
for fac,rows in T.items():
  order[fac]=[]
  for i,(id,wn,vid,zh,fx,ab,art) in enumerate(rows):
    s=S[wn];v=V.get(vid,{});lvl=int(s['lvl'].rstrip('+'));up=s['lvl'].endswith('+')
    if fac=='neutral':up=False
    shots=0;import re
    m=re.search(r'Ranged \((\d+)',s['sp'])
    if m:shots=int(m.group(1))
    fly='Flying' in s['sp'];dw=bool(v.get('dw'))
    big=lvl==7 and (dw or 'Dragon' in wn or 'Angel' in wn.title() or wn in('Archangel','Giant','Titan','Devil','Arch Devil'))
    if wn in('Giant','Titan','Devil','Arch Devil','Angel','Archangel'):big=True
    u=dict(n=zh,h3=wn,fac=fac,lvl=lvl,up=up,a=s['a'],d=s['d'],dmg=[s['mn'],s['mx']],hp=s['hp'],spd=s['spd'],shots=shots,g=s['g'],v=s['v'],cost=s['cost'],rare=int(s['rare'].split()[0]) if s['rare'] else 0,
      fw=2 if (dw or big) else 1,fh=2 if big else 1,sp=s['sp'],vab=v.get('ab',[]))
    if fly:u['fly']=1
    if dw and not fly and wn not in('Naga','Naga Queen','Medusa','Medusa Queen'):u['quad']=1
    if wn in('Griffin','Royal Griffin','Pegasus','Silver Pegasus','Manticore','Scorpicore','Green Dragon','Gold Dragon','Red Dragon','Black Dragon','Bone Dragon','Ghost Dragon','Wyvern','Wyvern Monarch','Hell Hound','Cerberus','Boar','Basilisk','Greater Basilisk','Gorgon','Mighty Gorgon','Hydra','Chaos Hydra','Behemoth','Ancient Behemoth','Unicorn','War Unicorn','Black Knight','Dread Knight','Nomad','Wolf Rider','Wolf Raider','Centaur','Centaur Captain','Champion','Cavalier'):u['quad']=1
    if fx.startswith('p:'):u['proj']=fx[2:];u['fx']='slash'
    else:u['fx']=fx
    A={}
    for c in filter(None,ab.split(';')):
      k,*r=c.split(':')
      if k=='retal2':A['retal']=2
      elif k=='retal99':A['retal']=99
      elif k=='hate':A['hate']={t:0.5 for t in r[0].split(',')}
      elif k=='stun':A['stun']=[float(r[0]),r[1]]
      elif k=='ignoreDef':A['ignoreDef']=float(r[0])
      else:A[k]=1
    if 'Undead' in s['sp']:A['undead']=1
    if wn=='Cavalier' or wn=='Champion':A['joust']=0.05
    u['ab']=A
    notes=[]
    for key,zhn in UNIMPL.items():
      if key in s['sp'] and zhn and zhn not in notes:notes.append(zhn)
    u['notes']=notes
    u['art']=art[2:] if art.startswith('R:') else 'c/'+id
    u['rig']=1 if art.startswith('R:') else 0
    out[id]=u;order[fac].append(id)
open('units.js','w').write('// GENERATED by gen_units.py - HoMM3 SoD creature stats (CRTRAITS / heroes.thelazy.net) + VCMI config/creatures abilities\n(function(r){const D='+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';const F='+json.dumps(order)+';const FN='+json.dumps(FN,ensure_ascii=False)+';\nif(typeof module!=="undefined")module.exports={D,F,FN};else r.UNITS={D,F,FN};})(this);\n')
print(len(out))
for k in ['angel','archangel','griffin','hydra','marksman','zealot']:print(k,{x:out[k][x] for x in('a','d','dmg','hp','spd','shots','fw','fh','ab','notes')})

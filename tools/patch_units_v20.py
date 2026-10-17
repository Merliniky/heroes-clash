# v20: add VCMI abilities that are now implemented in the sim (applied on top of gen_units.py output)
import json,re
p='/workspace/heroes-clash/units.js';s=open(p).read()
m=re.search(r'const D=(\{.*?\});const F=',s,re.S);D=json.loads(m.group(1))
ADD={'stoneGolem':{'spellRes':0.5},'ironGolem':{'spellRes':0.75},
 'troglodyte':{'stunImm':1},'infernalTroglodyte':{'stunImm':1},
 'harpy':{'hitRun':1},'harpyHag':{'hitRun':1},'masterGenie':{'caster':1},
 'minotaur':{'morale':0.042},'minotaurKing':{'morale':0.042},
 'serpentFly':{'dispel':1},'dragonFly':{'dispel':1,'weak':1},'wyvernMonarch':{'poison':1},
 'mage':{'chan':2},'archMage':{'chan':2},
 'greenDragon':{'spellImm':3},'redDragon':{'spellImm':3},'goldDragon':{'spellImm':4},'blackDragon':{'spellImm':5}}
DONE={'Spell damage resistance':'法术伤害抗性','魔法通道':1,'士气始终为正':1,'攻击后返回':1,'虚弱':1,'驱散增益':1,'免疫致盲/石化':1,'中毒':1,'魔法免疫':1,'法术伤害抗性':1,'施法':1}
for k,a in ADD.items():
  D[k]['ab'].update(a);D[k]['notes']=[n for n in D[k]['notes'] if n not in DONE]
for k in ('giant','titan'):D[k]['notes']=['免疫心智魔法（本作无心智魔法）']
s=s[:m.start(1)]+json.dumps(D,ensure_ascii=False,separators=(',',':'))+s[m.end(1):]
open(p,'w').write(s);print({k:(D[k]['ab'],D[k]['notes']) for k in ADD})

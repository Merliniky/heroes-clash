// Run rules shared by browser + node sim: factions/synergies, artifacts, hero spells, themed stages, bosses, offers, rewards.
(function(root){
const N=typeof module!=='undefined';
const C=N?require('./core.js'):root.Core,MO=N?require('./models.js'):root.MODELS;
const U=C.U,UPG=MO.UPG,DOWN={};for(const b in UPG)DOWN[UPG[b]]=b;
let R=Math.random;const setRng=f=>{R=f;};const pick=a=>a[Math.floor(R()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const MAXS=C.MAXS,STAGES=15;
// ---------------- factions & synergies ----------------
const FAC={
  castle:{n:'城堡',col:'#4f8cff',icon:'🛡️',lines:['pikeman','archer','swordsman','monk','cavalier','angel'],
    t:['全体城堡单位 防御+2','防御+4，每回合额外反击1次','防御+6，每回合额外反击2次']},
  necro:{n:'墓园',col:'#9a6ad8',icon:'💀',lines:['skeleton','walkingDead','wight','vampire','lich','blackKnight','boneDragon'],
    t:['通灵术：战后将击杀敌军的10%转化为骷髅兵','通灵术20%，不死单位攻击+2','通灵术30%，不死单位攻击+4']},
  stronghold:{n:'据点',col:'#d89a3a',icon:'🪓',lines:['goblin','wolfRider','orc','ogre','cyclops','behemoth'],
    t:['全体据点单位 攻击+2','攻击+4，狂暴：生命低于50%时伤害+30%','攻击+6，狂暴']},
  rampart:{n:'壁垒',col:'#4fb85a',icon:'🌿',lines:['centaur','dwarf','woodElf','pegasus','dendroidGuard','unicorn','greenDragon'],
    t:['再生：每回合恢复最前一只的生命','再生，生命+10%','再生，生命+20%，速度+1']},
  inferno:{n:'地狱',col:'#e8503a',icon:'🔥',lines:['imp','gog','hellHound','demon','pitFiend','efreet','devil'],
    t:['地狱火：攻击附带10%火焰伤害','火焰伤害20%','火焰伤害30%，烈焰护盾']},
};
const ROSTER=[].concat(...Object.values(FAC).map(f=>f.lines));
const lineOf=t=>DOWN[t]||t;
const facOf=t=>{const l=lineOf(t);for(const f in FAC)if(FAC[f].lines.includes(l))return f;return U[t].fac;};
const synTier=n=>n>=6?3:n>=4?2:n>=2?1:0;
function synCounts(stacks){const m={};for(const s of stacks){const f=facOf(s.type);if(FAC[f])m[f]=(m[f]||0)+1;}return m;}
function synMod(f,tier,type){if(!tier)return null;const st=U[type];
  if(f==='castle')return {d:2*tier,ab:tier>=2?{retal:((st.ab&&st.ab.retal)||1)+(tier-1)}:{}};
  if(f==='necro')return tier>=2&&st.ab&&st.ab.undead?{a:2*(tier-1)}:null;
  if(f==='stronghold')return {a:2*tier,ab:tier>=2?{rage:1}:{}};
  if(f==='rampart')return Object.assign({ab:{regen:1}},tier>=2?{hpMul:tier===2?1.1:1.2}:{},tier>=3?{spd:1}:{});
  if(f==='inferno')return {ab:Object.assign({burn:0.1*tier},tier>=3?{fireShield:1}:{})};
  return null;}
// ---------------- artifacts (HoMM3-flavoured) ----------------
const ART=[
 {id:'hellfire',n:'地狱烈焰之剑',e:'Sword of Hellfire',i:'🗡️',d:'全体部队 攻击+4',m:()=>({a:4})},
 {id:'dwarfShield',n:'矮人王之盾',e:'Shield of the Dwarven Lords',i:'🛡️',d:'全体部队 防御+4',m:()=>({d:4})},
 {id:'helm',n:'天堂启示之盔',e:'Helm of Heavenly Enlightenment',i:'⛑️',d:'全体部队 攻击+2 防御+2',m:()=>({a:2,d:2})},
 {id:'gladius',n:'泰坦之剑',e:"Titan's Gladius",i:'⚔️',d:'攻击+7，但防御-3',m:()=>({a:7,d:-3})},
 {id:'boots',n:'速度之靴',e:'Boots of Speed',i:'👢',d:'全体部队 速度+1',m:()=>({spd:1})},
 {id:'sharp',n:'神射手之弓',e:'Bow of the Sharpshooter',i:'🏹',d:'远程单位无距离惩罚，且首轮齐射伤害×2',m:st=>st.shots?{ab:{sharp:1}}:null},
 {id:'goldBow',n:'黄金长弓',e:'Golden Bow',i:'🎯',d:'远程单位弹药+50%，远程伤害+15%',m:st=>st.shots?{shotMul:1.5,ab:{rngMul:1.15}}:null},
 {id:'cloak',n:'亡灵之王的斗篷',e:'Cloak of the Undead King',i:'🧛',d:'通灵术：战后再将击杀敌军的20%转化为骷髅兵',m:()=>null},
 {id:'wings',n:'天使之翼',e:'Angel Wings',i:'🪽',d:'你最强的地面部队获得飞行',m:()=>null},
 {id:'vitality',n:'活力之戒',e:'Ring of Vitality',i:'💍',d:'全体部队 生命+15%',m:()=>({hpMul:1.15})},
 {id:'lifeRing',n:'生命之环',e:'Ring of Life',i:'💚',d:'全体部队获得再生',m:()=>({ab:{regen:1}})},
 {id:'orbFire',n:'暴风之火宝珠',e:'Orb of Tempestuous Fire',i:'🔥',d:'火系法术（火球/流星）伤害+50%',m:()=>null},
 {id:'orbAir',n:'苍穹宝珠',e:'Orb of the Firmament',i:'🌩️',d:'气系法术（闪电/魔法箭/加速）效果+50%',m:()=>null},
 {id:'medal',n:'政治家勋章',e:"Statesman's Medal",i:'🏅',d:'每次招募多一个选项（3选1）',m:()=>null},
 {id:'sash',n:'大使绶带',e:"Ambassador's Sash",i:'🎗️',d:'招募的部队数量+20%',m:()=>null},
 {id:'crown',n:'至尊法师之冠',e:'Crown of the Supreme Magi',i:'👑',d:'法力上限+12',m:()=>null},
 {id:'talisman',n:'法力护符',e:'Talisman of Mana',i:'🔮',d:'法力恢复速度+50%',m:()=>null},
 {id:'hat',n:'缚咒者之帽',e:"Spellbinder's Hat",i:'🎩',d:'每场战斗开始时法力全满',m:()=>null},
 {id:'sphere',n:'永恒法球',e:'Sphere of Permanence',i:'⏳',d:'加速/祝福/嗜血/减速 持续时间加倍',m:()=>null},
 {id:'damned',n:'诅咒铠甲',e:'Armor of the Damned',i:'☠️',d:'开战时所有敌人减速6秒',m:()=>null},
 {id:'centaurAxe',n:'半人马之斧',e:"Centaur's Axe",i:'🪓',d:'近战单位 攻击+3',m:st=>st.shots?null:{a:3}},
 {id:'dragonShield',n:'龙鳞之盾',e:'Dragon Scale Shield',i:'🐉',d:'大体型（2格以上）单位 防御+5 生命+10%',m:st=>(st.fw===2||st.fh===2)?{d:5,hpMul:1.1}:null},
 {id:'courage',n:'勇气徽章',e:'Badge of Courage',i:'🎖️',d:'全体部队每回合额外反击1次',m:st=>({ab:{retal:((st.ab&&st.ab.retal)||1)+1}})},
 {id:'cape',n:'疾风披风',e:'Cape of Velocity',i:'🧣',d:'飞行单位 速度+2 攻击+2',m:st=>st.fly?{spd:2,a:2}:null},
 {id:'tome',n:'魔法大全',e:'Tome of Magic',i:'📖',d:'所有法术消耗-25%',m:()=>null},
 {id:'necklace',n:'生命护符项链',e:'Pendant of Life',i:'📿',d:'治疗术/复活术效果+60%',m:()=>null},
];
const ARTM={};for(const a of ART)ARTM[a.id]=a;
// ---------------- spells ----------------
const SP=[
 {id:'magicArrow',n:'魔法箭',i:'✨',cost:5,tgt:'enemy',sch:'air',d:'对单个敌人造成 10×法力强度 点伤害'},
 {id:'lightning',n:'闪电术',i:'⚡',cost:10,tgt:'enemy',sch:'air',d:'对单个敌人造成 24×法力强度 点伤害'},
 {id:'fireball',n:'火球术',i:'☄️',cost:12,tgt:'area',r:1.6,sch:'fire',d:'点选位置：半径1.6格内所有单位（含友军）受到 14×强度 伤害'},
 {id:'meteor',n:'流星火雨',i:'🌠',cost:18,tgt:'area',r:2.3,sch:'fire',d:'点选位置：半径2.3格内所有单位（含友军）受到 19×强度 伤害'},
 {id:'haste',n:'加速术',i:'💨',cost:8,tgt:'allies',sch:'air',d:'全体友军 移动与攻击速度+45%，持续10秒'},
 {id:'slow',n:'减速术',i:'🐌',cost:9,tgt:'enemies',sch:'earth',d:'全体敌军 速度-40%，持续10秒'},
 {id:'bless',n:'祝福术',i:'🌟',cost:7,tgt:'allies',sch:'water',d:'全体友军 总是造成最大伤害，持续10秒'},
 {id:'bloodlust',n:'嗜血术',i:'🩸',cost:7,tgt:'allies',sch:'fire',d:'全体友军 近战攻击+4，持续12秒'},
 {id:'cure',n:'治疗术',i:'💧',cost:8,tgt:'allies',sch:'water',d:'全体友军 恢复 18×强度 生命（不复活）'},
 {id:'resurrection',n:'复活术',i:'👼',cost:16,tgt:'ally',sch:'earth',d:'点选友军：恢复 50×强度 生命，可复活阵亡个体'},
];
const SPM={};for(const s of SP)SPM[s.id]=s;
const SPD={magicArrow:10,lightning:24,fireball:14,meteor:19,PG:1.3};
const START_SPELLS=['magicArrow','haste','cure'];
// ---------------- themes & bosses ----------------
const THEMES={
 warband:{n:'哥布林战帮',fac:'stronghold',col:'#d89a3a',mod:'敌军数量+25%',hint:'弱点：范围法术（火球/流星）伤害+50%',weak:{area:1.5},cnt:1.25},
 crypt:{n:'不死墓穴',fac:'necro',col:'#9a6ad8',mod:'敌方不死单位 防御+2',hint:'弱点：火系法术伤害+50%',weak:{fire:1.5},emod:st=>st.ab&&st.ab.undead?{d:2}:null},
 grove:{n:'精灵林地',fac:'rampart',col:'#4fb85a',mod:'敌军获得再生',hint:'弱点：气系法术（闪电/魔法箭）伤害+50%',weak:{air:1.5},emod:()=>({ab:{regen:1}})},
 rift:{n:'地狱裂隙',fac:'inferno',col:'#e8503a',mod:'敌军攻击附带15%火焰伤害',hint:'弱点：你的远程单位伤害+25%',weak:{ranged:1.25},emod:()=>({ab:{burn:0.15}})},
 citadel:{n:'圣光要塞',fac:'castle',col:'#4f8cff',mod:'敌军 防御+2，额外反击1次',hint:'弱点：增益法术持续时间加倍',weak:{buff:2},emod:st=>({d:2,ab:{retal:((st.ab&&st.ab.retal)||1)+1}})},
 lair:{n:'巨龙巢穴',fac:'mixed',col:'#c8402a',mod:'敌军中混有巨龙',hint:'弱点：你的远程单位伤害+25%',weak:{ranged:1.25},pool:['greenDragon','boneDragon','redDragon','wolfRider','gog','woodElf','hellHound','vampire','ogre','unicorn']},
};
const BOSSES=[
 {id:'lichKing',n:'巫妖王',type:'powerLich',theme:'crypt',mod:{hpMul:4,a:2,d:2},mech:'summon',summon:'skeletonWarrior',every:6,share:0.28,desc:'每6秒召唤一队骷髅勇士；死亡之云溅射'},
 {id:'wyrm',n:'远古红龙',type:'redDragon',theme:'lair',mod:{hpMul:3,a:4},mech:'sweep',every:7,share:0.42,desc:'每7秒对3行区域喷吐龙息（地面红色预警，分散站位可躲避）'},
 {id:'archfiend',n:'深渊魔王',type:'archDevil',theme:'rift',mod:{hpMul:6,a:10,d:10,ab:{fireShield:1}},mech:'blink',summon:'familiar',every:7,share:0.75,desc:'每8秒瞬移到你的远程部队身边并召唤魔仆'},
];
const SCHED=['warband','crypt','grove','rift','B0','citadel','warband','lair','rift','B1','grove','crypt','citadel','warband','B2'];
function stageInfo(s){let key=s<=STAGES?SCHED[s-1]:(s%5===0?'B'+((s/5-1)%3):Object.keys(THEMES)[(s*7)%6]);
  if(key[0]==='B'){const B=BOSSES[+key[1]];return {s,boss:B,theme:THEMES[B.theme],themeId:B.theme};}return {s,theme:THEMES[key],themeId:key};}
// ---------------- budgets ----------------
const maxLvl=s=>Math.min(7,1+Math.floor((s-1)*0.6));
const offerBudget=s=>Math.round(430*Math.pow(1.33,s-1));
let ENEMY_K=290,ENEMY_G=1.46;const setEnemyCurve=(k,g)=>{ENEMY_K=k;ENEMY_G=g;};
const enemyBudget=s=>Math.round(ENEMY_K*Math.pow(ENEMY_G,s-1)*(s>STAGES?Math.pow(1.08,s-STAGES):1));
const cnt=(t,b)=>Math.max(1,Math.round(b/U[t].v));
function upChance(s){return Math.min(0.8,(s-3)*0.08);}
function makeEnemies(s){const info=stageInfo(s),th=info.theme;let tot=enemyBudget(s)*(th.cnt||1);const out=[];
  let pool=(th.pool||FAC[th.fac].lines).filter(t=>U[t].lvl<=maxLvl(s)+(th.pool?1:0));if(!pool.length)pool=FAC[th.fac]?FAC[th.fac].lines.slice(0,2):['goblin'];
  if(info.boss){const B=info.boss,bv=tot*B.share;out.push({type:B.type,count:Math.max(1,Math.round(bv/(U[B.type].v*(B.mod.hpMul||1)*0.5))),boss:B.id});tot-=bv;}
  const n=Math.min(MAXS-out.length,2+Math.floor(s/2.5));const w=[];for(let i=0;i<n;i++)w.push(0.6+R());const ws=w.reduce((a,b)=>a+b,0);
  for(let i=0;i<n;i++){let t=pick(pool);if(UPG[t]&&R()<upChance(s))t=UPG[t];const ex=out.find(o=>o.type===t);const c=cnt(t,tot*w[i]/ws);if(ex)ex.count+=c;else out.push({type:t,count:c});}
  return out;}
// ---------------- run state helpers ----------------
function newRun(){return {stage:1,army:{},merges:{},arts:[],spells:START_SPELLS.slice(),form:{},kills:0,lost:0,raised:0};}
const stacks=army=>Object.entries(army).filter(([,c])=>c>0).map(([type,count])=>({type,count})).sort((a,b)=>U[b.type].v*b.count-U[a.type].v*a.count);
const has=(run,id)=>run.arts.includes(id);
function makeOffer(run){const s=run.stage,n=has(run,'medal')?3:2,L=maxLvl(s),own=stacks(run.army),full=own.length>=MAXS;const cards=[];
  // upgrade card: guaranteed when a stack was picked twice, sometimes otherwise
  const upg=own.filter(o=>UPG[o.type]&&U[UPG[o.type]].lvl<=L+1);
  const ready=upg.filter(o=>(run.merges[o.type]||0)>=2);
  if(upg.length&&(ready.length||R()<0.3)){const o=pick(ready.length?ready:upg);cards.push({kind:'upgrade',from:o.type,to:UPG[o.type],count:o.count});}
  const owned=new Set(own.map(o=>lineOf(o.type)));const ownFac=Object.keys(synCounts(own));
  let tries=0;while(cards.length<n&&tries++<60){let t;
    if(full){t=lineOf(pick(own).type);}else{const pool=ROSTER.filter(x=>U[x].lvl<=L&&U[x].lvl>=Math.max(1,L-3));
      const fp=ownFac.length&&R()<0.55?pool.filter(x=>ownFac.includes(facOf(x))):pool;t=pick(fp.length?fp:pool);}
    if(cards.some(c=>c.type===t))continue;const curT=own.find(o=>lineOf(o.type)===t);const realT=curT?curT.type:t;
    cards.push({kind:'unit',type:realT,count:cnt(realT,offerBudget(s)*(0.85+R()*0.3)*(has(run,'sash')?1.2:1))});}
  return cards;}
function takeCard(run,c){const ev={};if(c.kind==='upgrade'){const k=run.army[c.from]||0;delete run.army[c.from];run.army[c.to]=(run.army[c.to]||0)+k;if(run.form[c.from]){run.form[c.to]=run.form[c.from];}delete run.merges[c.from];ev.upgraded=c.to;return ev;}
  const merged=!!run.army[c.type];run.army[c.type]=(run.army[c.type]||0)+c.count;if(merged){run.merges[c.type]=(run.merges[c.type]||0)+1;ev.merged=true;
    if(run.merges[c.type]>=3&&UPG[c.type]){const to=UPG[c.type];run.army[to]=(run.army[to]||0)+run.army[c.type];delete run.army[c.type];if(run.form[c.type])run.form[to]=run.form[c.type];delete run.merges[c.type];ev.upgraded=to;}}
  return ev;}
function deployList(run){return stacks(run.army).slice(0,MAXS);}
function mergeMod(a,b){if(!b)return a;const o=Object.assign({},a);for(const k in b){const v=b[k];if(k==='ab')o.ab=Object.assign({},o.ab||{},v);else if(k==='hpMul'||k==='shotMul')o[k]=(o[k]||1)*v;else if(typeof v==='number')o[k]=(o[k]||0)+v;else o[k]=v;}return o;}
// player stacks -> battle stacks with mods (synergy + artifacts + theme weakness)
function playerStacks(run,list,info){const sc=synCounts(list);let wingsT=null;
  if(has(run,'wings')){const g=list.filter(s=>!U[s.type].fly).sort((a,b)=>U[b.type].v*b.count-U[a.type].v*a.count)[0];if(g)wingsT=g.type;}
  return list.map(s=>{const st=U[s.type];let m={};const f=facOf(s.type);m=mergeMod(m,synMod(f,synTier(sc[f]||0),s.type));
    for(const id of run.arts)m=mergeMod(m,ARTM[id].m(st));
    if(s.type===wingsT)m.fly=1;if(info&&info.theme.weak.ranged&&st.shots)m=mergeMod(m,{ab:{rngMul:((m.ab&&m.ab.rngMul)||1)*info.theme.weak.ranged}});
    const f2=run.form[s.type];return Object.assign({type:s.type,count:s.count,mod:Object.keys(m).length?m:null},f2?{ax:f2[0],ay:f2[1]}:{});});}
function enemyStacks(list,info){const sc=synCounts(list.filter(s=>!s.boss));return list.map(s=>{const st=U[s.type];let m={};const f=facOf(s.type);
  if(!s.boss)m=mergeMod(m,synMod(f,synTier(sc[f]||0),s.type));if(info.theme.emod)m=mergeMod(m,info.theme.emod(st));
  if(s.boss){const B=BOSSES.find(b=>b.id===s.boss);m=mergeMod(m,B.mod);}return {type:s.type,count:s.count,boss:s.boss,mod:Object.keys(m).length?m:null};});}
// ---------------- hero / mana / spells in battle ----------------
function heroFor(run,info){const lvl=run.stage,P=Math.pow(SPD.PG,lvl-1);const max=20+lvl*2+(has(run,'crown')?12:0);
  return {lvl,P,max,mana:has(run,'hat')?max:max*0.4,regen:(0.75+0.05*lvl)*(has(run,'talisman')?1.5:1),arts:run.arts,info,costMul:has(run,'tome')?0.75:1,casts:0};}
const spellCost=(h,id)=>Math.round(SPM[id].cost*h.costMul);
function spellMul(h,sp){let m=1;const w=h.info&&h.info.theme.weak||{};if(sp.sch==='fire'&&h.arts.includes('orbFire'))m*=1.5;if(sp.sch==='air'&&h.arts.includes('orbAir'))m*=1.5;
  if(w.fire&&sp.sch==='fire')m*=w.fire;if(w.air&&sp.sch==='air'&&sp.tgt==='enemy')m*=w.air;if(w.area&&sp.tgt==='area')m*=w.area;return m;}
const durMul=h=>(h.arts.includes('sphere')?2:1)*((h.info&&h.info.theme.weak.buff)||1);
// target: unit (enemy/ally) or {x,y} pixel point (area). returns list of affected units
function cast(b,h,id,target){const sp=SPM[id],P=h.P*spellMul(h,sp),out=[];h.casts++;
  const side=s=>b.units.filter(u=>u.alive&&u.side===s);
  const dmg=(u,v)=>{C.applyDamage(b,null,u,Math.round(v),'spell');out.push(u);};
  if(id==='magicArrow')dmg(target,SPD.magicArrow*P);else if(id==='lightning')dmg(target,SPD.lightning*P);
  else if(id==='fireball'||id==='meteor'){const r=sp.r*(C.CW+C.CH)/2,base=SPD[id];for(const u of b.units.filter(u=>u.alive))if(Math.hypot(u.x-target.x,u.y-target.y)<=r+Math.max(u.fw,u.fh)*20)dmg(u,base*P);}
  else if(id==='haste'||id==='bless'||id==='bloodlust'){const key={haste:'haste',bless:'bless',bloodlust:'blood'}[id];const d=(id==='bloodlust'?12:10)*durMul(h)*(id==='haste'&&h.arts.includes('orbAir')?1.5:1);for(const u of side('p')){u.buf[key]=b.t+d;out.push(u);}}
  else if(id==='slow'){for(const u of side('e')){u.buf.slow=b.t+10*durMul(h);out.push(u);}}
  else if(id==='cure'||id==='resurrection'){const amt=(id==='cure'?18:50)*P*(h.arts.includes('necklace')?1.6:1);const L=id==='cure'?side('p'):[target];
    for(const u of L){if(!u.alive)continue;const cur=(u.count-1)*u.st.hp+u.top,max=id==='cure'?cur+(u.st.hp-u.top):u.start*u.st.hp;const nw=Math.min(max,cur+amt);u.count=Math.ceil(nw/u.st.hp);u.top=nw-(u.count-1)*u.st.hp;out.push(u);}}
  b.events.push({k:'spellFx',id,out});return out;}
// ---------------- boss mechanics ----------------
function bossTick(b,dt,stage){for(const u of b.units){if(!u.alive||!u.boss)continue;const B=BOSSES.find(x=>x.id===u.boss);u.bt=(u.bt||0)+dt;
  if(B.mech==='summon'&&u.bt>=B.every){u.bt=0;const c=Math.max(2,Math.round(enemyBudget(stage)*0.045/U[B.summon].v));const s=C.spawn(b,'e',B.summon,c,u);if(s)b.events.push({k:'bossCast',u,txt:'召唤骷髅！'});}
  if(B.mech==='sweep'){if(!u.warn&&u.bt>=B.every-1.6){const tgt=b.units.filter(v=>v.alive&&v.side==='p').sort((a,c)=>c.count*c.st.v-a.count*a.st.v)[0];if(tgt){const r0=Math.max(0,Math.min(C.GR-3,tgt.ay-1));u.warn={rows:[r0,r0+2],at:b.t+1.6};b.events.push({k:'warn',u,rows:u.warn.rows,dur:1.6});}}
    if(u.warn&&b.t>=u.warn.at){const [r0,r1]=u.warn.rows;const dmg=u.count*45*0.9;for(const v of b.units)if(v.alive&&v.side==='p'&&v.ay+v.fh-1>=r0&&v.ay<=r1)C.applyDamage(b,u,v,Math.round(dmg),'breath');b.events.push({k:'sweep',u,rows:u.warn.rows});u.warn=null;u.bt=0;}}
  if(B.mech==='blink'&&u.bt>=B.every){u.bt=0;const ps=b.units.filter(v=>v.alive&&v.side==='p');const tgt=ps.filter(v=>v.st.shots>0)[0]||ps.sort((a,c)=>a.ax-c.ax)[0];
    if(tgt){const from={x:u.x,y:u.y};let best=null,bd=1e9;for(let y=0;y<C.GR;y++)for(let x=0;x<C.GC;x++){const d=C.gapAt(x,y,u.fw,u.fh,tgt);if(d!==1)continue;C.occClear(b,u,u.ax,u.ay);const ok=C.fits(b,u,x,y);C.occSet(b,u,u.ax,u.ay,u.id);if(ok&&d<bd){bd=d;best=[x,y];}}
      if(best&&!u.moving){C.moveTo(b,u,best[0],best[1]);b.events.push({k:'blink',u,from});}const c=Math.max(2,Math.round(enemyBudget(stage)*0.1/U[B.summon].v));C.spawn(b,'e',B.summon,c,u);}}}}
// ---------------- rewards / post battle ----------------
function raisePct(run,list){const sc=synCounts(list);const t=synTier(sc.necro||0);return (t?0.1*t:0)+(has(run,'cloak')?0.2:0);}
function afterBattle(run,b,list){const sp={};for(const u of b.units)if(u.side==='p'&&u.alive)sp[u.type]=(sp[u.type]||0)+u.count;
  for(const s of list){run.army[s.type]-=s.count;run.army[s.type]+=sp[s.type]||0;if(run.army[s.type]<=0){delete run.army[s.type];delete run.merges[s.type];}}
  let killedHp=0;for(const u of b.units){if(u.side==='e'){run.kills+=u.start-u.count;killedHp+=(u.start-u.count)*U[u.type].hp;}else run.lost+=u.start-u.count;}
  const pct=b.over==='win'?raisePct(run,list):0;let raised=0;
  if(pct>0){const sk=run.army.skeletonWarrior?'skeletonWarrior':'skeleton';raised=Math.floor(killedHp*pct/U[sk].hp);
    if(raised>0&&(run.army[sk]||stacks(run.army).length<MAXS)){run.army[sk]=(run.army[sk]||0)+raised;run.raised+=raised;}else raised=0;}
  return {raised,sk:run.army.skeletonWarrior?'skeletonWarrior':'skeleton'};}
function rewardKind(s){const info=stageInfo(s);if(info.boss||s%2===0)return 'artifact';return 'spell';}
function rewardOptions(run,kind){if(kind==='artifact')return shuffle(ART.filter(a=>!run.arts.includes(a.id))).slice(0,3).map(a=>({kind:'artifact',id:a.id}));
  return shuffle(SP.filter(s=>!run.spells.includes(s.id))).slice(0,3).map(s=>({kind:'spell',id:s.id}));}
const api={SPD,FAC,ROSTER,ART,ARTM,SP,SPM,THEMES,BOSSES,STAGES,MAXS,UPG,DOWN,lineOf,facOf,synTier,synCounts,synMod,stageInfo,makeEnemies,newRun,stacks,makeOffer,takeCard,deployList,
  playerStacks,enemyStacks,heroFor,spellCost,cast,bossTick,afterBattle,rewardKind,rewardOptions,setRng,setEnemyCurve,enemyBudget,offerBudget,maxLvl,raisePct};
if(N)module.exports=api;else root.Hero=api;
})(this);

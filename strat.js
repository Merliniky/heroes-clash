// Strategic (map/town) layer: turn-based economy, dwellings, neutral camps, AI opponent.
// Shared by the browser (game.js) and node (sim.js). Battles are resolved by the caller
// (real-time in the browser, Core.run headless in the sim) and reported back via applyBattle().
(function(root){
const Core=(typeof module!=='undefined')?require('./core.js'):root.Core;
const {U,FACTIONS}=Core;
const FACS=['castle','rampart','tower','inferno','necro','dungeon','stronghold','fortress'];
const NEUTRAL=['peasant','boar','rogue','nomad','troll'];
const RES=['gold','wood','ore','gems'];
const RZ={gold:'金币',wood:'木材',ore:'矿石',gems:'宝石'};
// ---- economy (HoMM3 costs scaled down ~1/2; one turn ~ 2-3 days) ----
const INCOME={gold:1000,wood:2,ore:2,gems:0};
const WEEK=3;
// faction growth modifier (game balance only; creature stats stay exact HoMM3)
const FGROW={castle:0.95,rampart:0.75,tower:1.0,inferno:0.95,necro:1.6,dungeon:0.85,stronghold:1.0,fortress:1.55};
const gw=(s,t)=>U[t].g*(FGROW[s.fac]||1);                           // dwellings refill every 3 turns (a "week")
const DW_COST=[null,null,                // level 1,2 start built
  {gold:1200,wood:5},{gold:2000,wood:5,ore:5},{gold:3000,ore:5,gems:2},{gold:4500,wood:8,ore:8,gems:4},{gold:7000,wood:10,ore:10,gems:8}];
const UP_COST=[{gold:500,wood:2},{gold:800,ore:3},{gold:1200,wood:3,ore:3},{gold:1600,wood:4,gems:1},{gold:2400,ore:5,gems:2},{gold:3500,wood:5,ore:5,gems:3},{gold:6000,wood:5,ore:5,gems:6}];
const BUILDINGS={
  mill:{n:'锯木厂与矿井',d:'每回合 +2 木材 +2 矿石',cost:{gold:1500},inc:{wood:2,ore:2}},
  gemmine:{n:'宝石矿',d:'每回合 +1 宝石',cost:{gold:2000,wood:5,ore:5},inc:{gems:1}},
  hall:{n:'市政厅',d:'每回合 +750 金币',cost:{gold:2500,wood:5,ore:5},inc:{gold:750}},
};
const ARTS=[{n:'百夫长之剑',d:'全军攻击 +1',a:1,d2:0},{n:'盾牌',d:'全军防御 +1',a:0,d2:1},{n:'泰坦之剑',d:'全军攻击 +2',a:2,d2:0},{n:'龙鳞盾',d:'全军防御 +2',a:0,d2:2},{n:'天使之冠',d:'全军攻防 +1',a:1,d2:1}];
const DEF_WALL=3;            // defending your own town: +3 defense (walls)
const WIN_SCORE=3,MAX_TURNS=40,TRUCE_START=5,TRUCE_AFTER=3;   // no duels before turn 5; 3 quiet turns after each duel
let R=Math.random;const setRng=f=>{R=f;Core.setRng(f);};
const pick=a=>a[Math.floor(R()*a.length)];
const lineOf=fac=>FACTIONS[fac];                     // [l1,l1+,l2,l2+,...]
const typeAt=(fac,lvl,up)=>lineOf(fac)[(lvl-1)*2+(up?1:0)];
const canPay=(res,c)=>RES.every(k=>(res[k]||0)>=(c[k]||0));
const pay=(res,c)=>RES.forEach(k=>res[k]-=(c[k]||0));
const gain=(res,c)=>RES.forEach(k=>res[k]=(res[k]||0)+(c[k]||0));
const unitCost=(t,n=1)=>({gold:U[t].cost*n,gems:(U[t].rare||0)*n});
function newSide(fac,isAI){
  const s={fac,isAI,res:{gold:2500,wood:5,ore:5,gems:1},dw:[1,1,0,0,0,0,0],wins:0,arts:[],bld:{},log:[]};const t1=typeAt(fac,1),t2=typeAt(fac,2);
  s.pool=[Math.round(gw(s,t1)),Math.round(gw(s,t2)),0,0,0,0,0];s.army={[t1]:Math.round(gw(s,t1)),[t2]:Math.round(gw(s,t2)*0.6)};return s;
}
function newGame(pfac,afac,seed){
  if(seed!=null)setRng(Core.rng(seed));
  if(!afac){const o=FACS.filter(f=>f!==pfac);afac=pick(o);}
  const g={truce:TRUCE_START,turn:1,p:newSide(pfac,false),a:newSide(afac,true),camps:[],over:null,log:[]};
  for(let i=0;i<3;i++)g.camps.push(makeCamp(g,i));
  g.p.offer=makeOffers(g,g.p);g.a.offer=makeOffers(g,g.a);
  return g;
}
const income=s=>{const inc={...INCOME};for(const k in s.bld)if(s.bld[k])gain(inc,BUILDINGS[k].inc);return inc;};
const bonus=(s,home)=>s.arts.reduce((o,a)=>({a:o.a+a.a,d:o.d+a.d2}),{a:0,d:home?DEF_WALL:0});
// army power estimate (HoMM3 AI value with attack/defense bonus)
const power=(army,b={a:0,d:0})=>Object.entries(army).reduce((s,[t,n])=>s+n*U[t].v,0)*(1+0.05*(b.a+b.d));
function stacks(army,max=Core.MAXS){return Object.entries(army).filter(([t,n])=>n>0).map(([type,count])=>({type,count})).sort((x,y)=>y.count*U[y.type].v-x.count*U[x.type].v).slice(0,max);}
// ---- free 1-of-2 offer from built dwellings ----
function makeOffers(g,s){
  const lv=s.dw.map((v,i)=>v?i+1:0).filter(Boolean);const out=[];
  for(let k=0;k<2;k++){let L=pick(lv);if(k===1&&lv.length>1)for(let i=0;i<5&&L===out[0].lvl;i++)L=pick(lv);
    const t=typeAt(s.fac,L,s.dw[L-1]===2);out.push({type:t,lvl:L,count:Math.max(1,Math.round(gw(s,t)*0.5*(0.85+R()*0.3)))});}
  return out;
}
function takeOffer(s,i){const o=s.offer[i];s.army[o.type]=(s.army[o.type]||0)+o.count;s.offer=null;return o;}
// ---- neutral camps ----
const TIERS=[{n:'容易',m:0.55,col:'#7fd36b'},{n:'中等',m:1.0,col:'#ffc84a'},{n:'困难',m:1.7,col:'#ff6a5a'}];
function makeCamp(g,slot){
  const tier=slot%3;const val=(800+g.turn*450+g.turn*g.turn*25)*TIERS[tier].m*(0.85+R()*0.3);
  // neutral pool: true neutrals + random faction creatures of a level that fits the camp value
  const maxL=Math.min(7,1+Math.floor(g.turn/3)+tier);
  const cand=NEUTRAL.concat(Object.keys(U).filter(t=>U[t].fac!=='neutral'&&U[t].lvl<=maxL&&U[t].lvl>=Math.max(1,maxL-3)&&!U[t].up));
  let t=pick(cand);if(val/U[t].v<2)t=pick(cand.filter(x=>U[x].v*3<val)) || t;
  const types=[t];if(val>3000&&R()<0.6){let t2=pick(cand);if(t2!==t&&U[t2].v*3<val)types.push(t2);}
  const army={};for(const x of types)army[x]=Math.max(1,Math.round(val/types.length/U[x].v));
  const rv=val*(0.7+0.12*tier);
  const reward={gold:Math.round(rv*0.6/50)*50,wood:2+tier*2+Math.floor(R()*3),ore:2+tier*2+Math.floor(R()*3),gems:tier+(R()<0.5?1:0)};
  const extra=tier===2&&R()<0.5?{art:pick(ARTS)}:R()<0.45?{join:{type:t,count:Math.max(1,Math.round(army[t]*0.25))}}:{};
  return {slot,tier,army,reward,...extra,x:0,y:0};
}
// ---- build / recruit ----
function buildOptions(s){
  const o=[];
  for(let L=1;L<=7;L++){
    if(!s.dw[L-1]){if(L>1&&!s.dw[L-2])break;o.push({kind:'dw',L,cost:DW_COST[L-1],type:typeAt(s.fac,L,false),ok:canPay(s.res,DW_COST[L-1])});break;}
  }
  for(let L=1;L<=7;L++)if(s.dw[L-1]===1)o.push({kind:'up',L,cost:UP_COST[L-1],type:typeAt(s.fac,L,true),ok:canPay(s.res,UP_COST[L-1])});
  for(const k in BUILDINGS)if(!s.bld[k])o.push({kind:'bld',k,cost:BUILDINGS[k].cost,ok:canPay(s.res,BUILDINGS[k].cost)});
  return o;
}
function doBuild(g,s,opt){if(!canPay(s.res,opt.cost))return false;pay(s.res,opt.cost);
  if(opt.kind==='dw'){s.dw[opt.L-1]=1;s.pool[opt.L-1]+=Math.round(gw(s,opt.type));}else if(opt.kind==='up')s.dw[opt.L-1]=2;else s.bld[opt.k]=1;return true;}
function recruitOptions(s){const o=[];for(let L=1;L<=7;L++)if(s.dw[L-1]){const t=typeAt(s.fac,L,s.dw[L-1]===2);o.push({L,type:t,avail:s.pool[L-1],cost:unitCost(t)});}return o;}
function maxAfford(res,t,avail){let n=avail;const c=unitCost(t);for(const k of RES)if(c[k])n=Math.min(n,Math.floor((res[k]||0)/c[k]));return Math.max(0,n);}
// greedy plan: highest level first
function autoRecruit(s){const plan={};const res={...s.res};for(const o of recruitOptions(s).reverse()){const n=maxAfford(res,o.type,o.avail);if(n>0){plan[o.L]=n;pay(res,unitCost(o.type,n));}}return plan;}
function doRecruit(s,plan){let got=[];for(const L in plan){const n=plan[L];if(!n)continue;const t=typeAt(s.fac,+L,s.dw[L-1]===2);if(n>s.pool[L-1]||!canPay(s.res,unitCost(t,n)))continue;
  pay(s.res,unitCost(t,n));s.pool[L-1]-=n;s.army[t]=(s.army[t]||0)+n;got.push({type:t,count:n});}return got;}
// ---- battle bookkeeping (caller resolves the fight) ----
function applySurvivors(army,brought,surv){for(const st of brought){army[st.type]-=st.count;army[st.type]+=surv[st.type]||0;if(army[st.type]<=0)delete army[st.type];}}
// Necropolis faction perk (HoMM3 Necromancy, simplified): raise skeletons from 10% of the HP slain
function necro(s,army){if(s.fac!=='necro')return 0;const hp=Object.entries(army).reduce((a,[t,n])=>a+n*U[t].hp,0);const k=Math.floor(hp*0.2/U.skeleton.hp);
  if(k>0){const t=s.dw[0]===2?'skeletonWarrior':'skeleton';s.army[t]=(s.army[t]||0)+k;}return k;}
const canAttack=g=>g.turn>=g.truce;
function applyCamp(g,s,ci,res){const c=g.camps[ci];
  if(res.win){c.raised=necro(s,c.army);gain(s.res,c.reward);if(c.art)s.arts.push(c.art);if(c.join)s.army[c.join.type]=(s.army[c.join.type]||0)+c.join.count;g.camps[ci]=makeCamp(g,c.slot);g.camps[ci].fresh=1;}
  else{c.army={};for(const t in res.e)c.army[t]=res.e[t];if(!Object.keys(c.army).length)g.camps[ci]=makeCamp(g,c.slot);}
}
function applyDuel(g,att,def,res,brA,brD){ // res.win = attacker won
  applySurvivors(att.army,brA,res.p);applySurvivors(def.army,brD,res.e);
  const w=res.win?att:def,l=res.win?def:att;w.wins++;g.truce=g.turn+1+TRUCE_AFTER;w.raised=necro(w,Object.fromEntries((res.win?brD:brA).map(x=>[x.type,x.count])));gain(w.res,{gold:1500,wood:3,ore:3,gems:1});
  // loser rallies: emergency garrison (half a week of growth) so the game does not snowball
  if(l===def)for(let L=1;L<=7;L++)if(l.dw[L-1]){const t=typeAt(l.fac,L,l.dw[L-1]===2);l.army[t]=(l.army[t]||0)+Math.ceil(gw(l,t));}
  if(w.wins>=WIN_SCORE)g.over=w===g.p?'p':'a';
  return w;
}
// ---- turn upkeep ----
function endTurn(g){
  g.turn++;for(const s of [g.p,g.a]){gain(s.res,income(s));
    if((g.turn-1)%WEEK===0)for(let L=1;L<=7;L++)if(s.dw[L-1]){const t=typeAt(s.fac,L,false);s.pool[L-1]=Math.min(s.pool[L-1]+Math.round(gw(s,t)),Math.round(gw(s,t)*3));}
    s.offer=makeOffers(g,s);}
  for(const c of g.camps)c.fresh=0;
  if(g.turn>MAX_TURNS&&!g.over){g.over=g.p.wins>g.a.wins?'p':g.a.wins>g.p.wins?'a':(power(g.p.army)>=power(g.a.army)?'p':'a');}
}
// ---- AI heuristic ----
function campPower(c){return power(c.army);}
function aiChoose(g,s,foe){
  const my=power(s.army,bonus(s)),their=power(foe.army,bonus(foe));
  const top=power(Object.fromEntries(stacks(s.army).map(x=>[x.type,x.count])),bonus(s)),theirTop=power(Object.fromEntries(stacks(foe.army).map(x=>[x.type,x.count])),bonus(foe));
  // 1) attack when clearly stronger
  if(canAttack(g)&&top>theirTop*1.1)return {act:'attack'};
  // 1b) under threat: spend on troops first
  const planT=autoRecruit(s);const pvT=Object.entries(planT).reduce((a,[L,n])=>a+n*U[typeAt(s.fac,+L,s.dw[L-1]===2)].v,0);
  if(g.turn>=g.truce-1&&theirTop>top*0.8&&pvT>my*0.05)return {act:'recruit',plan:planT};
  // 2) build next dwelling / valuable upgrade when affordable
  const bo=buildOptions(s).filter(o=>o.ok);
  const dw=bo.find(o=>o.kind==='dw');if(dw)return {act:'build',opt:dw};
  if(!s.bld.mill&&g.turn<=6){const m=bo.find(o=>o.k==='mill');if(m)return {act:'build',opt:m};}
  // 3) recruit if the pool is worth it
  const plan=autoRecruit(s);const pv=Object.entries(plan).reduce((a,[L,n])=>a+n*U[typeAt(s.fac,+L,s.dw[L-1]===2)].v,0);
  if(pv>my*0.2)return {act:'recruit',plan};
  // 4) farm the best camp we can beat comfortably
  let best=-1,bv=0;g.camps.forEach((c,i)=>{const cp=campPower(c);if(cp<top*0.55){const v=c.reward.gold+300*(c.reward.wood+c.reward.ore)+600*c.reward.gems+(c.art?1500:0)+cp*0.2;if(v>bv){bv=v;best=i;}}});
  if(best>=0)return {act:'camp',ci:best};
  const up=bo.filter(o=>o.kind==='up').sort((a,b)=>b.L-a.L)[0];if(up)return {act:'build',opt:up};
  const ob=bo.find(o=>o.kind==='bld');if(ob)return {act:'build',opt:ob};
  if(pv>0)return {act:'recruit',plan};
  // weakest camp as a fallback
  let wi=0;g.camps.forEach((c,i)=>{if(campPower(c)<campPower(g.camps[wi]))wi=i;});return {act:'camp',ci:wi};
}
function aiTakeOffer(s){const o=s.offer;const i=o[0].count*U[o[0].type].v>=o[1].count*U[o[1].type].v?0:1;return takeOffer(s,i);}
const api={FGROW,canAttack,TRUCE_START,TRUCE_AFTER,FACS,NEUTRAL,RES,RZ,INCOME,WEEK,DW_COST,UP_COST,BUILDINGS,ARTS,TIERS,WIN_SCORE,MAX_TURNS,setRng,typeAt,lineOf,canPay,unitCost,newGame,income,bonus,power,stacks,makeOffers,takeOffer,
  makeCamp,buildOptions,doBuild,recruitOptions,maxAfford,autoRecruit,doRecruit,applyCamp,applyDuel,endTurn,aiChoose,aiTakeOffer,campPower};
if(typeof module!=='undefined')module.exports=api;else root.Strat=api;
})(this);

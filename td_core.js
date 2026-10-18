// 宝石塔防 (Gem TD-style mode) — pure game logic, no rendering. Works in the browser (window.TD) and in node (sim).
(function(root){'use strict';
const W=13,H=19;                       // grid columns × rows (row 0 = top/spawn, row H-1 = bottom/exit)
const SPAWN=[6,0],EXIT=[6,18];
const CPS=[[2,3],[10,3],[10,9],[2,9],[2,15],[10,15]];   // 6 checkpoints, walked in order
const WAYS=[SPAWN,...CPS,EXIT];
const LIVES=20,MAXW=20;
// ---------- gems ----------
const QN=['碎裂的','有瑕疵的','普通的','无瑕的','完美的'];
const QS=['碎','瑕','普','无','完'];
const QMUL=[1,2.3,5,11,24];             // damage multiplier by quality
const GEMS={
  amethyst:{n:'紫水晶',col:'#b45cff',dmg:10.8,rng:4.6,cd:1.35,wind:0.4,air:2.4,ground:0.45,shred:1,d:'对空：对飞行×2.4，对地面×0.45；命中降低护甲'},
  aquamarine:{n:'海蓝宝石',col:'#46e0e6',dmg:6.42,rng:2.4,cd:0.68,wind:0.22,d:'极快攻击速度，射程短'},
  diamond:{n:'钻石',col:'#f2f6ff',dmg:11.5,rng:3.1,cd:1.15,wind:0.32,groundOnly:1,crit:0.25,critM:2.5,d:'只攻击地面；25%暴击（伤害×2.5）'},
  emerald:{n:'祖母绿',col:'#3fd46a',dmg:4.67,rng:3.1,cd:1.2,wind:0.3,poison:1.6,slowP:0.1,d:'剧毒：持续伤害3秒，并减速10%'},
  opal:{n:'蛋白石',col:'#ffd0e8',dmg:3.25,rng:2.8,cd:1.3,wind:0.32,aura:0.12,d:'光环：射程内其他塔攻击速度提升'},
  ruby:{n:'红宝石',col:'#ff3b3b',dmg:8.1,rng:2.8,cd:1.35,wind:0.38,splash:1.25,splashP:0.5,d:'溅射：目标周围敌人受到50%伤害'},
  sapphire:{n:'蓝宝石',col:'#3a6bff',dmg:5,rng:3.4,cd:1.25,wind:0.32,slow:0.25,d:'冰霜：减速敌人2秒'},
  topaz:{n:'黄玉',col:'#ffc23a',dmg:3.83,rng:3.0,cd:1.15,wind:0.3,multi:2,d:'多重射击：同时攻击多个目标'},
};
const GTYPES=Object.keys(GEMS);
// special recipe towers (classic Gem TD 3-gem recipes)
const SPECIAL={
  silver:{n:'白银',col:'#d8dde6',dmg:38.33,rng:3.3,cd:1.15,wind:0.34,splash:1.4,splashP:0.6,slow:0.3,recipe:[['topaz',0],['diamond',0],['sapphire',0]],d:'冰霜溅射：范围伤害并减速30%'},
  malachite:{n:'孔雀石',col:'#1fb58a',dmg:22.91,rng:3.6,cd:0.9,wind:0.28,multi:4,recipe:[['opal',0],['emerald',0],['aquamarine',0]],d:'多重射击：同时攻击4个目标（空/地）'},
  jade:{n:'玉石',col:'#7fe0a0',dmg:60,rng:3.6,cd:1.2,wind:0.32,poison:22,slowP:0.25,gold:1,recipe:[['emerald',2],['opal',2],['sapphire',1]],d:'剧毒减速，击杀额外+1金币'},
  starRuby:{n:'星彩红宝石',col:'#ff5a7a',dmg:0,rng:2.6,cd:1.0,wind:0.3,burn:28,recipe:[['ruby',0],['ruby',1],['amethyst',0]],d:'灼烧光环：每秒伤害范围内所有敌人'},
  gold:{n:'黄金',col:'#ffd23a',dmg:190.91,rng:4.2,cd:1.5,wind:0.45,crit:0.3,critM:3,shred:4,recipe:[['amethyst',4],['amethyst',1],['diamond',1]],d:'30%暴击（×3），命中大幅降低护甲'},
  bloodstone:{n:'血石',col:'#c0102a',dmg:120,rng:3.2,cd:1.2,wind:0.38,splash:1.5,splashP:0.6,burn:90,recipe:[['ruby',4],['aquamarine',3],['amethyst',2]],d:'血之光环：强力灼烧光环+溅射攻击'},
};
// gem-chance level: quality odds (percent for chipped..perfect) and upgrade costs
const ODDS=[[100,0,0,0,0],[70,30,0,0,0],[60,30,10,0,0],[50,30,20,0,0],[40,30,20,10,0],[30,30,30,10,0],[20,30,30,20,0],[10,30,30,25,5],[0,20,30,30,20]];
const UPCOST=[20,40,60,80,100,120,140,160];
const ROCK_COST=10;
// ---------- enemies (HoMM3 creatures; they all have sprite atlases) ----------
const WAVES=[null,
 {t:'goblin',n:'哥布林'},{t:'skeleton',n:'骷髅兵'},{t:'gnoll',n:'豺狼人'},{t:'harpy',n:'鹰身女妖',fly:1},{t:'wolfRider',n:'狼骑兵',fast:1},
 {t:'orc',n:'半兽人'},{t:'walkingDead',n:'僵尸',tank:1},{t:'stoneGargoyle',n:'石像鬼',fly:1},{t:'lizardman',n:'蜥蜴人'},{t:'behemoth',n:'比蒙巨兽',boss:1},
 {t:'minotaur',n:'牛头人'},{t:'hellHound',n:'地狱犬',fast:1},{t:'griffin',n:'狮鹫',fly:1},{t:'stoneGolem',n:'石魔像',tank:1},{t:'unicorn',n:'独角兽',fast:1},
 {t:'naga',n:'娜迦'},{t:'wyvern',n:'双足飞龙',fly:1},{t:'redDragon',n:'红龙',fly:1},{t:'hydra',n:'九头蛇',tank:1},{t:'boneDragon',n:'骨龙王',boss:1},
];
function waveDef(w){const base=WAVES[(w-1)%MAXW+1],loop=Math.floor((w-1)/MAXW);
  const E=(typeof process!=='undefined'&&process.env)||{};const hp0=(+E.HPB||15)*Math.pow(+E.HPG||1.45,w-1)*Math.pow(1.6,loop);
  const cnt=base.boss?1:base.fast?12:base.fly?8:10;
  let hp=hp0*(base.tank?1.6:1)*(base.fast?0.7:1)*(base.fly?0.85:1)*(base.boss?22:1);
  const armor=Math.floor(w/4)+(base.tank?3:0)+(base.boss?4:0);
  const spd=(base.fast?1.6:base.boss?0.68:base.tank?0.78:1.02)*(base.fly?1.0:1);
  const gold=base.boss?25+w*2:1+Math.floor(w/5);
  return Object.assign({w,cnt,hp:Math.round(hp),armor,spd,gold,gap:base.fast?0.85:base.boss?0:1.3},base);}
// ---------- rng ----------
// rng state lives on the game object (g.rs) so a game can be snapshotted/restored (retry)
function rngOf(g){if(g.rs==null)g.rs=(g.seed>>>0)||1;return ()=>{let s=g.rs;s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;g.rs=s;return s/4294967296;};}
// ---------- state ----------
function newGame(seed){const g={seed:seed||((Math.random()*1e9)|0),R:null,wave:0,lives:LIVES,gold:10,chance:0,grid:[],towers:[],phase:'build',
  placed:[],pend:[],enemies:[],spawnQ:[],hits:[],t:0,kills:0,leaks:0,events:[],path:null,nextId:1,best:0,over:false,won:false,stats:{dmg:{}}};
  g.R=rngOf(g);for(let i=0;i<W*H;i++)g.grid.push(0); // 0 free, 1 rock, 2 tower, 3 placed-this-round gem
  g.path=findPath(g);startBuild(g);return g;}
const idx=(c,r)=>r*W+c;
const reserved=(c,r)=>WAYS.some(([x,y])=>x===c&&y===r);
function canBuildCell(g,c,r){return c>=0&&r>=0&&c<W&&r<H&&!reserved(c,r)&&g.grid[idx(c,r)]===0;}
// BFS shortest path through all checkpoints in order; returns list of cells or null when any leg is blocked
function bfs(g,a,b,block){const N=W*H,prev=new Int32Array(N).fill(-1),seen=new Uint8Array(N);const q=[idx(a[0],a[1])];seen[q[0]]=1;const goal=idx(b[0],b[1]);
  // neighbour order alternates so paths look natural (down/up first, then sides)
  const D=[[0,1],[1,0],[-1,0],[0,-1]];
  for(let h=0;h<q.length;h++){const cur=q[h];if(cur===goal)break;const c=cur%W,r=(cur/W)|0;
    for(const [dx,dy] of D){const x=c+dx,y=r+dy;if(x<0||y<0||x>=W||y>=H)continue;const k=idx(x,y);if(seen[k])continue;if((g.grid[k]&&k!==goal)||k===block)continue;seen[k]=1;prev[k]=cur;q.push(k);}}
  if(!seen[goal])return null;const out=[];for(let k=goal;k!==-1;k=prev[k]){out.push([k%W,(k/W)|0]);if(k===idx(a[0],a[1]))break;}return out.reverse();}
function findPath(g,block=-1){let full=[];for(let i=0;i<WAYS.length-1;i++){const seg=bfs(g,WAYS[i],WAYS[i+1],block);if(!seg)return null;if(full.length)seg.shift();full=full.concat(seg);}return full;}
function flyPath(){return WAYS.map(p=>p.slice());}
// ---------- build phase ----------
function rollQuality(g){const o=ODDS[g.chance];let x=g.R()*100;for(let q=0;q<5;q++){x-=o[q];if(x<0)return q;}return 0;}
function startBuild(g){g.phase='build';g.placed=[];g.hits=[];for(const t of g.towers){t.wind=0;t.cd=0;t.lock=null;}g.events.push({k:'build'});}
// test a placement: returns {ok, reason, path}
function testPlace(g,c,r){if(g.phase!=='build'||g.placed.length>=5)return {ok:false,reason:'现在不能放置'};
  if(c<0||r<0||c>=W||r>=H)return {ok:false,reason:'超出地图'};
  if(reserved(c,r))return {ok:false,reason:'检查点/出入口不能放置'};
  if(g.grid[idx(c,r)])return {ok:false,reason:'这里已经有东西了'};
  const p=findPath(g,idx(c,r));if(!p)return {ok:false,reason:'不能完全阻断敌人路线！',block:true};return {ok:true,path:p};}
function place(g,c,r){const t=testPlace(g,c,r);if(!t.ok)return t;const type=GTYPES[Math.floor(g.R()*GTYPES.length)],q=rollQuality(g);
  const gem={id:g.nextId++,c,r,type,q,round:g.wave+1};g.grid[idx(c,r)]=3;g.placed.push(gem);g.path=t.path;g.events.push({k:'place',gem});
  if(g.placed.length===5){g.phase='keep';g.events.push({k:'keep'});}return {ok:true,gem};}
const same=(a,b)=>a.type===b.type&&a.q===b.q;
// keep options after 5 placements: keep any one; 2 identical -> +1 quality; 4 identical -> +2; special recipes
function keepOptions(g){const P=g.placed,opts=[];for(const gm of P)opts.push({kind:'keep',gem:gm,res:{type:gm.type,q:gm.q},use:[gm]});
  for(const gm of P){const sm=P.filter(x=>same(x,gm));if(gm.q<4&&sm.length>=2)opts.push({kind:'combine2',gem:gm,res:{type:gm.type,q:Math.min(4,gm.q+1)},use:sm.slice(0,2).includes(gm)?sm.slice(0,2):[gm,sm.find(x=>x!==gm)]});
    if(gm.q<4&&sm.length>=4)opts.push({kind:'combine4',gem:gm,res:{type:gm.type,q:Math.min(4,gm.q+2)},use:[gm,...sm.filter(x=>x!==gm).slice(0,3)]});}
  // recipes: components from this round's gems and/or existing basic gem towers; result goes on a this-round gem
  const pool=P.map(x=>({src:'new',o:x})).concat(g.towers.filter(t=>!t.special).map(t=>({src:'old',o:t})));
  for(const [sid,S] of Object.entries(SPECIAL)){
    for(const host of P){if(!S.recipe.some(([ty,q])=>ty===host.type&&q===host.q))continue;
      const used=[host];let ok=true;const need=S.recipe.slice();need.splice(need.findIndex(([ty,q])=>ty===host.type&&q===host.q),1);
      for(const [ty,q] of need){const f=pool.find(p=>!used.includes(p.o)&&p.o.type===ty&&p.o.q===q);if(!f){ok=false;break;}used.push(f.o);}
      if(ok){opts.push({kind:'special',gem:host,res:{type:sid,q:0,special:1},use:used});break;}}}
  return opts;}
function keep(g,opt){if(g.phase!=='keep')return false;const host=opt.gem;
  const tw={id:host.id,c:host.c,r:host.r,type:opt.res.type,q:opt.res.q,special:!!opt.res.special,cd:0,kills:0,dmg:0};
  // all other gems of this round become rocks; recipe components that were older towers also become rocks
  for(const gm of g.placed)if(gm!==host)g.grid[idx(gm.c,gm.r)]=1;
  for(const u of opt.use)if(u!==host&&!g.placed.includes(u)){g.towers=g.towers.filter(t=>t!==u);g.grid[idx(u.c,u.r)]=1;}
  g.grid[idx(host.c,host.r)]=2;g.towers.push(tw);g.events.push({k:'kept',tw,opt,rocks:g.placed.filter(x=>x!==host).map(x=>[x.c,x.r]).concat(opt.use.filter(u=>u!==host&&!g.placed.includes(u)).map(u=>[u.c,u.r]))});
  g.placed=[];g.path=findPath(g);startWave(g);return true;}
function upgradeChance(g){if(g.chance>=UPCOST.length)return false;const c=UPCOST[g.chance];if(g.gold<c)return false;g.gold-=c;g.chance++;g.events.push({k:'chance',lv:g.chance});return true;}
function removeRock(g,c,r){if(g.phase!=='build'&&g.phase!=='keep')return {ok:false,reason:'只能在建造阶段移除'};if(g.grid[idx(c,r)]!==1)return {ok:false,reason:'这里没有石头'};
  if(g.gold<ROCK_COST)return {ok:false,reason:`金币不足（需要${ROCK_COST}）`};g.gold-=ROCK_COST;g.grid[idx(c,r)]=0;g.path=findPath(g);g.events.push({k:'rockGone',c,r});return {ok:true};}
// ---------- tower stats ----------
const DM=(typeof process!=='undefined'&&process.env&&+process.env.DM)||2;
function towerStats(tw){if(tw.special){const S=SPECIAL[tw.type];return Object.assign({},S,{dmg:S.dmg*DM,burn:(S.burn||0)*DM,poison:(S.poison||0)*DM,name:S.n});}
  const G=GEMS[tw.type],m=QMUL[tw.q];const s=Object.assign({},G);s.dmg=G.dmg*m*DM;s.rng=G.rng+tw.q*0.25;s.name=QN[tw.q]+G.n;
  if(G.poison)s.poison=G.poison*m*DM;if(G.slow)s.slow=Math.min(0.55,G.slow+tw.q*0.05);if(G.multi)s.multi=G.multi+Math.floor(tw.q/1.5);
  if(G.aura)s.aura=G.aura+tw.q*0.05;if(G.crit)s.crit=G.crit+tw.q*0.03;if(G.splash)s.splash=G.splash+tw.q*0.12;if(G.shred)s.shred=G.shred+tw.q;return s;}
// ---------- wave phase ----------
function startWave(g){g.wave++;const d=waveDef(g.wave);g.cur=d;g.phase='wave';g.spawnQ=[];for(let i=0;i<d.cnt;i++)g.spawnQ.push(i*d.gap+2.4);g.waveT=0;g.waveLeft=d.cnt;g.events.push({k:'wave',d});}
function pathLen(pts){let L=0;for(let i=1;i<pts.length;i++)L+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return L;}
function spawnEnemy(g){const d=g.cur;const pts=d.fly?flyPath():g.path;const e={id:g.nextId++,type:d.t,name:d.n,hp:d.hp,maxHp:d.hp,armor:d.armor,spd:d.spd,fly:!!d.fly,boss:!!d.boss,pts,seg:0,s:0,x:pts[0][0],y:pts[0][1],
  slowT:0,slowP:0,poisonT:0,poisonD:0,shred:0,alive:true,dir:[0,1],gold:d.gold,dist:0};g.enemies.push(e);g.events.push({k:'spawn',e});}
function armorMul(a){return a>=0?1-0.06*a/(1+0.06*a):2-Math.pow(0.94,-a);}
function hurt(g,e,dmg,tw,kind){if(!e.alive)return;const a=e.armor-e.shred;const d=dmg*armorMul(a);e.hp-=d;if(tw){tw.dmg+=d;}
  if(e.hp<=0){e.alive=false;g.kills++;let gold=e.gold;if(tw&&tw.special&&SPECIAL[tw.type].gold)gold+=SPECIAL[tw.type].gold;g.gold+=gold;if(tw)tw.kills++;g.events.push({k:'die',e,gold});}}
const PSPD=8;               // projectile speed (cells/s) -> travel 0.15-0.6s
function targets(g,t,s,slack){const c=g.enemies.filter(e=>e.alive&&!(s.groundOnly&&e.fly)&&Math.hypot(e.x-t.c,e.y-t.r)<=s.rng+slack);c.sort((a,b)=>b.dist-a.dist);return c;}
function release(g,t,s){const n=s.multi||1;let tg=(t.lock||[]).map(id=>g.enemies.find(e=>e.id===id)).filter(e=>e&&e.alive&&Math.hypot(e.x-t.c,e.y-t.r)<=s.rng+0.8);
  if(tg.length<n)for(const e of targets(g,t,s,0)){if(tg.length>=n)break;if(!tg.includes(e))tg.push(e);}
  t.lock=null;t.cd=Math.max(0.05,s.cd-(s.wind||0.3));if(!tg.length){t.cd=0;return;}
  for(const e of tg){let d=s.dmg;if(s.air&&e.fly)d*=s.air;else if(s.ground&&!e.fly)d*=s.ground;let crit=false;if(s.crit&&g.R()<s.crit){d*=s.critM;crit=true;}
    const tt=Math.hypot(e.x-t.c,e.y-t.r)/PSPD+0.08;g.hits.push({t:tt,e,tw:t,d,crit,s});g.events.push({k:'shot',tw:t,e,crit,col:s.col,tt,n:tg.length});}}
function land(g,h){const e=h.e,s=h.s,t=h.tw,d=h.d;if(!g.towers.includes(t))return;
  let dealt=0;if(e.alive){const hp0=e.hp;hurt(g,e,d,t);dealt=Math.max(0,hp0-Math.max(0,e.hp));
    if(s.shred)e.shred=Math.max(e.shred,s.shred);
    if(s.slow){e.slowT=2;e.slowP=Math.max(e.slowP,s.slow);}
    if(s.slowP&&!s.slow){e.slowT=Math.max(e.slowT,1.5);e.slowP=Math.max(e.slowP,s.slowP);}
    if(s.poison){e.poisonT=3;e.poisonD=Math.max(e.poisonD,s.poison);e.poisonBy=t;}}
  g.events.push({k:'hit',tw:t,e,crit:h.crit,d:dealt,col:s.col,x:e.x,y:e.y});
  if(s.splash){for(const o of g.enemies)if(o!==e&&o.alive&&o.fly===e.fly&&Math.hypot(o.x-e.x,o.y-e.y)<=s.splash){hurt(g,o,d*s.splashP,t);if(s.slow){o.slowT=2;o.slowP=Math.max(o.slowP,s.slow);}}g.events.push({k:'splash',x:e.x,y:e.y,r:s.splash,col:s.col,fly:e.fly});}}
function stepWave(g,dt){g.waveT+=dt;g.t+=dt;
  while(g.spawnQ.length&&g.spawnQ[0]<=g.waveT){g.spawnQ.shift();spawnEnemy(g);}
  // enemies move
  for(const e of g.enemies){if(!e.alive)continue;
    if(e.poisonT>0){e.poisonT-=dt;hurt(g,e,e.poisonD*dt,e.poisonBy,'poison');if(!e.alive)continue;}
    if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slowP=0;}const sp=e.spd*(e.slowT>0?1-e.slowP:1);let mv=sp*dt;e.dist+=mv;
    while(mv>0&&e.seg<e.pts.length-1){const a=e.pts[e.seg],b=e.pts[e.seg+1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const rem=L-e.s;
      if(mv<rem){e.s+=mv;mv=0;}else{mv-=rem;e.seg++;e.s=0;}
      const a2=e.pts[e.seg],b2=e.pts[Math.min(e.seg+1,e.pts.length-1)];const L2=Math.hypot(b2[0]-a2[0],b2[1]-a2[1])||1;e.x=a2[0]+(b2[0]-a2[0])*e.s/L2;e.y=a2[1]+(b2[1]-a2[1])*e.s/L2;if(L2>0.001)e.dir=[(b2[0]-a2[0])/L2,(b2[1]-a2[1])/L2];}
    if(e.seg>=e.pts.length-1){e.alive=false;e.leaked=true;const cost=e.boss?5:1;g.lives=Math.max(0,g.lives-cost);g.leaks++;g.events.push({k:'leak',e,cost});}}
  // auras: opal attack speed; burn auras
  const st=g.towers.map(towerStats);const aspd=g.towers.map(()=>1);
  g.towers.forEach((t,i)=>{const s=st[i];if(s.aura)g.towers.forEach((o,j)=>{if(j!==i&&Math.hypot(o.c-t.c,o.r-t.r)<=s.rng)aspd[j]=Math.max(aspd[j],1+s.aura);});});
  g.towers.forEach((t,i)=>{const s=st[i];
    if(s.burn){for(const e of g.enemies)if(e.alive&&Math.hypot(e.x-t.c,e.y-t.r)<=s.rng)hurt(g,e,s.burn*dt,t,'burn');t.burnFx=(t.burnFx||0)+dt;if(t.burnFx>0.5){t.burnFx=0;if(g.enemies.some(e=>e.alive&&Math.hypot(e.x-t.c,e.y-t.r)<=s.rng))g.events.push({k:'burn',tw:t,rng:s.rng});}}
    if(!s.dmg)return;
    if(t.wind>0){t.wind-=dt*aspd[i];if(t.wind<=0)release(g,t,s);return;}
    t.cd-=dt*aspd[i];if(t.cd>0)return;
    const cand=targets(g,t,s,0);if(!cand.length){t.cd=0;return;}
    // wind-up: the gem charges for s.wind seconds before the bolt leaves (readable attack)
    t.lock=cand.slice(0,s.multi||1).map(e=>e.id);t.wind=s.wind||0.3;g.events.push({k:'charge',tw:t,dur:t.wind/aspd[i],col:s.col});});
  // projectiles in flight land after their travel time
  for(let i=g.hits.length-1;i>=0;i--){const h=g.hits[i];h.t-=dt;if(h.t>0)continue;g.hits.splice(i,1);land(g,h);}
  g.enemies=g.enemies.filter(e=>e.alive||false);
  if(g.lives<=0&&!g.over){g.over=true;g.phase='over';g.events.push({k:'over',win:false});return;}
  if(!g.spawnQ.length&&!g.enemies.length&&!g.hits.some(h=>h.e.alive)){const bonus=5+g.wave;g.gold+=bonus;g.events.push({k:'waveClear',w:g.wave,bonus});
    if(g.wave===MAXW&&!g.won){g.won=true;g.events.push({k:'victory'});}startBuild(g);}}
// snapshot at the start of a build phase (no enemies alive) -> plain JSON; restore rebuilds the rng
function snapshot(g){return JSON.stringify(g,(k,v)=>k==='R'||k==='events'||k==='poisonBy'||k==='hits'?undefined:v);}
function restore(str){const g=JSON.parse(str);g.events=[];g.R=rngOf(g);g.enemies=[];g.spawnQ=[];g.hits=[];return g;}
const api={snapshot,restore,W,H,SPAWN,EXIT,CPS,WAYS,LIVES,MAXW,QN,QS,QMUL,GEMS,GTYPES,SPECIAL,ODDS,UPCOST,ROCK_COST,WAVES,waveDef,newGame,findPath,flyPath,testPlace,place,keepOptions,keep,upgradeChance,removeRock,towerStats,stepWave,canBuildCell,reserved,idx,pathLen,armorMul};
if(typeof module!=='undefined')module.exports=api;else root.TD=api;})(this);

// Shared rules + real-time grid battle simulation (browser + node).
// Creature stats: exact Heroes of Might and Magic III (SoD) values. Abilities/shots/size per
// VCMI config/creatures/*.json (vcmi/vcmi); numeric stats (VCMI reads them from H3 CRTRAITS.TXT)
// cross-checked against heroes.thelazy.net "List of creatures".
(function(root){
// a/d attack/defense, dmg [min,max], hp, spd speed, shots, g weekly growth, v AI value, lvl level
// fw/fh grid footprint (VCMI doubleWide -> 2 wide). sz = art scale hint. ab = abilities.
const U = {
 pikeman:    {n:'枪兵',  h3:'Pikeman',     side:'p',lvl:1,a:4, d:5, dmg:[1,3],  hp:10, spd:4, shots:0, g:14,v:80,  sz:120,fx:'thrust',ab:{joustImmune:1}},
 crossbowman:{n:'弓箭手',h3:'Archer',      side:'p',lvl:2,a:6, d:3, dmg:[2,3],  hp:10, spd:4, shots:12,g:9, v:126, sz:115,proj:'bolt'},
 griffin:    {n:'狮鹫',  h3:'Griffin',     side:'p',lvl:3,a:8, d:8, dmg:[3,6],  hp:25, spd:6, shots:0, g:7, v:351, sz:150,fw:2,fly:1,quad:1,fx:'dive',ab:{retal:2}},
 swordsman:  {n:'剑士',  h3:'Swordsman',   side:'p',lvl:4,a:10,d:12,dmg:[6,9],  hp:35, spd:5, shots:0, g:4, v:445, sz:135,fx:'slash'},
 monk:       {n:'僧侣',  h3:'Monk',        side:'p',lvl:5,a:12,d:7, dmg:[10,12],hp:30, spd:5, shots:12,g:3, v:485, sz:135,proj:'holy'},
 cavalier:   {n:'骑士',  h3:'Cavalier',    side:'p',lvl:6,a:15,d:15,dmg:[15,25],hp:100,spd:7, shots:0, g:2, v:1946,sz:165,fw:2,quad:1,fx:'charge',ab:{joust:0.05}},
 centaur:    {n:'半人马',h3:'Centaur',     side:'p',lvl:1,a:5, d:3, dmg:[2,3],  hp:8,  spd:6, shots:0, g:14,v:100, sz:140,fw:2,quad:1,fx:'slash'},
 angel:      {n:'天使',  h3:'Angel',       side:'p',lvl:7,a:20,d:20,dmg:[50,50],hp:200,spd:12,shots:0, g:1, v:5019,sz:170,fw:2,fh:2,fly:1,fx:'flame',ab:{hate:{devil:0.5,archDevil:0.5},morale:1}},
 skeleton:   {n:'骷髅兵',h3:'Skeleton',    side:'e',lvl:1,a:5, d:4, dmg:[1,3],  hp:6,  spd:4, shots:0, g:12,v:60,  sz:120,fx:'slash',ab:{undead:1}},
 zombie:     {n:'僵尸',  h3:'Walking Dead',side:'e',lvl:2,a:5, d:5, dmg:[2,3],  hp:15, spd:3, shots:0, g:8, v:98,  sz:120,fx:'bite',ab:{undead:1}},
 goblin:     {n:'哥布林',h3:'Goblin',      side:'e',lvl:1,a:4, d:2, dmg:[1,2],  hp:5,  spd:5, shots:0, g:15,v:60,  sz:110,fx:'thrust'},
 orc:        {n:'兽人',  h3:'Orc',         side:'e',lvl:3,a:8, d:4, dmg:[2,5],  hp:15, spd:4, shots:12,g:7, v:192, sz:140,proj:'axe'},
 wolfrider:  {n:'狼骑兵',h3:'Wolf Rider',  side:'e',lvl:2,a:7, d:5, dmg:[2,4],  hp:10, spd:6, shots:0, g:9, v:130, sz:140,fw:2,quad:1,fx:'thrust'},
 imp:        {n:'小恶魔',h3:'Imp',         side:'e',lvl:1,a:2, d:3, dmg:[1,2],  hp:4,  spd:5, shots:0, g:15,v:50,  sz:105,fx:'claw'},
 lich:       {n:'巫妖',  h3:'Lich',        side:'e',lvl:5,a:13,d:10,dmg:[11,13],hp:30, spd:6, shots:12,g:3, v:848, sz:140,proj:'death',ab:{undead:1,deathCloud:1}},
 dragon:     {n:'绿龙',  h3:'Green Dragon',side:'e',lvl:7,a:18,d:18,dmg:[40,50],hp:180,spd:10,shots:0, g:1, v:4872,sz:185,fw:2,fh:2,fly:1,quad:1,fx:'breath',ab:{breath:1,dragon:1,spellImm:3}},
};
for(const k in U){U[k].tier=U[k].lvl;}
const PLAYER=['pikeman','crossbowman','griffin','swordsman','monk','cavalier','centaur','angel'];
const W=1280,H=720,MAXS=7,FX0=185,FX1=1095,FY0=140,FY1=592;
const GC=15,GR=10,GX0=135,GY0=88,CW=65.5,CH=52.6;
const ROUND=2.5;           // one HoMM3 combat round of real time: one action + retaliations per stack
const CELLPX=(CW+CH)/2;
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
let R=Math.random;const setRng=f=>{R=f;};
const pick=a=>a[Math.floor(R()*a.length)];

// ---- drafting: counts follow HoMM3 weekly growth (x weeks factor) ----
const weeks=s=>0.6+0.3*(s-1);
function makeOffer(stage,army){
  const full=army.length>=MAXS;
  let pool=full?army.map(s=>s.type):PLAYER.filter(t=>U[t].lvl<=Math.min(7,stage+1)&&(U[t].lvl<7||stage>=5));
  const t=pick(pool);const g=U[t].g*weeks(stage)*(0.85+R()*0.3);
  return {type:t,count:Math.max(1,Math.round(g))};
}
const ENEMY_POOLS=[['goblin','skeleton','imp'],['goblin','skeleton','imp','zombie','wolfrider'],['skeleton','zombie','wolfrider','orc','goblin'],['zombie','wolfrider','orc','lich','skeleton'],['orc','wolfrider','lich','zombie','skeleton'],['orc','lich','dragon','zombie','wolfrider']];
function enemyWeeks(s){return 0.3+0.17*(s-1)+0.05*Math.max(0,s-4)**1.6+0.15*Math.max(0,s-5)**1.5;}
function makeEnemies(stage){
  const pool=ENEMY_POOLS[Math.min(stage-1,ENEMY_POOLS.length-1)];
  const n=Math.min(MAXS,1+Math.ceil(stage*0.75));const out=[];const used={};
  for(let i=0;i<n;i++){let t=pick(pool);if(U[t].lvl===7&&used.dragon)t=pick(pool.filter(x=>U[x].lvl<7));used[t]=1;
    out.push({type:t,count:Math.max(1,Math.round(U[t].g*enemyWeeks(stage)*(0.8+R()*0.4)/Math.max(1,n/3)))});}
  return out;
}
// ---- HoMM3 damage formula ----
function dmgMul(a,d){return a>=d?Math.min(4,1+0.05*(a-d)):Math.max(0.3,1-0.025*(d-a));}

const fwOf=st=>st.fw||1,fhOf=st=>st.fh||1;
function cellCenter(ax,ay,fw,fh){return [GX0+(ax+fw/2)*CW,GY0+(ay+fh/2)*CH];}
function createBattle(army,enemies){
  const b={units:[],proj:[],events:[],pend:[],t:0,round:0,focus:null,over:null,occ:new Int16Array(GC*GR).fill(-1)};let id=0;
  const rows1=[4,5,3,6,2,7,1,8,0,9],rows2=[4,3,5,2,6,1,7,0,8];
  const place=(list,side)=>{
    const order=list.map((s,i)=>({s,i})).sort((p,q)=>(U[q.s.type].shots>0)-(U[p.s.type].shots>0));
    for(const {s} of order){const st=U[s.type],fw=fwOf(st),fh=fhOf(st),ranged=st.shots>0;
      const cols=fw===2?[1,2,0,3]:ranged?[0,1,2,3]:[2,3,1,0];let done=false;
      for(const c of cols){for(const r of (fh===2?rows2:rows1)){const ax=side==='p'?c:GC-c-fw,ay=r;
        const u={id,type:s.type,st,side,count:s.count,start:s.count,top:st.hp,fw,fh,ax,ay,moving:false,mt:0,md:0,fx:ax,fy:ay,
          cd:Math.max(0.15,(1-st.spd/13)*1.6)+R()*0.3,shots:st.shots,target:null,alive:true,wind:0,wt:0,state:'idle',atkT:0,hitT:0,
          face:side==='p'?1:-1,walkT:R()*6,hold:false,think:0,ret:(st.ab&&st.ab.retal)||1,moved:0};
        if(fits(b,u,ax,ay)){[u.x,u.y]=cellCenter(ax,ay,fw,fh);occSet(b,u,ax,ay,u.id);b.units.push(u);id++;done=true;break;}}
        if(done)break;}}
  };
  place(army,'p');place(enemies,'e');
  return b;
}
function fits(b,u,ax,ay){if(ax<0||ay<0||ax+u.fw>GC||ay+u.fh>GR)return false;
  for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const o=b.occ[(ay+j)*GC+ax+i];if(o!==-1&&o!==u.id)return false;}return true;}
function occSet(b,u,ax,ay,v){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++)b.occ[(ay+j)*GC+ax+i]=v;}
function occClear(b,u,ax,ay){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const k=(ay+j)*GC+ax+i;if(b.occ[k]===u.id)b.occ[k]=-1;}}
function gapAt(ax,ay,fw,fh,t){const dx=Math.max(t.ax-(ax+fw-1),ax-(t.ax+t.fw-1),0),dy=Math.max(t.ay-(ay+fh-1),ay-(t.ay+t.fh-1),0);return Math.max(dx,dy);}
const adjacent=(a,t)=>gapAt(a.ax,a.ay,a.fw,a.fh,t)<=1;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function pathStep(b,u,t){
  const key=(x,y)=>y*GC+x,prev=new Int16Array(GC*GR).fill(-2),q=[[u.ax,u.ay]];prev[key(u.ax,u.ay)]=-1;let goal=null,qi=0;
  while(qi<q.length){const [x,y]=q[qi++];if(gapAt(x,y,u.fw,u.fh,t)<=1&&(x!==u.ax||y!==u.ay)){goal=[x,y];break;}
    for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GC||ny>=GR||prev[key(nx,ny)]!==-2)continue;
      if(!fits(b,u,nx,ny))continue;if(dx&&dy&&(!fits(b,u,x+dx,y)||!fits(b,u,x,y+dy)))continue;
      prev[key(nx,ny)]=key(x,y);q.push([nx,ny]);}}
  if(!goal)return null;let k=key(goal[0],goal[1]);while(prev[k]!==key(u.ax,u.ay)&&prev[k]>=0)k=prev[k];return [k%GC,Math.floor(k/GC)];
}
function flyGoal(b,u,t){let best=null,bd=1e9;
  for(let y=0;y<GR;y++)for(let x=0;x<GC;x++){if(gapAt(x,y,u.fw,u.fh,t)>1||!fits(b,u,x,y))continue;const d=Math.hypot(x-u.ax,y-u.ay);if(d<bd){bd=d;best=[x,y];}}return best;}
// HoMM3 speed = hexes per turn -> cells per ROUND
function speedPx(u){return u.st.spd*CELLPX/ROUND;}
function startMove(b,u,nx,ny){u.fx=u.ax;u.fy=u.ay;occSet(b,u,nx,ny,u.id);u.moved+=Math.max(Math.abs(nx-u.ax),Math.abs(ny-u.ay));u.ax=nx;u.ay=ny;u.moving=true;u.mt=0;
  const d=Math.hypot((nx-u.fx)*CW,(ny-u.fy)*CH);u.md=d/speedPx(u);u.state='walk';}
function applyDamage(b,src,tgt,dmg,kind){
  if(!tgt.alive)return;
  const total=(tgt.count-1)*tgt.st.hp+tgt.top-dmg;const before=tgt.count;
  if(total<=0){tgt.count=0;tgt.alive=false;occClear(b,tgt,tgt.ax,tgt.ay);if(tgt.moving)occClear(b,tgt,tgt.fx,tgt.fy);if(b.focus===tgt)b.focus=null;}
  else{tgt.count=Math.ceil(total/tgt.st.hp);tgt.top=total-(tgt.count-1)*tgt.st.hp;}
  tgt.hitT=1;
  b.events.push({k:'hit',u:tgt,src,dmg:Math.round(dmg),killed:before-tgt.count,dead:!tgt.alive,big:dmg>=Math.max(60,tgt.st.hp*before*0.25),kind});
}
// HoMM3 damage roll: <=10 creatures roll each, more: 10 rolls scaled (as in the original)
function baseRoll(u){const st=u.st,n=u.count,r=()=>st.dmg[0]+Math.floor(R()*(st.dmg[1]-st.dmg[0]+1));
  if(n<=10){let s=0;for(let i=0;i<n;i++)s+=r();return s;}let s=0;for(let i=0;i<10;i++)s+=r();return Math.floor(s*n/10);}
function calcDmg(b,u,t,opt={}){
  let m=dmgMul(u.st.a,t.st.d);
  const ab=u.st.ab||{};
  if(opt.melee&&u.st.shots>0)m*=0.5;                         // shooter in melee: half
  if(opt.ranged&&opt.far)m*=0.5;                              // range penalty (> 10 cells)
  if(opt.melee&&ab.joust&&!(t.st.ab&&t.st.ab.joustImmune))m*=1+ab.joust*u.moved; // jousting
  if(ab.hate&&ab.hate[t.type])m*=1+ab.hate[t.type];
  return Math.max(1,Math.floor(baseRoll(u)*m));
}
function doMelee(b,u,t,isRetal){
  const dmg=calcDmg(b,u,t,{melee:1});u.moved=0;
  b.events.push({k:'strike',u,t,retal:!!isRetal});applyDamage(b,u,t,dmg,'melee');
  // dragon breath: same damage to whatever stands in the next cell behind the target
  if(u.st.ab&&u.st.ab.breath){const dx=Math.sign(Math.round((t.x-u.x)/CW)),dy=Math.sign(Math.round((t.y-u.y)/CH));
    const cx=dx>0?t.ax+t.fw:dx<0?t.ax-1:Math.min(Math.max(u.ax,t.ax),t.ax+t.fw-1),cy=dy>0?t.ay+t.fh:dy<0?t.ay-1:Math.min(Math.max(u.ay,t.ay),t.ay+t.fh-1);
    if(cx>=0&&cy>=0&&cx<GC&&cy<GR){const o=b.occ[cy*GC+cx];const v=b.units.find(z=>z.id===o);if(v&&v!==t&&v!==u&&v.alive){applyDamage(b,u,v,calcDmg(b,u,v,{melee:1}),'breath');b.events.push({k:'breath2',u,t:v});}}}
  // retaliation (once per round, griffin twice), not against retaliations
  if(!isRetal&&t.alive&&adjacent(t,u)&&t.ret>0){t.ret--;b.pend.push({at:b.t+0.4,u:t,t:u});}
}
function step(b,dt){
  if(b.over)return;b.t+=dt;const L=b.units;
  const r=Math.floor(b.t/ROUND);if(r!==b.round){b.round=r;for(const u of L)u.ret=(u.st.ab&&u.st.ab.retal)||1;}
  for(const p of b.pend)if(b.t>=p.at&&!p.done){p.done=1;if(p.u.alive&&p.t.alive&&adjacent(p.u,p.t)){p.u.atkT=1;p.u.wt=0.3;doMelee(b,p.u,p.t,true);}}
  b.pend=b.pend.filter(p=>!p.done);
  for(const u of L){if(!u.alive)continue;
    u.cd-=dt;u.atkT=Math.max(0,u.atkT-dt*2.6);u.hitT=Math.max(0,u.hitT-dt*7);u.think-=dt;
    if(u.moving){u.mt+=dt;const k=Math.min(1,u.mt/u.md);const [x0,y0]=cellCenter(u.fx,u.fy,u.fw,u.fh),[x1,y1]=cellCenter(u.ax,u.ay,u.fw,u.fh);
      u.x=x0+(x1-x0)*k;u.y=y0+(y1-y0)*k;u.walkT+=dt*speedPx(u)/CELLPX;if(x1!==x0)u.face=x1>x0?1:-1;
      if(k>=1){u.moving=false;occClear(b,u,u.fx,u.fy);occSet(b,u,u.ax,u.ay,u.id);u.think=0;}else continue;}
    const foes=L.filter(o=>o.alive&&o.side!==u.side);if(!foes.length)continue;
    const adj=foes.filter(o=>adjacent(u,o));
    let t=null;const focus=u.side==='p'&&b.focus&&b.focus.alive?b.focus:null;
    if(u.wind>0&&u.windT&&u.windT.alive)t=u.windT;
    else if(adj.length&&(u.hold||!focus||adj.includes(focus)||u.st.shots>0))t=focus&&adj.includes(focus)?focus:adj.reduce((a,c)=>a.count*a.st.v<c.count*c.st.v?a:c);
    else if(u.hold)t=null;
    else if(focus)t=focus;
    else{let bd=1e9;for(const o of foes){const d=Math.hypot(o.x-u.x,o.y-u.y);if(d<bd){bd=d;t=o;}}}
    u.target=t;if(!t){u.state='idle';continue;}
    if(Math.abs(t.x-u.x)>4)u.face=t.x>u.x?1:-1;
    const isAdj=adjacent(u,t),ranged=u.shots>0&&!adj.length;
    if(ranged||isAdj){u.state='idle';
      if(u.cd<=0&&!u.wind){u.wind=u.wt=ranged?0.42:(u.st.fx==='breath'?0.5:0.36);u.windT=t;b.events.push({k:'wind',u,ranged});}
      if(u.wind&&(u.wind-=dt)<=0){u.wind=0;u.atkT=1;u.cd=ROUND;
        if(ranged){u.shots--;const far=gapAt(u.ax,u.ay,u.fw,u.fh,t)>10;
          b.proj.push({x:u.x+u.face*20,y:u.y,z:40,t,src:u,kind:u.st.proj,dmg:calcDmg(b,u,t,{ranged:1,far}),sp:u.st.proj==='bolt'?900:u.st.proj==='axe'?560:520,d0:Math.hypot(t.x-u.x,t.y-u.y)});b.events.push({k:'shoot',u});}
        else doMelee(b,u,t,false);}
    } else if(u.think<=0&&!u.wind){
      u.think=0.1;let nx=null;
      if(u.st.fly){const g=flyGoal(b,u,t);if(g)nx=g;}else{const s=pathStep(b,u,t);if(s)nx=s;}
      if(nx&&(nx[0]!==u.ax||nx[1]!==u.ay))startMove(b,u,nx[0],nx[1]);else u.state='idle';
    }
  }
  for(const p of b.proj){const dx=p.t.x-p.x,dy=p.t.y-p.y,d=Math.hypot(dx,dy);
    if(d<p.sp*dt||!p.t.alive){
      if(p.t.alive){applyDamage(b,p.src,p.t,p.dmg,'ranged');
        // Lich death cloud: same damage to every living (non-undead) stack around the target, friend or foe
        if(p.src.st.ab&&p.src.st.ab.deathCloud){b.events.push({k:'cloud',t:p.t});for(const v of b.units)if(v!==p.t&&v.alive&&!(v.st.ab&&v.st.ab.undead)&&gapAt(v.ax,v.ay,v.fw,v.fh,p.t)<=1)applyDamage(b,p.src,v,calcDmg(b,p.src,v,{ranged:1}),'cloud');}}
      p.done=1;b.events.push({k:'impact',p});}
    else{p.x+=dx/d*p.sp*dt;p.y+=dy/d*p.sp*dt;}}
  b.proj=b.proj.filter(p=>!p.done);
  const pa=L.some(u=>u.alive&&u.side==='p'),ea=L.some(u=>u.alive&&u.side==='e');
  if(!pa||!ea||b.t>180)b.over=ea?(pa?'timeout':'lose'):'win';
  if(b.over==='timeout'){const hp=s=>L.filter(u=>u.alive&&u.side===s).reduce((a,u)=>a+u.count*u.st.v,0);b.over=hp('p')>hp('e')?'win':'lose';}
}
const api={U,PLAYER,W,H,MAXS,FX0,FX1,FY0,FY1,GC,GR,GX0,GY0,CW,CH,ROUND,cellCenter,rng,setRng,makeOffer,makeEnemies,createBattle,step,dmgMul,weeks,enemyWeeks};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);

// Shared rules + real-time grid battle simulation (browser + node).
// Creature stats: exact Heroes of Might and Magic III (SoD) values. Abilities/shots/size per
// VCMI config/creatures/*.json (vcmi/vcmi); numeric stats (VCMI reads them from H3 CRTRAITS.TXT)
// cross-checked against heroes.thelazy.net "List of creatures".
(function(root){
// Creature table generated into units.js (gen_units.py): exact HoMM3 SoD numbers + VCMI ability/size data.
const UN=(typeof module!=='undefined')?require('./units.js'):root.UNITS;
const U=UN.D,FACTIONS=UN.F,FNAME=UN.FN;
for(const k in U){U[k].tier=U[k].lvl;U[k].id=k;}
const PLAYER=FACTIONS.castle;
const W=1280,H=720,MAXS=7,FX0=185,FX1=1095,FY0=140,FY1=592;
const GC=15,GR=10,GX0=135,GY0=88,CW=65.5,CH=52.6;
const ROUND=2.5;           // one HoMM3 combat round of real time: one action + retaliations per stack
const CELLPX=(CW+CH)/2;
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
let R=Math.random;const setRng=f=>{R=f;};
const pick=a=>a[Math.floor(R()*a.length)];

// ---- HoMM3 damage formula ----
function dmgMul(a,d){return a>=d?Math.min(4,1+0.05*(a-d)):Math.max(0.3,1-0.025*(d-a));}

const fwOf=st=>st.fw||1,fhOf=st=>st.fh||1;
function cellCenter(ax,ay,fw,fh){return [GX0+(ax+fw/2)*CW,GY0+(ay+fh/2)*CH];}
// per-stack modifiers (artifacts/synergies/themes) are applied to a cloned stat block; base HoMM3 numbers stay untouched
function modStats(base,mod){if(!mod)return base;const st=Object.assign({},base,{ab:Object.assign({},base.ab||{})});
  for(const k in mod){const v=mod[k];if(k==='ab')Object.assign(st.ab,v);else if(k==='hpMul')st.hp=Math.max(1,Math.round(st.hp*v));else if(k==='shotMul')st.shots=Math.round(st.shots*v);
    else if(k==='fly')st.fly=v;else if(typeof v==='number')st[k]=(st[k]||0)+v;else st[k]=v;}
  return st;}
function makeUnit(b,s,side,ax,ay,bonus){const st=modStats(U[s.type],s.mod),fw=fwOf(st),fh=fhOf(st);
  return {id:b.nid++,type:s.type,st,side,count:s.count,start:s.count,top:st.hp,fw,fh,ax,ay,moving:false,mt:0,md:0,fx:ax,fy:ay,boss:s.boss||null,
    cd:Math.max(0.15,(1-Math.min(st.spd,16)/18)*1.6)+R()*0.3,shots:st.shots,target:null,alive:true,wind:0,wt:0,state:'idle',atkT:0,hitT:0,
    face:side==='p'?1:-1,walkT:R()*6,hold:false,think:0,ret:(st.ab&&st.ab.retal)||1,moved:0,stun:0,curse:0,buf:{},volley:1,bon:(bonus&&bonus[side])||{a:0,d:0}};}
function autoSlot(b,st,side,minCol,maxCol){const fw=fwOf(st),fh=fhOf(st),ranged=st.shots>0;const rows1=[4,5,3,6,2,7,1,8,0,9],rows2=[4,3,5,2,6,1,7,0,8];
  const cols=fw===2?[1,2,0,3,4,5]:ranged?[0,1,2,3,4,5]:[2,3,1,0,4,5,6];
  for(const c of cols){for(const r of (fh===2?rows2:rows1)){const ax=side==='p'?c:GC-c-fw,ay=r;const tmp={id:-9,fw,fh};if(fits(b,tmp,ax,ay))return [ax,ay];}}
  for(let y=0;y<GR;y++)for(let x=0;x<GC;x++){const ax=side==='p'?x:GC-x-fw;if(fits(b,{id:-9,fw,fh},ax,y))return [ax,y];}return null;}
function createBattle(army,enemies,bonus){
  const b={units:[],proj:[],events:[],pend:[],t:0,round:0,focus:null,over:null,occ:new Int16Array(GC*GR).fill(-1),nid:0};
  const place=(list,side)=>{
    const order=list.map((s,i)=>({s,i})).sort((p,q)=>((p.s.ax!=null)?0:1)-((q.s.ax!=null)?0:1)||(U[q.s.type].shots>0)-(U[p.s.type].shots>0));
    for(const {s} of order){const st=modStats(U[s.type],s.mod);let pos=null;
      if(s.ax!=null&&fits(b,{id:-9,fw:fwOf(st),fh:fhOf(st)},s.ax,s.ay))pos=[s.ax,s.ay];if(!pos)pos=autoSlot(b,st,side);if(!pos)continue;
      const u=makeUnit(b,s,side,pos[0],pos[1],bonus);[u.x,u.y]=cellCenter(u.ax,u.ay,u.fw,u.fh);occSet(b,u,u.ax,u.ay,u.id);b.units.push(u);}
  };
  place(army,'p');place(enemies,'e');
  return b;
}
// mid-battle summon (boss mechanics / raise dead): nearest free slot to a point
function spawn(b,side,type,count,near,mod){const st=modStats(U[type],mod),fw=fwOf(st),fh=fhOf(st);let best=null,bd=1e9;
  for(let y=0;y<GR;y++)for(let x=0;x<GC;x++){if(!fits(b,{id:-9,fw,fh},x,y))continue;const d=near?Math.hypot(x-near.ax,y-near.ay):(side==='e'?GC-x:x);if(d<bd){bd=d;best=[x,y];}}
  if(!best)return null;const u=makeUnit(b,{type,count,mod},side,best[0],best[1],null);[u.x,u.y]=cellCenter(u.ax,u.ay,u.fw,u.fh);occSet(b,u,u.ax,u.ay,u.id);u.cd=0.6;b.units.push(u);b.events.push({k:'spawn',u});return u;}
// relocate during deploy
function moveTo(b,u,ax,ay){occClear(b,u,u.ax,u.ay);if(!fits(b,u,ax,ay)){occSet(b,u,u.ax,u.ay,u.id);return false;}u.ax=u.fx=ax;u.ay=u.fy=ay;occSet(b,u,ax,ay,u.id);[u.x,u.y]=cellCenter(ax,ay,u.fw,u.fh);return true;}
const rate=(b,u)=>(u.buf.haste>b.t?1.45:1)*(u.buf.slow>b.t?0.6:1);
function fits(b,u,ax,ay){if(ax<0||ay<0||ax+u.fw>GC||ay+u.fh>GR)return false;
  for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const o=b.occ[(ay+j)*GC+ax+i];if(o!==-1&&o!==u.id)return false;}return true;}
function occSet(b,u,ax,ay,v){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++)b.occ[(ay+j)*GC+ax+i]=v;}
function occClear(b,u,ax,ay){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const k=(ay+j)*GC+ax+i;if(b.occ[k]===u.id)b.occ[k]=-1;}}
function gapAt(ax,ay,fw,fh,t){const dx=Math.max(t.ax-(ax+fw-1),ax-(t.ax+t.fw-1),0),dy=Math.max(t.ay-(ay+fh-1),ay-(t.ay+t.fh-1),0);return Math.max(dx,dy);}
const adjacent=(a,t)=>gapAt(a.ax,a.ay,a.fw,a.fh,t)<=1;
function fire(b,u,t){const far=gapAt(u.ax,u.ay,u.fw,u.fh,t)>10;const k=u.st.proj;
  const _d=Math.hypot(t.x-u.x,t.y-u.y)||1;b.proj.push({x:u.x+(t.x-u.x)/_d*20,y:u.y+(t.y-u.y)/_d*20,z:40,t,src:u,kind:k,dmg:calcDmg(b,u,t,{ranged:1,far}),sp:k==='bolt'||k==='bolt2'?900:k==='axe'||k==='rock'?560:k==='arrow'?760:520,d0:Math.hypot(t.x-u.x,t.y-u.y)});b.events.push({k:'shoot',u});u.volley=0;}

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
// HoMM3 speed compressed into a narrow band: speed 3 -> 2.2 cells/round, speed 18 -> 4.1 (~1.9x)
const cellsPerRound=spd=>1.8+0.13*spd;
function speedPx(u,b){return cellsPerRound(u.st.spd)*CELLPX/ROUND*(b?rate(b,u):1);}
function startMove(b,u,nx,ny){u.fx=u.ax;u.fy=u.ay;occSet(b,u,nx,ny,u.id);u.moved+=Math.max(Math.abs(nx-u.ax),Math.abs(ny-u.ay));u.ax=nx;u.ay=ny;u.moving=true;u.mt=0;
  const d=Math.hypot((nx-u.fx)*CW,(ny-u.fy)*CH);u.md=d/speedPx(u,b);u.state='walk';}
function applyDamage(b,src,tgt,dmg,kind){
  if(!tgt.alive)return;
  const total=(tgt.count-1)*tgt.st.hp+tgt.top-dmg;const before=tgt.count;
  if(total<=0){tgt.count=0;tgt.alive=false;occClear(b,tgt,tgt.ax,tgt.ay);if(tgt.moving)occClear(b,tgt,tgt.fx,tgt.fy);if(b.focus===tgt)b.focus=null;}
  else{tgt.count=Math.ceil(total/tgt.st.hp);tgt.top=total-(tgt.count-1)*tgt.st.hp;}
  tgt.hitT=1;
  b.events.push({k:'hit',u:tgt,src,dmg:Math.round(dmg),killed:before-tgt.count,dead:!tgt.alive,big:dmg>=Math.max(60,tgt.st.hp*before*0.25),crit:!!b.crit&&!!src,kind});b.crit=0;
}
// HoMM3 damage roll: <=10 creatures roll each, more: 10 rolls scaled (as in the original)
function baseRoll(u){const st=u.st,n=u.count,r=()=>st.dmg[0]+Math.floor(R()*(st.dmg[1]-st.dmg[0]+1));
  if(n<=10){let s=0;for(let i=0;i<n;i++)s+=r();return s;}let s=0;for(let i=0;i<10;i++)s+=r();return Math.floor(s*n/10);}
function calcDmg(b,u,t,opt={}){
  const ab=u.st.ab||{};let D=t.st.d+t.bon.d;if(ab.ignoreDef)D=Math.floor(D*(1-ab.ignoreDef));
  let m=dmgMul(u.st.a+u.bon.a+(opt.melee&&u.buf.blood>b.t?4:0),D);
  if(opt.melee&&u.st.shots>0&&!ab.noMP)m*=0.5;               // shooter in melee: half (unless "no melee penalty")
  if(opt.ranged&&opt.far&&!ab.sharp)m*=0.5;                    // range penalty (> 10 cells); Bow of the Sharpshooter ignores it
  if(opt.ranged&&ab.sharp&&u.volley){m*=2;}
  if(opt.ranged&&ab.rngMul)m*=ab.rngMul;
  if(ab.rage&&((u.count-1)*u.st.hp+u.top)<u.start*u.st.hp*0.5)m*=1.3;
  if(opt.melee&&ab.joust&&!(t.st.ab&&t.st.ab.joustImm))m*=1+ab.joust*u.moved; // jousting
  if(ab.hate&&ab.hate[t.type])m*=1+ab.hate[t.type];
  let base=u.curse>b.t?u.count*u.st.dmg[0]:u.buf.bless>b.t?u.count*u.st.dmg[1]:baseRoll(u);        // cursed: minimum damage (Black Knight curse)
  if(opt.melee&&ab.deathBlow&&R()<0.2){base*=2;b.events.push({k:'pop',u:t,str:'致命一击',col:'#ff6a6a'});}
  if(b.rageM)m*=b.rageM;
  if(R()<0.08+(ab.luck||0)){base*=2;b.crit=1;}
  return Math.max(1,Math.floor(base*m));
}
function onHitEffects(b,u,t,dmg,melee){
  const ab=u.st.ab||{};if(!t.alive)return;
  if(ab.stun&&R()<ab.stun[0]&&!(t.st.ab&&t.st.ab.undead&&ab.stun[1]==='致盲')){t.stun=b.t+ROUND*0.8;t.wind=0;b.events.push({k:'pop',u:t,str:ab.stun[1],col:'#d6c8ff'});}
  if(ab.curse&&melee&&R()<0.25&&!(t.st.ab&&t.st.ab.undead)){t.curse=b.t+ROUND*1.5;b.events.push({k:'pop',u:t,str:'诅咒',col:'#c78bff'});}
  if(ab.deathStare&&melee){let k=0;for(let i=0;i<Math.min(u.count,100);i++)if(R()<0.1)k++;k=Math.min(k,Math.ceil(u.count/10));
    if(k>0&&t.alive){applyDamage(b,u,t,(k-1)*t.st.hp+t.top,'stare');b.events.push({k:'pop',u:t,str:'死亡凝视',col:'#ff6a6a'});}}
  if(ab.lightning&&R()<0.2&&t.alive){applyDamage(b,u,t,10*u.count,'bolt');b.events.push({k:'zap',u:t});}
  if(ab.drain){const max=u.start*u.st.hp,cur=(u.count-1)*u.st.hp+u.top,nw=Math.min(max,cur+dmg);u.count=Math.ceil(nw/u.st.hp);u.top=nw-(u.count-1)*u.st.hp;b.events.push({k:'drain',u});}
  if(ab.burn&&t.alive){applyDamage(b,u,t,Math.max(1,Math.floor(dmg*ab.burn)),'burn');}
  if(melee&&t.st.ab&&t.st.ab.fireShield&&u.alive){applyDamage(b,t,u,Math.max(1,Math.floor(dmg*0.2)),'fire');}
}
function doMelee(b,u,t,isRetal){
  const ab=u.st.ab||{};u.moved=0;
  const targets=ab.allAdj?b.units.filter(o=>o.alive&&o.side!==u.side&&adjacent(u,o)):[t];
  b.events.push({k:'strike',u,t,retal:!!isRetal});
  for(const v of targets){const dmg=calcDmg(b,u,v,{melee:1});applyDamage(b,u,v,dmg,'melee');onHitEffects(b,u,v,dmg,true);}
  // dragon breath: same damage to whatever stands in the next cell behind the target
  if(ab.breath){const dx=Math.sign(Math.round((t.x-u.x)/CW)),dy=Math.sign(Math.round((t.y-u.y)/CH));
    const cx=dx>0?t.ax+t.fw:dx<0?t.ax-1:Math.min(Math.max(u.ax,t.ax),t.ax+t.fw-1),cy=dy>0?t.ay+t.fh:dy<0?t.ay-1:Math.min(Math.max(u.ay,t.ay),t.ay+t.fh-1);
    if(cx>=0&&cy>=0&&cx<GC&&cy<GR){const o=b.occ[cy*GC+cx];const v=b.units.find(z=>z.id===o);if(v&&v!==t&&v!==u&&v.alive){applyDamage(b,u,v,calcDmg(b,u,v,{melee:1}),'breath');b.events.push({k:'breath2',u,t:v});}}}
  // retaliation: once per round (griffin 2, royal griffin unlimited); never vs "no enemy retaliation" attackers
  if(!isRetal&&!ab.noRet&&t.alive&&!(t.stun>b.t)&&adjacent(t,u)&&t.ret>0){t.ret--;b.pend.push({at:b.t+0.4,u:t,t:u,retal:1});}
  if(!isRetal&&ab.dbl&&u.alive&&!u.second){u.second=1;b.pend.push({at:b.t+0.45,u,t,second:1});}else u.second=0;
}
const RAGE_T=[38,52],RAGE_K=0.12;
function step(b,dt){
  if(b.over)return;b.t+=dt;const L=b.units;
  if(b.bossB==null)b.bossB=L.some(u=>u.boss);const RT=b.bossB?RAGE_T[1]:RAGE_T[0];if(b.t>RT){b.rageM=1+(b.t-RT)*RAGE_K;if(!b.rageOn){b.rageOn=1;b.events.push({k:'rage'});}}
  const r=Math.floor(b.t/ROUND);if(r!==b.round){b.round=r;for(const u of L){u.ret=(u.st.ab&&u.st.ab.retal)||1;
    if(u.alive&&u.st.ab&&u.st.ab.regen&&u.top<u.st.hp){u.top=u.st.hp;b.events.push({k:'regen',u});}}}
  for(const p of b.pend)if(b.t>=p.at&&!p.done){p.done=1;if(p.u.alive&&p.t.alive&&!(p.u.stun>b.t)){
    if(p.shot){if(p.u.shots>0){p.u.shots--;p.u.atkT=1;fire(b,p.u,p.t);}}
    else if(adjacent(p.u,p.t)){p.u.atkT=1;p.u.wt=0.3;doMelee(b,p.u,p.t,!p.second);}}}
  b.pend=b.pend.filter(p=>!p.done);
  for(const u of L){if(!u.alive)continue;
    if(u.stun>b.t){u.atkT=Math.max(0,u.atkT-dt*2.6);u.hitT=Math.max(0,u.hitT-dt*7);if(!u.moving)continue;}
    u.cd-=dt;u.atkT=Math.max(0,u.atkT-dt*2.6);u.hitT=Math.max(0,u.hitT-dt*7);u.think-=dt;
    if(u.moving){u.mt+=dt;const k=Math.min(1,u.mt/u.md);const [x0,y0]=cellCenter(u.fx,u.fy,u.fw,u.fh),[x1,y1]=cellCenter(u.ax,u.ay,u.fw,u.fh);
      u.x=x0+(x1-x0)*k;u.y=y0+(y1-y0)*k;u.walkT+=dt*speedPx(u,b)/CELLPX;if(x1!==x0)u.face=x1>x0?1:-1;
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
      if(u.wind&&(u.wind-=dt)<=0){u.wind=0;u.atkT=1;u.cd=ROUND/rate(b,u);
        if(ranged){u.shots--;fire(b,u,t);if(u.st.ab&&u.st.ab.dbl&&u.shots>0)b.pend.push({at:b.t+0.3,u,t,shot:1});}
        else doMelee(b,u,t,false);}
    } else if(u.think<=0&&!u.wind){
      u.think=0.1;let nx=null;
      if(u.st.fly){const g=flyGoal(b,u,t);if(g)nx=g;}else{const s=pathStep(b,u,t);if(s)nx=s;}
      if(nx&&(nx[0]!==u.ax||nx[1]!==u.ay))startMove(b,u,nx[0],nx[1]);else u.state='idle';
    }
  }
  for(const p of b.proj){const dx=p.t.x-p.x,dy=p.t.y-p.y,d=Math.hypot(dx,dy);
    if(d<p.sp*dt||!p.t.alive){
      if(p.t.alive){applyDamage(b,p.src,p.t,p.dmg,'ranged');onHitEffects(b,p.src,p.t,p.dmg,false);
        if(p.src.st.ab&&p.src.st.ab.fireball){b.events.push({k:'fireball',t:p.t});for(const v of b.units)if(v!==p.t&&v.alive&&gapAt(v.ax,v.ay,v.fw,v.fh,p.t)<=1)applyDamage(b,p.src,v,calcDmg(b,p.src,v,{ranged:1}),'fire');}
        // Lich death cloud: same damage to every living (non-undead) stack around the target, friend or foe
        if(p.src.st.ab&&p.src.st.ab.cloud){b.events.push({k:'cloud',t:p.t});for(const v of b.units)if(v!==p.t&&v.alive&&!(v.st.ab&&v.st.ab.undead)&&gapAt(v.ax,v.ay,v.fw,v.fh,p.t)<=1)applyDamage(b,p.src,v,calcDmg(b,p.src,v,{ranged:1}),'cloud');}}
      p.done=1;b.events.push({k:'impact',p});}
    else{p.x+=dx/d*p.sp*dt;p.y+=dy/d*p.sp*dt;}}
  b.proj=b.proj.filter(p=>!p.done);
  const pa=L.some(u=>u.alive&&u.side==='p'),ea=L.some(u=>u.alive&&u.side==='e');
  if(!pa||!ea||b.t>180)b.over=ea?(pa?'timeout':'lose'):'win';
  if(b.over==='timeout'){const hp=s=>L.filter(u=>u.alive&&u.side===s).reduce((a,u)=>a+u.count*u.st.v,0);b.over=hp('p')>hp('e')?'win':'lose';}
}
// headless battle (sim): returns {win, army survivors p, e}
function run(army,enemies,bonus,dt=0.05){const b=createBattle(army,enemies,bonus);while(!b.over){step(b,dt);b.events.length=0;}
  const surv=s=>{const m={};for(const u of b.units)if(u.side===s&&u.alive)m[u.type]=(m[u.type]||0)+u.count;return m;};return {win:b.over==='win',p:surv('p'),e:surv('e'),t:b.t};}
const api={modStats,spawn,moveTo,fits,occSet,occClear,applyDamage,gapAt,rate,U,FACTIONS,FNAME,cellsPerRound,PLAYER,W,H,MAXS,FX0,FX1,FY0,FY1,GC,GR,GX0,GY0,CW,CH,ROUND,cellCenter,rng,setRng,createBattle,step,dmgMul,run};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);

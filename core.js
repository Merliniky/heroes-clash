// Shared game rules & battle simulation (browser + node)
(function(root){
const U = {
 // HoMM3-inspired stats: a=attack d=defense dmg=[min,max] hp speed shots, v=power value, sz=sprite size (world px)
 pikeman:{n:'枪兵',fx:'thrust',side:'p',a:4,d:5,dmg:[1,3],hp:10,spd:4,shots:0,v:80,sz:120,tier:1},
 crossbowman:{n:'弩手',side:'p',a:6,d:3,dmg:[2,3],hp:10,spd:4,shots:12,v:126,sz:115,tier:2,proj:'bolt'},
 griffin:{fw:2,fh:1,n:'狮鹫',side:'p',a:8,d:8,dmg:[3,6],hp:25,spd:6,shots:0,v:351,sz:150,tier:3,fly:1,quad:1,fx:'dive'},
 swordsman:{n:'剑士',fx:'slash',side:'p',a:10,d:12,dmg:[6,9],hp:35,spd:5,shots:0,v:445,sz:135,tier:4},
 monk:{n:'僧侣',side:'p',a:12,d:7,dmg:[10,12],hp:30,spd:5,shots:12,v:485,sz:135,tier:5,proj:'holy'},
 cavalier:{fw:2,fh:1,n:'骑士',quad:1,fx:'charge',side:'p',a:15,d:15,dmg:[15,25],hp:100,spd:7,shots:0,v:1946,sz:165,tier:6},
 centaur:{fw:2,fh:1,n:'半人马',quad:1,side:'p',a:5,d:3,dmg:[2,3],hp:8,spd:6,shots:8,v:100,sz:140,tier:1,proj:'arrow'},
 angel:{fw:2,fh:2,n:'天使',fx:'flame',side:'p',a:20,d:20,dmg:[50,50],hp:200,spd:12,shots:0,v:5019,sz:170,tier:7,fly:1},
 skeleton:{n:'骷髅兵',fx:'slash',side:'e',a:5,d:4,dmg:[1,3],hp:6,spd:4,shots:0,v:60,sz:120,tier:1},
 zombie:{n:'僵尸',fx:'bite',side:'e',a:5,d:5,dmg:[2,3],hp:20,spd:4,shots:0,v:128,sz:120,tier:2},
 goblin:{n:'哥布林',fx:'thrust',side:'e',a:4,d:2,dmg:[1,2],hp:5,spd:5,shots:0,v:60,sz:110,tier:1},
 orc:{n:'兽人',side:'e',a:8,d:4,dmg:[2,5],hp:15,spd:4,shots:0,v:150,sz:140,tier:3,fx:'cleave'},
 wolfrider:{fw:2,fh:1,n:'狼骑兵',quad:1,fx:'leap',side:'e',a:7,d:5,dmg:[2,4],hp:10,spd:6,shots:0,v:130,sz:140,tier:2},
 imp:{n:'小恶魔',side:'e',a:2,d:3,dmg:[1,2],hp:4,spd:5,shots:8,proj:'fire',v:75,sz:105,tier:1,fly:1},
 lich:{n:'巫妖',side:'e',a:13,d:10,dmg:[11,13],hp:30,spd:6,shots:12,v:848,sz:140,tier:5,proj:'death'},
 dragon:{fw:2,fh:2,n:'绿龙',quad:1,fx:'breath',side:'e',a:18,d:18,dmg:[40,50],hp:180,spd:10,shots:0,v:3388,sz:185,tier:7,fly:1},
};
const PLAYER=['pikeman','crossbowman','griffin','swordsman','monk','cavalier','centaur','angel'];
const W=1280,H=720,MAXS=7,FX0=185,FX1=1095,FY0=140,FY1=592;
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
let R=Math.random;
function setRng(f){R=f;}
const pick=a=>a[Math.floor(R()*a.length)];

function playerBudget(stage){return 240*Math.pow(1.42,stage-1);}
function enemyBudget(stage){return stage===1?165:225*Math.pow(1.64,stage-1)*Math.pow(1.18,Math.max(0,stage-5));}
function makeOffer(stage,army){
  const full=army.length>=MAXS;
  let pool=full?army.map(s=>s.type):PLAYER.filter(t=>U[t].tier<=Math.min(7,stage+1+(stage>=4?1:0)));
  const b=playerBudget(stage)*(0.85+R()*0.3);
  pool=pool.filter(t=>U[t].v<=b*1.25); if(!pool.length)pool=['pikeman'];
  const t=pick(pool); return {type:t,count:Math.max(1,Math.round(b/U[t].v))};
}
function makeEnemies(stage){
  const pools=[['goblin','skeleton','imp'],['goblin','skeleton','imp','zombie','wolfrider'],['skeleton','zombie','wolfrider','orc'],['zombie','wolfrider','orc','lich'],['orc','wolfrider','lich','dragon'],['orc','lich','dragon','zombie']];
  const pool=pools[Math.min(stage-1,pools.length-1)];
  const n=Math.min(MAXS,1+Math.ceil(stage*0.8));
  let budget=enemyBudget(stage);const out=[];
  for(let i=0;i<n;i++){
    const share=budget/(n-i); let opts=pool.filter(t=>U[t].v<=share*1.1); if(!opts.length)opts=[pool.reduce((a,b)=>U[a].v<U[b].v?a:b)];
    const t=pick(opts); const c=Math.max(1,Math.round(share/U[t].v)); budget-=c*U[t].v; out.push({type:t,count:c});
  }
  return out;
}
function dmgMul(a,d){return a>=d?Math.min(4,1+0.05*(a-d)):Math.max(0.3,1-0.025*(d-a));}

const GC=15,GR=10,GX0=135,GY0=88,CW=65.5,CH=52.6;
const fwOf=st=>st.fw||1,fhOf=st=>st.fh||1;
function cellCenter(ax,ay,fw,fh){return [GX0+(ax+fw/2)*CW,GY0+(ay+fh/2)*CH];}
function createBattle(army,enemies){
  const b={units:[],proj:[],events:[],t:0,focus:null,over:null,occ:new Int16Array(GC*GR).fill(-1)};let id=0;
  const rows1=[4,5,3,6,2,7,1,8,0,9],rows2=[4,3,5,2,6,1,7,0,8];
  const place=(list,side)=>{
    const order=list.map((s,i)=>({s,i})).sort((p,q)=>(U[q.s.type].shots>0)-(U[p.s.type].shots>0));
    for(const {s} of order){const st=U[s.type],fw=fwOf(st),fh=fhOf(st),ranged=st.shots>0;
      const cols=fw===2?[1,2,0,3]:ranged?[0,1,2,3]:[2,3,1,0];let done=false;
      for(const c of cols){for(const r of (fh===2?rows2:rows1)){const ax=side==='p'?c:GC-c-fw,ay=r;
        const u={id:id++,type:s.type,st,side,count:s.count,start:s.count,top:st.hp,fw,fh,ax,ay,moving:false,mt:0,md:0,fx:ax,fy:ay,
          cd:0.3+R()*0.6,shots:st.shots,target:null,alive:true,wind:0,wt:0,state:'idle',atkT:0,hitT:0,face:side==='p'?1:-1,walkT:R()*6,hold:false,think:0};
        if(fits(b,u,ax,ay)){[u.x,u.y]=cellCenter(ax,ay,fw,fh);occSet(b,u,ax,ay,u.id);b.units.push(u);done=true;break;}id--;}
        if(done)break;}
    }};
  place(army,'p');place(enemies,'e');
  return b;
}
function fits(b,u,ax,ay){if(ax<0||ay<0||ax+u.fw>GC||ay+u.fh>GR)return false;
  for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const o=b.occ[(ay+j)*GC+ax+i];if(o!==-1&&o!==u.id)return false;}return true;}
function occSet(b,u,ax,ay,v){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++)b.occ[(ay+j)*GC+ax+i]=v;}
function gapAt(ax,ay,fw,fh,t){const dx=Math.max(t.ax-(ax+fw-1),ax-(t.ax+t.fw-1),0),dy=Math.max(t.ay-(ay+fh-1),ay-(t.ay+t.fh-1),0);return Math.max(dx,dy);}
const adjacent=(a,t)=>gapAt(a.ax,a.ay,a.fw,a.fh,t)<=1;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function pathStep(b,u,t){
  const key=(x,y)=>y*GC+x,prev=new Int16Array(GC*GR).fill(-2),q=[[u.ax,u.ay]];prev[key(u.ax,u.ay)]=-1;let goal=null;
  while(q.length){const [x,y]=q.shift();if(gapAt(x,y,u.fw,u.fh,t)<=1&&(x!==u.ax||y!==u.ay)){goal=[x,y];break;}
    for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=GC||ny>=GR||prev[key(nx,ny)]!==-2)continue;
      if(!fits(b,u,nx,ny))continue;if(dx&&dy&&(!fits(b,u,x+dx,y)||!fits(b,u,x,y+dy)))continue;
      prev[key(nx,ny)]=key(x,y);q.push([nx,ny]);}}
  if(!goal)return null;let k=key(goal[0],goal[1]);while(prev[k]!==key(u.ax,u.ay)&&prev[k]>=0)k=prev[k];return [k%GC,Math.floor(k/GC)];
}
function flyGoal(b,u,t){let best=null,bd=1e9;
  for(let y=0;y<GR;y++)for(let x=0;x<GC;x++){if(gapAt(x,y,u.fw,u.fh,t)>1||!fits(b,u,x,y))continue;const d=Math.hypot(x-u.ax,y-u.ay);if(d<bd){bd=d;best=[x,y];}}return best;}
function startMove(b,u,nx,ny){u.fx=u.ax;u.fy=u.ay;occSet(b,u,nx,ny,u.id);u.ax=nx;u.ay=ny;u.moving=true;u.mt=0;
  const d=Math.hypot((nx-u.fx)*CW,(ny-u.fy)*CH);u.md=d/speedPx(u);u.state='walk';}
function speedPx(u){return u.st.fly?60+u.st.spd*16:26+u.st.spd*9.5;}
function applyDamage(b,src,tgt,dmg){
  if(!tgt.alive)return;
  const total=(tgt.count-1)*tgt.st.hp+tgt.top-dmg;const before=tgt.count;
  if(total<=0){tgt.count=0;tgt.alive=false;occSet(b,tgt,tgt.ax,tgt.ay,-1);if(tgt.moving)occSetIf(b,tgt,tgt.fx,tgt.fy);}
  else{tgt.count=Math.ceil(total/tgt.st.hp);tgt.top=total-(tgt.count-1)*tgt.st.hp;}
  tgt.hitT=1;
  b.events.push({k:'hit',u:tgt,src,dmg:Math.round(dmg),killed:before-tgt.count,dead:!tgt.alive,big:dmg>=Math.max(60,tgt.st.hp*before*0.25)});
}
function occSetIf(b,u,ax,ay){for(let i=0;i<u.fw;i++)for(let j=0;j<u.fh;j++){const k=(ay+j)*GC+ax+i;if(b.occ[k]===u.id)b.occ[k]=-1;}}
function rollDmg(u,t,half){const st=u.st;let base=0;const n=Math.min(u.count,200);
  for(let i=0;i<Math.min(n,20);i++)base+=st.dmg[0]+R()*(st.dmg[1]-st.dmg[0]+0.999)|0;
  base=base*n/Math.min(n,20);return Math.max(1,base*dmgMul(st.a,t.st.d)*(half?0.5:1));}
function step(b,dt){
  if(b.over)return;b.t+=dt;const L=b.units;
  for(const u of L){if(!u.alive)continue;
    u.cd-=dt;u.atkT=Math.max(0,u.atkT-dt*2.6);u.hitT=Math.max(0,u.hitT-dt*7);u.think-=dt;
    if(u.moving){u.mt+=dt;const k=Math.min(1,u.mt/u.md);const [x0,y0]=cellCenter(u.fx,u.fy,u.fw,u.fh),[x1,y1]=cellCenter(u.ax,u.ay,u.fw,u.fh);
      u.x=x0+(x1-x0)*k;u.y=y0+(y1-y0)*k;u.walkT+=dt*speedPx(u)/30;if(x1!==x0)u.face=x1>x0?1:-1;
      if(k>=1){u.moving=false;occSetIf(b,u,u.fx,u.fy);occSet(b,u,u.ax,u.ay,u.id);u.state='idle';}else continue;}
    const foes=L.filter(o=>o.alive&&o.side!==u.side);if(!foes.length)continue;
    const adj=foes.filter(o=>adjacent(u,o));
    let t=null;const focus=u.side==='p'&&b.focus&&b.focus.alive?b.focus:null;
    if(u.wind>0&&u.windT&&u.windT.alive)t=u.windT;
    else if(adj.length&&(u.hold||!focus||adj.includes(focus)||u.st.shots>0&&u.shots<=0))t=focus&&adj.includes(focus)?focus:adj.reduce((a,c)=>a.count*a.st.v<c.count*c.st.v?a:c);
    else if(u.hold)t=null;
    else if(focus)t=focus;
    else{let bd=1e9;for(const o of foes){const d=Math.hypot(o.x-u.x,o.y-u.y);if(d<bd){bd=d;t=o;}}}
    u.target=t;if(!t){u.state='idle';continue;}
    if(Math.abs(t.x-u.x)>4)u.face=t.x>u.x?1:-1;
    const isAdj=adjacent(u,t),ranged=u.shots>0&&!adj.length;
    if(ranged||isAdj){u.state='idle';
      if(u.cd<=0&&!u.wind){u.wind=u.wt=ranged?0.42:(u.st.fx==='breath'?0.5:0.36);u.windT=t;b.events.push({k:'wind',u,ranged});}
      if(u.wind&&(u.wind-=dt)<=0){u.wind=0;u.atkT=1;
        if(ranged){u.cd=1.6;u.shots--;b.proj.push({x:u.x+u.face*20,y:u.y,z:40,t,src:u,kind:u.st.proj,dmg:rollDmg(u,t,false),sp:u.st.proj==='bolt'?900:u.st.proj==='arrow'?650:520,d0:Math.hypot(t.x-u.x,t.y-u.y)});b.events.push({k:'shoot',u});}
        else{u.cd=1.3;b.events.push({k:'strike',u,t});applyDamage(b,u,t,rollDmg(u,t,u.st.shots>0));}}
    } else if(u.think<=0&&!u.wind){
      u.think=0.12;let nx=null;
      if(u.st.fly){const g=flyGoal(b,u,t);if(g)nx=g;}else{const s=pathStep(b,u,t);if(s)nx=s;}
      if(nx&&(nx[0]!==u.ax||nx[1]!==u.ay))startMove(b,u,nx[0],nx[1]);else u.state='idle';
    }
  }
  for(const p of b.proj){p.age=(p.age||0)+dt;const dx=p.t.x-p.x,dy=p.t.y-p.y,d=Math.hypot(dx,dy);
    if(d<p.sp*dt||!p.t.alive){if(p.t.alive)applyDamage(b,p.src,p.t,p.dmg);p.done=1;b.events.push({k:'impact',p});}
    else{p.x+=dx/d*p.sp*dt;p.y+=dy/d*p.sp*dt;}}
  b.proj=b.proj.filter(p=>!p.done);
  const pa=L.some(u=>u.alive&&u.side==='p'),ea=L.some(u=>u.alive&&u.side==='e');
  if(!pa||!ea||b.t>120)b.over=ea?(pa?'timeout':'lose'):'win';
  if(b.over==='timeout'){const hp=s=>L.filter(u=>u.alive&&u.side===s).reduce((a,u)=>a+u.count*u.st.v,0);b.over=hp('p')>hp('e')?'win':'lose';}
}
const api={U,PLAYER,W,H,MAXS,FX0,FX1,FY0,FY1,GC,GR,GX0,GY0,CW,CH,cellCenter,rng,setRng,makeOffer,makeEnemies,createBattle,step,playerBudget,enemyBudget};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);

// Shared game rules & battle simulation (browser + node)
(function(root){
const U = {
 // HoMM3-inspired stats: a=attack d=defense dmg=[min,max] hp speed shots, v=power value, sz=sprite size (world px)
 pikeman:{n:'枪兵',side:'p',a:4,d:5,dmg:[1,3],hp:10,spd:4,shots:0,v:80,sz:120,tier:1},
 crossbowman:{n:'弩手',side:'p',a:6,d:3,dmg:[2,3],hp:10,spd:4,shots:12,v:126,sz:115,tier:2,proj:'arrow'},
 griffin:{n:'狮鹫',side:'p',a:8,d:8,dmg:[3,6],hp:25,spd:6,shots:0,v:351,sz:150,tier:3,fly:1},
 swordsman:{n:'剑士',side:'p',a:10,d:12,dmg:[6,9],hp:35,spd:5,shots:0,v:445,sz:135,tier:4},
 monk:{n:'僧侣',side:'p',a:12,d:7,dmg:[10,12],hp:30,spd:5,shots:12,v:485,sz:135,tier:5,proj:'holy'},
 cavalier:{n:'骑士',side:'p',a:15,d:15,dmg:[15,25],hp:100,spd:7,shots:0,v:1946,sz:165,tier:6},
 centaur:{n:'半人马',side:'p',a:5,d:3,dmg:[2,3],hp:8,spd:6,shots:8,v:100,sz:140,tier:1,proj:'arrow'},
 angel:{n:'天使',side:'p',a:20,d:20,dmg:[50,50],hp:200,spd:12,shots:0,v:5019,sz:170,tier:7,fly:1},
 skeleton:{n:'骷髅兵',side:'e',a:5,d:4,dmg:[1,3],hp:6,spd:4,shots:0,v:60,sz:120,tier:1},
 zombie:{n:'僵尸',side:'e',a:5,d:5,dmg:[2,3],hp:20,spd:4,shots:0,v:128,sz:120,tier:2},
 goblin:{n:'哥布林',side:'e',a:4,d:2,dmg:[1,2],hp:5,spd:5,shots:0,v:60,sz:110,tier:1},
 orc:{n:'兽人',side:'e',a:8,d:4,dmg:[2,5],hp:15,spd:4,shots:12,v:192,sz:140,tier:3,proj:'axe'},
 wolfrider:{n:'狼骑兵',side:'e',a:7,d:5,dmg:[2,4],hp:10,spd:6,shots:0,v:130,sz:140,tier:2},
 imp:{n:'小恶魔',side:'e',a:2,d:3,dmg:[1,2],hp:4,spd:5,shots:0,v:50,sz:105,tier:1,fly:1},
 lich:{n:'巫妖',side:'e',a:13,d:10,dmg:[11,13],hp:30,spd:6,shots:12,v:848,sz:140,tier:5,proj:'death'},
 dragon:{n:'绿龙',side:'e',a:18,d:18,dmg:[40,50],hp:180,spd:10,shots:0,v:3388,sz:185,tier:7,fly:1},
};
const PLAYER=['pikeman','crossbowman','griffin','swordsman','monk','cavalier','centaur','angel'];
const W=1280,H=720,MAXS=7;
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
let R=Math.random;
function setRng(f){R=f;}
const pick=a=>a[Math.floor(R()*a.length)];

function playerBudget(stage){return 240*Math.pow(1.42,stage-1);}
function enemyBudget(stage){return 250*Math.pow(1.6,stage-1);}
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

function createBattle(army,enemies){
  const units=[];let id=0;
  const place=(list,side)=>list.forEach((s,i)=>{
    const st=U[s.type],n=list.length;
    const lane=H*0.53+(i-(n-1)/2)*Math.min(160,500/Math.max(1,n-1));
    const ranged=st.shots>0,stag=(n>3&&i%2)?70:0;
    const x=side==='p'?(ranged?190:320)-stag*(ranged?0:1)+(ranged?stag*0.5:0):W-((ranged?190:320)-stag*(ranged?0:1)+(ranged?stag*0.5:0));
    units.push({id:id++,type:s.type,st,side,count:s.count,start:s.count,top:st.hp,x,y:lane+(R()-0.5)*14,
      cd:0.4+R()*0.6,shots:st.shots,target:null,alive:true,r:st.sz*0.27,state:'idle',atkT:0,hitT:0,face:side==='p'?1:-1,walkT:R()*6});
  });
  place(army,'p');place(enemies,'e');
  return {units,proj:[],events:[],t:0,focus:null,over:null};
}
function speedPx(u){return 40+u.st.spd*(u.st.fly?20:13);}
function applyDamage(b,src,tgt,dmg){
  if(!tgt.alive)return;
  const total=(tgt.count-1)*tgt.st.hp+tgt.top-dmg;const before=tgt.count;
  if(total<=0){tgt.count=0;tgt.alive=false;}
  else{tgt.count=Math.ceil(total/tgt.st.hp);tgt.top=total-(tgt.count-1)*tgt.st.hp;}
  tgt.hitT=1;
  b.events.push({k:'hit',u:tgt,src,dmg:Math.round(dmg),killed:before-tgt.count,dead:!tgt.alive,big:dmg>=Math.max(60,tgt.st.hp*before*0.25)});
}
function rollDmg(u,t,half){const st=u.st;let base=0;const n=Math.min(u.count,200);
  for(let i=0;i<Math.min(n,20);i++)base+=st.dmg[0]+R()*(st.dmg[1]-st.dmg[0]+0.999)|0;
  base=base*n/Math.min(n,20);return Math.max(1,base*dmgMul(st.a,t.st.d)*(half?0.5:1));}
function step(b,dt){
  if(b.over)return;b.t+=dt;
  const L=b.units;
  for(const u of L){ if(!u.alive)continue;
    u.cd-=dt;u.atkT=Math.max(0,u.atkT-dt*3);u.hitT=Math.max(0,u.hitT-dt*5);
    const foes=L.filter(o=>o.alive&&o.side!==u.side);
    if(!foes.length)continue;
    let t=null;
    if(u.side==='p'&&b.focus&&b.focus.alive)t=b.focus;
    else{let bd=1e9;for(const o of foes){const d=Math.hypot(o.x-u.x,(o.y-u.y)*1.3);if(d<bd){bd=d;t=o;}}}
    u.target=t;
    const dx=t.x-u.x,dy=t.y-u.y,dist=Math.hypot(dx,dy);
    u.face=dx>=0?1:-1; if(Math.abs(dx)<4)u.face=u.side==='p'?1:-1;
    const reach=u.r+t.r+10;
    const adj=foes.some(o=>Math.hypot(o.x-u.x,o.y-u.y)<u.r+o.r+14);
    const canShoot=u.shots>0&&!adj;
    if(canShoot&&dist<900){u.state='idle';
      if(u.cd<=0){u.cd=1.5;u.shots--;u.atkT=1;
        b.proj.push({x:u.x+u.face*u.r,y:u.y-u.st.sz*0.45,t,src:u,kind:u.st.proj,dmg:rollDmg(u,t,false),sp:u.st.proj==='arrow'?1100:750,age:0});
        b.events.push({k:'shoot',u});}
    } else if(dist>reach){u.state='walk';const sp=speedPx(u);u.x+=dx/dist*sp*dt;u.y+=dy/dist*sp*dt;u.walkT+=dt*sp/40;}
    else{u.state='idle';
      if(u.cd<=0){u.cd=1.25;u.atkT=1;applyDamage(b,u,t,rollDmg(u,t,u.st.shots>0));
        // retaliation-lite: none; keep it snappy
      }}
  }
  // separation
  for(let i=0;i<L.length;i++){const a=L[i];if(!a.alive)continue;for(let j=i+1;j<L.length;j++){const c=L[j];if(!c.alive)continue;
    const dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||0.01,m=(a.r+c.r)*0.8;
    if(d<m){const p=(m-d)/2/d;a.x-=dx*p;a.y-=dy*p;c.x+=dx*p;c.y+=dy*p;}}}
  for(const u of L){u.y=Math.max(110,Math.min(H-30,u.y));u.x=Math.max(110,Math.min(W-170,u.x));}
  for(const p of b.proj){p.age+=dt;const tx=p.t.x,ty=p.t.y-p.t.st.sz*0.35,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
    if(d<p.sp*dt||!p.t.alive){if(p.t.alive)applyDamage(b,p.src,p.t,p.dmg);p.done=1;b.events.push({k:'impact',p});}
    else{p.x+=dx/d*p.sp*dt;p.y+=dy/d*p.sp*dt;p.ang=Math.atan2(dy,dx);}}
  b.proj=b.proj.filter(p=>!p.done);
  const pa=L.some(u=>u.alive&&u.side==='p'),ea=L.some(u=>u.alive&&u.side==='e');
  if(!pa||!ea||b.t>120)b.over=ea?(pa?'timeout':'lose'):'win';
  if(b.over==='timeout'){const hp=s=>L.filter(u=>u.alive&&u.side===s).reduce((a,u)=>a+u.count*u.st.v,0);b.over=hp('p')>hp('e')?'win':'lose';}
}
const api={U,PLAYER,W,H,MAXS,rng,setRng,makeOffer,makeEnemies,createBattle,step,playerBudget,enemyBudget};
if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(this);

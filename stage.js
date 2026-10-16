// Per-stage run mode: pick 1 of 2 reinforcement stacks, auto battle, survivors carry over.
(function(root){
const C=(typeof module!=='undefined')?require('./core.js'):root.Core;const U=C.U;
// 20-creature roster that has a 3D model (see models.js / CREDITS.md); stats stay exact HoMM3 values
const ROSTER=['pikeman','archer','swordsman','crusader','monk','cavalier','battleDwarf','greenDragon','giant',
  'skeleton','skeletonWarrior','zombie','lich','boneDragon','goblin','wolfRider','orc','troll','imp','demon'];
const STAGES=10,MAXS=C.MAXS;
let R=Math.random;const setRng=f=>{R=f;};
const pick=a=>a[Math.floor(R()*a.length)];
const maxLvl=s=>Math.min(7,1+Math.floor((s-1)*0.75));
const offerBudget=s=>Math.round(420*Math.pow(1.36,s-1));
const enemyBudget=s=>Math.round(290*Math.pow(1.56,s-1));
const cnt=(t,b)=>Math.max(1,Math.round(b/U[t].v));
function pool(s,lo){const L=maxLvl(s);return ROSTER.filter(t=>U[t].lvl<=L&&U[t].lvl>=Math.max(1,L-(lo||3)));}
function makeOffer(s,army){const P=pool(s),a=pick(P);let b=pick(P.filter(t=>t!==a));
  const owned=Object.keys(army||{});
  return [a,b].map(t=>{const v=0.85+R()*0.3;return {type:t,count:cnt(t,offerBudget(s)*v)};});}
function makeEnemies(s){const n=Math.min(MAXS,2+Math.floor(s/2));const P=pool(s,4);const tot=enemyBudget(s);const out=[];
  const w=[];for(let i=0;i<n;i++)w.push(0.6+R());const ws=w.reduce((a,b)=>a+b,0);
  for(let i=0;i<n;i++){const t=pick(P);const ex=out.find(o=>o.type===t);const c=cnt(t,tot*w[i]/ws);if(ex)ex.count+=c;else out.push({type:t,count:c});}
  return out;}
const stacks=army=>Object.entries(army).filter(([,c])=>c>0).map(([type,count])=>({type,count})).sort((a,b)=>U[b.type].v*b.count-U[a.type].v*a.count);
function add(army,o){army[o.type]=(army[o.type]||0)+o.count;}
const api={ROSTER,STAGES,makeOffer,makeEnemies,stacks,add,setRng,offerBudget,enemyBudget,maxLvl};
if(typeof module!=='undefined')module.exports=api;else root.Stage=api;
})(this);

const C=require('./core.js');
function run(seed,strategy){C.setRng(C.rng(seed));let army=[];
 for(let s=1;s<=8;s++){const o=[C.makeOffer(s,army),C.makeOffer(s,army)];
  let ch=strategy==='best'?(o[0].count*C.U[o[0].type].v>=o[1].count*C.U[o[1].type].v?o[0]:o[1]):o[C.rng(seed*7+s)()<0.5?0:1];
  const ex=army.find(a=>a.type===ch.type);if(ex)ex.count+=ch.count;else army.push({...ch});
  const b=C.createBattle(army,C.makeEnemies(s));let n=0;while(!b.over&&n<200*60){C.step(b,1/60);n++;}
  if(b.over!=='win')return {reached:s,t:b.t};
  army=b.units.filter(u=>u.side==='p'&&u.alive).map(u=>({type:u.type,count:u.count}));}
 return {reached:9};}
for(const st of ['random','best']){const N=400,hist=Array(10).fill(0);for(let i=1;i<=N;i++)hist[run(i,st).reached]++;
 let alive=N;const out=[];for(let s=1;s<=8;s++){alive-=hist[s];out.push(`S${s}:${(alive/N*100).toFixed(0)}%`);}console.log(st,out.join(' '));}

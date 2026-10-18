// 宝石塔防 balance sim: node td_sim.js [games] [bot=greedy|random] [maxWave]
const T=require('./td_core.js');const N=+process.argv[2]||40,BOT=process.argv[3]||'greedy',MAXW=+process.argv[4]||30;
function coverage(g,c,r,rng){let n=0;for(const [x,y] of g.path)if(Math.hypot(x-c,y-r)<=rng)n++;return n;}
function value(g,o){const tw={c:o.gem.c,r:o.gem.r,type:o.res.type,q:o.res.q,special:!!o.res.special};const s=T.towerStats(tw);
  let dps=(s.dmg||0)/s.cd*(s.multi||1)*(s.splash?1.6:1)*(s.crit?1+s.crit*(s.critM-1):1)+(s.burn||0)*1.5+(s.poison||0)*2+(s.slow?s.dmg/s.cd*0.8:0)+(s.aura?40*(o.res.q+1):0);
  if(s.groundOnly)dps*=0.85;if(s.air)dps*=0.75;return dps*Math.max(1,coverage(g,tw.c,tw.r,s.rng));}
function play(seed){const g=T.newGame(seed);let guard=0;
  while(!g.over&&g.wave<MAXW&&guard++<100000){
    if(g.phase==='build'){while(T.upgradeChance(g));
      let best=null,bl=-1;const cells=[];for(let r=0;r<T.H;r++)for(let c=0;c<T.W;c++)if(T.canBuildCell(g,c,r))cells.push([c,r]);
      if(BOT==='random'){const near=cells.filter(([c,r])=>g.path.some(([x,y])=>Math.abs(x-c)+Math.abs(y-r)===1));for(let k=0;k<50&&!best;k++){const [c,r]=near[Math.floor(Math.random()*near.length)];if(T.testPlace(g,c,r).ok)best=[c,r];}}
      else for(const [c,r] of cells){const t=T.testPlace(g,c,r);if(!t.ok)continue;const L=t.path.length+Math.random()*0.5;if(L>bl){bl=L;best=[c,r];}}
      if(!best){console.log('no cell');break;}T.place(g,best[0],best[1]);}
    else if(g.phase==='keep'){const os=T.keepOptions(g);let bo=os[0];if(BOT!=='random'){let bv=-1;for(const o of os){const v=value(g,o);if(v>bv){bv=v;bo=o;}}}else bo=os[Math.floor(Math.random()*os.length)];T.keep(g,bo);}
    else if(g.phase==='wave'){for(let i=0;i<30&&g.phase==='wave';i++)T.stepWave(g,1/30);}
    g.events.length=0;}
  return {wave:g.over?g.wave:g.wave+1,leaks:g.leaks,lives:g.lives,chance:g.chance,path:g.path.length,specials:g.towers.filter(t=>t.special).map(t=>t.type)};}
const res=[];const life={};for(let i=0;i<N;i++){res.push(play(1000+i));}
const reach=k=>(res.filter(r=>r.wave>k).length/N*100).toFixed(0)+'%';
console.log(`[${BOT}] survive past wave:`,[5,8,10,12,15,18,20,25].map(k=>k+':'+reach(k)).join(' '),'| median wave',res.map(r=>r.wave).sort((a,b)=>a-b)[N>>1],'| avg path',(res.reduce((a,r)=>a+r.path,0)/N).toFixed(0),'| specials',res.reduce((a,r)=>a+r.specials.length,0));
if(process.env.DBG)for(const [i,r] of res.entries())if(r.wave<=6)console.log('seed',1000+i,JSON.stringify(r));

// Strategic-layer sim: AI (heuristic) vs simple player strategies, all 8x7 faction pairs randomised.
// Battles resolved headless with the real-time battle engine (Core.run). node sim.js [games]
const C=require('./core.js'),S=require('./strat.js');
const N=+process.argv[2]||120;
const STRATS={
  ai:(g,s,f)=>S.aiChoose(g,s,f),
  builder:(g,s,f)=>{const o=S.buildOptions(s).filter(o=>o.ok).sort((a,b)=>(a.kind==='dw'?0:1)-(b.kind==='dw'?0:1))[0];if(o)return {act:'build',opt:o};const p=S.autoRecruit(s);if(Object.keys(p).length)return {act:'recruit',plan:p};return {act:'attack'};},
  farmer:(g,s,f)=>{let wi=0;g.camps.forEach((c,i)=>{if(S.campPower(c)<S.campPower(g.camps[wi]))wi=i;});if(g.turn%4===0){const p=S.autoRecruit(s);if(Object.keys(p).length)return {act:'recruit',plan:p};}return {act:'camp',ci:wi};},
  recruiter:(g,s,f)=>{const p=S.autoRecruit(s);if(Object.keys(p).length)return {act:'recruit',plan:p};return g.turn>6?{act:'attack'}:{act:'camp',ci:0};},
  rusher:(g,s,f)=>g.turn>=2?{act:'attack'}:{act:'recruit',plan:S.autoRecruit(s)},
  random:(g,s,f)=>{const r=Math.random();if(r<0.25)return {act:'attack'};if(r<0.5){const o=S.buildOptions(s).filter(o=>o.ok);if(o.length)return {act:'build',opt:o[Math.floor(Math.random()*o.length)]};}
    if(r<0.75)return {act:'recruit',plan:S.autoRecruit(s)};return {act:'camp',ci:Math.floor(Math.random()*3)};},
};
function act(g,s,f,a,stat){
  stat[a.act]=(stat[a.act]||0)+1;
  if(a.act==='build')S.doBuild(g,s,a.opt);
  else if(a.act==='recruit')S.doRecruit(s,a.plan);
  else if(a.act==='camp'){const c=g.camps[a.ci];const br=S.stacks(s.army);if(!br.length)return;const r=C.run(br,S.stacks(c.army),{p:S.bonus(s),e:{a:0,d:0}});
    // applySurvivors expects brought list
    for(const st of br){s.army[st.type]-=st.count;s.army[st.type]+=r.p[st.type]||0;if(s.army[st.type]<=0)delete s.army[st.type];}
    S.applyCamp(g,s,a.ci,r);}
  else if(a.act==='attack'){if(!S.canAttack(g)){const p=S.autoRecruit(s);S.doRecruit(s,p);return;}const ba=S.stacks(s.army),bd=S.stacks(f.army);if(!ba.length)return;
    const r=bd.length?C.run(ba,bd,{p:S.bonus(s),e:S.bonus(f,true)}):{win:true,p:Object.fromEntries(ba.map(x=>[x.type,x.count])),e:{}};S.applyDuel(g,s,f,r,ba,bd);}
}
const res={};
for(const name in STRATS){let pw=0,turns=[],acts={},aacts={};
  for(let i=0;i<N;i++){const g=S.newGame(S.FACS[i%8],null,1000+i);C.setRng(Math.random);S.setRng(Math.random);
    while(!g.over){S.takeOffer(g.p,g.p.offer[0].count*C.U[g.p.offer[0].type].v>=g.p.offer[1].count*C.U[g.p.offer[1].type].v?0:1);act(g,g.p,g.a,STRATS[name](g,g.p,g.a),acts);
      if(g.over)break;S.aiTakeOffer(g.a);act(g,g.a,g.p,S.aiChoose(g,g.a,g.p),aacts);if(g.over)break;S.endTurn(g);}
    if(g.over==='p')pw++;turns.push(g.turn);}
  turns.sort((a,b)=>a-b);const tot=Object.values(acts).reduce((a,b)=>a+b,0),atot=Object.values(aacts).reduce((a,b)=>a+b,0);
  res[name]={playerWin:(pw/N*100).toFixed(0)+'%',medianTurns:turns[N>>1],p10:turns[Math.floor(N*0.1)],p90:turns[Math.floor(N*0.9)],
    playerMix:Object.entries(acts).map(([k,v])=>k+':'+(v/tot*100).toFixed(0)+'%').join(' '),aiMix:Object.entries(aacts).map(([k,v])=>k+':'+(v/atot*100).toFixed(0)+'%').join(' ')};}
console.table(res);
// faction balance: AI vs AI
const fw={};for(const f of S.FACS)fw[f]={w:0,n:0};
for(let i=0;i<N*5;i++){const pf=S.FACS[i%8];const g=S.newGame(pf,null,5000+i);C.setRng(Math.random);S.setRng(Math.random);
  while(!g.over){S.aiTakeOffer(g.p);act(g,g.p,g.a,S.aiChoose(g,g.p,g.a),{});if(g.over)break;S.aiTakeOffer(g.a);act(g,g.a,g.p,S.aiChoose(g,g.a,g.p),{});if(g.over)break;S.endTurn(g);}
  fw[g.p.fac].n++;fw[g.a.fac].n++;fw[g.over==='p'?g.p.fac:g.a.fac].w++;}
console.log('faction win% (AI vs AI):',Object.entries(fw).map(([f,v])=>f+' '+(v.w/v.n*100).toFixed(0)+'%').join(', '));

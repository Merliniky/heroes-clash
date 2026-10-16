// Stage-mode sim: greedy player (takes the higher-value offer), N runs. node sim.js [N]
const C=require('./core.js'),S=require('./stage.js');const N=+process.argv[2]||200;
const reach=new Array(S.STAGES+2).fill(0);let wins=0;
for(let i=0;i<N;i++){let army={};let s=1;
  for(;s<=S.STAGES;s++){const o=S.makeOffer(s,army);const k=o[0].count*C.U[o[0].type].v>=o[1].count*C.U[o[1].type].v?0:1;S.add(army,o[k]);
    let br=S.stacks(army);if(br.length>C.MAXS){br=br.slice(0,C.MAXS);}
    const r=C.run(br,S.makeEnemies(s));reach[s]++;
    for(const b of br){army[b.type]-=b.count;army[b.type]+=r.p[b.type]||0;if(army[b.type]<=0)delete army[b.type];}
    if(!r.win)break;}
  if(s>S.STAGES)wins++;}
console.log('reached stage:',reach.slice(1,S.STAGES+1).map((v,i)=>(i+1)+':'+(v/N*100).toFixed(0)+'%').join(' '),' full clear',(wins/N*100).toFixed(0)+'%');

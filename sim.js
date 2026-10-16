// Stage-mode balance sim with a "decent play" bot: synergy-aware drafting, auto formation, spell casting, artifact picks.
// node sim.js [runs] [mode]   mode: bot (default) | nospell | greedy
const C=require('./core.js'),H=require('./hero.js');const N=+process.argv[2]||200,MODE0=process.argv[3]||'bot';const META=MODE0==='meta'||MODE0==='mid';const MODE=META?'bot':MODE0;
const HERO=process.argv[4];
const U=C.U;
const ARTRANK=['hellfire','helm','vitality','sharp','dwarfShield','courage','orbFire','boots','gladius','lifeRing','medal','crown','talisman','goldBow','wings','centaurAxe','dragonShield','sphere','damned','tome','cape','sash','hat','cloak','orbAir','necklace'];
const SPRANK=['lightning','fireball','bless','haste','meteor','slow','bloodlust','resurrection','magicArrow','cure'];
function scoreCard(run,c){if(c.kind==='upgrade')return 1e9;const own=H.stacks(run.army);const before=H.synCounts(own);const after=H.synCounts(own.concat(run.army[c.type]?[]:[{type:c.type}]));
  let v=c.count*U[c.type].v;if(MODE==='greedy')return v;const f=H.facOf(c.type);if(H.synTier(after[f]||0)>H.synTier(before[f]||0))v*=1.6;else if((before[f]||0)>0)v*=1.15;return v;}
function castAI(b,h,run){if(MODE!=='bot'&&MODE!=='greedy')return;const sp=run.spells;const ens=b.units.filter(u=>u.alive&&u.side==='e'),ps=b.units.filter(u=>u.alive&&u.side==='p');if(!ens.length)return;
  const can=id=>sp.includes(id)&&h.mana>=H.spellCost(h,id);const go=(id,t)=>{h.mana-=H.spellCost(h,id);H.cast(b,h,id,t);};
  const big=ens.slice().sort((a,c)=>c.count*c.st.v-a.count*a.st.v)[0];
  if(b.t>1.5&&!b._buff){for(const id of ['bless','haste','bloodlust','slow'])if(can(id)){go(id);b._buff=b.t;return;}}
  if(b._buff&&b.t-b._buff>10)b._buff=0;
  const hurt=ps.find(u=>u.count<u.start*0.55&&u.st.v*u.start>300);if(hurt&&can('resurrection')){go('resurrection',hurt);return;}
  for(const id of ['meteor','fireball'])if(can(id)){const r=H.SPM[id].r*(C.CW+C.CH)/2;let best=null,bs=0;for(const e of ens){let s=0,bad=false;for(const u of b.units)if(u.alive&&Math.hypot(u.x-e.x,u.y-e.y)<=r){if(u.side==='e')s+=u.st.hp*u.count;else bad=true;}if(!bad&&s>bs){bs=s;best=e;}}if(best){go(id,{x:best.x,y:best.y});return;}}
  for(const id of ['lightning','magicArrow'])if(can(id)&&h.mana>=H.spellCost(h,id)+4){go(id,big);return;}
  if(can('cure')&&ps.filter(u=>u.top<u.st.hp*0.5).length>=2)go('cure');}
const reach=new Array(31).fill(0);let stats={arts:{},bossDeath:{5:0,10:0,15:0},clear:0};
const ALL=H.LOCK_UNITS.concat(H.LOCK_ARTS);
for(let i=0;i<N;i++){const hid=HERO||(META?H.HEROES[i%3].id:'knight');const run=H.newRun(MODE0==='meta'?{hero:hid,unlocked:ALL,up:{troops:5,mana:3,heal:2,vault:1}}:MODE0==='mid'?{hero:hid,unlocked:ALL.slice(0,5),up:{troops:2,mana:1,heal:1}}:{hero:hid});
  for(;run.stage<=15;run.stage++){const s=run.stage;const offer=H.makeOffer(run);let bi=0,bv=-1;offer.forEach((c,k)=>{const v=scoreCard(run,c);if(v>bv){bv=v;bi=k;}});H.takeCard(run,offer[bi]);
    const info=H.stageInfo(s);const list=H.deployList(run);const b=C.createBattle(H.playerStacks(run,list,info).map(x=>{delete x.ax;delete x.ay;return x;}),H.enemyStacks(H.makeEnemies(s),info));
    const h=H.heroFor(run,info);if(run.arts.includes('damned'))for(const u of b.units)if(u.side==='e')u.buf.slow=6;
    let acc=0;while(!b.over){C.step(b,0.05);h.mana=Math.min(h.max,h.mana+h.regen*0.05);H.bossTick(b,0.05,s);acc+=0.05;if(acc>=0.5){acc=0;castAI(b,h,run);}b.events.length=0;}
    reach[s]++;H.afterBattle(run,b,list);if(b.over!=='win'){if(info.boss)stats.bossDeath[s]++;break;}
    const kind=H.rewardKind(s);const opts=H.rewardOptions(run,kind);if(opts.length){const rk=kind==='artifact'?ARTRANK:SPRANK;opts.sort((a,c)=>rk.indexOf(a.id)-rk.indexOf(c.id));const o=opts[0];
      if(kind==='artifact'){run.arts.push(o.id);stats.arts[o.id]=(stats.arts[o.id]||0)+1;}else if(MODE!=='nospell'){if(run.spells.length<4)run.spells.push(o.id);else{const worst=run.spells.slice().sort((a,c)=>SPRANK.indexOf(c)-SPRANK.indexOf(a))[0];if(SPRANK.indexOf(o.id)<SPRANK.indexOf(worst))run.spells[run.spells.indexOf(worst)]=o.id;}}}}
  if(run.stage>15)stats.clear++;stats.gold=(stats.gold||0)+run.gold;}
const pct=k=>(reach[k]/N*100).toFixed(0)+'%';
let gold=0;console.log(`[${MODE0}${HERO?' '+HERO:''}] reached:`,[1,3,5,6,8,10,11,13,15].map(k=>k+':'+pct(k)).join(' '),'| clear 15:',(stats.clear/N*100).toFixed(0)+'%','| boss deaths 5/10/15:',stats.bossDeath[5],stats.bossDeath[10],stats.bossDeath[15],'| avg gold',(stats.gold/N).toFixed(0),'| median death',(()=>{let c=0;for(let k=1;k<=16;k++){c+=(reach[k]-(reach[k+1]||0));if(c>=N/2)return k;}return '16+';})());

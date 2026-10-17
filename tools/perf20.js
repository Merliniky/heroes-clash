// R20 perf/memory: play N battles in one page at 390x844 with real taps; sample fps, textures, heap after each battle
const puppeteer=require('puppeteer-core');const W=ms=>new Promise(r=>setTimeout(r,ms));
const [,,base='http://localhost:8931/?x=1',N='6',q='',army='titan,blackDragon,hydra,archMage,medusaQueen,ironGolem',out='PERF20']=process.argv;
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info']});const pg=await br.newPage();
 await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});pg.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
 await pg.goto(base+'&debug&stage=2&army='+army+q,{waitUntil:'networkidle0'});await pg.evaluate(()=>{localStorage.setItem('hc_tut','{"deploy":1,"spell":1,"draft":1}');localStorage.setItem('hc_meta','{"runs":1,"gold":50}');});await pg.reload({waitUntil:'networkidle0'});
 await pg.tap('#startBtn');await W(800);if(await pg.$('#hsCards .hcard'))await pg.tap('#hsCards .hcard');
 const samp=()=>pg.evaluate(()=>{const r=__dbg.renderer.info;let px=0;const seen=new Set();__dbg.scene.traverse(o=>{const m=o.material;if(m&&m.map&&m.map.image&&!seen.has(m.map.image)){seen.add(m.map.image);px+=(m.map.image.width||0)*(m.map.image.height||0);}});return {stage:__G.run.stage,phase:__G.phase,fps:+__dbg.fps().toFixed(1),tex:r.memory.textures,geo:r.memory.geometries,calls:r.render.calls,heapMB:+(performance.memory.usedJSHeapSize/1048576).toFixed(1),sceneImgMB:+(px*4/1048576).toFixed(1),views:__dbg.views.length};});
 const log=[];let battles=0,shot=0;const t0=Date.now();
 while(battles<+N&&Date.now()-t0<900000){const ph=await pg.evaluate(()=>__G.phase);
  if(ph==='offer'){await pg.tap('#cards .card');await W(300);await pg.tap('#cards .card.sel .pickBtn');await W(1000);}
  else if(ph==='deploy'){await pg.tap('#autoBtn');await W(1500);await pg.tap('#fightBtn');await W(4000);const s=await samp();s.at='battle';log.push(s);if(shot<2){await pg.screenshot({path:out+'_b'+(++shot)+'.png'});}}
  else if(ph==='result'){battles++;const s=await samp();s.at='result';log.push(s);await pg.tap('#resBtn');await W(1200);}
  else if(ph==='reward'){if(await pg.$('#rwCards .rcard')){await pg.tap('#rwCards .rcard');await W(300);await pg.tap('#rwOk');}else await pg.tap('#rwSkip');await W(1200);}
  else if(ph==='over'){log.push({over:1});break;}
  else await W(800);}
 for(const l of log)console.log(JSON.stringify(l));console.log('errs',JSON.stringify(errs.slice(0,8)));await br.close();})();

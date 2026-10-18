// TD playtest with real touch taps through several waves: node td2.js [url] [out] [waves] [strategy=greedy|human]
const puppeteer=require('puppeteer-core');const W=ms=>new Promise(r=>setTimeout(r,ms));
const [,,base='http://localhost:8931/td.html?debug',out='TD2',NW='6',STRAT='greedy']=process.argv;
(async()=>{const br=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const pg=await br.newPage();
 await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if((m.type()==='error'||m.type()==='warning')&&!/AudioContext/.test(m.text()))errs.push(m.type()+': '+m.text())});pg.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
 await pg.goto(base,{waitUntil:'networkidle0'});await W(800);await pg.screenshot({path:out+'_title.png'});
 const tapEl=async sel=>{const el=await pg.$(sel);if(!el)throw new Error('no '+sel);const b=await el.boundingBox();await pg.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);};
 const cellXY=(c,r)=>pg.evaluate((c,r)=>{const X=__TDX;const [x,z]=X.cw(c,r);return X.toScreen(x,0,z);},c,r);
 const tapCell=async(c,r)=>{const [x,y]=await cellXY(c,r);await pg.touchscreen.tap(x,y);await W(250);};
 const st=()=>pg.evaluate(()=>{const g=__TDX.G.g;return {wave:g.wave,lives:g.lives,gold:g.gold,leaks:g.leaks,kills:g.kills,phase:g.phase,chance:g.chance,path:g.path.length,towers:g.towers.map(t=>(t.special?t.type:t.q+t.type)),fps:+__TDX.fps().toFixed(0)};});
 await tapEl('#tdStart');await W(1500);
 for(let w=0;w<+NW;w++){
  await pg.waitForFunction(()=>__TDX.G.g.phase==='build'||__TDX.G.g.over,{timeout:300000});if(await pg.evaluate(()=>__TDX.G.g.over))break;await W(900);
  for(let k=0;k<3;k++){const can=await pg.evaluate(()=>!document.getElementById('upBtn').disabled);if(!can)break;await tapEl('#upBtn');await W(300);}
  if(w===1){const blk=await pg.evaluate(()=>{const {T,G}=__TDX;const g=G.g;for(let r=0;r<T.H;r++)for(let c=0;c<T.W;c++){const t=T.testPlace(g,c,r);if(!t.ok&&t.block)return [c,r];}return null;});
    if(blk){await tapCell(...blk);await W(300);await pg.screenshot({path:out+'_blocked.png'});}}
  for(let i=0;i<5;i++){
    const [c,r]=await pg.evaluate(S=>{const {T,G}=__TDX;const g=G.g;let best=null,bl=-1;for(let r=0;r<T.H;r++)for(let c=0;c<T.W;c++){const t=T.testPlace(g,c,r);if(!t.ok)continue;
        let v=S==='human'?(g.path.some(([x,y])=>Math.abs(x-c)+Math.abs(y-r)===1)?t.path.length+Math.random()*12:0):t.path.length;if(v>bl){bl=v;best=[c,r];}}return best;},STRAT);
    await tapCell(c,r);if(w===0&&i===3)await pg.screenshot({path:out+'_preview.png'});await tapCell(c,r);await W(300);}
  await W(700);
  const idx=await pg.$$eval('#kOpts .kopt',els=>{let b=0,bv=-1;els.forEach((e,i)=>{const k=e.classList.contains('special')?3:e.classList.contains('combine4')?2.5:e.classList.contains('combine2')?2:1;const v=k*1000+parseFloat((e.querySelector('.st').textContent.match(/⚔(\d+)/)||[0,0])[1]);if(v>bv){bv=v;b=i;}});return b;});
  const opts=await pg.$$eval('#kOpts .kopt',els=>els.map(e=>e.querySelector('.kind').textContent+':'+e.textContent.replace(/^\S+/,'').slice(0,14)));
  await tapEl(`#kOpts .kopt[data-i="${idx}"]`);await W(500);await pg.screenshot({path:out+'_keep'+(w+1)+'.png'});await tapEl('#keepBtn');
  if(w===0&&!/spd=/.test(base))await tapEl('#speedBtn');
  await W(3500);await pg.screenshot({path:out+'_wave'+(w+1)+'.png'});
  const tw=await pg.evaluate(()=>{const g=__TDX.G.g;const t=g.towers[g.towers.length-1];return [t.c,t.r];});await tapCell(...tw);await W(400);await pg.screenshot({path:out+'_range'+(w+1)+'.png'});
  await pg.waitForFunction(()=>__TDX.G.g.phase!=='wave',{timeout:300000});
  console.log('wave',w+1,JSON.stringify(opts),'->',JSON.stringify(await st()));}
 await W(1500);await pg.screenshot({path:out+'_end.png'});console.log('errs',JSON.stringify(errs));await br.close();})();

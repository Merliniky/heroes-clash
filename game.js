(()=>{
const {U,W,H,MAXS}=Core;
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const IMG={},FLASH={};let bg;
const names=Object.keys(U);
function load(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});}
const sprSrc=t=>'assets/'+U[t].side+'_'+t+'.png';

// ---------- state ----------
let G={stage:1,army:[],battle:null,phase:'title',speed:1,focusHintShown:false};
let view={s:1,ox:0,oy:0,portrait:false,cw:0,ch:0,dpr:1};
let parts=[],texts=[],shake=0,ripples=[],time=0,pops={};

function resize(){
  const dpr=Math.min(3,window.devicePixelRatio||1),cw=innerWidth,ch=innerHeight;
  cv.width=cw*dpr;cv.height=ch*dpr;view.cw=cw;view.ch=ch;view.dpr=dpr;
  view.portrait=ch>cw*1.15;
  const top=56,bot=view.portrait?40:8;
  if(view.portrait){view.s=Math.min(cw/H,(ch-top-bot)/W);view.ox=(cw-H*view.s)/2;view.oy=top+(ch-top-bot-W*view.s)/2;}
  else{view.s=Math.min(cw/W,(ch-8)/H);view.ox=(cw-W*view.s)/2;view.oy=(ch-H*view.s)/2+4;}
}
addEventListener('resize',resize);
const toS=(x,y)=>view.portrait?[view.ox+y*view.s,view.oy+(W-x)*view.s]:[view.ox+x*view.s,view.oy+y*view.s];

// ---------- helpers ----------
const ease={outBack:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},outCubic:t=>1-Math.pow(1-t,3)};
function vis(u){if(!u.vis)u.vis={spawn:0,badge:0,shownCount:u.count,ghost:1,deadT:0,lx:0,ly:0,rx:0,ry:0};return u.vis;}
function poolFrac(u){return Math.max(0,((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp));}

// ---------- particles ----------
function puff(x,y,n,col,spd,size,life,grav=0){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=spd*(0.3+Math.random());
  parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*0.3,life:life*(0.6+Math.random()*0.6),max:0,size:size*(0.6+Math.random()*0.8),col,grav});}}
function sparks(x,y,col,n=8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=200+Math.random()*350;parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0.25+Math.random()*0.2,size:3,col,spark:1,grav:600});}}
function dmgText(x,y,str,col,big){texts.push({x:x+(Math.random()-0.5)*20,y,str,col,t:0,big});}

// ---------- events from simulation ----------
function handleEvents(b){
  for(const e of b.events){
    if(e.k==='hit'){const u=e.u,[sx,sy]=toS(u.x,u.y),h=u.st.sz*view.s,v=vis(u);
      const src=e.src;if(src){const dx=u.x-src.x,dy=u.y-src.y,d=Math.hypot(dx,dy)||1;v.rx=dx/d;v.ry=dy/d;}
      dmgText(sx,sy-h*0.75,'-'+e.dmg,u.side==='p'?'#ff8a8a':'#fff1a8',e.big);
      if(e.killed>0){v.badge=1;}
      sparks(sx,sy-h*0.4,u.side==='p'?'#ffb3a0':'#fff2b0',e.big?16:7);
      if(e.big)shake=Math.max(shake,12);
      if(e.dead){puff(sx,sy-h*0.3,18,'rgba(235,235,240,',260*view.s+80,h*0.11,0.7,-60);puff(sx,sy-h*0.3,10,u.side==='p'?'rgba(120,180,255,':'rgba(190,90,255,',200,h*0.1,0.6);shake=Math.max(shake,8);v.deadT=0.001;}
    } else if(e.k==='impact'){const [sx,sy]=toS(e.p.x,e.p.y);const c=e.p.kind==='holy'?'rgba(255,240,150,':e.p.kind==='death'?'rgba(180,90,255,':'rgba(230,220,200,';puff(sx,sy,8,c,160,6*view.s+3,0.35);}
    else if(e.k==='shoot'){}
  }
  b.events.length=0;
}

// ---------- drawing ----------
function drawBg(){
  {const k=Math.max(view.cw/H,view.ch/H);ctx.save();ctx.filter='blur(8px) brightness(.45)';ctx.drawImage(bg,(view.cw-W*k)/2,(view.ch-H*k)/2,W*k,H*k);ctx.restore();}
  const s=view.s;
  ctx.save();
  if(view.portrait){ctx.translate(view.ox,view.oy+W*s);ctx.rotate(-Math.PI/2);}else ctx.translate(view.ox,view.oy);
  // blurred fill outside
  ctx.drawImage(bg,0,0,W*s,H*s);
  // vignette
  const g=ctx.createRadialGradient(W*s/2,H*s/2,H*s*0.3,W*s/2,H*s/2,W*s*0.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.35)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W*s,H*s);
  ctx.restore();
}
function shadow(x,y,w){const g=ctx.createRadialGradient(x,y,0,x,y,w);g.addColorStop(0,'rgba(0,0,0,.42)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.translate(x,y);ctx.scale(1,0.38);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,w,0,7);ctx.fill();ctx.restore();}
function drawSprite(t,x,y,h,flip,sx,sy,rot,flash,alpha){
  const im=IMG[t],w=h*im.width/im.height;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(rot);ctx.scale((flip?-1:1)*sx,sy);
  ctx.drawImage(im,-w/2,-h,w,h);
  if(flash>0.02){ctx.globalAlpha=alpha*flash;ctx.drawImage(FLASH[t],-w/2,-h,w,h);}
  ctx.restore();
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawUnit(u,dt){
  const v=vis(u),s=view.s;let [x,y]=toS(u.x,u.y);
  v.spawn=Math.min(1,v.spawn+dt*2.2);
  if(!u.alive){v.deadT+=dt;if(v.deadT>0.5)return;}
  const st=u.st,h0=st.sz*s*(view.portrait?1.4:1);
  const sp=Math.max(0.001,ease.outBack(Math.max(0,v.spawn)));
  if(v.spawn<=0)return;
  // animation
  let bob=0,sqx=1,sqy=1,lx=0,ly=0,rot=0;
  const breathe=Math.sin(time*3+u.id)*0.025;sqy+=breathe;sqx-=breathe;
  if(u.state==='walk'&&u.alive){const ph=u.walkT*1.6;bob=Math.abs(Math.sin(ph))*h0*(st.fly?0.08:0.06);const k=Math.cos(ph*2)*0.06;sqy+=k;sqx-=k;rot=Math.sin(ph)*0.05;}
  if(st.fly){bob+=h0*0.12+Math.sin(time*4+u.id)*h0*0.04;}
  if(u.atkT>0&&u.target){const a=u.atkT,lunge=Math.sin((1-a)*Math.PI);const [tx,ty]=toS(u.target.x,u.target.y);const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1;
    const amt=st.shots>0&&u.shots>=0&&!st.proj?0:(st.shots>0?-8:22)*s*1.6;lx=dx/d*lunge*amt;ly=dy/d*lunge*amt;sqx+=lunge*0.14;sqy-=lunge*0.1;rot=(dx>0?1:-1)*lunge*0.12*(view.portrait?0:1);}
  if(u.hitT>0){const [rdx,rdy]=view.portrait?[v.ry,-v.rx]:[v.rx,v.ry];lx+=rdx*u.hitT*10*s*1.5;ly+=rdy*u.hitT*6*s;sqx+=u.hitT*0.08;sqy-=u.hitT*0.08;}
  let alpha=1,dsc=1;if(!u.alive){const k=v.deadT/0.5;alpha=1-k;dsc=1+k*0.3;sqy*=1-k*0.6;}
  const native=u.side==='p'?1:-1;let face=u.face;if(view.portrait&&u.target){const [tx]=toS(u.target.x,u.target.y);face=Math.abs(tx-x)>20*s?(tx>x?1:-1):native;}
  const flip=face!==native;
  x+=lx;y+=ly;
  shadow(x,y,h0*0.33*sp*(st.fly?0.8:1));
  // focus marker under
  if(G.battle&&G.battle.focus===u&&u.alive){ctx.save();ctx.translate(x,y);ctx.scale(1,0.4);ctx.rotate(time*2);ctx.strokeStyle='#ff3b3b';ctx.lineWidth=5;ctx.setLineDash([14,9]);ctx.shadowColor='#f00';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,h0*0.42+Math.sin(time*6)*3,0,7);ctx.stroke();ctx.restore();}
  const cluster=u.count>=6?2:u.count>=2?1:0;
  const offs=[[-0.22,-0.1],[0.2,-0.13]];
  for(let i=cluster-1;i>=0;i--){const o=offs[i],ox=o[0]*h0*(u.side==='p'?-1:1)*(view.portrait?0.9:1);
    drawSprite(u.type,x+ox,y+o[1]*h0-bob*0.7,h0*0.72*sp,flip,sqx,sqy*dsc,rot,u.hitT*0.9,alpha*0.95);}
  drawSprite(u.type,x,y-bob,h0*sp*dsc,flip,sqx,sqy,rot,u.hitT*0.9,alpha);
  if(!u.alive)return;
  // health bar
  const bw=Math.max(44,h0*0.55),bh=Math.max(6,h0*0.055),by=y-h0*sp-bob-bh-6;
  const f=poolFrac(u);v.ghost+= (f-v.ghost)*Math.min(1,dt*3);if(v.ghost<f)v.ghost=f;
  ctx.fillStyle='rgba(10,10,20,.8)';rr(x-bw/2-2,by-2,bw+4,bh+4,4);ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(x-bw/2,by,bw*v.ghost,bh);
  ctx.fillStyle=u.side==='p'?'#3fa9ff':'#ff4a4a';ctx.fillRect(x-bw/2,by,bw*f,bh);
  ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-bw/2,by,bw*f,bh*0.4);
  // count badge
  v.badge=Math.max(0,v.badge-dt*3);const bs=1+ease.outCubic(v.badge)*0.45;
  const fs=Math.max(14,h0*0.15),txt=String(u.count);ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;
  const tw=Math.max(fs*1.1,ctx.measureText(txt).width+fs*0.7),bx=x+bw/2-tw*0.3,byy=by+bh/2;
  ctx.save();ctx.translate(bx,byy);ctx.scale(bs,bs);
  ctx.fillStyle='#0b1022';rr(-tw/2-2,-fs*0.62-2,tw+4,fs*1.24+4,fs*0.5);ctx.fill();
  const g=ctx.createLinearGradient(0,-fs*0.6,0,fs*0.6);g.addColorStop(0,u.side==='p'?'#6cc4ff':'#ff7d7d');g.addColorStop(1,u.side==='p'?'#1d63c9':'#b81f2a');
  ctx.fillStyle=v.badge>0.05?'#fff':g;rr(-tw/2,-fs*0.62,tw,fs*1.24,fs*0.5);ctx.fill();
  ctx.fillStyle=v.badge>0.05?'#c00':'#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,fs*0.05);ctx.restore();
  v.barY=by;
}
function drawFocus(b){const u=b.focus;if(!u||!u.alive||!u.vis||u.vis.barY==null)return;
  const [x]=toS(u.x,u.y),ay=u.vis.barY-16-Math.abs(Math.sin(time*5))*10;
  ctx.save();ctx.translate(x,ay);ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=6;ctx.fillStyle='#ff2d2d';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-15,-22);ctx.lineTo(15,-22);ctx.lineTo(0,0);ctx.closePath();ctx.stroke();ctx.fill();
  ctx.font='900 13px "Noto Sans CJK SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#5a0000';ctx.strokeText('集火',0,-32);ctx.fillStyle='#fff';ctx.fillText('集火',0,-32);ctx.restore();}
function drawProj(p,dt){
  const [x,y]=toS(p.x,p.y);p.trail=p.trail||[];p.trail.push([x,y]);if(p.trail.length>9)p.trail.shift();
  const s=view.s*(view.portrait?1.4:1);
  ctx.save();ctx.lineCap='round';
  for(let i=1;i<p.trail.length;i++){const a=i/p.trail.length;ctx.strokeStyle=p.kind==='holy'?`rgba(255,230,120,${a*0.7})`:p.kind==='death'?`rgba(170,80,255,${a*0.7})`:`rgba(255,255,255,${a*0.45})`;
    ctx.lineWidth=(p.kind==='arrow'?3:p.kind==='axe'?4:9)*a*s+1;ctx.beginPath();ctx.moveTo(...p.trail[i-1]);ctx.lineTo(...p.trail[i]);ctx.stroke();}
  const last=p.trail[p.trail.length-2]||[x-1,y];const ang=Math.atan2(y-last[1],x-last[0]);
  ctx.translate(x,y);
  if(p.kind==='arrow'){ctx.rotate(ang);ctx.strokeStyle='#5a3a1a';ctx.lineWidth=3*s+1;ctx.beginPath();ctx.moveTo(-22*s,0);ctx.lineTo(8*s,0);ctx.stroke();ctx.fillStyle='#ddd';ctx.beginPath();ctx.moveTo(14*s,0);ctx.lineTo(4*s,-5*s);ctx.lineTo(4*s,5*s);ctx.fill();ctx.fillStyle='#e33';ctx.fillRect(-24*s,-4*s,7*s,8*s);}
  else if(p.kind==='axe'){ctx.rotate(p.age*18);ctx.fillStyle='#6b4423';ctx.fillRect(-12*s,-2*s,24*s,4*s);ctx.fillStyle='#bbb';ctx.beginPath();ctx.arc(10*s,0,8*s,-1.2,1.2);ctx.fill();}
  else{const c=p.kind==='holy'?['#fffbe0','rgba(255,210,80,.9)','rgba(255,180,40,0)']:['#f4e0ff','rgba(170,70,255,.9)','rgba(120,30,200,0)'];
    const r=16*s+Math.sin(time*30)*2;const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,c[0]);g.addColorStop(0.4,c[1]);g.addColorStop(1,c[2]);
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();}
  ctx.restore();
}
function drawFx(dt){
  for(const p of parts){p.max=p.max||p.life;p.life-=dt;p.vy+=(p.grav||0)*dt;p.vx*=1-dt*2.5;if(!p.spark)p.vy*=1-dt*2.5;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const k=Math.max(0,p.life/p.max);
    if(p.spark){ctx.strokeStyle=p.col;ctx.globalAlpha=k;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03);ctx.stroke();ctx.globalAlpha=1;}
    else{ctx.fillStyle=p.col+(k*0.85)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.size*(1.6-k*0.6),0,7);ctx.fill();}}
  parts=parts.filter(p=>p.life>0);
  for(const t of texts){t.t+=dt;}texts=texts.filter(t=>t.t<0.9);
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const t of texts){const k=t.t,sc=k<0.15?ease.outBack(k/0.15)*1.25:1.25-Math.min(0.25,(k-0.15));const fs=(t.big?30:20)*(view.portrait?0.9:1);
    ctx.save();ctx.translate(t.x,t.y-k*50);ctx.scale(sc,sc);ctx.globalAlpha=k>0.6?1-(k-0.6)/0.3:1;ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;
    ctx.lineWidth=5;ctx.strokeStyle='#2a0a0a';ctx.lineJoin='round';ctx.strokeText(t.str,0,0);ctx.fillStyle=t.big?'#ffd000':t.col;ctx.fillText(t.str,0,0);ctx.restore();}
  for(const r of ripples){r.t+=dt;const k=r.t/0.5;ctx.strokeStyle=`rgba(255,80,80,${1-k})`;ctx.lineWidth=4;ctx.beginPath();ctx.arc(r.x,r.y,10+k*50,0,7);ctx.stroke();}
  ripples=ripples.filter(r=>r.t<0.5);
}

// ---------- loop ----------
let last=performance.now(),endTimer=0;
function frame(now){
  let dt=Math.min(0.05,(now-last)/1000);last=now;time+=dt;
  const b=G.battle;
  if(b&&G.phase==='battle'){const n=G.speed;for(let i=0;i<n;i++){Core.step(b,dt);handleEvents(b);}
    if(b.over){endTimer+=dt;if(endTimer>1.3)endBattle();}}
  try{render(b,dt);}catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
function render(b,dt){
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
  drawBg();
  shake*=Math.pow(0.002,dt);const sx=(Math.random()-0.5)*shake,sy=(Math.random()-0.5)*shake;
  ctx.translate(sx,sy);
  if(b){const us=[...b.units].sort((a,c)=>toS(a.x,a.y)[1]-toS(c.x,c.y)[1]);for(const u of us)drawUnit(u,dt);for(const p of b.proj)drawProj(p,dt);drawFocus(b);
    $('pCount').textContent=b.units.filter(u=>u.alive&&u.side==='p').reduce((a,u)=>a+u.count,0);
    $('eCount').textContent=b.units.filter(u=>u.alive&&u.side==='e').reduce((a,u)=>a+u.count,0);}
  drawFx(dt);
}

// ---------- input ----------
cv.addEventListener('pointerdown',e=>{
  const b=G.battle;if(!b||G.phase!=='battle'&&G.phase!=='countdown')return;
  let best=null,bd=1e9;
  for(const u of b.units){if(!u.alive||u.side!=='e')continue;const [x,y]=toS(u.x,u.y);const h=u.st.sz*view.s*(view.portrait?1.4:1);
    const d=Math.hypot(e.clientX-x,(e.clientY-(y-h*0.45))*0.8);if(d<Math.max(h*0.65,40)&&d<bd){bd=d;best=u;}}
  if(best){b.focus=best;vis(best).badge=0.6;ripples.push({x:e.clientX,y:e.clientY,t:0});$('hint').classList.add('hidden');G.focusHintShown=true;}
});
$('speedBtn').onclick=()=>{G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};

// ---------- flow ----------
function banner(txt,dur=900){const el=$('banner');el.textContent=txt;el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(banner.t);banner.t=setTimeout(()=>el.classList.add('hidden'),dur);}
function show(id,on){$(id).classList.toggle('show',on);}
function startRun(){G.stage=1;G.army=[];G.speed=1;$('speedBtn').textContent='1×';show('title',false);show('result',false);openDraft();}
function setupPreview(){G.enemies=G.enemies||Core.makeEnemies(G.stage);G.battle=Core.createBattle(G.army,G.enemies);$('stageNum').textContent=G.stage;}
function statRow(k,v){return `<div><span>${k}</span><b>${v}</b></div>`;}
function openDraft(){
  G.phase='draft';G.enemies=Core.makeEnemies(G.stage);setupPreview();
  $('draftTitle').textContent=`第 ${G.stage} 关`;
  $('draftSub').textContent=G.army.length>=MAXS?'部队已满（7支）· 选择增援已有部队':'选择一支援军加入你的部队';
  let offers=[Core.makeOffer(G.stage,G.army),Core.makeOffer(G.stage,G.army)];
  for(let i=0;i<5&&offers[1].type===offers[0].type;i++)offers[1]=Core.makeOffer(G.stage,G.army);
  const cards=$('cards');cards.innerHTML='';
  offers.forEach(o=>{const st=U[o.type],el=document.createElement('div');el.className='card';
    const owned=G.army.find(a=>a.type===o.type);
    const tags=[st.shots?'<span class="tag r">远程</span>':'<span class="tag m">近战</span>',st.fly?'<span class="tag f">飞行</span>':'',owned?'<span class="tag up">增援 +'+o.count+'</span>':''].join('');
    el.innerHTML=`<div class="art"><span class="tier">${'★'.repeat(st.tier)}</span><img src="${sprSrc(o.type)}"><span class="cnt">×${o.count}</span></div>
      <div class="nm">${o.count} ${st.n}</div><div class="tags">${tags}</div>
      <div class="stats">${statRow('攻击',st.a)+statRow('防御',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>`;
    el.onclick=()=>choose(o,el);cards.appendChild(el);});
  renderStrip();show('draft',true);
}
function renderStrip(){const s=$('armyStrip');s.innerHTML='';
  for(let i=0;i<MAXS;i++){const a=G.army[i];s.innerHTML+=a?`<div class="mini"><img src="${sprSrc(a.type)}"><b>${a.count}</b></div>`:'<div class="mini empty"></div>';}}
function choose(o,el){
  if(G.phase!=='draft')return;G.phase='chosen';
  [...$('cards').children].forEach(c=>c.classList.add(c===el?'chosen':'gone'));
  const ex=G.army.find(a=>a.type===o.type);if(ex)ex.count+=o.count;else G.army.push({...o});
  setTimeout(()=>{show('draft',false);setupPreview();
    G.battle.units.forEach(u=>{vis(u).spawn=u.side==='p'?(u.type===o.type?-0.4:1):-Math.random()*0.5;});
    const nu=G.battle.units.find(u=>u.type===o.type);if(nu){const [x,y]=toS(nu.x,nu.y);setTimeout(()=>puff(x,y-20,18,'rgba(255,240,180,',200,10,0.6),200);}
    countdown();},450);
}
function countdown(){G.phase='countdown';banner(`第 ${G.stage} 关`,900);
  setTimeout(()=>banner('3',600),1000);setTimeout(()=>banner('2',600),1500);setTimeout(()=>banner('1',600),2000);
  setTimeout(()=>{banner('战斗！',700);G.phase='battle';endTimer=0;if(!G.focusHintShown)$('hint').classList.remove('hidden');},2500);}
function endBattle(){
  const b=G.battle;if(G.phase!=='battle')return;G.phase='result';$('hint').classList.add('hidden');
  const win=b.over==='win';const pl=b.units.filter(u=>u.side==='p');
  $('resTitle').textContent=win?'胜利！':'战败';$('resTitle').className='res-title'+(win?'':' lose');
  $('resList').innerHTML=pl.map((u,i)=>`<div class="res-unit ${u.alive?'':'dead'}" style="animation-delay:${i*0.07}s"><img src="${sprSrc(u.type)}"><div class="c">${u.alive?'×'+u.count:'阵亡'}</div><div class="l">${u.start-u.count>0?'-'+(u.start-u.count):''}</div><div class="n">${u.st.n}</div></div>`).join('');
  if(win){G.army=pl.filter(u=>u.alive).map(u=>({type:u.type,count:u.count}));
    $('resSub').textContent=`第 ${G.stage} 关已攻克 · 幸存部队将继续出征`;$('resBtn').textContent='征召援军 →';
    $('resBtn').onclick=()=>{show('result',false);G.stage++;openDraft();};
    for(let i=0;i<30;i++)setTimeout(()=>puff(Math.random()*view.cw,view.ch*0.3*Math.random(),6,['rgba(255,215,90,','rgba(120,200,255,','rgba(255,120,160,'][i%3],250,6,1,300),i*40);
  } else {$('resSub').textContent=`止步第 ${G.stage} 关 · 共攻克 ${G.stage-1} 关`;$('resBtn').textContent='重新开始';$('resBtn').onclick=()=>{show('result',false);startRun();};}
  setTimeout(()=>show('result',true),win?200:500);
}
$('startBtn').onclick=startRun;

// ---------- boot ----------
Promise.all([load('assets/arena.jpg').then(i=>bg=i),...names.map(t=>load(sprSrc(t)).then(i=>{IMG[t]=i;
  const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);FLASH[t]=c;}))]).then(()=>{
  resize();
  $('titleHeroes').innerHTML=['p_swordsman','p_angel','p_cavalier'].map(s=>`<img src="assets/${s}.png">`).join('');
  G.enemies=Core.makeEnemies(1);G.battle=Core.createBattle([{type:'pikeman',count:5},{type:'crossbowman',count:3}],G.enemies);
  requestAnimationFrame(frame);
  // debug hooks for automated screenshots
  window.__G=G;window.__tap=u=>{const [x,y]=toS(u.x,u.y);return [x,y-u.st.sz*view.s*0.4];};window.__auto=q=>{if(q==='pick'&&G.phase==='draft')$('cards').children[0].click();if(q==='focus'){const e=G.battle.units.find(u=>u.alive&&u.side==='e');G.battle.focus=e;}};
});
})();

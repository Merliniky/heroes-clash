(()=>{
const {U,W,H,MAXS,FX0,FX1,FY0,FY1}=Core;
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const S=SFX.S;
const names=Object.keys(U);
const sprSrc=t=>'assets/'+U[t].side+'_'+t+'.png';
const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});
let bg;const RIG={};

// ---------- rig building: split each static sprite into torso + back leg + front leg ----------
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;}
function whiten(c){const o=mk(c.width,c.height),x=o.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height);return o;}
function buildRig(t,img){
  const st=U[t],PH=180,k=PH/img.height,PW=Math.round(img.width*k);
  // two-step downscale for quality
  const mid=mk(img.width/2,img.height/2);mid.getContext('2d').drawImage(img,0,0,mid.width,mid.height);
  const full=mk(PW,PH),fx=full.getContext('2d');fx.imageSmoothingQuality='high';fx.drawImage(mid,0,0,PW,PH);
  const legFrac=st.quad?0.3:(st.fly&&!st.quad?0.26:0.3),split=Math.round(PH*(1-legFrac)),ov=6;
  // find leg centre (alpha-weighted column mean of the leg band)
  const data=fx.getImageData(0,split,PW,PH-split).data;let sx=0,sw=0,minx=PW,maxx=0;
  for(let y=0;y<PH-split;y++)for(let x=0;x<PW;x++){const a=data[(y*PW+x)*4+3];if(a>80){sx+=x*a;sw+=a;minx=Math.min(minx,x);maxx=Math.max(maxx,x);}}
  const midX=Math.round(sw?sx/sw:PW/2);
  const top=mk(PW,split+ov);top.getContext('2d').drawImage(full,0,0);
  const lb=mk(midX,PH-split),lf=mk(PW-midX,PH-split);
  lb.getContext('2d').drawImage(full,0,split,midX,PH-split,0,0,midX,PH-split);
  lf.getContext('2d').drawImage(full,midX,split,PW-midX,PH-split,0,0,PW-midX,PH-split);
  // body centre of mass for anchor
  const all=fx.getImageData(0,PH-8,PW,8).data;let fx2=0,fw=0;for(let i=0;i<all.length;i+=4){const a=all[i+3];if(a>60){fx2+=((i/4)%PW)*a;fw+=a;}}
  const footX=fw?fx2/fw:midX;
  RIG[t]={PW,PH,split,midX,footX,top,lb,lf,wtop:whiten(top),wlb:whiten(lb),wlf:whiten(lf),full,footW:(maxx-minx)||PW*0.5};
}

// ---------- state ----------
const DEBUG=/[?&]debug/.test(location.search);
let G={stage:1,army:[],battle:null,phase:'title',speed:1,focusHintShown:false};
let view={s:1,ox:0,oy:0,portrait:false,cw:0,ch:0,dpr:1};
let parts=[],texts=[],fx=[],dying=[],shake=0,ripples=[],time=0,emitters=[];

function resize(){
  const dpr=Math.min(3,window.devicePixelRatio||1),cw=innerWidth,ch=innerHeight;
  cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);Object.assign(view,{cw,ch,dpr});
  view.portrait=ch>cw*1.15;
  if(view.portrait){const top=54,bot=44;view.s=Math.min(cw/H*1.16,(ch-top-bot)/W);view.ox=(cw-H*view.s)/2;view.oy=top+(ch-top-bot-W*view.s)/2;}
  else{view.s=Math.min(cw/W,(ch)/H);view.ox=(cw-W*view.s)/2;view.oy=(ch-H*view.s)/2;}
  // field rect on screen for perspective
  const a=toS(FX0,FY0),b=toS(FX1,FY1);view.fy0=Math.min(a[1],b[1]);view.fy1=Math.max(a[1],b[1]);
}
addEventListener('resize',resize);
const toS=(x,y)=>view.portrait?[view.ox+y*view.s,view.oy+(W-x)*view.s]:[view.ox+x*view.s,view.oy+y*view.s];
const persp=sy=>0.88+0.2*Math.max(0,Math.min(1,(sy-view.fy0)/(view.fy1-view.fy0||1)));
const figH=(st,sy)=>st.sz*0.52*view.s*(view.portrait?1.12:1)*persp(sy);

const E={outBack:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},outCubic:t=>1-Math.pow(1-t,3),inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};

// ---------- formation ----------
const SLOTS=[[12,0],[-8,-26],[-8,26],[-32,-11],[-30,17]];
function maxFig(st){return st.sz>=160?3:st.sz>=140?4:5;}
function vis(u){if(!u.vis){u.vis={spawn:0,badge:0,ghost:1,figs:[],lastCount:u.count};syncFigs(u,true);}return u.vis;}
function figWorld(u,f){const fs=u.st.sz/120*0.9,face=u.side==='p'?1:-1;return [u.x+(f.ox*fs)*face+f.jx,u.y+f.oy*fs+f.jy];}
function syncFigs(u,init){
  const v=u.vis,want=u.alive?Math.min(maxFig(u.st),u.count):0;
  while(v.figs.length<want){const i=v.figs.length;v.figs.push({ox:SLOTS[i][0],oy:SLOTS[i][1],jx:(Math.random()-0.5)*5,jy:(Math.random()-0.5)*5,ph:Math.random()*6.28,spawn:init?0:0,lag:Math.random()*0.08,prevS:0});}
  while(v.figs.length>want){const f=v.figs.pop();const [wx,wy]=figWorld(u,f);killFig(u,wx,wy);}
}

// ---------- particles & fx ----------
function P(o){parts.push(Object.assign({vx:0,vy:0,grav:0,drag:2.5,size:4,life:0.5,add:false,shrink:false},o,{max:o.life||0.5}));}
function dust(x,y,n,scale=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(20+Math.random()*50)*scale;P({x:x+(Math.random()-0.5)*6*scale,y:y-2,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.35-8*scale,size:(2.5+Math.random()*3.5)*scale,life:0.45+Math.random()*0.35,col:'rgba(196,170,120,',grow:1.8,alpha:0.55});}}
function sparks(x,y,col,n=6,sp=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(90+Math.random()*180)*sp;P({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,size:2,life:0.18+Math.random()*0.15,col,spark:1,grav:500,drag:1});}}
function puff(x,y,n,col,spd,size,life,rise=-30,alpha=0.8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=spd*(0.3+Math.random()*0.7);P({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7+rise,size:size*(0.6+Math.random()*0.8),life:life*(0.6+Math.random()*0.6),col,grow:1.6,alpha});}}
function fire(x,y,vx,vy,size,life){P({x,y,vx,vy,size,life,col:'fire',grow:2.2,add:true,drag:1.2,grav:-60});}
function dmgText(x,y,str,col,big){texts.push({x:x+(Math.random()-0.5)*14,y,str,col,t:0,big});}
function killFig(u,wx,wy){
  const f={type:u.type,side:u.side,wx,wy,t:0,flip:false,fell:Math.random()<0.5?-1:1};dying.push(f);
}

// ---------- simulation event -> visuals & sound ----------
function frontPos(u){const [x,y]=toS(u.x,u.y);const h=figH(u.st,y);return [x,y,h];}
function handleEvents(b){
  for(const e of b.events){
    const u=e.u;
    if(e.k==='wind'){
      if(u.st.fx==='breath'){S.roar();emitters.push({u,t:0,dur:0.75,kind:'breath'});}
      if(u.st.proj==='arrow'||u.st.proj==='bolt'){}
      if(u.st.fx==='charge'){S.gallop();}
    } else if(e.k==='shoot'){
      const p=u.st.proj;({arrow:S.bow,bolt:S.bolt,holy:S.magic,death:S.dark,fire:S.fireball})[p]();
      const [x,y,h]=frontPos(u);if(p==='holy')puff(x,y-h*0.8,6,'rgba(150,210,255,',40,3,0.4,-20);if(p==='death')puff(x,y-h*0.8,6,'rgba(170,80,255,',40,3,0.4,-20);if(p==='fire')puff(x,y-h*0.6,5,'rgba(255,150,40,',40,3,0.3,-20);
    } else if(e.k==='strike'){strikeFx(u,e.t);}
    else if(e.k==='hit'){
      const [sx,sy,h]=frontPos(u),v=vis(u);
      const src=e.src;if(src){const dx=u.x-src.x,dy=u.y-src.y,d=Math.hypot(dx,dy)||1;v.kx=dx/d;v.ky=dy/d;}
      dmgText(sx,sy-h*1.25,'-'+e.dmg,u.side==='p'?'#ff9a9a':'#fff3b0',e.big);
      if(e.killed>0){v.badge=1;}
      if(!src||!src.st.proj||src.st.shots<=0)S.hit();
      if(e.big)shake=Math.max(shake,7);
      if(e.killed>0)S.death();
      if(e.dead)shake=Math.max(shake,4);
    } else if(e.k==='impact'){const p=e.p,[x,y]=toS(p.x,p.y),h=figH(p.t.st,y)*0.5;
      if(p.kind==='holy'){S.holyHit();puff(x,y-h,10,'rgba(170,220,255,',90,4,0.4,-20);sparks(x,y-h,'#bfe8ff',6);}
      else if(p.kind==='death'){puff(x,y-h,10,'rgba(160,70,240,',90,4,0.45,-30);}
      else if(p.kind==='fire'){for(let i=0;i<10;i++)fire(x,y-h,(Math.random()-0.5)*120,(Math.random()-0.5)*80-30,4,0.35);puff(x,y-h,4,'rgba(80,70,70,',40,4,0.6,-40,0.5);}
      else {S.thunk();sparks(x,y-h,'#f4e2b8',4,0.7);}
    }
  }
  b.events.length=0;
}
function strikeFx(u,t){
  if(!t)return;const [ax,ay,h]=frontPos(u),[tx,ty,th]=frontPos(t);
  const ang=Math.atan2((ty-th*0.5)-(ay-h*0.5),tx-ax);const mx=ax+(tx-ax)*0.6,my=ay-h*0.5+((ty-th*0.5)-(ay-h*0.5))*0.6;
  const k=u.st.fx;const add=o=>fx.push(Object.assign({t:0,ang,x:mx,y:my,h},o));
  switch(k){
    case 'thrust':S.thrust();add({kind:'thrust',max:0.16,col:'255,255,255',x:ax,y:ay-h*0.55,len:Math.hypot(tx-ax,ty-ay)*0.9});sparks(tx,ty-th*0.5,'#fff',4);break;
    case 'slash':S.slash();S.clash();add({kind:'arc',max:0.2,col:u.type==='skeleton'?'220,220,210':'255,255,255',r:h*0.55,w:h*0.12});sparks(tx,ty-th*0.5,'#ffe9a0',7);
      if(u.type==='skeleton')for(let i=0;i<3;i++)P({x:tx,y:ty-th*0.5,vx:(Math.random()-0.5)*160,vy:-80-Math.random()*80,size:2.2,life:0.5,col:'bone',grav:500,drag:0.5,rot:Math.random()*6});break;
    case 'flame':S.flame();S.clash();add({kind:'arc',max:0.26,col:'255,170,40',r:h*0.7,w:h*0.2,glow:1});for(let i=0;i<14;i++)fire(tx,ty-th*0.5,(Math.random()-0.5)*160,(Math.random()-0.7)*120,4,0.4);break;
    case 'cleave':S.slash();S.heavy();add({kind:'arc',max:0.24,col:'255,120,90',r:h*0.75,w:h*0.18});dust(tx,ty,6,1.2);shake=Math.max(shake,3);break;
    case 'bite':S.bite();add({kind:'bite',max:0.22,x:tx,y:ty-th*0.55,r:th*0.35});for(let i=0;i<5;i++)P({x:tx,y:ty-th*0.5,vx:(Math.random()-0.5)*80,vy:-30-Math.random()*50,size:2,life:0.5,col:'rgba(150,220,90,',grav:300,alpha:0.9});break;
    case 'leap':S.bite();S.hit();add({kind:'claw',max:0.25,x:tx,y:ty-th*0.5,r:th*0.4,col:'255,80,60'});dust(ax,ay,5,1);break;
    case 'dive':S.slash();add({kind:'claw',max:0.25,x:tx,y:ty-th*0.5,r:th*0.45,col:'255,240,200'});for(let i=0;i<5;i++)P({x:tx,y:ty-th*0.6,vx:(Math.random()-0.5)*120,vy:-50-Math.random()*50,size:2.5,life:0.8,col:'feather',grav:60,drag:2,rot:Math.random()*6});dust(tx,ty,5,1);break;
    case 'charge':S.heavy();S.clash();dust(tx,ty,12,1.6);add({kind:'ring',max:0.3,x:tx,y:ty,r:th*0.7});shake=Math.max(shake,5);break;
    case 'breath':break;
    default:S.slash();add({kind:'arc',max:0.18,col:'255,255,255',r:h*0.5,w:h*0.1});
  }
}

// ---------- drawing ----------
function drawBg(){
  const s=view.s;
  {const k=Math.max(view.cw/H,view.ch/H)*1.05;ctx.save();ctx.filter='blur(10px) brightness(.5)';ctx.drawImage(bg,(view.cw-W*k)/2,(view.ch-H*k)/2,W*k,H*k);ctx.restore();}
  ctx.save();
  if(view.portrait){ctx.translate(view.ox,view.oy+W*s);ctx.rotate(-Math.PI/2);}else ctx.translate(view.ox,view.oy);
  ctx.drawImage(bg,0,0,W*s,H*s);
  // soft team tint on each half + vignette
  let g=ctx.createLinearGradient(FX0*s,0,FX1*s,0);g.addColorStop(0,'rgba(60,140,255,.10)');g.addColorStop(0.45,'rgba(0,0,0,0)');g.addColorStop(0.55,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(255,60,60,.10)');
  ctx.fillStyle=g;ctx.fillRect(FX0*s,FY0*s,(FX1-FX0)*s,(FY1-FY0)*s);
  g=ctx.createRadialGradient(W*s/2,H*s/2,H*s*0.35,W*s/2,H*s/2,W*s*0.65);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.3)');ctx.fillStyle=g;ctx.fillRect(0,0,W*s,H*s);
  ctx.restore();
}
function shadowAt(x,y,w,a){ctx.save();ctx.translate(x,y);ctx.scale(1,0.34);const g=ctx.createRadialGradient(0,0,0,0,0,w);g.addColorStop(0,`rgba(20,30,10,${a})`);g.addColorStop(0.55,`rgba(20,30,10,${a*0.6})`);g.addColorStop(1,'rgba(20,30,10,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,w,0,7);ctx.fill();ctx.restore();}
// pose: {lift,bob,lean,legA,sx,sy,rot,flash,alpha}
function drawRig(t,x,y,h,flip,p){
  const R=RIG[t],k=h/R.PH;
  ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(x,y-p.lift);if(flip)ctx.scale(-1,1);if(p.rot)ctx.rotate(p.rot);ctx.scale(p.sx,p.sy);
  const ox=-R.footX*k,hip=(R.split-R.PH)*k;
  for(let pass=0;pass<2;pass++){
    if(pass===1){if(p.flash<0.03)break;ctx.globalAlpha=p.alpha*p.flash;}
    const lb=pass?R.wlb:R.lb,lf=pass?R.wlf:R.lf,top=pass?R.wtop:R.top;
    ctx.save();ctx.translate(ox+R.midX*k,hip);ctx.transform(1,0,p.legA,1,0,0);ctx.drawImage(lb,-R.midX*k,0,R.midX*k,(R.PH-R.split)*k);ctx.restore();
    ctx.save();ctx.translate(ox+R.midX*k,hip);ctx.transform(1,0,-p.legA*0.9,1,0,0);ctx.drawImage(lf,0,0,(R.PW-R.midX)*k,(R.PH-R.split)*k);ctx.restore();
    ctx.save();ctx.translate(ox+R.midX*k,hip-p.bob);ctx.rotate(p.lean);ctx.scale(1,p.tsy||1);ctx.drawImage(top,-R.midX*k,-R.split*k,R.PW*k,(R.split+6)*k);ctx.restore();
  }
  ctx.restore();
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

function figurePose(u,f,h,dt){
  const st=u.st,v=u.vis;const p={lift:0,bob:0,lean:0,legA:0,sx:1,sy:1,rot:0,flash:u.hitT*u.hitT*0.75,alpha:1,dx:0,dy:0};
  const walking=u.state==='walk'&&u.alive&&G.phase==='battle';
  const ph=u.walkT*(st.quad?2.6:2.1)+f.ph;
  if(walking){
    const sw=Math.sin(ph);p.legA=sw*(st.quad?0.42:0.36);p.bob=Math.abs(Math.cos(ph))*h*0.045;p.lean=0.06+Math.sin(ph*2)*0.03;
    const sq=Math.cos(ph*2)*0.04;p.sy+=sq;p.sx-=sq*0.6;
    // footstep detection
    const sgn=sw>=0?1:-1;if(f.prevS&&sgn!==f.prevS&&!st.fly){f.step=1;}f.prevS=sgn;
  } else {const br=Math.sin(time*2.6+f.ph)*0.022;p.sy+=br;p.sx-=br*0.5;p.legA*=0.8;}
  if(st.fly){p.lift=h*0.32+Math.sin(time*3.2+f.ph)*h*0.06;p.legA=Math.sin(time*2+f.ph)*0.12;p.tsy=1+Math.sin(time*14+f.ph)*0.035;}
  const wt=st.fx==='breath'?0.45:st.shots>0&&u.shots>0?0.32:0.28;
  if(u.wind>0){const w=E.outCubic(1-u.wind/wt);p.lean-=0.28*w;p.dx-=h*0.07*w;p.sx+=0.05*w;p.sy-=0.05*w;if(st.fx==='leap'||st.fx==='dive'){p.lift+=h*0.08*w;}}
  if(u.atkT>0){const a=Math.max(0,u.atkT-f.lag*3),ka=Math.sin(Math.min(1,a)*Math.PI*0.5);
    const ranged=st.shots>0&&u.shots>=0&&st.proj&&u.shots<st.shots&&!st.fx;
    const reach={thrust:0.45,slash:0.25,flame:0.3,cleave:0.3,bite:0.25,leap:0.7,dive:0.6,charge:0.55,breath:0.12}[st.fx]??0.25;
    if(ranged){p.dx-=h*0.08*ka;p.lean-=0.1*ka;}
    else{p.dx+=h*reach*ka;p.lean+=0.32*ka;p.sx+=0.14*ka;p.sy-=0.08*ka;if(st.fx==='leap')p.lift+=h*0.35*Math.sin(ka*Math.PI);if(st.fx==='dive')p.lift-=h*0.2*ka;}}
  if(u.hitT>0){p.dx-=h*0.1*u.hitT;p.sx+=0.06*u.hitT;p.sy-=0.06*u.hitT;}
  return p;
}
function drawUnits(b,dt){
  const list=[];
  for(const u of b.units){
    const v=vis(u);syncFigs(u);
    v.spawn=Math.min(1,v.spawn+dt*2.4);
    const native=u.side==='p'?1:-1;
    for(const f of v.figs){
      f.spawn=Math.min(1,(f.spawn||0)+dt*2.4);
      const [wx,wy]=figWorld(u,f);let [x,y]=toS(wx,wy);const h=figH(u.st,y);
      const sp=E.outBack(Math.max(0,Math.min(1,v.spawn*1.4-f.lag*4)));if(sp<=0.01)continue;
      // facing: towards target horizontally on screen
      let face=native;if(u.target&&u.alive){const [tx]=toS(u.target.x,u.target.y);if(Math.abs(tx-x)>h*0.6)face=tx>x?1:-1;}
      const p=figurePose(u,f,h,dt);
      // directional offsets (attack lunge towards target, knockback away from source)
      let dirx=face,diry=0;if(u.target){const [tx,ty]=toS(u.target.x,u.target.y);const d=Math.hypot(tx-x,ty-y)||1;dirx=(tx-x)/d;diry=(ty-y)/d;}
      x+=dirx*p.dx;y+=diry*p.dx*0.6;
      if(f.step&&!u.st.fly){f.step=0;if(Math.random()<(u.st.fx==='charge'||u.st.quad?0.7:0.35))dust(x-dirx*h*0.15,y,u.st.quad?3:2,h/40);u.st.quad?S.gallop():S.step();}
      if(u.state==='walk'&&u.st.fx==='charge'&&Math.random()<dt*14)dust(x-dirx*h*0.4,y,2,h/30);
      if(u.type==='angel'&&Math.random()<dt*6)fire(x+face*h*0.35,y-p.lift-h*0.3,(Math.random()-0.5)*20,-20,2.5,0.5);
      const s=sp;
      list.push({y,draw:()=>drawRig(u.type,x,y,h*s,face!==native,p),sh:()=>shadowAt(x,y,RIG[u.type].footW/RIG[u.type].PH*h*0.62*s*(u.st.fly?0.75:1),u.st.fly?0.26:0.42)});
    }
  }
  for(const d of dying){d.t+=dt;const [x,y]=toS(d.wx,d.wy),h=figH(U[d.type],y);const k=Math.min(1,d.t/0.45);
    if(!d.poof&&d.t>0.3){d.poof=1;puff(x,y-h*0.4,8,'rgba(235,235,240,',60,h*0.08,0.6,-25,0.75);
      // soul wisp
      P({x,y:y-h*0.6,vx:0,vy:-55,size:h*0.12,life:1.1,col:d.side==='p'?'rgba(170,220,255,':'rgba(190,110,255,',add:true,grow:0.6,drag:0.5,alpha:0.8,soul:1});
      if(d.type==='skeleton')for(let i=0;i<5;i++)P({x,y:y-h*0.4,vx:(Math.random()-0.5)*150,vy:-60-Math.random()*90,size:2.4,life:0.7,col:'bone',grav:480,drag:0.4,rot:Math.random()*6});}
    const p={lift:U[d.type].fly?h*0.3*(1-k):0,bob:0,lean:0,legA:0,sx:1,sy:1,rot:d.fell*E.inOut(k)*1.3,flash:Math.max(0,1-d.t*5),alpha:1-Math.max(0,(d.t-0.25)/0.35)};
    if(p.alpha>0)list.push({y,draw:()=>drawRig(d.type,x,y,h,d.side==='e',p),sh:()=>shadowAt(x,y,h*0.3,0.35*p.alpha)});}
  dying=dying.filter(d=>d.t<0.62);
  for(const it of list)it.sh();
  list.sort((a,b)=>a.y-b.y);for(const it of list)it.draw();
}
function stackAnchor(u){const v=u.vis;let x=0,y=0,top=1e9;const n=Math.max(1,v.figs.length);
  for(const f of v.figs){const [wx,wy]=figWorld(u,f);const [sx,sy]=toS(wx,wy);x+=sx;y+=sy;top=Math.min(top,sy-figH(u.st,sy)*(u.st.fly?1.32:1));}
  if(!v.figs.length){const [sx,sy]=toS(u.x,u.y);return [sx,sy,sy-figH(u.st,sy)];}return [x/n,y/n,top];}
function drawStackUI(b,dt){
  for(const u of b.units){if(!u.alive)continue;const v=u.vis;if(!v)continue;const [x,y,top]=stackAnchor(u);const [ux,uy]=toS(u.x,u.y);const h=figH(u.st,uy);
    if(b.focus===u){ctx.save();ctx.translate(x,y);ctx.scale(1,0.38);ctx.rotate(time*2);ctx.strokeStyle='rgba(255,50,50,.95)';ctx.lineWidth=3.5;ctx.setLineDash([9,6]);ctx.beginPath();ctx.arc(0,0,h*0.85+Math.sin(time*6)*2,0,7);ctx.stroke();ctx.restore();}
    const bw=Math.max(30,h*0.9),bh=Math.max(4,h*0.075),by=top-bh-5;
    const f=Math.max(0,((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp));v.ghost+=(f-v.ghost)*Math.min(1,dt*3);if(v.ghost<f)v.ghost=f;
    ctx.fillStyle='rgba(10,10,20,.75)';rr(x-bw/2-1.5,by-1.5,bw+3,bh+3,3);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(x-bw/2,by,bw*v.ghost,bh);ctx.fillStyle=u.side==='p'?'#3fa9ff':'#ff4a4a';ctx.fillRect(x-bw/2,by,bw*f,bh);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-bw/2,by,bw*f,bh*0.4);
    v.badge=Math.max(0,v.badge-dt*3);const bs=1+E.outCubic(v.badge)*0.45,fs=Math.max(11,h*0.3),txt=String(u.count);
    ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;const tw=Math.max(fs*1.15,ctx.measureText(txt).width+fs*0.7);
    ctx.save();ctx.translate(x-bw/2-tw*0.35,by+bh/2);ctx.scale(bs,bs);ctx.fillStyle='#0b1022';rr(-tw/2-1.5,-fs*0.62-1.5,tw+3,fs*1.24+3,fs*0.5);ctx.fill();
    const g=ctx.createLinearGradient(0,-fs*0.6,0,fs*0.6);g.addColorStop(0,u.side==='p'?'#6cc4ff':'#ff7d7d');g.addColorStop(1,u.side==='p'?'#1d63c9':'#b81f2a');
    ctx.fillStyle=v.badge>0.05?'#fff':g;rr(-tw/2,-fs*0.62,tw,fs*1.24,fs*0.5);ctx.fill();ctx.fillStyle=v.badge>0.05?'#c00':'#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,fs*0.06);ctx.restore();
    if(b.focus===u){const ay=by-8-Math.abs(Math.sin(time*5))*7;ctx.save();ctx.translate(x,ay);ctx.fillStyle='#ff2d2d';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(-10,-14);ctx.lineTo(10,-14);ctx.lineTo(0,0);ctx.closePath();ctx.stroke();ctx.fill();
      ctx.font='900 12px "Noto Sans CJK SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=3.5;ctx.strokeStyle='#5a0000';ctx.strokeText('集火',0,-22);ctx.fillStyle='#fff';ctx.fillText('集火',0,-22);ctx.restore();}
  }
}
function drawProj(p,dt){
  const [gx,gy]=toS(p.x,p.y);const prog=Math.max(0,Math.min(1,1-Math.hypot(p.t.x-p.x,p.t.y-p.y)/(p.d0||1)));
  const arc={arrow:0.22,bolt:0.05,holy:0.1,death:0.06,fire:0.14}[p.kind]||0.1;
  const z=(p.z*(1-prog)+figH(p.t.st,gy)*0.45*prog)*view.s/view.s+(p.d0||0)*arc*Math.sin(prog*Math.PI);
  const x=gx,y=gy-z*view.s*(view.portrait?1.12:1);
  p.trail=p.trail||[];p.trail.push([x,y]);if(p.trail.length>10)p.trail.shift();
  shadowAt(gx,gy,5,0.25);
  const s=view.s*(view.portrait?1.2:1);const lastp=p.trail[p.trail.length-2]||[x-1,y];const ang=Math.atan2(y-lastp[1],x-lastp[0]);
  ctx.save();ctx.lineCap='round';
  for(let i=1;i<p.trail.length;i++){const a=i/p.trail.length;const c={holy:`rgba(150,210,255,${a*0.7})`,death:`rgba(170,80,255,${a*0.7})`,fire:`rgba(255,140,30,${a*0.7})`}[p.kind]||`rgba(255,255,255,${a*0.5})`;
    ctx.strokeStyle=c;ctx.lineWidth=(p.kind==='arrow'||p.kind==='bolt'?2.2:7)*a*s+0.5;ctx.beginPath();ctx.moveTo(...p.trail[i-1]);ctx.lineTo(...p.trail[i]);ctx.stroke();}
  ctx.translate(x,y);
  if(p.kind==='arrow'||p.kind==='bolt'){ctx.rotate(ang);const L=p.kind==='arrow'?18:12;ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2*s+0.6;ctx.beginPath();ctx.moveTo(-L*s,0);ctx.lineTo(5*s,0);ctx.stroke();ctx.fillStyle='#e8e8e8';ctx.beginPath();ctx.moveTo(10*s,0);ctx.lineTo(3*s,-3.5*s);ctx.lineTo(3*s,3.5*s);ctx.fill();if(p.kind==='arrow'){ctx.fillStyle='#d33';ctx.fillRect(-L*s-2*s,-3*s,6*s,6*s);}}
  else{const c={holy:['#ffffff','rgba(120,200,255,.95)','rgba(60,120,255,0)'],death:['#f4e0ff','rgba(170,70,255,.95)','rgba(120,30,200,0)'],fire:['#fff6c0','rgba(255,140,30,.95)','rgba(200,40,0,0)']}[p.kind];
    const r=(p.kind==='fire'?10:12)*s+Math.sin(time*30)*1.5;const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,c[0]);g.addColorStop(0.35,c[1]);g.addColorStop(1,c[2]);
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
    if(p.kind==='fire'&&Math.random()<0.6)fire(x,y,(Math.random()-0.5)*20,-10,3,0.3);
    if(p.kind==='holy'&&Math.random()<0.5)P({x:x+(Math.random()-0.5)*8,y:y+(Math.random()-0.5)*8,vx:0,vy:-10,size:1.6,life:0.4,col:'rgba(220,240,255,',add:true});
    if(p.kind==='death'&&Math.random()<0.5)P({x,y,vx:(Math.random()-0.5)*20,vy:-15,size:3,life:0.5,col:'rgba(130,50,200,',grow:1.5,alpha:0.6});}
  ctx.restore();
}
function drawEmitters(b,dt){
  for(const em of emitters){em.t+=dt;const u=em.u;if(!u.alive||!u.target){em.t=em.dur;continue;}
    if(em.kind==='breath'){const v=u.vis;const f=v.figs[0];if(!f)continue;const [wx,wy]=figWorld(u,f);const [x,y]=toS(wx,wy);const h=figH(u.st,y);const [tx,ty]=toS(u.target.x,u.target.y);const th=figH(u.target.st,ty);
      const face=tx>x?1:-1,mx=x+face*h*0.45,my=y-h*0.32-h*0.3;const dx=tx-mx,dy=ty-th*0.4-my,d=Math.hypot(dx,dy)||1;
      if(em.t>0.25){for(let i=0;i<3;i++){const sp=d*2.2*(0.8+Math.random()*0.4),a=(Math.random()-0.5)*0.35,c=Math.cos(a),s=Math.sin(a);fire(mx,my,(dx/d*c-dy/d*s)*sp,(dx/d*s+dy/d*c)*sp,3+Math.random()*3,0.4);}
        S.breath();if(Math.random()<dt*8)shake=Math.max(shake,2.5);}}}
  emitters=emitters.filter(e=>e.t<e.dur);
}
function drawFx(dt){
  // melee fx
  for(const f of fx){f.t+=dt;const k=f.t/f.max,a=1-k;ctx.save();
    if(f.kind==='arc'){ctx.translate(f.x,f.y);ctx.rotate(f.ang);if(f.glow)ctx.globalCompositeOperation='lighter';const sw=-1.3+k*2.4;
      for(let i=0;i<6;i++){const t0=sw-i*0.18;ctx.strokeStyle=`rgba(${f.col},${a*(1-i/6)*0.95})`;ctx.lineWidth=f.w*(1-i/7);ctx.beginPath();ctx.arc(-f.r*0.4,0,f.r,t0-0.18,t0);ctx.stroke();}}
    else if(f.kind==='thrust'){ctx.translate(f.x,f.y);ctx.rotate(f.ang);const L=f.len*(0.4+0.6*E.outCubic(Math.min(1,k*2)));const g=ctx.createLinearGradient(0,0,L,0);g.addColorStop(0,`rgba(${f.col},0)`);g.addColorStop(1,`rgba(${f.col},${a})`);ctx.strokeStyle=g;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(L*0.3,0);ctx.lineTo(L,0);ctx.stroke();}
    else if(f.kind==='bite'){ctx.translate(f.x,f.y);const c=1-E.outCubic(Math.min(1,k*2.5));ctx.fillStyle=`rgba(240,240,220,${a})`;ctx.strokeStyle=`rgba(80,20,20,${a})`;ctx.lineWidth=2;
      for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(0,s*f.r*0.55*c+s*2,f.r,f.r*0.35,0,s<0?Math.PI:0,s<0?2*Math.PI:Math.PI);ctx.fill();ctx.stroke();for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*f.r*0.35-3,s*f.r*0.55*c+s*2);ctx.lineTo(i*f.r*0.35,s*f.r*0.55*c+s*2-s*f.r*0.3);ctx.lineTo(i*f.r*0.35+3,s*f.r*0.55*c+s*2);ctx.fill();}}}
    else if(f.kind==='claw'){ctx.translate(f.x,f.y);ctx.rotate(-0.7);const g=E.outCubic(Math.min(1,k*3));ctx.strokeStyle=`rgba(${f.col},${a})`;ctx.lineCap='round';ctx.lineWidth=2.5;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*f.r*0.3,-f.r*0.6);ctx.lineTo(i*f.r*0.3,-f.r*0.6+f.r*1.2*g);ctx.stroke();}}
    else if(f.kind==='ring'){ctx.translate(f.x,f.y);ctx.scale(1,0.35);ctx.strokeStyle=`rgba(230,210,160,${a})`;ctx.lineWidth=4*a+1;ctx.beginPath();ctx.arc(0,0,f.r*(0.3+k*1.3),0,7);ctx.stroke();}
    ctx.restore();}
  fx=fx.filter(f=>f.t<f.max);
  for(const p of parts){p.life-=dt;p.vy+=p.grav*dt;p.vx*=1-Math.min(1,dt*p.drag);p.vy*=1-Math.min(1,dt*p.drag*(p.spark?0:1));p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.rot!=null)p.rot+=dt*12;
    const k=Math.max(0,p.life/p.max);
    if(p.spark){ctx.strokeStyle=p.col;ctx.globalAlpha=k;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*0.03,p.y-p.vy*0.03);ctx.stroke();ctx.globalAlpha=1;continue;}
    if(p.col==='bone'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=Math.min(1,k*2);ctx.fillStyle='#eee6d0';ctx.fillRect(-p.size*1.6,-p.size*0.4,p.size*3.2,p.size*0.8);ctx.beginPath();ctx.arc(-p.size*1.6,0,p.size*0.6,0,7);ctx.arc(p.size*1.6,0,p.size*0.6,0,7);ctx.fill();ctx.restore();continue;}
    if(p.col==='feather'){ctx.save();ctx.translate(p.x+Math.sin(p.rot)*4,p.y);ctx.rotate(Math.sin(p.rot*0.5));ctx.globalAlpha=k;ctx.fillStyle='#f3ead8';ctx.beginPath();ctx.ellipse(0,0,p.size*1.8,p.size*0.6,0,0,7);ctx.fill();ctx.restore();continue;}
    const sz=p.size*(1+(1-k)*(p.grow||0));
    if(p.col==='fire'){ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*2);g.addColorStop(0,`rgba(255,${180+75*k|0},${80*k|0},${0.9*k})`);g.addColorStop(1,'rgba(200,40,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,sz*2,0,7);ctx.fill();ctx.globalCompositeOperation='source-over';continue;}
    if(p.add)ctx.globalCompositeOperation='lighter';
    ctx.fillStyle=p.col+(k*(p.alpha??0.85))+')';ctx.beginPath();ctx.arc(p.x,p.y,sz,0,7);ctx.fill();
    if(p.soul){ctx.fillStyle=p.col+(k*0.5)+')';ctx.beginPath();ctx.arc(p.x+Math.sin(time*8+p.x)*3,p.y+sz*1.3,sz*0.6,0,7);ctx.fill();}
    ctx.globalCompositeOperation='source-over';}
  parts=parts.filter(p=>p.life>0);
  for(const t of texts)t.t+=dt;texts=texts.filter(t=>t.t<0.85);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  for(const t of texts){const k=t.t,sc=k<0.12?E.outBack(k/0.12)*1.2:1.2-Math.min(0.2,k-0.12);const fs=t.big?19:13.5;
    ctx.save();ctx.translate(t.x,t.y-k*32);ctx.scale(sc,sc);ctx.globalAlpha=k>0.55?1-(k-0.55)/0.3:1;ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;
    ctx.lineWidth=3.5;ctx.strokeStyle='#2a0a0a';ctx.strokeText(t.str,0,0);ctx.fillStyle=t.big?'#ffd000':t.col;ctx.fillText(t.str,0,0);ctx.restore();}
  for(const r of ripples){r.t+=dt;const k=r.t/0.5;ctx.strokeStyle=`rgba(255,80,80,${1-k})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,8+k*36,0,7);ctx.stroke();}
  ripples=ripples.filter(r=>r.t<0.5);
}

// ---------- loop ----------
let last=performance.now(),endTimer=0;
function frame(now){
  let dt=Math.min(0.05,(now-last)/1000);last=now;time+=dt;
  const b=G.battle;
  if(b&&G.phase==='battle'){for(let i=0;i<G.speed;i++){Core.step(b,dt);handleEvents(b);}
    if(b.over){endTimer+=dt;if(endTimer>1.4)endBattle();}}
  try{render(b,dt*(G.phase==='battle'?G.speed:1)**0.5);}catch(err){console.error(err);}
  requestAnimationFrame(frame);
}
function render(b,dt){
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.imageSmoothingQuality='high';
  drawBg();
  shake*=Math.pow(0.001,dt);const sx=(Math.random()-0.5)*shake,sy=(Math.random()-0.5)*shake;ctx.translate(sx,sy);
  if(b){drawUnits(b,dt);drawEmitters(b,dt);for(const p of b.proj)drawProj(p,dt);drawFx(dt);drawStackUI(b,dt);
    $('pCount').textContent=b.units.filter(u=>u.alive&&u.side==='p').reduce((a,u)=>a+u.count,0);
    $('eCount').textContent=b.units.filter(u=>u.alive&&u.side==='e').reduce((a,u)=>a+u.count,0);}
  else drawFx(dt);
}

// ---------- input ----------
function pickEnemyAt(cx,cy){const b=G.battle;let best=null,bd=1e9;
  for(const u of b.units){if(!u.alive||u.side!=='e'||!u.vis)continue;const [x,y,top]=stackAnchor(u);const h=y-top;
    const d=Math.hypot(cx-x,(cy-(y-h*0.5))*0.9);if(d<Math.max(h*1.1,34)&&d<bd){bd=d;best=u;}}return best;}
cv.addEventListener('pointerdown',e=>{
  const b=G.battle;if(!b||(G.phase!=='battle'&&G.phase!=='countdown'))return;
  const best=pickEnemyAt(e.clientX,e.clientY);
  if(best){b.focus=best;best.vis.badge=0.6;ripples.push({x:e.clientX,y:e.clientY,t:0});S.click();$('hint').classList.add('hidden');G.focusHintShown=true;}
});
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};
const mb=$('muteBtn');const setMB=()=>mb.textContent=SFX.muted?'🔇':'🔊';setMB();
mb.onclick=()=>{SFX.init();SFX.setMuted(!SFX.muted);setMB();S.click();};

// ---------- flow ----------
function banner(txt,dur=900){const el=$('banner');el.textContent=txt;el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(banner.t);banner.t=setTimeout(()=>el.classList.add('hidden'),dur);}
function show(id,on){$(id).classList.toggle('show',on);}
function startRun(){SFX.init();SFX.startMusic();S.click();G.stage=1;G.army=[];G.speed=1;$('speedBtn').textContent='1×';show('title',false);show('result',false);openDraft();}
function setupPreview(){G.battle=Core.createBattle(G.army,G.enemies);$('stageNum').textContent=G.stage;dying=[];emitters=[];}
const statRow=(k,v)=>`<div><span>${k}</span><b>${v}</b></div>`;
function openDraft(){
  G.phase='draft';G.enemies=Core.makeEnemies(G.stage);setupPreview();
  $('draftTitle').textContent=`第 ${G.stage} 关`;
  $('draftSub').textContent=G.army.length>=MAXS?'部队已满（7支）· 选择增援已有部队':'选择一支援军加入你的部队';
  let offers=[Core.makeOffer(G.stage,G.army),Core.makeOffer(G.stage,G.army)];
  for(let i=0;i<6&&offers[1].type===offers[0].type;i++)offers[1]=Core.makeOffer(G.stage,G.army);
  const cards=$('cards');cards.innerHTML='';
  offers.forEach(o=>{const st=U[o.type],el=document.createElement('div');el.className='card';
    const owned=G.army.find(a=>a.type===o.type);
    const tags=[st.shots?'<span class="tag r">远程</span>':'<span class="tag m">近战</span>',st.fly?'<span class="tag f">飞行</span>':'',owned?'<span class="tag up">增援 +'+o.count+'</span>':''].join('');
    el.innerHTML=`<div class="art"><span class="tier">${'★'.repeat(st.tier)}</span><img src="${sprSrc(o.type)}"><span class="cnt">×${o.count}</span></div>
      <div class="nm">${o.count} ${st.n}</div><div class="tags">${tags}</div>
      <div class="stats">${statRow('攻击',st.a)+statRow('防御',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>`;
    el.onclick=()=>choose(o,el);cards.appendChild(el);});
  const s=$('armyStrip');s.innerHTML='';for(let i=0;i<MAXS;i++){const a=G.army[i];s.innerHTML+=a?`<div class="mini"><img src="${sprSrc(a.type)}"><b>${a.count}</b></div>`:'<div class="mini empty"></div>';}
  show('draft',true);
}
function choose(o,el){
  if(G.phase!=='draft')return;G.phase='chosen';S.pick();
  [...$('cards').children].forEach(c=>c.classList.add(c===el?'chosen':'gone'));
  const ex=G.army.find(a=>a.type===o.type);if(ex)ex.count+=o.count;else G.army.push({...o});
  setTimeout(()=>{show('draft',false);setupPreview();
    G.battle.units.forEach(u=>{const v=vis(u);v.spawn=u.side==='p'&&u.type!==o.type?1:-Math.random()*0.4-(u.type===o.type?0.3:0);});
    setTimeout(()=>{for(const u of G.battle.units){const [x,y]=toS(u.x,u.y);dust(x,y,8,1.3);}S.spawn();},250);
    countdown();},450);
}
function countdown(){G.phase='countdown';banner(`第 ${G.stage} 关`,900);
  [['3',1000],['2',1500],['1',2000]].forEach(([t,d])=>setTimeout(()=>{banner(t,600);S.tick();},d));
  setTimeout(()=>{banner('战斗！',700);S.go();G.phase='battle';endTimer=0;if(!G.focusHintShown)$('hint').classList.remove('hidden');},2500);}
function endBattle(){
  const b=G.battle;if(G.phase!=='battle')return;G.phase='result';$('hint').classList.add('hidden');
  const win=b.over==='win';const pl=b.units.filter(u=>u.side==='p');
  win?S.win():S.lose();
  $('resTitle').textContent=win?'胜利！':'战败';$('resTitle').className='res-title'+(win?'':' lose');
  $('resList').innerHTML=pl.map((u,i)=>`<div class="res-unit ${u.alive?'':'dead'}" style="animation-delay:${i*0.07}s"><img src="${sprSrc(u.type)}"><div class="c">${u.alive?'×'+u.count:'阵亡'}</div><div class="l">${u.start-u.count>0?'-'+(u.start-u.count):''}</div><div class="n">${u.st.n}</div></div>`).join('');
  if(win){G.army=pl.filter(u=>u.alive).map(u=>({type:u.type,count:u.count}));
    $('resSub').textContent=`第 ${G.stage} 关已攻克 · 幸存部队将继续出征`;$('resBtn').textContent='征召援军 →';
    $('resBtn').onclick=()=>{S.click();show('result',false);G.stage++;openDraft();};
    for(let i=0;i<30;i++)setTimeout(()=>puff(Math.random()*view.cw,view.ch*0.3*Math.random(),5,['rgba(255,215,90,','rgba(120,200,255,','rgba(255,120,160,'][i%3],120,5,1,60),i*40);
  } else {$('resSub').textContent=`止步第 ${G.stage} 关 · 共攻克 ${G.stage-1} 关`;$('resBtn').textContent='重新开始';$('resBtn').onclick=()=>{show('result',false);startRun();};}
  setTimeout(()=>show('result',true),win?200:500);
}
$('startBtn').onclick=startRun;

// ---------- boot ----------
Promise.all([load('assets/arena.jpg').then(i=>bg=i),...names.map(t=>load(sprSrc(t)).then(i=>buildRig(t,i)))]).then(()=>{
  resize();
  $('titleHeroes').innerHTML=['p_swordsman','p_angel','p_cavalier'].map(s=>`<img src="assets/${s}.png">`).join('');
  G.enemies=Core.makeEnemies(1);G.battle=Core.createBattle([{type:'pikeman',count:5},{type:'crossbowman',count:3}],G.enemies);
  requestAnimationFrame(frame);
  if(DEBUG){window.__G=G;window.__dbg={pick:()=>G.phase==='draft'&&$('cards').children[0].click(),tap:u=>{const [x,y,top]=stackAnchor(u);return [x,(y+top)/2];}};}
});
})();

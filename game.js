// build r4-strategic
(()=>{
const {U,W,H,MAXS,FX0,FX1,FY0,FY1}=Core;
const $=id=>document.getElementById(id);
const cv=$('cv');let ctx=cv.getContext('2d');
const S=SFX.S;
const names=Object.keys(U);
const sprSrc=t=>U[t].rig?'assets/p_'+U[t].art+'.png':'assets/c/'+t+'.png';
const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});
let bg;const RIG={};

// ---------- rig building: body (torso + back/front leg) + separately-masked weapon layer ----------
let RIGDEF={};
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function whiten(c){const o=mk(c.width,c.height),x=o.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height);return o;}
function scaled(img,PW,PH){const mid=mk(img.width/2,img.height/2);mid.getContext('2d').drawImage(img,0,0,mid.width,mid.height);const c=mk(PW,PH),x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(mid,0,0,PW,PH);return c;}
function buildRig(t,body,wpn,wing){
  const st=U[t],PH=200,k=PH/body.height,PW=Math.round(body.width*k),D=RIGDEF[st.rig?st.art:t]||{piv:[.5,.5],tip:[.9,.45],anim:'none'};
  const full=scaled(body,PW,PH),fx=full.getContext('2d'),W=wpn?scaled(wpn,PW,PH):mk(PW,PH),WG=wing?scaled(wing,PW,PH):null;
  const legFrac=st.quad?0.3:0.28,split=Math.round(PH*(1-legFrac)),ov=6;
  const data=fx.getImageData(0,split,PW,PH-split).data;let sx=0,sw=0,minx=PW,maxx=0;
  for(let y=0;y<PH-split;y++)for(let x=0;x<PW;x++){const a=data[(y*PW+x)*4+3];if(a>80){sx+=x*a;sw+=a;minx=Math.min(minx,x);maxx=Math.max(maxx,x);}}
  const midX=Math.round(sw?sx/sw:PW/2);
  const top=mk(PW,split+ov);top.getContext('2d').drawImage(full,0,0);
  const lb=mk(midX,PH-split),lf=mk(PW-midX,PH-split);
  lb.getContext('2d').drawImage(full,0,split,midX,PH-split,0,0,midX,PH-split);
  lf.getContext('2d').drawImage(full,midX,split,PW-midX,PH-split,0,0,PW-midX,PH-split);
  const P=(p)=>p?[p[0]*PW,p[1]*PH]:null;
  RIG[t]={WG,wWG:WG?whiten(WG):null,wroot:P(D.wroot),PW,PH,split,midX,footX:PW/2,top,lb,lf,W,wtop:whiten(top),wlb:whiten(lb),wlf:whiten(lf),wW:whiten(W),footW:(maxx-minx)||PW*0.5,
    def:D,piv:P(D.piv),tip:P(D.tip),bowTop:P(D.bowTop),bowBot:P(D.bowBot),hand:P(D.hand),nat:1};
}
const rigP={};
function ensureRig(t){if(rigP[t])return rigP[t];const st=U[t];
  rigP[t]=st.rig?Promise.all([load('assets/p_'+st.art+'_body.png'),load('assets/p_'+st.art+'_wpn.png'),RIGDEF[st.art]&&RIGDEF[st.art].hasWing?load('assets/p_'+st.art+'_wing.png'):null]).then(([b,w,wg])=>buildRig(t,b,w,wg))
    :load('assets/c/'+t+'.png').then(b=>buildRig(t,b,null,null));return rigP[t];}
const ensureRigs=ts=>Promise.all([...new Set(ts)].map(ensureRig));
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

const E={outBack:t=>{const c=1.70158;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2);},outCubic:t=>1-Math.pow(1-t,3),inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};

// ---------- unit geometry (grid footprint) ----------
function vis(u){if(!u.vis)u.vis={spawn:0,badge:0,ghost:1,lastCount:u.count,prevS:0,deadT:0,ph:Math.random()*6};return u.vis;}
// screen-space footprint (portrait rotates the board: world x -> screen up)
function fpS(u){return view.portrait?[u.fh*Core.CH,u.fw*Core.CW]:[u.fw*Core.CW,u.fh*Core.CH];}
function unitH(u){const R=RIG[u.type];const [sw,sh]=fpS(u);const big=u.fw===2&&u.fh===2,wide=sw>Core.CW*1.5;
  const capH=big?Core.CH*2.9:wide?Core.CH*2.15:Core.CH*(view.portrait&&u.fw===2?2.0:1.75);
  return Math.min(sw*(view.portrait&&!big&&u.fw===1?1.15:0.98)*R.PH/R.PW,capH)*view.s;}
function footS(u){const [x,y]=toS(u.x,u.y);return [x,y+fpS(u)[1]*0.3*view.s];}
// ---------- particles & fx ----------
function P(o){parts.push(Object.assign({vx:0,vy:0,grav:0,drag:2.5,size:4,life:0.5,add:false,shrink:false},o,{max:o.life||0.5}));}
function dust(x,y,n,scale=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(20+Math.random()*50)*scale;P({x:x+(Math.random()-0.5)*6*scale,y:y-2,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.35-8*scale,size:(2.5+Math.random()*3.5)*scale,life:0.45+Math.random()*0.35,col:'rgba(196,170,120,',grow:1.8,alpha:0.55});}}
function sparks(x,y,col,n=6,sp=1){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(90+Math.random()*180)*sp;P({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,size:2,life:0.18+Math.random()*0.15,col,spark:1,grav:500,drag:1});}}
function puff(x,y,n,col,spd,size,life,rise=-30,alpha=0.8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=spd*(0.3+Math.random()*0.7);P({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7+rise,size:size*(0.6+Math.random()*0.8),life:life*(0.6+Math.random()*0.6),col,grow:1.6,alpha});}}
function fire(x,y,vx,vy,size,life){P({x,y,vx,vy,size,life,col:'fire',grow:2.2,add:true,drag:1.2,grav:-60});}
function dmgText(x,y,str,col,big){texts.push({x:x+(Math.random()-0.5)*14,y,str,col,t:0,big});}

// ---------- simulation event -> visuals & sound ----------
function frontPos(u){const [x,y]=footS(u);return [x,y,unitH(u)];}
function handleEvents(b){
  for(const e of b.events){
    const u=e.u;
    if(e.k==='wind'){
      if(u.st.fx==='breath'){S.roar();emitters.push({u,t:0,dur:1.0,kind:'breath'});}
      if(u.st.proj==='arrow'||u.st.proj==='bolt'){}
      if(u.st.fx==='charge'){S.gallop();}
    } else if(e.k==='shoot'){
      const p=u.st.proj;(({arrow:S.bow,bolt:S.bolt,bolt2:S.magic,holy:S.magic,death:S.dark,fire:S.fireball,axe:S.slash,rock:S.heavy})[p]||S.bow)();
      const [x,y,h]=frontPos(u);if(p==='holy')puff(x,y-h*0.8,6,'rgba(150,210,255,',40,3,0.4,-20);if(p==='death')puff(x,y-h*0.8,6,'rgba(170,80,255,',40,3,0.4,-20);if(p==='fire')puff(x,y-h*0.6,5,'rgba(255,150,40,',40,3,0.3,-20);
    } else if(e.k==='strike'){strikeFx(u,e.t);if(e.retal){const [x,y,h]=frontPos(u);texts.push({x,y:y-h*1.05,str:'反击',col:'#ffe8a0',t:0,big:false,pop:1});}}
    else if(e.k==='cloud'){const [x,y,h]=frontPos(e.t);const r=Core.CW*view.s*1.4;for(let i=0;i<26;i++){const a=Math.random()*6.28,d=Math.random()*r;P({x:x+Math.cos(a)*d,y:y-h*0.3+Math.sin(a)*d*0.6,vx:Math.cos(a)*20,vy:-15,size:6+Math.random()*8,life:0.9,col:'rgba(120,60,170,',grow:1.4,alpha:0.5});}S.dark();}
    else if(e.k==='pop'){const [x,y,h]=frontPos(u);texts.push({x,y:y-h*1.15,str:e.str,col:e.col,t:0,big:true,pop:1});}
    else if(e.k==='zap'){const [x,y,h]=frontPos(u);S.magic();shake=Math.max(shake,4);for(let i=0;i<3;i++)fx.push({kind:'bolt',t:0,max:0.3,x,y:y-h*0.5,h,seed:Math.random()});sparks(x,y-h*0.5,'#cfeaff',10,1.2);}
    else if(e.k==='drain'){const [x,y,h]=frontPos(u);for(let i=0;i<8;i++)P({x:x+(Math.random()-0.5)*h*0.6,y:y-h*Math.random(),vx:0,vy:-40,size:3,life:0.6,col:'rgba(255,40,60,',add:true});}
    else if(e.k==='regen'){const [x,y,h]=frontPos(u);texts.push({x,y:y-h*1.1,str:'再生',col:'#9dff8a',t:0,big:false,pop:1});for(let i=0;i<8;i++)P({x:x+(Math.random()-0.5)*h*0.5,y:y-h*Math.random()*0.8,vx:0,vy:-30,size:2.5,life:0.7,col:'rgba(120,255,120,',add:true});}
    else if(e.k==='fireball'){const [x,y,h]=frontPos(e.t);S.fireball();for(let i=0;i<30;i++){const a=Math.random()*6.28,d=Math.random()*Core.CW*view.s*1.2;fire(x+Math.cos(a)*d,y-h*0.3+Math.sin(a)*d*0.5,Math.cos(a)*40,-30,5,0.5);}shake=Math.max(shake,4);}
    else if(e.k==='breath2'){const [x,y,h]=frontPos(e.t);for(let i=0;i<14;i++)fire(x,y-h*0.4,(Math.random()-0.5)*120,(Math.random()-0.7)*90,4,0.45);}
    else if(e.k==='hit'){
      const [sx,sy,h]=frontPos(u),v=vis(u);
      const src=e.src;if(src){const dx=u.x-src.x,dy=u.y-src.y,d=Math.hypot(dx,dy)||1;v.kx=dx/d;v.ky=dy/d;}
      dmgText(sx,sy-h*1.25,'-'+e.dmg,u.side==='p'?'#ff9a9a':'#fff3b0',e.big);
      if(e.killed>0){v.badge=1;}
      if(!src||!src.st.proj||src.st.shots<=0)S.hit();
      if(e.big)shake=Math.max(shake,7);
      if(e.killed>0)S.death();
      if(e.dead)shake=Math.max(shake,4);
    } else if(e.k==='impact'){const p=e.p,[x,y]=toS(p.x,p.y),h=unitH(p.t)*0.35;
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
    case 'claw':S.slash();add({kind:'claw',max:0.25,x:tx,y:ty-th*0.5,r:th*0.4,col:'255,120,80'});break;
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
// ---- weapon / part pose from the unit's attack timeline (angles are canonical right-facing) ----
const easeIn=t=>t*t;
function weaponPose(u){
  const R=RIG[u.type],D=R.def,A=D.anim;let ang=0,tx=0,ty=0,draw=0,jaw=0;
  const wt=u.wt||0.36,w=u.wind>0?E.outCubic(1-u.wind/wt):0,s=u.atkT>0?1-u.atkT:1,striking=u.atkT>0;
  const H=R.PH;
  if(A==='none'){}
  else if(A==='swing'||A==='swipe'){
    if(u.wind>0)ang=D.a*w;
    else if(striking){ang=s<0.28?D.a+(D.b-D.a)*easeIn(s/0.28):D.b*(1-E.inOut((s-0.28)/0.72));}
  } else if(A==='spear'){
    if(u.wind>0){ang=D.a*w;tx=-D.th*0.35*w;}
    else if(striking){const th=s<0.2?-0.35+1.35*E.outCubic(s/0.2):1-E.inOut((s-0.2)/0.8);tx=D.th*th;ang=D.a*(s<0.55?1:1-E.inOut((s-0.55)/0.45));}
  } else if(A==='raise'){
    if(u.wind>0){ang=-0.45*w;ty=-0.1*w;}
    else if(striking){const k=s<0.25?E.outCubic(s/0.25):1-E.inOut((s-0.25)/0.75);ang=-0.45+0.85*k;ty=-0.1+0.12*k;if(s>0.25){ang=0.4*(1-E.inOut((s-0.25)/0.75));ty=0.02*(1-(s-0.25)/0.75);}}
  } else if(A==='recoil'){
    if(u.wind>0){ang=-0.06*w;}
    else if(striking){const k=1-E.outCubic(s);ang=-0.45*k*(s<0.1?s/0.1:1);tx=-0.12*k;}
  } else if(A==='bow'){
    if(u.wind>0)draw=w;else if(striking){ang=-0.12*(1-E.outCubic(s));}
  } else if(A==='jaw'){
    if(u.wind>0)jaw=w;else if(striking)jaw=s<0.6?1:1-E.inOut((s-0.6)/0.4);ang=D.a*jaw;
  }
  return {ang:ang*R.nat,tx:tx*H,ty:ty*H,draw,jaw,s,striking};
}
// pose: {lift,bob,lean,legA,sx,sy,rot,flash,alpha,wp}
function drawRig(t,x,y,h,flip,p){
  const R=RIG[t],k=h/R.PH;
  ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(x,y-p.lift);if(flip)ctx.scale(-1,1);if(p.rot)ctx.rotate(p.rot);ctx.scale(p.sx,p.sy);
  const ox=-R.footX*k,hip=(R.split-R.PH)*k;
  for(let pass=0;pass<2;pass++){
    if(pass===1){if(p.flash<0.03)break;ctx.globalAlpha=p.alpha*p.flash;}
    const lb=pass?R.wlb:R.lb,lf=pass?R.wlf:R.lf,top=pass?R.wtop:R.top,W=pass?R.wW:R.W;
    ctx.save();ctx.translate(ox+R.midX*k,hip);ctx.transform(1,0,p.legA,1,0,0);ctx.drawImage(lb,-R.midX*k,0,R.midX*k,(R.PH-R.split)*k);ctx.restore();
    ctx.save();ctx.translate(ox+R.midX*k,hip);ctx.transform(1,0,-p.legA*0.9,1,0,0);ctx.drawImage(lf,0,0,(R.PW-R.midX)*k,(R.PH-R.split)*k);ctx.restore();
    ctx.save();ctx.translate(ox+R.midX*k,hip-p.bob);ctx.rotate(p.lean);ctx.scale(1,p.tsy||1);
    if(R.WG){const WG=pass?R.wWG:R.WG,ry=(R.wroot[1]-R.split)*k;ctx.save();ctx.translate(0,ry);ctx.scale(1,p.wing);ctx.transform(1,0,(1-p.wing)*0.4*R.nat,1,0,0);ctx.translate(0,-ry);ctx.drawImage(WG,-R.midX*k,-R.split*k,R.PW*k,R.PH*k);ctx.restore();}
    ctx.drawImage(top,-R.midX*k,-R.split*k,R.PW*k,(R.split+6)*k);
    // weapon layer: pivot at shoulder/hand, in body-local space
    const wp=p.wp,px=(R.piv[0]-R.midX)*k,py=(R.piv[1]-R.split)*k;
    ctx.save();ctx.translate(px,py);ctx.rotate(wp.ang);
    let dx=wp.tx*k*R.nat,dy=wp.ty*k;
    if(R.def.anim==='spear'||R.def.anim==='recoil'){const vx=R.tip[0]-R.piv[0],vy=R.tip[1]-R.piv[1],d=Math.hypot(vx,vy)||1;dx=vx/d*wp.tx*k;dy=vy/d*wp.tx*k+wp.ty*k;}
    ctx.translate(dx,dy);
    ctx.drawImage(W,-R.piv[0]*k,-R.piv[1]*k,R.PW*k,R.PH*k);
    if(pass===0&&R.def.anim==='bow'&&wp.draw>0){
      const T=R.bowTop,B=R.bowBot,hx=R.hand[0],hy=R.hand[1];const mx=(T[0]+B[0])/2,my=(T[1]+B[1])/2;
      const qx=mx+(hx-mx)*wp.draw*0.9,qy=my+(hy-my)*wp.draw*0.9;
      ctx.translate(-R.piv[0]*k,-R.piv[1]*k);ctx.strokeStyle='rgba(235,225,195,.85)';ctx.lineWidth=Math.max(0.8,1.1*k);
      ctx.beginPath();ctx.moveTo(T[0]*k,T[1]*k);ctx.lineTo(qx*k,qy*k);ctx.lineTo(B[0]*k,B[1]*k);ctx.stroke();
      ctx.strokeStyle='#6b4423';ctx.lineWidth=Math.max(1,1.8*k);ctx.beginPath();ctx.moveTo(qx*k,qy*k);ctx.lineTo((R.tip[0]+8)*k,R.tip[1]*k);ctx.stroke();
      ctx.fillStyle='#ddd';ctx.beginPath();ctx.moveTo((R.tip[0]+14)*k,R.tip[1]*k);ctx.lineTo((R.tip[0]+4)*k,(R.tip[1]-4)*k);ctx.lineTo((R.tip[0]+4)*k,(R.tip[1]+4)*k);ctx.fill();}
    if(pass===0&&R.def.anim==='raise'&&wp.ty<-1){const g=ctx.createRadialGradient(0,0,0,0,0,1);}
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// screen position of a rig point (sprite px) for a live unit, ignoring small body motion
function rigPointS(u,pt){const R=RIG[u.type],h=unitH(u),k=h/R.PH,[x,y]=footS(u),lift=u.st.fly?h*0.22:0;const flip=(u.face||R.nat)!==R.nat;
  return [x+(pt[0]-R.footX)*k*(flip?-1:1),y-lift+(pt[1]-R.PH)*k];}
let WALK='hop';
// Walk/locomotion. 'hop' = Clash-Royale style eased bounce + contact squash + forward lean + step rock (+ tiny leg swing);
// quadrupeds rock (pitch) in a gallop; flyers hover and flap the separated wing layer.
function unitPose(u,h,dt){
  const st=u.st,v=u.vis,R=RIG[u.type];const p={lift:0,bob:0,lean:0,legA:0,sx:1,sy:1,rot:0,flash:u.hitT*u.hitT*0.75,alpha:1,dx:0,wing:1,sway:0};
  const target=u.moving&&u.alive?1:0;v.mv=(v.mv??0)+(target-(v.mv??0))*Math.min(1,dt*9);const mv=v.mv;
  const nat=R.nat;
  if(!st.fly){
    if(st.quad){
      const ph=u.walkT*Math.PI*2*0.9+v.ph;const s=Math.sin(ph);
      p.bob=(0.5-0.5*Math.cos(ph*2))*h*0.05*mv;               // smooth double bounce per stride
      p.rot=0.045*s*mv*nat;                                     // body rocking (pitch) gallop
      p.legA=(WALK==='legs'?0.22:0.12)*Math.sin(ph+0.6)*mv;    // back/front pairs swing in opposition
      const c=Math.pow(0.5+0.5*Math.cos(ph*2),3);p.sy+=(-0.05*c+0.02)*mv;p.sx+=0.04*c*mv;
      p.lean=0.03*mv*nat;
      if(v.prevC!=null&&c>0.92&&v.prevC<=0.92)v.step=1;v.prevC=c;
    } else {
      const ph=u.walkT*Math.PI*2+v.ph;const s=Math.sin(ph),a=Math.abs(s);
      const air=Math.pow(a,0.8);                                // 0 at foot contact, 1 at apex (2 hops per cell)
      p.bob=air*h*0.065*mv;
      const c=Math.pow(1-a,4);                                  // contact squash
      p.sy+=(-0.08*c+0.035*air)*mv;p.sx+=(0.07*c-0.015*air)*mv;
      p.lean=0.07*mv*nat;p.rot=0.035*s*mv;                      // forward lean + rock onto the stepping foot
      p.legA=(WALK==='legs'?0.22:0.12)*s*mv;                    // tiny leg swing (no jitter)
      p.sway=0.07*s*mv;                                         // weapon arm sway
      if(v.prevC!=null&&c>0.85&&v.prevC<=0.85)v.step=1;v.prevC=c;
    }
    const br=Math.sin(time*2.6+v.ph)*0.016*(1-mv);p.sy+=br;p.sx-=br*0.5;
  } else {
    const fr=mv>0.3?11:7;const f=Math.sin(time*fr+v.ph);
    p.lift=h*0.2+(0.5+0.5*f)*h*0.06;p.wing=0.5+0.55*(0.5-0.5*Math.cos(time*fr+v.ph))+0.0;p.lean=0.08*mv*nat;p.legA=0.06*Math.sin(time*2+v.ph);
    p.sy+=0.02*f;
  }
  p.wp=weaponPose(u);p.wp.ang+=p.sway*nat;
  const w=u.wind>0?E.outCubic(1-u.wind/(u.wt||0.36)):0,ks=u.atkT>0?Math.sin(Math.min(1,u.atkT)*Math.PI*0.5):0;
  const nw=R.def.anim==='none';p.lean+=(-(nw?0.1:0.05)*w+(nw?0.16:0.07)*ks)*nat;p.dx=(-(nw?0.05:0.02)*w+(nw?0.12:0.04)*ks)*h;if(nw&&ks>0){p.sx+=0.05*ks;p.sy-=0.04*ks;}
  if(u.hitT>0){p.dx-=h*0.06*u.hitT;p.sx+=0.05*u.hitT;p.sy-=0.05*u.hitT;}
  return p;
}
function drawGrid(b){
  const C=Core,s=view.s;ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1;
  for(let i=0;i<=C.GC;i++){const a=toS(C.GX0+i*C.CW,C.GY0),bb=toS(C.GX0+i*C.CW,C.GY0+C.GR*C.CH);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...bb);ctx.stroke();}
  for(let j=0;j<=C.GR;j++){const a=toS(C.GX0,C.GY0+j*C.CH),bb=toS(C.GX0+C.GC*C.CW,C.GY0+j*C.CH);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...bb);ctx.stroke();}
  if(b)for(const u of b.units){if(!u.alive)continue;
    const a=toS(C.GX0+u.ax*C.CW,C.GY0+u.ay*C.CH),c=toS(C.GX0+(u.ax+u.fw)*C.CW,C.GY0+(u.ay+u.fh)*C.CH);
    const x=Math.min(a[0],c[0]),y=Math.min(a[1],c[1]),w=Math.abs(c[0]-a[0]),h=Math.abs(c[1]-a[1]);
    ctx.fillStyle=u.side==='p'?(u.hold?'rgba(255,200,60,.22)':'rgba(70,150,255,.18)'):'rgba(255,70,70,.16)';rr(x+1.5,y+1.5,w-3,h-3,4);ctx.fill();
    ctx.strokeStyle=u.side==='p'?(u.hold?'rgba(255,210,80,.55)':'rgba(120,190,255,.35)'):'rgba(255,120,120,.3)';ctx.lineWidth=1.2;ctx.stroke();}
  ctx.restore();
}
function drawUnits(b,dt){
  const list=[];
  for(const u of b.units){
    const v=vis(u);v.spawn=Math.min(1,v.spawn+dt*2.4);
    if(!u.alive){v.deadT+=dt;if(v.deadT>0.9)continue;}
    if(u.alive&&u.count<v.lastCount){const [x,y]=footS(u),h=unitH(u);
      P({x,y:y-h*0.6,vx:(Math.random()-0.5)*10,vy:-50,size:h*0.06+2,life:1,col:u.side==='p'?'rgba(170,220,255,':'rgba(190,110,255,',add:true,grow:0.6,drag:0.5,alpha:0.8,soul:1});}
    v.lastCount=u.count;
    let [x,y]=footS(u);const h=unitH(u),R=RIG[u.type];
    const sp=E.outBack(Math.max(0,Math.min(1,v.spawn)));if(sp<=0.01)continue;
    const p=unitPose(u,h,dt);const face=u.face||R.nat;const flip=face!==R.nat;
    x+=face*p.dx;
    if(v.step&&!u.st.fly){v.step=0;if(Math.random()<(u.st.quad?0.8:0.5))dust(x-face*h*0.15,y,u.st.quad?3:2,h/50);u.st.quad?S.gallop():S.step();}
    if(u.moving&&u.st.fx==='charge'&&Math.random()<dt*14)dust(x-face*h*0.4,y,2,h/40);
    if(u.type==='angel'&&u.alive&&Math.random()<dt*6){const [tx,ty]=rigPointS(u,R.tip);fire(tx,ty,(Math.random()-0.5)*20,-20,2.5,0.5);}
    if(u.alive&&RIG[u.type].def.anim==='raise'&&u.wind>0&&Math.random()<dt*30){const [tx,ty]=rigPointS(u,R.tip);P({x:tx+(Math.random()-0.5)*8,y:ty-h*0.08+(Math.random()-0.5)*8,vx:0,vy:-20,size:2.2,life:0.4,col:u.type==='monk'?'rgba(150,210,255,':u.type==='lich'?'rgba(180,90,255,':'rgba(255,150,40,',add:true});}
    if(!u.alive){const k=Math.min(1,v.deadT/0.5);p.rot=(v.fell||(v.fell=Math.random()<0.5?-1:1))*E.inOut(k)*1.2;p.flash=Math.max(0,1-v.deadT*5);p.alpha=1-Math.max(0,(v.deadT-0.35)/0.5);p.lift*=1-k;
      if(!v.poof&&v.deadT>0.35){v.poof=1;puff(x,y-h*0.3,10,'rgba(235,235,240,',70,h*0.07,0.6,-25,0.75);P({x,y:y-h*0.6,vx:0,vy:-55,size:h*0.1,life:1.1,col:u.side==='p'?'rgba(170,220,255,':'rgba(190,110,255,',add:true,grow:0.6,drag:0.5,alpha:0.8,soul:1});
        if(u.type==='skeleton')for(let i=0;i<6;i++)P({x,y:y-h*0.4,vx:(Math.random()-0.5)*150,vy:-60-Math.random()*90,size:2.4,life:0.7,col:'bone',grav:480,drag:0.4,rot:Math.random()*6});}}
    const fw=R.footW/R.PH*h*0.6*(u.st.fly?0.75:1);
    list.push({y,draw:()=>drawRig(u.type,x,y,h*sp,flip,p),sh:()=>shadowAt(x,y,Math.max(fw,fpS(u)[0]*view.s*0.38)*sp,u.st.fly?0.26:0.42*p.alpha)});
  }
  for(const it of list)it.sh();
  list.sort((a,b)=>a.y-b.y);for(const it of list)it.draw();
}
function stackAnchor(u){const [x,y]=footS(u);const h=unitH(u);return [x,y,y-h*(u.st.fly?1.22:1)];}
function drawStackUI(b,dt){
  for(const u of b.units){if(!u.alive)continue;const v=u.vis;if(!v)continue;const [x,y,top]=stackAnchor(u);const h=unitH(u),hh=Math.min(h,Core.CH*1.75*view.s);
    if(b.focus===u){ctx.save();ctx.translate(x,y);ctx.scale(1,0.38);ctx.rotate(time*2);ctx.strokeStyle='rgba(255,50,50,.95)';ctx.lineWidth=3.5;ctx.setLineDash([9,6]);ctx.beginPath();ctx.arc(0,0,fpS(u)[0]*view.s*0.55+Math.sin(time*6)*2,0,7);ctx.stroke();ctx.restore();}
    const bw=Math.max(30,Math.min(fpS(u)[0]*view.s*0.8,hh*0.9)),bh=Math.max(4,hh*0.07),by=top-bh-4;
    const f=Math.max(0,((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp));v.ghost+=(f-v.ghost)*Math.min(1,dt*3);if(v.ghost<f)v.ghost=f;
    ctx.fillStyle='rgba(10,10,20,.75)';rr(x-bw/2-1.5,by-1.5,bw+3,bh+3,3);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(x-bw/2,by,bw*v.ghost,bh);ctx.fillStyle=u.side==='p'?'#3fa9ff':'#ff4a4a';ctx.fillRect(x-bw/2,by,bw*f,bh);
    ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-bw/2,by,bw*f,bh*0.4);
    v.badge=Math.max(0,v.badge-dt*3);const bs=1+E.outCubic(v.badge)*0.45,fs=Math.max(11,hh*0.24),txt=String(u.count);
    ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;const tw=Math.max(fs*1.15,ctx.measureText(txt).width+fs*0.7);
    ctx.save();ctx.translate(x-bw/2-tw*0.35,by+bh/2);ctx.scale(bs,bs);ctx.fillStyle='#0b1022';rr(-tw/2-1.5,-fs*0.62-1.5,tw+3,fs*1.24+3,fs*0.5);ctx.fill();
    const g=ctx.createLinearGradient(0,-fs*0.6,0,fs*0.6);g.addColorStop(0,u.side==='p'?'#6cc4ff':'#ff7d7d');g.addColorStop(1,u.side==='p'?'#1d63c9':'#b81f2a');
    ctx.fillStyle=v.badge>0.05?'#fff':g;rr(-tw/2,-fs*0.62,tw,fs*1.24,fs*0.5);ctx.fill();ctx.fillStyle=v.badge>0.05?'#c00':'#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,fs*0.06);ctx.restore();
    if(u.hold){// hold (待命) icon: amber shield with pause bars, right of the bar
      const ix=x+bw/2+fs*0.75,iy=by+bh/2,r=fs*0.62;ctx.save();ctx.translate(ix,iy);ctx.fillStyle='#0b1022';ctx.beginPath();ctx.arc(0,0,r+1.5,0,7);ctx.fill();
      const gg=ctx.createLinearGradient(0,-r,0,r);gg.addColorStop(0,'#ffe07a');gg.addColorStop(1,'#e08a0c');ctx.fillStyle=gg;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
      ctx.fillStyle='#3a2200';ctx.fillRect(-r*0.42,-r*0.45,r*0.28,r*0.9);ctx.fillRect(r*0.14,-r*0.45,r*0.28,r*0.9);ctx.restore();
      ctx.font=`900 ${Math.max(10,fs*0.7)}px "Noto Sans CJK SC",sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#3a2200';ctx.strokeText('待命',x,y+fs*0.9);ctx.fillStyle='#ffd75e';ctx.fillText('待命',x,y+fs*0.9);}
    if(b.focus===u){const ay=by-8-Math.abs(Math.sin(time*5))*7;ctx.save();ctx.translate(x,ay);ctx.fillStyle='#ff2d2d';ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(-10,-14);ctx.lineTo(10,-14);ctx.lineTo(0,0);ctx.closePath();ctx.stroke();ctx.fill();
      ctx.font='900 12px "Noto Sans CJK SC",sans-serif';ctx.textAlign='center';ctx.lineWidth=3.5;ctx.strokeStyle='#5a0000';ctx.strokeText('集火',0,-22);ctx.fillStyle='#fff';ctx.fillText('集火',0,-22);ctx.restore();}
  }
}
function drawProj(p,dt){p.age=(p.age||0)+dt;
  const [gx,gy]=toS(p.x,p.y);const prog=Math.max(0,Math.min(1,1-Math.hypot(p.t.x-p.x,p.t.y-p.y)/(p.d0||1)));
  const arc={arrow:0.22,bolt:0.05,bolt2:0.02,holy:0.1,death:0.06,fire:0.14,axe:0.2,rock:0.3}[p.kind]||0.1;
  const z=(p.z*(1-prog)+unitH(p.t)/view.s*0.3*prog)+(p.d0||0)*arc*Math.sin(prog*Math.PI);
  const x=gx,y=gy-z*view.s;
  p.trail=p.trail||[];p.trail.push([x,y]);if(p.trail.length>10)p.trail.shift();
  shadowAt(gx,gy,5,0.25);
  const s=view.s*(view.portrait?1.2:1);const lastp=p.trail[p.trail.length-2]||[x-1,y];const ang=Math.atan2(y-lastp[1],x-lastp[0]);
  ctx.save();ctx.lineCap='round';
  for(let i=1;i<p.trail.length;i++){const a=i/p.trail.length;const c={bolt2:`rgba(190,230,255,${a*0.9})`,holy:`rgba(150,210,255,${a*0.7})`,death:`rgba(170,80,255,${a*0.7})`,fire:`rgba(255,140,30,${a*0.7})`}[p.kind]||`rgba(255,255,255,${a*0.5})`;
    ctx.strokeStyle=c;ctx.lineWidth=(p.kind==='arrow'||p.kind==='bolt'||p.kind==='axe'?2.2:7)*a*s+0.5;ctx.beginPath();ctx.moveTo(...p.trail[i-1]);ctx.lineTo(...p.trail[i]);ctx.stroke();}
  ctx.translate(x,y);
  if(p.kind==='rock'){ctx.rotate(p.age*6);ctx.fillStyle='#7d7468';ctx.strokeStyle='#3e3830';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*6.28,r=(9+((i*37)%5))*s;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();}
  else if(p.kind==='axe'){ctx.rotate(p.age*16||time*16);ctx.fillStyle='#6b4423';ctx.fillRect(-11*s,-1.6*s,22*s,3.2*s);ctx.fillStyle='#c9c9c9';ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(6*s,-2*s);ctx.lineTo(15*s,-9*s);ctx.quadraticCurveTo(19*s,0,15*s,9*s);ctx.lineTo(6*s,2*s);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(p.kind==='arrow'||p.kind==='bolt'){ctx.rotate(ang);const L=p.kind==='arrow'?18:12;ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2*s+0.6;ctx.beginPath();ctx.moveTo(-L*s,0);ctx.lineTo(5*s,0);ctx.stroke();ctx.fillStyle='#e8e8e8';ctx.beginPath();ctx.moveTo(10*s,0);ctx.lineTo(3*s,-3.5*s);ctx.lineTo(3*s,3.5*s);ctx.fill();if(p.kind==='arrow'){ctx.fillStyle='#d33';ctx.fillRect(-L*s-2*s,-3*s,6*s,6*s);}}
  else{const c={bolt2:['#ffffff','rgba(160,220,255,.95)','rgba(80,160,255,0)'],holy:['#ffffff','rgba(120,200,255,.95)','rgba(60,120,255,0)'],death:['#f4e0ff','rgba(170,70,255,.95)','rgba(120,30,200,0)'],fire:['#fff6c0','rgba(255,140,30,.95)','rgba(200,40,0,0)']}[p.kind];
    const r=(p.kind==='fire'?10:12)*s+Math.sin(time*30)*1.5;const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,c[0]);g.addColorStop(0.35,c[1]);g.addColorStop(1,c[2]);
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
    if(p.kind==='fire'&&Math.random()<0.6)fire(x,y,(Math.random()-0.5)*20,-10,3,0.3);
    if(p.kind==='holy'&&Math.random()<0.5)P({x:x+(Math.random()-0.5)*8,y:y+(Math.random()-0.5)*8,vx:0,vy:-10,size:1.6,life:0.4,col:'rgba(220,240,255,',add:true});
    if(p.kind==='death'&&Math.random()<0.5)P({x,y,vx:(Math.random()-0.5)*20,vy:-15,size:3,life:0.5,col:'rgba(130,50,200,',grow:1.5,alpha:0.6});}
  ctx.restore();
}
function drawEmitters(b,dt){
  for(const em of emitters){em.t+=dt;const u=em.u;if(!u.alive||!u.target){em.t=em.dur;continue;}
    if(em.kind==='breath'){const R=RIG[u.type];const [mx,my]=rigPointS(u,R.tip);const [tx,ty]=footS(u.target);const th=unitH(u.target);
      const dx=tx-mx,dy=ty-th*0.4-my,d=Math.hypot(dx,dy)||1;
      if(em.t>0.3){for(let i=0;i<3;i++){const sp=d*2.2*(0.8+Math.random()*0.4),a=(Math.random()-0.5)*0.35,c=Math.cos(a),s=Math.sin(a);fire(mx,my,(dx/d*c-dy/d*s)*sp,(dx/d*s+dy/d*c)*sp,3+Math.random()*3,0.4);}
        S.breath();if(Math.random()<dt*8)shake=Math.max(shake,2.5);}}}
  emitters=emitters.filter(e=>e.t<e.dur);
}
function drawFx(dt){
  // melee fx
  for(const f of fx){f.t+=dt;const k=f.t/f.max,a=1-k;ctx.save();
    if(f.kind==='arc'){ctx.translate(f.x,f.y);ctx.rotate(f.ang);if(f.glow)ctx.globalCompositeOperation='lighter';const sw=-1.3+k*2.4;
      for(let i=0;i<6;i++){const t0=sw-i*0.18;ctx.strokeStyle=`rgba(${f.col},${a*(1-i/6)*0.95})`;ctx.lineWidth=f.w*(1-i/7);ctx.beginPath();ctx.arc(-f.r*0.4,0,f.r,t0-0.18,t0);ctx.stroke();}}
    else if(f.kind==='bolt'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(200,235,255,${a})`;ctx.lineWidth=3;ctx.beginPath();let x=f.x+(f.seed-0.5)*30,y=f.y-f.h*2.2;ctx.moveTo(x,y);while(y<f.y){y+=f.h*0.25;x+=(Math.random()-0.5)*f.h*0.3;ctx.lineTo(x,y);}ctx.stroke();}
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
  for(const t of texts)t.t+=dt;texts=texts.filter(t=>t.t<(t.pop?1.3:0.85));
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  for(const t of texts){const k=t.t,sc=k<0.12?E.outBack(k/0.12)*1.2:1.2-Math.min(0.2,k-0.12);const fs=t.pop?15:t.big?19:13.5;
    ctx.save();ctx.translate(t.x,t.y-k*32);ctx.scale(sc,sc);const kk=t.pop?k/1.5:k;ctx.globalAlpha=kk>0.55?Math.max(0,1-(kk-0.55)/0.3):1;ctx.font=`900 ${fs}px "Noto Sans CJK SC",sans-serif`;
    ctx.lineWidth=3.5;ctx.strokeStyle='#2a0a0a';ctx.strokeText(t.str,0,0);ctx.fillStyle=t.big?'#ffd000':t.col;ctx.fillText(t.str,0,0);ctx.restore();}
  for(const r of ripples){r.t+=dt;const k=r.t/0.5;ctx.strokeStyle=`rgba(${r.col||'255,80,80'},${1-k})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,8+k*36,0,7);ctx.stroke();}
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
  if(b){drawGrid(b);drawUnits(b,dt);drawEmitters(b,dt);for(const p of b.proj)drawProj(p,dt);drawFx(dt);drawStackUI(b,dt);
    $('pCount').textContent=b.units.filter(u=>u.alive&&u.side==='p').reduce((a,u)=>a+u.count,0);
    $('eCount').textContent=b.units.filter(u=>u.alive&&u.side==='e').reduce((a,u)=>a+u.count,0);}
  else drawFx(dt);
}

// ---------- input ----------
function pickUnitAt(cx,cy,side){const b=G.battle;let best=null,bd=1e9;
  for(const u of b.units){if(!u.alive||u.side!==side||!u.vis)continue;const [x,y,top]=stackAnchor(u);const h=y-top;
    const d=Math.hypot(cx-x,(cy-(y-h*0.45))*0.9);if(d<Math.max(h*0.75,fpS(u)[0]*view.s*0.6,30)&&d<bd){bd=d;best=u;}}return best;}
function popText(u,str,col){const [x,,top]=stackAnchor(u);texts.push({x,y:top-26,str,col,t:0,big:true,pop:1});}
cv.addEventListener('pointerdown',e=>{
  const b=G.battle;if(!b||(G.phase!=='battle'&&G.phase!=='countdown'))return;
  const own=pickUnitAt(e.clientX,e.clientY,'p'),foe=pickUnitAt(e.clientX,e.clientY,'e');
  if(own&&(!foe||Math.hypot(...footS(own).map((v,i)=>v-[e.clientX,e.clientY][i]))<=Math.hypot(...footS(foe).map((v,i)=>v-[e.clientX,e.clientY][i])))){
    if(own.st.shots>0){popText(own,'远程部队·无需待命','#cfe6ff');S.click();return;}
    own.hold=!own.hold;own.vis.badge=0.6;popText(own,own.hold?'⏸ 待命':'⚔ 进攻！',own.hold?'#ffd75e':'#9dff8a');S.tick();
    const [x,y]=footS(own);ripples.push({x,y,t:0,col:own.hold?'255,200,60':'120,255,120'});G.holdHintShown=true;return;}
  if(foe){b.focus=foe;foe.vis.badge=0.6;ripples.push({x:e.clientX,y:e.clientY,t:0});S.click();$('hint').classList.add('hidden');G.focusHintShown=true;}
});
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};
const mb=$('muteBtn');const setMB=()=>mb.textContent=SFX.muted?'🔇':'🔊';setMB();
mb.onclick=()=>{SFX.init();SFX.setMuted(!SFX.muted);setMB();S.click();};

// ---------- flow ----------
function banner(txt,dur=900){const el=$('banner');el.textContent=txt;el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(banner.t);banner.t=setTimeout(()=>el.classList.add('hidden'),dur);}
function show(id,on){$(id).classList.toggle('show',on);}
const ST=Strat;
const FCOL={castle:'#3b6fd8',rampart:'#3fa34d',tower:'#8fc8ff',inferno:'#d9442b',necro:'#7b5fb0',dungeon:'#9a3b8f',stronghold:'#c08a2e',fortress:'#3c8d6e'};
const FDESC={castle:'圣骑士与天使',rampart:'精灵、独角兽与金龙',tower:'法师、魔像与泰坦',inferno:'恶魔与魔鬼',necro:'不死军团',dungeon:'穴居人、美杜莎与黑龙',stronghold:'兽人与远古比蒙',fortress:'蜥蜴人与混沌九头蛇'};
const RICON={gold:'🪙',wood:'🪵',ore:'🪨',gems:'💎'};
const costHTML=c=>ST.RES.filter(k=>c[k]).map(k=>`<span class="cost">${RICON[k]}${c[k]}</span>`).join('');
function abilText(st){const a=st.ab||{},L=[];
  if(st.fly)L.push('飞行');if(st.shots)L.push(`远程射击（${st.shots}发）`+(a.noMP?'·近战无惩罚':'·近战伤害减半'));
  if(a.dbl)L.push(st.shots?'每次射击两次':'连续攻击两次');if(a.noRet)L.push('敌人无法反击');if(a.retal===2)L.push('每回合可反击2次');if(a.retal===99)L.push('无限反击');
  if(a.joustImm)L.push('免疫骑士冲锋加成');if(a.joust)L.push('冲锋：每移动1格伤害+5%');
  if(a.hate)L.push('憎恨 '+Object.keys(a.hate).map(t=>U[t]?U[t].n:t).join('/')+'：伤害+50%');if(a.undead)L.push('不死生物');if(a.unliving)L.push('无生命');
  if(a.cloud)L.push('死亡之云：溅射目标周围（不死免疫）');if(a.fireball)L.push('火球：溅射目标周围');if(a.breath)L.push('龙息：同时伤害目标后方1格');
  if(a.drain)L.push('生命吸取');if(a.regen)L.push('再生：每回合恢复');if(a.stun)L.push(`${a.stun[1]}：${a.stun[0]*100}%几率使目标停滞`);
  if(a.curse)L.push('诅咒：25%几率令目标只造成最低伤害');if(a.deathBlow)L.push('致命一击：20%几率双倍伤害');if(a.deathStare)L.push('死亡凝视：每只10%几率直接杀死1只');
  if(a.allAdj)L.push('攻击所有相邻敌人');if(a.ignoreDef)L.push(`无视${a.ignoreDef*100}%防御`);if(a.lightning)L.push('闪电：20%几率追加伤害');if(a.fireShield)L.push('烈焰护盾：反弹20%近战伤害');
  if(st.fw===2&&st.fh===2)L.push('体型：2×2格');else if(st.fw===2)L.push('体型：2格');
  const s=L.length?L.map(x=>'· '+x).join('<br>'):'· 无特殊能力';
  return s+(st.notes&&st.notes.length?`<div class="na">未模拟：${st.notes.join('、')}</div>`:'');}
const statRow=(k,v)=>`<div><span>${k}</span><b>${v}</b></div>`;
function unitCard(t,count,extra=''){const st=U[t];
  const tags=[st.shots?'<span class="tag r">远程</span>':'<span class="tag m">近战</span>',st.fly?'<span class="tag f">飞行</span>':'',st.up?'<span class="tag up">升级</span>':'',extra].join('');
  return `<div class="art"><span class="tier">${'★'.repeat(st.lvl)}</span><img src="${sprSrc(t)}"><span class="cnt">×${count}</span></div>
    <div class="nm">${count} ${st.n}</div><div class="h3">HoMM3 · ${st.h3} · ${st.lvl}级</div><div class="tags">${tags}</div>
    <div class="stats">${statRow('攻',st.a)+statRow('防',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>
    <div class="abil">${abilText(st)}</div>`;}
// ---- title -> faction select ----
function startRun(){SFX.init();SFX.startMusic();S.click();show('title',false);show('result',false);show('gameover',false);openFaction();}
function openFaction(){G.phase='faction';const el=$('fcards');el.innerHTML='';
  ST.FACS.forEach((f,i)=>{const L=ST.lineOf(f);const c=document.createElement('div');c.className='fcard';c.style.setProperty('--fc',FCOL[f]);c.style.animationDelay=(i*0.04)+'s';
    c.innerHTML=`<div class="fart"><img class="b" src="${sprSrc(L[13])}"><img class="a" src="${sprSrc(L[0])}"></div><div class="fn">${Core.FNAME[f]}</div><div class="fd">${FDESC[f]}</div>`;
    c.onclick=()=>pickFaction(f);el.appendChild(c);});
  show('faction',true);}
function pickFaction(f){S.pick();G.game=ST.newGame(f);G.log=[];show('faction',false);
  logMsg(`你选择了 ${Core.FNAME[f]}，敌方AI选择了 ${Core.FNAME[G.game.a.fac]}`);openMap();openTurn();}
// ---- strategic map ----
const SLOTS={town:[[0.13,0.62],[0.87,0.4]],camps:[[0.37,0.27],[0.5,0.72],[0.64,0.3]]};
const mpos=([x,y])=>view.portrait?[1-y*0.98-0.01,1-x]:[x,y];
let mapBg=null,mapKey='';
function drawMapBg(w,h,portrait){
  const c=mk(w,h),x=c.getContext('2d');const r=Core.rng(77);const rr2=()=>r();
  const T=(px,py)=>portrait?[(1-py)*w,(1-px)*h]:[px*w,py*h];
  let g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#5d8a3a');g.addColorStop(0.5,'#6f9a44');g.addColorStop(1,'#557f36');x.fillStyle=g;x.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){const px=rr2()*w,py=rr2()*h,rad=20+rr2()*70;const gg=x.createRadialGradient(px,py,0,px,py,rad);const c2=rr2()<0.5?'rgba(140,170,70,':'rgba(40,80,30,';gg.addColorStop(0,c2+'0.22)');gg.addColorStop(1,c2+'0)');x.fillStyle=gg;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
  // river
  x.lineCap='round';const riv=[[0.55,-0.05],[0.5,0.15],[0.58,0.35],[0.47,0.52],[0.55,0.75],[0.48,1.05]].map(p=>T(...p));
  for(const [lw,col] of [[34,'#3d6a8a'],[26,'#4f8fb8'],[12,'rgba(160,210,240,.55)']]){x.strokeStyle=col;x.lineWidth=lw*(w+h)/2000;x.beginPath();x.moveTo(...riv[0]);for(let i=1;i<riv.length-1;i++){const m=[(riv[i][0]+riv[i+1][0])/2,(riv[i][1]+riv[i+1][1])/2];x.quadraticCurveTo(...riv[i],...m);}x.lineTo(...riv[riv.length-1]);x.stroke();}
  // roads
  const road=(pts)=>{for(const [lw,col] of [[16,'rgba(90,60,30,.5)'],[11,'#c8a86a'],[3,'rgba(240,220,170,.5)']]){x.strokeStyle=col;x.lineWidth=lw*(w+h)/2000;x.setLineDash(lw===3?[6,10]:[]);x.beginPath();const P0=T(...pts[0]);x.moveTo(...P0);for(let i=1;i<pts.length;i++){const a=T(...pts[i-1]),b=T(...pts[i]);x.quadraticCurveTo((a[0]+b[0])/2+(rr2()-0.5)*20,(a[1]+b[1])/2+(rr2()-0.5)*20,...b);}x.stroke();}x.setLineDash([]);};
  road([[0.13,0.66],[0.3,0.55],[0.5,0.5],[0.7,0.45],[0.87,0.44]]);road([[0.3,0.55],[0.37,0.33]]);road([[0.5,0.5],[0.5,0.72]]);road([[0.7,0.45],[0.64,0.34]]);
  // bridge
  const bp=T(0.52,0.5);x.save();x.translate(...bp);x.rotate(portrait?Math.PI/2:0);x.fillStyle='#8a5a2b';x.fillRect(-26,-12,52,24);x.strokeStyle='#4a2c10';x.lineWidth=2;for(let i=-22;i<=22;i+=8){x.beginPath();x.moveTo(i,-12);x.lineTo(i,12);x.stroke();}x.restore();
  // mountains
  const mount=(px,py,s)=>{const [cx,cy]=T(px,py);const k=s*(w+h)/1600;x.fillStyle='rgba(0,0,0,.18)';x.beginPath();x.ellipse(cx,cy+4,46*k,12*k,0,0,7);x.fill();
    x.fillStyle='#857a6a';x.beginPath();x.moveTo(cx-48*k,cy);x.lineTo(cx-6*k,cy-62*k);x.lineTo(cx+40*k,cy);x.fill();x.fillStyle='#a69a86';x.beginPath();x.moveTo(cx-48*k,cy);x.lineTo(cx-6*k,cy-62*k);x.lineTo(cx-10*k,cy);x.fill();
    x.fillStyle='#f2f2f2';x.beginPath();x.moveTo(cx-18*k,cy-44*k);x.lineTo(cx-6*k,cy-62*k);x.lineTo(cx+8*k,cy-44*k);x.lineTo(cx-2*k,cy-48*k);x.fill();};
  [[0.28,0.12,1.2],[0.33,0.1,0.9],[0.75,0.88,1.1],[0.82,0.9,0.8],[0.06,0.2,1],[0.95,0.75,1],[0.2,0.92,0.8]].forEach(m=>mount(...m));
  // forests
  const tree=(px,py,s)=>{const [cx,cy]=T(px,py);const k=s*(w+h)/1800;x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(cx+3,cy+2,12*k,5*k,0,0,7);x.fill();x.fillStyle='#5a3a1a';x.fillRect(cx-2*k,cy-8*k,4*k,9*k);
    x.fillStyle='#2f5d25';x.beginPath();x.moveTo(cx-12*k,cy-6*k);x.lineTo(cx,cy-32*k);x.lineTo(cx+12*k,cy-6*k);x.fill();x.fillStyle='#3f7a30';x.beginPath();x.moveTo(cx-9*k,cy-16*k);x.lineTo(cx,cy-38*k);x.lineTo(cx+9*k,cy-16*k);x.fill();};
  const trees=[];for(const [fx,fy,n] of [[0.25,0.82,14],[0.72,0.12,14],[0.08,0.4,8],[0.92,0.62,8],[0.4,0.5,5],[0.62,0.6,6],[0.2,0.3,7],[0.8,0.25,6]])for(let i=0;i<n;i++)trees.push([fx+(rr2()-0.5)*0.12,fy+(rr2()-0.5)*0.12,0.8+rr2()*0.5]);
  trees.sort((a,b)=>T(a[0],a[1])[1]-T(b[0],b[1])[1]).forEach(t=>tree(...t));
  g=x.createRadialGradient(w/2,h/2,Math.min(w,h)*0.35,w/2,h/2,Math.max(w,h)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(30,20,5,.55)');x.fillStyle=g;x.fillRect(0,0,w,h);
  return c.toDataURL('image/jpeg',0.85);}
function townImg(fac){const c=mk(220,180),x=c.getContext('2d');const col=FCOL[fac];
  x.fillStyle='rgba(0,0,0,.3)';x.beginPath();x.ellipse(110,166,100,14,0,0,7);x.fill();
  const stone=x.createLinearGradient(0,40,0,170);stone.addColorStop(0,'#d9d2c2');stone.addColorStop(1,'#8f8676');
  const tower=(tx,ty,tw,th)=>{x.fillStyle=stone;x.fillRect(tx,ty,tw,th);x.fillStyle='rgba(0,0,0,.18)';x.fillRect(tx+tw*0.65,ty,tw*0.35,th);
    for(let i=0;i<3;i++){x.fillStyle=stone;x.fillRect(tx+i*tw/3+1,ty-8,tw/3-4,8);}x.fillStyle=col;x.beginPath();x.moveTo(tx-4,ty-8);x.lineTo(tx+tw/2,ty-40);x.lineTo(tx+tw+4,ty-8);x.fill();
    x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.moveTo(tx+tw/2,ty-40);x.lineTo(tx+tw+4,ty-8);x.lineTo(tx+tw/2,ty-8);x.fill();x.fillStyle='#2a2030';x.fillRect(tx+tw/2-3,ty+12,6,10);};
  x.fillStyle=stone;x.fillRect(30,100,160,64);for(let i=0;i<10;i++)x.fillRect(30+i*16+1,92,11,8);x.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<8;i++)x.fillRect(30,108+i*7,160,1);
  tower(18,84,30,80);tower(172,84,30,80);tower(84,40,52,124);tower(58,70,26,94);tower(136,70,26,94);
  x.fillStyle='#3a2414';x.beginPath();x.moveTo(96,164);x.lineTo(96,136);x.arc(110,136,14,Math.PI,0);x.lineTo(124,164);x.fill();
  x.strokeStyle='#333';x.lineWidth=2;x.beginPath();x.moveTo(110,0);x.lineTo(110,40);x.stroke();x.fillStyle=col;x.beginPath();x.moveTo(110,2);x.lineTo(142,10);x.lineTo(110,20);x.fill();
  return c.toDataURL();}
function campImg(){const c=mk(140,90),x=c.getContext('2d');x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(70,78,64,10,0,0,7);x.fill();
  x.fillStyle='#b8925a';x.beginPath();x.moveTo(14,78);x.lineTo(46,22);x.lineTo(78,78);x.fill();x.fillStyle='#8f6b3a';x.beginPath();x.moveTo(46,22);x.lineTo(78,78);x.lineTo(54,78);x.fill();x.fillStyle='#3a2414';x.beginPath();x.moveTo(40,78);x.lineTo(46,52);x.lineTo(52,78);x.fill();
  x.fillStyle='#5a3a1a';x.fillRect(96,70,22,5);x.fillStyle='#ff9a2a';x.beginPath();x.moveTo(100,71);x.quadraticCurveTo(107,46,114,71);x.fill();x.fillStyle='#ffe07a';x.beginPath();x.moveTo(104,71);x.quadraticCurveTo(107,58,110,71);x.fill();return c.toDataURL();}
let CAMPIMG=null;
function openMap(){G.phase='map';show('map',true);$('hud').classList.add('hidden');renderMap();}
function mapLayout(){const area=$('mapArea');const w=area.clientWidth,h=area.clientHeight;const key=w+'x'+h+view.portrait;
  if(key!==mapKey&&w>0){mapKey=key;mapBg=drawMapBg(Math.round(w*1.5),Math.round(h*1.5),view.portrait);area.style.backgroundImage=`url(${mapBg})`;}}
function armyLabel(army){const n=Object.values(army).reduce((a,b)=>a+b,0);return n<5?'少量':n<10?'几个':n<20?'一群':n<50?'许多':n<100?'大群':'海量';}
function renderMap(){const g=G.game;if(!g)return;mapLayout();if(!CAMPIMG)CAMPIMG=campImg();
  const p=g.p,a=g.a;const inc=ST.income(p);
  $('mTurn').innerHTML=`<span class="lbl">回合</span><b>${g.turn}</b><span class="sub">第${Math.floor((g.turn-1)/ST.WEEK)+1}周</span>`;
  $('mScore').innerHTML=`<span class="blue">${p.wins}</span><i>比分 · 先胜${ST.WIN_SCORE}场</i><span class="red">${a.wins}</span>`;
  $('mRes').innerHTML=ST.RES.map(k=>`<div class="res"><span>${RICON[k]}</span><b>${p.res[k]}</b><i>+${inc[k]||0}</i></div>`).join('');
  const area=$('mapArea');area.querySelectorAll('.mobj').forEach(e=>e.remove());
  const place=(el,pos)=>{const [x,y]=mpos(pos);el.style.left=(x*100)+'%';el.style.top=(y*100)+'%';area.appendChild(el);};
  [[p,0,'你的城镇'],[a,1,'敌方城镇']].forEach(([s,i,lab])=>{const el=document.createElement('div');el.className='mobj town '+(i?'ai':'pl');el.style.setProperty('--fc',FCOL[s.fac]);
    const L=ST.lineOf(s.fac);const top=[...Array(7)].map((_,k)=>s.dw[6-k]?ST.typeAt(s.fac,7-k,s.dw[6-k]===2):null).find(Boolean);
    const pw=Math.round(ST.power(s.army,ST.bonus(s))/100)/10;
    el.innerHTML=`<img class="castle" src="${townImg(s.fac)}"><img class="guard" src="${sprSrc(top)}"><div class="tlab"><b>${lab}</b>${Core.FNAME[s.fac]} · 战力 ${pw}k</div>`;
    if(i===1)el.onclick=()=>actAttack();place(el,SLOTS.town[i]);});
  g.camps.forEach((c,i)=>{const el=document.createElement('div');el.className='mobj camp'+(c.fresh?' fresh':'');const tp=Object.keys(c.army);const tr=ST.TIERS[c.tier];
    const pw=ST.campPower(c),mine=ST.power(Object.fromEntries(ST.stacks(p.army).map(x=>[x.type,x.count])),ST.bonus(p));
    const est=pw<mine*0.5?'稳胜':pw<mine*0.85?'占优':pw<mine*1.15?'势均力敌':'危险';
    el.innerHTML=`<img class="tent" src="${CAMPIMG}">${tp.map((t,k)=>`<img class="mon m${k}" src="${sprSrc(t)}">`).join('')}
      <div class="clab" style="--tc:${tr.col}"><b>${tr.n}</b> ${armyLabel(c.army)}${tp.map(t=>U[t].n).join('+')}<div class="rw">${costHTML(c.reward)}${c.art?'<span class="cost">🏺宝物</span>':''}${c.join?'<span class="cost">➕'+U[c.join.type].n+'</span>':''}</div><div class="est">${est}</div></div>`;
    el.onclick=()=>openCamp(i);place(el,SLOTS.camps[i]);});
  // keep labels inside the map
  requestAnimationFrame(()=>{const ar=area.getBoundingClientRect();area.querySelectorAll('.clab,.tlab').forEach(l=>{l.style.marginLeft='0px';const r=l.getBoundingClientRect();let dx=0;if(r.left<ar.left+4)dx=ar.left+4-r.left;else if(r.right>ar.right-4)dx=ar.right-4-r.right;l.style.marginLeft=dx+'px';});});
  // army strip
  const st=ST.stacks(p.army,99);$('mArmy').innerHTML=st.map(s=>`<div class="mini"><img src="${sprSrc(s.type)}"><b>${s.count}</b></div>`).join('')+(p.arts.length?`<div class="arts">🏺${p.arts.map(x=>x.n).join(' ')}</div>`:'');
  const can=ST.canAttack(g);$('actAttack').classList.toggle('dis',!can);$('actAttack').querySelector('i').textContent=can?'攻打敌方城镇':`休战至第${g.truce}回合`;
  const nb=ST.buildOptions(p).filter(o=>o.ok).length;$('actBuild').querySelector('i').textContent=nb?`${nb} 项可建`:'资源不足';
  const pool=ST.recruitOptions(p).reduce((s,o)=>s+o.avail,0);$('actRecruit').querySelector('i').textContent=`可招募 ${pool}`;
  $('mLog').innerHTML=G.log.slice(-3).map(m=>`<div>${m}</div>`).join('');
  $('actBar').classList.toggle('locked',G.phase!=='map');
}
function logMsg(m){G.log.push(m);if($('mLog'))$('mLog').innerHTML=G.log.slice(-3).map(x=>`<div>${x}</div>`).join('');}
addEventListener('resize',()=>{if(G.game&&$('map').classList.contains('show'))renderMap();});
// ---- turn: free offer ----
function openTurn(){const g=G.game;G.phase='offer';renderMap();
  $('draftTitle').textContent=`第 ${g.turn} 回合`;$('draftSub').textContent='免费援军：从你的兵营中选择一支部队';
  const cards=$('cards');cards.innerHTML='';
  g.p.offer.forEach((o,i)=>{const el=document.createElement('div');el.className='card';const owned=g.p.army[o.type];
    el.innerHTML=unitCard(o.type,o.count,owned?'<span class="tag up">增援</span>':'');el.onclick=()=>{if(G.phase!=='offer')return;G.phase='chosen';S.pick();
      [...cards.children].forEach(c=>c.classList.add(c===el?'chosen':'gone'));ST.takeOffer(g.p,i);
      setTimeout(()=>{show('draft',false);G.phase='map';renderMap();banner('选择本回合行动',900);},450);};cards.appendChild(el);});
  const s=$('armyStrip');s.innerHTML=ST.stacks(g.p.army,99).map(a=>`<div class="mini"><img src="${sprSrc(a.type)}"><b>${a.count}</b></div>`).join('');
  show('draft',true);}
// ---- generic modal ----
function modal(title,body,btns){$('modalTitle').innerHTML=title;$('modalBody').innerHTML='';if(typeof body==='string')$('modalBody').innerHTML=body;else $('modalBody').appendChild(body);
  const bb=$('modalBtns');bb.innerHTML='';for(const [txt,fn,cls] of btns){const b=document.createElement('button');b.className='mbtn '+(cls||'');b.innerHTML=txt;b.onclick=()=>{S.click();if(fn&&fn()===false)return;show('modal',false);};bb.appendChild(b);}show('modal',true);}
const closeModal=()=>show('modal',false);
// ---- actions ----
function actBuild(){if(G.phase!=='map')return;const p=G.game.p;S.click();const box=document.createElement('div');box.className='blist';
  for(const o of ST.buildOptions(p)){const el=document.createElement('div');el.className='bopt'+(o.ok?'':' no');
    const t=o.type;const ttl=o.kind==='dw'?`建造 ${o.L}级兵营`:o.kind==='up'?`升级 ${o.L}级兵营`:ST.BUILDINGS[o.k].n;
    const sub=o.kind==='dw'?`解锁 ${U[t].n}（每周 ${U[t].g}）`:o.kind==='up'?`可招募 ${U[t].n}（攻${U[t].a} 防${U[t].d} 速${U[t].spd}）`:ST.BUILDINGS[o.k].d;
    el.innerHTML=`${t?`<img src="${sprSrc(t)}">`:'<div class="bico">🏛️</div>'}<div class="bt"><b>${ttl}</b><span>${sub}</span><div>${costHTML(o.cost)}</div></div>`;
    if(o.ok)el.onclick=()=>{closeModal();ST.doBuild(G.game,p,o);S.spawn();logMsg(`你${ttl}`+(t?`：${U[t].n}`:''));afterPlayer();};box.appendChild(el);}
  modal('建造 <small>（本回合唯一行动）</small>',box,[['取消',null,'gray']]);}
function actRecruit(){if(G.phase!=='map')return;const p=G.game.p;S.click();const opts=ST.recruitOptions(p).filter(o=>o.avail>0);
  if(!opts.length){modal('招募','<p class="mp">兵营里暂时没有可招募的部队。每 '+ST.WEEK+' 回合（一周）补充一次。</p>',[['好的']]);return;}
  const plan={};const box=document.createElement('div');box.className='rlist';const total=document.createElement('div');total.className='rtotal';
  const upd=()=>{const c={gold:0,gems:0};for(const o of opts){const n=plan[o.L]||0;c.gold+=U[o.type].cost*n;c.gems+=(U[o.type].rare||0)*n;}
    const ok=ST.canPay(p.res,c);total.innerHTML=`合计 ${costHTML(c)||'0'} ${ok?'':'<b class="bad">资源不足</b>'}`;box.querySelectorAll('.rrow').forEach(r=>{r.querySelector('.n').textContent=plan[r.dataset.l]||0;});return ok;};
  for(const o of opts){const r=document.createElement('div');r.className='rrow';r.dataset.l=o.L;
    r.innerHTML=`<img src="${sprSrc(o.type)}"><div class="bt"><b>${U[o.type].n}</b><span>可招 ${o.avail} · ${costHTML(ST.unitCost(o.type))}/只</span></div><button class="pm">−</button><b class="n">0</b><button class="pm">＋</button><button class="pm mx">最大</button>`;
    const [mi,pl,mx]=r.querySelectorAll('button');const spent=()=>{const res={...p.res};for(const q of opts)if(q.L!==o.L){res.gold-=U[q.type].cost*(plan[q.L]||0);res.gems-=(U[q.type].rare||0)*(plan[q.L]||0);}return res;};
    mi.onclick=()=>{plan[o.L]=Math.max(0,(plan[o.L]||0)-1);upd();};pl.onclick=()=>{plan[o.L]=Math.min(ST.maxAfford(spent(),o.type,o.avail),(plan[o.L]||0)+1);upd();};mx.onclick=()=>{plan[o.L]=ST.maxAfford(spent(),o.type,o.avail);upd();};box.appendChild(r);}
  Object.assign(plan,ST.autoRecruit(p));box.appendChild(total);upd();
  modal('招募 <small>（本回合唯一行动）</small>',box,[['取消',null,'gray'],['招募',()=>{if(!upd())return false;const got=ST.doRecruit(p,plan);if(!got.length)return false;S.spawn();logMsg('你招募了 '+got.map(x=>x.count+' '+U[x.type].n).join('、'));setTimeout(afterPlayer,50);}]]);}
function armyHTML(army){return `<div class="alist">${ST.stacks(army,99).map(s=>`<div class="mini big"><img src="${sprSrc(s.type)}"><b>${s.count}</b><span>${U[s.type].n}</span></div>`).join('')}</div>`;}
function openCamp(i){if(G.phase!=='map')return;S.click();const c=G.game.camps[i];const tr=ST.TIERS[c.tier];
  modal(`野怪营地 · <span style="color:${tr.col}">${tr.n}</span>`,`${armyHTML(c.army)}<p class="mp">击败后获得：${costHTML(c.reward)} ${c.art?`<span class="cost">🏺${c.art.n}（${c.art.d}）</span>`:''}${c.join?`<span class="cost">➕ ${c.join.count} ${U[c.join.type].n} 加入</span>`:''}</p><p class="mp dim">战败将失去出战部队。</p>`,
    [['取消',null,'gray'],['⚔ 进攻营地',()=>{chooseStacks(br=>startBattle({kind:'camp',ci:i,brought:br,enemies:ST.stacks(c.army),bonus:{p:ST.bonus(G.game.p),e:{a:0,d:0}}}));}]]);}
function actCamp(){if(G.phase!=='map')return;S.click();banner('点击地图上的野怪营地',1100);document.querySelectorAll('.camp').forEach(e=>{e.classList.remove('hl');void e.offsetWidth;e.classList.add('hl');});}
function actAttack(){if(G.phase!=='map')return;const g=G.game;S.click();
  if(!ST.canAttack(g)){modal('休战中',`<p class="mp">第 ${g.truce} 回合前双方无法交战（开局休战 / 每场对决后休整 ${ST.TRUCE_AFTER} 回合）。</p>`,[['好的']]);return;}
  if(!Object.keys(g.p.army).length){modal('进攻','<p class="mp">你没有部队！</p>',[['好的']]);return;}
  modal(`进攻敌方城镇 <small>${Core.FNAME[g.a.fac]}</small>`,`<p class="mp">敌方守军（城墙：防御+3）：</p>${armyHTML(Object.fromEntries(ST.stacks(g.a.army).map(s=>[s.type,s.count])))}<p class="mp">胜者得 1 分及 🪙1500 🪵3 🪨3 💎1。先得 ${ST.WIN_SCORE} 分者赢得游戏。</p>`,
    [['取消',null,'gray'],['⚔ 出征',()=>{chooseStacks(br=>startBattle({kind:'duel',att:'p',brought:br,enemies:ST.stacks(g.a.army),bonus:{p:ST.bonus(g.p),e:ST.bonus(g.a,true)}}));}]]);}
function chooseStacks(cb){const army=G.game.p.army;const all=ST.stacks(army,99);if(all.length<=MAXS){setTimeout(()=>cb(all),0);return;}
  const sel=new Set(all.slice(0,MAXS).map(s=>s.type));const box=document.createElement('div');box.className='alist pick';
  const draw=()=>{box.innerHTML='';for(const s of all){const el=document.createElement('div');el.className='mini big'+(sel.has(s.type)?' on':'');el.innerHTML=`<img src="${sprSrc(s.type)}"><b>${s.count}</b><span>${U[s.type].n}</span>`;
    el.onclick=()=>{if(sel.has(s.type))sel.delete(s.type);else if(sel.size<MAXS)sel.add(s.type);S.tick();draw();};box.appendChild(el);}
    const h=document.createElement('p');h.className='mp';h.textContent=`已选 ${sel.size}/${MAXS}（同类部队已自动合并）`;box.appendChild(h);};draw();
  setTimeout(()=>modal('选择出战部队（最多7支）',box,[['取消',null,'gray'],['确定',()=>{if(!sel.size)return false;setTimeout(()=>cb(all.filter(s=>sel.has(s.type))),0);}]]),0);}
// ---- battle ----
function startBattle(B){G.pendingBattle=B;G.phase='loading';
  ensureRigs(B.brought.map(s=>s.type).concat(B.enemies.map(s=>s.type))).then(()=>{
    G.battle=Core.createBattle(B.brought,B.enemies,B.bonus);dying=[];emitters=[];parts=[];texts=[];fx=[];
    show('map',false);show('modal',false);$('hud').classList.remove('hidden');
    $('stageLbl').textContent=B.kind==='camp'?'野怪':'比分';$('stageNum').textContent=B.kind==='camp'?ST.TIERS[G.game.camps[B.ci].tier].n:`${G.game.p.wins}:${G.game.a.wins}`;
    G.battle.units.forEach(u=>{const v=vis(u);v.spawn=-Math.random()*0.4;});setTimeout(()=>{for(const u of G.battle.units){const [x,y]=toS(u.x,u.y);dust(x,y,8,1.3);}S.spawn();},250);
    countdown(B.kind==='camp'?'野怪营地':B.att==='p'?'进攻敌城':'守卫城镇');});}
function countdown(t){G.phase='countdown';banner(t,900);
  [['3',1000],['2',1500],['1',2000]].forEach(([s,d])=>setTimeout(()=>{banner(s,600);S.tick();},d));
  setTimeout(()=>{banner('战斗！',700);S.go();G.phase='battle';endTimer=0;if(!G.focusHintShown)$('hint').classList.remove('hidden');},2500);}
function surv(b,side){const m={};for(const u of b.units)if(u.side===side&&u.alive)m[u.type]=(m[u.type]||0)+u.count;return m;}
function endBattle(){
  const b=G.battle,B=G.pendingBattle,g=G.game;if(G.phase!=='battle')return;G.phase='result';$('hint').classList.add('hidden');
  const win=b.over==='win';const pl=b.units.filter(u=>u.side==='p');win?S.win():S.lose();
  const sp=surv(b,'p'),se=surv(b,'e');let sub='',extra='';
  // write back
  for(const s of B.brought){g.p.army[s.type]-=s.count;g.p.army[s.type]+=sp[s.type]||0;if(g.p.army[s.type]<=0)delete g.p.army[s.type];}
  if(B.kind==='camp'){const c=g.camps[B.ci];const rw=c.reward,art=c.art,join=c.join;ST.applyCamp(g,g.p,B.ci,{win,e:se});
    if(win){sub='野怪营地已清除';extra=`<div class="loot">${costHTML(rw)}${art?`<span class="cost">🏺${art.n}</span>`:''}${join?`<span class="cost">➕${join.count} ${U[join.type].n}</span>`:''}${c.raised?`<span class="cost">☠ 通灵术：${c.raised} 骷髅兵</span>`:''}</div>`;logMsg(`你击败了野怪，获得 ${ST.RES.filter(k=>rw[k]).map(k=>RICON[k]+rw[k]).join(' ')}`);}
    else{sub='出战部队全军覆没';logMsg('你进攻野怪营地失败');}}
  else{const att=B.att==='p'?g.p:g.a,def=B.att==='p'?g.a:g.p;
    // our battle: p side = player. applyDuel wants attacker/defender survivors; player's army already updated above, so pass player part as no-op
    const brP=[],brE=B.enemies;const res=B.att==='p'?{win,p:{},e:se}:{win:!win,p:se,e:{}};
    const w=ST.applyDuel(g,att,def,res,B.att==='p'?brP:brE,B.att==='p'?brE:brP);
    sub=win?`你赢得了这场对决！比分 ${g.p.wins} : ${g.a.wins}`:`敌军获胜… 比分 ${g.p.wins} : ${g.a.wins}`;
    if(w.raised)extra=`<div class="loot"><span class="cost">☠ 通灵术：${w.raised} 骷髅兵</span></div>`;
    logMsg(win?`对决胜利！比分 ${g.p.wins}:${g.a.wins}`:`对决失败。比分 ${g.p.wins}:${g.a.wins}`);}
  $('resTitle').textContent=win?'胜利':'战败';$('resTitle').className='res-title'+(win?'':' lose');
  $('resList').innerHTML=pl.map((u,i)=>`<div class="res-unit ${u.alive?'':'dead'}" style="animation-delay:${i*0.07}s"><img src="${sprSrc(u.type)}"><div class="c">${u.alive?'×'+u.count:'阵亡'}</div><div class="l">${u.start-u.count>0?'-'+(u.start-u.count):''}</div><div class="n">${u.st.n}</div></div>`).join('');
  $('resSub').innerHTML=sub+extra;$('resBtn').textContent='返回地图 →';
  $('resBtn').onclick=()=>{S.click();show('result',false);$('hud').classList.add('hidden');G.battle=null;
    if(g.over)return gameOver();show('map',true);G.phase='busy';renderMap();if(B.att==='a')endOfTurn();else afterPlayer(true);};
  if(win)for(let i=0;i<30;i++)setTimeout(()=>puff(Math.random()*view.cw,view.ch*0.3*Math.random(),5,['rgba(255,215,90,','rgba(120,200,255,','rgba(255,120,160,'][i%3],120,5,1,60),i*40);
  setTimeout(()=>show('result',true),win?200:500);
}
// ---- AI turn ----
function afterPlayer(){const g=G.game;if(g.over)return gameOver();G.phase='busy';renderMap();
  setTimeout(()=>{const a=g.a;const o=ST.aiTakeOffer(a);const ch=ST.aiChoose(g,a,g.p);
    if(ch.act==='attack'&&ST.canAttack(g)&&Object.keys(a.army).length){banner('敌军来袭！',1300);S.roar();logMsg(`${Core.FNAME[a.fac]} 大军进攻你的城镇！`);
      setTimeout(()=>{const all=ST.stacks(g.p.army);if(!all.length){const res={win:true,p:Object.fromEntries(ST.stacks(a.army).map(s=>[s.type,s.count])),e:{}};ST.applyDuel(g,a,g.p,res,ST.stacks(a.army),[]);logMsg('你没有守军，敌方得分！');if(g.over)return gameOver();return endOfTurn();}
        startBattle({kind:'duel',att:'a',brought:all,enemies:ST.stacks(a.army),bonus:{p:ST.bonus(g.p,true),e:ST.bonus(a)}});},1300);return;}
    if(ch.act==='build'){ST.doBuild(g,a,ch.opt);const t=ch.opt.type;logMsg(`敌方${ch.opt.kind==='dw'?'建造了'+ch.opt.L+'级兵营':ch.opt.kind==='up'?'升级了'+ch.opt.L+'级兵营':'建造了'+ST.BUILDINGS[ch.opt.k].n}${t?'（'+U[t].n+'）':''}`);}
    else if(ch.act==='recruit'){const got=ST.doRecruit(a,ch.plan);logMsg('敌方招募了 '+(got.map(x=>x.count+' '+U[x.type].n).join('、')||'部队'));}
    else if(ch.act==='camp'){const c=g.camps[ch.ci];const br=ST.stacks(a.army);if(br.length){const r=Core.run(br,ST.stacks(c.army),{p:ST.bonus(a),e:{a:0,d:0}});
      for(const s of br){a.army[s.type]-=s.count;a.army[s.type]+=r.p[s.type]||0;if(a.army[s.type]<=0)delete a.army[s.type];}const tr=ST.TIERS[c.tier].n;ST.applyCamp(g,a,ch.ci,r);logMsg(r.win?`敌方清除了一个${tr}野怪营地`:`敌方进攻野怪营地失败`);}}
    endOfTurn();},500);}
function endOfTurn(){const g=G.game;if(g.over)return gameOver();ST.endTurn(g);if(g.over)return gameOver();if((g.turn-1)%ST.WEEK===0)logMsg('新的一周：兵营补充了部队');setTimeout(openTurn,350);}
function gameOver(){const g=G.game;G.phase='over';show('map',false);show('modal',false);$('hud').classList.add('hidden');const win=g.over==='p';win?S.win():S.lose();
  $('goTitle').textContent=win?'胜利':'失败';$('goTitle').className='go-title'+(win?'':' lose');
  $('goSub').textContent=win?`你以 ${g.p.wins} : ${g.a.wins} 击败了${Core.FNAME[g.a.fac]}！`:`${Core.FNAME[g.a.fac]}以 ${g.a.wins} : ${g.p.wins} 获胜`;
  $('goStats').innerHTML=`<div>回合 <b>${g.turn}</b></div><div>阵营 <b>${Core.FNAME[g.p.fac]}</b></div><div>兵营 <b>${g.p.dw.filter(Boolean).length}/7</b></div>`;
  $('goArt').innerHTML=ST.stacks(g.p.army,5).map(s=>`<img src="${sprSrc(s.type)}">`).join('');
  show('gameover',true);
  if(win)for(let i=0;i<40;i++)setTimeout(()=>puff(Math.random()*view.cw,view.ch*0.4*Math.random(),6,['rgba(255,215,90,','rgba(120,200,255,','rgba(255,120,160,'][i%3],140,5,1.2,60),i*50);}
$('startBtn').onclick=startRun;$('goBtn').onclick=()=>{show('gameover',false);startRun();};
$('actBuild').onclick=actBuild;$('actRecruit').onclick=actRecruit;$('actCamp').onclick=actCamp;$('actAttack').onclick=actAttack;

// ---------- boot ----------
fetch('assets/rig.json').then(r=>r.json()).then(j=>{RIGDEF=j;return Promise.all([load('assets/arena.jpg').then(i=>bg=i),ensureRigs(['pikeman','archer','skeleton','imp'])]);}).then(()=>{
  resize();
  $('titleHeroes').innerHTML=['archangel','blackDragon','titan'].map(s=>`<img src="${sprSrc(s)}">`).join('');
  G.battle=Core.createBattle([{type:'pikeman',count:5},{type:'archer',count:3}],[{type:'skeleton',count:8},{type:'imp',count:9}]);
  requestAnimationFrame(frame);
  if(DEBUG){window.__G=G;window.__ST=ST;window.__dbg={pick:()=>G.phase==='offer'&&$('cards').children[0].click(),tap:u=>{const [x,y,top]=stackAnchor(u);return [x,(y+top)/2];},units:()=>G.battle&&G.battle.units,walkStyle:s=>{WALK=s;},
    speed:n=>{G.speed=n;},ensure:ensureRigs,
    walk:(type,wt,size=180,frames=8)=>{const st=U[type],R=RIG[type];const out=[];for(let i=0;i<frames;i++){const c=document.createElement('canvas');c.width=size*1.5;c.height=size*1.35;const save=ctx;
      const u={type,st,face:R.nat,wind:0,wt:0.36,atkT:0,hitT:0,moving:true,alive:true,walkT:wt+i/frames,vis:{ph:0,mv:1},fw:1,fh:1};const tsave=time;time=tsave+i/frames*0.5;
      const p=unitPose(u,size,0.016);u.vis.mv=1;ctx=c.getContext('2d');ctx.fillStyle='#6e9a45';ctx.fillRect(0,0,c.width,c.height);shadowAt(c.width/2,c.height-14,size*0.3,0.4);drawRig(type,c.width/2,c.height-14,size,false,p);ctx=save;time=tsave;out.push(c.toDataURL());}return out;}};}
});
})();

// build r3-walk-homm3
(()=>{
const {U,W,H,MAXS,FX0,FX1,FY0,FY1}=Core;
const $=id=>document.getElementById(id);
const cv=$('cv');let ctx=cv.getContext('2d');
const S=SFX.S;
const names=Object.keys(U);
const sprSrc=t=>'assets/'+U[t].side+'_'+t+'.png';
const load=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src;});
let bg;const RIG={};

// ---------- rig building: body (torso + back/front leg) + separately-masked weapon layer ----------
let RIGDEF={};
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function whiten(c){const o=mk(c.width,c.height),x=o.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,o.width,o.height);return o;}
function scaled(img,PW,PH){const mid=mk(img.width/2,img.height/2);mid.getContext('2d').drawImage(img,0,0,mid.width,mid.height);const c=mk(PW,PH),x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(mid,0,0,PW,PH);return c;}
function buildRig(t,body,wpn,wing){
  const st=U[t],PH=200,k=PH/body.height,PW=Math.round(body.width*k),D=RIGDEF[t];
  const full=scaled(body,PW,PH),fx=full.getContext('2d'),W=scaled(wpn,PW,PH),WG=wing?scaled(wing,PW,PH):null;
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
    def:D,piv:P(D.piv),tip:P(D.tip),bowTop:P(D.bowTop),bowBot:P(D.bowBot),hand:P(D.hand),nat:st.side==='p'?1:-1};
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
      const p=u.st.proj;({arrow:S.bow,bolt:S.bolt,holy:S.magic,death:S.dark,fire:S.fireball,axe:S.slash})[p]();
      const [x,y,h]=frontPos(u);if(p==='holy')puff(x,y-h*0.8,6,'rgba(150,210,255,',40,3,0.4,-20);if(p==='death')puff(x,y-h*0.8,6,'rgba(170,80,255,',40,3,0.4,-20);if(p==='fire')puff(x,y-h*0.6,5,'rgba(255,150,40,',40,3,0.3,-20);
    } else if(e.k==='strike'){strikeFx(u,e.t);if(e.retal){const [x,y,h]=frontPos(u);texts.push({x,y:y-h*1.05,str:'反击',col:'#ffe8a0',t:0,big:false,pop:1});}}
    else if(e.k==='cloud'){const [x,y,h]=frontPos(e.t);const r=Core.CW*view.s*1.4;for(let i=0;i<26;i++){const a=Math.random()*6.28,d=Math.random()*r;P({x:x+Math.cos(a)*d,y:y-h*0.3+Math.sin(a)*d*0.6,vx:Math.cos(a)*20,vy:-15,size:6+Math.random()*8,life:0.9,col:'rgba(120,60,170,',grow:1.4,alpha:0.5});}S.dark();}
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
  if(A==='swing'||A==='swipe'){
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
  p.lean+=(-0.05*w+0.07*ks)*nat;p.dx=(-0.02*w+0.04*ks)*h;
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
  const arc={arrow:0.22,bolt:0.05,holy:0.1,death:0.06,fire:0.14,axe:0.2}[p.kind]||0.1;
  const z=(p.z*(1-prog)+unitH(p.t)/view.s*0.3*prog)+(p.d0||0)*arc*Math.sin(prog*Math.PI);
  const x=gx,y=gy-z*view.s;
  p.trail=p.trail||[];p.trail.push([x,y]);if(p.trail.length>10)p.trail.shift();
  shadowAt(gx,gy,5,0.25);
  const s=view.s*(view.portrait?1.2:1);const lastp=p.trail[p.trail.length-2]||[x-1,y];const ang=Math.atan2(y-lastp[1],x-lastp[0]);
  ctx.save();ctx.lineCap='round';
  for(let i=1;i<p.trail.length;i++){const a=i/p.trail.length;const c={holy:`rgba(150,210,255,${a*0.7})`,death:`rgba(170,80,255,${a*0.7})`,fire:`rgba(255,140,30,${a*0.7})`}[p.kind]||`rgba(255,255,255,${a*0.5})`;
    ctx.strokeStyle=c;ctx.lineWidth=(p.kind==='arrow'||p.kind==='bolt'||p.kind==='axe'?2.2:7)*a*s+0.5;ctx.beginPath();ctx.moveTo(...p.trail[i-1]);ctx.lineTo(...p.trail[i]);ctx.stroke();}
  ctx.translate(x,y);
  if(p.kind==='axe'){ctx.rotate(p.age*16||time*16);ctx.fillStyle='#6b4423';ctx.fillRect(-11*s,-1.6*s,22*s,3.2*s);ctx.fillStyle='#c9c9c9';ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(6*s,-2*s);ctx.lineTo(15*s,-9*s);ctx.quadraticCurveTo(19*s,0,15*s,9*s);ctx.lineTo(6*s,2*s);ctx.closePath();ctx.fill();ctx.stroke();}
  else if(p.kind==='arrow'||p.kind==='bolt'){ctx.rotate(ang);const L=p.kind==='arrow'?18:12;ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2*s+0.6;ctx.beginPath();ctx.moveTo(-L*s,0);ctx.lineTo(5*s,0);ctx.stroke();ctx.fillStyle='#e8e8e8';ctx.beginPath();ctx.moveTo(10*s,0);ctx.lineTo(3*s,-3.5*s);ctx.lineTo(3*s,3.5*s);ctx.fill();if(p.kind==='arrow'){ctx.fillStyle='#d33';ctx.fillRect(-L*s-2*s,-3*s,6*s,6*s);}}
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
function startRun(){SFX.init();SFX.startMusic();S.click();G.stage=1;G.army=[];G.speed=1;$('speedBtn').textContent='1×';show('title',false);show('result',false);openDraft();}
function setupPreview(){G.battle=Core.createBattle(G.army,G.enemies);$('stageNum').textContent=G.stage;dying=[];emitters=[];}
function abilText(st){const a=st.ab||{},L=[];
  if(st.fly)L.push('飞行');if(st.shots)L.push(`远程射击（${st.shots}发）·近战伤害减半·超过10格伤害减半`);
  if(a.joustImmune)L.push('免疫骑士冲锋加成');if(a.retal===2)L.push('每回合可反击2次');if(a.joust)L.push('冲锋：每移动1格伤害+5%');
  if(a.hate)L.push('憎恨恶魔：伤害+50%');if(a.morale)L.push('全军士气+1');if(a.undead)L.push('不死生物（免疫士气）');
  if(a.deathCloud)L.push('死亡之云：溅射目标周围（不死生物免疫）');if(a.breath)L.push('龙息：同时伤害目标后方1格');if(a.spellImm)L.push('免疫1-3级魔法');
  if(st.fw===2&&st.fh===2)L.push('体型：2×2格');else if(st.fw===2)L.push('体型：2格');
  return L.length?L.map(x=>'· '+x).join('<br>'):'· 无特殊能力';}
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
    el.innerHTML=`<div class="art"><span class="tier">${'★'.repeat(st.lvl)}</span><img src="${sprSrc(o.type)}"><span class="cnt">×${o.count}</span></div>
      <div class="nm">${o.count} ${st.n}</div><div class="h3">HoMM3 · ${st.h3} · ${st.lvl}级</div><div class="tags">${tags}</div>
      <div class="stats">${statRow('攻',st.a)+statRow('防',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>
      <div class="abil">${abilText(st)}</div>`;
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
fetch('assets/rig.json').then(r=>r.json()).then(j=>{RIGDEF=j;return Promise.all([load('assets/arena.jpg').then(i=>bg=i),...names.map(t=>Promise.all([load('assets/'+U[t].side+'_'+t+'_body.png'),load('assets/'+U[t].side+'_'+t+'_wpn.png'),RIGDEF[t].hasWing?load('assets/'+U[t].side+'_'+t+'_wing.png'):null]).then(([b,w,wg])=>buildRig(t,b,w,wg)))]);}).then(()=>{
  resize();
  $('titleHeroes').innerHTML=['p_swordsman','p_angel','p_cavalier'].map(s=>`<img src="assets/${s}.png">`).join('');
  G.enemies=Core.makeEnemies(1);G.battle=Core.createBattle([{type:'pikeman',count:5},{type:'crossbowman',count:3}],G.enemies);
  requestAnimationFrame(frame);
  if(DEBUG){window.__G=G;window.__dbg={pick:()=>G.phase==='draft'&&$('cards').children[0].click(),tap:u=>{const [x,y,top]=stackAnchor(u);return [x,(y+top)/2];},units:()=>G.battle.units,walkStyle:s=>{WALK=s;},
    walk:(type,wt,size=180,frames=8)=>{const st=U[type],R=RIG[type];const out=[];for(let i=0;i<frames;i++){const c=document.createElement('canvas');c.width=size*1.5;c.height=size*1.35;const save=ctx;
      const u={type,st,face:R.nat,wind:0,wt:0.36,atkT:0,hitT:0,moving:true,alive:true,walkT:wt+i/frames,vis:{ph:0,mv:1},fw:1,fh:1};const tsave=time;time=tsave+i/frames*0.5;
      const p=unitPose(u,size,0.016);u.vis.mv=1;ctx=c.getContext('2d');ctx.fillStyle='#6e9a45';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.moveTo(0,c.height-14);ctx.lineTo(c.width,c.height-14);ctx.stroke();shadowAt(c.width/2,c.height-14,size*0.3,0.4);drawRig(type,c.width/2,c.height-14,size,false,p);ctx=save;time=tsave;out.push(c.toDataURL());}return out;},
    pose:(type,wind,atk,size=220)=>{const st=U[type],R=RIG[type];const c=document.createElement('canvas');c.width=size*1.6;c.height=size*1.3;const save=ctx;
      const u={type,st,face:R.nat,wind:wind>0?0.36*(1-wind):0,wt:0.36,atkT:atk,hitT:0,moving:false,alive:true,walkT:0,vis:{ph:0},fw:1,fh:1};if(wind>=1){u.wind=0.0001;}
      const p=unitPose(u,size,0);ctx=c.getContext('2d');ctx.fillStyle='#6e9a45';ctx.fillRect(0,0,c.width,c.height);drawRig(type,c.width/2,c.height-14,size,false,p);ctx=save;return c.toDataURL();}};}
});
})();

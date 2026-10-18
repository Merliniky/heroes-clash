// 宝石塔防 · Gem TD mode — rendering + touch UI on top of td_core.js (rules) and the shared sprite atlases
import * as THREE from 'three';
import {SPR_UNITS,SPR_ALIAS,SPR_K,SPR_V} from './sprdata.js?v=22';
const T=window.TD,S=SFX.S,$=id=>document.getElementById(id);
const DEBUG=/[?&]debug/.test(location.search);
const W=T.W,H=T.H,W2=W/2,H2=H/2;
const cw=(c,r)=>[c-W2+0.5,r-H2+0.5];
// ---------- renderer / scene (same look as the auto-battler) ----------
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x7fb2d8);scene.fog=new THREE.Fog(0x7fb2d8,30,60);
const camera=new THREE.PerspectiveCamera(40,1,0.5,90);
scene.add(new THREE.HemisphereLight(0xdff1ff,0x5c7a3a,1.5));
const sun=new THREE.DirectionalLight(0xfff1d6,2.3);sun.position.set(-7,14,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.02;scene.add(sun);scene.add(sun.target);
const ramp=(()=>{const d=new Uint8Array([90,90,90,255,175,175,175,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
const toonM={};const tmat=(c,em=0,ei=0)=>{const k=c+'|'+em+'|'+ei;return toonM[k]||(toonM[k]=new THREE.MeshToonMaterial({color:c,gradientMap:ramp,emissive:em||0,emissiveIntensity:ei}));};
// ---------- board ----------
function boardTex(){const P=48,c=document.createElement('canvas');c.width=W*P;c.height=H*P;const x=c.getContext('2d');
  for(let i=0;i<W;i++)for(let j=0;j<H;j++){x.fillStyle=(i+j)%2?'#86c250':'#7bb748';x.fillRect(i*P,j*P,P,P);}
  for(let k=0;k<2200;k++){x.fillStyle=`rgba(${40+Math.random()*60|0},${110+Math.random()*60|0},30,${0.15+Math.random()*0.2})`;x.fillRect(Math.random()*c.width,Math.random()*c.height,1.5,3+Math.random()*3);}
  x.strokeStyle='rgba(255,255,255,0.13)';x.lineWidth=1.5;for(let i=0;i<=W;i++){x.beginPath();x.moveTo(i*P,0);x.lineTo(i*P,c.height);x.stroke();}for(let j=0;j<=H;j++){x.beginPath();x.moveTo(0,j*P);x.lineTo(c.width,j*P);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
{const p=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshToonMaterial({map:boardTex(),gradientMap:ramp}));p.rotation.x=-Math.PI/2;p.receiveShadow=true;scene.add(p);
  const bm=tmat(0x9a7650),bw=0.3;for(const [w,d,x,z] of [[W+bw*2,bw,0,-H2-bw/2],[W+bw*2,bw,0,H2+bw/2],[bw,H,-W2-bw/2,0],[bw,H,W2+bw/2,0]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,0.16,d),bm);b.position.set(x,0.02,z);b.receiveShadow=b.castShadow=true;scene.add(b);}
  const out=new THREE.Mesh(new THREE.PlaneGeometry(90,90),tmat(0x5f9a3a));out.rotation.x=-Math.PI/2;out.position.y=-0.06;out.receiveShadow=true;scene.add(out);
  // a few trees and boulders around the arena
  const R=(()=>{let s=7;return ()=>(s=(s*16807)%2147483647)/2147483647;})();
  for(let i=0;i<46;i++){const side=i%2?1:-1;const x=side*(W2+0.9+R()*4),z=(R()-0.5)*(H+6);const tr=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,0.5,6),tmat(0x6b4a2b));trunk.position.y=0.25;tr.add(trunk);
    const top=new THREE.Mesh(new THREE.ConeGeometry(0.42+R()*0.25,1.0+R()*0.5,7),tmat(R()<0.5?0x3f8a3a:0x4f9a40));top.position.y=0.9;tr.add(top);tr.traverse(o=>{if(o.isMesh)o.castShadow=true;});tr.position.set(x,0,z);scene.add(tr);}}
// checkpoints, spawn portal and exit gate
function numTex(n,col){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle=col;x.beginPath();x.arc(32,32,28,0,6.3);x.fill();x.lineWidth=5;x.strokeStyle='#1a1406';x.stroke();
  x.fillStyle='#1a1406';x.font='900 36px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(n,32,34);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const ringGeo=new THREE.RingGeometry(0.36,0.47,40);ringGeo.rotateX(-Math.PI/2);const discGeo=new THREE.CircleGeometry(0.47,32);discGeo.rotateX(-Math.PI/2);
const markers=[];
T.WAYS.forEach(([c,r],i)=>{const [x,z]=cw(c,r);const last=i===T.WAYS.length-1,first=i===0;const col=first?0xb05cff:last?0xff4a3a:0xffd23a;
  const disc=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.28,depthWrite:false}));disc.position.set(x,0.012,z);scene.add(disc);
  const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9,depthWrite:false}));ring.position.set(x,0.016,z);scene.add(ring);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:numTex(first?'入':last?'出':String(i),first?'#c88aff':last?'#ff7a6a':'#ffd75e'),depthWrite:false}));sp.scale.set(0.62,0.62,1);sp.position.set(x,0.85,z);sp.renderOrder=6;scene.add(sp);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.55,6),tmat(0x5a4630));pole.position.set(x+0.32,0.27,z-0.32);pole.castShadow=true;scene.add(pole);
  markers.push({ring,disc,sp,first,last});});
// ---------- camera fit: whole board between the top HUD and the bottom panel ----------
let PITCH=62*Math.PI/180;const camLook=new THREE.Vector3();
function fitCamera(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const portrait=h>w*1.1;camera.fov=portrait?40:32;PITCH=(portrait?62:55)*Math.PI/180;camera.updateProjectionMatrix();
  const top=portrait?82:60,bot=portrait?208:160;const yMin=-1+2*bot/h,yMax=1-2*top/h;
  const pts=[[-W2,-H2],[W2,-H2],[-W2,H2],[W2,H2]].map(([x,z])=>new THREE.Vector3(x,0,z)).concat([[-W2,-H2],[W2,-H2]].map(([x,z])=>new THREE.Vector3(x,0.8,z)));
  const dir=new THREE.Vector3(0,Math.sin(PITCH),Math.cos(PITCH));let lo=5,hi=80,shift=0;
  const place=(d,s)=>{camLook.set(0,0,s);camera.position.copy(camLook).addScaledVector(dir,d);camera.lookAt(camLook);camera.updateMatrixWorld();};
  for(let it=0;it<32;it++){const d=(lo+hi)/2;place(d,0);let ok=true;const ys=[];for(const p of pts){const q=p.clone().project(camera);if(Math.abs(q.x)>0.985)ok=false;ys.push(q.y);}if(Math.max(...ys)-Math.min(...ys)>yMax-yMin)ok=false;if(ok)hi=d;else lo=d;}
  const mid=s=>{place(hi,s);const ys=pts.map(p=>p.clone().project(camera).y);return (Math.max(...ys)+Math.min(...ys))/2;};const want=(yMax+yMin)/2;let a=-H,b=H;const inc=mid(b)>mid(a);for(let it=0;it<30;it++){const m=(a+b)/2;if((mid(m)<want)===inc)a=m;else b=m;}shift=(a+b)/2;place(hi,shift);
  scene.fog.near=hi*1.4;scene.fog.far=hi*3;}
addEventListener('resize',fitCamera);fitCamera();
// ---------- sprites (same atlases + facing logic as the auto-battler) ----------
const sprLoader=new THREE.TextureLoader();const SPR={};
function loadSpr(t){if(SPR_ALIAS[t])return loadSpr(SPR_ALIAS[t][0]);if(!SPR_UNITS.includes(t))return Promise.resolve(null);
  return SPR[t]||(SPR[t]=fetch(`assets/spr/${t}.json?v=${SPR_V}`).then(r=>r.json()).then(m=>Promise.all(m.pages.map((_,i)=>new Promise((res,rej)=>sprLoader.load(`assets/spr/${t}_p${i}.webp?v=${SPR_V}`,res,undefined,rej)))).then(tx=>{for(const x of tx){x.colorSpace=THREE.SRGBColorSpace;x.anisotropy=4;}m.tex=tx;return m;})).catch(e=>{console.warn('spr',t,e);return null;}));}
const shadowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.6)');g.addColorStop(0.5,'rgba(0,0,0,.34)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
const shadowMat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});const shadowGeo=new THREE.PlaneGeometry(1,1);shadowGeo.rotateX(-Math.PI/2);
const _cr=new THREE.Vector3(),_cf=new THREE.Vector3(),_sp=new THREE.Vector3(),_cp=new THREE.Vector3();
function camFacing(yaw){_cr.setFromMatrixColumn(camera.matrixWorld,0);_cr.y=0;_cr.normalize();_cf.setFromMatrixColumn(camera.matrixWorld,2);_cf.y=0;_cf.normalize().negate();const fx=Math.sin(yaw),fz=Math.cos(yaw);return Math.atan2(fx*_cr.x+fz*_cr.z,fx*_cf.x+fz*_cf.z)*180/Math.PI;}
const UNIT_K=0.95,SPR_PUSH=1.6;
const views=new Map();const unitLayer=new THREE.Group();scene.add(unitLayer);
const hpBgM=new THREE.SpriteMaterial({color:0x10131f,depthTest:false,transparent:true,opacity:0.85});const hpFgM={n:new THREE.SpriteMaterial({color:0xff4a3a,depthTest:false}),b:new THREE.SpriteMaterial({color:0xff2a8a,depthTest:false}),p:new THREE.SpriteMaterial({color:0x5fdc5a,depthTest:false}),s:new THREE.SpriteMaterial({color:0x6ab8ff,depthTest:false})};
function makeView(e){const g=new THREE.Group();const [x,z]=cw(e.x,e.y);g.position.set(x,0,z);unitLayer.add(g);
  const sh=new THREE.Mesh(shadowGeo,shadowMat);sh.position.y=0.02;sh.renderOrder=2;const sw=e.boss?1.1:0.55;sh.scale.set(sw,1,sw*0.6);g.add(sh);
  const bg=new THREE.Sprite(hpBgM);bg.center.set(0,0.5);bg.renderOrder=8;const fg=new THREE.Sprite(hpFgM.n);fg.center.set(0,0.5);fg.renderOrder=9;scene.add(bg);scene.add(fg);
  const v={e,g,sh,bg,fg,spr:null,yaw:Math.PI,hover:e.fly?0.55:0,k:UNIT_K*(SPR_K[e.type]||1)*(e.boss?1.7:1),deadT:0,sprK:'',sprT:0,sprDir:-1,sprMir:false,sprPg:0,flash:0,topY:0.7};
  const tint=SPR_ALIAS[e.type]?new THREE.Color(SPR_ALIAS[e.type][1]):new THREE.Color(1,1,1);v.tint=tint;
  loadSpr(e.type).then(m=>{if(!m||v.gone)return;const tx=m.tex.map(t=>{const c=t.clone();c.needsUpdate=true;return c;});const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx[0],transparent:true,alphaTest:0.02,depthWrite:false}));sp.renderOrder=3;unitLayer.add(sp);v.spr=sp;v.m=m;v.tx=tx;});
  views.set(e.id,v);return v;}
function dropView(v){v.gone=true;unitLayer.remove(v.g);scene.remove(v.bg);scene.remove(v.fg);if(v.spr){unitLayer.remove(v.spr);v.spr.material.dispose();for(const t of v.tx)t.dispose();}views.delete(v.e.id);}
function sprUpdate(v,dt){const m=v.m,e=v.e;let k=!e.alive?'death':(v.one||'walk');if(k==='walk'&&m.anims.walk.n<2)k='idle';
  if(k!==v.sprK){v.sprK=k;v.sprT=0;}v.sprT+=dt;const A=m.anims[k];let f=Math.floor(v.sprT*A.fps);if(A.loop)f%=A.n;else if(f>=A.n){f=A.n-1;if(k!=='death')v.one=null;}
  const a=camFacing(v.yaw),aa=Math.abs(a),step=180/(m.dirs.length-1);let di=v.sprDir;if(di<0||Math.abs(aa-di*step)>step*0.5+6)di=Math.max(0,Math.min(m.dirs.length-1,Math.round(aa/step)));
  let mir=v.sprMir;if(v.sprDir<0||(a<-4&&!mir)||(a>4&&mir))mir=a<0;v.sprDir=di;v.sprMir=mir;
  const F=m.frames[di][A.row][f],pg=F[0],t=v.tx[pg],PW=m.pages[pg][0],PH=m.pages[pg][1];
  if(pg!==v.sprPg){v.sprPg=pg;v.spr.material.map=t;v.spr.material.needsUpdate=true;}
  t.repeat.set((mir?-1:1)*F[3]/PW,F[4]/PH);t.offset.set((mir?F[1]+F[3]:F[1])/PW,1-(F[2]+F[4])/PH);v.spr.center.set(mir?1-F[5]/F[3]:F[5]/F[3],1-F[6]/F[4]);
  _sp.copy(v.g.position);_sp.y+=v.hover;_cp.copy(camera.position).sub(_sp);const dist=_cp.length(),push=Math.min(SPR_PUSH,dist*0.3);
  v.spr.position.copy(_sp).addScaledVector(_cp,push/dist);const ks=(dist-push)/dist*v.k*1.25;v.spr.scale.set(F[3]/m.ppu*ks,F[4]/m.ppu*ks,1);
  if(e.alive)v.topY=v.hover+Math.min(2.2,F[6]/m.ppu*v.k*1.25);
  v.flash=Math.max(0,v.flash-dt*6);v.spr.material.color.copy(v.tint).multiplyScalar(1+v.flash*1.4);if(e.slowT>0)v.spr.material.color.lerp(new THREE.Color(0x8ab8ff),0.45);if(e.poisonT>0)v.spr.material.color.lerp(new THREE.Color(0x7aff7a),0.3);
  v.spr.material.opacity=e.alive?1:Math.max(0,1-Math.max(0,v.deadT-0.7)/0.5);}
function updateViews(dt){for(const v of [...views.values()]){const e=v.e;
    if(!e.alive){v.deadT+=dt;if(e.leaked&&v.deadT>0.25||v.deadT>1.3){dropView(v);continue;}}
    else{const [x,z]=cw(e.x,e.y);const dx=x-v.g.position.x,dz=z-v.g.position.z;if(dx*dx+dz*dz>1e-6)v.yaw=Math.atan2(dx,dz);v.g.position.set(x,0,z);}
    if(v.spr&&v.m)sprUpdate(v,dt);
    const show=e.alive&&e.hp<e.maxHp;v.bg.visible=v.fg.visible=show;
    if(show){const bw=e.boss?1.1:0.6,y=v.topY+0.12;v.bg.position.set(v.g.position.x-bw/2-0.02,y,v.g.position.z);v.bg.scale.set(bw+0.04,0.1,1);
      const p=Math.max(0,e.hp/e.maxHp);v.fg.material=e.boss?hpFgM.b:e.poisonT>0?hpFgM.p:e.slowT>0?hpFgM.s:hpFgM.n;v.fg.position.set(v.g.position.x-bw/2,y,v.g.position.z+0.001);v.fg.scale.set(bw*p,0.065,1);}}}
// ---------- gems, towers, rocks ----------
const gemGeo=new THREE.OctahedronGeometry(1,0),spGeo=new THREE.IcosahedronGeometry(1,0),rockGeo=new THREE.DodecahedronGeometry(0.4,0),pedGeo=new THREE.CylinderGeometry(0.3,0.36,1,8),orbitGeo=new THREE.TorusGeometry(0.36,0.03,6,28);
const gemMats={};const gemMat=col=>gemMats[col]||(gemMats[col]=new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.35,metalness:0.1,roughness:0.15,flatShading:true}));
const objs=new Map();// cell index -> {o, kind}
function gemInfo(type,special){return special?T.SPECIAL[type]:T.GEMS[type];}
function makeGemObj(type,q,special,tower){const G=gemInfo(type,special),col=new THREE.Color(G.col).getHex();const g=new THREE.Group();
  const ph=tower?0.42+q*0.06+(special?0.14:0):0.1;const ped=new THREE.Mesh(pedGeo,tmat(tower?(special?0x8a7a5a:0x8a8f9a):0x6a6f7a));ped.scale.set(tower?0.95:0.7,ph,tower?0.95:0.7);ped.position.y=ph/2;ped.castShadow=true;ped.receiveShadow=true;g.add(ped);
  if(tower){const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.3,0.06,8),tmat(special?0xd8b04a:0xb8bcc8));cap.position.y=ph+0.03;g.add(cap);}
  const s=(special?0.26:0.17+q*0.035)*(tower?1:0.92);const gem=new THREE.Mesh(special?spGeo:gemGeo,gemMat(col));gem.scale.set(s,s*(special?1:1.45),s);gem.position.y=ph+s*1.5+0.06;gem.castShadow=true;g.add(gem);
  if(special){const ob=new THREE.Mesh(orbitGeo,new THREE.MeshBasicMaterial({color:0xffe27a,transparent:true,opacity:0.85}));ob.position.y=gem.position.y;ob.rotation.x=1.2;g.add(ob);g.userData.orbit=ob;}
  if(tower&&q>=3||special){const halo=new THREE.Mesh(discGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.22,depthWrite:false,blending:THREE.AdditiveBlending}));halo.position.y=0.02;halo.scale.setScalar(1.1);g.add(halo);}
  g.userData.gem=gem;g.userData.spin=0.6+Math.random()*0.6;g.userData.h0=gem.position.y;return g;}
function makeRock(c,r){const g=new THREE.Group();const n=2+((c*7+r*3)%2);for(let i=0;i<n;i++){const m=new THREE.Mesh(rockGeo,tmat(i?0x7d7a74:0x8e8a82));const s=0.55+Math.random()*0.35;m.scale.set(s*(i?0.7:1.05),s*(i?0.5:0.85),s*(i?0.7:1));m.position.set(i?(Math.random()-0.5)*0.4:0,m.scale.y*0.28,i?(Math.random()-0.5)*0.4:0);m.rotation.set(Math.random(),Math.random()*6,Math.random());m.castShadow=m.receiveShadow=true;g.add(m);}return g;}
function setObj(c,r,o,kind){const k=T.idx(c,r);const old=objs.get(k);if(old)scene.remove(old.o);if(!o){objs.delete(k);return;}const [x,z]=cw(c,r);o.position.set(x,0,z);scene.add(o);objs.set(k,{o,kind,born:0});o.scale.setScalar(0.01);}
function syncBoard(){// rebuild from game state (used after keep/rock removal/new game)
  for(const [k,v] of objs)scene.remove(v.o);objs.clear();
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){const s=G.g.grid[T.idx(c,r)];if(s===1)setObj(c,r,makeRock(c,r),'rock');}
  for(const t of G.g.towers)setObj(t.c,t.r,makeGemObj(t.type,t.q,t.special,true),'tower');
  for(const gm of G.g.placed)setObj(gm.c,gm.r,makeGemObj(gm.type,gm.q,false,false),'gem');}
// ---------- path preview (marching dots along the BFS route) ----------
const dotGeo=new THREE.CircleGeometry(0.095,10);dotGeo.rotateX(-Math.PI/2);const MAXD=1400;
const dots=new THREE.InstancedMesh(dotGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthWrite:false}),MAXD);dots.renderOrder=1;dots.frustumCulled=false;scene.add(dots);
const fdots=new THREE.InstancedMesh(dotGeo,new THREE.MeshBasicMaterial({color:0x8ad0ff,transparent:true,opacity:0.65,depthWrite:false}),300);fdots.renderOrder=1;fdots.frustumCulled=false;scene.add(fdots);
const _m=new THREE.Matrix4(),_c=new THREE.Color();const LEGC=[0xfff1a0,0xffd06a,0xff9a6a,0xff7aa0,0xd08aff,0x8ab0ff,0x7ae0ff];
function legsOf(path){const out=[];let leg=0,wi=1;for(let i=0;i<path.length;i++){out.push(leg);const w=T.WAYS[wi];if(w&&path[i][0]===w[0]&&path[i][1]===w[1]){leg++;wi++;}}return out;}
let pathShown=null,pathLegs=null,pathT=0;
function setPath(p){pathShown=p;pathLegs=p?legsOf(p):null;}
function drawDots(dt,ins,path,legs,spacing,speed,y,colFn,max){let n=0;if(path&&path.length>1){pathT+=dt*0;let off=(performance.now()/1000*speed)%spacing;
    for(let i=1;i<path.length&&n<max;i++){const a=path[i-1],b=path[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);while(off<L&&n<max){const f=off/L;const [x,z]=cw(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);_m.makeTranslation(x,y,z);ins.setMatrixAt(n,_m);ins.setColorAt(n,_c.setHex(colFn(legs?legs[i]:0)));n++;off+=spacing;}off-=L;}}
  ins.count=n;ins.instanceMatrix.needsUpdate=true;if(ins.instanceColor)ins.instanceColor.needsUpdate=true;}
// ---------- ghost cell, range ring, selection ----------
const cellGeo=new THREE.PlaneGeometry(0.94,0.94);cellGeo.rotateX(-Math.PI/2);
const ghost=new THREE.Mesh(cellGeo,new THREE.MeshBasicMaterial({color:0x50ff70,transparent:true,opacity:0.5,depthWrite:false}));ghost.position.y=0.03;ghost.visible=false;ghost.renderOrder=2;scene.add(ghost);
const ghostGem=makeGemObj('diamond',0,false,false);ghostGem.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=0.45;}});ghostGem.visible=false;scene.add(ghostGem);
const rangeGeo=new THREE.RingGeometry(0.96,1,72);rangeGeo.rotateX(-Math.PI/2);
const range=new THREE.Group();{const r1=new THREE.Mesh(rangeGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,depthWrite:false}));const d1=new THREE.Mesh(new THREE.CircleGeometry(1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.12,depthWrite:false}));range.add(r1,d1);range.userData={r1,d1};}
range.position.y=0.035;range.visible=false;range.renderOrder=2;scene.add(range);
function showRange(c,r,rng,col){const [x,z]=cw(c,r);range.position.set(x,0.035,z);range.scale.set(rng,1,rng);range.userData.r1.material.color.set(col);range.userData.d1.material.color.set(col);range.visible=true;}
const markGeo=new THREE.RingGeometry(0.4,0.48,32);markGeo.rotateX(-Math.PI/2);const marks=[];
function setMarks(list){for(const m of marks)scene.remove(m);marks.length=0;for(const [c,r,col] of list){const m=new THREE.Mesh(markGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.95,depthWrite:false}));const [x,z]=cw(c,r);m.position.set(x,0.04,z);m.renderOrder=3;scene.add(m);marks.push(m);}}
// ---------- fx: projectiles, rings, particles, floating text ----------
const orbGeo=new THREE.SphereGeometry(1,10,8);const shots=[];const rings=[];
const addM=col=>new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
function shotFx(tw,e,col,crit){const v=views.get(e.id);const [x0,z0]=cw(tw.c,tw.r);const o=new THREE.Mesh(orbGeo,addM(new THREE.Color(col)));o.scale.setScalar(crit?0.12:0.075);const y0=(objs.get(T.idx(tw.c,tw.r))||{o:{userData:{h0:0.7}}}).o.userData.h0||0.7;
  o.position.set(x0,y0,z0);scene.add(o);const to=v?v.g.position.clone():new THREE.Vector3(...[cw(e.x,e.y)[0],0,cw(e.x,e.y)[1]]);to.y=(v?v.hover:0)+0.35;shots.push({o,from:o.position.clone(),to,v,t:0,dur:0.13+Math.random()*0.04});
  const go=objs.get(T.idx(tw.c,tw.r));if(go)go.pulse=1;}
function ringFx(x,z,col,r,life=0.35,y=0.05){const m=new THREE.Mesh(rangeGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9,depthWrite:false,blending:THREE.AdditiveBlending}));m.position.set(x,y,z);scene.add(m);rings.push({m,t:0,life,r});}
const parts=[];const partGeo=new THREE.SphereGeometry(1,6,4);
function burst(x,y,z,col,n=6,sp=1.6,s=0.05){for(let i=0;i<n;i++){const m=new THREE.Mesh(partGeo,addM(new THREE.Color(col)));m.scale.setScalar(s);m.position.set(x,y,z);scene.add(m);const a=Math.random()*6.28;parts.push({m,v:new THREE.Vector3(Math.cos(a)*sp*Math.random(),1+Math.random()*sp,Math.sin(a)*sp*Math.random()),t:0,life:0.4+Math.random()*0.3});}}
function stepFx(dt){for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t+=dt;const k=Math.min(1,s.t/s.dur);if(s.v&&!s.v.gone){s.to.x=s.v.g.position.x;s.to.z=s.v.g.position.z;}
    s.o.position.lerpVectors(s.from,s.to,k);s.o.position.y+=Math.sin(k*Math.PI)*0.25;if(k>=1){burst(s.o.position.x,s.o.position.y,s.o.position.z,s.o.material.color,3,1,0.035);scene.remove(s.o);s.o.material.dispose();shots.splice(i,1);}}
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=r.t/r.life;r.m.scale.set(r.r*(0.3+0.7*k),1,r.r*(0.3+0.7*k));r.m.material.opacity=0.9*(1-k);if(k>=1){scene.remove(r.m);r.m.material.dispose();rings.splice(i,1);}}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.t+=dt;p.v.y-=4*dt;p.m.position.addScaledVector(p.v,dt);p.m.material.opacity=1-p.t/p.life;if(p.t>=p.life){scene.remove(p.m);p.m.material.dispose();parts.splice(i,1);}}}
const tmpV=new THREE.Vector3();function toScreen(x,y,z){tmpV.set(x,y,z).project(camera);return [(tmpV.x+1)/2*innerWidth,(1-tmpV.y)/2*innerHeight];}
let ftxtN=0;function ftxt(x,y,z,s,cls){if(ftxtN>14)return;const [sx,sy]=toScreen(x,y,z);const d=document.createElement('div');d.className='ftxt '+(cls||'');d.textContent=s;d.style.left=sx+'px';d.style.top=sy+'px';document.body.appendChild(d);ftxtN++;setTimeout(()=>{d.remove();ftxtN--;},900);}
function toast(html,cls,dur=2200){const t=document.createElement('div');t.className='toast '+(cls||'');t.innerHTML=html;$('toasts').appendChild(t);while($('toasts').children.length>3)$('toasts').firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),400);},dur);}
function banner(main,sub){const b=$('banner2');b.innerHTML=main+(sub?`<small>${sub}</small>`:'');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');}
function flash(col){const f=$('flash');f.style.background=col;f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
// ---------- creature icons (cropped from the atlas, front-facing idle frame) ----------
const iconCache={};
function unitIcon(t){if(iconCache[t])return Promise.resolve(iconCache[t]);return loadSpr(t).then(m=>{if(!m)return '';const di=m.dirs.length-1,F=m.frames[di][m.anims.idle.row][0];const img=m.tex[F[0]].image;const c=document.createElement('canvas');const s=Math.max(F[3],F[4]);c.width=c.height=s;
  c.getContext('2d').drawImage(img,F[1],F[2],F[3],F[4],(s-F[3])/2,(s-F[4])/2,F[3],F[4]);return iconCache[t]=c.toDataURL();}).catch(()=>'');}
// ---------- game state + UI ----------
const G={g:null,speed:1,sel:null,ghost:null,rockMode:false,keepSel:null,phase:'title'};
window.__TD=DEBUG?G:undefined;
const best=()=>+(localStorage.getItem('td_best')||0);
function gemChip(type,q,special){const Gm=gemInfo(type,special);return `<div class="gemi${special?' sp':''}" style="--gc:${Gm.col}"></div>`;}
function pips(q){return `<div class="pips">${[0,1,2,3,4].map(i=>`<i class="${i<=q?'on':''}"></i>`).join('')}</div>`;}
const gemName=(type,q,special)=>special?T.SPECIAL[type].n:T.QN[q]+T.GEMS[type].n;
function hud(){const g=G.g;$('hWave').textContent=Math.max(1,(g.phase==='wave'||g.phase==='over'||g.over)?g.wave:g.wave+1);$('hLives').textContent=g.lives;$('hGold').textContent=g.gold;
  const ch=g.chance,cost=T.UPCOST[ch];const ub=$('upBtn');ub.innerHTML=cost?`🎲 概率 Lv${ch} → ${cost}💰`:`🎲 概率 Lv${ch}（满）`;ub.disabled=!cost||g.gold<cost;
  $('rockBtn').innerHTML=G.rockMode?`✖ 取消移除`:`🪨 移除石头 ${T.ROCK_COST}💰`;$('rockBtn').classList.toggle('on',G.rockMode);}
function nextInfo(){const g=G.g;const w=(g.phase==='wave'||g.phase==='over'||g.over)?g.wave:g.wave+1;const d=T.waveDef(w);const tags=[d.fly?'<span class="tag fly">飞行</span>':'',d.fast?'<span class="tag fast">快速</span>':'',d.boss?'<span class="tag boss">首领</span>':'',d.tank?'<span class="tag tank">重甲</span>':''].join('');
  const el=$('tdNext');el.innerHTML=`${g.phase==='wave'?'本波':'下一波'}：<img id="nIcon">${d.n} ×${d.cnt} ${tags}<span class="tag">❤${d.hp}</span>`;unitIcon(d.t).then(u=>{const im=$('nIcon');if(im&&u)im.src=u;});loadSpr(d.t);}
function showPanel(k){for(const p of ['pBuild','pKeep','pWave'])$(p).classList.toggle('hidden',p!==k);}
function renderBuild(){const g=G.g;showPanel('pBuild');const n=g.placed.length;$('bTitle').textContent=`第${g.wave+1}回合 · 建造`;$('bCount').textContent=`放置宝石 ${n}/5`;
  $('bSlots').innerHTML=[0,1,2,3,4].map(i=>{const gm=g.placed[i];if(gm)return `<div class="slot">${gemChip(gm.type,gm.q)}${T.QS[gm.q]}·${T.GEMS[gm.type].n}${pips(gm.q)}</div>`;return `<div class="slot${i===n?' next':''}"><span class="q">?</span>随机宝石</div>`;}).join('');
  setHint(G.rockMode?'点一块石头将其移除（不会阻断路线）':'点空地预览路线，再点一次放置宝石');hud();}
function setHint(s,bad){const h=$('bHint');h.textContent=s;h.classList.toggle('bad',!!bad);}
function optLabel(o){return o.kind==='keep'?'保留':o.kind==='combine2'?'合成 2→1':o.kind==='combine4'?'合成 4→1':'✨特殊';}
function renderKeep(){const g=G.g;showPanel('pKeep');const os=T.keepOptions(g);
  // one card per distinct result; the gem it lands on (host) follows the gem the player tapped on the board
  const cards=[];const by={};for(const o of os){const key=o.kind+'|'+o.res.type+'|'+o.res.q;if(!by[key]){by[key]={kind:o.kind,res:o.res,alts:[]};cards.push(by[key]);}by[key].alts.push(o);}
  cards.sort((a,b)=>(b.kind==='special')-(a.kind==='special')||(b.kind!=='keep')-(a.kind!=='keep')||b.res.q-a.res.q);G.cards=cards;G.keepHost=null;
  $('kOpts').innerHTML=cards.map((o,i)=>{const s=T.towerStats({type:o.res.type,q:o.res.q,special:o.res.special});return `<div class="kopt ${o.kind}" data-i="${i}"><span class="kind">${optLabel(o)}</span>${gemChip(o.res.type,o.res.q,o.res.special)}${gemName(o.res.type,o.res.q,o.res.special)}${o.res.special?'':pips(o.res.q)}<span class="st">⚔${Math.round(s.dmg||s.burn||0)}${s.burn&&!s.dmg?'/秒':''} · 射程${s.rng.toFixed(1)}</span></div>`;}).join('');
  $('kOpts').querySelectorAll('.kopt').forEach(el=>el.onclick=()=>selectKeep(+el.dataset.i));selectKeep(null);hud();}
function selectKeep(i){G.keepSel=i;$('kOpts').querySelectorAll('.kopt').forEach(el=>el.classList.toggle('sel',+el.dataset.i===i));const b=$('keepBtn');
  if(i===null){b.disabled=true;b.textContent='点选一项';range.visible=false;setMarks([]);hideTip();G.keepOpt=null;return;}
  const card=G.cards[i];const o=card.alts.find(a=>a.gem===G.keepHost)||card.alts[0];G.keepOpt=o;S.tick();b.disabled=false;b.textContent=o.kind==='keep'?'✔ 保留为防御塔':o.kind==='special'?'✨ 合成特殊宝石':'✔ 合成并保留';
  const s=T.towerStats({type:o.res.type,q:o.res.q,special:o.res.special});showRange(o.gem.c,o.gem.r,s.rng,gemInfo(o.res.type,o.res.special).col);
  setMarks([[o.gem.c,o.gem.r,0xffd75e],...o.use.filter(u=>u!==o.gem).map(u=>[u.c,u.r,0xff9a3a])]);
  const [x,z]=cw(o.gem.c,o.gem.r);const [sx,sy]=toScreen(x,1.0,z);showTip(towerTipHTML({type:o.res.type,q:o.res.q,special:o.res.special})+(card.alts.length>1?'<br><span class="dim">点棋盘上的宝石可选择放置位置</span>':''),sx,sy-10);}
function renderWave(){const g=G.g;showPanel('pWave');$('wTitle').textContent=`第${g.wave}波 · ${g.cur.n}`;waveProg();hud();}
function waveProg(){const g=G.g;if(!g.cur)return;const left=g.spawnQ.length+g.enemies.filter(e=>e.alive).length;$('wLeft').textContent=`剩余 ${left}/${g.cur.cnt}`;$('wFill').style.width=(100*(1-left/g.cur.cnt))+'%';}
// tips
function towerTipHTML(tw){const s=T.towerStats(tw);const G0=gemInfo(tw.type,tw.special);
  return `<b style="color:${G0.col}">${gemName(tw.type,tw.q,tw.special)}</b><br>${s.dmg?`伤害 ${Math.round(s.dmg)} · 攻速 ${(1/s.cd).toFixed(1)}/秒`:''}${s.burn?` 灼烧 ${Math.round(s.burn)}/秒`:''} · 射程 ${s.rng.toFixed(1)}<br><span class="eff">${G0.d}</span>${tw.kills!=null?`<br><span class="dim">击杀 ${tw.kills} · 总伤害 ${Math.round(tw.dmg||0)}</span>`:''}${tw.special?'':`<br><span class="dim">配方：${recipeUses(tw.type,tw.q)}</span>`}`;}
function recipeUses(type,q){const L=Object.values(T.SPECIAL).filter(S=>S.recipe.some(([t,qq])=>t===type&&qq===q)).map(S=>S.n);return L.length?L.join('、'):'—';}
function showTip(html,x,y){const t=$('tdTip');t.innerHTML=html;t.classList.add('show');const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(6,Math.min(innerWidth-w-6,x-w/2))+'px';
  // keep the tip off the tapped cell: tapped low on screen -> tip under the HUD, tapped high -> tip just above the bottom panel
  t.style.top=(y>innerHeight*0.42?84:innerHeight-216-h)+'px';}
function hideTip(){$('tdTip').classList.remove('show');}
// ---------- flow ----------
function newGame(){SFX.init();SFX.setTrack('battle');S.go();G.g=T.newGame(DEBUG&&/[?&]seed=(\d+)/.test(location.search)?+RegExp.$1:undefined);G.ghost=null;G.rockMode=false;G.sel=null;
  for(const v of [...views.values()])dropView(v);syncBoard();setPath(G.g.path);$('tdTitle').classList.remove('show');$('tdOver').classList.remove('show');
  for(const id of ['tdHud','tdNext','tdPanel'])$(id).classList.remove('hidden');G.g.events.length=0;renderBuild();nextInfo();banner('第 1 回合','放置 5 颗宝石');G.phase='play';
  if(DEBUG&&/[?&]gold=(\d+)/.test(location.search))G.g.gold=+RegExp.$1;if(DEBUG&&/[?&]spd=(\d+)/.test(location.search)){G.speed=+RegExp.$1;$('speedBtn').textContent=G.speed+'×';}hud();}
function clearSel(){G.ghost=null;ghost.visible=false;ghostGem.visible=false;range.visible=false;setPath(G.g.path);hideTip();}
function tapCell(c,r,sx,sy){const g=G.g;if(!g||G.phase!=='play')return;const inB=c>=0&&r>=0&&c<W&&r<H;const k=inB?g.grid[T.idx(c,r)]:-1;
  if(g.phase==='keep'){if(k===3){const gm=g.placed.find(x=>x.c===c&&x.r===r);G.keepHost=gm;let i=G.keepSel!==null&&G.cards[G.keepSel].alts.some(a=>a.gem===gm)?G.keepSel:G.cards.findIndex(cd=>cd.kind==='keep'&&cd.alts.some(a=>a.gem===gm));if(i>=0){selectKeep(i);const el=$('kOpts').querySelector(`[data-i="${i}"]`);if(el)el.scrollIntoView({inline:'center',behavior:'smooth'});}}
    else if(k===2){const tw=g.towers.find(t=>t.c===c&&t.r===r);const s=T.towerStats(tw);showRange(c,r,s.rng,gemInfo(tw.type,tw.special).col);showTip(towerTipHTML(tw),sx,sy);}return;}
  if(k===2){const tw=g.towers.find(t=>t.c===c&&t.r===r);const s=T.towerStats(tw);S.tick();G.ghost=null;ghost.visible=ghostGem.visible=false;setPath(g.path);showRange(c,r,s.rng,gemInfo(tw.type,tw.special).col);showTip(towerTipHTML(tw),sx,sy);return;}
  if(g.phase!=='build'){range.visible=false;hideTip();return;}
  if(k===1){if(G.rockMode){const res=T.removeRock(g,c,r);if(res.ok){S.thunk();const [x,z]=cw(c,r);burst(x,0.3,z,0x9a958c,10,1.8,0.06);setObj(c,r,null);setPath(g.path);toast(`🪨 移除石头 −${T.ROCK_COST}💰`);hud();}else{S.tick();setHint(res.reason,true);toast(res.reason,'bad');}}
    else{showTip('<b>石头</b><br><span class="dim">可点“🪨 移除石头”花费10金币移除</span>',sx,sy);range.visible=false;}return;}
  if(k===3){const gm=g.placed.find(x=>x.c===c&&x.r===r);showTip(towerTipHTML({type:gm.type,q:gm.q}),sx,sy);showRange(c,r,T.towerStats(gm).rng,T.GEMS[gm.type].col);return;}
  hideTip();range.visible=false;
  if(G.rockMode){setHint('请点一块石头',true);return;}
  if(G.ghost&&G.ghost[0]===c&&G.ghost[1]===r){const res=T.place(g,c,r);if(res.ok){placeFx(res.gem);clearSel();return;}}
  const t=T.testPlace(g,c,r);G.ghost=[c,r];const [x,z]=cw(c,r);ghost.position.set(x,0.03,z);ghost.visible=true;
  if(t.ok){ghost.material.color.set(0x50ff70);ghostGem.visible=true;ghostGem.position.set(x,0,z);setPath(t.path);const d=t.path.length-g.path.length;setHint(`路线 ${t.path.length} 格（${d>=0?'+':''}${d}）· 再点一次放置`);S.tick();}
  else{ghost.material.color.set(0xff3a2a);ghostGem.visible=false;setPath(g.path);setHint('⛔ '+t.reason,true);if(t.block){toast('⛔ 不能完全阻断敌人路线！','bad');S.sting();flashPath=0.6;}else S.tick();}}
let flashPath=0;
function placeFx(gm){const o=makeGemObj(gm.type,gm.q,false,false);setObj(gm.c,gm.r,o,'gem');const [x,z]=cw(gm.c,gm.r);const col=T.GEMS[gm.type].col;burst(x,0.4,z,col,10,1.6,0.05);ringFx(x,z,col,0.7);S.pick();if(gm.q>=2)S.rare();
  ftxt(x,0.9,z,gemName(gm.type,gm.q),gm.q>=3?'crit':'');renderBuild();}
function onKeepConfirm(){const g=G.g;if(!G.keepOpt||g.phase!=='keep')return;const o=G.keepOpt;G.keepOpt=null;const isSp=o.kind==='special',isC=o.kind!=='keep';T.keep(g,o);
  setMarks([]);range.visible=false;hideTip();syncBoard();setPath(g.path);const [x,z]=cw(o.gem.c,o.gem.r);const col=gemInfo(o.res.type,o.res.special).col;
  if(isSp){S.rare();S.syn();flash('rgba(255,215,94,.35)');banner('✨ '+T.SPECIAL[o.res.type].n,'特殊宝石合成成功');for(let i=0;i<3;i++)setTimeout(()=>ringFx(x,z,col,1.4,0.5),i*120);burst(x,0.8,z,col,24,2.4,0.06);}
  else if(isC){S.syn();banner('合成！',gemName(o.res.type,o.res.q));ringFx(x,z,col,1.2,0.45);burst(x,0.8,z,col,16,2,0.05);}
  else{S.click();ringFx(x,z,col,0.9);}
  const d=g.cur;setTimeout(()=>{if(G.g===g&&g.phase==='wave')banner(`第 ${g.wave} 波`,`${d.n} ×${d.cnt}${d.fly?' · 飞行（无视迷宫）':''}${d.boss?' · 首领！':''}${d.fast?' · 快速':''}`);},isSp||isC?900:0);
  SFX.setTrack(d.boss?'boss':'battle');if(d.boss)S.roar();renderWave();nextInfo();}
function processEvents(){const g=G.g;for(const ev of g.events){
  switch(ev.k){
   case 'keep':renderKeep();break;
   case 'spawn':{makeView(ev.e);if(ev.e.boss)S.roar();else S.spawn&&Math.random()<0.25&&S.spawn();break;}
   case 'shot':{shotFx(ev.tw,ev.e,ev.col,ev.crit);const v=views.get(ev.e.id);if(v)v.flash=1;if(ev.crit){const [x,z]=cw(ev.e.x,ev.e.y);ftxt(x,0.9,z,'暴击!','crit');S.crit();}else{const ty=ev.tw.type;if(Math.random()<0.35){if(ty==='aquamarine'||ty==='topaz'||ty==='malachite')S.bow();else if(ty==='sapphire'||ty==='amethyst'||ty==='silver')S.zap();else S.magic();}}break;}
   case 'splash':{const [x,z]=cw(ev.x,ev.y);ringFx(x,z,ev.col,ev.r,0.3);if(Math.random()<0.3)S.boom();break;}
   case 'burn':{const [x,z]=cw(ev.tw.c,ev.tw.r);ringFx(x,z,0xff5a3a,ev.rng,0.5,0.06);break;}
   case 'die':{const v=views.get(ev.e.id);const [x,z]=cw(ev.e.x,ev.e.y);if(v)v.deadT=0;burst(x,0.4,z,0xffd75e,5,1.2,0.04);ftxt(x,0.7,z,'+'+ev.gold,'gold');S.death();S.coin();waveProg();hud();break;}
   case 'leak':{const [x,z]=cw(ev.e.x,ev.e.y);ftxt(x,0.8,z,'−'+ev.cost+'❤','leak');S.sting();flash('rgba(255,40,30,.25)');const p=$('hLives').parentNode;p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash');waveProg();hud();break;}
   case 'waveClear':{S.coin();S.go();toast(`✅ 第${ev.w}波完成 · 奖励 +${ev.bonus}💰`,'gold');clearSel();setPath(g.path);break;}
   case 'build':if(G.phase==='play'&&g.wave>0&&!g.over){renderBuild();nextInfo();SFX.setTrack('battle');setTimeout(()=>{if(g.phase==='build')banner(`第 ${g.wave+1} 回合`,'放置 5 颗宝石');},700);}break;
   case 'victory':{S.win();setTimeout(()=>gameOver(true),600);break;}
   case 'over':{S.lose();setTimeout(()=>gameOver(false),700);break;}
  }}g.events.length=0;}
function gameOver(win){const g=G.g;G.phase='over';const w=win?g.wave:g.wave;const b=best();const nb=Math.max(b,win?g.wave:g.wave-1);localStorage.setItem('td_best',nb);
  $('oTitle').textContent=win?'胜利！':'防线失守';$('oTitle').style.color=win?'#ffd75e':'#ff6a5a';
  $('oSub').innerHTML=win?`守住了全部 ${T.MAXW} 波！剩余生命 ${g.lives} · 击杀 ${g.kills}<br>最高纪录：守住 ${nb} 波`:`倒在第 ${g.wave} 波 · 击杀 ${g.kills} · 宝石塔 ${g.towers.length} 座<br>最高纪录：守住 ${nb} 波`;
  $('oCont').style.display=win?'':'none';$('tdOver').classList.add('show');SFX.setTrack('menu');}
// ---------- input ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
let ptr=null;
cv.addEventListener('pointerdown',e=>{ptr={x:e.clientX,y:e.clientY,t:performance.now()};});
cv.addEventListener('pointerup',e=>{if(!ptr)return;const p=ptr;ptr=null;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>14||performance.now()-p.t>700)return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const gp=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,gp))return;
  // tall towers: prefer the tower whose top is under the finger
  const c=Math.floor(gp.x+W2),r=Math.floor(gp.z+H2);tapCell(c,r,e.clientX,e.clientY);});
$('tdStart').onclick=()=>{S.click();newGame();};$('oAgain').onclick=()=>{S.click();newGame();};
$('oCont').onclick=()=>{S.click();$('tdOver').classList.remove('show');G.phase='play';SFX.setTrack('battle');};
$('keepBtn').onclick=onKeepConfirm;
$('upBtn').onclick=()=>{const g=G.g;if(T.upgradeChance(g)){S.rare();toast(`🎲 宝石概率提升到 Lv${g.chance}：${oddsStr(g.chance)}`,'gold',3000);hud();}else S.tick();};
$('rockBtn').onclick=()=>{S.click();G.rockMode=!G.rockMode;clearSel();renderBuild();};
$('oddsBtn').onclick=()=>{S.click();const g=G.g;showTip(`<b>宝石概率 Lv${g.chance}</b><br>${oddsStr(g.chance)}${T.UPCOST[g.chance]?`<br><span class="dim">下一级 Lv${g.chance+1}：${oddsStr(g.chance+1)}</span>`:''}`,innerWidth/2,innerHeight-200);};
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};
$('muteBtn').onclick=()=>{SFX.init();SFX.setMuted(!SFX.muted);$('muteBtn').textContent=SFX.muted?'🔇':'🔊';};$('muteBtn').textContent=SFX.muted?'🔇':'🔊';
$('homeBtn').onclick=()=>{S.click();if(!G.g||G.g.over||confirm('放弃本局，返回标题？')){G.phase='title';$('tdTitle').classList.add('show');for(const id of ['tdHud','tdNext','tdPanel'])$(id).classList.add('hidden');SFX.setTrack('menu');refreshTitle();}};
$('recipeBtn').onclick=()=>{S.click();openBook();};$('bookClose').onclick=()=>{S.click();$('tdBook').classList.remove('show');};
function oddsStr(lv){const o=T.ODDS[lv];return o.map((p,q)=>p?`${T.QS[q]}${p}%`:'').filter(Boolean).join(' ');}
function openBook(){const rows=Object.entries(T.GEMS).map(([k,g])=>`<div class="row"><div class="gemi" style="--gc:${g.col}"></div><div><b>${g.n}</b> · ${g.d}</div></div>`).join('');
  const sp=Object.entries(T.SPECIAL).map(([k,s])=>`<div class="row"><div class="gemi sp" style="--gc:${s.col}"></div><div><b>${s.n}</b> = ${s.recipe.map(([t,q])=>T.QN[q]+T.GEMS[t].n).join(' + ')}<br><span style="color:#9fb0e8">${s.d}</span></div></div>`).join('');
  const odds=`<table><tr><th>Lv</th>${T.QS.map(q=>`<th>${q}</th>`).join('')}<th>升级</th></tr>${T.ODDS.map((o,i)=>`<tr><td>${i}</td>${o.map(p=>`<td>${p||''}</td>`).join('')}<td>${T.UPCOST[i]||'—'}</td></tr>`).join('')}</table>`;
  $('bookBody').innerHTML=`<h3>宝石（品质：碎裂→有瑕疵→普通→无瑕→完美）</h3>${rows}<h3>合成</h3>2 颗相同宝石（同种同品质）→ 高一级；4 颗相同 → 高两级。<h3>特殊宝石配方</h3>${sp}<h3>宝石概率（%）</h3>${odds}`;$('tdBook').classList.add('show');}
function refreshTitle(){const b=best();$('tdBest').innerHTML=b?`最高纪录：守住 <b>${b}</b> 波`:'';}
refreshTitle();
// ---------- main loop ----------
const clock=new THREE.Clock();let fpsA=60;
function frame(){requestAnimationFrame(frame);const dt=Math.min(0.05,clock.getDelta());fpsA=fpsA*0.95+(1/Math.max(dt,0.001))*0.05;const g=G.g;
  if(g&&G.phase==='play'){if(g.phase==='wave'){const n=G.speed*2;for(let i=0;i<n;i++){T.stepWave(g,dt/2);if(g.phase!=='wave')break;}}processEvents();}
  updateViews(dt*(g&&g.phase==='wave'?G.speed:1));stepFx(dt*(G.speed||1));
  const tnow=performance.now()/1000;
  for(const v of objs.values()){if(v.o.scale.x<1)v.o.scale.setScalar(Math.min(1,v.o.scale.x+dt*5));const ud=v.o.userData;if(ud.gem){ud.gem.rotation.y+=dt*ud.spin;ud.gem.position.y=ud.h0+Math.sin(tnow*2+ud.spin*9)*0.03;if(v.pulse){v.pulse=Math.max(0,v.pulse-dt*6);ud.gem.material.emissiveIntensity=0.35+v.pulse;}}if(ud.orbit)ud.orbit.rotation.z+=dt*2;}
  if(ghostGem.visible)ghostGem.userData.gem.rotation.y+=dt;
  for(const mk of markers){mk.ring.material.opacity=0.65+Math.sin(tnow*3)*0.25;}
  for(const m of marks)m.rotation.y+=dt*1.5;
  // path dots: bright marching dots in build/keep, faint during waves; flash red after a blocked placement
  const build=g&&(g.phase==='build'||g.phase==='keep');flashPath=Math.max(0,flashPath-dt);
  dots.material.opacity=build?0.92:0.32;
  drawDots(dt,dots,pathShown,pathLegs,0.42,build?1.4:0.6,0.03,l=>flashPath>0?0xff4a3a:(G.ghost&&build?0xfff27a:LEGC[l%LEGC.length]),MAXD);
  // flyer route preview for flying waves (straight lines between checkpoints)
  const nw=g?T.waveDef((g.phase==='wave'||g.phase==='over'||g.over)?g.wave:g.wave+1):null;drawDots(dt,fdots,nw&&nw.fly&&build?T.flyPath():null,null,0.5,1,0.045,()=>0x8ad0ff,300);
  renderer.render(scene,camera);}
frame();
if(DEBUG)window.__TDX={T,G,camera,renderer,views,objs,fps:()=>fpsA,tapCell,cw,toScreen,newGame};
// ?autostart for quick testing
if(/[?&]start/.test(location.search))newGame();

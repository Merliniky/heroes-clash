// 宝石塔防 · Gem TD mode — rendering + touch UI on top of td_core.js (rules) and the shared sprite atlases
import * as THREE from 'three';
import {SPR_UNITS,SPR_ALIAS,SPR_K,SPR_V} from './sprdata.js?v=22';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const T=window.TD,S=SFX.S,$=id=>document.getElementById(id);
const DEBUG=/[?&]debug/.test(location.search);
const W=T.W,H=T.H,W2=W/2,H2=H/2;
const cw=(c,r)=>[c-W2+0.5,r-H2+0.5];
const now=()=>performance.now()/1000;
// ---------- renderer / scene: saturated Clash-style daylight ----------
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
let PR=Math.min(2,devicePixelRatio||1);renderer.setPixelRatio(PR);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.98;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x76b9e6);scene.fog=new THREE.Fog(0x76b9e6,30,60);
const camera=new THREE.PerspectiveCamera(40,1,0.5,90);
scene.add(new THREE.HemisphereLight(0xdcefff,0x4f7a2c,1.05));
const sun=new THREE.DirectionalLight(0xfff0d0,2.45);sun.position.set(-6,15,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-12,right:12,top:13,bottom:-13,near:1,far:45});sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.025;scene.add(sun);scene.add(sun.target);
const ramp=(()=>{const d=new Uint8Array([110,110,110,255,190,190,190,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
const toonM={};const tmat=(c,em=0,ei=0)=>{const k=c+'|'+em+'|'+ei;return toonM[k]||(toonM[k]=new THREE.MeshToonMaterial({color:c,gradientMap:ramp,emissive:em||0,emissiveIntensity:ei}));};
const vtoon=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:ramp});
function cnv(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const glowTex=cnv(64,64,(x)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.25,'rgba(255,255,255,.75)');g.addColorStop(0.6,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);});
const puffTex=cnv(64,64,(x)=>{for(const [cx,cy,r] of [[32,34,20],[22,30,13],[42,28,14],[30,22,12],[38,40,12]]){const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(0.7,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();}});
const shadowTex=cnv(64,64,(x)=>{const g=x.createRadialGradient(32,32,2,32,32,32);g.addColorStop(0,'rgba(0,0,0,.62)');g.addColorStop(0.5,'rgba(0,0,0,.34)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,64,64);});
// ---------- board: grass arena, stone wall frame, corner towers, portal + gate, decorations ----------
function boardTex(){const P=64;return cnv(W*P,H*P,(x,cw_,ch)=>{
  for(let i=0;i<W;i++)for(let j=0;j<H;j++){x.fillStyle=(i+j)%2?'#6cc23c':'#61b535';x.fillRect(i*P,j*P,P,P);}
  for(let k=0;k<4200;k++){const l=Math.random();x.fillStyle=l<0.5?`rgba(60,140,30,${0.18+Math.random()*0.2})`:`rgba(190,240,120,${0.12+Math.random()*0.16})`;x.fillRect(Math.random()*cw_,Math.random()*ch,2,4+Math.random()*4);}
  x.strokeStyle='rgba(255,255,255,0.10)';x.lineWidth=2;for(let i=1;i<W;i++){x.beginPath();x.moveTo(i*P,0);x.lineTo(i*P,ch);x.stroke();}for(let j=1;j<H;j++){x.beginPath();x.moveTo(0,j*P);x.lineTo(cw_,j*P);x.stroke();}
  // inner shadow along the walls
  const e=46;for(const [x0,y0,x1,y1,w,h] of [[0,0,0,e,cw_,e],[0,ch,0,ch-e,cw_,e],[0,0,e,0,e,ch],[cw_,0,cw_-e,0,e,ch]]){const g=x.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'rgba(20,60,10,.45)');g.addColorStop(1,'rgba(20,60,10,0)');x.fillStyle=g;x.fillRect(Math.min(x0,x1),Math.min(y0,y1),w,h);}
});}
{const t=boardTex();t.anisotropy=4;const p=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshToonMaterial({map:t,gradientMap:ramp}));p.rotation.x=-Math.PI/2;p.receiveShadow=true;scene.add(p);
  const out=new THREE.Mesh(new THREE.PlaneGeometry(90,90),tmat(0x62b23d));out.rotation.x=-Math.PI/2;out.position.y=-0.02;out.receiveShadow=true;scene.add(out);}
const BOX=new THREE.BoxGeometry(1,1,1);
// stone wall: one instanced mesh of blocks + merlons
{const blocks=[];const WT=0.5,WH=0.42,X=W2+WT/2,Z=H2+WT/2;
  const add=(x,z,sx,sy,sz,y,c)=>blocks.push([x,y,z,sx,sy,sz,c]);
  for(let i=0;i<W+1;i++){const x=-W2+i-0.0;for(const zs of [-1,1]){if(Math.abs(x)<1.05)continue;const c=(i%2)?0xb3aea4:0xc4bfb3;add(x,zs*Z,1.0,WH,WT,WH/2,c);if(i%2===0)add(x,zs*Z,0.42,0.2,WT*0.9,WH+0.1,0xd3cec2);}}
  for(let j=0;j<H+1;j++){const z=-H2+j;for(const xs of [-1,1]){const c=(j%2)?0xb3aea4:0xc4bfb3;add(xs*X,z,WT,WH,1.0,WH/2,c);if(j%2===0)add(xs*X,z,WT*0.9,0.2,0.42,WH+0.1,0xd3cec2);}}
  const im=new THREE.InstancedMesh(BOX,tmat(0xffffff),blocks.length);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();
  blocks.forEach(([x,y,z,sx,sy,sz,col],i)=>{m.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(sx,sy,sz));im.setMatrixAt(i,m);im.setColorAt(i,c.setHex(col));});
  im.castShadow=im.receiveShadow=true;scene.add(im);
  // corner towers: enemy side red roofs (top), player side blue roofs (bottom)
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const g=new THREE.Group();const top=sz<0;const h=top?1.35:0.85;
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.62,0.72,h,10),tmat(0xbdb8ad));body.position.y=h/2;g.add(body);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.66,0.16,10),tmat(0xd6d1c5));rim.position.y=h+0.04;g.add(rim);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(0.78,0.8,10),tmat(top?0xe0453a:0x3b7fe6));roof.position.y=h+0.52;g.add(roof);
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),tmat(0xffd04a,0x7a5a00,0.3));tip.position.y=h+0.98;g.add(tip);
    g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});g.position.set(sx*(W2+0.45),0,sz*(H2+0.45));scene.add(g);}}
// entrance portal (top) — stone arch with a swirling violet vortex
const portalSwirl=(()=>{const g=new THREE.Group();const st=tmat(0x9b93a6),st2=tmat(0x7f778c);
  for(const s of [-1,1]){const p=new THREE.Mesh(BOX,st);p.scale.set(0.42,1.45,0.55);p.position.set(s*1.05,0.72,0);g.add(p);const cap=new THREE.Mesh(BOX,st2);cap.scale.set(0.56,0.18,0.66);cap.position.set(s*1.05,1.5,0);g.add(cap);
    const cr=new THREE.Mesh(new THREE.OctahedronGeometry(0.16,0),new THREE.MeshPhongMaterial({color:0xc58aff,emissive:0xa040ff,emissiveIntensity:0.8,flatShading:true}));cr.position.set(s*1.05,1.78,0);g.add(cr);}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(1.05,0.2,6,18,Math.PI),st);arch.position.y=1.45;g.add(arch);
  const tex=cnv(128,128,(x)=>{x.translate(64,64);for(let i=0;i<5;i++){x.rotate(Math.PI*2/5);const gr=x.createLinearGradient(0,0,60,0);gr.addColorStop(0,'rgba(255,230,255,1)');gr.addColorStop(1,'rgba(150,60,255,0)');x.strokeStyle=gr;x.lineWidth=9;x.beginPath();for(let a=0;a<3.2;a+=0.1){const r=a*19;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.stroke();}
    const rg=x.createRadialGradient(0,0,0,0,0,62);rg.addColorStop(0,'rgba(255,255,255,.9)');rg.addColorStop(0.35,'rgba(190,110,255,.55)');rg.addColorStop(1,'rgba(90,20,200,0)');x.fillStyle=rg;x.beginPath();x.arc(0,0,64,0,7);x.fill();});
  const back=new THREE.Mesh(new THREE.CircleGeometry(0.98,28),new THREE.MeshBasicMaterial({color:0x2a0d55}));back.position.set(0,1.0,-0.05);g.add(back);
  const sw=new THREE.Mesh(new THREE.CircleGeometry(0.98,28),new THREE.MeshBasicMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sw.position.set(0,1.0,0.02);g.add(sw);
  const pool=new THREE.Mesh(new THREE.CircleGeometry(1.1,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowTex,color:0xa050ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pool.position.set(0,0.02,0.55);g.add(pool);
  g.traverse(o=>{if(o.isMesh&&o.material.isMeshToonMaterial){o.castShadow=true;o.receiveShadow=true;}});g.position.set(0,0,-H2-0.25);scene.add(g);return sw;})();
// exit gate (bottom) — low castle gate with blue roofs and open wooden doors (kept low so it never hides row 18)
const gateGlow=(()=>{const g=new THREE.Group();const st=tmat(0xc4bfb3),wood=tmat(0x8a5a30);
  for(const s of [-1,1]){const p=new THREE.Mesh(BOX,st);p.scale.set(0.5,0.85,0.6);p.position.set(s*1.05,0.42,0);g.add(p);const r=new THREE.Mesh(new THREE.ConeGeometry(0.46,0.55,8),tmat(0x3b7fe6));r.position.set(s*1.05,1.12,0);g.add(r);const fl=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,6),tmat(0xffd04a));fl.position.set(s*1.05,1.45,0);g.add(fl);
    const d=new THREE.Mesh(BOX,wood);d.scale.set(0.75,0.62,0.07);d.geometry=BOX;const dg=new THREE.Group();d.position.set(-s*0.38,0.31,0);dg.add(d);dg.position.set(s*0.8,0,0.1);dg.rotation.y=s*0.7;g.add(dg);}
  const glow=new THREE.Mesh(new THREE.CircleGeometry(1.0,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowTex,color:0x4aa8ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.7}));glow.position.set(0,0.02,-0.5);g.add(glow);
  g.traverse(o=>{if(o.isMesh&&o.material.isMeshToonMaterial){o.castShadow=true;o.receiveShadow=true;}});g.position.set(0,0,H2+0.25);scene.add(g);return glow;})();
// decorations outside the arena: round Clash-style trees, bushes, flowers (all instanced)
{const R=(()=>{let s=11;return ()=>(s=(s*16807)%2147483647)/2147483647;})();const spots=[];
  for(let i=0;i<70;i++){const side=R();let x,z;if(side<0.5){x=(R()-0.5)*(W+14);z=-H2-1.4-R()*6;}else if(side<0.75){x=-(W2+1.3+R()*5);z=(R()-0.5)*(H+8);}else{x=W2+1.3+R()*5;z=(R()-0.5)*(H+8);}
    if(Math.abs(x)<2.3&&z<-H2)continue;spots.push([x,z]);}
  const trunkG=new THREE.CylinderGeometry(0.08,0.12,0.5,6),puffG=new THREE.IcosahedronGeometry(0.5,0);
  const trunks=new THREE.InstancedMesh(trunkG,tmat(0x7a5230),spots.length),puffs=new THREE.InstancedMesh(puffG,tmat(0xffffff),spots.length*3);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color(),v=new THREE.Vector3(),s=new THREE.Vector3();let pi=0;
  spots.forEach(([x,z],i)=>{const k=0.8+R()*0.6;m.compose(v.set(x,0.25*k,z),q,s.set(k,k,k));trunks.setMatrixAt(i,m);const base=[0x3f9a36,0x4aae3e,0x56b845][i%3];
    for(let j=0;j<3;j++){const a=j*2.1+R(),r=j?0.28*k:0;q.setFromEuler(new THREE.Euler(R()*3,R()*3,R()*3));const ps=(j?0.62:0.8)*k;m.compose(v.set(x+Math.cos(a)*r,(0.75+(j?0.1:0.25))*k,z+Math.sin(a)*r),q,s.set(ps,ps*0.9,ps));puffs.setMatrixAt(pi,m);puffs.setColorAt(pi++,c.setHex(base).offsetHSL(0,0,(R()-0.5)*0.08));}});
  q.identity();trunks.castShadow=puffs.castShadow=true;scene.add(trunks,puffs);
  const fl=new THREE.InstancedMesh(new THREE.SphereGeometry(0.07,6,4),tmat(0xffffff),160);for(let i=0;i<160;i++){const side=i%3;const x=side===0?(R()-0.5)*(W+10):side===1?-(W2+0.8+R()*4):W2+0.8+R()*4;const z=side===0?-H2-0.9-R()*4:(R()-0.5)*(H+6);m.compose(v.set(x,0.05,z),q,s.set(1,0.6,1));fl.setMatrixAt(i,m);fl.setColorAt(i,c.setHex([0xffffff,0xffe14a,0xff7ab0,0xb48aff][i%4]));}scene.add(fl);
  const bush=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.32,0),tmat(0x3c9a3a),40);for(let i=0;i<40;i++){const x=(i%2?1:-1)*(W2+0.95+R()*0.5),z=(R()-0.5)*(H+2);m.compose(v.set(x,0.16,z),q.setFromEuler(new THREE.Euler(R(),R()*6,0)),s.set(1,0.75,1));bush.setMatrixAt(i,m);}q.identity();bush.castShadow=true;scene.add(bush);}
// checkpoints: stone plates on the trail + numbered flags
function numTex(n,col){return cnv(64,64,(x)=>{x.fillStyle=col;x.beginPath();x.arc(32,32,27,0,6.3);x.fill();x.lineWidth=6;x.strokeStyle='#2a1c08';x.stroke();x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.ellipse(32,22,17,8,0,0,6.3);x.fill();
  x.fillStyle='#2a1c08';x.font='900 34px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(n,32,35);});}
const ringGeo=new THREE.RingGeometry(0.36,0.46,40);ringGeo.rotateX(-Math.PI/2);const discGeo=new THREE.CircleGeometry(0.47,32);discGeo.rotateX(-Math.PI/2);
const markers=[];const plateGeo=new THREE.CylinderGeometry(0.44,0.47,0.06,16);
T.WAYS.forEach(([c,r],i)=>{const [x,z]=cw(c,r);const last=i===T.WAYS.length-1,first=i===0;const col=first?0xb05cff:last?0x4aa8ff:0xffd23a;
  const plate=new THREE.Mesh(plateGeo,tmat(first?0x9b86c0:last?0x8eb4dc:0xd8c79a));plate.position.set(x,0.03,z);plate.receiveShadow=true;scene.add(plate);
  const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9,depthWrite:false}));ring.position.set(x,0.065,z);ring.renderOrder=1;scene.add(ring);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:numTex(first?'入':last?'出':String(i),first?'#c88aff':last?'#7ac4ff':'#ffd75e'),depthWrite:false}));sp.scale.set(0.58,0.58,1);sp.position.set(x+0.3,1.0,z-0.3);sp.renderOrder=6;scene.add(sp);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.75,6),tmat(0x6a4a2a));pole.position.set(x+0.3,0.37,z-0.3);pole.castShadow=true;scene.add(pole);
  markers.push({ring,sp,first,last,x,z});});
// ---------- camera fit: arena (incl. wall frame) between the top HUD and the bottom tray ----------
let PITCH=62*Math.PI/180;const camLook=new THREE.Vector3(),camBase=new THREE.Vector3();let shakeA=0;
function fitCamera(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const portrait=h>w*1.1;camera.fov=portrait?40:32;PITCH=(portrait?62:55)*Math.PI/180;camera.updateProjectionMatrix();
  const top=portrait?96:64,bot=portrait?212:164;const yMin=-1+2*bot/h,yMax=1-2*top/h;const XW=W2+0.42,ZT=H2+0.3,ZB=H2+0.55;
  const pts=[[-XW,-ZT],[XW,-ZT],[-XW,ZB],[XW,ZB]].map(([x,z])=>new THREE.Vector3(x,0,z)).concat([[-XW,-ZT],[XW,-ZT]].map(([x,z])=>new THREE.Vector3(x,0.6,z)),[new THREE.Vector3(0,1.9,-H2-0.25)]);
  const dir=new THREE.Vector3(0,Math.sin(PITCH),Math.cos(PITCH));let lo=5,hi=80,shift=0;
  const place=(d,s)=>{camLook.set(0,0,s);camera.position.copy(camLook).addScaledVector(dir,d);camera.lookAt(camLook);camera.updateMatrixWorld();};
  for(let it=0;it<32;it++){const d=(lo+hi)/2;place(d,0);let ok=true;const ys=[];for(const p of pts){const q=p.clone().project(camera);if(Math.abs(q.x)>0.995)ok=false;ys.push(q.y);}if(Math.max(...ys)-Math.min(...ys)>yMax-yMin)ok=false;if(ok)hi=d;else lo=d;}
  const mid=s=>{place(hi,s);const ys=pts.map(p=>p.clone().project(camera).y);return (Math.max(...ys)+Math.min(...ys))/2;};const want=(yMax+yMin)/2;let a=-H,b=H;const inc=mid(b)>mid(a);for(let it=0;it<30;it++){const m=(a+b)/2;if((mid(m)<want)===inc)a=m;else b=m;}shift=(a+b)/2;place(hi,shift);
  camBase.copy(camera.position);scene.fog.near=hi*1.4;scene.fog.far=hi*3;}
addEventListener('resize',fitCamera);fitCamera();
function shake(a){shakeA=Math.max(shakeA,a);}
// ---------- sprites (same atlases + facing logic as the auto-battler) ----------
const sprLoader=new THREE.TextureLoader();const SPR={};
function loadSpr(t){if(SPR_ALIAS[t])return loadSpr(SPR_ALIAS[t][0]);if(!SPR_UNITS.includes(t))return Promise.resolve(null);
  return SPR[t]||(SPR[t]=fetch(`assets/spr/${t}.json?v=${SPR_V}`).then(r=>r.json()).then(m=>Promise.all(m.pages.map((_,i)=>new Promise((res,rej)=>sprLoader.load(`assets/spr/${t}_p${i}.webp?v=${SPR_V}`,res,undefined,rej)))).then(tx=>{for(const x of tx){x.colorSpace=THREE.SRGBColorSpace;x.anisotropy=4;}m.tex=tx;return m;})).catch(e=>{console.warn('spr',t,e);return null;}));}
const shadowMat=new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false});const shadowGeo=new THREE.PlaneGeometry(1,1);shadowGeo.rotateX(-Math.PI/2);
const _cr=new THREE.Vector3(),_cf=new THREE.Vector3(),_sp=new THREE.Vector3(),_cp=new THREE.Vector3();
function camFacing(yaw){_cr.setFromMatrixColumn(camera.matrixWorld,0);_cr.y=0;_cr.normalize();_cf.setFromMatrixColumn(camera.matrixWorld,2);_cf.y=0;_cf.normalize().negate();const fx=Math.sin(yaw),fz=Math.cos(yaw);return Math.atan2(fx*_cr.x+fz*_cr.z,fx*_cf.x+fz*_cf.z)*180/Math.PI;}
const UNIT_K=0.95,SPR_PUSH=1.6;
const views=new Map();const unitLayer=new THREE.Group();scene.add(unitLayer);
const hpBgM=new THREE.SpriteMaterial({color:0x10131f,depthTest:false,transparent:true,opacity:0.85});const hpFgM={n:new THREE.SpriteMaterial({color:0xff4a3a,depthTest:false}),b:new THREE.SpriteMaterial({color:0xff2a8a,depthTest:false}),p:new THREE.SpriteMaterial({color:0x5fdc5a,depthTest:false}),s:new THREE.SpriteMaterial({color:0x6ab8ff,depthTest:false})};
const eRingGeo=new THREE.RingGeometry(0.3,0.4,24).rotateX(-Math.PI/2);const eRingM=new THREE.MeshBasicMaterial({color:0xff3b3b,transparent:true,opacity:0.85,depthWrite:false});const eRingB=new THREE.MeshBasicMaterial({color:0xff2a8a,transparent:true,opacity:0.9,depthWrite:false});
const _slowC=new THREE.Color(0x8ab8ff),_poisC=new THREE.Color(0x7aff7a);
function makeView(e){const g=new THREE.Group();const [x,z]=cw(e.x,e.y);g.position.set(x,0,z);unitLayer.add(g);
  const sh=new THREE.Mesh(shadowGeo,shadowMat);sh.position.y=0.02;sh.renderOrder=2;const sw=e.boss?1.1:0.55;sh.scale.set(sw*1.15,1,sw*0.75);g.add(sh);if(!e.fly){const rg=new THREE.Mesh(eRingGeo,e.boss?eRingB:eRingM);rg.position.y=0.03;rg.renderOrder=2;rg.scale.setScalar(e.boss?1.6:0.95);g.add(rg);}
  const bg=new THREE.Sprite(hpBgM);bg.center.set(0,0.5);bg.renderOrder=8;const fg=new THREE.Sprite(hpFgM.n);fg.center.set(0,0.5);fg.renderOrder=9;scene.add(bg);scene.add(fg);
  const v={e,g,sh,bg,fg,spr:null,yaw:Math.PI,hover:e.fly?0.55:0,k:UNIT_K*(SPR_K[e.type]||1)*(e.boss?1.7:1),deadT:0,sprK:'',sprT:0,sprDir:-1,sprMir:false,sprPg:0,flash:0,topY:0.7,born:now()};
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
  // spawn: rise out of the portal; leak: shrink into the gate
  const age=now()-v.born,grow=Math.min(1,age/0.35),shr=e.leaked?Math.max(0,1-v.deadT/0.25):1;
  _sp.copy(v.g.position);_sp.y+=v.hover;_cp.copy(camera.position).sub(_sp);const dist=_cp.length(),push=Math.min(SPR_PUSH,dist*0.3);
  v.spr.position.copy(_sp).addScaledVector(_cp,push/dist);const ks=(dist-push)/dist*v.k*1.25*grow*shr;v.spr.scale.set(F[3]/m.ppu*ks*(1+v.flash*0.12),F[4]/m.ppu*ks*(1-v.flash*0.08),1);
  if(e.alive)v.topY=v.hover+Math.min(2.2,F[6]/m.ppu*v.k*1.25);
  if(v.wob>0){v.wob=Math.max(0,v.wob-dt*4);v.spr.material.rotation=Math.sin(now()*42)*0.2*v.wob;v.spr.position.x-=Math.sin(v.yaw)*0.1*v.wob;v.spr.position.z-=Math.cos(v.yaw)*0.1*v.wob;}else v.spr.material.rotation=0;
  v.flash=Math.max(0,v.flash-dt*5);const mc=v.spr.material.color;mc.copy(v.tint);if(e.slowT>0)mc.lerp(_slowC,0.45);if(e.poisonT>0)mc.lerp(_poisC,0.3);mc.multiplyScalar(1+v.flash*2.2);
  v.spr.material.opacity=e.alive?1:Math.max(0,1-Math.max(0,v.deadT-0.5)/0.4);}
function updateViews(dt){for(const v of [...views.values()]){const e=v.e;
    if(!e.alive){v.deadT+=dt;if(e.leaked&&v.deadT>0.25||v.deadT>0.95){dropView(v);continue;}}
    else{const [x,z]=cw(e.x,e.y);const dx=x-v.g.position.x,dz=z-v.g.position.z;if(dx*dx+dz*dz>1e-6)v.yaw=Math.atan2(dx,dz);v.g.position.set(x,0,z);}
    if(v.spr&&v.m)sprUpdate(v,dt);
    const show=e.alive&&(e.hp<e.maxHp||e.boss);v.bg.visible=v.fg.visible=show;
    if(show){const bw=e.boss?1.3:0.8,y=v.topY+0.14;v.bg.position.set(v.g.position.x-bw/2-0.03,y,v.g.position.z);v.bg.scale.set(bw+0.06,0.15,1);
      const p=Math.max(0,e.hp/e.maxHp);v.fg.material=e.boss?hpFgM.b:e.poisonT>0?hpFgM.p:e.slowT>0?hpFgM.s:hpFgM.n;v.fg.position.set(v.g.position.x-bw/2,y,v.g.position.z+0.001);v.fg.scale.set(bw*p,0.1,1);}}}
// ---------- gem towers: stone pedestal + big faceted glowing gem; ornaments grow with quality; specials have their own silhouettes ----------
const lathe=(pts,seg)=>{const g=new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)),seg);g.computeVertexNormals();return g;};
const GEO={
  diamond:lathe([[0,-0.55],[0.5,0.02],[0.38,0.24],[0.001,0.25]],8),
  ruby:lathe([[0,-0.48],[0.4,-0.16],[0.46,0.08],[0.3,0.34],[0.001,0.38]],7),
  sapphire:lathe([[0,-0.62],[0.3,-0.3],[0.3,0.3],[0.001,0.62]],6),
  aquamarine:lathe([[0,-0.7],[0.24,-0.46],[0.24,0.46],[0.001,0.7]],6),
  emerald:lathe([[0,-0.42],[0.4,-0.24],[0.46,0.14],[0.3,0.34],[0.001,0.34]],4),
  topaz:(()=>{const g=new THREE.OctahedronGeometry(0.5,0);g.scale(1,0.8,1);return g;})(),
  opal:new THREE.IcosahedronGeometry(0.44,1),
  amethyst:lathe([[0,-0.5],[0.27,-0.3],[0.27,0.3],[0.001,0.58]],6),
  tet:new THREE.TetrahedronGeometry(0.55,0),
};
const STONE_D=tmat(0x7d7488),STONE_L=tmat(0xa79fae),STONE_T=tmat(0xc9c1cc),GOLD=tmat(0xffc83a,0x6a4a00,0.35),IRON=tmat(0x4a4552),OBS=tmat(0x2a2030,0x300010,0.4);
const PG={base:new THREE.CylinderGeometry(0.43,0.47,0.16,8),col:new THREE.CylinderGeometry(0.29,0.34,1,8),cap:new THREE.CylinderGeometry(0.37,0.3,0.1,8),band:new THREE.CylinderGeometry(0.335,0.335,0.07,8),
  butt:new THREE.BoxGeometry(0.13,1,0.13),prong:new THREE.ConeGeometry(0.05,0.34,4),shard:new THREE.OctahedronGeometry(0.07,0),ring:new THREE.TorusGeometry(0.42,0.035,6,24),socket:new THREE.CylinderGeometry(0.24,0.3,0.08,8),
  cone4:new THREE.ConeGeometry(0.56,0.32,4),spike:new THREE.ConeGeometry(0.09,0.62,5),leg:new THREE.CylinderGeometry(0.03,0.04,0.7,5),bowl:new THREE.CylinderGeometry(0.4,0.22,0.22,10),obel:new THREE.CylinderGeometry(0.1,0.26,0.9,4)};
const gemMats={};const gemMat=col=>gemMats[col]||(gemMats[col]=new THREE.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:0.32,specular:0xffffff,shininess:120,flatShading:true}));
const glowMats={};const glowMat=col=>glowMats[col]||(glowMats[col]=new THREE.SpriteMaterial({map:glowTex,color:col,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.35}));
const haloMats={};const haloMat=col=>haloMats[col]||(haloMats[col]=new THREE.MeshBasicMaterial({map:glowTex,color:col,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false}));
const auraTex=cnv(128,128,(x)=>{x.translate(64,64);for(let i=0;i<24;i++){x.rotate(Math.PI/12);const g=x.createLinearGradient(0,44,0,64);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.6,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(-5,48);x.quadraticCurveTo(0,30+Math.random()*10,5,48);x.lineTo(4,63);x.lineTo(-4,63);x.fill();}
  x.strokeStyle='rgba(255,140,60,.9)';x.lineWidth=3;x.beginPath();x.arc(0,0,60,0,7);x.stroke();});
const auraGeo=new THREE.CircleGeometry(1,40).rotateX(-Math.PI/2);const haloGeo=new THREE.CircleGeometry(1,24).rotateX(-Math.PI/2);
const SP_SHAPE={silver:'diamond',malachite:'opal',jade:'opal',starRuby:'star',gold:'diamond',bloodstone:'ruby'};
const QS_=[0.54,0.6,0.66,0.73,0.82],QH=[0.16,0.26,0.36,0.46,0.58];
function mesh(geo,mat,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;return m;}
function gemInfo(type,special){return special?T.SPECIAL[type]:T.GEMS[type];}
function gemMesh(type,col,s){const g=new THREE.Group();const M=gemMat(col);
  if(type==='amethyst'){g.add(mesh(GEO.amethyst,M,0,0,0,s));const a=mesh(GEO.amethyst,M,-0.35*s,-0.24*s,0.05,s*0.7);a.rotation.set(0,0,0.45);g.add(a);const b=mesh(GEO.amethyst,M,0.37*s,-0.28*s,-0.04,s*0.62);b.rotation.set(0.1,0,-0.5);g.add(b);}
  else if(type==='star'){const a=mesh(GEO.tet,M,0,0,0,s);g.add(a);const b=mesh(GEO.tet,M,0,0,0,s);b.rotation.set(Math.PI,Math.PI/2,0);g.add(b);}
  else g.add(mesh(GEO[type]||GEO.diamond,M,0,0,0,s));
  g.children.forEach(m=>{m.castShadow=true;m.receiveShadow=false;});return g;}
// tower = pedestal + gem; loose = this round's gem sitting in a small socket (not a tower yet)
// ---------- Blender-modelled tower kit (assets/td/towers.glb, built by tools/td_models/build_towers.py) ----------
// gem env map: a tiny studio (bright panels over a sky gradient) baked with PMREM so the facets catch real glints
const gemEnv=(()=>{const es=new THREE.Scene();const sky=new THREE.Mesh(new THREE.SphereGeometry(10,24,12),new THREE.MeshBasicMaterial({side:THREE.BackSide,map:cnv(16,64,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffffff');g.addColorStop(0.45,'#9fc4ff');g.addColorStop(0.55,'#3a4a6a');g.addColorStop(1,'#101420');x.fillStyle=g;x.fillRect(0,0,w,h);})}));es.add(sky);
  for(const [x,y,z,s] of [[4,6,2,3],[-5,4,-3,2],[0,3,6,2.5],[-3,7,4,1.5],[5,1,-5,2]]){const p=new THREE.Mesh(new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);es.add(p);}
  const pm=new THREE.PMREMGenerator(renderer);const rt=pm.fromScene(es,0.02);pm.dispose();return rt.texture;})();
const kitGemMats={};
const gemRamp=(()=>{const d=new Uint8Array([70,70,70,255,140,140,140,255,205,205,205,255,255,255,255,255]);const t=new THREE.DataTexture(d,4,1);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
function kitGemMat(col,own){const make=()=>new THREE.MeshToonMaterial({color:col,emissive:col,emissiveIntensity:0.18,gradientMap:gemRamp,flatShading:true});if(own)return make();return kitGemMats[col]||(kitGemMats[col]=make());}
const KMAT={stone_d:tmat(0x8e90b4),stone_l:tmat(0xcfd2e8),stone_t:tmat(0xeceef8),gold:tmat(0xffc83a,0x6a4a00,0.3),iron:tmat(0x4a4552),obsidian:tmat(0x2e2236,0x300010,0.35),jade:tmat(0xbfeccc),marble:tmat(0xeef0f6),wood:tmat(0x8a5a30),roof:tmat(0x2f9a5a)};
const bandMats={};const bandMat=col=>bandMats[col]||(bandMats[col]=tmat(col,col,0.55));
const rimMats={};const rimMat=col=>rimMats[col]||(rimMats[col]=new THREE.MeshBasicMaterial({color:col}));const rimGeo=new THREE.TorusGeometry(0.4,0.055,6,28).rotateX(Math.PI/2);const TOWER_H=1.32;
let KIT=null;
const GEM_CUT={diamond:'brilliant',ruby:'oval',emerald:'step',topaz:'cushion',sapphire:'hex',aquamarine:'long',opal:'cabochon',amethyst:'cluster',
  silver:'brilliant',malachite:'cabochon',jade:'cabochon',starRuby:'star',gold:'brilliant',bloodstone:'oval'};
new GLTFLoader().load('assets/td/towers.glb?v=23',gl=>{const root=gl.scene;const K={ped:[],gem:{},sp:{},anchor:{}};
  root.traverse(o=>{if(o.isMesh){o.userData.mn=o.material.name;o.castShadow=true;o.receiveShadow=true;if(KMAT[o.material.name])o.material=KMAT[o.material.name];}});
  for(let q=0;q<5;q++){K.ped[q]=root.getObjectByName('ped_q'+q);K.anchor['q'+q]=root.getObjectByName('anchor_q'+q).position.y;}
  for(const c of ['brilliant','oval','cushion','step','hex','long','cabochon','cluster','star']){const o=root.getObjectByName('gem_'+c);let m=null;o.traverse(x=>{if(x.isMesh&&!m)m=x;});K.gem[c]=m.geometry;}
  for(const s of Object.keys(T.SPECIAL)){K.sp[s]=root.getObjectByName('sp_'+s);K.anchor[s]=root.getObjectByName('anchor_'+s).position.y;}
  KIT=K;if(G.g)syncBoard(null,true);},undefined,e=>console.warn('tower kit',e));
// each kit part is merged once into one geometry per material name, so a tower costs a handful of draw calls
const kitMerged=new Map();
function kitParts(src){let P=kitMerged.get(src);if(P)return P;src.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(src.matrixWorld).invert();const by={};
  src.traverse(x=>{if(!x.isMesh)return;let g=x.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,x.matrixWorld));for(const k of Object.keys(g.attributes))if(k!=='position'&&k!=='normal')g.deleteAttribute(k);if(g.index)g=g.toNonIndexed();(by[x.userData.mn]||(by[x.userData.mn]=[])).push(g);});
  P=Object.entries(by).map(([mn,gs])=>({mn,geo:gs.length>1?mergeGeometries(gs):gs[0],mat:KMAT[mn]}));kitMerged.set(src,P);return P;}
// body = every non-gem part baked into ONE vertex-coloured mesh per (part, gem colour); crystals stay a separate gem-material mesh
const kitBodies=new Map();const VC_BOOST={gold:0xffd650,band:null};
function kitBody(src,col){const key=src.name+'|'+col;let geo=kitBodies.get(key);if(geo)return geo;const gs=[];const c=new THREE.Color();
  for(const p of kitParts(src)){if(p.mn==='gemc')continue;const g=p.geo.clone();if(p.mn==='band')c.setHex(col);else if(VC_BOOST[p.mn])c.setHex(VC_BOOST[p.mn]);else c.copy((p.mat||KMAT.stone_l).color);
    const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=c.r;a[i*3+1]=c.g;a[i*3+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(a,3));gs.push(g);}
  geo=gs.length>1?mergeGeometries(gs):gs[0];kitBodies.set(key,geo);return geo;}
function kitClone(src,col){const o=new THREE.Group();const m=new THREE.Mesh(kitBody(src,col),vtoon);m.castShadow=m.receiveShadow=true;o.add(m);
  for(const p of kitParts(src))if(p.mn==='gemc'){const g=new THREE.Mesh(p.geo,kitGemMat(col));g.castShadow=false;o.add(g);}return o;}
const rimGeos=new Map();function rimPair(top,s){const key=top.toFixed(3)+'_'+s.toFixed(3);let g=rimGeos.get(key);if(!g){const a=rimGeo.clone().scale(s,s,s).translate(0,top+0.02,0),b=rimGeo.clone().scale(1.12,1.12,1.12).translate(0,0.05,0);g=mergeGeometries([a,b]);rimGeos.set(key,g);}return g;}
function kitGem(type,col,s,own){const cut=GEM_CUT[type]||'brilliant';const geo=KIT.gem[cut];const m=new THREE.Mesh(geo,kitGemMat(col,own));m.scale.setScalar(s*(cut==='cluster'?1.4:cut==='hex'||cut==='long'?1:1.12));m.castShadow=false;const g=new THREE.Group();g.add(m);if(cut!=='cluster'&&cut!=='hex'&&cut!=='long'){m.rotation.x=-0.95;g.userData.spinM=m;}g.userData.mat=m.material;return g;}
const VCOL={diamond:0x8fd4ff,opal:0xff9ad8,silver:0xc8dcff,topaz:0xffb21a,jade:0x4adc80};
function makeGemObj(type,q,special,tower){const G0=gemInfo(type,special),col=VCOL[type]??new THREE.Color(G0.col).getHex();const g=new THREE.Group();const ud=g.userData;ud.col=col;
  let gy,gs;
  if(KIT&&(special||tower)){gs=special?0.78:QS_[q];const body=kitClone(special?KIT.sp[type]:KIT.ped[q],col);body.scale.y=TOWER_H;g.add(body);const top=KIT.anchor[special?type:'q'+q]*TOWER_H;gy=top+gs*0.8;
    g.add(new THREE.Mesh(rimPair(top,0.75+gs*0.35),rimMat(col)));
    if(special&&type==='silver'){const rg=new THREE.Group();for(let i=0;i<3;i++){const r=mesh(PG.ring,tmat(0xdfe8ff,0x6080c0,0.4),0,0,0,0.9-i*0.12);r.rotation.set(1.2+i*0.5,i,0);rg.add(r);}rg.position.y=gy;g.add(rg);ud.orbit=rg;}
    if(!special&&q>=3){const orb=new THREE.Group();for(let i=0;i<3;i++){const a=i*2.094;orb.add(mesh(PG.shard,kitGemMat(col),Math.cos(a)*0.62,0,Math.sin(a)*0.62));}orb.children.forEach(x=>x.castShadow=false);orb.position.y=gy;g.add(orb);ud.orbit=orb;}
    {const halo=new THREE.Mesh(haloGeo,haloMat(col));halo.position.y=0.015;halo.scale.setScalar(0.62+(special?4:q)*0.05);g.add(halo);ud.halo=halo;}}
  else if(special){gs=0.48;gy=buildSpecial(g,type,col);}
  else if(tower){const h=QH[q];g.add(mesh(PG.base,STONE_D,0,0.08));g.add(mesh(PG.col,STONE_L,0,0.16+h/2,0,1,h,1));
    const band=mesh(PG.band,tmat(new THREE.Color(col).multiplyScalar(0.85).getHex()),0,0.16+h*0.55);g.add(band);
    if(q>=2)for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;g.add(mesh(PG.butt,STONE_D,Math.cos(a)*0.33,0.16+h*0.4,Math.sin(a)*0.33,1,h*0.8,1));}
    g.add(mesh(PG.cap,q>=4?GOLD:q>=3?tmat(0xdfe6f0,0x405070,0.2):STONE_T,0,0.16+h+0.05));
    if(q>=4){for(let i=0;i<6;i++){const a=i*Math.PI/3,p=mesh(PG.prong,GOLD,Math.cos(a)*0.36,0.16+h+0.3,Math.sin(a)*0.36,1.3,1.7,1.3);p.rotation.set(Math.sin(a)*0.25,0,-Math.cos(a)*0.25);g.add(p);}const cr=mesh(PG.ring,GOLD,0,0.16+h+0.14,0,0.95,0.95,0.95);cr.rotation.x=Math.PI/2;g.add(cr);}
    gs=QS_[q];gy=0.16+h+0.12+gs*0.62;
    if(q>=3){const orb=new THREE.Group();for(let i=0;i<3;i++){const a=i*2.094;orb.add(mesh(PG.shard,gemMat(col),Math.cos(a)*0.42,0,Math.sin(a)*0.42));}orb.position.y=gy;g.add(orb);ud.orbit=orb;}
    if(q>=2){const halo=new THREE.Mesh(haloGeo,haloMat(col));halo.position.y=0.015;halo.scale.setScalar(0.55+q*0.08);g.add(halo);ud.halo=halo;}}
  else{g.add(mesh(PG.socket,tmat(0xcbb48a),0,0.04));gs=0.5+q*0.05;gy=0.12+gs*0.75;const halo=new THREE.Mesh(haloGeo,haloMat(col));halo.position.y=0.015;halo.scale.setScalar(0.5);g.add(halo);ud.halo=halo;}
  const gem=KIT?kitGem(type,col,gs*(tower||special?1.25:1.1),tower||special):gemMesh(special?(SP_SHAPE[type]):type,col,gs*(tower||special?1.25:1.1));gem.position.y=gy;g.add(gem);
  const gl=new THREE.Sprite(tower||special?glowMat(col).clone():glowMat(col));gl.material.opacity=0.2;gl.scale.setScalar(gs*(special?3.4:2.8));gl.position.y=gy;gl.renderOrder=4;g.add(gl);
  ud.k=tower||special?1.28:1.2;g.scale.setScalar(ud.k);ud.gem=gem;ud.glow=gl;ud.spin=0.5+Math.random()*0.6;ud.h0=gy;ud.gs=gs;ud.seed=Math.random()*9;return g;}
// special silhouettes; returns the gem height
function buildSpecial(g,type,col){const ud=g.userData;g.add(mesh(PG.base,STONE_D,0,0.08,0,1.08,1,1.08));
  if(type==='silver'){g.add(mesh(PG.col,tmat(0xe8ecf4),0,0.16+0.45,0,0.8,0.9,0.8));g.add(mesh(PG.cap,tmat(0xf4f6fb),0,1.1));const rg=new THREE.Group();for(let i=0;i<3;i++){const r=mesh(PG.ring,tmat(0xdfe8ff,0x6080c0,0.4),0,0,0,1-i*0.15);r.rotation.set(1.2+i*0.5,i,0);rg.add(r);}rg.position.y=1.55;g.add(rg);ud.orbit=rg;return 1.55;}
  if(type==='malachite'){for(let i=0;i<3;i++){const a=i*2.094;const l=mesh(PG.leg,IRON,Math.cos(a)*0.22,0.5,Math.sin(a)*0.22);l.rotation.set(Math.sin(a)*0.3,0,-Math.cos(a)*0.3);g.add(l);}
    g.add(mesh(PG.cap,STONE_T,0,0.86,0,0.9));const tri=new THREE.Group();for(let i=0;i<3;i++){const a=i*2.094;const gm=gemMesh('emerald',col,0.3);gm.position.set(Math.cos(a)*0.2,0,Math.sin(a)*0.2);tri.add(gm);}tri.position.y=1.12;g.add(tri);ud.orbit=tri;ud.small=1;return 1.3;}
  if(type==='jade'){g.add(mesh(PG.col,tmat(0xb9e8c8),0,0.5,0,0.85,0.7,0.85));const r1=mesh(PG.cone4,tmat(0x2f9a5a),0,0.98,0,1.15);r1.rotation.y=Math.PI/4;g.add(r1);g.add(mesh(PG.col,tmat(0xb9e8c8),0,1.2,0,0.5,0.3,0.5));const r2=mesh(PG.cone4,tmat(0x2f9a5a),0,1.42,0,0.8);r2.rotation.y=Math.PI/4;g.add(r2);g.add(mesh(PG.shard,GOLD,0,1.62,0,1.2));return 1.95;}
  if(type==='starRuby'){g.add(mesh(PG.col,IRON,0,0.42,0,0.7,0.5,0.7));g.add(mesh(PG.bowl,IRON,0,0.78));for(let i=0;i<6;i++){const a=i*Math.PI/3;const s=mesh(PG.spike,tmat(0xff5a7a,0xff2040,0.4),Math.cos(a)*0.3,1.0,Math.sin(a)*0.3,0.8,0.6,0.8);s.rotation.set(Math.sin(a)*0.5,0,-Math.cos(a)*0.5);g.add(s);}ud.aura=1;return 1.32;}
  if(type==='gold'){g.add(mesh(PG.obel,GOLD,0,0.6,0,1.1,1,1.1));g.add(mesh(PG.cap,GOLD,0,1.08));for(let i=0;i<5;i++){const a=i*Math.PI*2/5,p=mesh(PG.prong,GOLD,Math.cos(a)*0.28,1.25,Math.sin(a)*0.28,1.2);p.rotation.set(Math.sin(a)*-0.4,0,Math.cos(a)*0.4);g.add(p);}return 1.55;}
  if(type==='bloodstone'){g.add(mesh(PG.col,OBS,0,0.5,0,0.9,0.7,0.9));for(let i=0;i<5;i++){const a=i*Math.PI*2/5+0.3;const s=mesh(PG.spike,OBS,Math.cos(a)*0.34,0.62,Math.sin(a)*0.34,1.3,1.4,1.3);s.rotation.set(Math.sin(a)*0.35,0,-Math.cos(a)*0.35);g.add(s);}g.add(mesh(PG.cap,tmat(0x5a1020,0x400010,0.5),0,0.9));ud.aura=1;return 1.32;}
  return 1.2;}
// burn-aura ring (Star Ruby / Bloodstone) — a flame circle at the tower's range
function addAura(g,rng,col){const m=new THREE.Mesh(auraGeo,new THREE.MeshBasicMaterial({map:auraTex,color:col,transparent:true,opacity:0.5,depthWrite:false}));m.scale.set(rng,1,rng);m.position.y=0.03;m.renderOrder=1;g.add(m);g.userData.auraM=m;
  const e=new THREE.Mesh(auraEdge,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.75,depthWrite:false}));e.scale.set(rng,1,rng);e.position.y=0.035;e.renderOrder=1;g.add(e);}
const auraEdge=new THREE.RingGeometry(0.955,1,64).rotateX(-Math.PI/2);
// ---------- rocks: chunky stylised boulders, instanced; neighbouring rocks get a bridging boulder so they read as walls ----------
function rockGeo(seed){const g=new THREE.IcosahedronGeometry(0.5,1);const p=g.attributes.position;const h=(x,y,z)=>{const s=Math.sin(x*12.9898+y*78.233+z*37.719+seed*13.1)*43758.5453;return s-Math.floor(s);};
  const col=[];const top=new THREE.Color(0x8a7864),base=new THREE.Color(0x4a3e34),moss=new THREE.Color(0x5f7a3c),c=new THREE.Color();
  for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const k=0.82+h(+x.toFixed(3),+y.toFixed(3),+z.toFixed(3))*0.32;x*=k;z*=k;y*=k;if(y<0)y*=0.35;y+=0.06;p.setXYZ(i,x*1.05,y*0.92,z*1.05);}
  g.computeVertexNormals();const n=g.attributes.normal;
  for(let i=0;i<p.count;i+=3){let ny=(n.getY(i)+n.getY(i+1)+n.getY(i+2))/3;c.copy(base).lerp(top,Math.max(0,Math.min(1,ny*0.9+0.25)));if(ny>0.8&&h(i,seed,1)<0.35)c.lerp(moss,0.55);for(let j=0;j<3;j++)col.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));return g;}
const ROCKV=[rockGeo(1),rockGeo(2),rockGeo(3)];const RCAP=900;
const rockIM=ROCKV.map(g=>{const m=new THREE.InstancedMesh(g,vtoon,RCAP);m.count=0;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;scene.add(m);return m;});
let rockList=[];const rockBorn=new Map();let rockAnim=0;
const hsh=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s);};
function rebuildRocks(){const g=G.g;rockList=[];const isR=(c,r)=>c>=0&&r>=0&&c<W&&r<H&&g.grid[T.idx(c,r)]===1;
  for(let r=0;r<H;r++)for(let c=0;c<W;c++){if(!isR(c,r))continue;const k=T.idx(c,r),h1=hsh(c,r),h2=hsh(r,c+7);
    rockList.push({k,v:(h1*3)|0,x:c,z:r,s:0.95+h1*0.12,sy:0.6+h2*0.22,ry:h2*6.28});
    rockList.push({k,v:((h2*3)|0),x:c+(h1-0.5)*0.5,z:r+0.3,s:0.38,sy:0.7,ry:h1*6});
    if(isR(c+1,r))rockList.push({k,k2:T.idx(c+1,r),v:((h1*7)|0)%3,x:c+0.5,z:r+(h2-0.5)*0.12,s:0.66,sy:0.6,ry:h1*3});
    if(isR(c,r+1))rockList.push({k,k2:T.idx(c,r+1),v:((h2*7)|0)%3,x:c+(h1-0.5)*0.12,z:r+0.5,s:0.66,sy:0.6,ry:h2*3});}
  writeRocks();}
const _rm=new THREE.Matrix4(),_rq=new THREE.Quaternion(),_rv=new THREE.Vector3(),_rs=new THREE.Vector3(),_ry=new THREE.Vector3(0,1,0);
function bornK(k,t){const b=rockBorn.get(k);if(b==null)return 1;const a=(t-b)/0.42;if(a<0)return 0;if(a>=1){return 1;}return a;}
function writeRocks(){const t=now();const cnt=[0,0,0];let anim=false;
  for(const R of rockList){let a=bornK(R.k,t);if(R.k2!=null)a=Math.min(a,bornK(R.k2,t));if(a<1)anim=true;if(a<=0)continue;
    const e=a<1?1+2.7*Math.pow(a-1,3)+1.7*Math.pow(a-1,2):1,sq=a<1?1+Math.sin(a*Math.PI*2)*0.25*(1-a):1;
    const [x,z]=cw(R.x,R.z);_rq.setFromAxisAngle(_ry,R.ry);_rm.compose(_rv.set(x,0,z),_rq,_rs.set(R.s*e/sq,R.s*R.sy*e*sq,R.s*e/sq));const im=rockIM[R.v];im.setMatrixAt(cnt[R.v]++,_rm);}
  rockIM.forEach((im,i)=>{im.count=cnt[i];im.instanceMatrix.needsUpdate=true;});rockAnim=anim;}
// ---------- board objects (towers + this round's gems) ----------
const objs=new Map();// cell index -> {o, kind, born}
function setObj(c,r,o,kind,born){const k=T.idx(c,r);const old=objs.get(k);if(old)scene.remove(old.o);if(!o){objs.delete(k);return;}const [x,z]=cw(c,r);o.position.set(x,0,z);scene.add(o);objs.set(k,{o,kind,born:born??now(),pulse:0});o.scale.setScalar(0.001);}
function towerObj(t){const o=makeGemObj(t.type,t.q,t.special,true);if(t.special){const s=T.towerStats(t);if(s.burn)addAura(o,s.rng,t.type==='bloodstone'?0xc8102e:0xff8a1a);}return o;}
function syncBoard(born,quiet){// rebuild from game state (after keep / rock removal / new game / retry). born: {cellIndex: time} for delayed pop-ins
  born=born||{};const keep=new Map();for(const [k,v] of objs)keep.set(k,v);
  for(const [k,v] of objs)scene.remove(v.o);objs.clear();
  for(const t of G.g.towers){const k=T.idx(t.c,t.r),old=keep.get(k);const o=towerObj(t);setObj(t.c,t.r,o,'tower',born[k]??(quiet||old&&old.kind==='tower'&&old.sig===sig(t)?-9:now()));objs.get(k).sig=sig(t);}
  for(const gm of G.g.placed){const k=T.idx(gm.c,gm.r),old=keep.get(k);setObj(gm.c,gm.r,makeGemObj(gm.type,gm.q,false,false),'gem',quiet||old&&old.kind==='gem'?-9:now());}
  // rocks: new rock cells pop in
  const prev=new Set(rockList.map(R=>R.k));for(let k=0;k<W*H;k++){if(G.g.grid[k]===1&&!prev.has(k)){rockBorn.set(k,born[k]??(G.firstSync?-9:now()));}}
  G.firstSync=false;rebuildRocks();}
const sig=t=>t.type+t.q+(t.special?'s':'');
// ---------- the maze trail: auto-tiled dirt path (cells + connectors), animated chevrons ----------
const dirtTex=(()=>{const t=cnv(256,256,(x)=>{x.fillStyle='#d6ac6c';x.fillRect(0,0,256,256);for(let i=0;i<2600;i++){const l=Math.random();x.fillStyle=l<0.5?`rgba(150,105,60,${0.12+Math.random()*0.2})`:`rgba(250,225,170,${0.12+Math.random()*0.2})`;x.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*2,2+Math.random()*2);}
  for(let i=0;i<70;i++){const px=Math.random()*256,py=Math.random()*256,r=2+Math.random()*4;x.fillStyle='rgba(120,90,60,.45)';x.beginPath();x.ellipse(px+1,py+1.5,r,r*0.75,0,0,7);x.fill();x.fillStyle=Math.random()<0.5?'#cfc3ae':'#b9a992';x.beginPath();x.ellipse(px,py,r,r*0.75,0,0,7);x.fill();}});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;})();
function worldUV(mat,k){mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv=(modelMatrix*instanceMatrix*vec4(position,1.0)).xz*'+k.toFixed(3)+';\n#endif');};}
const dirtM=new THREE.MeshToonMaterial({map:dirtTex,gradientMap:ramp});worldUV(dirtM,0.45);
const edgeM=tmat(0xa8834f);
function rrect(w,h,r){const s=new THREE.Shape();const x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ShapeGeometry(s,3);g.rotateX(-Math.PI/2);return g;}
const tileG=rrect(0.84,0.84,0.26),connG=new THREE.PlaneGeometry(0.84,1).rotateX(-Math.PI/2),edgeTG=rrect(0.98,0.98,0.32),edgeCG=new THREE.PlaneGeometry(0.98,1).rotateX(-Math.PI/2);
const chevG=(()=>{const s=new THREE.Shape();s.moveTo(-0.15,-0.1);s.lineTo(0,0.06);s.lineTo(0.15,-0.1);s.lineTo(0.15,0.0);s.lineTo(0,0.16);s.lineTo(-0.15,0.0);s.closePath();const g=new THREE.ShapeGeometry(s);g.rotateX(-Math.PI/2);return g;})();
const PCAP=700;const mkIM=(geo,mat,ro)=>{const m=new THREE.InstancedMesh(geo,mat,PCAP);m.count=0;m.frustumCulled=false;m.renderOrder=ro;scene.add(m);return m;};
const edgeT=mkIM(edgeTG,edgeM,0),edgeC=mkIM(edgeCG,edgeM,0),dirtT=mkIM(tileG,dirtM,0),dirtC=mkIM(connG,dirtM,0);dirtT.receiveShadow=dirtC.receiveShadow=true;
const chevM=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.85,depthWrite:false});const chev=mkIM(chevG,chevM,1);
let trailPath=null,trailSteps=[],flowT=-1;
const _pm=new THREE.Matrix4(),_pq=new THREE.Quaternion(),_pv=new THREE.Vector3(),_ps=new THREE.Vector3(1,1,1),_cc=new THREE.Color();
function setTrail(p){if(p===trailPath)return;trailPath=p;trailSteps=[];if(!p){for(const m of [edgeT,edgeC,dirtT,dirtC,chev])m.count=0;return;}
  const cells=new Set(),conns=new Set();let nT=0,nC=0,nV=0;
  for(let i=0;i<p.length;i++){const [c,r]=p[i];const k=T.idx(c,r);if(!cells.has(k)){cells.add(k);const [x,z]=cw(c,r);_pm.compose(_pv.set(x,0.006,z),_pq.identity(),_ps.set(1,1,1));edgeT.setMatrixAt(nT,_pm);_pm.compose(_pv.set(x,0.011,z),_pq,_ps);dirtT.setMatrixAt(nT++,_pm);}
    if(i>0){const [a,b]=p[i-1];const kk=Math.min(T.idx(a,b),k)+'_'+Math.max(T.idx(a,b),k);const [x0,z0]=cw(a,b),[x1,z1]=cw(c,r);const ang=Math.atan2(x1-x0,z1-z0);
      if(!conns.has(kk)){conns.add(kk);_pq.setFromAxisAngle(_ry,ang);_pm.compose(_pv.set((x0+x1)/2,0.007,(z0+z1)/2),_pq,_ps);edgeC.setMatrixAt(nC,_pm);_pm.compose(_pv.set((x0+x1)/2,0.012,(z0+z1)/2),_pq,_ps);dirtC.setMatrixAt(nC++,_pm);}
      if(i%2===1)trailSteps.push([(x0+x1)/2,(z0+z1)/2,ang+Math.PI]);}}
  edgeT.count=dirtT.count=nT;edgeC.count=dirtC.count=nC;for(const m of [edgeT,edgeC,dirtT,dirtC])m.instanceMatrix.needsUpdate=true;
  chev.count=Math.min(PCAP,trailSteps.length);for(let i=0;i<chev.count;i++){const [x,z,a]=trailSteps[i];_pq.setFromAxisAngle(_ry,a);_pm.compose(_pv.set(x,0.02,z),_pq,_ps.set(1,1,1));chev.setMatrixAt(i,_pm);chev.setColorAt(i,_cc.setRGB(1,1,1));}
  chev.instanceMatrix.needsUpdate=true;if(chev.instanceColor)chev.instanceColor.needsUpdate=true;}
const CH_BASE=new THREE.Color(0x9a6634),CH_GOLD=new THREE.Color(0xffe066),CH_RED=new THREE.Color(0xff3a2a),CH_PREV=new THREE.Color(0xfff27a);
function drawChevrons(build,preview,red){const n=chev.count;if(!n)return;const t=now();const head=flowT>=0?(t-flowT)*21:-99;if(flowT>=0&&head>n+20)flowT=-1;
  const idle=build?((t*7)%(n+20)):-99;chevM.opacity=build?0.9:0.5;
  for(let i=0;i<n;i++){let f=Math.exp(-Math.pow((i-head)/4,2));const f2=build?Math.exp(-Math.pow((i-idle)/6,2))*0.55:0;
    _cc.copy(red?CH_RED:preview?CH_PREV:CH_BASE);if(!red)_cc.lerp(CH_GOLD,Math.min(1,f+f2));if(f>0.05){_cc.multiplyScalar(1+f*0.6);}chev.setColorAt(i,_cc);}
  chev.instanceColor.needsUpdate=true;}
// flyer route preview (straight lines between checkpoints) — small glowing dots
const dotGeo=new THREE.CircleGeometry(0.09,10);dotGeo.rotateX(-Math.PI/2);
const fdots=new THREE.InstancedMesh(dotGeo,new THREE.MeshBasicMaterial({color:0x8ad0ff,transparent:true,opacity:0.8,depthWrite:false}),300);fdots.renderOrder=1;fdots.frustumCulled=false;fdots.count=0;scene.add(fdots);
function drawFly(path){let n=0;if(path){let off=(now()*1.2)%0.5;for(let i=1;i<path.length&&n<300;i++){const a=path[i-1],b=path[i],L=Math.hypot(b[0]-a[0],b[1]-a[1]);while(off<L&&n<300){const f=off/L;const [x,z]=cw(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);_pm.makeTranslation(x,0.06,z);fdots.setMatrixAt(n++,_pm);off+=0.5;}off-=L;}}
  fdots.count=n;fdots.instanceMatrix.needsUpdate=true;}
// ---------- fx: two pooled instanced billboard systems (additive glow + soft smoke), pooled projectiles, ground rings ----------
function makePool(cap,tex,blend,ro){const geo=new THREE.PlaneGeometry(1,1);const aA=new THREE.InstancedBufferAttribute(new Float32Array(cap),1);aA.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('aAlpha',aA);
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:blend});
  mat.onBeforeCompile=sh=>{sh.vertexShader='attribute float aAlpha;\nvarying float vA;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvA=aAlpha;');sh.fragmentShader='varying float vA;\n'+sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vA;');};
  const im=new THREE.InstancedMesh(geo,mat,cap);im.frustumCulled=false;im.renderOrder=ro;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);const c0=new THREE.Color(1,1,1);for(let i=0;i<cap;i++)im.setColorAt(i,c0);im.count=0;scene.add(im);
  const P=[];for(let i=0;i<cap;i++)P.push({on:false});return {im,aA,P,cap,cur:0,hi:0};}
const ADD=makePool(1400,glowTex,THREE.AdditiveBlending,7),SMK=makePool(500,puffTex,THREE.NormalBlending,5),ORB=makePool(700,glowTex,THREE.NormalBlending,6);
const _col=new THREE.Color();
function spawn(pool,o){for(let n=0;n<pool.cap;n++){const i=(pool.cur+n)%pool.cap;const p=pool.P[i];if(p.on)continue;pool.cur=(i+1)%pool.cap;
    p.on=true;p.i=i;p.x=o.x;p.y=o.y;p.z=o.z;p.vx=o.vx||0;p.vy=o.vy||0;p.vz=o.vz||0;p.g=o.g||0;p.drag=o.drag||0;p.age=0;p.life=o.life||0.5;p.s0=o.s0??0.2;p.s1=o.s1??p.s0;p.a0=o.a??1;p.rot=o.rot??Math.random()*6.28;p.vr=o.vr||0;p.fin=o.fin||0;
    _col.set(o.col??0xffffff);pool.im.setColorAt(i,_col);pool.im.instanceColor.needsUpdate=true;if(i>=pool.hi)pool.hi=i+1;return p;}return null;}
const _bq=new THREE.Quaternion(),_bz=new THREE.Quaternion(),_bv=new THREE.Vector3(),_bs=new THREE.Vector3(),_bm=new THREE.Matrix4(),_Z=new THREE.Vector3(0,0,1),_zero=new THREE.Matrix4().makeScale(0,0,0);
function stepPool(pool,dt){let hi=0;const aA=pool.aA.array;
  for(let i=0;i<pool.hi;i++){const p=pool.P[i];if(!p.on){pool.im.setMatrixAt(i,_zero);aA[i]=0;continue;}
    p.age+=dt;if(p.age>=p.life){p.on=false;pool.im.setMatrixAt(i,_zero);aA[i]=0;continue;}hi=i+1;
    const k=p.age/p.life;p.vy-=p.g*dt;if(p.drag){const d=Math.max(0,1-p.drag*dt);p.vx*=d;p.vy*=d;p.vz*=d;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.vr*dt;
    const s=p.s0+(p.s1-p.s0)*k;_bq.copy(camera.quaternion).multiply(_bz.setFromAxisAngle(_Z,p.rot));_bm.compose(_bv.set(p.x,p.y,p.z),_bq,_bs.set(s,s,s));pool.im.setMatrixAt(i,_bm);
    aA[i]=p.a0*(p.fin&&k<p.fin?k/p.fin:1)*(1-k*k);}
  pool.hi=hi;pool.im.count=hi;pool.im.instanceMatrix.needsUpdate=true;pool.aA.needsUpdate=true;}
// presets
function sparks(x,y,z,col,n=8,sp=2,s=0.12,life=0.45){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=sp*(0.4+Math.random()*0.6);spawn(ADD,{x,y,z,vx:Math.cos(a)*v,vy:1+Math.random()*sp,vz:Math.sin(a)*v,g:6,drag:1.5,life:life*(0.7+Math.random()*0.6),s0:s,s1:s*0.2,col});}}
function puffs(x,y,z,n=6,col=0xffffff,s=0.35,sp=0.9,life=0.6){for(let i=0;i<n;i++){const a=i/n*6.28+Math.random()*0.5;spawn(SMK,{x:x+Math.cos(a)*0.08,y:y+Math.random()*0.1,z:z+Math.sin(a)*0.08,vx:Math.cos(a)*sp,vy:0.35+Math.random()*0.5,vz:Math.sin(a)*sp,drag:3,life:life*(0.8+Math.random()*0.4),s0:s*0.5,s1:s*1.4,col,a:0.85,vr:(Math.random()-0.5)*2,fin:0.1});}}
function dust(x,z,n=8,s=0.3){puffs(x,0.08,z,n,0xe9dcc0,s,1.4,0.55);}
function glowFlash(x,y,z,col,s=0.8,life=0.16){spawn(ADD,{x,y,z,life,s0:s*0.6,s1:s,col,a:1});}
// gem-specific projectile styles: size, speed, arc, trail colour/length, impact
const STY={amethyst:{s:0.50,arc:0.25,tc:0xa040ff,tl:0.32,snd:'zap'},aquamarine:{s:0.33,arc:0.1,tc:0x2ad8e8,tl:0.22,snd:'ping'},diamond:{s:0.40,arc:0.15,tc:0xffffff,tl:0.28,snd:'ping'},
  emerald:{s:0.43,arc:0.55,tc:0x2ad04a,tl:0.36,snd:'goo',drip:1},opal:{s:0.38,arc:0.35,tc:0xff8ad0,tl:0.32,snd:'ping'},ruby:{s:0.50,arc:0.45,tc:0xff4a1a,tl:0.36,snd:'fire',smoke:1},
  sapphire:{s:0.40,arc:0.2,tc:0x3a7aff,tl:0.32,snd:'ice'},topaz:{s:0.33,arc:0.08,tc:0xffb020,tl:0.24,snd:'bow'},
  silver:{s:0.47,arc:0.25,tc:0xa8c8ff,tl:0.36,snd:'ice'},malachite:{s:0.35,arc:0.12,tc:0x1fc08a,tl:0.26,snd:'bow'},jade:{s:0.45,arc:0.45,tc:0x40d870,tl:0.36,snd:'goo',drip:1},
  gold:{s:0.58,arc:0.25,tc:0xffc020,tl:0.42,snd:'crit'},bloodstone:{s:0.55,arc:0.4,tc:0xff2a2a,tl:0.42,snd:'fire',smoke:1},starRuby:{s:0.50,arc:0.4,tc:0xff3a6a,tl:0.36,snd:'fire'}};
const shots=[];const pendDmg=new Map();
const towerTop=tw=>{const ob=objs.get(T.idx(tw.c,tw.r));return ob?ob.o.userData.h0*(ob.o.userData.k||1):0.8;};
// wind-up: the gem charges (glow ramps, pedestal squashes, sparks gather) — the release fires the bolt
function chargeFx(ev){const ob=objs.get(T.idx(ev.tw.c,ev.tw.r));if(!ob)return;ob.ch={t:0,dur:Math.max(0.12,ev.dur),col:new THREE.Color(ev.col).getHex()};if(Math.random()<0.55)S.charge();}
function shotFx(ev){const tw=ev.tw,e=ev.e,v=views.get(e.id);const st=STY[tw.type]||STY.diamond;const ob=objs.get(T.idx(tw.c,tw.r));const [x0,z0]=cw(tw.c,tw.r);const y0=towerTop(tw);
  const tx=v?v.g.position.x:cw(e.x,e.y)[0],tz=v?v.g.position.z:cw(e.x,e.y)[1],ty=(v?v.hover:0)+0.4;
  const col=new THREE.Color(ev.col).getHex();const s=st.s*1.55*(ev.crit?1.35:1)*(ev.n>2?0.8:1);
  const core=spawn(ORB,{x:x0,y:y0,z:z0,life:9,s0:s*1.9,col:st.tc,a:1});const head=spawn(ADD,{x:x0,y:y0,z:z0,life:9,s0:s*1.1,col:0xffffff,a:0.9});
  shots.push({head,core,x0,y0,z0,tx,ty,tz,v,t:0,dur:ev.tt,st,col,ev,s});
  if(ob){ob.ch=null;ob.pulse=1;}
  // release: muzzle flash + burst ring + sound (one per volley)
  glowFlash(x0,y0,z0,col,2.0+s*1.4,0.22);glowFlash(x0,y0,z0,0xffffff,1.1,0.1);sparks(x0,y0,z0,st.tc,9,2.2,0.17,0.32);
  if(ev.n>1){for(let k=1;k<=8;k++){const f=k/9;spawn(ADD,{x:x0+(tx-x0)*f,y:y0+(ty-y0)*f,z:z0+(tz-z0)*f,life:0.24,s0:0.26,s1:0.06,col:st.tc,a:0.9});}}
  if(!ob||!ob.snd||now()-ob.snd>0.1){if(ob)ob.snd=now();(S[st.snd]||S.ping)();}}
function stepShots(dt){for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.t+=dt;const k=Math.min(1,s.t/s.dur);if(s.v&&!s.v.gone){s.tx=s.v.g.position.x;s.tz=s.v.g.position.z;}
    const x=s.x0+(s.tx-s.x0)*k,z=s.z0+(s.tz-s.z0)*k,y=s.y0+(s.ty-s.y0)*k+Math.sin(k*Math.PI)*s.st.arc*(1+Math.hypot(s.tx-s.x0,s.tz-s.z0)*0.3);
    for(const p of [s.head,s.core])if(p){p.x=x;p.y=y;p.z=z;}
    spawn(ORB,{x,y,z,life:s.st.tl,s0:s.s*1.4,s1:s.s*0.2,col:s.st.tc,a:0.8});
    if(s.st.smoke&&Math.random()<0.6)spawn(SMK,{x,y,z,life:0.45,s0:0.24,s1:0.55,col:0x5a4a45,a:0.5,vy:0.4});
    if(s.st.drip&&Math.random()<0.35)spawn(ADD,{x,y,z,vy:-0.5,g:5,life:0.4,s0:0.12,s1:0.05,col:s.st.tc});
    if(k>=1){for(const p of [s.head,s.core])if(p)p.age=p.life;shots.splice(i,1);}}}
// impact: hit flash + knockback wobble + burst + damage number + the gem's own effect
function hitFx(ev){const tw=ev.tw,e=ev.e,v=views.get(e.id);const st=STY[tw.type]||STY.diamond;const col=new THREE.Color(ev.col).getHex();
  let x,z;if(v&&!v.gone){x=v.g.position.x;z=v.g.position.z;}else[x,z]=cw(ev.x,ev.y);const y=(v?v.hover:0)+0.4;
  if(v){v.flash=1;v.wob=1;}
  glowFlash(x,y,z,col,ev.crit?3.0:1.9,0.2);glowFlash(x,y,z,0xffffff,ev.crit?1.6:0.9,0.09);sparks(x,y,z,st.tc,ev.crit?20:12,ev.crit?3.2:2.3,ev.crit?0.26:0.19,0.45);ringFx(x,z,st.tc,ev.crit?1.1:0.7,0.3,0.06);
  const s=T.towerStats(tw);
  if(s.slow){ringFx(x,z,0x9ad8ff,1.15,0.5,0.07);for(let i=0;i<8;i++){const a=i/6*6.28;spawn(ADD,{x:x+Math.cos(a)*0.2,y:y-0.1,z:z+Math.sin(a)*0.2,vx:Math.cos(a)*0.9,vy:0.5,vz:Math.sin(a)*0.9,drag:3,life:0.55,s0:0.2,s1:0.07,col:0xe6f6ff});}if(Math.random()<0.5)S.ice();}
  if(s.poison){for(let i=0;i<7;i++)spawn(ADD,{x:x+(Math.random()-0.5)*0.35,y:y-0.2+Math.random()*0.2,z:z+(Math.random()-0.5)*0.35,vy:0.5+Math.random()*0.6,life:0.5+Math.random()*0.5,s0:0.11,s1:0.26,col:0x6aff6a,a:0.9});if(Math.random()<0.4)S.goo();}
  if(s.shred)sparks(x,y-0.1,z,0x9a5aff,5,1.2,0.1,0.35);
  if(ev.crit){dmgText(x,y+0.45,z,'暴击! '+Math.round(ev.d),'crit');glowFlash(x,y,z,0xffffff,2.4,0.12);shake(0.06);S.crit();}
  else if(ev.d>0){const p=pendDmg.get(e.id)||{sum:0,t:0,x,y,z};p.sum+=ev.d;p.x=x;p.y=y;p.z=z;pendDmg.set(e.id,p);}
  if(e.boss&&(ev.crit||Math.random()<0.2))shake(ev.crit?0.14:0.06);
  if(Math.random()<0.35)S.hit();}
function flushDmg(dt){for(const [id,p] of pendDmg){p.t+=dt;if(p.t>0.06){pendDmg.delete(id);if(p.sum>=1)dmgText(p.x,p.y+0.3,p.z,String(Math.round(p.sum)),'');}}}
// expanding ground rings (shared geometry, pooled materials)
const rangeGeo=new THREE.RingGeometry(0.9,1,64);rangeGeo.rotateX(-Math.PI/2);const rings=[];const ringPool=[];
function ringFx(x,z,col,r,life=0.35,y=0.05){let m=ringPool.pop();if(!m){m=new THREE.Mesh(rangeGeo,new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));m.renderOrder=2;}m.material.color.set(col);m.position.set(x,y,z);scene.add(m);rings.push({m,t:0,life,r});}
function stepRings(dt){for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const k=r.t/r.life;const e=1-Math.pow(1-k,3);r.m.scale.set(r.r*(0.2+0.8*e),1,r.r*(0.2+0.8*e));r.m.material.opacity=0.95*(1-k);if(k>=1){scene.remove(r.m);ringPool.push(r.m);rings.splice(i,1);}}}
// light pillar for special-tower creation
const pillarGeo=new THREE.CylinderGeometry(0.45,0.6,7,16,1,true);const pillars=[];
function pillar(x,z,col){const m=new THREE.Mesh(pillarGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,map:glowTex}));m.position.set(x,3.5,z);scene.add(m);pillars.push({m,t:0});}
function stepPillars(dt){for(let i=pillars.length-1;i>=0;i--){const p=pillars[i];p.t+=dt;const k=p.t/1.1;p.m.scale.set(1-k*0.6,1,1-k*0.6);p.m.material.opacity=0.75*(1-k);if(k>=1){scene.remove(p.m);p.m.material.dispose();pillars.splice(i,1);}}}
// flying gems (combine: components arc into the host)
const flyers=[];
function flyGem(type,q,from,to,delay,onArrive){const o=makeGemObj(type,q,false,false);o.position.set(from[0],0,from[1]);scene.add(o);flyers.push({o,from,to,t:-delay,dur:0.42,onArrive});}
function stepFlyers(dt){for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.t+=dt;if(f.t<0)continue;const k=Math.min(1,f.t/f.dur),e=k*k*(3-2*k);
    f.o.position.set(f.from[0]+(f.to[0]-f.from[0])*e,Math.sin(k*Math.PI)*1.3,f.from[1]+(f.to[1]-f.from[1])*e);f.o.rotation.y+=dt*12;f.o.scale.setScalar(1-k*0.35);
    if(Math.random()<0.8)spawn(ADD,{x:f.o.position.x,y:f.o.position.y+f.o.userData.h0,z:f.o.position.z,life:0.3,s0:0.25,s1:0.02,col:f.o.userData.col,a:0.8});
    if(k>=1){scene.remove(f.o);flyers.splice(i,1);f.onArrive&&f.onArrive();}}}
// ---------- DOM fx: pooled damage numbers, coin pops flying to the gold counter ----------
const toScreen=(()=>{const v=new THREE.Vector3();return (x,y,z)=>{v.set(x,y,z).project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight];};})();
const dmgPool=[];for(let i=0;i<26;i++){const d=document.createElement('div');d.className='dmg';document.body.appendChild(d);dmgPool.push({d,busy:false});}
function dmgText(x,y,z,s,cls){const slot=dmgPool.find(p=>!p.busy);if(!slot)return;const [sx,sy]=toScreen(x,y,z);const d=slot.d;slot.busy=true;d.className='dmg '+(cls||'');d.textContent=s;d.style.left=sx+'px';d.style.top=sy+'px';
  const big=cls==='crit'||cls==='big';const dx=(Math.random()-0.5)*24;
  d.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:1,transform:`translate(calc(-50% + ${dx*0.3}px),-90%) scale(${big?1.7:1.45})`,offset:0.14},{opacity:1,transform:`translate(calc(-50% + ${dx*0.5}px),-120%) scale(1)`,offset:0.32},{opacity:1,transform:`translate(calc(-50% + ${dx*0.7}px),-170%) scale(1)`,offset:0.7},{opacity:0,transform:`translate(calc(-50% + ${dx}px),-230%) scale(.9)`}],{duration:big?1050:820,easing:'ease-out'}).onfinish=()=>{slot.busy=false;d.style.opacity=0;};}
function ftxt(x,y,z,s,cls){dmgText(x,y,z,s,cls||'big');}
const coinPool=[];for(let i=0;i<16;i++){const d=document.createElement('div');d.className='coinfx';document.body.appendChild(d);coinPool.push({d,busy:false});}
function coinFly(x,y,z,n=1){const tgt=$('hGold').parentNode.getBoundingClientRect();const tx=tgt.left+16,ty=tgt.top+tgt.height/2;const [sx,sy]=toScreen(x,y,z);
  for(let j=0;j<Math.min(n,4);j++){const slot=coinPool.find(p=>!p.busy);if(!slot)return;slot.busy=true;const d=slot.d;const ox=(Math.random()-0.5)*40,oy=-20-Math.random()*30;
    d.style.left=sx+'px';d.style.top=sy+'px';d.style.opacity=1;
    d.animate([{transform:'translate(-50%,-50%) scale(.5)'},{transform:`translate(calc(-50% + ${ox}px),calc(-50% + ${oy}px)) scale(1.15)`,offset:0.3},{transform:`translate(calc(-50% + ${tx-sx}px),calc(-50% + ${ty-sy}px)) scale(.7)`}],{duration:620+j*70,easing:'cubic-bezier(.3,.0,.6,1)',delay:j*40}).onfinish=()=>{slot.busy=false;d.style.opacity=0;S.coinIn();bump($('hGold').parentNode);};}}
function bump(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');}
function toast(html,cls,dur=2200){const t=document.createElement('div');t.className='toast '+(cls||'');t.innerHTML=html;$('toasts').appendChild(t);while($('toasts').children.length>3)$('toasts').firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),400);},dur);}
function banner(main,sub,cls,icon){const b=$('banner2');b.className='';b.innerHTML=`<div class="rib ${cls||''}">${icon?`<img src="${icon}">`:''}<div><b>${main}</b>${sub?`<small>${sub}</small>`:''}</div></div>`;void b.offsetWidth;b.className='show';}
function flash(col){const f=$('flash');f.style.background=col;f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
// ---------- creature icons (cropped from the atlas, front-facing idle frame) ----------
const iconCache={};
function unitIcon(t){if(iconCache[t])return Promise.resolve(iconCache[t]);return loadSpr(t).then(m=>{if(!m)return '';const di=m.dirs.length-1,F=m.frames[di][m.anims.idle.row][0];const img=m.tex[F[0]].image;const c=document.createElement('canvas');const s=Math.max(F[3],F[4]);c.width=c.height=s;
  c.getContext('2d').drawImage(img,F[1],F[2],F[3],F[4],(s-F[3])/2,(s-F[4])/2,F[3],F[4]);return iconCache[t]=c.toDataURL();}).catch(()=>'');}
// ---------- gem icons (inline SVG, faceted, one silhouette per gem) ----------
const shade=(hex,f)=>{const c=new THREE.Color(hex);if(f>0)c.lerp(new THREE.Color(1,1,1),f);else c.multiplyScalar(1+f);return '#'+c.getHexString();};
const GPATH={
  diamond:[[['M8 18 L20 8 L32 18 L20 36 Z',0],['M8 18 L20 8 L20 18 Z',0.45],['M20 8 L32 18 L20 18 Z',0.2],['M8 18 L20 18 L20 36 Z',-0.1],['M20 18 L32 18 L20 36 Z',-0.35]]],
  ruby:[[['M20 5 L32 12 L33 26 L20 36 L7 26 L8 12 Z',0],['M20 5 L32 12 L20 16 Z',0.35],['M20 5 L8 12 L20 16 Z',0.5],['M8 12 L20 16 L7 26 Z',0.05],['M32 12 L20 16 L33 26 Z',-0.2],['M7 26 L20 16 L20 36 Z',-0.15],['M33 26 L20 16 L20 36 Z',-0.4]]],
  sapphire:[[['M20 3 L29 11 L29 29 L20 37 L11 29 L11 11 Z',0],['M20 3 L29 11 L20 13 Z',0.3],['M20 3 L11 11 L20 13 Z',0.5],['M11 11 L20 13 L20 37 L11 29 Z',0.08],['M29 11 L20 13 L20 37 L29 29 Z',-0.3]]],
  aquamarine:[[['M20 2 L27 10 L27 30 L20 38 L13 30 L13 10 Z',0],['M20 2 L13 10 L20 12 Z',0.5],['M20 2 L27 10 L20 12 Z',0.25],['M13 10 L20 12 L20 38 L13 30 Z',0.1],['M27 10 L20 12 L20 38 L27 30 Z',-0.3]]],
  emerald:[[['M12 6 L28 6 L34 12 L34 28 L28 34 L12 34 L6 28 L6 12 Z',-0.1],['M14 11 L26 11 L29 14 L29 26 L26 29 L14 29 L11 26 L11 14 Z',0.15],['M12 6 L28 6 L26 11 L14 11 Z',0.45],['M6 12 L12 6 L14 11 L11 14 Z',0.35]]],
  topaz:[[['M20 4 L35 20 L20 36 L5 20 Z',0],['M20 4 L5 20 L20 20 Z',0.45],['M20 4 L35 20 L20 20 Z',0.15],['M5 20 L20 20 L20 36 Z',-0.05],['M35 20 L20 20 L20 36 Z',-0.35]]],
  opal:[[['M20 5 A15 15 0 1 1 19.9 5 Z',0],['M20 9 A9 7 0 0 1 30 15 A12 10 0 0 0 12 13 A9 7 0 0 1 20 9 Z',0.6]]],
  amethyst:[[['M13 36 L9 18 L13 8 L17 18 L17 36 Z',-0.15],['M27 36 L23 20 L27 11 L31 20 L31 36 Z',-0.3],['M15 37 L15 14 L20 3 L25 14 L25 37 Z',0],['M20 3 L15 14 L20 16 Z',0.5],['M20 3 L25 14 L20 16 Z',0.2]]],
  star:[[['M20 3 L24 15 L37 15 L27 23 L31 36 L20 28 L9 36 L13 23 L3 15 L16 15 Z',0],['M20 3 L24 15 L20 20 L16 15 Z',0.45],['M3 15 L16 15 L20 20 L13 23 Z',0.2],['M37 15 L24 15 L20 20 L27 23 Z',-0.1],['M9 36 L13 23 L20 20 L20 28 Z',-0.05],['M31 36 L27 23 L20 20 L20 28 Z',-0.35]]],
};
function gemSVG(type,special,sz=34){const G0=gemInfo(type,special);const shape=special?SP_SHAPE[type]:type;const P=(GPATH[shape]||GPATH.diamond)[0];
  return `<svg class="gsvg" width="${sz}" height="${sz}" viewBox="0 0 40 40"><defs><filter id="gf"><feGaussianBlur stdDeviation="1.4"/></filter></defs><ellipse cx="20" cy="37" rx="11" ry="2.4" fill="rgba(0,0,0,.35)"/>`+
    P.map(([d,f])=>`<path d="${d}" fill="${shade(G0.col,f)}" stroke="${shade(G0.col,-0.55)}" stroke-width="1.1" stroke-linejoin="round"/>`).join('')+(special?`<circle cx="31" cy="8" r="3" fill="#fff6c8"/>`:'')+`</svg>`;}
// ---------- game state + UI ----------
const G={g:null,speed:1,sel:null,ghost:null,rockMode:false,keepSel:null,phase:'title',firstSync:true,snap:null,snapW:1};
window.__TD=DEBUG?G:undefined;
const best=()=>+(localStorage.getItem('td_best')||0);
const QCLS=['q0','q1','q2','q3','q4'];
function pips(q){return `<div class="pips">${[0,1,2,3,4].map(i=>`<i class="${i<=q?'on':''}"></i>`).join('')}</div>`;}
const gemName=(type,q,special)=>special?T.SPECIAL[type].n:T.QN[q]+T.GEMS[type].n;
const curWave=g=>(g.phase==='wave'||g.phase==='over'||g.over)?g.wave:g.wave+1;
function hud(){const g=G.g;$('hWave').textContent=Math.max(1,curWave(g));$('hWave').nextElementSibling.textContent=curWave(g)>20?'/∞':'/20';$('hLives').textContent=g.lives;$('hGold').textContent=g.gold;
  const ch=g.chance,cost=T.UPCOST[ch];const ub=$('upBtn');ub.innerHTML=cost?`<span class="bi">🎲</span><span>概率 Lv${ch}<small>${cost}💰 升级</small></span>`:`<span class="bi">🎲</span><span>概率 Lv${ch}<small>已满级</small></span>`;ub.disabled=!cost||g.gold<cost;
  $('rockBtn').innerHTML=G.rockMode?`<span class="bi">✖</span><span>取消<small>移除模式</small></span>`:`<span class="bi">⛏</span><span>移除石头<small>${T.ROCK_COST}💰/块</small></span>`;$('rockBtn').classList.toggle('on',G.rockMode);}
function nextInfo(){const g=G.g;const w=curWave(g);const d=T.waveDef(w);const tags=[d.fly?'<span class="tag fly">飞行</span>':'',d.fast?'<span class="tag fast">快速</span>':'',d.boss?'<span class="tag boss">首领</span>':'',d.tank?'<span class="tag tank">重甲</span>':''].join('');
  const el=$('tdNext');el.innerHTML=`<span class="nl">${g.phase==='wave'?'本波':'下一波'}</span><img id="nIcon">${d.n} ×${d.cnt} ${tags}<span class="tag hp">❤${d.hp}</span>`;unitIcon(d.t).then(u=>{const im=$('nIcon');if(im&&u)im.src=u;});loadSpr(d.t);}
function showPanel(k){for(const p of ['pBuild','pKeep','pWave'])$(p).classList.toggle('hidden',p!==k);}
function renderBuild(){const g=G.g;showPanel('pBuild');const n=g.placed.length;$('bTitle').textContent=`第${g.wave+1}回合 · 建造`;$('bCount').innerHTML=`<b>${n}</b>/5 已放置`;
  $('bSlots').innerHTML=[0,1,2,3,4].map(i=>{const gm=g.placed[i];if(gm)return `<div class="card ${QCLS[gm.q]}${G.lastPlaced===gm.id?' pop':''}">${gemSVG(gm.type,false,34)}<div class="cn">${T.GEMS[gm.type].n}</div><div class="cq">${T.QN[gm.q].replace('的','')}</div></div>`;return `<div class="card empty${i===n?' next':''}"><span class="q">?</span><div class="cn">${i===n?'下一颗':'随机'}</div></div>`;}).join('');
  setHint(G.rockMode?'点一块石头将其移除（不能阻断路线）':'点空地预览路线 · 再点一次放置宝石');hud();tut();}
function setHint(s,bad){const h=$('bHint');h.textContent=s;h.classList.toggle('bad',!!bad);}
function optLabel(o){return o.kind==='keep'?'保留':o.kind==='combine2'?'合成 2→1':o.kind==='combine4'?'合成 4→1':'✨特殊';}
function renderKeep(){const g=G.g;showPanel('pKeep');const os=T.keepOptions(g);
  const cards=[];const by={};for(const o of os){const key=o.kind+'|'+o.res.type+'|'+o.res.q;if(!by[key]){by[key]={kind:o.kind,res:o.res,alts:[]};cards.push(by[key]);}by[key].alts.push(o);}
  cards.sort((a,b)=>(b.kind==='special')-(a.kind==='special')||(b.kind!=='keep')-(a.kind!=='keep')||b.res.q-a.res.q);G.cards=cards;G.keepHost=null;
  $('kOpts').innerHTML=cards.map((o,i)=>{const s=T.towerStats({type:o.res.type,q:o.res.q,special:o.res.special});return `<div class="card kopt ${o.kind} ${o.res.special?'sp':QCLS[o.res.q]}" data-i="${i}"><span class="kind">${optLabel(o)}</span>${gemSVG(o.res.type,o.res.special,32)}<div class="cn">${o.res.special?T.SPECIAL[o.res.type].n:T.GEMS[o.res.type].n}</div><div class="cq">${o.res.special?'特殊宝石':T.QN[o.res.q].replace('的','')}</div><span class="st">⚔${Math.round(s.dmg||s.burn||0)}${s.burn&&!s.dmg?'/秒':''}</span></div>`;}).join('');
  $('kOpts').querySelectorAll('.kopt').forEach(el=>el.onclick=()=>selectKeep(+el.dataset.i));selectKeep(null);hud();tut();}
function selectKeep(i){G.keepSel=i;$('kOpts').querySelectorAll('.kopt').forEach(el=>el.classList.toggle('sel',+el.dataset.i===i));const b=$('keepBtn');
  if(i===null){b.disabled=true;b.textContent='点选一张卡片';range.visible=false;setMarks([]);hideTip();G.keepOpt=null;return;}
  const card=G.cards[i];const o=card.alts.find(a=>a.gem===G.keepHost)||card.alts[0];G.keepOpt=o;S.tap();b.disabled=false;b.textContent=o.kind==='keep'?'✔ 保留为防御塔':o.kind==='special'?'✨ 合成特殊宝石':'✔ 合成并保留';
  const s=T.towerStats({type:o.res.type,q:o.res.q,special:o.res.special});showRange(o.gem.c,o.gem.r,s.rng,gemInfo(o.res.type,o.res.special).col);
  setMarks([[o.gem.c,o.gem.r,0xffd75e],...o.use.filter(u=>u!==o.gem).map(u=>[u.c,u.r,0xff9a3a])]);
  const [x,z]=cw(o.gem.c,o.gem.r);const [sx,sy]=toScreen(x,1.0,z);showTip(towerTipHTML({type:o.res.type,q:o.res.q,special:o.res.special})+(card.alts.length>1?'<br><span class="dim">点棋盘上的宝石可选择放置位置</span>':''),sx,sy-10);tut();}
function renderWave(){const g=G.g;showPanel('pWave');$('wTitle').textContent=`第${g.wave}波 · ${g.cur.n}`;waveProg();hud();unitIcon(g.cur.t).then(u=>{const im=$('wIcon');if(im&&u)im.src=u;});}
function waveProg(){const g=G.g;if(!g.cur)return;const left=g.spawnQ.length+g.enemies.filter(e=>e.alive).length;$('wLeft').textContent=`剩余 ${left}/${g.cur.cnt}`;$('wFill').style.width=(100*(1-left/g.cur.cnt))+'%';}
function towerTipHTML(tw){const s=T.towerStats(tw);const G0=gemInfo(tw.type,tw.special);
  return `<b style="color:${G0.col}">${gemName(tw.type,tw.q,tw.special)}</b><br>${s.dmg?`伤害 ${Math.round(s.dmg)} · 攻速 ${(1/s.cd).toFixed(1)}/秒`:''}${s.burn?` 灼烧 ${Math.round(s.burn)}/秒`:''} · 射程 ${s.rng.toFixed(1)}<br><span class="eff">${G0.d}</span>${tw.kills!=null?`<br><span class="dim">击杀 ${tw.kills} · 总伤害 ${Math.round(tw.dmg||0)}</span>`:''}${tw.special?'':`<br><span class="dim">配方：${recipeUses(tw.type,tw.q)}</span>`}`;}
function recipeUses(type,q){const L=Object.values(T.SPECIAL).filter(S=>S.recipe.some(([t,qq])=>t===type&&qq===q)).map(S=>S.n);return L.length?L.join('、'):'—';}
function showTip(html,x,y){const t=$('tdTip');t.innerHTML=html;t.classList.add('show');const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(6,Math.min(innerWidth-w-6,x-w/2))+'px';
  t.style.top=(y>innerHeight*0.42?104:innerHeight-226-h)+'px';}
function hideTip(){$('tdTip').classList.remove('show');}
// ---------- first-round tutorial (pointing hand + coach bubble); remembered in localStorage td_tut ----------
const tutOn=()=>!localStorage.getItem('td_tut')&&G.g&&G.g.wave===0&&G.phase==='play';
function tutCell(){const g=G.g;const p=g.path;let bestC=null,bd=-1;for(let r=1;r<6;r++)for(let c=0;c<W;c++){if(!T.canBuildCell(g,c,r))continue;const near=p.some(([a,b])=>Math.abs(a-c)+Math.abs(b-r)===1);const on=p.some(([a,b])=>a===c&&b===r);if(!on||!near)continue;const t=T.testPlace(g,c,r);if(!t.ok)continue;const d=t.path.length;if(d>bd){bd=d;bestC=[c,r];}}return bestC;}
function tut(){const h=$('tutHand'),b=$('tutBub');if(!tutOn()){h.classList.remove('show');b.classList.remove('show');return;}const g=G.g;let msg='',at=null;
  if(g.phase==='build'){const n=g.placed.length;if(n===0&&!G.ghost){at=G.tutC=G.tutC||tutCell();msg='👆 点一下空地：预览敌人的新路线';}else if(G.ghost&&n<5){at=G.ghost;msg='再点一次同一格 → 放下宝石';}else if(n<5){msg=`很好！再放 ${5-n} 颗。<br>把宝石放在路上能让敌人绕远路`;}}
  else if(g.phase==='keep'){msg=G.keepSel==null?'选一张卡片：这颗宝石会成为防御塔，<br>其余 4 颗变成石头墙':'点下方按钮确认 ✔';}
  if(at){const [x,z]=cw(at[0],at[1]);const [sx,sy]=toScreen(x,0,z);h.style.left=sx+'px';h.style.top=sy+'px';h.classList.add('show');}else h.classList.remove('show');
  if(msg){b.innerHTML=msg;b.classList.add('show');}else b.classList.remove('show');}
// ---------- ghost cell, range ring, selection marks ----------
const cellGeo=rrect(0.92,0.92,0.18);
const ghost=new THREE.Mesh(cellGeo,new THREE.MeshBasicMaterial({color:0x50ff70,transparent:true,opacity:0.6,depthWrite:false}));ghost.position.y=0.03;ghost.visible=false;ghost.renderOrder=2;scene.add(ghost);
const ghostGem=(()=>{const g=new THREE.Group();const gm=gemMesh('diamond',0xffffff,0.45);gm.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshPhongMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:0.4,transparent:true,opacity:0.55,flatShading:true});o.castShadow=false;}});gm.position.y=0.5;g.add(gm);g.userData.gem=gm;g.visible=false;scene.add(g);return g;})();
const range=new THREE.Group();{const r1=new THREE.Mesh(new THREE.RingGeometry(0.965,1,72).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthWrite:false}));const d1=new THREE.Mesh(new THREE.CircleGeometry(1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.14,depthWrite:false}));range.add(r1,d1);range.userData={r1,d1};}
range.position.y=0.04;range.visible=false;range.renderOrder=2;scene.add(range);
function showRange(c,r,rng,col){const [x,z]=cw(c,r);range.position.set(x,0.04,z);range.scale.set(rng,1,rng);range.userData.r1.material.color.set(col);range.userData.d1.material.color.set(col);range.visible=true;range.userData.t=now();}
const markGeo=new THREE.RingGeometry(0.4,0.49,32);markGeo.rotateX(-Math.PI/2);const marks=[];
function setMarks(list){for(const m of marks)scene.remove(m);marks.length=0;for(const [c,r,col] of list){const m=new THREE.Mesh(markGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.95,depthWrite:false}));const [x,z]=cw(c,r);m.position.set(x,0.05,z);m.renderOrder=3;scene.add(m);marks.push(m);}}
let pathShown=null;function setPath(p){pathShown=p;setTrail(p);}
// ---------- flow ----------
function startGame(g){SFX.init();SFX.setTrack('battle');G.g=g;G.ghost=null;G.rockMode=false;G.sel=null;G.tutC=null;
  for(const v of [...views.values()])dropView(v);rockBorn.clear();rockList=[];G.firstSync=false;for(const [k,v] of objs)scene.remove(v.o);objs.clear();syncBoard();setPath(G.g.path);flowT=now();
  $('tdTitle').classList.remove('show');$('tdOver').classList.remove('show');for(const id of ['tdHud','tdNext','tdPanel'])$(id).classList.remove('hidden');G.g.events.length=0;G.phase='play';renderBuild();nextInfo();
  G.snap=T.snapshot(g);G.snapW=g.wave+1;hud();setTimeout(tut,60);}
function newGame(){S.go();const g=T.newGame(DEBUG&&/[?&]seed=(\d+)/.test(location.search)?+RegExp.$1:undefined);
  if(DEBUG&&/[?&]gold=(\d+)/.test(location.search))g.gold=+RegExp.$1;if(DEBUG&&/[?&]spd=(\d+)/.test(location.search)){G.speed=+RegExp.$1;$('speedBtn').textContent=G.speed+'×';}
  startGame(g);banner('第 1 回合','放置 5 颗宝石','build');}
function retryRound(){if(!G.snap)return newGame();S.go();const g=T.restore(G.snap);startGame(g);banner(`第 ${g.wave+1} 回合`,'重新来过！','build');}
function clearSel(){G.ghost=null;ghost.visible=false;ghostGem.visible=false;range.visible=false;setPath(G.g.path);hideTip();}
function tapCell(c,r,sx,sy){const g=G.g;if(!g||G.phase!=='play')return;const inB=c>=0&&r>=0&&c<W&&r<H;const k=inB?g.grid[T.idx(c,r)]:-1;
  if(g.phase==='keep'){if(k===3){const gm=g.placed.find(x=>x.c===c&&x.r===r);G.keepHost=gm;let i=G.keepSel!==null&&G.cards[G.keepSel].alts.some(a=>a.gem===gm)?G.keepSel:G.cards.findIndex(cd=>cd.kind==='keep'&&cd.alts.some(a=>a.gem===gm));if(i>=0){selectKeep(i);const el=$('kOpts').querySelector(`[data-i="${i}"]`);if(el)el.scrollIntoView({inline:'center',behavior:'smooth'});}}
    else if(k===2){const tw=g.towers.find(t=>t.c===c&&t.r===r);const s=T.towerStats(tw);showRange(c,r,s.rng,gemInfo(tw.type,tw.special).col);showTip(towerTipHTML(tw),sx,sy);}return;}
  if(k===2){const tw=g.towers.find(t=>t.c===c&&t.r===r);const s=T.towerStats(tw);S.tap();G.ghost=null;ghost.visible=ghostGem.visible=false;setPath(g.path);showRange(c,r,s.rng,gemInfo(tw.type,tw.special).col);showTip(towerTipHTML(tw),sx,sy);const ob=objs.get(T.idx(c,r));if(ob)ob.pulse=1;return;}
  if(g.phase!=='build'){range.visible=false;hideTip();return;}
  if(k===1){if(G.rockMode){const res=T.removeRock(g,c,r);if(res.ok){S.thud();const [x,z]=cw(c,r);dust(x,z,12,0.4);sparks(x,0.3,z,0xb8b2a8,10,2,0.12);syncBoard();setPath(g.path);flowT=now();toast(`⛏ 移除石头 −${T.ROCK_COST}💰`);hud();shake(0.05);}else{S.tick();setHint(res.reason,true);toast(res.reason,'bad');}}
    else{showTip('<b>石头</b><br><span class="dim">点“⛏ 移除石头”花费10金币移除</span>',sx,sy);range.visible=false;}return;}
  if(k===3){const gm=g.placed.find(x=>x.c===c&&x.r===r);showTip(towerTipHTML({type:gm.type,q:gm.q}),sx,sy);showRange(c,r,T.towerStats(gm).rng,T.GEMS[gm.type].col);return;}
  hideTip();range.visible=false;
  if(G.rockMode){setHint('请点一块石头',true);return;}
  if(G.ghost&&G.ghost[0]===c&&G.ghost[1]===r){const res=T.place(g,c,r);if(res.ok){clearSel();placeFx(res.gem);return;}}
  const t=T.testPlace(g,c,r);G.ghost=[c,r];const [x,z]=cw(c,r);ghost.position.set(x,0.035,z);ghost.visible=true;
  if(t.ok){ghost.material.color.set(0x50ff70);ghostGem.visible=true;ghostGem.position.set(x,0,z);setPath(t.path);G.preview=true;const d=t.path.length-g.path.length;setHint(`路线 ${t.path.length} 格（${d>=0?'+':''}${d}）· 再点一次放置`);S.tap();}
  else{ghost.material.color.set(0xff3a2a);ghostGem.visible=false;setPath(g.path);setHint('⛔ '+t.reason,true);if(t.block){toast('⛔ 不能完全阻断敌人路线！','bad');S.lifeLost();flashPath=0.7;shake(0.06);}else S.tick();}
  tut();}
let flashPath=0;
function placeFx(gm){const o=makeGemObj(gm.type,gm.q,false,false);setObj(gm.c,gm.r,o,'gem');const [x,z]=cw(gm.c,gm.r);const col=new THREE.Color(T.GEMS[gm.type].col).getHex();
  dust(x,z,9,0.32);sparks(x,0.5,z,col,12+gm.q*4,2,0.14);ringFx(x,z,col,0.8);S.pop();if(gm.q>=2)setTimeout(()=>S.rare(),90);setPath(G.g.path);flowT=now();
  ftxt(x,1.0,z,gemName(gm.type,gm.q),gm.q>=3?'crit':'big');G.lastPlaced=gm.id;renderBuild();G.lastPlaced=null;}
function onKeepConfirm(){const g=G.g;if(!G.keepOpt||g.phase!=='keep')return;const o=G.keepOpt;G.keepOpt=null;const isSp=o.kind==='special',isC=o.kind!=='keep';
  const host=o.gem,[hx,hz]=cw(host.c,host.r);const col=new THREE.Color(gemInfo(o.res.type,o.res.special).col).getHex();
  const used=o.use.filter(u=>u!==host),placed=g.placed.slice();const t0=now();const born={};
  const arrive=isC?0.62:0.15;born[T.idx(host.c,host.r)]=t0+arrive;
  // components fly into the host (their cells become rocks after they leave); the rest shatter into rocks
  used.forEach((u,i)=>{const [x,z]=cw(u.c,u.r);flyGem(u.type,u.q,[x,z],[hx,hz],0.05+i*0.08,null);born[T.idx(u.c,u.r)]=t0+0.25+i*0.08;});
  placed.filter(p=>p!==host&&!used.includes(p)).forEach((p,i)=>{const [x,z]=cw(p.c,p.r);const pc=new THREE.Color(T.GEMS[p.type].col).getHex();const d=0.05+i*0.09;born[T.idx(p.c,p.r)]=t0+d;setTimeout(()=>{sparks(x,0.4,z,pc,10,2.2,0.11);dust(x,z,8,0.38);S.shatter();},d*1000);});
  T.keep(g,o);setMarks([]);range.visible=false;hideTip();syncBoard(born);setPath(g.path);flowT=now()+0.4;
  setTimeout(()=>{if(G.g!==g)return;sparks(hx,0.8,hz,col,isSp?30:isC?20:10,isSp?3:2.2,0.15);dust(hx,hz,10,0.4);ringFx(hx,hz,col,isSp?2:1.3,0.5);
    if(isSp){pillar(hx,hz,col);for(let i=1;i<3;i++)setTimeout(()=>ringFx(hx,hz,col,1.6+i*0.4,0.55),i*130);flash('rgba(255,215,94,.35)');shake(0.12);S.forge();banner('✨ '+T.SPECIAL[o.res.type].n,'特殊宝石合成成功！','special',null);}
    else if(isC){S.merge();shake(0.06);banner('合成！',gemName(o.res.type,o.res.q),'combine');}else S.pop();},arrive*1000);
  if(isC)S.whoosh();
  if(!localStorage.getItem('td_tut')){localStorage.setItem('td_tut','1');tut();}
  const d=g.cur;const delay=isSp?1500:isC?1100:350;
  setTimeout(()=>{if(G.g!==g||g.phase!=='wave')return;unitIcon(d.t).then(ic=>{if(d.boss){bossIntro(d,ic);}else{S.horn();banner(`第 ${g.wave} 波`,`${d.n} ×${d.cnt}${d.fly?' · 飞行（无视迷宫）':''}${d.fast?' · 快速':''}${d.tank?' · 重甲':''}`,'wave',ic);}});},delay);
  SFX.setTrack(d.boss?'boss':'battle');renderWave();nextInfo();}
function bossIntro(d,ic){const b=$('bossIntro');b.innerHTML=`<div class="bi-in"><img src="${ic||''}"><div class="bn">首领来袭！</div><div class="bs">${d.n} · ❤${d.hp} · 护甲${d.armor}</div></div>`;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');S.bossHorn();setTimeout(()=>S.roar(),500);shake(0.3);flash('rgba(120,0,20,.35)');}
function processEvents(){const g=G.g;for(const ev of g.events){
  switch(ev.k){
   case 'keep':renderKeep();break;
   case 'spawn':{makeView(ev.e);const [x,z]=cw(ev.e.x,ev.e.y);puffs(x,0.3,z-0.2,4,0xc79aff,0.3,0.6,0.5);if(ev.e.boss){S.roar();shake(0.2);}else if(Math.random()<0.25)S.spawn();break;}
   case 'charge':chargeFx(ev);break;
   case 'shot':shotFx(ev);break;
   case 'hit':hitFx(ev);break;
   case 'splash':{const [x,z]=cw(ev.x,ev.y);const c=new THREE.Color(ev.col).getHex();ringFx(x,z,c,ev.r,0.4);ringFx(x,z,0xffb04a,ev.r*0.6,0.3);puffs(x,0.25,z,6,0x8a7060,0.35,1.6,0.5);sparks(x,0.3,z,0xff9a3a,14,2.8,0.2);if(Math.random()<0.35)S.boom();break;}
   case 'burn':{const [x,z]=cw(ev.tw.c,ev.tw.r);ringFx(x,z,0xff5a3a,ev.rng,0.55,0.06);for(const e of g.enemies)if(e.alive&&Math.hypot(e.x-ev.tw.c,e.y-ev.tw.r)<=ev.rng){const [ex,ez]=cw(e.x,e.y);spawn(ADD,{x:ex+(Math.random()-0.5)*0.3,y:0.2,z:ez,vy:1.2,life:0.45,s0:0.3,s1:0.05,col:0xff6a2a});}const ob=objs.get(T.idx(ev.tw.c,ev.tw.r));if(ob)ob.pulse=1;if(Math.random()<0.3)S.fire();break;}
   case 'die':{const v=views.get(ev.e.id);const [x,z]=cw(ev.e.x,ev.e.y);const y=(v?v.hover:0)+0.3;if(v)v.deadT=0;puffs(x,y,z,ev.e.boss?14:7,0xffffff,ev.e.boss?0.7:0.36,1,0.55);sparks(x,y+0.2,z,0xffd75e,ev.e.boss?20:5,1.6,0.1);
     coinFly(x,y+0.3,z,ev.e.boss?4:1);dmgText(x+0.55,y+1.0,z,'+'+ev.gold+'💰','gold');S.poof();if(ev.e.boss){S.boom();shake(0.35);flash('rgba(255,215,94,.3)');}waveProg();hud();break;}
   case 'leak':{const [x,z]=cw(ev.e.x,ev.e.y);dmgText(x,0.9,z,'−'+ev.cost+'❤','leak');S.lifeLost();flash('rgba(255,40,30,.3)');shake(ev.cost>1?0.45:0.16);ringFx(x,z,0xff3a3a,1.2,0.4);const p=$('hLives').parentNode;bump(p);p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash');waveProg();hud();break;}
   case 'waveClear':{S.coin();S.go();toast(`✅ 第${ev.w}波完成 · 奖励 +${ev.bonus}💰`,'gold');clearSel();setPath(g.path);bump($('hGold').parentNode);break;}
   case 'build':if(G.phase==='play'&&g.wave>0&&!g.over){G.snap=T.snapshot(g);G.snapW=g.wave+1;renderBuild();nextInfo();SFX.setTrack('battle');flowT=now()+0.3;setTimeout(()=>{if(g.phase==='build')banner(`第 ${g.wave+1} 回合`,'放置 5 颗宝石','build');},700);}break;
   case 'victory':{S.win();setTimeout(()=>gameOver(true),900);break;}
   case 'over':{S.lose();shake(0.5);setTimeout(()=>gameOver(false),800);break;}
  }}g.events.length=0;}
function gameOver(win){const g=G.g;G.phase='over';const b=best();const nb=Math.max(b,win?g.wave:g.wave-1);localStorage.setItem('td_best',nb);
  $('oTitle').textContent=win?'胜利！':'防线失守';$('oTitle').className='go-title '+(win?'win':'lose');
  const stars=win?(g.lives>=18?3:g.lives>=10?2:1):0;$('oStars').innerHTML=win?[0,1,2].map(i=>`<i class="${i<stars?'on':''}" style="animation-delay:${0.3+i*0.25}s">★</i>`).join(''):'';
  $('oSub').innerHTML=win?`守住了全部 ${T.MAXW} 波！<br>剩余生命 <b>${g.lives}</b> · 击杀 <b>${g.kills}</b> · 宝石塔 <b>${g.towers.length}</b> 座<br><span class="dim">最高纪录：守住 ${nb} 波</span>`:`倒在第 <b>${g.wave}</b> 波 · 击杀 <b>${g.kills}</b> · 宝石塔 <b>${g.towers.length}</b> 座<br><span class="dim">最高纪录：守住 ${nb} 波</span>`;
  $('oRetry').style.display=win?'none':'';$('oRetry').innerHTML=`↻ 重试第 ${G.snapW} 回合`;$('oCont').style.display=win?'':'none';$('tdOver').classList.add('show');SFX.setTrack('menu');}
// ---------- input ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
let ptr=null;
cv.addEventListener('pointerdown',e=>{ptr={x:e.clientX,y:e.clientY,t:performance.now()};});
cv.addEventListener('pointerup',e=>{if(!ptr)return;const p=ptr;ptr=null;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>14||performance.now()-p.t>700)return;
  ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);camera.position.copy(camBase);camera.updateMatrixWorld();ray.setFromCamera(ndc,camera);const gp=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,gp))return;
  const c=Math.floor(gp.x+W2),r=Math.floor(gp.z+H2);tapCell(c,r,e.clientX,e.clientY);});
const press=el=>{el.addEventListener('pointerdown',()=>el.classList.add('down'));for(const ev of ['pointerup','pointerleave','pointercancel'])el.addEventListener(ev,()=>el.classList.remove('down'));};
document.querySelectorAll('button,.tbtn').forEach(press);
$('tdStart').onclick=()=>{S.click();newGame();};$('oAgain').onclick=()=>{S.click();newGame();};$('oRetry').onclick=()=>{S.click();retryRound();};
$('oCont').onclick=()=>{S.click();$('tdOver').classList.remove('show');G.phase='play';SFX.setTrack('battle');};
$('keepBtn').onclick=onKeepConfirm;
$('upBtn').onclick=()=>{const g=G.g;if(T.upgradeChance(g)){S.rare();toast(`🎲 宝石概率提升到 Lv${g.chance}：${oddsStr(g.chance)}`,'gold',3000);hud();bump($('upBtn'));}else S.tick();};
$('rockBtn').onclick=()=>{S.click();G.rockMode=!G.rockMode;clearSel();renderBuild();};
$('oddsBtn').onclick=()=>{S.click();const g=G.g;showTip(`<b>宝石概率 Lv${g.chance}</b><br>${oddsStr(g.chance)}${T.UPCOST[g.chance]?`<br><span class="dim">下一级 Lv${g.chance+1}：${oddsStr(g.chance+1)}</span>`:''}`,innerWidth/2,innerHeight-200);};
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';$('speedBtn').classList.toggle('on',G.speed>1);};
$('muteBtn').onclick=()=>{SFX.init();SFX.setMuted(!SFX.muted);$('muteBtn').textContent=SFX.muted?'🔇':'🔊';};$('muteBtn').textContent=SFX.muted?'🔇':'🔊';
$('homeBtn').onclick=()=>{S.click();if(!G.g||G.g.over||confirm('放弃本局，返回标题？')){G.phase='title';$('tdTitle').classList.add('show');for(const id of ['tdHud','tdNext','tdPanel'])$(id).classList.add('hidden');SFX.setTrack('menu');refreshTitle();tut();}};
$('recipeBtn').onclick=()=>{S.click();openBook();};$('bookClose').onclick=()=>{S.click();$('tdBook').classList.remove('show');};
function oddsStr(lv){const o=T.ODDS[lv];return o.map((p,q)=>p?`${T.QS[q]}${p}%`:'').filter(Boolean).join(' ');}
function openBook(){const rows=Object.entries(T.GEMS).map(([k,g])=>`<div class="row">${gemSVG(k,false,26)}<div><b>${g.n}</b> · ${g.d}</div></div>`).join('');
  const sp=Object.entries(T.SPECIAL).map(([k,s])=>`<div class="row">${gemSVG(k,true,26)}<div><b>${s.n}</b> = ${s.recipe.map(([t,q])=>T.QN[q]+T.GEMS[t].n).join(' + ')}<br><span style="color:#9fb0e8">${s.d}</span></div></div>`).join('');
  const odds=`<table><tr><th>Lv</th>${T.QS.map(q=>`<th>${q}</th>`).join('')}<th>升级</th></tr>${T.ODDS.map((o,i)=>`<tr><td>${i}</td>${o.map(p=>`<td>${p||''}</td>`).join('')}<td>${T.UPCOST[i]||'—'}</td></tr>`).join('')}</table>`;
  $('bookBody').innerHTML=`<h3>宝石（品质：碎裂→有瑕疵→普通→无瑕→完美）</h3>${rows}<h3>合成</h3>2 颗相同宝石（同种同品质）→ 高一级；4 颗相同 → 高两级。<h3>特殊宝石配方</h3>${sp}<h3>宝石概率（%）</h3>${odds}`;$('tdBook').classList.add('show');}
function refreshTitle(){const b=best();$('tdBest').innerHTML=b?`最高纪录：守住 <b>${b}</b> 波`:'';}
refreshTitle();
// ---------- main loop ----------
const clock=new THREE.Clock();let fpsA=60,lowT=0;
const SLOW=DEBUG&&/[?&]slow=([\d.]+)/.test(location.search)?+RegExp.$1:1;
function frame(){requestAnimationFrame(frame);const dt=Math.min(0.05,clock.getDelta())*SLOW;fpsA=fpsA*0.95+(1/Math.max(dt,0.001))*0.05;const g=G.g;const t=now();
  // adaptive resolution: if a phone struggles for 3s, drop the pixel ratio once
  if(fpsA<34&&PR>1.25){lowT+=dt;if(lowT>3){PR=1.25;renderer.setPixelRatio(PR);fitCamera();}}else lowT=0;
  const sdt=dt*(g&&g.phase==='wave'?G.speed:1);
  if(g&&G.phase==='play'){if(g.phase==='wave'){const n=G.speed*2;for(let i=0;i<n;i++){T.stepWave(g,dt/2);if(g.phase!=='wave')break;}}processEvents();}
  updateViews(sdt);stepShots(sdt);flushDmg(dt);stepRings(dt);stepPillars(dt);stepFlyers(dt);stepPool(ADD,sdt);stepPool(SMK,sdt);stepPool(ORB,sdt);
  if(rockAnim)writeRocks();
  for(const [k,v] of objs){const ud=v.o.userData;const age=t-v.born;
    if(age<0){v.o.visible=false;continue;}v.o.visible=true;
    if(age<0.45){const a=age/0.45,e=1+2.7*Math.pow(a-1,3)+1.7*Math.pow(a-1,2),sq=1+Math.sin(a*Math.PI*2)*0.28*(1-a);const K=ud.k||1;v.o.scale.set(K*e/Math.sqrt(sq),K*e*sq,K*e/Math.sqrt(sq));}else if(v.o.scale.y!==(ud.k||1))v.o.scale.setScalar(ud.k||1);
    let ck=0;if(v.ch){v.ch.t+=sdt;ck=Math.min(1,v.ch.t/v.ch.dur);const K=ud.k||1,gy=ud.h0*K;if(Math.random()<0.75){const a=Math.random()*6.28,r=0.55+Math.random()*0.25,yy=(Math.random()-0.3)*0.5;const px=v.o.position.x+Math.cos(a)*r,pz=v.o.position.z+Math.sin(a)*r;spawn(ADD,{x:px,y:gy+yy,z:pz,vx:-Math.cos(a)*r/0.22,vy:-yy/0.22,vz:-Math.sin(a)*r/0.22,life:0.22,s0:0.09,s1:0.16,col:v.ch.col,a:0.9});}if(ck>=1&&v.ch.t>v.ch.dur+1)v.ch=null;}
    if(age>=0.45){const K=ud.k||1,p=v.pulse;v.o.scale.set(K*(1+ck*0.06-p*0.04),K*(1-ck*0.1+p*0.12),K*(1+ck*0.06-p*0.04));}
    if(ud.gem){const sm=ud.gem.userData.spinM;if(sm)sm.rotation.y+=dt*(ud.spin+ck*9);else ud.gem.rotation.y+=dt*(ud.spin+ck*9);if(v.kind==='tower')ud.glow.material.opacity=0.18+ck*0.5+v.pulse*0.4;const p=v.pulse;ud.gem.position.y=ud.h0+Math.sin(t*2.2+ud.seed)*0.04+p*0.06+ck*0.05;const sc=1+p*0.18+ck*0.32;ud.gem.scale.set(sc,sc*(1-p*0.1),sc);if(ud.gem.userData.mat&&v.kind==='tower')ud.gem.userData.mat.emissiveIntensity=0.28+ck*1.5+p*0.9;
      ud.glow.scale.setScalar(ud.gs*(2.6+p*2+ck*2.2+Math.sin(t*3+ud.seed)*0.2));if(p)v.pulse=Math.max(0,p-dt*5);}
    if(ud.orbit)ud.orbit.rotation.y+=dt*1.6;if(ud.halo)ud.halo.material.opacity=0.45+Math.sin(t*2+ud.seed)*0.15;
    if(ud.auraM){ud.auraM.rotation.y+=dt*0.6;ud.auraM.material.opacity=(g&&g.phase==='wave'?0.75:0.5)+Math.sin(t*4)*0.08;}}
  if(ghostGem.visible){ghostGem.userData.gem.rotation.y+=dt*2;ghostGem.userData.gem.position.y=0.5+Math.sin(t*4)*0.05;}
  for(const mk of markers){mk.ring.material.opacity=0.65+Math.sin(t*3)*0.25;}
  for(const m of marks)m.rotation.y+=dt*1.5;
  if(range.visible){const a=Math.min(1,(t-(range.userData.t||0))/0.18);const e=1+Math.sin(a*Math.PI)*0.06;range.userData.r1.scale.set(e,1,e);}
  portalSwirl.rotation.z-=dt*1.8;gateGlow.material.opacity=0.55+Math.sin(t*2.5)*0.15;
  const build=g&&(g.phase==='build'||g.phase==='keep');flashPath=Math.max(0,flashPath-dt);
  drawChevrons(build,G.ghost&&ghostGem.visible,flashPath>0&&(flashPath*8|0)%2===0);
  const nw=g?T.waveDef(curWave(g)):null;drawFly(nw&&nw.fly?T.flyPath():null);
  if(tutOn()&&$('tutHand').classList.contains('show')&&G.tutC&&!G.ghost){const [x,z]=cw(G.tutC[0],G.tutC[1]);const [sx,sy]=toScreen(x,0,z);$('tutHand').style.left=sx+'px';$('tutHand').style.top=sy+'px';}
  // screen shake (decays fast); camBase is restored before input raycasts
  if(shakeA>0.001){shakeA*=Math.pow(0.0015,dt);camera.position.set(camBase.x+(Math.random()-0.5)*shakeA,camBase.y+(Math.random()-0.5)*shakeA*0.6,camBase.z+(Math.random()-0.5)*shakeA);}else camera.position.copy(camBase);
  renderer.render(scene,camera);}
frame();
if(DEBUG)window.__TDX={T,G,camera,renderer,views,objs,fps:()=>fpsA,tapCell,cw,toScreen,newGame,retryRound,syncBoard,setPath,
  info:()=>renderer.info.render,
  addTower:(type,c,r,special,q=0)=>{const g=G.g;if(!T.canBuildCell(g,c,r))return false;g.grid[T.idx(c,r)]=2;const p=T.findPath(g);if(!p){g.grid[T.idx(c,r)]=0;return false;}g.path=p;g.towers.push({id:g.nextId++,c,r,type,q,special:!!special,cd:0,kills:0,dmg:0});syncBoard();setPath(g.path);return true;}};
if(/[?&]start/.test(location.search))newGame();

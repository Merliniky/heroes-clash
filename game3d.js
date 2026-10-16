// build r6-3d : three.js renderer + per-stage run flow
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const {U,GC,GR,GX0,GY0,CW,CH,MAXS}=Core;const {M:MD,KKW,PROPS}=MODELS;
const $=id=>document.getElementById(id);const S=SFX.S;
const DEBUG=/[?&]debug/.test(location.search);
const sprSrc=t=>U[t].rig?'assets/p_'+U[t].art+'.png':'assets/c/'+t+'.png';
// ---------- renderer / scene ----------
const cv=$('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x8fc4e8);scene.fog=new THREE.Fog(0x8fc4e8,22,42);
const camera=new THREE.PerspectiveCamera(36,1,0.5,80);
const hemi=new THREE.HemisphereLight(0xdff1ff,0x5c7a3a,1.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,2.4);sun.position.set(-6,12,7);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:8,bottom:-8,near:1,far:40});sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.02;sun.shadow.radius=3;
scene.add(sun);scene.add(sun.target);
// toon ramp
const ramp=(()=>{const d=new Uint8Array([90,90,90,255, 175,175,175,255, 255,255,255,255]);const t=new THREE.DataTexture(d,3,1);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
const RIM={value:new THREE.Color(0xffffff)};
function rimify(m,str=0.35){m.onBeforeCompile=sh=>{sh.uniforms.rimC=RIM;sh.fragmentShader='uniform vec3 rimC;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
  `#include <emissivemap_fragment>\n{float r=1.0-clamp(dot(normalize(vViewPosition),normal),0.0,1.0);totalEmissiveRadiance+=rimC*${str.toFixed(2)}*pow(r,3.0);}`);};m.customProgramCacheKey=()=>'rim'+str;return m;}
const toonCache=new Map();
function toon(m,tint){const key=m.uuid+'|'+(tint||0);if(toonCache.has(key))return toonCache.get(key);
  const t=new THREE.MeshToonMaterial({map:m.map||null,color:m.color?m.color.clone():new THREE.Color(1,1,1),gradientMap:ramp,transparent:m.transparent,alphaTest:m.alphaTest||0,side:m.side});
  if(m.emissive&&m.emissive.getHex()&&m.name==='Glow'){t.emissive=m.emissive.clone();t.emissiveIntensity=1.5;}
  if(m.name==='Glow'){t.emissive=new THREE.Color(m.color||0x66ccff);t.emissiveIntensity=1.2;}
  if(tint){const tc=new THREE.Color(tint);if(t.map)t.color.multiply(tc);else{const o={},q={};t.color.getHSL(o);tc.getHSL(q);t.color.setHSL(q.h,Math.max(q.s*0.85,o.s*0.5),Math.min(0.75,Math.max(o.l*1.4,q.l*0.55)));}}
  if(m.skinning)t.skinning=true;rimify(t);toonCache.set(key,t);return t;}
// ---------- loading ----------
const loader=new GLTFLoader();const gltfP={};
const loadG=f=>gltfP[f]||(gltfP[f]=new Promise((res,rej)=>loader.load('assets/models/'+f+'.glb?v=6',res,undefined,rej)));
// ---------- board ----------
const W2=GC/2,H2=GR/2;
const toW=(x,y)=>[(x-GX0)/CW-W2,(y-GY0)/CH-H2];
const board=new THREE.Group();scene.add(board);
function grassTex(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const cw=512/GC,ch=512/GR;
  for(let i=0;i<GC;i++)for(let j=0;j<GR;j++){const l=(i+j)%2?0:1;x.fillStyle=l?'#7fbf4a':'#74b343';x.fillRect(i*cw,j*ch,cw+1,ch+1);}
  for(let k=0;k<1400;k++){x.fillStyle=`rgba(${40+Math.random()*60|0},${110+Math.random()*60|0},30,${0.15+Math.random()*0.2})`;const px=Math.random()*512,py=Math.random()*512;x.fillRect(px,py,1.5,3+Math.random()*3);}
  x.strokeStyle='rgba(255,255,255,0.10)';x.lineWidth=1.5;for(let i=0;i<=GC;i++){x.beginPath();x.moveTo(i*cw,0);x.lineTo(i*cw,512);x.stroke();}for(let j=0;j<=GR;j++){x.beginPath();x.moveTo(0,j*ch);x.lineTo(512,j*ch);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
{const g=new THREE.PlaneGeometry(GC,GR);const m=new THREE.MeshToonMaterial({map:grassTex(),gradientMap:ramp});const p=new THREE.Mesh(g,m);p.rotation.x=-Math.PI/2;p.receiveShadow=true;board.add(p);
  // raised dirt border
  const bm=new THREE.MeshToonMaterial({color:0x9a7650,gradientMap:ramp});const bw=0.35;
  for(const [w,d,x,z] of [[GC+bw*2,bw,0,-H2-bw/2],[GC+bw*2,bw,0,H2+bw/2],[bw,GR,-W2-bw/2,0],[bw,GR,W2+bw/2,0]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,0.16,d),bm);b.position.set(x,0.02,z);b.receiveShadow=true;b.castShadow=true;board.add(b);}
  const out=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshToonMaterial({color:0x5f9a3a,gradientMap:ramp}));out.rotation.x=-Math.PI/2;out.position.y=-0.06;out.receiveShadow=true;board.add(out);
  // spawn-side tints
  for(const [s,col] of [[-1,0x4f8cff],[1,0xff5a4a]]){const z=new THREE.Mesh(new THREE.PlaneGeometry(4,GR),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.07,depthWrite:false}));z.rotation.x=-Math.PI/2;z.position.set(s*(W2-2),0.005,0);board.add(z);}
}
const propObjs=[];
function cullProps(){const near=portrait?new THREE.Vector3(-W2-0.6,0,0):new THREE.Vector3(0,0,H2+0.8);const dn=camBase.distanceTo(near);for(const o of propObjs)o.visible=camBase.distanceTo(o.position)>dn;}
async function placeProps(){const R=Core.rng(1234),r=()=>R();const list=await Promise.all(PROPS.map(f=>loadG(f).then(g=>[f,g]).catch(()=>null)));const G={};for(const x of list)if(x)G[x[0]]=x[1].scene;
  const put=(f,x,z,s,ry)=>{const src=G[f];if(!src)return;const o=src.clone(true);o.traverse(n=>{if(n.isMesh){n.material=toon(n.material);n.castShadow=true;n.receiveShadow=true;}});
    const bb=new THREE.Box3().setFromObject(o);const hgt=bb.max.y-bb.min.y||1;o.scale.setScalar(s/hgt);o.position.set(x,0,z);o.rotation.y=ry;board.add(o);propObjs.push(o);};
  // fences along long edges, trees & rocks around
  for(let i=-W2+0.2;i<W2;i+=1.6){put('n_medieval_village_pack_Fence',i+0.8,-H2-0.75,0.45,0);put('n_medieval_village_pack_Fence',i+0.8,H2+0.75,0.45,0);}
  const trees=['n_CommonTree_1','n_CommonTree_3','n_PineTree_1'],small=['n_Bush_1','n_BushBerries_1','n_Rock_1','n_Rock_2','n_Rock_Moss_1','n_Flowers'];
  for(let k=0;k<70;k++){const a=r()*Math.PI*2;const ex=W2+1.2+r()*7,ez=H2+1.4+r()*6;let x=Math.cos(a)*ex,z=Math.sin(a)*ez;if(Math.abs(x)<W2+0.9&&Math.abs(z)<H2+1.2)continue;if((z>0&&z<H2+5)||(x<0&&x>-W2-5))continue;
    put(trees[k%3],x,z,1.6+r()*1.4,r()*6);}
  for(let k=0;k<60;k++){const side=k%4;let x,z;if(side<2){x=(r()-0.5)*(GC+3);z=(side?1:-1)*(H2+0.45+r()*0.25);if(r()<0.5)z=(side?1:-1)*(H2+1.2+r()*1.5);}else{z=(r()-0.5)*(GR+2);x=(side===2?1:-1)*(W2+0.5+r()*1.4);}
    put(small[k%small.length],x,z,0.18+r()*0.3,r()*6);}
  cullProps();
}
// ---------- camera fit (Clash-Royale-like fixed perspective) ----------
let portrait=false,camBase=new THREE.Vector3(),camLook=new THREE.Vector3();let PITCH=52*Math.PI/180;
function fitCamera(){const w=innerWidth,h=innerHeight;portrait=h>w*1.1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=portrait?44:34;PITCH=(portrait?55:50)*Math.PI/180;camera.updateProjectionMatrix();
  const top=portrait?62:56,bot=portrait?40:12;const yMin=-1+2*bot/h,yMax=1-2*top/h;
  const corners=[[-W2-0.4,-H2-0.4],[W2+0.4,-H2-0.4],[-W2-0.4,H2+0.4],[W2+0.4,H2+0.4]].map(([x,z])=>new THREE.Vector3(x,0,z));
  const tops=[[-W2,-H2],[W2,-H2],[-W2,H2],[W2,H2]].map(([x,z])=>new THREE.Vector3(x,0.9,z));
  const dir=portrait?new THREE.Vector3(-Math.cos(PITCH),Math.sin(PITCH),0):new THREE.Vector3(0,Math.sin(PITCH),Math.cos(PITCH));
  let lo=4,hi=60,shift=0;
  for(let it=0;it<30;it++){const d=(lo+hi)/2;place(d,0,dir);let ok=true;let ys=[];
    for(const p of corners.concat(tops)){const q=p.clone().project(camera);if(Math.abs(q.x)>(p.y>0.5?1.0:0.99))ok=false;ys.push(q.y);}
    const span=Math.max(...ys)-Math.min(...ys);if(span>yMax-yMin)ok=false;if(ok)hi=d;else lo=d;}
  place(hi,0,dir);let ys=corners.concat(tops).map(p=>p.clone().project(camera).y);const mid=(Math.max(...ys)+Math.min(...ys))/2,want=(yMax+yMin)/2;
  // shift look target to centre the board in the free area
  const up=portrait?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,-1);shift=0;
  for(let it=0;it<20;it++){place(hi,shift,dir,up);ys=corners.concat(tops).map(p=>p.clone().project(camera).y);const m2=(Math.max(...ys)+Math.min(...ys))/2;shift+=(m2-want)*hi*0.35;}
  camBase.copy(camera.position);scene.fog.near=hi*1.05;scene.fog.far=hi*2.4;cullProps();
  function place(d,s,dir,up){camLook.set(0,0,0);if(up)camLook.addScaledVector(up,s);camera.position.copy(camLook).addScaledVector(dir,d);camera.up.set(0,1,0);camera.lookAt(camLook);camera.updateMatrixWorld();}
}
addEventListener('resize',fitCamera);
// ---------- unit templates ----------
const tplP={};const UNIT_SCALE=1.55;
for(const t in MD){const d=MD[t];d.h*=UNIT_SCALE;if(d.fly)d.fly*=UNIT_SCALE;if(d.rider){d.rider.h*=UNIT_SCALE;d.rider.y*=UNIT_SCALE;}}
function measure(o){o.updateMatrixWorld(true);const bb=new THREE.Box3(),v=new THREE.Vector3();
  o.traverse(n=>{if(!n.isMesh)return;let p=n,vis=true;while(p){if(!p.visible)vis=false;p=p.parent;}if(!vis)return;const pos=n.geometry.attributes.position;const step=Math.max(1,Math.floor(pos.count/1500));
    if(n.isSkinnedMesh)n.skeleton.update();
    for(let i=0;i<pos.count;i+=step){if(n.isSkinnedMesh)n.getVertexPosition(i,v);else v.fromBufferAttribute(pos,i);v.applyMatrix4(n.matrixWorld);bb.expandByPoint(v);}});return bb;}
function prepMeshes(o,def,tint){o.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=false;n.frustumCulled=false;
  if(KKW.includes(n.name))n.visible=(def.show||[]).includes(n.name);
  n.material=Array.isArray(n.material)?n.material.map(m=>toon(m,tint)):toon(n.material,tint);}});}
async function buildPart(f,def,tint){const g=await loadG(f);const o=SkeletonUtils.clone(g.scene);prepMeshes(o,def,tint);
  // props on bones
  for(const p of def.props||[]){const pg=await loadG(p.f);const po=pg.scene.clone(true);po.traverse(n=>{if(n.isMesh){n.material=toon(n.material);n.castShadow=true;}});
    const bone=o.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(p.bone));if(!bone){console.warn('no bone',p.bone);continue;}const bb=new THREE.Box3().setFromObject(po);const sz=bb.getSize(new THREE.Vector3());const L=Math.max(sz.x,sz.y,sz.z)||1;
    const holder=new THREE.Group();if(p.rot)holder.rotation.set(...p.rot);holder.add(po);if(!p.f.startsWith('Skeleton_'))po.position.sub(bb.getCenter(new THREE.Vector3())).add(new THREE.Vector3(0,sz.y*0.3,0));
    o.updateMatrixWorld(true);const ws=bone.getWorldScale(new THREE.Vector3()).x;const H=measure(o).getSize(new THREE.Vector3()).y;
    holder.scale.setScalar(p.len*H/(L*ws));bone.add(holder);}
  return {o,anims:g.animations};}
function ensureTpl(t){if(tplP[t])return tplP[t];const def=MD[t];
  tplP[t]=(async()=>{const main=await buildPart(def.f,def,def.tint);const root=new THREE.Group();root.add(main.o);
    main.o.updateMatrixWorld(true);let bb=measure(main.o);const h=bb.max.y-bb.min.y||1;const k=def.h/h;main.o.scale.setScalar(k);if(def.sx)main.o.scale.x*=def.sx,main.o.scale.z*=def.sx;
    main.o.position.y=-bb.min.y*k;
    let rider=null;if(def.rider){const rd=def.rider;const rp=await buildPart(rd.f,rd,def.tint&&rd.f.startsWith('k_')?null:null);
      const bone=main.o.getObjectByName(rd.bone)||main.o;root.updateMatrixWorld(true);const rb=measure(rp.o);const rh=rb.max.y-rb.min.y||1;const ws=bone.getWorldScale(new THREE.Vector3()).x;
      const hold=new THREE.Group();hold.name='riderHold';hold.add(rp.o);rp.o.scale.setScalar(rd.h/rh/ws);bone.add(hold);
      // seat the rider: place hold so rider hips sit at bone + y
      hold.position.set(0,rd.y/ws,0);rider={anims:rp.anims};}
    return {root,anims:main.anims,rider,def};})();
  return tplP[t];}
function act(mixer,anims,name,once){const c=THREE.AnimationClip.findByName(anims,name);if(!c)return null;const a=mixer.clipAction(c);if(once){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}return a;}
// ---------- per-unit view ----------
const ringGeo=new THREE.RingGeometry(0.34,0.44,40);ringGeo.rotateX(-Math.PI/2);
const discGeo=new THREE.CircleGeometry(0.34,32);discGeo.rotateX(-Math.PI/2);
const teamMat={p:new THREE.MeshBasicMaterial({color:0x3d8bff,transparent:true,opacity:0.95,depthWrite:false}),e:new THREE.MeshBasicMaterial({color:0xff4636,transparent:true,opacity:0.95,depthWrite:false})};
const teamDisc={p:new THREE.MeshBasicMaterial({color:0x3d8bff,transparent:true,opacity:0.22,depthWrite:false}),e:new THREE.MeshBasicMaterial({color:0xff4636,transparent:true,opacity:0.22,depthWrite:false})};
const focusMat=new THREE.MeshBasicMaterial({color:0xffd23a,transparent:true,opacity:0.95,depthWrite:false});
const holdMat=new THREE.MeshBasicMaterial({color:0xffb020,transparent:true,opacity:0.9,depthWrite:false});
const pickGeo=new THREE.BoxGeometry(1,1,1);const pickMat=new THREE.MeshBasicMaterial({visible:false});
const unitLayer=new THREE.Group();scene.add(unitLayer);
const uiLayer=$('uiLayer');
const views=new Map();
function makeView(u,tpl){const def=tpl.def,g=new THREE.Group();const inner=SkeletonUtils.clone(tpl.root);g.add(inner);
  const fw=u.fw,fh=u.fh,rs=Math.max(fw,fh)>1?(fw===2&&fh===2?1.95:1.45):1;
  const ring=new THREE.Mesh(ringGeo,teamMat[u.side]);ring.scale.set(fw===2?rs:rs*0.92,1,fh===2?rs:(fw===2?1.05:0.92));ring.position.y=0.012;ring.renderOrder=1;g.add(ring);
  const disc=new THREE.Mesh(discGeo,teamDisc[u.side]);disc.scale.copy(ring.scale);disc.position.y=0.01;g.add(disc);
  const pick=new THREE.Mesh(pickGeo,pickMat);pick.scale.set(fw*0.9,def.h*1.1+(def.fly?def.fly:0),fh*0.9);pick.position.y=pick.scale.y/2;pick.userData.u=u;g.add(pick);
  const mixer=new THREE.AnimationMixer(inner);const A=tpl.anims,c=def.c;
  const base={idle:act(mixer,A,c.idle),walk:act(mixer,A,c.walk),run:act(mixer,A,c.run)};
  for(const k in base)if(base[k]){base[k].play();base[k].setEffectiveWeight(0);base[k].time=Math.random()*2;}
  const one={atk:act(mixer,A,def.atk||c.atk,1),shoot:act(mixer,A,def.shoot||c.shoot||def.atk||c.atk,1),hit:act(mixer,A,c.hit,1),death:act(mixer,A,c.death,1),cheer:c.cheer?act(mixer,A,c.cheer,1):null};
  let rmix=null,rone=null;if(tpl.rider){const rh=inner.getObjectByName('riderHold');const rd=def.rider;rmix=new THREE.AnimationMixer(rh);const ri=act(rmix,tpl.rider.anims,rd.clip);if(ri)ri.play();rone=act(rmix,tpl.rider.anims,rd.atk,1);}
  // badge + hp bar (DOM)
  const el=document.createElement('div');el.className='ub '+u.side;el.innerHTML='<b></b><i><s></s></i>';uiLayer.appendChild(el);
  const v={u,g,inner,mixer,base,one,rmix,rone,ring,disc,pick,el,cntEl:el.firstChild,hpEl:el.lastChild.firstChild,def,mv:0,os:null,osW:0,yaw:u.side==='p'?Math.PI/2:-Math.PI/2,deadT:-1,lastCount:-1,spawn:0,bob:Math.random()*6,hitFlash:0,lastHp:-1};
  g.rotation.y=v.yaw;unitLayer.add(g);views.set(u,v);return v;}
function playOne(v,k,dur){const a=v.one[k];if(!a)return;if(v.os&&v.os!==a)v.os.stop();const clip=a.getClip(),imp=(v.def.c.imp||0.45)*clip.duration;
  a.reset();a.enabled=true;a.setEffectiveWeight(1);
  if(dur){const ts=Math.min(2.6,Math.max(1,imp/dur));a.timeScale=ts;a.time=Math.max(0,imp-dur*ts);}else a.timeScale=k==='hit'?1.4:1;
  a.play();v.os=a;v.osK=k;v.osW=1;}
function disposeViews(){for(const v of views.values()){unitLayer.remove(v.g);v.el.remove();v.mixer.stopAllAction();}views.clear();}
const tmpV=new THREE.Vector3();
function unitWorld(u){const [x,z]=toW(u.x,u.y);return [x,z];}
function updateView(v,dt,b){const u=v.u,def=v.def;const [x,z]=unitWorld(u);
  const fly=(def.fly||0)+(u.st.fly&&!def.fly?0.18:0);
  v.bob+=dt*3;const hover=fly?fly+Math.sin(v.bob)*0.05:0;
  v.spawn=Math.min(1,v.spawn+dt*3);const sp=v.spawn<1?(1-Math.pow(1-v.spawn,3)):1;
  v.g.position.set(x,0,z);v.inner.position.y=hover;v.g.scale.setScalar(0.2+0.8*sp);
  // facing: toward target when engaged, else movement direction
  let want=v.yaw;const t=u.target&&u.target.alive?u.target:null;
  if(u.alive){if(u.moving){const [x0,z0]=toW(...Core.cellCenter(u.fx,u.fy,u.fw,u.fh)),[x1,z1]=toW(...Core.cellCenter(u.ax,u.ay,u.fw,u.fh));if(Math.hypot(x1-x0,z1-z0)>0.01)want=Math.atan2(x1-x0,z1-z0);}
    else if(t){const [tx,tz]=unitWorld(t);want=Math.atan2(tx-x,tz-z);}}
  let d=want-v.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));v.yaw+=d*Math.min(1,dt*10);v.g.rotation.y=v.yaw;
  // locomotion blend
  const moving=u.alive&&u.moving;v.mv+=((moving?1:0)-v.mv)*Math.min(1,dt*10);
  const f=Math.max(0,Math.min(1,(Core.cellsPerRound(u.st.spd)-2.3)/1.6));
  if(v.os&&v.osK!=='death'){const a=v.os,clip=a.getClip();const left=(clip.duration-a.time)/Math.max(0.01,a.timeScale);if(!a.isRunning()||left<0.12){v.osW=Math.max(0,v.osW-dt*8);if(v.osW<=0){a.stop();v.os=null;}}a.setEffectiveWeight(v.osW);}
  const bw=v.os?1-v.osW:1;
  const B=v.base;if(B.idle)B.idle.setEffectiveWeight(bw*(1-v.mv));
  const walkW=bw*v.mv*(B.run?1-f:1),runW=bw*v.mv*(B.run?f:0);
  if(B.walk)B.walk.setEffectiveWeight(walkW);if(B.run&&B.run!==B.walk)B.run.setEffectiveWeight(runW);
  const loco=0.9+f*0.5;if(B.walk)B.walk.timeScale=loco*1.15;if(B.run)B.run.timeScale=loco*0.9;
  v.mixer.update(dt);if(v.rmix)v.rmix.update(dt);
  // death: clip, then sink
  if(!u.alive){if(v.deadT<0){v.deadT=0;playOne(v,'death');if(v.rone)v.rone.stop();v.el.classList.add('dead');}
    v.deadT+=dt;if(v.deadT>1.4){const k=Math.min(1,(v.deadT-1.4)/0.9);v.inner.position.y=hover-k*0.9*def.h;v.ring.material=teamDisc[u.side];v.ring.scale.multiplyScalar(0.98);}
    if(v.deadT>2.4){v.g.visible=false;}}
  // rings
  if(u.alive){v.ring.material=b.focus===u?focusMat:(u.hold?holdMat:teamMat[u.side]);}
}
// ---------- DOM badges ----------
function updateBadges(){const w=innerWidth,h=innerHeight;
  for(const v of views.values()){const u=v.u;if(!v.g.visible||!u.alive){v.el.style.display='none';continue;}
    tmpV.set(0,v.def.h*1.08+(v.def.fly||0)+(u.st.fly&&!v.def.fly?0.18:0),0);v.g.localToWorld(tmpV);tmpV.project(camera);
    const sx=(tmpV.x+1)/2*w,sy=(1-tmpV.y)/2*h;v.el.style.display='';v.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-100%)`;
    if(v.lastCount!==u.count){if(v.lastCount>=0&&u.count<v.lastCount){v.el.classList.remove('bump');void v.el.offsetWidth;v.el.classList.add('bump');}v.lastCount=u.count;v.cntEl.textContent=u.count;}
    const hp=((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp);if(Math.abs(hp-v.lastHp)>0.002){v.lastHp=hp;v.hpEl.style.width=(Math.max(0,hp)*100).toFixed(1)+'%';}
    v.el.classList.toggle('focus',G.battle&&G.battle.focus===u);v.el.classList.toggle('hold',!!u.hold);}}
// ---------- particles ----------
const MAXP=1600;
function makePool(blending){const geo=new THREE.BufferGeometry();const pos=new Float32Array(MAXP*3),col=new Float32Array(MAXP*4),siz=new Float32Array(MAXP);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('size',new THREE.BufferAttribute(siz,1).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({uniforms:{scale:{value:400}},transparent:true,depthWrite:false,blending,vertexShader:`attribute float size;attribute vec4 color;varying vec4 vC;uniform float scale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*scale/-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec4 vC;void main(){vec2 d=gl_PointCoord-0.5;float r=length(d);if(r>0.5)discard;float a=smoothstep(0.5,0.15,r);gl_FragColor=vec4(vC.rgb,vC.a*a);}`});
  const pts=new THREE.Points(geo,mat);pts.frustumCulled=false;scene.add(pts);return {geo,mat,pos,col,siz,list:[]};}
const PA=makePool(THREE.AdditiveBlending),PN=makePool(THREE.NormalBlending);
function P(o,add){const pool=add?PA:PN;if(pool.list.length>=MAXP)pool.list.shift();pool.list.push(Object.assign({x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,drag:2,life:0.5,t:0,s:0.1,grow:1,c:[1,1,1],a:1},o));}
function stepPool(pool,dt){const L=pool.list;let n=0;for(let i=L.length-1;i>=0;i--){const p=L[i];p.t+=dt;if(p.t>=p.life){L.splice(i,1);continue;}}
  for(const p of L){const dd=Math.exp(-p.drag*dt);p.vx*=dd;p.vy*=dd;p.vz*=dd;p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<0.01&&p.g>0){p.y=0.01;p.vy*=-0.3;}
    const k=p.t/p.life;pool.pos[n*3]=p.x;pool.pos[n*3+1]=p.y;pool.pos[n*3+2]=p.z;pool.col[n*4]=p.c[0];pool.col[n*4+1]=p.c[1];pool.col[n*4+2]=p.c[2];pool.col[n*4+3]=p.a*(1-k)*(k<0.1?k*10:1);pool.siz[n]=p.s*(1+(p.grow-1)*k);n++;}
  pool.geo.setDrawRange(0,n);for(const a of ['position','color','size'])pool.geo.attributes[a].needsUpdate=true;}
const C3=h=>{const c=new THREE.Color(h);return [c.r,c.g,c.b];};
function sparks(x,y,z,col,n=8,sp=1){for(let i=0;i<n;i++){const a=Math.random()*6.28,e=Math.random()*1.2;P({x,y,z,vx:Math.cos(a)*(1.5+Math.random()*2.5)*sp,vy:(1+Math.random()*2.5)*sp,vz:Math.sin(a)*(1.5+Math.random()*2.5)*sp,g:9,drag:1.5,life:0.35+Math.random()*0.25,s:0.07,c:C3(col)},true);}}
function dust(x,z,n=8,sc=1){for(let i=0;i<n;i++){const a=Math.random()*6.28;P({x:x+Math.cos(a)*0.15*sc,y:0.05,z:z+Math.sin(a)*0.15*sc,vx:Math.cos(a)*(0.5+Math.random())*sc,vy:0.25+Math.random()*0.4,vz:Math.sin(a)*(0.5+Math.random())*sc,drag:3,life:0.6+Math.random()*0.4,s:0.18*sc,grow:2.4,c:C3(0xcdb48a),a:0.55});}}
function puff(x,y,z,col,n,sp,size,life,rise=0.5,add=true,a=0.8){for(let i=0;i<n;i++){const an=Math.random()*6.28,v=sp*(0.3+Math.random()*0.7);P({x,y,z,vx:Math.cos(an)*v,vy:rise*(0.5+Math.random()),vz:Math.sin(an)*v,drag:2.5,life:life*(0.7+Math.random()*0.6),s:size,grow:1.8,c:C3(col),a},add);}}
function fireP(x,y,z,vx,vy,vz,s=0.16,life=0.45){P({x,y,z,vx,vy,vz,g:-1.5,drag:1.2,life,s,grow:2,c:[1,0.55+Math.random()*0.3,0.15],a:0.9},true);}
// ---------- slash trails / rings / bolts ----------
const fxList=[];const arcGeo=new THREE.TorusGeometry(1,0.05,4,24,Math.PI*0.9);
function slash(v,t,col=0xffffff,big=1){const [ax,az]=unitWorld(v.u),[tx,tz]=unitWorld(t);const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const o=new THREE.Mesh(arcGeo,m);const r=0.28*big*Math.max(1,v.def.h/0.65);o.scale.set(r,r,r*2.2);o.position.set(ax+(tx-ax)*0.55,v.def.h*0.55+(v.def.fly||0),az+(tz-az)*0.55);
  o.rotation.set(Math.random()*0.8-0.4+Math.PI/2,Math.atan2(tx-ax,tz-az)+Math.PI/2,Math.random()*1.2-0.6);scene.add(o);fxList.push({o,t:0,life:0.2,kind:'arc',rz:(Math.random()<0.5?-1:1)*9});}
const ringFxGeo=new THREE.RingGeometry(0.8,1,40);ringFxGeo.rotateX(-Math.PI/2);
function ringFx(x,z,col,r=0.6,life=0.35){const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9,depthWrite:false,blending:THREE.AdditiveBlending});const o=new THREE.Mesh(ringFxGeo,m);o.position.set(x,0.03,z);scene.add(o);fxList.push({o,t:0,life,kind:'ring',r});}
function bolt(x,z,h){const pts=[];let px=x+(Math.random()-0.5)*0.3,pz=z,py=h+3;for(let i=0;i<9;i++){pts.push(new THREE.Vector3(px,py,pz));py-=(py-h)/(9-i)*1.0;px=x+(Math.random()-0.5)*0.35;pz=z+(Math.random()-0.5)*0.35;}pts.push(new THREE.Vector3(x,h,z));
  const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xd8f0ff,transparent:true,blending:THREE.AdditiveBlending}));scene.add(o);fxList.push({o,t:0,life:0.25,kind:'line'});}
function stepFx(dt){for(let i=fxList.length-1;i>=0;i--){const f=fxList[i];f.t+=dt;const k=f.t/f.life;
  if(k>=1){scene.remove(f.o);f.o.material.dispose();if(f.kind==='line')f.o.geometry.dispose();fxList.splice(i,1);continue;}
  f.o.material.opacity=(1-k)*0.95;if(f.kind==='arc'){f.o.rotation.z+=f.rz*dt;f.o.scale.multiplyScalar(1+dt*2);}if(f.kind==='ring'){const s=f.r*(0.3+k*1.2);f.o.scale.set(s,1,s);}}}
// ---------- projectiles ----------
const projViews=new Map();
const projMat={bolt:new THREE.MeshToonMaterial({color:0x6b4a2b,gradientMap:ramp}),axe:new THREE.MeshToonMaterial({color:0xb0b4bc,gradientMap:ramp}),
  holy:new THREE.MeshBasicMaterial({color:0xcfe9ff}),death:new THREE.MeshBasicMaterial({color:0xb070ff}),fire:new THREE.MeshBasicMaterial({color:0xffa030})};
const boltGeo=new THREE.CylinderGeometry(0.018,0.018,0.4,5);boltGeo.rotateX(Math.PI/2);const orbGeo=new THREE.SphereGeometry(0.1,12,8);const axeGeo=new THREE.BoxGeometry(0.16,0.04,0.2);
const TRAIL={holy:0xa8d8ff,death:0x9a50ff,fire:0xff8a20,bolt:0xfff2c0,axe:0xdddddd};
function projView(p){let pv=projViews.get(p);if(pv)return pv;const k=p.kind||'bolt';const orb=k==='holy'||k==='death'||k==='fire';
  const o=new THREE.Mesh(orb?orbGeo:k==='axe'?axeGeo:boltGeo,projMat[k]||projMat.bolt);o.castShadow=true;scene.add(o);
  if(orb){const l=new THREE.PointLight(TRAIL[k],1.2,1.6,2);o.add(l);}
  const sh=p.src.vis3?p.src.vis3:null;const h0=(MD[p.src.type].h*0.6)+(MD[p.src.type].fly||0),h1=MD[p.t.type].h*0.5+(MD[p.t.type].fly||0);
  pv={o,k,orb,h0,h1,arc:orb?0.35:k==='axe'?0.8:0.6,prev:null,spin:0};projViews.set(p,pv);return pv;}
function updateProj(b,dt){const live=new Set(b.proj);for(const [p,pv] of projViews)if(!live.has(p)){scene.remove(pv.o);projViews.delete(p);}
  for(const p of b.proj){const pv=projView(p);const [x,z]=toW(p.x,p.y);const d=Math.hypot(p.t.x-p.x,p.t.y-p.y);const f=Math.max(0,Math.min(1,1-d/(p.d0||1)));
    const y=pv.h0+(pv.h1-pv.h0)*f+Math.sin(f*Math.PI)*pv.arc*Math.min(1,(p.d0||300)/400);const np=new THREE.Vector3(x,y,z);
    if(pv.prev){const dir=np.clone().sub(pv.prev);if(dir.lengthSq()>1e-6)pv.o.lookAt(np.clone().add(dir));}
    if(pv.k==='axe'){pv.spin+=dt*18;pv.o.rotateX(pv.spin);}
    pv.o.position.copy(np);pv.prev=np;
    const tc=C3(TRAIL[pv.k]||0xffffff);P({x,y,z,vx:0,vy:0.05,vz:0,drag:4,life:pv.orb?0.35:0.18,s:pv.orb?0.16:0.05,grow:pv.orb?0.4:1,c:tc,a:0.8},true);
    if(pv.orb&&Math.random()<0.6)P({x:x+(Math.random()-0.5)*0.1,y,z:z+(Math.random()-0.5)*0.1,vy:0.3,drag:2,life:0.4,s:0.06,c:tc},true);}}
// ---------- damage numbers / pops ----------
function worldToScreen(x,y,z){tmpV.set(x,y,z).project(camera);return [(tmpV.x+1)/2*innerWidth,(1-tmpV.y)/2*innerHeight];}
function floatText(u,str,cls){const [x,z]=unitWorld(u);const d=MD[u.type];const [sx,sy]=worldToScreen(x,d.h*1.25+(d.fly||0),z);
  const el=document.createElement('div');el.className='ft '+(cls||'');el.textContent=str;el.style.left=(sx+(Math.random()-0.5)*18)+'px';el.style.top=sy+'px';uiLayer.appendChild(el);setTimeout(()=>el.remove(),1100);}
// ---------- screen shake ----------
let shake=0;
// ---------- events ----------
function headOf(u){const [x,z]=unitWorld(u);const d=MD[u.type];return [x,d.h*0.55+(d.fly||0),z];}
function handleEvents(b){for(const e of b.events){const u=e.u;const v=u?views.get(u):null;
  if(e.k==='wind'){if(v){if(e.ranged)playOne(v,'shoot',u.wt||0.42);else{playOne(v,'atk',u.wt||0.36);if(v.rone){v.rone.reset();v.rone.timeScale=1.6;v.rone.play();}}}
    if(u.st.fx==='breath'){S.roar();breathers.push({u,t:0,dur:0.9});}if(u.st.fx==='charge')S.gallop();}
  else if(e.k==='shoot'){const p=u.st.proj;(({arrow:S.bow,bolt:S.bolt,bolt2:S.magic,holy:S.magic,death:S.dark,fire:S.fireball,axe:S.slash,rock:S.heavy})[p]||S.bow)();
    const [x,y,z]=headOf(u);if(p==='holy')puff(x,y,z,0x9fd4ff,8,0.6,0.1,0.4);if(p==='death')puff(x,y,z,0xa060ff,8,0.6,0.1,0.4);}
  else if(e.k==='strike')strikeFx(u,e.t,e.retal);
  else if(e.k==='pop')floatText(u,e.str,'pop');
  else if(e.k==='cloud'){const [x,,z]=unitWorld(e.t);S.dark();for(let i=0;i<40;i++){const a=Math.random()*6.28,d=Math.random()*1.4;P({x:x+Math.cos(a)*d,y:0.2+Math.random()*0.5,z:z+Math.sin(a)*d,vx:Math.cos(a)*0.3,vy:0.25,vz:Math.sin(a)*0.3,drag:1.5,life:1.0,s:0.35,grow:1.6,c:C3(0x7a40b0),a:0.5});}ringFx(x,z,0x9a50ff,1.5,0.5);}
  else if(e.k==='zap'){const [x,y,z]=headOf(u);S.magic();shake=Math.max(shake,0.12);bolt(x,z,y);bolt(x,z,y);sparks(x,y,z,0xcfeaff,12,1.2);}
  else if(e.k==='drain'){const [x,y,z]=headOf(u);for(let i=0;i<10;i++)P({x:x+(Math.random()-0.5)*0.4,y:y*Math.random()*1.4,z:z+(Math.random()-0.5)*0.4,vy:0.8,life:0.6,s:0.06,c:[1,0.15,0.25]},true);}
  else if(e.k==='regen'){const [x,y,z]=headOf(u);floatText(u,'再生','heal');for(let i=0;i<10;i++)P({x:x+(Math.random()-0.5)*0.4,y:y*Math.random(),z:z+(Math.random()-0.5)*0.4,vy:0.7,life:0.7,s:0.05,c:[0.5,1,0.5]},true);}
  else if(e.k==='fireball'){const [x,,z]=unitWorld(e.t);S.fireball();shake=Math.max(shake,0.12);for(let i=0;i<40;i++){const a=Math.random()*6.28,d=Math.random()*1.1;fireP(x+Math.cos(a)*d,0.2,z+Math.sin(a)*d,Math.cos(a)*0.6,0.6+Math.random(),Math.sin(a)*0.6,0.22,0.55);}ringFx(x,z,0xff8a20,1.4);}
  else if(e.k==='breath2'){const [x,y,z]=headOf(e.t);for(let i=0;i<16;i++)fireP(x,y,z,(Math.random()-0.5)*2,Math.random()*1.5,(Math.random()-0.5)*2);}
  else if(e.k==='hit'){const tv=views.get(u);if(tv&&u.alive&&!(tv.os&&(tv.osK==='atk'||tv.osK==='shoot')))playOne(tv,'hit');if(tv)tv.hitFlash=1;
    floatText(u,'-'+e.dmg,(u.side==='p'?'dmgp':'dmge')+(e.big?' big':''));
    if(!e.src||!e.src.st.proj||e.src.st.shots<=0)S.hit();if(e.big)shake=Math.max(shake,0.16);if(e.killed>0)S.death();if(e.dead){shake=Math.max(shake,0.1);const [x,,z]=unitWorld(u);dust(x,z,14,1.3);}}
  else if(e.k==='impact'){const p=e.p;const [x,z]=toW(p.x,p.y);const y=MD[p.t.type].h*0.5+(MD[p.t.type].fly||0);
    if(p.kind==='holy'){S.holyHit();puff(x,y,z,0xaedcff,14,1.2,0.12,0.4);sparks(x,y,z,0xcfeaff,8);}
    else if(p.kind==='death'){puff(x,y,z,0xa050f0,14,1.2,0.12,0.45);}
    else if(p.kind==='fire'){for(let i=0;i<14;i++)fireP(x,y,z,(Math.random()-0.5)*2,Math.random()*1.5,(Math.random()-0.5)*2);}
    else{S.thunk();sparks(x,y,z,0xf4e2b8,6,0.7);}}
}b.events.length=0;}
const breathers=[];
function stepBreath(dt){for(let i=breathers.length-1;i>=0;i--){const br=breathers[i];br.t+=dt;if(br.t>br.dur||!br.u.alive){breathers.splice(i,1);continue;}const u=br.u,t=u.windT||u.target;if(!t)continue;
  const [x,y,z]=headOf(u),[tx,ty,tz]=headOf(t);const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz)||1;const k=br.t/br.dur;if(k<0.25)continue;
  for(let j=0;j<5;j++){const sp=3+Math.random()*2;fireP(x+dx/d*0.4,y+0.15,z+dz/d*0.4,dx/d*sp+(Math.random()-0.5)*0.8,(Math.random()-0.5)*0.6-0.2,dz/d*sp+(Math.random()-0.5)*0.8,0.2,0.4);}}}
function strikeFx(u,t,retal){const v=views.get(u);if(!v||!t)return;const [tx,ty,tz]=headOf(t);const [ax,,az]=headOf(u);
  if(retal)floatText(u,'反击','retal');
  switch(u.st.fx){
    case 'thrust':S.thrust();slash(v,t,0xffffff,0.7);sparks(tx,ty,tz,0xffffff,5);break;
    case 'slash':S.slash();S.clash();slash(v,t,u.st.ab&&u.st.ab.undead?0xd8d8c8:0xffffff);sparks(tx,ty,tz,0xffe9a0,8);break;
    case 'flame':S.flame();S.clash();slash(v,t,0xffaa30,1.2);for(let i=0;i<14;i++)fireP(tx,ty,tz,(Math.random()-0.5)*2,Math.random()*1.5,(Math.random()-0.5)*2);break;
    case 'cleave':S.slash();S.heavy();slash(v,t,0xff9a7a,1.3);dust(tx,tz,8,1.2);shake=Math.max(shake,0.08);break;
    case 'bite':S.bite();slash(v,t,0xc8ff90,0.8);for(let i=0;i<6;i++)P({x:tx,y:ty,z:tz,vx:(Math.random()-0.5)*1.5,vy:1+Math.random(),vz:(Math.random()-0.5)*1.5,g:6,life:0.5,s:0.05,c:[0.6,0.85,0.35]});break;
    case 'charge':S.heavy();S.clash();dust(tx,tz,14,1.6);ringFx(tx,tz,0xfff0c0,0.9);shake=Math.max(shake,0.12);slash(v,t,0xffffff,1.1);break;
    case 'breath':S.clash();break;
    case 'claw':S.slash();slash(v,t,0xff7a50,0.9);sparks(tx,ty,tz,0xff9060,6);break;
    default:S.slash();slash(v,t);}}
// ---------- input: raycast taps ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function pickAt(cx,cy){ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const picks=[];for(const v of views.values())if(v.u.alive)picks.push(v.pick);
  const hits=ray.intersectObjects(picks,false);if(hits.length)return hits[0].object.userData.u;
  // fallback: nearest unit to the ground point (generous for fat fingers)
  const gp=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),gp))return null;let best=null,bd=0.75;
  for(const v of views.values()){if(!v.u.alive)continue;const [x,z]=unitWorld(v.u);const d=Math.hypot(gp.x-x,gp.z-z)-Math.max(v.u.fw,v.u.fh)*0.3;if(d<bd){bd=d;best=v.u;}}return best;}
cv.addEventListener('pointerdown',e=>{const b=G.battle;if(!b||(G.phase!=='battle'&&G.phase!=='countdown'))return;const u=pickAt(e.clientX,e.clientY);if(!u)return;const v=views.get(u);
  if(u.side==='p'){if(u.st.shots>0){floatText(u,'远程部队·无需待命','info');S.click();return;}u.hold=!u.hold;floatText(u,u.hold?'⏸ 待命':'⚔ 进攻！',u.hold?'hold':'go');S.tick();const [x,z]=unitWorld(u);ringFx(x,z,u.hold?0xffc040:0x80ff80,0.7);return;}
  b.focus=u;const [x,z]=unitWorld(u);ringFx(x,z,0xffd23a,0.9,0.45);S.click();$('hint').classList.add('hidden');G.focusHintShown=true;});
// ---------- game state / flow ----------
const G={stage:1,army:{},battle:null,phase:'title',speed:1,focusHintShown:false,stats:{kills:0}};
const ST=Stage;
function show(id,on){$(id).classList.toggle('show',on);}
function banner(txt,dur=900){const el=$('banner');el.textContent=txt;el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(banner.t);banner.t=setTimeout(()=>el.classList.add('hidden'),dur);}
function abilText(st){const a=st.ab||{},L=[];
  if(st.fly)L.push('飞行');if(st.shots)L.push(`远程射击（${st.shots}发）`+(a.noMP?'·近战无惩罚':'·近战伤害减半'));
  if(a.dbl)L.push(st.shots?'每次射击两次':'连续攻击两次');if(a.noRet)L.push('敌人无法反击');if(a.retal===2)L.push('每回合可反击2次');if(a.retal===99)L.push('无限反击');
  if(a.joustImm)L.push('免疫骑士冲锋加成');if(a.joust)L.push('冲锋：每移动1格伤害+5%');
  if(a.hate)L.push('憎恨 '+Object.keys(a.hate).map(t=>U[t]?U[t].n:t).join('/')+'：伤害+50%');if(a.undead)L.push('不死生物');if(a.unliving)L.push('无生命');
  if(a.cloud)L.push('死亡之云：溅射目标周围（不死免疫）');if(a.fireball)L.push('火球：溅射目标周围');if(a.breath)L.push('龙息：同时伤害目标后方1格');
  if(a.drain)L.push('生命吸取');if(a.regen)L.push('再生：每回合恢复');if(a.stun)L.push(`${a.stun[1]}：${a.stun[0]*100}%几率使目标停滞`);
  if(a.curse)L.push('诅咒：25%几率令目标只造成最低伤害');if(a.deathBlow)L.push('致命一击：20%几率双倍伤害');if(a.deathStare)L.push('死亡凝视');
  if(a.allAdj)L.push('攻击所有相邻敌人');if(a.ignoreDef)L.push(`无视${a.ignoreDef*100}%防御`);if(a.lightning)L.push('闪电：20%几率追加伤害');if(a.fireShield)L.push('烈焰护盾');
  if(st.fw===2&&st.fh===2)L.push('体型：2×2格');else if(st.fw===2)L.push('体型：2格');
  return L.length?L.map(x=>'· '+x).join('<br>'):'· 无特殊能力';}
const statRow=(k,v)=>`<div><span>${k}</span><b>${v}</b></div>`;
function unitCard(t,count){const st=U[t];const tags=[st.shots?'<span class="tag r">远程</span>':'<span class="tag m">近战</span>',st.fly?'<span class="tag f">飞行</span>':'',(G.army[t]?'<span class="tag up">合并</span>':'')].join('');
  return `<div class="art"><span class="tier">${'★'.repeat(st.lvl)}</span><img src="${sprSrc(t)}"><span class="cnt">×${count}</span></div>
    <div class="nm">${count} ${st.n}</div><div class="h3">HoMM3 · ${st.h3} · ${st.lvl}级 · ${Core.FNAME[st.fac]}</div><div class="tags">${tags}</div>
    <div class="stats">${statRow('攻',st.a)+statRow('防',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>
    <div class="abil">${abilText(st)}</div>`;}
function armyStrip(){const s=ST.stacks(G.army);const el=$('armyStrip');el.innerHTML=s.map(x=>`<div class="mini"><img src="${sprSrc(x.type)}"><b>${x.count}</b></div>`).join('')+Array(Math.max(0,MAXS-s.length)).fill('<div class="mini empty"></div>').join('');}
function startRun(){SFX.init();SFX.startMusic();S.click();G.stage=1;G.army={};
  const qs=+(new URLSearchParams(location.search).get('stage')||0);if(DEBUG&&qs>1){for(let s=1;s<qs;s++){const o=ST.makeOffer(s,G.army);ST.add(G.army,o[0].count*U[o[0].type].v>=o[1].count*U[o[1].type].v?o[0]:o[1]);}G.stage=qs;}G.stats={kills:0,lost:0};show('title',false);show('gameover',false);show('result',false);openDraft();}
function openDraft(){G.phase='offer';disposeViews();G.battle=null;$('hud').classList.add('hidden');
  $('draftTitle').textContent=`第 ${G.stage} / ${ST.STAGES} 关`;$('draftSub').textContent=G.stage===1?'选择一支部队开始征程':'选择一支援军加入你的部队（幸存者保留）';
  const offer=ST.makeOffer(G.stage,G.army);G.offer=offer;const el=$('cards');el.innerHTML='';
  offer.forEach((o,i)=>{const c=document.createElement('div');c.className='card';c.innerHTML=unitCard(o.type,o.count);c.style.animationDelay=(i*0.08)+'s';c.onclick=()=>pickOffer(i,c);el.appendChild(c);ensureTpl(o.type);});
  armyStrip();show('draft',true);
  G.enemies=ST.makeEnemies(G.stage);G.enemies.forEach(e=>ensureTpl(e.type));}
function pickOffer(i,el){if(G.phase!=='offer')return;G.phase='picked';S.pick();el.classList.add('chosen');[...$('cards').children].forEach(c=>{if(c!==el)c.classList.add('gone');});
  ST.add(G.army,G.offer[i]);armyStrip();setTimeout(()=>{show('draft',false);startBattle();},520);}
function startBattle(){G.phase='loading';let br=ST.stacks(G.army);if(br.length>MAXS)br=br.slice(0,MAXS);G.brought=br;
  const types=[...new Set(br.map(s=>s.type).concat(G.enemies.map(s=>s.type)))];
  Promise.all(types.map(ensureTpl)).then(tpls=>{const TP={};types.forEach((t,i)=>TP[t]=tpls[i]);
    disposeViews();G.battle=Core.createBattle(br,G.enemies);for(const u of G.battle.units){const v=makeView(u,TP[u.type]);v.spawn=-Math.random()*0.5;}
    setTimeout(()=>{for(const u of G.battle.units){const [x,z]=unitWorld(u);dust(x,z,8,1);}S.spawn();},250);
    $('hud').classList.remove('hidden');$('stageNum').textContent=`${G.stage}/${ST.STAGES}`;countdown();}).catch(e=>errToast('模型加载失败 '+e.message));}
function countdown(){G.phase='countdown';banner(`第 ${G.stage} 关`,900);[['3',1000],['2',1500],['1',2000]].forEach(([s,d])=>setTimeout(()=>{banner(s,600);S.tick();},d));
  setTimeout(()=>{banner('战斗！',700);S.go();G.phase='battle';G.endT=0;if(!G.focusHintShown)$('hint').classList.remove('hidden');},2500);}
function surv(b,side){const m={};for(const u of b.units)if(u.side===side&&u.alive)m[u.type]=(m[u.type]||0)+u.count;return m;}
function endBattle(){const b=G.battle;if(G.phase!=='battle')return;G.phase='result';$('hint').classList.add('hidden');const win=b.over==='win';win?S.win():S.lose();
  const sp=surv(b,'p');for(const s of G.brought){G.army[s.type]-=s.count;G.army[s.type]+=sp[s.type]||0;if(G.army[s.type]<=0)delete G.army[s.type];}
  for(const u of b.units){if(u.side==='e')G.stats.kills+=u.start-u.count;else G.stats.lost+=u.start-u.count;}
  for(const v of views.values())if(v.u.alive&&v.u.side===(win?'p':'e')&&v.one.cheer)playOne(v,'cheer');
  const pl=b.units.filter(u=>u.side==='p');
  if(!win||G.stage>=ST.STAGES){setTimeout(()=>gameOver(win),1400);return;}
  $('resTitle').textContent='胜利';$('resTitle').className='res-title';
  $('resList').innerHTML=pl.map((u,i)=>`<div class="res-unit ${u.alive?'':'dead'}" style="animation-delay:${i*0.07}s"><img src="${sprSrc(u.type)}"><div class="c">${u.alive?'×'+u.count:'阵亡'}</div><div class="l">${u.start-u.count>0?'-'+(u.start-u.count):''}</div><div class="n">${u.st.n}</div></div>`).join('');
  $('resSub').textContent=`第 ${G.stage} 关已通过 · 幸存部队将带入下一关`;$('resBtn').textContent='下一关 →';
  $('resBtn').onclick=()=>{S.click();show('result',false);G.stage++;openDraft();};
  for(let i=0;i<24;i++)setTimeout(()=>confetti(),i*40);setTimeout(()=>show('result',true),900);}
function confetti(){const x=(Math.random()-0.5)*GC,z=(Math.random()-0.5)*GR;const c=[0xffd75a,0x78c8ff,0xff78a0][Math.floor(Math.random()*3)];for(let i=0;i<6;i++)P({x,y:2+Math.random(),z,vx:(Math.random()-0.5)*2,vy:Math.random()*2,vz:(Math.random()-0.5)*2,g:3,drag:1,life:1.4,s:0.12,c:C3(c)},true);}
function gameOver(win){G.phase='over';$('hud').classList.add('hidden');
  $('goTitle').textContent=win?'凯旋':'战败';$('goTitle').className='go-title'+(win?'':' lose');
  $('goSub').textContent=win?`你征服了全部 ${ST.STAGES} 关！`:`止步于第 ${G.stage} 关`;
  $('goStats').innerHTML=`<div>关卡 <b>${win?ST.STAGES:G.stage-1}/${ST.STAGES}</b></div><div>歼敌 <b>${G.stats.kills}</b></div><div>损失 <b>${G.stats.lost}</b></div>`;
  $('goArt').innerHTML=ST.stacks(G.army).slice(0,5).map(s=>`<img src="${sprSrc(s.type)}">`).join('');show('gameover',true);}
$('startBtn').onclick=startRun;$('goBtn').onclick=()=>{show('gameover',false);startRun();};
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};
const mb=$('muteBtn');const setMB=()=>mb.textContent=SFX.muted?'🔇':'🔊';setMB();mb.onclick=()=>{SFX.init();SFX.setMuted(!SFX.muted);setMB();S.click();};
function errToast(m){const t=$('errToast');t.textContent='⚠ 出错了：'+m;t.classList.add('show');clearTimeout(errToast.t);errToast.t=setTimeout(()=>t.classList.remove('show'),8000);}
addEventListener('error',e=>errToast((e.message||'')+(e.lineno?' @'+e.lineno:'')));addEventListener('unhandledrejection',e=>errToast(String(e.reason&&e.reason.message||e.reason)));
// ---------- main loop ----------
const clock=new THREE.Clock();let fpsA=60;
function frame(){requestAnimationFrame(frame);let dt=Math.min(0.05,clock.getDelta());fpsA=fpsA*0.95+(1/Math.max(dt,0.001))*0.05;
  const b=G.battle;const gdt=dt*G.speed;
  if(b){if(G.phase==='battle'){const n=G.speed;for(let i=0;i<n;i++)Core.step(b,dt);handleEvents(b);
      $('pCount').textContent=b.units.filter(u=>u.alive&&u.side==='p').reduce((a,u)=>a+u.count,0);$('eCount').textContent=b.units.filter(u=>u.alive&&u.side==='e').reduce((a,u)=>a+u.count,0);
      if(b.over){G.endT+=dt;if(G.endT>1.2)endBattle();}}
    for(const v of views.values())updateView(v,G.phase==='battle'?gdt:dt,b);updateProj(b,gdt);}
  stepPool(PA,gdt);stepPool(PN,gdt);stepFx(gdt);stepBreath(gdt);
  shake=Math.max(0,shake-dt*0.6);camera.position.copy(camBase);if(shake>0){camera.position.x+=(Math.random()-0.5)*shake;camera.position.y+=(Math.random()-0.5)*shake*0.6;camera.position.z+=(Math.random()-0.5)*shake;}
  const ps=renderer.getPixelRatio()*innerHeight/ (2*Math.tan(camera.fov*Math.PI/360));PA.mat.uniforms.scale.value=PN.mat.uniforms.scale.value=ps;
  renderer.render(scene,camera);updateBadges();}
// ---------- boot ----------
fitCamera();placeProps();requestAnimationFrame(frame);
$('titleHeroes').innerHTML=['crusader','greenDragon','lich'].map(s=>`<img src="${sprSrc(s)}">`).join('');
// warm the title: preload the first-stage roster quietly
ST.ROSTER.filter(t=>U[t].lvl<=2).forEach(t=>ensureTpl(t));
if(DEBUG){window.__G=G;window.__dbg={setCam:(p,l)=>{camBase.copy(p);camera.position.copy(p);camera.lookAt(l);camera.fov=40;camera.updateProjectionMatrix();},THREE,scene,camera,renderer,views,ensureTpl,makeView,disposeViews,unitWorld,playOne,fps:()=>fpsA,
  tap:u=>{const v=views.get(u);tmpV.set(0,v.def.h*0.5+(v.def.fly||0),0);v.g.localToWorld(tmpV);tmpV.project(camera);return [(tmpV.x+1)/2*innerWidth,(1-tmpV.y)/2*innerHeight];},
  showcase:async(types,side='p')=>{disposeViews();const list=types.map(t=>({type:t,count:10}));G.battle=Core.createBattle(list,[]);G.battle.over=null;for(const u of G.battle.units){const tp=await ensureTpl(u.type);makeView(u,tp).spawn=1;}},
  pick:i=>G.phase==='offer'&&$('cards').children[i||0].click()};}

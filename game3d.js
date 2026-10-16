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
const RIM={value:new THREE.Color(0xffffff)},RIMG={value:new THREE.Color(0xffc840)};
function rimify(m,str=0.35,gold){m.onBeforeCompile=sh=>{sh.uniforms.rimC=gold?RIMG:RIM;sh.fragmentShader='uniform vec3 rimC;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
  `#include <emissivemap_fragment>\n{float r=1.0-clamp(dot(normalize(vViewPosition),normal),0.0,1.0);totalEmissiveRadiance+=rimC*${str.toFixed(2)}*pow(r,3.0);}`);};m.customProgramCacheKey=()=>'rim'+str+(gold?'g':'');return m;}
const toonCache=new Map();
function toon(m,tint,glow){const key=m.uuid+'|'+(tint||0)+'|'+(glow?1:0);if(toonCache.has(key))return toonCache.get(key);
  const t=new THREE.MeshToonMaterial({map:m.map||null,color:m.color?m.color.clone():new THREE.Color(1,1,1),gradientMap:ramp,transparent:m.transparent,alphaTest:m.alphaTest||0,side:m.side});
  if(m.emissive&&m.emissive.getHex()&&m.name==='Glow'){t.emissive=m.emissive.clone();t.emissiveIntensity=1.5;}
  if(m.name==='Glow'){t.emissive=new THREE.Color(m.color||0x66ccff);t.emissiveIntensity=1.2;}
  if(tint){const tc=new THREE.Color(tint);if(t.map)t.color.multiply(tc);else{const o={},q={};t.color.getHSL(o);tc.getHSL(q);t.color.setHSL(q.h,Math.max(q.s*0.85,o.s*0.5),Math.min(0.75,Math.max(o.l*1.4,q.l*0.55)));}}
  if(glow){t.emissive=new THREE.Color(0xffb020);t.emissiveIntensity=0.12;}rimify(t,glow?1.1:0.35,!!glow);toonCache.set(key,t);return t;}
// ---------- loading ----------
const loader=new GLTFLoader();const gltfP={};
const loadG=f=>gltfP[f]||(gltfP[f]=new Promise((res,rej)=>loader.load('assets/models/'+f+'.glb?v=7',res,undefined,rej)));
// ---------- board ----------
const W2=GC/2,H2=GR/2;
const toW=(x,y)=>[(x-GX0)/CW-W2,(y-GY0)/CH-H2];
const board=new THREE.Group();scene.add(board);
function grassTex(c1='#7fbf4a',c2='#74b343',gr=[40,110]){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');
  const cw=512/GC,ch=512/GR;
  for(let i=0;i<GC;i++)for(let j=0;j<GR;j++){const l=(i+j)%2?0:1;x.fillStyle=l?c1:c2;x.fillRect(i*cw,j*ch,cw+1,ch+1);}
  for(let k=0;k<1400;k++){x.fillStyle=`rgba(${gr[0]+Math.random()*60|0},${gr[1]+Math.random()*60|0},30,${0.15+Math.random()*0.2})`;const px=Math.random()*512,py=Math.random()*512;x.fillRect(px,py,1.5,3+Math.random()*3);}
  x.strokeStyle='rgba(255,255,255,0.10)';x.lineWidth=1.5;for(let i=0;i<=GC;i++){x.beginPath();x.moveTo(i*cw,0);x.lineTo(i*cw,512);x.stroke();}for(let j=0;j<=GR;j++){x.beginPath();x.moveTo(0,j*ch);x.lineTo(512,j*ch);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
let GRASSM,OUTM;{const g=new THREE.PlaneGeometry(GC,GR);const m=GRASSM=new THREE.MeshToonMaterial({map:grassTex(),gradientMap:ramp});const p=new THREE.Mesh(g,m);p.rotation.x=-Math.PI/2;p.receiveShadow=true;board.add(p);
  // raised dirt border
  const bm=new THREE.MeshToonMaterial({color:0x9a7650,gradientMap:ramp});const bw=0.35;
  for(const [w,d,x,z] of [[GC+bw*2,bw,0,-H2-bw/2],[GC+bw*2,bw,0,H2+bw/2],[bw,GR,-W2-bw/2,0],[bw,GR,W2+bw/2,0]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,0.16,d),bm);b.position.set(x,0.02,z);b.receiveShadow=true;b.castShadow=true;board.add(b);}
  const out=new THREE.Mesh(new THREE.PlaneGeometry(80,80),OUTM=new THREE.MeshToonMaterial({color:0x5f9a3a,gradientMap:ramp}));out.rotation.x=-Math.PI/2;out.position.y=-0.06;out.receiveShadow=true;board.add(out);
  // spawn-side tints
  for(const [s,col] of [[-1,0x4f8cff],[1,0xff5a4a]]){const z=new THREE.Mesh(new THREE.PlaneGeometry(4,GR),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.07,depthWrite:false}));z.rotation.x=-Math.PI/2;z.position.set(s*(W2-2),0.005,0);board.add(z);}
}
const propObjs=[];
// per-theme arena look: ground tint, sky/fog colour, procedural props, ambient particles
const THEME_LOOK={warband:{p:['#b8b45a','#aca850',[120,110]],o:0x8a8a40,sky:0xc8d8e8},crypt:{p:['#6e6a80','#646078',[80,80]],o:0x3e3e50,sky:0x5a5a7a},grove:{p:['#7fbf4a','#74b343',[40,110]],o:0x4f9a3a,sky:0x9fd8e8},
  rift:{p:['#9a6448','#8e5a40',[140,60]],o:0x4a2a20,sky:0xb06040},citadel:{p:['#a6cc78','#9cc06e',[80,130]],o:0x7aa060,sky:0xb8d8f8},lair:{p:['#a88c5c','#9c8052',[130,100]],o:0x6a5a40,sky:0xa88a70}};const texCache={};
const themeGrp=new THREE.Group();scene.add(themeGrp);let curTheme=null;const tmat=c=>new THREE.MeshToonMaterial({color:c,gradientMap:ramp});
function edgeSpots(n,seed){const R=Core.rng(seed),out=[];for(let k=0;k<n;k++){const side=k%3;let x,z;if(side<2){x=(R()-0.5)*(GC+2);z=(side?1:-1)*(H2+0.7+R()*1.8);}else{z=(R()-0.5)*(GR+1);x=W2+0.8+R()*1.8;}out.push([x,z,R()]);}return out;}
function setTheme(id){if(curTheme===id)return;curTheme=id;const L=THEME_LOOK[id]||THEME_LOOK.grove;if(!texCache[id])texCache[id]=grassTex(...L.p);GRASSM.map=texCache[id];GRASSM.needsUpdate=true;OUTM.color.set(L.o);scene.background.set(L.sky);scene.fog.color.set(L.sky);
  while(themeGrp.children.length){const o=themeGrp.children.pop();o.traverse(n=>{if(n.geometry)n.geometry.dispose();});}
  const add=(geo,mat,x,y,z,ry=0,sc=1)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.y=ry;o.scale.setScalar(sc);o.castShadow=true;themeGrp.add(o);return o;};
  const sp=edgeSpots(26,id.length*977+7);
  if(id==='crypt'){const st=tmat(0x8a8a98),cr=tmat(0x6a6a78);for(const [x,z,r] of sp){if(r<0.6){add(new THREE.BoxGeometry(0.28,0.4,0.08),st,x,0.2,z,r*2);}else{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.45,0.06),cr));const h=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.06,0.06),cr);h.position.y=0.08;g.add(h);g.position.set(x,0.22,z);g.rotation.y=r*3;themeGrp.add(g);}}}
  if(id==='rift'){const lava=new THREE.MeshBasicMaterial({color:0xff6a20});const rk=tmat(0x4a2a22);for(const [x,z,r] of sp){if(r<0.5)add(new THREE.BoxGeometry(0.9+r,0.02,0.07),lava,x,0.01,z,r*6);else add(new THREE.DodecahedronGeometry(0.22+r*0.15,0),rk,x,0.12,z,r*5);}}
  if(id==='grove'){const stem=tmat(0xf0e8d0),cap=tmat(0xe04a3a),fl=[tmat(0xffe060),tmat(0xff90c0),tmat(0xa0c8ff)];for(const [x,z,r] of sp){if(r<0.5){add(new THREE.CylinderGeometry(0.04,0.05,0.16,6),stem,x,0.08,z);add(new THREE.SphereGeometry(0.12,8,6,0,6.3,0,1.6),cap,x,0.16,z);}else add(new THREE.SphereGeometry(0.07,6,5),fl[Math.floor(r*30)%3],x,0.06,z);}}
  if(id==='lair'){const bone=tmat(0xf0ead8);for(const [x,z,r] of sp){if(r<0.55)add(new THREE.CylinderGeometry(0.03,0.03,0.5,6),bone,x,0.03,z,r*6).rotation.z=Math.PI/2;else add(new THREE.SphereGeometry(0.11,8,6),bone,x,0.1,z);}}
  if(id==='citadel'){const pole=tmat(0xc8b070),flag=new THREE.MeshToonMaterial({color:0x3a6ae0,gradientMap:ramp,side:THREE.DoubleSide});for(const [x,z,r] of sp.slice(0,10)){add(new THREE.CylinderGeometry(0.025,0.025,1.1,6),pole,x,0.55,z);const f=add(new THREE.PlaneGeometry(0.4,0.26),flag,x+0.2,0.9,z);f.userData.flag=r*6;}}
  if(id==='warband'){const sp2=tmat(0x7a5a3a),tent=tmat(0xc8a060);for(const [x,z,r] of sp){if(r<0.75)add(new THREE.ConeGeometry(0.05,0.5,5),sp2,x,0.22,z,0,1).rotation.z=(r-0.4);else add(new THREE.ConeGeometry(0.45,0.6,4),tent,x,0.3,z,r*3);}}}
function themeAmbient(dt){if(!curTheme)return;const r=Math.random;
  if(curTheme==='crypt'&&r()<dt*10)P({x:(r()-0.5)*(GC+4),y:0.1,z:(r()-0.5)*(GR+4),vx:(r()-0.5)*0.2,vy:0.15,vz:(r()-0.5)*0.2,drag:0.5,life:3,s:0.5,grow:1.6,c:[0.55,0.45,0.75],a:0.18});
  if(curTheme==='rift'&&r()<dt*14)P({x:(r()-0.5)*(GC+4),y:0.05,z:(r()-0.5)*(GR+4),vx:(r()-0.5)*0.3,vy:0.6+r()*0.6,vz:(r()-0.5)*0.3,drag:0.3,life:2.2,s:0.05,c:[1,0.5,0.15]},true);
  if(curTheme==='grove'&&r()<dt*6)P({x:(r()-0.5)*GC,y:0.3+r()*1.2,z:(r()-0.5)*GR,vx:(r()-0.5)*0.3,vy:(r()-0.5)*0.2,vz:(r()-0.5)*0.3,drag:0.2,life:2.5,s:0.05,c:[0.8,1,0.4]},true);
  if(curTheme==='citadel')for(const o of themeGrp.children)if(o.userData.flag!=null){o.userData.flag+=dt*4;o.rotation.y=Math.sin(o.userData.flag)*0.4;}}
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
  const top=portrait?96:60,bot=portrait?118:86;const yMin=-1+2*bot/h,yMax=1-2*top/h;
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
  n.material=Array.isArray(n.material)?n.material.map(m=>toon(m,tint,def.glow)):toon(n.material,tint,def.glow);}});}
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
  const el=document.createElement('div');el.className='ub '+u.side;el.innerHTML='<em></em><b></b><i><s></s></i>';uiLayer.appendChild(el);
  if(u.boss){inner.scale.multiplyScalar(1.45);pick.scale.multiplyScalar(1.4);pick.position.y=pick.scale.y/2;}
  const v={u,g,inner,mixer,base,one,rmix,rone,ring,disc,pick,el,cntEl:el.children[1],hpEl:el.lastChild.firstChild,bfEl:el.firstChild,bfStr:'',def,mv:0,os:null,osW:0,yaw:u.side==='p'?Math.PI/2:-Math.PI/2,deadT:-1,lastCount:-1,spawn:0,bob:Math.random()*6,hitFlash:0,lastHp:-1};
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
  if(v.dragPos){v.g.position.copy(v.dragPos);}else v.g.position.set(x,0,z);v.inner.position.y=hover+(v.dragPos?0.18:0);if(v.def.glow&&u.alive&&Math.random()<dt*3){P({x:v.g.position.x+(Math.random()-0.5)*0.4,y:Math.random()*v.def.h,z:v.g.position.z+(Math.random()-0.5)*0.4,vy:0.5,drag:1,life:0.8,s:0.05,c:[1,0.82,0.3]},true);}if(v.spawn<1){v.inner.position.y+=(1-sp)*2.4;v.dropping=1;}else if(v.dropping){v.dropping=0;dust(x,z,8,0.9);if(Math.random()<0.4)S.spawn();}v.g.scale.setScalar(0.75+0.25*Math.max(0,sp));
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
  if(u.alive){v.ring.material=b.focus===u?focusMat:(u.hold||G.sel===u?holdMat:teamMat[u.side]);}
}
// ---------- DOM badges ----------
function updateBadges(){const w=innerWidth,h=innerHeight;
  for(const v of views.values()){const u=v.u;if(!v.g.visible||!u.alive){v.el.style.display='none';continue;}
    tmpV.set(0,v.def.h*(u.boss?1.5:1.08)+(v.def.fly||0)+(u.st.fly&&!v.def.fly?0.18:0),0);v.g.localToWorld(tmpV);tmpV.project(camera);
    const sx=(tmpV.x+1)/2*w,sy=(1-tmpV.y)/2*h;v.el.style.display='';v.el.style.transform=`translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-100%)`;
    if(v.lastCount!==u.count){if(v.lastCount>=0&&u.count<v.lastCount){v.el.classList.remove('bump');void v.el.offsetWidth;v.el.classList.add('bump');}v.lastCount=u.count;v.cntEl.textContent=u.count;}
    const hp=((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp);if(Math.abs(hp-v.lastHp)>0.002){v.lastHp=hp;v.hpEl.style.width=(Math.max(0,hp)*100).toFixed(1)+'%';}
    const bt=G.battle?G.battle.t:0,bf=u.buf||{};const icons=(bf.haste>bt?'💨':'')+(bf.bless>bt?'🌟':'')+(bf.blood>bt?'🩸':'')+(bf.slow>bt?'🐌':'')+(u.stun>bt?'💫':'')+(u.curse>bt?'☠':'');if(icons!==v.bfStr){v.bfStr=icons;v.bfEl.textContent=icons;}
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
  if(k>=1){if(f.cb&&!f.done){f.done=1;f.cb();}scene.remove(f.o);f.o.material.dispose();if(f.kind==='line')f.o.geometry.dispose();fxList.splice(i,1);continue;}
  f.o.material.opacity=f.kind==='scorch'?0.55*(1-k*k):(1-k)*0.95;if(f.kind==='arc'){f.o.rotation.z+=f.rz*dt;f.o.scale.multiplyScalar(1+dt*2);}if(f.kind==='ring'){const s=f.r*(0.3+k*1.2);f.o.scale.set(s,1,s);}}}
// ---------- projectiles ----------
const projViews=new Map();
const projMat={bolt:new THREE.MeshToonMaterial({color:0x6b4a2b,gradientMap:ramp}),axe:new THREE.MeshToonMaterial({color:0xb0b4bc,gradientMap:ramp}),
  holy:new THREE.MeshBasicMaterial({color:0xcfe9ff}),rock:new THREE.MeshToonMaterial({color:0x8a8070,gradientMap:ramp}),death:new THREE.MeshBasicMaterial({color:0xb070ff}),fire:new THREE.MeshBasicMaterial({color:0xffa030})};
const boltGeo=new THREE.CylinderGeometry(0.018,0.018,0.4,5);boltGeo.rotateX(Math.PI/2);const orbGeo=new THREE.SphereGeometry(0.1,12,8);const axeGeo=new THREE.BoxGeometry(0.16,0.04,0.2);
const TRAIL={holy:0xa8d8ff,death:0x9a50ff,fire:0xff8a20,bolt:0xfff2c0,axe:0xdddddd};
function projView(p){let pv=projViews.get(p);if(pv)return pv;const k=p.kind||'bolt';const orb=k==='holy'||k==='death'||k==='fire';
  const o=new THREE.Mesh(orb||k==='rock'?orbGeo:k==='axe'?axeGeo:boltGeo,projMat[k]||projMat.bolt);if(k==='rock')o.scale.setScalar(1.4);o.castShadow=true;scene.add(o);
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
  else if(e.k==='hit'&&e.kind==='burn'){const [x,y,z]=headOf(u);for(let i=0;i<4;i++)fireP(x,y,z,(Math.random()-0.5),Math.random(),(Math.random()-0.5),0.1,0.35);}
  else if(e.k==='hit'){const tv=views.get(u);if(tv&&u.alive&&!(tv.os&&(tv.osK==='atk'||tv.osK==='shoot')))playOne(tv,'hit');if(tv)tv.hitFlash=1;
    if(e.crit){floatText(u,'暴击 -'+e.dmg,'crit');S.crit();hitStop(0.07);shake=Math.max(shake,0.14);const [x,y,z]=headOf(u);sparks(x,y,z,0xffe060,16,1.4);}
    else floatText(u,'-'+e.dmg,(u.side==='p'?'dmgp':'dmge')+(e.big?' big':''));
    if(e.killed>0&&tv){const [x,,z]=unitWorld(u);ringFx(x,z,u.side==='p'?0xff4040:0xffd060,0.45,0.25);}
    if(e.dead&&u.side==='e')onEnemyStackDead(u);
    if(!e.src||!e.src.st.proj||e.src.st.shots<=0)S.hit();if(e.big)shake=Math.max(shake,0.16);if(e.killed>0)S.death();if(e.dead){shake=Math.max(shake,0.1);const [x,,z]=unitWorld(u);dust(x,z,14,1.3);}}
  else if(e.k==='impact'){const p=e.p;const [x,z]=toW(p.x,p.y);const y=MD[p.t.type].h*0.5+(MD[p.t.type].fly||0);
    if(p.kind==='holy'){S.holyHit();puff(x,y,z,0xaedcff,14,1.2,0.12,0.4);sparks(x,y,z,0xcfeaff,8);}
    else if(p.kind==='death'){puff(x,y,z,0xa050f0,14,1.2,0.12,0.45);}
    else if(p.kind==='fire'){for(let i=0;i<14;i++)fireP(x,y,z,(Math.random()-0.5)*2,Math.random()*1.5,(Math.random()-0.5)*2);}
    else if(p.kind==='rock'){S.heavy();dust(x,z,8,1);sparks(x,y,z,0xb0a080,6,0.8);}
    else{S.thunk();sparks(x,y,z,0xf4e2b8,6,0.7);}}
  else if(e.k==='spawn'){const nu=e.u;ensureTpl(nu.type).then(tp=>{if(!views.has(nu)&&G.battle&&G.battle.units.includes(nu)){const v=makeView(nu,tp);v.spawn=0;const [x,z]=unitWorld(nu);dust(x,z,12,1.2);puff(x,0.3,z,0x6a40a0,14,0.8,0.18,0.8,0.6);}});}
  else if(e.k==='bossCast'){floatText(e.u,e.txt,'pop');S.dark();const [x,,z]=unitWorld(e.u);ringFx(x,z,0x9a50ff,1.6,0.6);}
  else if(e.k==='warn'){warnBand(e.rows,e.dur);S.roar();floatText(e.u,'龙息蓄力！','pop');}
  else if(e.k==='sweep'){sweepFx(e.rows);S.breath();S.flame();shake=Math.max(shake,0.25);flash('rgba(255,120,40,.35)');}
  else if(e.k==='blink'){const [fx,fz]=toW(e.from.x,e.from.y),[x,,z]=headOf(e.u);puff(fx,0.4,fz,0x9a40ff,20,1.2,0.18,0.6);puff(x,0.4,z,0x9a40ff,20,1.2,0.18,0.6);S.dark();floatText(e.u,'瞬移！','pop');}
  else if(e.k==='spellFx')spellResolveFx(e.id,e.out);
  if(e.k==='wind'&&u&&u.target&&u.target.alive)tline(u,u.target,u.side==='p'?0x6fb4ff:0xff6a5a,e.ranged);
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
// ---------- readability + juice helpers ----------
function tline(u,t,col,ranged){const [ax,az]=unitWorld(u),[tx,tz]=unitWorld(t);const pts=[new THREE.Vector3(ax,0.06,az),new THREE.Vector3(tx,0.06,tz)];
  const m=new THREE.LineDashedMaterial({color:col,transparent:true,opacity:0.9,dashSize:ranged?0.18:0.5,gapSize:ranged?0.12:0.0001,depthWrite:false});const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),m);o.computeLineDistances();o.renderOrder=2;scene.add(o);fxList.push({o,t:0,life:ranged?0.5:0.35,kind:'line'});
  const ar=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:col,transparent:true,depthWrite:false}));ar.position.set(tx-(tx-ax)*0.12,0.07,tz-(tz-az)*0.12);ar.rotation.y=Math.atan2(tx-ax,tz-az);scene.add(ar);fxList.push({o:ar,t:0,life:ranged?0.5:0.35,kind:'fade'});}
const arrowGeo=new THREE.ConeGeometry(0.09,0.24,3);arrowGeo.rotateX(Math.PI/2);
let stopT=0,slowT=0;function hitStop(t){stopT=Math.max(stopT,t);}
const STREAK=['','','双杀！','三杀！','四杀！','横扫千军！','势不可挡！'];
function onEnemyStackDead(u){const now=performance.now()/1000;G.streak=(now-(G.streakT||0)<4.5)?(G.streak||0)+1:1;G.streakT=now;hitStop(0.09);
  if(G.run)G.run.bestStreak=Math.max(G.run.bestStreak||0,G.streak);
  if(G.streak>=2){const el=$('streak');el.textContent=STREAK[Math.min(G.streak,6)];el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(el.t);el.t=setTimeout(()=>el.classList.add('hidden'),1300);S.streak(G.streak);}
  if(u.boss){slowT=1.6;flash('rgba(255,255,255,.7)');shake=0.4;S.boom();setTimeout(()=>{banner('👑 首领陨落！',1600);S.winJ();},350);const [x,,z]=unitWorld(u);for(let i=0;i<3;i++)setTimeout(()=>{ringFx(x,z,0xffe080,2.2,0.7);for(let k=0;k<40;k++)confettiAt(x,z);},i*220);}}
function confettiAt(x,z){const c=[0xffd75a,0x78c8ff,0xff78a0][Math.floor(Math.random()*3)];P({x,y:1,z,vx:(Math.random()-0.5)*5,vy:2+Math.random()*3,vz:(Math.random()-0.5)*5,g:4,drag:1,life:1.4,s:0.1,c:C3(c)},true);}
function toast(html,cls,dur=2600){const t=document.createElement('div');t.className='toast '+(cls||'');t.innerHTML=html;$('toasts').appendChild(t);setTimeout(()=>t.classList.add('out'),dur);setTimeout(()=>t.remove(),dur+500);}
const scorchGeo=new THREE.CircleGeometry(1,24);scorchGeo.rotateX(-Math.PI/2);
function scorch(x,z,r){const m=new THREE.MeshBasicMaterial({color:0x1a0a04,transparent:true,opacity:0.55,depthWrite:false});const o=new THREE.Mesh(scorchGeo,m);o.scale.setScalar(r);o.position.set(x,0.012,z);scene.add(o);fxList.push({o,t:0,life:4,kind:'scorch'});}
// ---------- spell / boss VFX helpers ----------
function flash(col){const f=$('flash');f.style.background=col;f.classList.remove('on');void f.offsetWidth;f.classList.add('on');}
const bandGeo=new THREE.PlaneGeometry(1,1);bandGeo.rotateX(-Math.PI/2);
function warnBand(rows,dur){const [r0,r1]=rows;const m=new THREE.MeshBasicMaterial({color:0xff2a10,transparent:true,opacity:0.3,depthWrite:false});const o=new THREE.Mesh(bandGeo,m);
  o.scale.set(GC,1,r1-r0+1);o.position.set(0,0.02,(r0+r1+1)/2-H2);scene.add(o);fxList.push({o,t:0,life:dur,kind:'warn'});}
function sweepFx(rows){const [r0,r1]=rows;for(let i=0;i<160;i++){const x=-W2+Math.random()*GC,z=r0-H2+Math.random()*(r1-r0+1);fireP(x,0.1+Math.random()*0.4,z,(Math.random()-0.5)*0.6,1+Math.random()*1.5,(Math.random()-0.5)*0.6,0.3,0.7);}
  for(let k=0;k<GC;k+=2)dust(-W2+k,(r0+r1+1)/2-H2,3,1);}
const pillarGeo=new THREE.CylinderGeometry(0.28,0.4,3,16,1,true);
function pillar(x,z,col,life=0.8,y=1.5,sc=1){const m=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const o=new THREE.Mesh(pillarGeo,m);o.position.set(x,y,z);o.scale.set(sc,1,sc);scene.add(o);fxList.push({o,t:0,life,kind:'pillar'});}
const HERO_POS=()=>new THREE.Vector3(-W2-0.8,1.6,0);
function fallingOrb(tx,tz,col,size,dur,trailCol,cb){const o=new THREE.Mesh(orbGeo,new THREE.MeshBasicMaterial({color:col}));o.scale.setScalar(size);const l=new THREE.PointLight(col,3,4,2);o.add(l);scene.add(o);
  const from=new THREE.Vector3(tx-2.2,7,tz-1.5),to=new THREE.Vector3(tx,0.2,tz);fxList.push({o,t:0,life:dur,kind:'orb',from,to,trail:trailCol,cb});}
function streak(from,to,col,dur,cb){const o=new THREE.Mesh(orbGeo,new THREE.MeshBasicMaterial({color:col}));o.add(new THREE.PointLight(col,2,3,2));scene.add(o);fxList.push({o,t:0,life:dur,kind:'orb',from,to,trail:col,cb,arc:0.6});}
function spellResolveFx(id,out){
  for(const u of out){const v=views.get(u);if(!v)continue;const [x,y,z]=headOf(u);
    if(id==='haste'){for(let i=0;i<10;i++)P({x:x+(Math.random()-0.5)*0.5,y:Math.random()*0.3,z:z+(Math.random()-0.5)*0.5,vx:(Math.random()-0.5),vy:1.8,vz:(Math.random()-0.5),drag:1.5,life:0.7,s:0.07,c:[0.5,0.85,1]},true);ringFx(x,z,0x60c0ff,0.6,0.5);}
    if(id==='slow'){for(let i=0;i<10;i++)P({x:x+(Math.random()-0.5)*0.5,y:y+0.6,z:z+(Math.random()-0.5)*0.5,vy:-0.8,drag:1,life:0.9,s:0.08,c:[0.6,0.5,0.8]},false);ringFx(x,z,0x8060a0,0.6,0.6);}
    if(id==='bless'){pillar(x,z,0xffe080,0.9,1.2,0.8);}
    if(id==='bloodlust'){for(let i=0;i<12;i++)P({x:x+(Math.random()-0.5)*0.4,y:Math.random()*y*1.5,z:z+(Math.random()-0.5)*0.4,vy:0.9,life:0.7,s:0.08,c:[1,0.15,0.1]},true);}
    if(id==='cure'){floatText(u,'+','heal');for(let i=0;i<10;i++)P({x:x+(Math.random()-0.5)*0.5,y:Math.random()*y,z:z+(Math.random()-0.5)*0.5,vy:0.8,life:0.8,s:0.06,c:[0.4,1,0.6]},true);}
    if(id==='resurrection'){pillar(x,z,0xfff0b0,1.3,1.5,1.2);floatText(u,'复活！','heal');for(let i=0;i<30;i++)P({x:x+(Math.random()-0.5)*0.7,y:Math.random()*0.3,z:z+(Math.random()-0.5)*0.7,vy:1.5+Math.random(),life:1,s:0.08,c:[1,0.95,0.6]},true);}}}
// cast visuals first, damage lands when the effect connects
function castSpell(id,target){const b=G.battle,h=G.hero;const sp=Hero.SPM[id];const cost=Hero.spellCost(h,id);if(!b||b.over||h.mana<cost)return;h.mana-=cost;G.targeting=null;$('reticle').classList.add('hidden');refreshSpellBar(true);
  floatSpellName(sp);const resolve=()=>{if(G.battle===b&&!b.over)Hero.cast(b,h,id,target);};
  if(id==='magicArrow'){S.magic();const [x,y,z]=headOf(target);streak(HERO_POS(),new THREE.Vector3(x,y,z),0x9ad8ff,0.35,()=>{resolve();sparks(x,y,z,0xbfe8ff,12,1.2);S.holyHit();});}
  else if(id==='lightning'){const [x,y,z]=headOf(target);flash('rgba(40,60,120,.35)');for(let i=0;i<3;i++)setTimeout(()=>bolt(x+(Math.random()-0.5)*0.6,z+(Math.random()-0.5)*0.6,y),i*40);
    setTimeout(()=>{for(let i=0;i<5;i++)bolt(x,z,y);flash('rgba(220,240,255,.8)');S.zap();shake=Math.max(shake,0.32);hitStop(0.12);sparks(x,y,z,0xd8f0ff,40,2);ringFx(x,z,0xa0d8ff,1.4,0.5);ringFx(x,z,0xffffff,0.7,0.3);scorch(x,z,0.6);pillar(x,z,0xbfe4ff,0.35,1.5,0.6);resolve();
      const near=G.battle.units.filter(o=>o.alive&&o.side===target.side&&o!==target).map(o=>[o,Math.hypot(o.x-target.x,o.y-target.y)]).sort((a,c)=>a[1]-c[1]).slice(0,2);near.forEach(([o],i)=>setTimeout(()=>{const [ox,oy,oz]=headOf(o);const pts=[new THREE.Vector3(x,y,z)];for(let k=1;k<6;k++)pts.push(new THREE.Vector3(x+(ox-x)*k/6+(Math.random()-0.5)*0.3,y+(oy-y)*k/6+Math.random()*0.3,z+(oz-z)*k/6+(Math.random()-0.5)*0.3));pts.push(new THREE.Vector3(ox,oy,oz));const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xcfeaff,transparent:true,blending:THREE.AdditiveBlending}));scene.add(l);fxList.push({o:l,t:0,life:0.3,kind:'line'});sparks(ox,oy,oz,0xd8f0ff,10,1);},80+i*70));},180);}
  else if(id==='fireball'){const [x,z]=toW(target.x,target.y);S.fireball();fallingOrb(x,z,0xff8a20,1.8,0.45,[1,0.5,0.1],()=>{resolve();S.fireball();shake=Math.max(shake,0.2);flash('rgba(255,140,40,.3)');
    for(let i=0;i<70;i++){const a=Math.random()*6.28,d=Math.random()*1.6;fireP(x+Math.cos(a)*d*0.4,0.2,z+Math.sin(a)*d*0.4,Math.cos(a)*d*2,0.8+Math.random()*1.5,Math.sin(a)*d*2,0.28,0.6);}ringFx(x,z,0xff7a20,1.7,0.5);dust(x,z,14,1.5);});}
  else if(id==='meteor'){const [x,z]=toW(target.x,target.y);S.roar();flash('rgba(120,20,0,.35)');let hits=0;for(let k=0;k<8;k++)setTimeout(()=>{const ox=x+(Math.random()-0.5)*2.6,oz=z+(Math.random()-0.5)*2.6;fallingOrb(ox,oz,0xff5020,2.6,0.5,[1,0.35,0.05],()=>{S.boom();shake=Math.max(shake,0.38);hitStop(0.05);scorch(ox,oz,0.9);pillar(ox,oz,0xff7a20,0.4,0.8,0.9);dust(ox,oz,16,1.8);for(let i=0;i<30;i++){const a=Math.random()*6.28;fireP(ox,0.2,oz,Math.cos(a)*2.5,1+Math.random()*2,Math.sin(a)*2.5,0.25,0.5);}ringFx(ox,oz,0xff6020,1.2,0.4);if(++hits===3){resolve();flash('rgba(255,120,30,.55)');}});},k*95);}
  else if(id==='slow'){S.dark();flash('rgba(120,90,170,.25)');setTimeout(resolve,250);}
  else if(id==='haste'){S.go();flash('rgba(120,200,255,.25)');setTimeout(resolve,150);}
  else if(id==='bless'){S.holyHit();flash('rgba(255,230,140,.3)');setTimeout(resolve,200);}
  else if(id==='bloodlust'){S.roar();flash('rgba(255,60,40,.25)');setTimeout(resolve,200);}
  else if(id==='cure'){S.holyHit();flash('rgba(120,255,160,.22)');setTimeout(resolve,200);}
  else if(id==='resurrection'){S.holyHit();S.magic();flash('rgba(255,245,200,.4)');setTimeout(resolve,250);}
  if(!G.tut.spell){G.tut.spell=1;saveTut();hideCoach();}}
function floatSpellName(sp){const el=$('spellName');el.textContent=sp.i+' '+sp.n;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
// ---------- input: raycast taps, drag deploy, long-press tooltips, spell targeting ----------
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function rayFrom(cx,cy){ndc.set(cx/innerWidth*2-1,-(cy/innerHeight)*2+1);ray.setFromCamera(ndc,camera);}
function groundAt(cx,cy){rayFrom(cx,cy);const gp=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),gp)?gp:null;}
function pickAt(cx,cy,side){rayFrom(cx,cy);const picks=[];for(const v of views.values())if(v.u.alive&&(!side||v.u.side===side))picks.push(v.pick);
  const hits=ray.intersectObjects(picks,false);if(hits.length)return hits[0].object.userData.u;
  const gp=groundAt(cx,cy);if(!gp)return null;let best=null,bd=0.75;
  for(const v of views.values()){if(!v.u.alive||(side&&v.u.side!==side))continue;const [x,z]=unitWorld(v.u);const d=Math.hypot(gp.x-x,gp.z-z)-Math.max(v.u.fw,v.u.fh)*0.3;if(d<bd){bd=d;best=v.u;}}return best;}
const toPx=(wx,wz)=>[GX0+(wx+W2)*CW,GY0+(wz+H2)*CH];
const DEPLOY_COLS=7;
function cellFor(u,gp){return [Math.round(gp.x+W2-u.fw/2),Math.round(gp.z+H2-u.fh/2)];}
function canPlace(u,ax,ay){const b=G.battle;if(ax<0||ay<0||ax+u.fw>DEPLOY_COLS||ay+u.fh>GR)return false;Core.occClear(b,u,u.ax,u.ay);const ok=Core.fits(b,u,ax,ay);Core.occSet(b,u,u.ax,u.ay,u.id);return ok;}
const hoverMesh=new THREE.Mesh(bandGeo,new THREE.MeshBasicMaterial({color:0x50ff70,transparent:true,opacity:0.45,depthWrite:false}));hoverMesh.visible=false;hoverMesh.position.y=0.025;scene.add(hoverMesh);
const deployZone=new THREE.Mesh(bandGeo,new THREE.MeshBasicMaterial({color:0x4f8cff,transparent:true,opacity:0.16,depthWrite:false}));deployZone.scale.set(DEPLOY_COLS,1,GR);deployZone.position.set(-W2+DEPLOY_COLS/2,0.015,0);deployZone.visible=false;scene.add(deployZone);
function showHover(u,ax,ay,ok){hoverMesh.visible=true;hoverMesh.scale.set(u.fw*0.96,1,u.fh*0.96);hoverMesh.position.set(ax+u.fw/2-W2,0.025,ay+u.fh/2-H2);hoverMesh.material.color.set(ok?0x50ff70:0xff4040);}
let ptr=null;
cv.addEventListener('pointerdown',e=>{const b=G.battle;if(!b)return;const ph=G.phase;if(ph!=='deploy'&&ph!=='battle'&&ph!=='countdown')return;
  ptr={x:e.clientX,y:e.clientY,moved:false,tip:false,id:e.pointerId};const u=pickAt(e.clientX,e.clientY);ptr.u=u;
  if(u&&!G.targeting){ptr.timer=setTimeout(()=>{if(ptr&&!ptr.moved){ptr.tip=true;showUnitTip(u,ptr.x,ptr.y);if(G.drag){views.get(G.drag).dragPos=null;G.drag=null;hoverMesh.visible=false;}}},450);}
  if(ph==='deploy'&&u&&u.side==='p'){G.drag=u;}
  if(G.targeting&&SPELLTGT()==='area'){showReticle(e.clientX,e.clientY);}
  try{cv.setPointerCapture(e.pointerId);}catch(_){}});
cv.addEventListener('pointermove',e=>{if(G.targeting&&SPELLTGT()==='area'){showReticle(e.clientX,e.clientY);}if(!ptr)return;
  if(Math.hypot(e.clientX-ptr.x,e.clientY-ptr.y)>9)ptr.moved=true;
  if(G.phase==='deploy'&&G.drag&&ptr.moved&&!ptr.tip){const u=G.drag,gp=groundAt(e.clientX,e.clientY);if(!gp)return;const [ax,ay]=cellFor(u,gp);const ok=canPlace(u,ax,ay);
    showHover(u,Math.max(0,Math.min(GC-u.fw,ax)),Math.max(0,Math.min(GR-u.fh,ay)),ok);views.get(u).dragPos=new THREE.Vector3(gp.x,0,gp.z);G.dragCell=ok?[ax,ay]:null;}});
function endPtr(e){if(!ptr)return;clearTimeout(ptr.timer);const p=ptr;ptr=null;hideTip();if(p.tip){if(G.drag){views.get(G.drag).dragPos=null;G.drag=null;}return;}
  const b=G.battle;if(!b)return;
  if(G.phase==='deploy'){hoverMesh.visible=false;
    if(G.drag&&p.moved){const u=G.drag;views.get(u).dragPos=null;if(G.dragCell){Core.moveTo(b,u,G.dragCell[0],G.dragCell[1]);S.tick();drawThreats();const [x,z]=unitWorld(u);dust(x,z,6,0.8);G.sel=null;}else S.click();G.drag=null;G.dragCell=null;refreshSyn();return;}
    G.drag=null;
    if(p.u&&p.u.side==='p'){G.sel=G.sel===p.u?null:p.u;S.click();return;}
    if(p.u&&p.u.side==='e'){showUnitTip(p.u,p.x,p.y);setTimeout(hideTip,1600);return;}
    if(G.sel){const gp=groundAt(p.x,p.y);if(gp){const [ax,ay]=cellFor(G.sel,gp);if(canPlace(G.sel,ax,ay)){Core.moveTo(b,G.sel,ax,ay);S.tick();drawThreats();const [x,z]=unitWorld(G.sel);dust(x,z,6,0.8);G.sel=null;}else{S.click();banner('不能放在那里',700);}}}
    return;}
  if(G.phase!=='battle'&&G.phase!=='countdown')return;
  if(G.targeting){const sp=Hero.SPM[G.targeting];
    if(sp.tgt==='area'){const gp=groundAt(p.x,p.y);if(gp){const [px,py]=toPx(gp.x,gp.z);castSpell(sp.id,{x:px,y:py});}return;}
    const want=sp.tgt==='enemy'?'e':'p';const u=pickAt(p.x,p.y,want);if(u){castSpell(sp.id,u);}else{banner(sp.tgt==='enemy'?'请点选一个敌人':'请点选一支友军',800);}return;}
  const u=p.u;if(!u)return;
  if(u.side==='p'){if(u.st.shots>0){floatText(u,'远程部队·无需待命','info');S.click();return;}u.hold=!u.hold;floatText(u,u.hold?'⏸ 待命':'⚔ 进攻！',u.hold?'hold':'go');S.tick();const [x,z]=unitWorld(u);ringFx(x,z,u.hold?0xffc040:0x80ff80,0.7);return;}
  b.focus=u;const [x,z]=unitWorld(u);ringFx(x,z,0xffd23a,0.9,0.45);S.click();$('hint').classList.add('hidden');G.focusHintShown=true;}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
const SPELLTGT=()=>G.targeting&&Hero.SPM[G.targeting].tgt;
function showReticle(cx,cy){const sp=Hero.SPM[G.targeting];const gp=groundAt(cx,cy);const r=$('reticle');if(!gp){r.classList.add('hidden');return;}
  const [sx,sy]=worldToScreen(gp.x,0,gp.z),[ex]=worldToScreen(gp.x+sp.r,0,gp.z),[,ey]=worldToScreen(gp.x,0,gp.z+sp.r);const rx=Math.abs(ex-sx),ry=Math.abs(ey-sy);
  r.style.width=rx*2+'px';r.style.height=Math.max(ry,rx*0.5)*2+'px';r.style.left=sx+'px';r.style.top=sy+'px';r.classList.remove('hidden');}
// ---------- tooltips ----------
function abilList(st){const a=st.ab||{},L=[];
  if(st.fly)L.push('飞行');if(st.shots)L.push(`远程射击（${st.shots}发）`+(a.noMP?'·近战无惩罚':'·近战伤害减半'));
  if(a.dbl)L.push(st.shots?'每次射击两次':'连续攻击两次');if(a.noRet)L.push('敌人无法反击');if(a.retal>1)L.push(a.retal>=99?'无限反击':`每回合可反击${a.retal}次`);
  if(a.joustImm)L.push('免疫骑士冲锋加成');if(a.joust)L.push('冲锋：每移动1格伤害+5%');
  if(a.hate)L.push('憎恨 '+Object.keys(a.hate).map(t=>U[t]?U[t].n:t).join('/')+'：伤害+50%');if(a.undead)L.push('不死生物');if(a.unliving)L.push('无生命');
  if(a.cloud)L.push('死亡之云：溅射目标周围');if(a.fireball)L.push('火球：溅射目标周围');if(a.breath)L.push('龙息：同时伤害目标后方1格');
  if(a.drain)L.push('生命吸取');if(a.regen)L.push('再生');if(a.stun)L.push(`${a.stun[1]}：${a.stun[0]*100}%几率使目标停滞`);
  if(a.curse)L.push('诅咒');if(a.deathBlow)L.push('致命一击');if(a.deathStare)L.push('死亡凝视');
  if(a.allAdj)L.push('攻击所有相邻敌人');if(a.ignoreDef)L.push(`无视${a.ignoreDef*100}%防御`);if(a.lightning)L.push('闪电：20%几率追加伤害');if(a.fireShield)L.push('烈焰护盾');
  if(a.burn)L.push(`火焰伤害 ${Math.round(a.burn*100)}%`);if(a.rage)L.push('狂暴');if(a.sharp)L.push('神射手：无距离惩罚，首轮×2');if(a.rngMul&&a.rngMul!==1)L.push(`远程伤害×${a.rngMul.toFixed(2)}`);
  if(st.fw===2&&st.fh===2)L.push('体型：2×2格');else if(st.fw===2)L.push('体型：2格');return L;}
const facChip=t=>{const f=Hero.facOf(t),F=Hero.FAC[f];return F?`<span class="fchip" style="--fc:${F.col}">${F.icon}${F.n}</span>`:`<span class="fchip" style="--fc:#888">${Core.FNAME[U[t].fac]||'中立'}</span>`;};
function showUnitTip(u,x,y){const st=u.st,base=U[u.type];const df=(k)=>st[k]!==base[k]?`<i class="up">${st[k]>base[k]?'+':''}${st[k]-base[k]}</i>`:'';
  const t=$('tip');t.innerHTML=`<div class="tt">${u.boss?'👑 ':''}${u.count} ${base.n} ${facChip(u.type)}</div><div class="th">HoMM3 · ${base.h3} · ${base.lvl}级${base.up?' · 升级':''}</div>
   <div class="tg"><span>攻 <b>${st.a}</b>${df('a')}</span><span>防 <b>${st.d}</b>${df('d')}</span><span>伤 <b>${st.dmg[0]}-${st.dmg[1]}</b></span><span>命 <b>${st.hp}</b>${df('hp')}</span><span>速 <b>${st.spd}</b>${df('spd')}</span><span>射 <b>${st.shots||'—'}</b></span></div>
   <div class="ta">${abilList(st).map(x=>'· '+x).join('<br>')||'· 无特殊能力'}</div>${u.boss?`<div class="tb">${Hero.BOSSES.find(b=>b.id===u.boss).desc}</div>`:''}`;
  placeTip(t,x,y);S.tick();}
function showTextTip(html,x,y){const t=$('tip');t.innerHTML=html;placeTip(t,x,y);}
function placeTip(t,x,y){t.classList.add('show');const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.max(6,Math.min(innerWidth-w-6,x-w/2))+'px';t.style.top=Math.max(6,(y-h-24<60?y+24:y-h-24))+'px';}
function hideTip(){$('tip').classList.remove('show');}
// long-press for DOM elements (cards, chips, artifact icons)
function longPress(el,html){let tm=null,shown=false;el.addEventListener('pointerdown',e=>{shown=false;tm=setTimeout(()=>{shown=true;const r=el.getBoundingClientRect();showTextTip(typeof html==='function'?html():html,r.left+r.width/2,r.top);},380);});
  const end=()=>{clearTimeout(tm);if(shown)setTimeout(hideTip,1200);};el.addEventListener('pointerup',end);el.addEventListener('pointerleave',end);el.addEventListener('pointercancel',end);
  el.addEventListener('click',e=>{if(shown){e.stopPropagation();e.preventDefault();}},true);}
// ---------- game state / flow ----------
const G={phase:'title',speed:1,battle:null,run:null,hero:null,targeting:null,sel:null,drag:null,focusHintShown:false,tut:JSON.parse(localStorage.getItem('hc_tut')||'{}')};
const saveTut=()=>localStorage.setItem('hc_tut',JSON.stringify(G.tut));
const H=Hero;
function show(id,on){$(id).classList.toggle('show',on);}
function banner(txt,dur=900){const el=$('banner');el.textContent=txt;el.classList.remove('hidden','pop');void el.offsetWidth;el.classList.add('pop');clearTimeout(banner.t);banner.t=setTimeout(()=>el.classList.add('hidden'),dur);}
function coach(html){const c=$('coach');c.innerHTML=html+'<div class="cx">知道了 ✓</div>';c.classList.add('show');c.onclick=hideCoach;}
function hideCoach(){$('coach').classList.remove('show');}
const statRow=(k,v)=>`<div><span>${k}</span><b>${v}</b></div>`;
function synPreview(t){const run=G.run,own=H.deployList(run);if(run.army[t]||run.army[H.UPG[t]])return '';const f=H.facOf(t);if(!H.FAC[f])return '';
  const before=H.synCounts(own)[f]||0,after=before+1;if(own.length>=H.MAXS)return '';
  if(H.synTier(after)>H.synTier(before))return `<div class="synhit" style="--fc:${H.FAC[f].col}">★ 激活羁绊：${H.FAC[f].icon}${H.FAC[f].n} ${after} — ${H.FAC[f].t[H.synTier(after)-1]}</div>`;
  return `<div class="synnext">${H.FAC[f].icon}${H.FAC[f].n} ${after}/${after<2?2:after<4?4:6}</div>`;}
function unitCardHTML(c){const t=c.type,st=U[t];const owned=G.run.army[t];const m=G.run.merges[t]||0;
  const tags=[st.shots?'<span class="tag r">远程</span>':'<span class="tag m">近战</span>',st.fly?'<span class="tag f">飞行</span>':'',owned?`<span class="tag up">合并${H.UPG[t]?' · '+(m+1)+'/3升级':''}</span>`:''].join('');
  return `<div class="art"><span class="tier">${'★'.repeat(st.lvl)}</span><img src="${sprSrc(t)}"><span class="cnt">×${c.count}</span></div>
    <div class="nm">${c.count} ${st.n}</div><div class="h3">${facChip(t)} ${st.h3} · ${st.lvl}级</div><div class="tags">${tags}</div>${synPreview(t)}
    <div class="stats">${statRow('攻',st.a)+statRow('防',st.d)+statRow('伤害',st.dmg[0]===st.dmg[1]?st.dmg[0]:st.dmg[0]+'-'+st.dmg[1])+statRow('生命',st.hp)+statRow('速度',st.spd)+statRow('射击',st.shots||'—')}</div>
    <div class="abil">${abilList(st).map(x=>'· '+x).join('<br>')||'· 无特殊能力'}</div>`;}
function upgradeCardHTML(c){const a=U[c.from],b=U[c.to];const d=(k)=>b[k]!==a[k]?`<b class="up">${a[k]}→${b[k]}</b>`:`<b>${b[k]}</b>`;
  return `<div class="art upg"><span class="tier">⬆ 升级</span><img class="from" src="${sprSrc(c.from)}"><span class="arrow">➜</span><img src="${sprSrc(c.to)}"><span class="cnt">×${c.count}</span></div>
   <div class="nm">${a.n} → ${b.n}</div><div class="h3">${facChip(c.to)} ${a.h3} → ${b.h3}</div><div class="tags"><span class="tag up">整支部队升级${c.bonus?` +${c.bonus}援军`:""}</span></div>
   <div class="stats"><div><span>攻</span>${d('a')}</div><div><span>防</span>${d('d')}</div><div><span>伤害</span><b class="${b.dmg+''!==a.dmg+''?'up':''}">${b.dmg[0]}-${b.dmg[1]}</b></div><div><span>生命</span>${d('hp')}</div><div><span>速度</span>${d('spd')}</div><div><span>射击</span>${d('shots')}</div></div>
   <div class="abil">${abilList(b).map(x=>'· '+x).join('<br>')}</div>`;}
function armyStrip(){const s=H.stacks(G.run.army);$('armyStrip').innerHTML=s.map(x=>`<div class="mini${U[x.type].up?' gold':''}"><img src="${sprSrc(x.type)}"><b>${x.count}</b></div>`).join('')+Array(Math.max(0,H.MAXS-s.length)).fill('<div class="mini empty"></div>').join('');}
function themeHTML(info){const th=info.theme;return `<div class="thx" style="--tc:${th.col}"><div class="t1">${info.boss?'👑 首领关 · ':''}${th.n}</div><div class="t2">⚠ ${th.mod}</div><div class="t3">💡 ${th.hint}</div>${info.boss?`<div class="t4">首领：${info.boss.n}（${U[info.boss.type].n}）— ${info.boss.desc}</div>`:''}</div>`;}
const MM=Meta.M;
function titleMeta(){$('titleMeta').innerHTML=MM.runs?`🏆 最佳 第 <b>${MM.best}</b> 关 · 💰 <b>${MM.gold}</b> 金币`+(MM.daily[Meta.today()]?` · 📅 今日 第 ${MM.daily[Meta.today()]} 关`:''):'';
  const vs=+new URLSearchParams(location.search).get('vs');if(vs){$('vsBanner').innerHTML=`⚔ 好友打到了第 <b>${vs}</b> 关 —— 你能超过吗？`;$('vsBanner').classList.remove('hidden');}}
function openHeroSel(){SFX.init();SFX.startMusic();S.click();const el=$('hsCards');el.innerHTML='';
  H.HEROES.forEach(h=>{const own=MM.heroes.includes(h.id);const d=document.createElement('div');d.className='hcard'+(own?'':' locked');d.style.setProperty('--hc',h.col);
    d.innerHTML=`<div class="hi">${h.i}</div><div class="hn">${h.n}</div><div class="hc">${h.cls}</div><div class="hs"><img src="${sprSrc(h.starter)}"> 起始：${U[h.starter].n}</div><div class="hsp">${h.spells.map(id=>H.SPM[id].i).join(' ')} ${h.spells.map(id=>H.SPM[id].n).join('·')}</div><div class="hp">${h.pas}</div>${own?'<div class="hgo">出征 ▶</div>':`<div class="hbuy">🔒 ${h.cost} 金币解锁</div>`}`;
    d.onclick=()=>{if(own){show('heroSel',false);startRun({hero:h.id});return;}if(Meta.spend(h.cost)){MM.heroes.push(h.id);Meta.save();S.rare();toast(`${h.i} 解锁英雄：${h.n}！`,'gold');openHeroSel();}else{S.click();toast(`金币不足（需要 ${h.cost}，拥有 ${MM.gold}）`,'bad');}};el.appendChild(d);});
  $('hsSub').textContent=`💰 ${MM.gold} 金币 · 打得越远赚得越多`;show('title',false);show('gameover',false);show('heroSel',true);}
function startDaily(){const day=Meta.today(),seed=Meta.seedOf('hc'+day);const hero=H.HEROES[seed%H.HEROES.length].id;H.setRng(Meta.mulberry(seed));startRun({hero,daily:day});toast(`📅 每日挑战 ${day} · 所有玩家相同的招募与敌军 · 英雄：${H.HEROM[hero].n}`,'',3200);}
function startRun(opt={}){SFX.init();SFX.setTrack('battle');S.click();if(!opt.daily)H.setRng(Math.random);G.first=!MM.runs&&!opt.daily;
  G.run=H.newRun({hero:opt.hero||'knight',unlocked:MM.unlocked,up:MM.up,daily:opt.daily});G.run.dailyDay=opt.daily||null;G.streak=0;const qs=new URLSearchParams(location.search);
  if(G.first){const r=G.run;const ex={knight:'archer',barb:'goblin',wizard:'woodElf'}[r.hero]||'archer';r.army[ex]=Math.max(4,Math.round(H.offerBudget(1)*0.8/U[ex].v));}
  if(DEBUG&&+qs.get('stage')>1){const r=G.run;const to=+qs.get('stage');for(let s=1;s<to;s++){r.stage=s;const o=H.makeOffer(r);H.takeCard(r,o[0]);if(H.rewardKind(s)==='artifact'){const a=H.rewardOptions(r,'artifact')[0];if(a)r.arts.push(a.id);}else{const sp=H.rewardOptions(r,'spell')[0];if(sp&&r.spells.length<4)r.spells.push(sp.id);}
      for(const k in r.army)r.army[k]=Math.round(r.army[k]*1.3);}r.stage=to;}
  show('title',false);show('gameover',false);show('result',false);show('heroSel',false);show('camp',false);if(G.first){G.info=H.stageInfo(1);G.enemies=H.makeEnemies(1).map(e=>({...e,count:Math.max(1,Math.round(e.count*0.6))}));openDeploy();}else openDraft();}
function openDraft(){G.phase='offer';document.body.classList.remove('boss');disposeViews();G.battle=null;setBattleUI(false);const run=G.run,info=H.stageInfo(run.stage);G.info=info;
  $('draftTitle').textContent=run.stage>H.STAGES?`无尽 · 第 ${run.stage} 关`:`第 ${run.stage} / ${H.STAGES} 关`;
  $('draftSub').innerHTML=themeHTML(info)+`<div class="dsub">${run.stage===1?'选择一支部队开始征程':'选择一支援军（同种部队会合并）'}</div>`;
  const offer=H.makeOffer(run);G.offer=offer;const el=$('cards');el.innerHTML='';el.classList.toggle('three',offer.length>2);el.classList.toggle('four',offer.length>3);
  offer.forEach((c,i)=>{const d=document.createElement('div');d.className='card'+(c.kind==='upgrade'?' upcard':'');d.innerHTML=c.kind==='upgrade'?upgradeCardHTML(c):unitCardHTML(c);d.style.animationDelay=(i*0.08)+'s';d.onclick=()=>pickOffer(i,d);el.appendChild(d);ensureTpl(c.kind==='upgrade'?c.to:c.type);});
  armyStrip();show('draft',true);G.enemies=H.makeEnemies(run.stage);G.enemies.forEach(e=>ensureTpl(e.type));if(info.boss&&info.boss.summon)ensureTpl(info.boss.summon);}
function pickOffer(i,el){if(G.phase!=='offer')return;G.phase='picked';S.pick();el.classList.add('chosen');[...$('cards').children].forEach(c=>{if(c!==el)c.classList.add('gone');});
  const beforeSyn=H.synCounts(H.deployList(G.run));const ev=H.takeCard(G.run,G.offer[i]);armyStrip();synToast(beforeSyn);if(ev.upgraded){setTimeout(()=>{banner(`⬆ ${U[ev.upgraded].n}！`,1200);S.win();},250);}
  setTimeout(()=>{show('draft',false);openDeploy();},ev.upgraded?1100:520);}
function setBattleUI(on,deploy){$('hud').classList.toggle('hidden',!on);$('spellBar').classList.toggle('hidden',!on||deploy);$('deployBar').classList.toggle('hidden',!deploy);$('synPanel').classList.toggle('hidden',!on);$('artRow').classList.toggle('hidden',!on);deployZone.visible=!!deploy;$('uiLayer').style.display=on?'':'none';if(!on){$('bossBar').classList.add('hidden');$('hint').classList.add('hidden');}}
async function buildBattle(useForm){const run=G.run,info=G.info;setTheme(info.boss?info.boss.theme:info.themeId);const list=H.deployList(run);G.list=list;run.lastArmy=list.map(x=>({...x}));
  const ps=H.playerStacks(run,list,info);if(!useForm)ps.forEach(p=>{delete p.ax;delete p.ay;});const es=H.enemyStacks(G.enemies,info);
  const types=[...new Set(ps.map(s=>s.type).concat(es.map(s=>s.type)))];const tpls=await Promise.all(types.map(ensureTpl));const TP={};types.forEach((t,i)=>TP[t]=tpls[i]);
  disposeViews();G.battle=Core.createBattle(ps,es);for(const u of G.battle.units){const v=makeView(u,TP[u.type]);v.spawn=-Math.random()*0.4;}
  G.hero=H.heroFor(run,info);refreshSyn();refreshArts();}
const threatGrp=new THREE.Group();scene.add(threatGrp);
function drawThreats(){while(threatGrp.children.length){const o=threatGrp.children.pop();if(o.geometry&&o.geometry!==bandGeo&&o.geometry!==arrowGeo)o.geometry.dispose();}
  if(G.phase!=='deploy'||!G.battle)return;const ps=G.battle.units.filter(u=>u.side==='p'),es=G.battle.units.filter(u=>u.side==='e');
  for(const e of es){const [ex,ez]=unitWorld(e);
    if(e.st.shots>0){const t=ps.slice().sort((a,c)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(c.x-e.x,c.y-e.y))[0];if(!t)continue;const [tx,tz]=unitWorld(t);
      const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ex,0.05,ez),new THREE.Vector3(tx,0.05,tz)]),new THREE.LineDashedMaterial({color:0xffa030,dashSize:0.2,gapSize:0.14,transparent:true,opacity:0.95}));l.computeLineDistances();threatGrp.add(l);
      const a=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:0xffa030}));a.position.set(tx+(ex-tx)*0.1,0.06,tz+(ez-tz)*0.1);a.rotation.y=Math.atan2(tx-ex,tz-ez);threatGrp.add(a);}
    else{const len=ex-(-W2+DEPLOY_COLS);if(len<=0)continue;const m=new THREE.Mesh(bandGeo,new THREE.MeshBasicMaterial({color:0xff3a2a,transparent:true,opacity:0.2,depthWrite:false}));m.scale.set(len,1,e.fh*0.9);m.position.set(ex-len/2,0.018,ez);threatGrp.add(m);
      for(let k=1;k<len;k+=1.2){const a=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:0xff5040,transparent:true,opacity:0.55,depthWrite:false}));a.position.set(ex-k,0.03,ez);a.rotation.y=-Math.PI/2;threatGrp.add(a);}}}}
function openDeploy(){G.phase='loading';const saved=Object.keys(G.run.form).length>0;buildBattle(true).then(()=>{G.phase='deploy';drawThreats();SFX.setTrack(G.info.boss?'boss':'battle');if(G.info.boss)S.sting();
  for(const u of G.battle.units)MM.codex[u.type]=1;Meta.save();
  if(saved)toast('↺ 已沿用上次阵型 · 拖动可调整','',2000);G.sel=null;setBattleUI(true,true);$('stageNum').textContent=G.run.stage>H.STAGES?`∞${G.run.stage}`:`${G.run.stage}/${H.STAGES}`;
  $('deployTheme').innerHTML=`<b style="color:${G.info.theme.col}">${G.info.boss?'👑 ':''}${G.info.theme.n}</b> · ${G.info.theme.hint}`;
  setTimeout(()=>{for(const u of G.battle.units){const [x,z]=unitWorld(u);dust(x,z,6,1);}S.spawn();},200);
  if(G.info.boss)banner('👑 '+G.info.boss.n,1300);
  if(!G.tut.deploy)setTimeout(()=>coach('👆 拖动蓝色部队布阵 · 红色箭头＝敌军进攻路线<br>然后点 <b>⚔ 开战</b>'),500);
  }).catch(e=>errToast('模型加载失败 '+e.message));}
function startFight(){if(G.phase!=='deploy')return;S.go();hideCoach();G.phase='countdown';drawThreats();G.phase='deploy';if(!G.tut.deploy){G.tut.deploy=1;saveTut();}
  for(const u of G.battle.units)if(u.side==='p')G.run.form[u.type]=[u.ax,u.ay];G.sel=null;hoverMesh.visible=false;
  if(G.run.arts.includes('damned'))for(const u of G.battle.units)if(u.side==='e')u.buf.slow=6;
  setBattleUI(true,false);refreshSpellBar(true);G.phase='countdown';banner('战斗！',700);setTimeout(()=>{G.phase='battle';G.endT=0;if(!G.focusHintShown)$('hint').classList.remove('hidden');
    if(!G.tut.spell)setTimeout(()=>{if(G.phase==='battle'){G.hero.mana=G.hero.max;coach('✨ 法力满了！点下方 <b>法术按钮</b> 再点敌人施法');}},1800);
    const bs=G.battle.units.find(u=>u.boss);document.body.classList.toggle('boss',!!bs);if(bs){$('bossBar').classList.remove('hidden');$('bossName').textContent='👑 '+H.BOSSES.find(b=>b.id===bs.boss).n;G.bossU=bs;}else G.bossU=null;},600);}
function autoArrange(){if(G.phase!=='deploy')return;S.click();G.run.form={};buildBattle(false).then(()=>{G.phase='deploy';drawThreats();for(const v of views.values())v.spawn=0.6;banner('已自动布阵',700);});G.phase='loading';}
function synToast(before){const after=H.synCounts(H.deployList(G.run));for(const f in after){const t0=H.synTier(before[f]||0),t1=H.synTier(after[f]);if(t1>t0){const F=H.FAC[f];setTimeout(()=>{toast(`<b style="color:${F.col}">${F.icon} ${F.n}羁绊 ${after[f]} 激活！</b><br>${F.t[t1-1]}`,'syn',3200);S.syn();},350);}}}
// ---------- HUD panels ----------
function refreshSyn(){const run=G.run;if(!run)return;const own=G.battle?G.battle.units.filter(u=>u.side==='p').map(u=>({type:u.type})):H.deployList(run);const sc=H.synCounts(own);
  const el=$('synPanel');el.innerHTML=Object.keys(H.FAC).filter(f=>sc[f]).sort((a,b)=>sc[b]-sc[a]).map(f=>{const F=H.FAC[f],n=sc[f],t=H.synTier(n);
    return `<div class="syn ${t?'on':''}" data-f="${f}" style="--fc:${F.col}"><span class="si">${F.icon}</span><span class="sn">${F.n}</span><b>${n}</b><span class="sp">${[2,4,6].map(k=>`<i class="${n>=k?'lit':''}"></i>`).join('')}</span></div>`;}).join('');
  el.querySelectorAll('.syn').forEach(d=>{const f=d.dataset.f,F=H.FAC[f];const html=()=>`<div class="tt">${F.icon} ${F.n}羁绊（${sc[f]}）</div>`+F.t.map((x,i)=>`<div class="${H.synTier(sc[f])>i?'lit':'dim'}">(${[2,4,6][i]}) ${x}</div>`).join('');
    longPress(d,html);d.onclick=()=>{const r=d.getBoundingClientRect();showTextTip(html(),r.right+80,r.top+40);setTimeout(hideTip,2200);};});}
function refreshArts(){const el=$('artRow');el.innerHTML=G.run.arts.map(id=>`<span class="art" data-id="${id}">${H.ARTM[id].i}</span>`).join('');
  el.querySelectorAll('.art').forEach(d=>{const a=H.ARTM[d.dataset.id];d.onclick=()=>{const r=d.getBoundingClientRect();showTextTip(`<div class="tt">${a.i} ${a.n}</div><div class="th">${a.e}</div><div>${a.d}</div>`,r.left,r.bottom+90);setTimeout(hideTip,2200);};});}
function refreshSpellBar(rebuild){const h=G.hero,run=G.run;if(!h)return;const bar=$('spellBtns');
  if(rebuild||bar.childElementCount!==run.spells.length){bar.innerHTML='';run.spells.forEach(id=>{const sp=H.SPM[id];const b=document.createElement('button');b.className='spb';b.dataset.id=id;
    b.innerHTML=`<span class="ic">${sp.i}</span><span class="nm">${sp.n}</span><span class="co">${H.spellCost(h,id)}</span>`;b.onclick=()=>spellBtn(id);longPress(b,`<div class="tt">${sp.i} ${sp.n} · ${H.spellCost(h,id)}法力</div><div>${sp.d}</div><div class="th">当前法力强度 ×${h.P.toFixed(2)}（英雄 Lv${h.lvl}）</div>`);bar.appendChild(b);});}
  $('manaFill').style.width=(h.mana/h.max*100).toFixed(1)+'%';$('spellBar').classList.toggle('full',h.mana>=h.max-0.01);$('manaTxt').textContent=`${Math.floor(h.mana)}/${h.max}`;$('heroLv').textContent='英雄 Lv'+h.lvl;
  for(const b of bar.children){const id=b.dataset.id;b.classList.toggle('dis',h.mana<H.spellCost(h,id));b.classList.toggle('act',G.targeting===id);}}
function spellBtn(id){hideCoach();if(G.phase!=='battle'){banner('战斗开始后才能施法',700);return;}const h=G.hero,sp=H.SPM[id];if(G.targeting===id){G.targeting=null;$('reticle').classList.add('hidden');S.click();refreshSpellBar();return;}
  if(h.mana<H.spellCost(h,id)){banner('法力不足',600);S.click();return;}
  if(sp.tgt==='allies'||sp.tgt==='enemies'){castSpell(id);return;}
  G.targeting=id;S.tick();banner(sp.tgt==='area'?'点选施法位置':sp.tgt==='enemy'?'点选一个敌人':'点选一支友军',900);refreshSpellBar();}
// ---------- end of battle, rewards ----------
function endBattle(){const b=G.battle;if(G.phase!=='battle')return;G.phase='result';hideCoach();G.targeting=null;$('reticle').classList.add('hidden');$('hint').classList.add('hidden');const win=b.over==='win';win?S.win():S.lose();
  const run=G.run;const pl=b.units.filter(u=>u.side==='p');const ra=H.afterBattle(run,b,G.list);
  for(const v of views.values())if(v.u.alive&&v.u.side===(win?'p':'e')&&v.one.cheer)playOne(v,'cheer');
  if(!win){setTimeout(()=>gameOver(false),1400);return;}
  $('resTitle').textContent=G.info.boss?'首领击败！':'胜利';$('resTitle').className='res-title';
  const lostT=pl.filter(u=>!u.summoned).reduce((a,u)=>a+u.start-u.count,0),healT=Object.values(ra.healed).reduce((a,b)=>a+b,0);
  $('resList').innerHTML=pl.filter(u=>!u.summoned).map((u,i)=>{const l=u.start-u.count,h=ra.healed[u.type]||0;return `<div class="res-unit ${u.alive?'':'dead'}" style="animation-delay:${i*0.07}s"><img src="${sprSrc(u.type)}"><div class="c">${u.alive?'×'+(u.count+h):'阵亡'}</div><div class="l">${l>0?'-'+l:''}${h?` <i>+${h}</i>`:''}</div><div class="n">${u.st.n}</div></div>`;}).join('');
  $('resSub').innerHTML=`第 ${run.stage} 关已通过`+`<div class="lossline">${lostT?`<span class="lo">☠ 损失 ${lostT}</span>`:'<span class="ok">✨ 零伤亡！</span>'}${healT?`<span class="he">⛺ 军医救回 ${healT}</span>`:''}<span class="go">💰 +${ra.gold}</span></div>`+(ra.raised?`<div class="loot">☠ 通灵术：+${ra.raised} ${U[ra.sk].n}</div>`:'');
  const final=run.stage===H.STAGES;$('resBtn').textContent=final?'查看战果 →':'领取奖励 →';
  $('resBtn').onclick=()=>{S.click();show('result',false);if(final){gameOver(true);return;}openReward();};
  for(let i=0;i<24;i++)setTimeout(()=>confetti(),i*40);setTimeout(()=>show('result',true),900);}
function openReward(){const run=G.run,kind=H.rewardKind(run.stage);const opts=H.rewardOptions(run,kind);if(!opts.length){nextStage();return;}
  G.phase='reward';$('rwTitle').textContent=kind==='artifact'?'🏺 选择一件宝物':'📜 学习一个法术';$('rwSub').textContent=kind==='artifact'?(G.info.boss?'首领战利品！':'每两关一次的宝物奖励'):`英雄升至 Lv${run.stage+1} · 法术栏 ${run.spells.length}/4`;
  const el=$('rwCards');el.innerHTML='';S.rewardJ();opts.forEach((o,i)=>{const d=document.createElement('div');d.className='rcard';d.style.animationDelay=(i*0.08)+'s';
    if(o.kind==='artifact'){const a=H.ARTM[o.id],rr=H.RARITY[a.r];d.classList.add('flip','r'+a.r);d.style.setProperty('--rc',rr.col);
      d.innerHTML=`<div class="back"><span>🏺</span></div><div class="face"><div class="rr">${rr.n}</div><div class="ri">${a.i}</div><div class="rn">${a.n}</div><div class="re">${a.e}</div><div class="rd">${a.d}</div>${a.tag?`<div class="rtag">#${a.tag}</div>`:''}</div>`;
      setTimeout(()=>{d.classList.add('open');S.flip();if(a.r==='e'||a.r==='l'){setTimeout(()=>S.rare(),150);}},450+i*330);}
    else{const sp=H.SPM[o.id];d.innerHTML=`<div class="ri">${sp.i}</div><div class="rn">${sp.n}</div><div class="re">${sp.cost} 法力 · ${({air:'气',fire:'火',earth:'土',water:'水'})[sp.sch]}系</div><div class="rd">${sp.d}</div>`;}
    d.onclick=()=>takeReward(o,d);el.appendChild(d);});
  $('rwSkip').onclick=()=>{S.click();show('reward',false);nextStage();};show('reward',true);}
function takeReward(o,d){if(G.phase!=='reward')return;if(d.classList.contains('flip')&&!d.classList.contains('open'))return;const run=G.run;S.pick();d.classList.add('chosen');
  if(o.kind==='artifact'){run.arts.push(o.id);G.phase='x';setTimeout(()=>{show('reward',false);banner(H.ARTM[o.id].i+' '+H.ARTM[o.id].n,1000);nextStage();},500);return;}
  if(run.spells.length<4){run.spells.push(o.id);G.phase='x';setTimeout(()=>{show('reward',false);nextStage();},500);return;}
  // replace a slot
  const el=$('rwCards');$('rwTitle').textContent=`替换哪个法术？（学习 ${H.SPM[o.id].i}${H.SPM[o.id].n}）`;el.innerHTML='';
  run.spells.forEach((id,i)=>{const sp=H.SPM[id];const c=document.createElement('div');c.className='rcard small';c.innerHTML=`<div class="ri">${sp.i}</div><div class="rn">${sp.n}</div>`;c.onclick=()=>{run.spells[i]=o.id;S.pick();show('reward',false);nextStage();};el.appendChild(c);});}
function nextStage(){G.run.stage++;openDraft();}
function confetti(){const x=(Math.random()-0.5)*GC,z=(Math.random()-0.5)*GR;const c=[0xffd75a,0x78c8ff,0xff78a0][Math.floor(Math.random()*3)];for(let i=0;i<6;i++)P({x,y:2+Math.random(),z,vx:(Math.random()-0.5)*2,vy:Math.random()*2,vz:(Math.random()-0.5)*2,g:3,drag:1,life:1.4,s:0.12,c:C3(c)},true);}
function gameOver(win){G.phase='over';setBattleUI(false);SFX.setTrack('menu');const run=G.run;const endless=run.stage>H.STAGES;
  const reached=win?H.STAGES:run.stage;const bonus=Math.floor(run.kills/40);const gold=run.gold+bonus;const newBest=reached>MM.best;MM.gold+=gold;MM.runs++;MM.best=Math.max(MM.best,reached);MM.bestStreak=Math.max(MM.bestStreak,run.bestStreak||0);MM.totalKills+=run.kills;
  if(run.dailyDay)MM.daily[run.dailyDay]=Math.max(MM.daily[run.dailyDay]||0,reached);Meta.save();H.setRng(Math.random);
  $('goGold').innerHTML=`💰 +${gold} 金币 <small>（关卡 ${run.gold} + 歼敌 ${bonus}）</small>${newBest?' <span class="nb">🏆 新纪录！</span>':''}<br><small>去营地解锁新英雄、新兵种与永久强化</small>`;
  makeShareCard(run,reached,win);
  $('goTitle').textContent=win?'凯旋':'战败';$('goTitle').className='go-title'+(win?'':' lose');
  $('goSub').textContent=win?`你征服了全部 ${H.STAGES} 关！`:endless?`无尽模式止步于第 ${run.stage} 关`:`止步于第 ${run.stage} 关`;
  $('goStats').innerHTML=`<div>通关 <b>${win?H.STAGES:run.stage-1}</b></div><div>歼敌 <b>${run.kills}</b></div><div>宝物 <b>${run.arts.length}</b></div>${run.raised?`<div>通灵 <b>${run.raised}</b></div>`:''}`;
  $('goArt').innerHTML=H.stacks(run.army).slice(0,5).map(s=>`<img src="${sprSrc(s.type)}">`).join('');$('goEndless').classList.toggle('hidden',!win);show('gameover',true);}
function makeShareCard(run,reached,win){const c=document.createElement('canvas');c.width=720;c.height=900;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,900);g.addColorStop(0,'#2a3f8a');g.addColorStop(1,'#0e1430');x.fillStyle=g;x.fillRect(0,0,720,900);
  x.strokeStyle='#ffd75e';x.lineWidth=8;x.strokeRect(14,14,692,872);x.textAlign='center';x.fillStyle='#ffe27a';x.font='900 72px "PingFang SC","Noto Sans SC",sans-serif';x.fillText('英雄冲突',360,110);
  x.fillStyle='#9fb0e0';x.font='700 24px sans-serif';x.fillText('HEROES CLASH'+(run.dailyDay?' · 每日挑战 '+run.dailyDay:''),360,150);
  x.fillStyle='#fff';x.font='900 54px "PingFang SC","Noto Sans SC",sans-serif';x.fillText(win?'🏆 全部通关！':`我打到了第 ${reached} 关`,360,240);
  const hr=H.HEROM[run.hero];x.font='700 28px "PingFang SC","Noto Sans SC",sans-serif';x.fillStyle='#cfe0ff';x.fillText(`英雄 ${hr.i} ${hr.n}（${hr.cls}）`,360,290);
  const st=(H.stacks(run.army).length?H.stacks(run.army):(run.lastArmy||[])).slice(0,6);const imgs=st.map(s=>new Promise(r=>{const im=new Image();im.onload=()=>r([s,im]);im.onerror=()=>r([s,null]);im.src=sprSrc(s.type);}));
  Promise.all(imgs).then(L=>{L.forEach(([s,im],i)=>{const cx=130+(i%3)*230,cy=330+Math.floor(i/3)*210;x.fillStyle='rgba(255,255,255,.08)';x.fillRect(cx-95,cy,190,190);if(im){const k=Math.min(170/im.width,150/im.height);x.drawImage(im,cx-im.width*k/2,cy+10,im.width*k,im.height*k);}
      x.fillStyle='#ffe27a';x.font='900 30px sans-serif';x.fillText('×'+s.count,cx,cy+182);});
    if(!L.length){x.fillStyle='#ff9a8a';x.font='800 36px sans-serif';x.fillText('全军覆没…',360,450);}
    x.fillStyle='#fff';x.font='800 30px "PingFang SC","Noto Sans SC",sans-serif';x.fillText(`⚔ 歼敌 ${run.kills}   🔥 最高连杀 ${run.bestStreak||0}   🏺 宝物 ${run.arts.length}`,360,790);
    x.font='34px sans-serif';x.fillText(run.arts.slice(0,10).map(id=>H.ARTM[id].i).join(' '),360,745);
    x.fillStyle='#ffd75e';x.font='800 26px "PingFang SC","Noto Sans SC",sans-serif';x.fillText('你能超过我吗？ merliniky.github.io/heroes-clash',360,850);
    c.toBlob(b=>{G.shareBlob=b;$('shareImg').src=URL.createObjectURL(b);},'image/png');});
  G.shareUrl=`${location.origin}${location.pathname}?vs=${reached}`;G.shareText=`我在《英雄冲突》打到了第 ${reached} 关（歼敌 ${run.kills}，最高连杀 ${run.bestStreak||0}）！你能超过我吗？`;}
$('shareBtn').onclick=async()=>{S.click();const f=G.shareBlob&&new File([G.shareBlob],'heroes-clash.png',{type:'image/png'});
  try{if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:G.shareText,url:G.shareUrl});return;}if(navigator.share){await navigator.share({text:G.shareText,url:G.shareUrl});return;}}catch(_){return;}
  if(G.shareBlob){const a=document.createElement('a');a.href=URL.createObjectURL(G.shareBlob);a.download='heroes-clash.png';a.click();toast('📥 战绩卡已保存');}};
$('copyBtn').onclick=()=>{S.click();const t=G.shareText+' '+G.shareUrl;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('🔗 挑战链接已复制！发给好友吧'),()=>{prompt('复制链接：',t);});};
// ---------- camp (meta shop / codex) ----------
let campTab='up';
function openCamp(){SFX.init();S.click();show('title',false);show('gameover',false);show('camp',true);renderCamp();}
function renderCamp(){$('campGold').innerHTML=`💰 <b>${MM.gold}</b> 金币 · 🏆 最佳第 ${MM.best} 关 · 已出征 ${MM.runs} 次`;document.querySelectorAll('#campTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===campTab));const el=$('campBody');
  const buy=(cost,fn)=>{if(Meta.spend(cost)){fn();Meta.save();S.rare();renderCamp();}else{S.click();toast(`金币不足（需要 ${cost}）`,'bad');}};
  if(campTab==='up'){el.innerHTML=H.META_UP.map(u=>{const lv=MM.up[u.id]||0,max=u.costs.length,c=u.costs[lv];return `<div class="crow"><span class="ci">${u.i}</span><div class="ct"><b>${u.n}</b> <small>Lv${lv}/${max}</small><div>${u.d}</div></div>${lv<max?`<button class="cb" data-id="${u.id}">💰${c}</button>`:'<span class="cmax">已满级</span>'}</div>`;}).join('');
    el.querySelectorAll('.cb').forEach(b=>b.onclick=()=>{const u=H.META_UP.find(x=>x.id===b.dataset.id);buy(u.costs[MM.up[u.id]||0],()=>{MM.up[u.id]=(MM.up[u.id]||0)+1;toast(`${u.i} ${u.n} 升级！`,'gold');});});}
  if(campTab==='hero'){el.innerHTML=H.HEROES.map(h=>{const own=MM.heroes.includes(h.id);return `<div class="crow"><span class="ci">${h.i}</span><div class="ct"><b>${h.n}</b> <small>${h.cls}</small><div>${h.pas}</div></div>${own?'<span class="cmax">已拥有</span>':`<button class="cb" data-id="${h.id}">💰${h.cost}</button>`}</div>`;}).join('');
    el.querySelectorAll('.cb').forEach(b=>b.onclick=()=>{const h=H.HEROM[b.dataset.id];buy(h.cost,()=>{MM.heroes.push(h.id);toast(`${h.i} 解锁英雄：${h.n}`,'gold');});});}
  if(campTab==='unlock'){const items=H.LOCK_UNITS.map(t=>({id:t,k:'unit',n:U[t].n,img:sprSrc(t),d:`${Hero.FAC[Hero.facOf(t)].n} · ${U[t].lvl}级（第11关起出现）`,c:H.UNLOCK_COST.unit})).concat(H.LOCK_ARTS.map(id=>({id,k:'art',n:H.ARTM[id].n,ic:H.ARTM[id].i,d:H.ARTM[id].d,c:H.UNLOCK_COST.art})));
    el.innerHTML=items.map(it=>{const own=MM.unlocked.includes(it.id);return `<div class="crow"><span class="ci">${it.img?`<img src="${it.img}">`:it.ic}</span><div class="ct"><b>${it.n}</b> <small>${it.k==='unit'?'兵种':'宝物'}</small><div>${it.d}</div></div>${own?'<span class="cmax">已解锁</span>':`<button class="cb" data-id="${it.id}" data-c="${it.c}">💰${it.c}</button>`}</div>`;}).join('');
    el.querySelectorAll('.cb').forEach(b=>b.onclick=()=>buy(+b.dataset.c,()=>{MM.unlocked.push(b.dataset.id);toast('🔓 已解锁','gold');}));}
  if(campTab==='codex'){const all=H.ROSTER.flatMap(t=>[t,H.UPG[t]].filter(Boolean));const seen=all.filter(t=>MM.codex[t]).length;
    el.innerHTML=`<div class="cxh">图鉴 ${seen}/${all.length} · 在战斗中遇到即可收录</div><div class="cxg">`+all.map(t=>MM.codex[t]?`<div class="cx" data-t="${t}"><img src="${sprSrc(t)}"><span>${U[t].n}</span></div>`:`<div class="cx no"><img src="${sprSrc(t)}"><span>？？？</span></div>`).join('')+'</div>';
    el.querySelectorAll('.cx[data-t]').forEach(d=>d.onclick=()=>{const t=d.dataset.t,st=U[t];const r=d.getBoundingClientRect();showTextTip(`<div class="tt">${st.n} ${facChip(t)}</div><div class="th">${st.h3} · ${st.lvl}级</div><div class="tg"><span>攻 <b>${st.a}</b></span><span>防 <b>${st.d}</b></span><span>伤 <b>${st.dmg[0]}-${st.dmg[1]}</b></span><span>命 <b>${st.hp}</b></span><span>速 <b>${st.spd}</b></span><span>射 <b>${st.shots||'—'}</b></span></div><div class="ta">${abilList(st).map(x=>'· '+x).join('<br>')}</div>`,r.left+r.width/2,r.top);setTimeout(hideTip,2600);});}}
document.querySelectorAll('#campTabs button').forEach(b=>b.onclick=()=>{campTab=b.dataset.t;S.click();renderCamp();});
$('campBack').onclick=()=>{S.click();show('camp',false);titleMeta();show('title',true);};
$('campBtn').onclick=openCamp;$('goCamp').onclick=openCamp;$('dailyBtn').onclick=()=>{SFX.init();startDaily();};$('hsBack').onclick=()=>{S.click();show('heroSel',false);show('title',true);};
$('goEndless').onclick=()=>{S.click();show('gameover',false);openReward();G.phase='reward';};
$('startBtn').onclick=()=>{if(!MM.runs){startRun({hero:'knight'});return;}openHeroSel();};$('goBtn').onclick=()=>{show('gameover',false);openHeroSel();};
$('fightBtn').onclick=startFight;$('autoBtn').onclick=autoArrange;
$('speedBtn').onclick=()=>{S.click();G.speed=G.speed===1?2:1;$('speedBtn').textContent=G.speed+'×';};
const mb=$('muteBtn');const setMB=()=>{mb.textContent=SFX.muted?'🔇':'🔊';$('muteToggle').textContent=SFX.muted?'🔇 已静音（点击恢复）':'🔊 静音';};setMB();
mb.onclick=e=>{SFX.init();S.click();$('sndPanel').classList.toggle('hidden');e.stopPropagation();};$('muteToggle').onclick=()=>{SFX.setMuted(!SFX.muted);setMB();S.click();};
$('volM').value=SFX.vol.m;$('volS').value=SFX.vol.s;$('volM').oninput=e=>SFX.setVol(+e.target.value,null);$('volS').oninput=e=>{SFX.setVol(null,+e.target.value);S.tick();};
addEventListener('pointerdown',e=>{if(!e.target.closest('#sndPanel,#muteBtn'))$('sndPanel').classList.add('hidden');});
function errToast(m){const t=$('errToast');t.textContent='⚠ 出错了：'+m;t.classList.add('show');clearTimeout(errToast.t);errToast.t=setTimeout(()=>t.classList.remove('show'),8000);}
addEventListener('error',e=>errToast((e.message||'')+(e.lineno?' @'+e.lineno:'')));addEventListener('unhandledrejection',e=>errToast(String(e.reason&&e.reason.message||e.reason)));
// ---------- main loop ----------
const clock=new THREE.Clock();let fpsA=60,uiT=0;
function stepFx2(dt){for(const f of fxList){if(f.kind==='orb'){const k=Math.min(1,f.t/f.life);f.o.position.lerpVectors(f.from,f.to,k);if(f.arc)f.o.position.y+=Math.sin(k*Math.PI)*f.arc;const p=f.o.position;
      if(f.trail){const c=Array.isArray(f.trail)?f.trail:C3(f.trail);for(let i=0;i<3;i++)P({x:p.x+(Math.random()-0.5)*0.15,y:p.y,z:p.z+(Math.random()-0.5)*0.15,vy:0.3,drag:3,life:0.4,s:0.2*f.o.scale.x,grow:0.3,c},true);}
      if(f.t+0.02>=f.life&&f.cb&&!f.done){f.done=1;f.cb();}}
    if(f.kind==='warn'){f.o.material.opacity=0.18+0.3*Math.abs(Math.sin(f.t*9));}
    if(f.kind==='pillar'){f.o.scale.x=f.o.scale.z=f.o.scale.x*(1+0.6*0.016);f.o.rotation.y+=0.1;}}}
function frame(){requestAnimationFrame(frame);let dt=Math.min(0.05,clock.getDelta());fpsA=fpsA*0.95+(1/Math.max(dt,0.001))*0.05;
  if(slowT>0){slowT-=dt;dt*=0.3;}let stopped=false;if(stopT>0){stopT-=dt;stopped=true;}
  const b=G.battle;const gdt=stopped?0:dt*G.speed;themeAmbient(dt);
  if(b){if(G.phase==='battle'){const n=stopped?0:G.speed;for(let i=0;i<n;i++){Core.step(b,dt);H.bossTick(b,dt,G.run.stage);G.hero.mana=Math.min(G.hero.max,G.hero.mana+G.hero.regen*dt);}handleEvents(b);
      $('pCount').textContent=b.units.filter(u=>u.alive&&u.side==='p').reduce((a,u)=>a+u.count,0);$('eCount').textContent=b.units.filter(u=>u.alive&&u.side==='e').reduce((a,u)=>a+u.count,0);
      uiT+=dt;if(uiT>0.1){uiT=0;refreshSpellBar();if(G.bossU){const u=G.bossU;$('bossFill').style.width=(Math.max(0,((u.count-1)*u.st.hp+u.top)/(u.start*u.st.hp))*100).toFixed(1)+'%';if(!u.alive)$('bossBar').classList.add('hidden');}}
      if(b.over){G.endT+=dt;if(G.endT>1.2)endBattle();}}
    for(const v of views.values())updateView(v,G.phase==='battle'?gdt:dt,b);updateProj(b,gdt);}
  stepPool(PA,gdt);stepPool(PN,gdt);stepFx2(gdt);stepFx(gdt);stepBreath(gdt);
  shake=Math.max(0,shake-dt*0.6);camera.position.copy(camBase);if(shake>0){camera.position.x+=(Math.random()-0.5)*shake;camera.position.y+=(Math.random()-0.5)*shake*0.6;camera.position.z+=(Math.random()-0.5)*shake;}
  const ps=renderer.getPixelRatio()*innerHeight/(2*Math.tan(camera.fov*Math.PI/360));PA.mat.uniforms.scale.value=PN.mat.uniforms.scale.value=ps;
  renderer.render(scene,camera);updateBadges();}
// ---------- boot ----------
fitCamera();placeProps();requestAnimationFrame(frame);titleMeta();setTheme('grove');addEventListener('pointerdown',()=>{if(G.phase==='title')SFX.setTrack('menu');},{once:true});
$('titleHeroes').innerHTML=['crusader','greenDragon','lich'].map(s=>`<img src="${sprSrc(s)}">`).join('');
H.ROSTER.filter(t=>U[t].lvl<=2).forEach(t=>ensureTpl(t));
if(DEBUG){window.__G=G;window.__dbg={THREE,scene,camera,renderer,views,ensureTpl,makeView,disposeViews,unitWorld,playOne,castSpell,groundAt,cellFor,fps:()=>fpsA,
  setCam:(p,l)=>{camBase.copy(p);camera.position.copy(p);camera.lookAt(l);camera.fov=40;camera.updateProjectionMatrix();},
  screen:u=>{const v=views.get(u);tmpV.set(0,v.def.h*0.5+(v.def.fly||0),0);v.g.localToWorld(tmpV);tmpV.project(camera);return [(tmpV.x+1)/2*innerWidth,(1-tmpV.y)/2*innerHeight];},
  cellScreen:(ax,ay)=>{const [sx,sy]=worldToScreen(ax+0.5-W2,0,ay+0.5-H2);return [sx,sy];}};
  window.__dbg.tap=window.__dbg.screen;}

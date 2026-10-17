// Offline cache. Bump VERSION on every deploy (index.html also cache-busts with ?v=).
const VERSION='hc-v15';
const CORE=['./','index.html','style.css?v=15','audio.js?v=15','units.js?v=15','core.js?v=15','models.js?v=15','hero.js?v=15','meta.js?v=15','game3d.js?v=15','lib/three.module.min.js?v=15',
  'lib/addons/loaders/GLTFLoader.js','lib/addons/utils/SkeletonUtils.js','lib/addons/utils/BufferGeometryUtils.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  // pages: network first (so new versions land), fall back to cache offline
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put('index.html',cp));return res;}).catch(()=>caches.match('index.html').then(m=>m||caches.match('./'))));return;}
  // everything else (versioned js/css, models, audio, art): cache first, then network + store
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&res.status===200){const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));}return res;})));});

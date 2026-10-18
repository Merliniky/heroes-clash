// Procedural WebAudio SFX + CC0 music files
(function(){
let ac=null,master,sfxG,musG,noiseBuf,muted=localStorage.getItem('hc_mute')==='1',musicOn=false,nextT=0,step=0,timer=null;
const last={};
function init(){
  if(ac){if(ac.state==='suspended')ac.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ac=new AC();master=ac.createGain();master.gain.value=muted?0:0.9;
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;master.connect(comp);comp.connect(ac.destination);
  sfxG=ac.createGain();sfxG.gain.value=0.8;sfxG.connect(master);musG=ac.createGain();musG.gain.value=0.22;musG.connect(master);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  applyVol();for(const k in els)delete els[k];if(musicOn){const w=want;cur=null;setTrack(w||'menu');}
}
function ok(name,gap){if(!ac||muted)return false;const n=ac.currentTime;if(last[name]&&n-last[name]<gap)return false;last[name]=n;return true;}
const rnd=(a,b)=>a+Math.random()*(b-a);
function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
function osc(type,f0,f1,dur,peak,out,t=ac.currentTime,a=0.005){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);env(g,t,a,peak,dur);o.connect(g);g.connect(out||sfxG);o.start(t);o.stop(t+a+dur+0.05);return o;}
function noise(ftype,f0,f1,q,dur,peak,out,t=ac.currentTime,a=0.004){const s=ac.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=ac.createBiquadFilter();f.type=ftype;f.Q.value=q;f.frequency.setValueAtTime(f0,t);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t+dur);const g=ac.createGain();env(g,t,a,peak,dur);s.connect(f);f.connect(g);g.connect(out||sfxG);s.start(t,Math.random()*0.5);s.stop(t+a+dur+0.05);}
const S={
  step(){if(!ok('step',0.11))return;noise('lowpass',rnd(260,420),120,1,0.07,0.09);},
  gallop(){if(!ok('gallop',0.13))return;noise('bandpass',rnd(300,500),null,2,0.05,0.13);osc('sine',140,60,0.06,0.08);},
  clash(){if(!ok('clash',0.06))return;const b=rnd(0.85,1.2);[2100,3170,4730].forEach((f,i)=>osc('sine',f*b,f*b*0.97,0.18+i*0.04,0.035));noise('highpass',3000,null,1,0.05,0.07);},
  slash(){if(!ok('slash',0.05))return;noise('bandpass',700,3400,3,0.14,0.16);},
  thrust(){if(!ok('thrust',0.05))return;noise('bandpass',1800,600,4,0.08,0.13);osc('sine',220,120,0.05,0.05);},
  heavy(){if(!ok('heavy',0.08))return;osc('sine',120,38,0.25,0.35);noise('lowpass',900,150,1,0.2,0.25);},
  hit(){if(!ok('hit',0.04))return;osc('sine',rnd(150,190),55,0.1,0.18);noise('lowpass',1400,300,1,0.06,0.12);},
  bite(){if(!ok('bite',0.08))return;const t=ac.currentTime;noise('bandpass',1200,null,3,0.03,0.2,null,t);noise('bandpass',900,null,3,0.04,0.2,null,t+0.07);osc('sawtooth',90,60,0.12,0.05,null,t);},
  bow(){if(!ok('bow',0.06))return;osc('triangle',rnd(380,460),170,0.13,0.14);noise('highpass',2500,null,1,0.04,0.06);},
  bolt(){if(!ok('bolt',0.06))return;osc('square',rnd(700,800),300,0.05,0.05);noise('bandpass',2400,800,2,0.09,0.12);},
  thunk(){if(!ok('thunk',0.05))return;noise('bandpass',900,null,2,0.04,0.14);osc('sine',300,120,0.04,0.06);},
  magic(){if(!ok('magic',0.08))return;const o=osc('sine',520,1350,0.32,0.09);osc('triangle',1040,2700,0.28,0.04);const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=18;lg.gain.value=40;l.connect(lg);lg.connect(o.frequency);l.start();l.stop(ac.currentTime+0.4);},
  holyHit(){if(!ok('holyHit',0.06))return;[1320,1760,2640].forEach((f,i)=>osc('sine',f,null,0.3,0.04,null,ac.currentTime+i*0.03));},
  dark(){if(!ok('dark',0.08))return;osc('sawtooth',300,90,0.35,0.06);noise('bandpass',500,200,6,0.35,0.08);},
  fireball(){if(!ok('fireball',0.07))return;noise('lowpass',1600,400,1,0.25,0.12);osc('sine',200,90,0.2,0.05);},
  breath(){if(!ok('breath',0.3))return;noise('lowpass',400,2200,1,0.55,0.32,null,ac.currentTime,0.08);noise('bandpass',180,90,1,0.6,0.2);},
  flame(){if(!ok('flame',0.08))return;noise('bandpass',900,3000,2,0.18,0.14);osc('sine',660,330,0.15,0.03);},
  roar(){if(!ok('roar',0.3))return;osc('sawtooth',160,70,0.5,0.08,null,ac.currentTime,0.05);noise('lowpass',600,200,2,0.5,0.12);},
  death(){if(!ok('death',0.07))return;noise('lowpass',1200,200,1,0.22,0.16);osc('triangle',rnd(380,460),110,0.25,0.07);},
  click(){if(!ac||muted)return;osc('square',900,600,0.04,0.05);},
  pick(){if(!ac||muted)return;const t=ac.currentTime;[523,659,784,1047].forEach((f,i)=>osc('triangle',f,null,0.18,0.1,null,t+i*0.06));noise('highpass',4000,null,1,0.25,0.03,null,t+0.2);},
  tick(){if(!ac||muted)return;osc('square',660,null,0.08,0.06);},
  go(){if(!ac||muted)return;const t=ac.currentTime;osc('sawtooth',392,null,0.35,0.08,null,t,0.02);osc('sawtooth',523,null,0.45,0.08,null,t+0.08,0.02);noise('lowpass',800,100,1,0.4,0.2,null,t);},
  win(){if(!ac||muted)return;const t=ac.currentTime;[[523,0],[659,.12],[784,.24],[1047,.36],[784,.52],[1047,.62]].forEach(([f,d])=>{osc('triangle',f,null,0.3,0.12,null,t+d);osc('square',f/2,null,0.25,0.03,null,t+d);});},
  lose(){if(!ac||muted)return;const t=ac.currentTime;[[440,0],[415,.25],[392,.5],[330,.8]].forEach(([f,d])=>osc('triangle',f,f*0.98,0.45,0.1,null,t+d));},
  spawn(){if(!ok('spawn',0.05))return;noise('lowpass',800,200,1,0.12,0.1);}
};
// CC0 music tracks (MintoDog / Bobjt via OpenGameArt) + Kenney jingles, routed through WebAudio for volume control
const vol=JSON.parse(localStorage.getItem('hc_vol')||'{"m":0.55,"s":0.85}');
const TR={menu:'assets/audio/menu.mp3',battle:'assets/audio/battle.mp3',boss:'assets/audio/boss.mp3'};
const els={};let cur=null,want=null;
function trackEl(k){if(els[k])return els[k];const a=new Audio(TR[k]+'?v=9');a.loop=true;a.preload='auto';a.crossOrigin='anonymous';
  const e={a,g:null};if(ac){try{const src=ac.createMediaElementSource(a);e.g=ac.createGain();e.g.gain.value=0;src.connect(e.g);e.g.connect(musG);}catch(_){}}els[k]=e;return e;}
function setTrack(k){want=k;musicOn=true;if(!ac)return;if(cur===k)return;const old=cur?els[cur]:null;cur=k;
  if(old){if(old.g)old.g.gain.setTargetAtTime(0,ac.currentTime,0.3);setTimeout(()=>{if(cur!==Object.keys(els).find(x=>els[x]===old))old.a.pause();},1500);}
  if(!k)return;const e=trackEl(k);if(k!=='menu'||e.a.paused){try{e.a.currentTime=0;}catch(_){}}const p=e.a.play();if(p&&p.catch)p.catch(()=>{});
  if(e.g){e.g.gain.cancelScheduledValues(ac.currentTime);e.g.gain.setTargetAtTime(1,ac.currentTime,0.4);}}
const jb={};function jingle(k,g=1){if(!ac||muted)return;const go=buf=>{const s=ac.createBufferSource(),gg=ac.createGain();gg.gain.value=g;s.buffer=buf;s.connect(gg);gg.connect(sfxG);s.start();};
  if(jb[k]&&jb[k].buf)return go(jb[k].buf);if(!jb[k]){jb[k]={};fetch('assets/audio/'+k+'.mp3?v=9').then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(buf=>{jb[k].buf=buf;go(buf);}).catch(()=>{});}}
function startMusic(){setTrack(want||'menu');}
function applyVol(){if(!ac)return;musG.gain.setTargetAtTime(0.5*vol.m,ac.currentTime,0.05);sfxG.gain.setTargetAtTime(vol.s,ac.currentTime,0.05);}
function setVol(m,sv){if(m!=null)vol.m=m;if(sv!=null)vol.s=sv;localStorage.setItem('hc_vol',JSON.stringify(vol));applyVol();}
Object.assign(S,{
  crit(){if(!ok('crit',0.06))return;const t=ac.currentTime;osc('square',1600,400,0.12,0.08,null,t);noise('highpass',2500,null,1,0.12,0.18,null,t);osc('sine',90,40,0.3,0.4,null,t);},
  boom(){if(!ok('boom',0.1))return;const t=ac.currentTime;osc('sine',80,25,0.7,0.7,null,t);noise('lowpass',1800,80,1,0.8,0.5,null,t);noise('highpass',3000,500,1,0.25,0.2,null,t);},
  zap(){if(!ok('zap',0.08))return;const t=ac.currentTime;for(let i=0;i<5;i++)noise('highpass',4000,900,3,0.06,0.25,null,t+i*0.035);osc('sawtooth',1800,80,0.35,0.12,null,t);osc('sine',60,30,0.5,0.4,null,t+0.05);},
  flip(){if(!ac||muted)return;noise('bandpass',2500,900,2,0.09,0.12);},
  coin(){if(!ok('coin',0.05))return;const t=ac.currentTime;osc('square',988,null,0.06,0.06,null,t);osc('square',1319,null,0.2,0.06,null,t+0.07);},
  streak(n){if(!ac||muted)return;const t=ac.currentTime,b=440*Math.pow(2,Math.min(n,8)/12);[1,1.25,1.5].forEach((m,i)=>osc('triangle',b*m,null,0.16,0.09,null,t+i*0.05));},
  syn(){if(!ac||muted)return;const t=ac.currentTime;[659,880,1175,1568].forEach((f,i)=>osc('sine',f,null,0.4,0.07,null,t+i*0.07));},
  sting(){jingle('sting',1);S.roar();},winJ(){jingle('win',0.9);},rewardJ(){jingle('reward',0.9);},
  rare(){if(!ac||muted)return;const t=ac.currentTime;[784,988,1175,1568,1976].forEach((f,i)=>osc('triangle',f,null,0.5,0.06,null,t+i*0.06));noise('highpass',6000,null,1,0.6,0.04,null,t+0.2);}
});

// Gem TD extras (td.html)
Object.assign(S,{
  pop(){if(!ok('pop',0.04))return;const t=ac.currentTime;osc('sine',520,1180,0.09,0.22,null,t);osc('triangle',1400,2200,0.06,0.06,null,t+0.04);noise('lowpass',900,200,1,0.08,0.1,null,t);},
  thud(){if(!ok('thud',0.05))return;const t=ac.currentTime;osc('sine',140,48,0.18,0.32,null,t);noise('lowpass',700,120,1,0.14,0.2,null,t);},
  shatter(){if(!ok('shatter',0.05))return;const t=ac.currentTime;for(let i=0;i<4;i++)osc('sine',rnd(2400,4200),rnd(1200,2000),0.12,0.035,null,t+i*0.025);noise('highpass',3500,null,1,0.12,0.09,null,t);osc('sine',110,45,0.2,0.2,null,t+0.05);},
  whoosh(){if(!ok('whoosh',0.08))return;noise('bandpass',400,2600,1.5,0.38,0.16);},
  poof(){if(!ok('poof',0.05))return;const t=ac.currentTime;noise('lowpass',1600,200,1,0.22,0.16,null,t);osc('sine',rnd(300,380),120,0.12,0.06,null,t);},
  ping(){if(!ok('ping',0.07))return;const f=rnd(1500,2100);osc('sine',f,f*0.98,0.16,0.045);osc('triangle',f*1.5,null,0.07,0.02);},
  ice(){if(!ok('ice',0.09))return;const t=ac.currentTime;osc('sine',rnd(2600,3000),1800,0.16,0.04,null,t);noise('highpass',5000,null,2,0.1,0.06,null,t);},
  fire(){if(!ok('fire',0.1))return;noise('bandpass',600,1800,1.2,0.24,0.14);osc('sine',90,50,0.2,0.12);},
  goo(){if(!ok('goo',0.1))return;const t=ac.currentTime;osc('sine',260,90,0.12,0.1,null,t);osc('sine',200,70,0.1,0.07,null,t+0.06);},
  coinIn(){if(!ok('coinIn',0.035))return;const t=ac.currentTime;const f=rnd(1500,1800);osc('square',f,null,0.04,0.035,null,t);osc('sine',f*1.5,null,0.12,0.05,null,t+0.04);},
  horn(){if(!ac||muted)return;const t=ac.currentTime;[[196,0],[262,0.18],[330,0.36],[392,0.54]].forEach(([f,d],i)=>{osc('sawtooth',f,null,i===3?0.7:0.2,0.07,null,t+d);osc('square',f/2,null,i===3?0.7:0.2,0.04,null,t+d);});noise('lowpass',300,null,1,0.4,0.12,null,t+0.54);},
  bossHorn(){if(!ac||muted)return;const t=ac.currentTime;[[110,0],[104,0.5]].forEach(([f,d])=>{osc('sawtooth',f,f*0.97,0.6,0.16,null,t+d);osc('sawtooth',f*1.5,f*1.45,0.6,0.08,null,t+d);});osc('sine',55,30,1.4,0.5,null,t);noise('lowpass',400,80,1,1.2,0.3,null,t);},
  lifeLost(){if(!ok('lifeLost',0.12))return;const t=ac.currentTime;osc('square',330,220,0.16,0.09,null,t);osc('square',247,165,0.24,0.09,null,t+0.13);osc('sine',90,40,0.3,0.4,null,t);},
  forge(){if(!ac||muted)return;const t=ac.currentTime;noise('bandpass',300,3000,1.5,0.5,0.14,null,t);[523,659,784,1047,1319,1568].forEach((f,i)=>osc('triangle',f,null,0.6,0.07,null,t+0.4+i*0.07));osc('sine',65,40,0.8,0.5,null,t+0.4);noise('highpass',6000,null,1,0.8,0.05,null,t+0.5);},
  merge(){if(!ac||muted)return;const t=ac.currentTime;noise('bandpass',500,2400,1.5,0.35,0.12,null,t);[659,988,1319].forEach((f,i)=>osc('sine',f,null,0.4,0.08,null,t+0.38+i*0.06));osc('sine',120,50,0.3,0.3,null,t+0.38);},
  charge(){if(!ok('charge',0.09))return;const t=ac.currentTime;osc('sine',rnd(380,460),rnd(900,1100),0.22,0.035,null,t,0.12);noise('bandpass',800,2600,4,0.22,0.025,null,t,0.12);},
  tap(){if(!ok('tap',0.03))return;osc('sine',880,660,0.05,0.07);}
});
function setMuted(m){muted=m;localStorage.setItem('hc_mute',m?'1':'0');if(master)master.gain.setTargetAtTime(m?0:0.9,ac.currentTime,0.05);}
window.SFX={init,S,startMusic,setTrack,setMuted,setVol,get vol(){return vol;},get muted(){return muted;}};
['pointerdown','keydown','touchstart'].forEach(e=>addEventListener(e,init,{passive:true}));
})();

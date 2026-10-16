// Persistent meta progression (localStorage): gold, unlocks, upgrades, codex, best stage, daily challenge.
(function(){
const KEY='hc_meta';
const DEF={gold:0,best:0,runs:0,heroes:['knight'],unlocked:[],up:{},codex:{},daily:{},bestStreak:0,totalKills:0};
let M;try{M=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(_){M=Object.assign({},DEF);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(M));}catch(_){}}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function seedOf(str){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function spend(n){if(M.gold<n)return false;M.gold-=n;save();return true;}
window.Meta={M,save,today,seedOf,mulberry,spend};
})();

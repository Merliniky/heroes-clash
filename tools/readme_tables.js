// regenerate README creature tables from units.js (D): node tools/readme_tables.js
const fs=require('fs'),U=require('../units.js');const f=__dirname+'/../README.md';let R=fs.readFileSync(f,'utf8');
const fmt=v=>Array.isArray(v)?'['+v.join(',')+']':typeof v==='object'?'{'+Object.entries(v).map(([k,x])=>k+':'+x).join(',')+'}':v;
const abs=ab=>Object.entries(ab||{}).map(([k,v])=>v===1||v===true?k:k+':'+fmt(v)).join(', ');
R=R.replace(/(### \S+ \((\w+)\)\n\n\| 单位[^\n]*\n\|---[^\n]*\n)((?:\|[^\n]*\n)+)/g,(m,head,fac)=>{
  const rows=Object.values(U.D).filter(u=>u.fac===fac).sort((a,b)=>a.lvl-b.lvl||(a.up?1:0)-(b.up?1:0));if(!rows.length)return m;
  return head+rows.map(u=>`| ${u.n} | ${u.h3} | ${u.lvl}${u.up?'+':''} | ${u.a} | ${u.d} | ${u.dmg[0]}-${u.dmg[1]} | ${u.hp} | ${u.spd} | ${u.shots||'–'} | ${u.g} | ${u.cost}${u.rare?' +'+u.rare+'💎':''} | ${[abs(u.ab),u.fly?'fly':''].filter(Boolean).join(', ')} | ${(u.notes||[]).join('、')} |`).join('\n')+'\n';});
fs.writeFileSync(f,R);

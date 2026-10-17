// lists every unit the game can spawn and whether it has a sprite atlas (own or alias): node tools/audit_sprites.js
const fs=require('fs'),H=require('../hero.js'),M=require('../models.js');
const g=fs.readFileSync(__dirname+'/../game3d.js','utf8');
const SU=eval(g.match(/const SPR_UNITS=(\[[^\]]*\])/)[1]),SA=eval('('+g.match(/const SPR_ALIAS=(\{.*?\});/s)[1]+')');
const all=new Set();for(const f in H.FAC)for(const b of H.FAC[f].lines){all.add(b);if(M.UPG[b])all.add(M.UPG[b]);}
for(const B of H.BOSSES){all.add(B.type);if(B.summon)all.add(B.summon);}for(const k in H.THEMES)for(const t of H.THEMES[k].pool||[]){all.add(t);if(M.UPG[t])all.add(M.UPG[t]);}
for(const h of H.HEROES)all.add(h.starter);all.add('skeleton');all.add('skeletonWarrior');
const own=[],ali=[],miss=[];for(const t of all){if(SU.includes(t))own.push(t);else if(SA[t]&&SU.includes(SA[t][0]))ali.push(t+'→'+SA[t][0]);else miss.push(t);}
console.log('spawnable',all.size,'| own atlas',own.length,'| tinted alias',ali.length,'| MISSING',miss.length,miss.join(' '));
const noMD=[...all].filter(t=>!M.M[t]);console.log('no 3D fallback:',noMD.length,noMD.join(' '));

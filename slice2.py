# Slices the faction sheets (equal grids, grey background, some empty cells) into assets/c/<id>.png
from PIL import Image, ImageFilter
import numpy as np, json
from scipy import ndimage
S='/workspace/sheets/'
N=None
sheets={
 'castle':(4,2,['halberdier','marksman','royalGriffin','crusader','zealot','champion','archangel',N]),
 'rampart':(4,4,['centaurCaptain','dwarf','battleDwarf','woodElf','grandElf','pegasus','silverPegasus','dendroidGuard','dendroidSoldier','unicorn','warUnicorn','greenDragon','goldDragon','centaur',N,N]),
 'tower':(4,4,['gremlin','masterGremlin','stoneGargoyle','obsidianGargoyle','stoneGolem','ironGolem','mage','archMage','genie','masterGenie','naga','nagaQueen','giant','titan',N,N]),
 'inferno':(4,4,['imp','familiar','gog','magog','hellHound','cerberus','demon','hornedDemon','pitFiend','pitLord','efreet','efreetSultan','devil','archDevil',N,N]),
 'necro':(4,4,['skeletonOld','walkingDead','wight','wraith','vampire','vampireLord','lich','powerLich','blackKnight','dreadKnight','boneDragon','ghostDragon','skeleton','skeletonWarrior','zombie',N]),
 'dungeon':(4,4,['troglodyte','infernalTroglodyte',N,N,'beholder','evilEye','medusa','medusaQueen','minotaur','minotaurKing','manticore','scorpicore','redDragon','blackDragon',N,N]),
 'stronghold':(4,4,['goblin','hobgoblin','wolfRider','wolfRaider','orc','orcChieftain','ogre','ogreMage','roc','thunderbird','cyclops','cyclopsKing','behemoth','ancientBehemoth',N,N]),
 'fortress':(4,4,['gnoll','gnollMarauder','lizardman','lizardWarrior','serpentFly','dragonFly',N,'greaterBasilisk','gorgon','mightyGorgon','wyvern','wyvernMonarch','hydra','chaosHydra',N,N]),
 'extra':(4,2,['harpy','harpyHag','basilisk','peasant','boar','nomad','rogue','troll']),
}
man={}
for sh,(C,Rr,names) in sheets.items():
  full=np.asarray(Image.open(S+sh+'.jpg').convert('RGB')).astype(int);H,W,_=full.shape
  for i,nm in enumerate(names):
    if not nm:continue
    cx,cy=i%C,i//C;x0,x1=int(cx*W/C)+5,int((cx+1)*W/C)-5;y0,y1=int(cy*H/Rr)+5,int((cy+1)*H/Rr)-5
    im=full[y0:y1,x0:x1];h,w,_=im.shape
    bord=np.concatenate([im[:4].reshape(-1,3),im[-4:].reshape(-1,3),im[:,:4].reshape(-1,3),im[:,-4:].reshape(-1,3)])
    bg=np.median(bord,0);d=np.sqrt(((im-bg)**2).sum(2));sat=im.max(2)-im.min(2);val=im.mean(2);bgv=bg.mean()
    mu=ndimage.uniform_filter(val,7);sd=np.sqrt(np.maximum(ndimage.uniform_filter(val*val,7)-mu*mu,0))
    rel=np.arange(h)[:,None]/h*np.ones((1,w))
    shadowish=((sat<22)&(val<bgv+2)&(val>bgv-110)&(sd<9))|((d<55)&(sat<22))
    fg=((d>26)|(sat>38))&~(shadowish&(rel>0.55))
    fg=ndimage.binary_opening(fg,iterations=1);fc=ndimage.binary_closing(fg,iterations=2)
    holes=ndimage.binary_fill_holes(fc)&~fc;hl,hn=ndimage.label(holes);hs=ndimage.sum(holes,hl,range(1,hn+1))
    fg=fc|np.isin(hl,[k+1 for k,v in enumerate(hs) if v<250])
    lab,n=ndimage.label(fg);sz=ndimage.sum(fg,lab,range(1,n+1))
    if n==0:print('EMPTY',nm);continue
    big=sz.max();edge=set(np.unique(np.concatenate([lab[:3].ravel(),lab[-3:].ravel(),lab[:,:3].ravel(),lab[:,-3:].ravel()])))
    keep=[k+1 for k,v in enumerate(sz) if v>max(120,big*0.02) and (k+1 not in edge or v>big*0.3)]
    m=np.isin(lab,keep)
    alpha=np.clip((d-16)/28,0,1)*255;alpha=np.where(m,np.maximum(alpha,np.where(ndimage.binary_erosion(m,iterations=2),255,0)),0)
    alpha=np.where(shadowish&(rel>0.55)&~ndimage.binary_erosion(m,iterations=4),0,alpha)
    alpha=np.where(d<16,0,alpha);alpha=ndimage.grey_opening(alpha,size=(3,3))
    ys,xs=np.where(alpha>40);a0,a1,b0,b1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    band=np.zeros_like(alpha,bool);hh=a1-a0;band[a1-int(hh*0.1):a1,b0:b1]=True
    alpha=np.where(band&(sat<26)&(val>bgv-70)&~ndimage.binary_erosion(m,iterations=5),0,alpha)
    ys,xs=np.where(alpha>40);a0,a1,b0,b1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    rgba=np.dstack([im,alpha]).astype(np.uint8)[a0:a1,b0:b1]
    img=Image.fromarray(rgba,'RGBA');img.putalpha(img.split()[3].filter(ImageFilter.GaussianBlur(0.6)))
    img.save('assets/c/%s.png'%nm);man[nm]=[int(b1-b0),int(a1-a0)]
json.dump(man,open('assets/c/manifest.json','w'));print(len(man))

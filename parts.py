# Split each sprite into body + weapon/arm (or jaw/claw) layer with a shoulder pivot.
# Polygons are normalised (u,v) in the sprite's native facing; the hole left in the body is
# diffusion-inpainted so the body still looks whole when the weapon swings away.
from PIL import Image, ImageDraw
import numpy as np, json
from scipy import ndimage
R={
 'p_pikeman':  dict(poly=[(.66,.33),(.93,0),(1,0),(1,.06),(.86,.42),(.62,.9),(.55,.9),(.63,.6),(.7,.45)],piv=(.7,.38),tip=(.98,.02),anim='spear',a=.85,th=.32),
 'p_crossbowman':dict(poly=[(.35,.22),(.8,.2),(1,.32),(1,.42),(.55,.47),(.35,.45)],piv=(.38,.35),tip=(1,.36),anim='recoil'),
 'p_griffin':  dict(poly=[(.55,.6),(.73,.58),(.77,.99),(.55,.99)],piv=(.63,.6),tip=(.68,.97),anim='swipe',a=-1.2,b=.3),
 'p_swordsman':dict(poly=[(.08,.38),(.28,.38),(.27,.55),(.25,.61),(.95,.9),(.93,.97),(.2,.69),(.04,.66)],piv=(.2,.42),tip=(.93,.93),anim='swing',a=-2.1,b=.35),
 'p_monk':     dict(poly=[(0,0),(.24,0),(.26,.37),(.3,.47),(.25,1),(0,1)],piv=(.2,.42),tip=(.12,.06),anim='raise'),
 'p_cavalier': dict(poly=[(.24,.4),(.9,.02),(.98,.04),(.38,.45),(.27,.5)],piv=(.33,.38),tip=(.96,.04),anim='spear',a=.38,th=.25),
 'p_centaur':  dict(poly=[(.62,.2),(.8,0),(1,0),(1,.62),(.82,.62),(.62,.32)],piv=(.62,.27),tip=(.97,.28),anim='bow',bowTop=(.86,.02),bowBot=(.82,.6),hand=(.32,.27)),
 'p_angel':    dict(poly=[(.33,.34),(.44,.34),(.43,.48),(1,.72),(1,1),(.84,1),(.26,.68),(.18,.56),(.28,.46)],piv=(.3,.53),tip=(.97,.9),anim='swing',a=-2.0,b=.35,key='flame'),
 'e_skeleton': dict(poly=[(.36,.52),(.48,.56),(.44,.7),(.05,.92),(0,.85),(.3,.66)],piv=(.42,.53),tip=(.02,.88),anim='swing',a=-2.0,b=.35),
 'e_zombie':   dict(poly=[(0,.35),(.27,.28),(.33,.42),(.25,.85),(0,.85)],piv=(.25,.33),tip=(.08,.78),anim='swipe',a=-1.5,b=.45),
 'e_goblin':   dict(poly=[(0,0),(.14,0),(.27,.5),(.38,1),(.2,1),(.12,.62),(0,.4)],piv=(.18,.55),tip=(.06,.02),anim='spear',a=1.15,th=.3),
 'e_orc':      dict(poly=[(0,.26),(.3,.28),(.4,.42),(.52,.38),(.55,.55),(.48,.7),(.35,.68),(0,.68)],piv=(.5,.4),tip=(.12,.4),anim='swing',a=-1.9,b=.5),
 'e_wolfrider':dict(poly=[(.04,0),(.14,0),(.44,.24),(.44,.34),(.34,.34)],piv=(.4,.3),tip=(.08,.02),anim='spear',a=.8,th=.28),
 'e_imp':      dict(poly=[(0,.45),(.28,.42),(.32,.58),(.2,.82),(0,.82)],piv=(.26,.46),tip=(.06,.75),anim='raise'),
 'e_lich':     dict(poly=[(.03,0),(.22,0),(.22,.3),(.24,.5),(.32,.98),(.24,1),(.12,.6),(.08,.3)],piv=(.17,.55),tip=(.12,.07),anim='raise'),
 'e_dragon':   dict(poly=[(0,.48),(.2,.47),(.24,.52),(.2,.6),(.05,.6)],piv=(.21,.5),tip=(.03,.5),anim='jaw',a=.95),
}
out={}
for n,c in R.items():
  im=Image.open(f'assets/{n}.png').convert('RGBA');w,h=im.size;a=np.asarray(im).astype(float)
  m=Image.new('L',(w,h),0);ImageDraw.Draw(m).polygon([(u*w,v*h) for u,v in c['poly']],fill=255)
  m=np.asarray(m)>0
  if c.get('key')=='flame':
    r,g,bb=a[...,0],a[...,1],a[...,2]
    km=(r>170)&(g>90)&(r-bb>45)|((r>225)&(g>205)&(bb>150))
    km=ndimage.binary_dilation(km,iterations=2)
    m=m&km
  alpha=a[...,3]
  wpn=a.copy();wpn[...,3]=np.where(m,alpha,0)
  body=a.copy();body[...,3]=np.where(m,0,alpha)
  # inpaint: fill masked pixels that lie inside the closed body silhouette
  bm=body[...,3]>100
  def span(b,ax):
    f=np.maximum.accumulate(b,axis=ax);r=np.flip(np.maximum.accumulate(np.flip(b,ax),axis=ax),ax);return f&r
  sil=span(bm,0)&span(bm,1)
  fill=m&sil&(alpha>0)
  known=(body[...,3]>200)
  rgb=body[...,:3].copy();cur=known.copy()
  for it in range(200):
    if not (fill&~cur).any():break
    acc=np.zeros_like(rgb);cnt=np.zeros(cur.shape)
    for dy,dx in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)]:
      sh=np.roll(np.roll(cur,dy,0),dx,1);acc+=np.roll(np.roll(rgb,dy,0),dx,1)*sh[...,None];cnt+=sh
    new=fill&~cur&(cnt>0);rgb[new]=acc[new]/cnt[new][:,None];cur|=new
  for it in range(400):
    sm=ndimage.uniform_filter(rgb,size=(3,3,1));rgb=np.where(fill[...,None],sm,rgb)
  # restore known pixels exactly
  rgb=np.where(fill[...,None],rgb,body[...,:3])
  body[...,:3]=np.where(fill[...,None],rgb,body[...,:3]);body[...,3]=np.where(fill,255*0.97,body[...,3])
  lab,nn=ndimage.label(body[...,3]>30);
  if nn>1:
    sz=ndimage.sum(np.ones_like(lab),lab,range(1,nn+1));keep=[i+1 for i,v in enumerate(sz) if v>=0.04*sz.max()]
    body[...,3]=np.where(np.isin(lab,keep)|(lab==0),body[...,3],0)
  Image.fromarray(body.clip(0,255).astype(np.uint8)).save(f'assets/{n}_body.png')
  Image.fromarray(wpn.clip(0,255).astype(np.uint8)).save(f'assets/{n}_wpn.png')
  d={k:v for k,v in c.items() if k not in('poly','key')};d['w']=w;d['h']=h;out[n[2:]]=d
json.dump(out,open('assets/rig.json','w'),indent=1)
print('ok')

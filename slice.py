from PIL import Image, ImageFilter
import numpy as np, json
from scipy import ndimage
A='/home/box/agent-data/agents/ed9789c5-69ca-44ea-8c83-501562bb4e9e/assets/'
sheets={'p':('5597d480b987d20659deba8a09c4e2b38ace145bd7a45d9ff3747de393a08008.jpg',['pikeman','crossbowman','griffin','swordsman','monk','cavalier','centaur','angel']),
 'e':('ae8b879d32b74a7ca07465df0743caa0723cefc25f566b4b3f3bd7656ee3efc2.jpg',['skeleton','zombie','goblin','orc','wolfrider','imp','lich','dragon'])}
man={}
for k,(f,names) in sheets.items():
  im=np.asarray(Image.open(A+f).convert('RGB')).astype(int)
  H,W,_=im.shape
  bg=np.median(np.concatenate([im[:8].reshape(-1,3),im[-8:].reshape(-1,3)]),0)
  d=np.sqrt(((im-bg)**2).sum(2)); sat=im.max(2)-im.min(2)
  fg=(d>28)|(sat>40)
  fg=ndimage.binary_opening(fg,iterations=1); fg=ndimage.binary_fill_holes(ndimage.binary_closing(fg,iterations=2))
  lab,n=ndimage.label(fg); sizes=ndimage.sum(fg,lab,range(1,n+1))
  cells={}
  for i,s in enumerate(sizes,1):
    if s<150: continue
    ys,xs=np.where(lab==i); c=min(int(xs.mean()/(W/4)),3)+4*min(int(ys.mean()/(H/2)),1)
    cells.setdefault(c,[]).append(i)
  for c,ids in cells.items():
    m=np.isin(lab,ids)
    alpha=np.clip((d-18)/30,0,1)*255; alpha=np.where(m,np.maximum(alpha,np.where(ndimage.binary_erosion(m,iterations=2),255,0)),0)
    ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    rgba=np.dstack([im,alpha]).astype(np.uint8)[y0:y1,x0:x1]
    img=Image.fromarray(rgba,'RGBA'); a=img.split()[3].filter(ImageFilter.GaussianBlur(0.7)); img.putalpha(a)
    nm=k+'_'+names[c]; img.save('assets/%s.png'%nm); man[nm]={'w':int(x1-x0),'h':int(y1-y0)}
Image.open(A+'784fb648d2fe64ce5b93e9c7bfb7c86749ba8146dbf946f90bf566eff884e3a0.jpg').convert('RGB').save('assets/arena.jpg',quality=88)
json.dump(man,open('assets/manifest.json','w'),indent=1); print(man)

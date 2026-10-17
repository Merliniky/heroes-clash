# tint a base texture to a target colour keeping its shading detail: python3 tint.py src out RRGGBB [contrast]
import sys
from PIL import Image,ImageOps
import numpy as np
src,out,hexc=sys.argv[1:4];k=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
im=Image.open(src).convert('RGBA');a=np.asarray(im).astype(np.float32)/255
L=(0.3*a[...,0]+0.59*a[...,1]+0.11*a[...,2]);m=np.median(L[a[...,3]>0.5]) if (a[...,3]>0.5).any() else L.mean()
L=np.clip(1+(L/max(m,1e-3)-1)*k,0,2.2)
c=np.array([int(hexc[i:i+2],16)/255 for i in (0,2,4)],np.float32)
o=np.clip(L[...,None]*c[None,None,:],0,1)
Image.fromarray((np.dstack([o,a[...,3:4]])*255).astype(np.uint8)).save(out);print(out,round(float(m),3))

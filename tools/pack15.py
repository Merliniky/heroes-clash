import json,os,sys,math
from PIL import Image,ImageFilter
FPS={'idle':8,'walk':10,'attack':14,'hit':12,'death':12}
ORDER=['idle','walk','attack','hit','death']
JOB=json.load(open('/workspace/spr/job15.json'))
out='/workspace/heroes-clash/assets/spr';os.makedirs(out,exist_ok=True)
import numpy as np
def post(c,hd,J,anc=None):
    a=np.asarray(c).astype(np.float32);al=a[...,3]/255;rgb=a[...,:3]
    lum=(rgb[...,0]*0.3+rgb[...,1]*0.59+rgb[...,2]*0.11)/255
    body=al>0.55
    # shadow-catcher pixels are black with partial alpha: remove the faint world-AO haze, cap darkness
    sh=(~body)&(lum<0.12)
    sa=np.clip((al-0.03)/0.17,0,1)**0.85*0.55*J.get('shk',1.0)
    if anc:
        yy,xx=np.mgrid[0:al.shape[0],0:al.shape[1]];dd=np.hypot((xx-anc[0])*0.8,(yy-anc[1])*1.25)/anc[2]
        sa=sa*np.clip(1.3-dd/0.75,0,1)
    al=np.where(sh,sa,al)
    # 1px dark outline around the opaque silhouette (external contour only)
    if not J.get('nooutline'):
        from PIL import ImageFilter as F
        mk=Image.fromarray((body*255).astype(np.uint8)).filter(F.MaxFilter(3));ol=(np.asarray(mk)>0)&(~body)
        col=np.array(J.get('olcol',[38,26,20]),np.float32)
        k=np.where(ol,0.85,0)[...,None]
        rgb=rgb*(1-k)+col*k;al=np.where(ol,np.maximum(al,0.85),al)
    out=np.dstack([rgb,al*255]).clip(0,255).astype(np.uint8)
    return Image.fromarray(out,'RGBA')
PAGE=2048
for u in sys.argv[1:]:
    d=f'/workspace/spr/out/{u}';m=json.load(open(d+'/meta.json'));J=JOB[u];ND=len(m['dirs'])
    S=min(1.0,J.get('pack',0.5)/(JOB.get('_ppu',192)/256))
    r=m['res'];AX=r/2;AY=r/2+m['H']*0.5*math.cos(math.radians(m['elev']))*r/m['ext']
    items=[];head=0
    for di in range(ND):
        for k in ORDER:
            for i in range(m['anims'][k]):
                im=Image.open(f'{d}/d{di}_{k}_{i:02d}.png').convert('RGBA')
                nw,nh=round(im.width*S),round(im.height*S)
                c=post(im.convert('RGBa').resize((nw,nh),Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.0,55,3)).convert('RGBA'),m.get('hd'),J,(AX*S,AY*S,m['H']*r/m['ext']*S))
                bb=c.getchannel('A').point(lambda v:255 if v>3 else 0).getbbox() or (0,0,1,1)
                bb=(max(0,bb[0]-1),max(0,bb[1]-1),min(nw,bb[2]+1),min(nh,bb[3]+1))
                fr=c.crop(bb);items.append(dict(di=di,k=k,i=i,im=fr,ax=AX*S-bb[0],ay=AY*S-bb[1]))
                if k=='idle' and i==0:
                    ib=c.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
                    if ib:head=max(head,AY*S-ib[1])
    # shelf packing, tallest first, into PAGE x PAGE pages
    order=sorted(range(len(items)),key=lambda j:-items[j]['im'].height)
    pages=[];x=y=sh=0;pg=0;rects={}
    for j in order:
        w,h=items[j]['im'].size
        if x+w>PAGE:x=0;y+=sh+1;sh=0
        if y+h>PAGE:pg+=1;x=y=sh=0
        rects[j]=(pg,x,y,w,h);x+=w+1;sh=max(sh,h)
    npg=pg+1;used_h=[0]*npg
    for j,(p,x,y,w,h) in rects.items():used_h[p]=max(used_h[p],y+h)
    imgs=[Image.new('RGBA',(PAGE,(used_h[p]+3)//4*4),(0,0,0,0)) for p in range(npg)]
    for j,(p,x,y,w,h) in rects.items():imgs[p].paste(items[j]['im'],(x,y))
    tot=0;sizes=[]
    for p,im in enumerate(imgs):
        fn=f'{out}/{u}_p{p}.webp';im.save(fn,quality=J.get('q',84),method=6);tot+=os.path.getsize(fn);sizes.append(im.size)
    imgs[0].save(f'/workspace/spr/{u}_atlas.png')
    frames=[[[None]*m['anims'][k] for k in ORDER] for di in range(ND)]
    for j,it in enumerate(items):
        p,x,y,w,h=rects[j];frames[it['di']][ORDER.index(it['k'])][it['i']]=[p,x,y,w,h,round(it['ax'],1),round(it['ay'],1)]
    anims={k:{'row':ri,'n':m['anims'][k],'fps':FPS[k],'loop':k in('idle','walk')} for ri,k in enumerate(ORDER)}
    ppu=r/m['ext']*S
    meta={'v':15,'pages':sizes,'ppu':round(ppu,2),'head':round(head,1),'dirs':m['dirs'],'anims':anims,'frames':frames,'renderSecs':m['secs'],'hd':bool(m.get('hd')),'shadow':not J.get('noshadow')}
    json.dump(meta,open(f'{out}/{u}.json','w'),separators=(',',':'))
    print(u,'pages',sizes,tot//1024,'KB','gpuMB',round(sum(a*b for a,b in sizes)*4/1e6,1),m['secs'],'s')

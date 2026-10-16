import json,os,sys
from PIL import Image
FPS={'idle':8,'walk':10,'attack':14,'hit':14,'death':12}
ORDER=['idle','walk','attack','hit','death']
out='/workspace/heroes-clash/assets/spr';os.makedirs(out,exist_ok=True)
for u in sys.argv[1:]:
    d=f'/workspace/spr/out/{u}';m=json.load(open(d+'/meta.json'))
    fr={k:[Image.open(f'{d}/{k}_{i:02d}.png').convert('RGBA') for i in range(m['anims'][k])] for k in ORDER}
    bb=None
    for L in fr.values():
        for im in L:
            b=im.getchannel('A').point(lambda a:255 if a>6 else 0).getbbox()
            if b:bb=b if bb is None else (min(bb[0],b[0]),min(bb[1],b[1]),max(bb[2],b[2]),max(bb[3],b[3]))
    import math
    r=m['res'];ax=r/2;ay=r/2+m['H']*0.5*math.cos(math.radians(m['elev']))*r/m['ext'];pad=4
    x0=int(min(bb[0],ax))-pad;y0=bb[1]-pad;x1=int(max(bb[2],ax))+pad;y1=int(ay)+6
    S=0.5;fw=round((x1-x0)*S);fh=round((y1-y0)*S)
    cols=max(len(L) for L in fr.values());rows=len(ORDER)
    A=Image.new('RGBA',(cols*fw,rows*fh),(0,0,0,0));anims={}
    for r,k in enumerate(ORDER):
        for i,im in enumerate(fr[k]):
            c=im.crop((x0,y0,x1,y1)).resize((fw,fh),Image.LANCZOS);A.paste(c,(i*fw,r*fh))
        anims[k]={'row':r,'n':len(fr[k]),'fps':FPS[k],'loop':k in('idle','walk')}
    A.save(f'{out}/{u}.webp',quality=88,method=6);A.save(f'/workspace/spr/{u}_atlas.png')
    ib=fr['idle'][0].getchannel('A').point(lambda a:255 if a>6 else 0).getbbox();ppu=(ib[3]-ib[1])*S/m['H']
    meta={'fw':fw,'fh':fh,'cols':cols,'rows':rows,'ax':round((ax-x0)*S,1),'ay':round((ay-y0)*S,1),'ppu':round(ppu,2),'anims':anims,'renderSecs':m['secs']}
    json.dump(meta,open(f'{out}/{u}.json','w'))
    print(u,A.size,os.path.getsize(f'{out}/{u}.webp')//1024,'KB',meta['renderSecs'],'s')

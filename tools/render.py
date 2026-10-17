# Blender headless sprite renderer: blender -b -P render.py -- job.json unitId
import bpy,sys,json,math,os,mathutils,time
argv=sys.argv[sys.argv.index('--')+1:];JOB=json.load(open(argv[0]));UID=argv[1];J=JOB[UID]
M='/workspace/heroes-clash/assets/models/';RAW='/workspace/models_raw/'
PV=os.environ.get('PV');OUT=f'/workspace/spr/{"pv" if PV else "out"}/{UID}';os.makedirs(OUT,exist_ok=True)
PPU=JOB.get('_ppu',256)  # render px per game world unit (2x supersampled)
t0=time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def imp(path):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=path);return [o for o in bpy.data.objects if o not in before]
objs=imp(J['f'] if J['f'].startswith('/') else M+J['f']+'.glb')
for _o in [o for o in objs if o.name.startswith('Icosphere')]:
    objs.remove(_o);bpy.data.objects.remove(_o)
arm=[o for o in objs if o.type=='ARMATURE'][0]
show=set(J.get('show',[]));hideable=set(JOB['_kkw'])|set(J.get('hide',[]))
for o in objs:
    if o.type=='MESH' and o.name.split('.')[0] in hideable and o.name.split('.')[0] not in show:
        o.hide_render=True;o.hide_viewport=True
# tint (multiply base colour)
def tint_mats(objs,col):
    for o in objs:
        if o.type!='MESH':continue
        for s in o.material_slots:
            m=s.material
            if not m or m.get('_t'):continue
            m['_t']=1;nt=m.node_tree;b=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'];
            if not b:continue
            b=b[0];inp=b.inputs['Base Color']
            mix=nt.nodes.new('ShaderNodeMix');mix.data_type='RGBA';mix.blend_type='MULTIPLY';mix.inputs['Factor'].default_value=1
            mix.inputs[7].default_value=(*col,1)
            if inp.links:src=inp.links[0].from_socket;nt.links.new(src,mix.inputs[6])
            else:mix.inputs[6].default_value=inp.default_value[:]
            nt.links.new(mix.outputs[2],inp)
for m in bpy.data.materials:
    rc=J.get('recolor',{}).get(m.name.split('.')[0])
    if rc is not None and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':n.inputs['Base Color'].default_value=(*[(((rc>>s)&255)/255)**2.2 for s in (16,8,0)],1);n.inputs['Roughness'].default_value=J.get('rough',0.7)
if J.get('matte') is not None:
    for m in bpy.data.materials:
        if not m.node_tree:continue
        for n in m.node_tree.nodes:
            if n.type=='BSDF_PRINCIPLED':
                n.inputs['Roughness'].default_value=J['matte']
                if 'Specular IOR Level' in n.inputs:n.inputs['Specular IOR Level'].default_value=0.3
if J.get('bump'):
    for m in bpy.data.materials:
        if not m.node_tree:continue
        nt=m.node_tree;bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED']
        if not bs or bs[0].inputs['Normal'].links:continue
        v=nt.nodes.new('ShaderNodeTexVoronoi');v.inputs['Scale'].default_value=J['bump'][0];v.feature='DISTANCE_TO_EDGE'
        bp=nt.nodes.new('ShaderNodeBump');bp.inputs['Strength'].default_value=J['bump'][1];bp.inputs['Distance'].default_value=0.02
        nt.links.new(v.outputs['Distance'],bp.inputs['Height']);nt.links.new(bp.outputs['Normal'],bs[0].inputs['Normal'])
        if J.get('rough') is not None:bs[0].inputs['Roughness'].default_value=J['rough']
        if 'Specular IOR Level' in bs[0].inputs:bs[0].inputs['Specular IOR Level'].default_value=J.get('spec',0.5)
if J.get('desat'):
    for m in bpy.data.materials:
        if not m.node_tree:continue
        nt=m.node_tree;bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED']
        if not bs:continue
        inp=bs[0].inputs['Base Color']
        if not inp.links:continue
        hs=nt.nodes.new('ShaderNodeHueSaturation');hs.inputs['Saturation'].default_value=J['desat'][0];hs.inputs['Value'].default_value=J['desat'][1]
        nt.links.new(inp.links[0].from_socket,hs.inputs['Color']);nt.links.new(hs.outputs[0],inp)
if J.get('tint'):
    c=J['tint'];tint_mats(objs,tuple((((c>>s)&255)/255)**2.2 for s in (16,8,0)))
class _A(dict):
    def __getitem__(s,k):
        for a in bpy.data.actions:
            if a.name==k:return a
        c=[a for a in bpy.data.actions if a.name.startswith(k+'_')];c.sort(key=lambda a:len(a.name));return c[0]
acts=_A()
if not arm.animation_data:arm.animation_data_create()
for t in arm.animation_data.nla_tracks[:]:arm.animation_data.nla_tracks.remove(t)
def reset_pose(A):
    if J.get('noreset'):return
    for pb in A.pose.bones:
        pb.location=(0,0,0);pb.rotation_quaternion=(1,0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
    for b_,e_ in J.get('posefix',{}).items():
        if b_ in A.pose.bones and A==arm:A.pose.bones[b_].rotation_mode='QUATERNION';A.pose.bones[b_].rotation_quaternion=mathutils.Euler([math.radians(x) for x in e_]).to_quaternion()
def set_act(name,f):
    a=acts[name];reset_pose(arm);arm.animation_data.action=a;sc.frame_set(int(f));return a
# normalize height on idle pose
set_act(J['anims']['idle'],acts[J['anims']['idle']].frame_range[0])
if J.get('delv'):
    import bmesh
    for o in objs:
        if o.type!='MESH' or not o.vertex_groups:continue
        gi={g.index:g.name for g in o.vertex_groups};bm=bmesh.new();bm.from_mesh(o.data);dl=bm.verts.layers.deform.active
        if dl:
            kill=[v for v in bm.verts if v[dl] and gi[max(v[dl].items(),key=lambda x:x[1])[0]].startswith(tuple(J['delv']))]
            bmesh.ops.delete(bm,geom=kill,context='VERTS');bm.to_mesh(o.data)
        bm.free()
R_=J.get('rider')
if R_:
    ro=imp(R_['f'])
    for _o in [o for o in ro if o.name.startswith('Icosphere')]:ro.remove(_o);bpy.data.objects.remove(_o)
    for o in ro:
        if o.type=='MESH' and o.name.split('.')[0] in hideable and o.name.split('.')[0] not in show:o.hide_render=True
    arm2=[o for o in ro if o.type=='ARMATURE'][0]
    if not arm2.animation_data:arm2.animation_data_create()
    for t in arm2.animation_data.nla_tracks[:]:arm2.animation_data.nla_tracks.remove(t)
    a2=[a for a in bpy.data.actions if a.name.startswith(R_['act'])];a2.sort(key=lambda a:len(a.name));arm2.animation_data.action=a2[0]
    sc.frame_set(int(a2[0].frame_range[0]));bpy.context.view_layer.update()
    for b_,k_ in R_.get('legk',{}).items():
        pb=arm2.pose.bones[b_];q=pb.rotation_quaternion.copy()
        for fc in a2[0].fcurves:
            if fc.data_path.startswith(f'pose.bones["{b_}"]'):fc.mute=True
        e_=R_.get('legrot',{}).get(b_)
        q2=mathutils.Quaternion().slerp(q,k_)
        if e_:q2=q2@mathutils.Euler([math.radians(x) for x in e_]).to_quaternion()
        pb.rotation_mode='QUATERNION';pb.rotation_quaternion=q2
    r2=[o for o in ro if o.parent is None]
    for o in r2:o.scale*=R_['s'];o.location*=R_['s']
    bpy.context.view_layer.update()
    pv=arm2.matrix_world@arm2.pose.bones['pelvis'].head
    tg=arm.matrix_world@arm.pose.bones[R_['bone']].head+mathutils.Vector(R_.get('off',(0,0,0)))
    for o in r2:o.location+=tg-pv
    bpy.context.view_layer.update()
    for o in r2:
        mw=o.matrix_world.copy();o.parent=arm;o.parent_type='BONE';o.parent_bone=R_['bone'];bpy.context.view_layer.update();o.matrix_world=mw
    bpy.context.view_layer.update()
    objs+=ro
dg=bpy.context.evaluated_depsgraph_get()
def bbox(ex=()):
    lo=mathutils.Vector((1e9,)*3);hi=-lo
    dg=bpy.context.evaluated_depsgraph_get()
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render or o.name.split('.')[0] in ex or o.get('nob'):continue
        e=o.evaluated_get(dg)
        for v in e.bound_box:
            w=e.matrix_world@mathutils.Vector(v);lo=mathutils.Vector(map(min,lo,w));hi=mathutils.Vector(map(max,hi,w))
    return lo,hi
def _mat(col,rough=0.75,emit=0):
    m=bpy.data.materials.new('Add');m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*[c**2.2 for c in col],1);b.inputs['Roughness'].default_value=rough
    if 'Specular IOR Level' in b.inputs:b.inputs['Specular IOR Level'].default_value=0.3
    if emit:b.inputs['Emission Color'].default_value=(*[c**2.2 for c in col],1);b.inputs['Emission Strength'].default_value=emit
    return m
def _attach(o,A,bone):
    bpy.context.view_layer.update();mw=o.matrix_world.copy();o.parent=A;o.parent_type='BONE';o.parent_bone=bone;bpy.context.view_layer.update();o.matrix_world=mw
def _bonepos(A,bone):
    return A.matrix_world@A.pose.bones[bone].head
PF=J.get('posefix',{})
if PF:
    for a_ in bpy.data.actions:
        for fc in a_.fcurves:
            for b_ in PF:
                if fc.data_path.startswith(f'pose.bones["{b_}"].rotation'):fc.mute=True
    for b_,e_ in PF.items():
        pb=arm.pose.bones[b_];pb.rotation_mode='QUATERNION';pb.rotation_quaternion=mathutils.Euler([math.radians(x) for x in e_]).to_quaternion()
ADD=[]
AS_=J.get('adds',1)
if AS_=='auto' and J.get('addons'):
    _l,_h=bbox(set(J.get('wep',[])));AS_=(_h.z-_l.z)/1.8;print('ADDS',AS_)
for ad in J.get('addons',[]):
    A=arm2 if ad.get('rider') else arm
    base=_bonepos(A,ad['bone'])+mathutils.Vector(ad.get('loc',(0,0,0)))*AS_
    t=ad['t']
    if t=='sphere':bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1)
    elif t=='cone':bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=1,radius2=ad.get('r2',0),depth=2)
    elif t=='cyl':bpy.ops.mesh.primitive_cylinder_add(vertices=10,radius=1,depth=2)
    elif t=='torus':bpy.ops.mesh.primitive_torus_add(major_radius=1,minor_radius=ad.get('minor',0.12),major_segments=24,minor_segments=8)
    elif t=='cube':bpy.ops.mesh.primitive_cube_add(size=2)
    o=bpy.context.active_object;o.name=ad.get('n','Add');o.rotation_mode='XYZ'
    o.rotation_euler=[math.radians(a) for a in ad.get('rot',(0,0,0))];o.scale=[x*AS_ for x in ad.get('s',(0.1,0.1,0.1))];o.location=base
    if ad.get('smooth',1):bpy.ops.object.shade_smooth()
    o.data.materials.append(_mat(ad.get('col',(1,1,1)),ad.get('rough',0.75),ad.get('emit',0)))
    if ad.get('nob'):o['nob']=1
    _attach(o,A,ad['bone']);objs.append(o);ADD.append(o)
WROOTS=[]
W_=J.get('wings')
if W_:
    A=arm2 if W_.get('rider') else arm
    wm=_mat(W_.get('col',(0.95,0.93,0.88)),0.8);wm2=_mat(W_.get('col2',W_.get('col',(0.95,0.93,0.88))),0.8)
    bh=_bonepos(A,W_['bone']);sp=W_.get('span',1.0);n=W_.get('n',8)
    for side in (1,-1):
        rootp=bh+mathutils.Vector((side*W_.get('side',0.06),W_.get('back',0.14),W_.get('up',0.05)))
        e=bpy.data.objects.new(f'WingRoot_{side}',None);sc.collection.objects.link(e);e.location=rootp;e['side']=side
        for i in range(n):
            t=i/(n-1);ang=math.radians(W_.get('a0',-15)+t*W_.get('fan',95));L=sp*(1.0-0.45*t)*(1-0.25*abs(t-0.35))
            d=mathutils.Vector((side*math.cos(ang),W_.get('sweep',0.35)+0.1*t,math.sin(ang))).normalized()
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1)
            f=bpy.context.active_object;f.name=f'Wing_{side}_{i}';f['nob']=1
            f.rotation_mode='QUATERNION';f.rotation_quaternion=mathutils.Vector((1,0,0)).rotation_difference(d)
            f.scale=(L/2,W_.get('w',0.11)*sp*(1-0.3*t),0.022*sp);f.location=rootp+d*(L/2)
            f.data.materials.append(wm if i%2==0 else wm2)
            bpy.context.view_layer.update();mw=f.matrix_world.copy();f.parent=e;bpy.context.view_layer.update();f.matrix_world=mw
            objs.append(f)
        _attach(e,A,W_['bone']);e.rotation_mode='XYZ';e['b0']=list(e.rotation_euler);WROOTS.append(e);objs.append(e)
def flap(key,i,n):
    if not WROOTS:return
    global MB
    cyc={'idle':1,'walk':2,'attack':1,'hit':1,'death':0}.get(key,1)
    amp=math.radians(W_.get('amp',28));ph=2*math.pi*cyc*i/max(1,n)
    a=amp*math.sin(ph)+math.radians(W_.get('a_off',0)) if key!='death' else math.radians(-35)*i/max(1,n-1)
    for e in WROOTS:
        R=mathutils.Matrix.Rotation(e['side']*a,4,'Y')
        e.matrix_basis=MB[e.name]@R
root=[o for o in objs if o.parent is None]
lo,hi=bbox();H=J['h']*1.55;k=H/(hi.z-lo.z)
for r in root:r.scale*=k;r.location*=k
if J.get('squash'):
    for r in root:r.scale=mathutils.Vector([a*b for a,b in zip(r.scale,J['squash'])])
bpy.context.view_layer.update()
WEP=set(J.get('wep',[]))|set(J.get('show',[]))
def foot_z():
    dg=bpy.context.evaluated_depsgraph_get();z=1e9
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render or o.name.split('.')[0] in WEP:continue
        e=o.evaluated_get(dg);me=e.to_mesh();mw=e.matrix_world
        for v in me.vertices:
            w=(mw@v.co).z
            if w<z:z=w
        e.to_mesh_clear()
    return z
fz=foot_z();print('FOOT',fz,'BBOXLO',bbox()[0].z)
# centre horizontally on the body (xy of idle bbox centre) and put soles on z=0
lo,hi=bbox(WEP);cx,cyy=(lo.x+hi.x)/2,(lo.y+hi.y)/2
if J.get('centerxy'):
    for r in root:r.location.x-=cx;r.location.y-=cyy
for r in root:r.location.z-=fz
bpy.context.view_layer.update()
M0={r.name:r.matrix_world.copy() for r in root}
def set_yaw(deg):
    R=mathutils.Matrix.Rotation(math.radians(deg),4,'Z')@mathutils.Matrix.Rotation(math.radians(-J.get('pitch',0)),4,'X')
    for r in root:r.matrix_world=R@M0[r.name]
    bpy.context.view_layer.update()
set_yaw(J.get('yaw',0))
# props on bones
for p in J.get('props',[]):
    po=imp(p['file']);ms=[o for o in po if o.type=='MESH']
    if J.get('tint') and p.get('tint',False):tint_mats(ms,(1,1,1))
    top=[o for o in po if o.parent is None]
    holder=bpy.data.objects.new('hold',None);sc.collection.objects.link(holder)
    for o in top:o.parent=holder
    bpy.context.view_layer.update()
    l2,h2=mathutils.Vector((1e9,)*3),mathutils.Vector((-1e9,)*3)
    for o in ms:
        for v in o.bound_box:
            w=o.matrix_world@mathutils.Vector(v);l2=mathutils.Vector(map(min,l2,w));h2=mathutils.Vector(map(max,h2,w))
    L=max(h2-l2);c=(l2+h2)/2
    for o in top:o.location-=c;
    if not p.get('keepOrigin'):
        pass
    holder.scale=(p['len']*H/L,)*3
    holder.parent=arm;holder.parent_type='BONE';holder.parent_bone=p['bone']
    # bone-parent places origin at bone tail; offset back to the bone head region
    bl=arm.data.bones[p['bone']].length
    holder.location=(0,-bl,0);holder.rotation_euler=tuple(p.get('rot',(0,0,0)))
    holder.scale=tuple(s/ (arm.matrix_world.to_scale()[0]) for s in holder.scale)
# camera: orthographic, ~40 deg elevation, unit faces screen-right
cam=bpy.data.cameras.new('cam');cam.type='ORTHO';co=bpy.data.objects.new('cam',cam);sc.collection.objects.link(co);sc.camera=co
EL=math.radians(JOB.get('_elev',55));ext=J.get('extent',1.0)*H*1.9+0.3
cy=H*0.5
co.location=(-10*math.cos(EL),0,cy+10*math.sin(EL));d=mathutils.Vector((0,0,cy))-co.location
co.rotation_euler=d.to_track_quat('-Z','Y').to_euler();cam.ortho_scale=ext
res=int(ext*PPU);sc.render.resolution_x=res;sc.render.resolution_y=res;sc.render.film_transparent=True
# lights: warm key, cool fill, rim
def light(n,t,e,rot,col,size=1):
    L=bpy.data.lights.new(n,t);L.energy=e;L.color=col
    if t=='SUN':L.angle=math.radians(size)
    o=bpy.data.objects.new(n,L);o.rotation_euler=[math.radians(a) for a in rot];sc.collection.objects.link(o)
light('key','SUN',J.get('key',3.4),(40,0,-90),(1,0.93,0.8),12)
light('side','SUN',0.9,(55,0,-20),(1,0.95,0.85),20);bpy.data.lights['side'].use_shadow=False
light('fill','SUN',1.3,(60,0,-150),(0.7,0.8,1.0),25);bpy.data.lights['fill'].use_shadow=False
light('rim','SUN',J.get('rim',3.0),(-35,0,80),(1,0.95,0.9),4);bpy.data.lights['rim'].use_shadow=False
if J.get('hd'):light('rim2','SUN',2.2,(-30,0,-20),(0.75,0.85,1.0),4);bpy.data.lights['rim2'].use_shadow=False
w=bpy.data.worlds.new('w');sc.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(0.55,0.6,0.7,1);w.node_tree.nodes['Background'].inputs[1].default_value=0.45
r=sc.render;r.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=JOB.get('_spp',24);sc.cycles.use_denoising=True;sc.cycles.max_bounces=4;r.use_persistent_data=True;sc.cycles.use_adaptive_sampling=True;sc.cycles.adaptive_threshold=0.02
sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=JOB.get('_exp',0.0)
r.use_freestyle=bool(J.get('freestyle',False));r.line_thickness_mode='ABSOLUTE';r.line_thickness=J.get('line',JOB.get('_line',2.0))*PPU/256
ls=sc.view_layers[0].freestyle_settings.linesets[0] if sc.view_layers[0].freestyle_settings.linesets else sc.view_layers[0].freestyle_settings.linesets.new('ls')
ls.select_by_visibility=True;ls.select_silhouette=True;ls.select_border=False;ls.select_crease=False;ls.select_external_contour=False
ls.linestyle=ls.linestyle or bpy.data.linestyles.new('L');ls.linestyle.color=(0.08,0.06,0.05);ls.linestyle.alpha=0.85
sh=bpy.data.collections.new('shadow');sc.collection.children.link(sh)
bpy.ops.mesh.primitive_plane_add(size=40,location=(0,0,0));pl=bpy.context.active_object
for c in pl.users_collection:c.objects.unlink(pl)
sh.objects.link(pl);pl.is_shadow_catcher=True
if J.get('noshadow'):pl.hide_render=True
ls.select_by_collection=True;ls.collection=sh;ls.collection_negation='EXCLUSIVE'
r.image_settings.file_format='PNG';r.image_settings.color_mode='RGBA'
meta={'hd':bool(J.get('hd')),'anims':{},'res':res,'ppu':PPU,'H':H,'ext':ext,'elev':JOB.get('_elev',55)}
# anchor: world origin projected
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
a=world_to_camera_view(sc,co,mathutils.Vector((0,0,0)));meta['anchor']=[a.x*res,(1-a.y)*res]
DIRS=J.get('dirs',[0,45,90,135,180]);meta['dirs']=DIRS
if PV:
    DIRS=[0,90,180];pa=PV.split(',');J['anims_n']={k:(v[0],1) for k,v in J['anims_n'].items() if k in pa}
RB=J.get('refbone')
def bone_xy():
    p=arm.matrix_world@arm.pose.bones[RB].head;return mathutils.Vector((p.x,p.y,0))
MB={e.name:e.matrix_basis.copy() for e in WROOTS}
ONLY=os.environ.get('ONLY');ONLY=set(ONLY.split(',')) if ONLY else None
for di,a in enumerate(DIRS):
  for key,(name,n) in J['anims_n'].items():
    if ONLY and key not in ONLY:
        meta['anims'][key]=n;continue
    act=acts[name];f0,f1=act.frame_range;once=key in('death','attack','hit')
    fr=[f0+(f1-f0)*i/(n-1 if once else n) for i in range(n)] if not PV else [f0+(f1-f0)*float(os.environ.get('PVT',0))]
    reset_pose(arm);arm.animation_data.action=act
    if R_ and R_.get('acts'):
        ra=R_['acts'].get(key,R_['act']);a2=[x for x in bpy.data.actions if x.name.startswith(ra)];a2.sort(key=lambda x:len(x.name));a2=a2[0]
        ad=arm2.animation_data;ad.action=None
        for t in ad.nla_tracks[:]:ad.nla_tracks.remove(t)
        reset_pose(arm2);tr=ad.nla_tracks.new();st=tr.strips.new('r',int(f0),a2);st.scale=max(0.05,(f1-f0)/max(1,a2.frame_range[1]-a2.frame_range[0]))
    th=J.get('yaw',0)+90-a+J.get('ayaw',{}).get(key,0)
    set_yaw(th)
    if RB:
        sc.frame_set(int(f0));p0=bone_xy();sc.frame_set(int(f1));p1=bone_xy()
    for i,f in enumerate(fr):
        set_yaw(th);flap(key,i,n);sc.frame_set(int(f),subframe=f-int(f))
        if RB and key in ('walk','idle','attack','hit'):
            # cancel linear root drift only (keep sway)
            t=(f-f0)/max(1e-6,f1-f0);drift=p0+(p1-p0)*t;cur=bone_xy();off=-(drift-p0) if key=='walk' else -(cur-p0)*0
            for rr in root:rr.matrix_world.translation+=off
            bpy.context.view_layer.update()
        r.filepath=f'{OUT}/d{di}_{key}_{i:02d}.png';bpy.ops.render.render(write_still=True)
    meta['anims'][key]=n
meta['secs']=round(time.time()-t0,1)
json.dump(meta,open(OUT+'/meta.json','w'))
print('DONE',UID,meta['secs'])

# Blender headless sprite renderer: blender -b -P render.py -- job.json unitId
import bpy,sys,json,math,os,mathutils,time
argv=sys.argv[sys.argv.index('--')+1:];JOB=json.load(open(argv[0]));UID=argv[1];J=JOB[UID]
M='/workspace/heroes-clash/assets/models/';RAW='/workspace/models_raw/'
OUT=f'/workspace/spr/out/{UID}';os.makedirs(OUT,exist_ok=True)
PPU=JOB.get('_ppu',256)  # render px per game world unit (2x supersampled)
t0=time.time()
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
def imp(path):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=path);return [o for o in bpy.data.objects if o not in before]
objs=imp(M+J['f']+'.glb')
arm=[o for o in objs if o.type=='ARMATURE'][0]
show=set(J.get('show',[]));hideable=set(JOB['_kkw'])
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
            if n.type=='BSDF_PRINCIPLED':n.inputs['Base Color'].default_value=(*[(((rc>>s)&255)/255)**2.2 for s in (16,8,0)],1);n.inputs['Roughness'].default_value=0.55
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
def set_act(name,f):
    a=acts[name];arm.animation_data.action=a;sc.frame_set(int(f));return a
# normalize height on idle pose
set_act(J['anims']['idle'],acts[J['anims']['idle']].frame_range[0])
dg=bpy.context.evaluated_depsgraph_get()
def bbox():
    lo=mathutils.Vector((1e9,)*3);hi=-lo
    dg=bpy.context.evaluated_depsgraph_get()
    for o in bpy.data.objects:
        if o.type!='MESH' or o.hide_render:continue
        e=o.evaluated_get(dg)
        for v in e.bound_box:
            w=e.matrix_world@mathutils.Vector(v);lo=mathutils.Vector(map(min,lo,w));hi=mathutils.Vector(map(max,hi,w))
    return lo,hi
root=[o for o in objs if o.parent is None]
lo,hi=bbox();H=J['h']*1.55;k=H/(hi.z-lo.z)
for r in root:r.scale*=k;r.location*=k
bpy.context.view_layer.update()
for r in root:r.matrix_world=mathutils.Matrix.Rotation(math.radians(J.get('yaw',0)),4,'Z')@r.matrix_world
bpy.context.view_layer.update();lo,hi=bbox()
for r in root:r.location.z-=lo.z
bpy.context.view_layer.update()
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
EL=math.radians(JOB.get('_elev',40));ext=J.get('extent',1.0)*H*1.9+0.3
cy=H*0.5
co.location=(-10*math.cos(EL),0,cy+10*math.sin(EL));d=mathutils.Vector((0,0,cy))-co.location
co.rotation_euler=d.to_track_quat('-Z','Y').to_euler();cam.ortho_scale=ext
res=int(ext*PPU);sc.render.resolution_x=res;sc.render.resolution_y=res;sc.render.film_transparent=True
# lights: warm key, cool fill, rim
def light(n,t,e,rot,col,size=1):
    L=bpy.data.lights.new(n,t);L.energy=e;L.color=col
    if t=='SUN':L.angle=math.radians(size)
    o=bpy.data.objects.new(n,L);o.rotation_euler=[math.radians(a) for a in rot];sc.collection.objects.link(o)
light('key','SUN',4.2,(50,0,-60),(1,0.92,0.78),8)
light('fill','SUN',1.3,(60,0,-150),(0.7,0.8,1.0),25)
light('rim','SUN',3.0,(-35,0,80),(1,0.95,0.9),4)
w=bpy.data.worlds.new('w');sc.world=w;w.use_nodes=True;w.node_tree.nodes['Background'].inputs[0].default_value=(0.55,0.6,0.7,1);w.node_tree.nodes['Background'].inputs[1].default_value=0.6
r=sc.render;r.engine='CYCLES';sc.cycles.device='CPU';sc.cycles.samples=JOB.get('_spp',24);sc.cycles.use_denoising=True;sc.cycles.max_bounces=4
sc.view_settings.view_transform='Standard';sc.view_settings.look='None';sc.view_settings.exposure=0.25
r.use_freestyle=True;r.line_thickness_mode='ABSOLUTE';r.line_thickness=JOB.get('_line',2.0)
ls=sc.view_layers[0].freestyle_settings.linesets[0] if sc.view_layers[0].freestyle_settings.linesets else sc.view_layers[0].freestyle_settings.linesets.new('ls')
ls.select_by_visibility=True;ls.select_silhouette=True;ls.select_border=True;ls.select_crease=False
ls.linestyle=ls.linestyle or bpy.data.linestyles.new('L');ls.linestyle.color=(0.08,0.06,0.05);ls.linestyle.alpha=0.85
r.image_settings.file_format='PNG';r.image_settings.color_mode='RGBA'
meta={'anims':{},'res':res,'ppu':PPU,'H':H,'ext':ext,'elev':JOB.get('_elev',40)}
# anchor: world origin projected
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
a=world_to_camera_view(sc,co,mathutils.Vector((0,0,0)));meta['anchor']=[a.x*res,(1-a.y)*res]
for key,(name,n) in J['anims_n'].items():
    act=acts[name];f0,f1=act.frame_range;once=key in('death','attack','hit')
    fr=[f0+(f1-f0)*i/(n-1 if once else n) for i in range(n)]
    arm.animation_data.action=act
    for i,f in enumerate(fr):
        sc.frame_set(int(f),subframe=f-int(f));r.filepath=f'{OUT}/{key}_{i:02d}.png';bpy.ops.render.render(write_still=True)
    meta['anims'][key]=n
meta['secs']=round(time.time()-t0,1)
json.dump(meta,open(OUT+'/meta.json','w'))
print('DONE',UID,meta['secs'])

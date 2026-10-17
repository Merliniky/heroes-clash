import bpy,sys,math,mathutils
a=sys.argv[sys.argv.index('--')+1:];OUT=a[0];parts=a[1:]
UAL='/workspace/hd/ual2/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    b=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=p);return [o for o in bpy.data.objects if o not in b]
HEADONLY=True
base=imp(UAL);A=[o for o in base if o.type=='ARMATURE'][0]
for o in base:
    if o.type=='MESH':bpy.data.objects.remove(o)
keep_names=set()
for p in parts:
    spec=p.split('::');path=spec[0];only=spec[1].split(',') if len(spec)>1 else None
    objs=imp(path);arms=[o for o in objs if o.type=='ARMATURE']
    for o in objs:
        if o.type!='MESH':continue
        if 'Icosphere' in o.name or (only and not any(o.name.startswith(n) for n in only)):bpy.data.objects.remove(o);continue
        mw=o.matrix_world.copy();o.parent=A;o.matrix_world=mw
        for m in o.modifiers:
            if m.type=='ARMATURE':m.object=A
    for ar in arms:bpy.data.objects.remove(ar)
import bmesh
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.name.startswith('SuperHero') and HEADONLY:
        gi={g.index:g.name for g in o.vertex_groups};bm=bmesh.new();bm.from_mesh(o.data);dl=bm.verts.layers.deform.active
        kill=[v for v in bm.verts if not v[dl] or not gi[max(v[dl].items(),key=lambda x:x[1])[0]].lower().startswith(('head','neck'))]
        bmesh.ops.delete(bm,geom=kill,context='VERTS');bm.to_mesh(o.data);bm.free()
# weapons from KayKit knight (CC0): name|bone|loc|rot(deg)|scale
WK='/workspace/heroes-clash/assets/models/k_Knight.glb'
import json
weps=json.loads(open(OUT+'.weps.json').read()) if __import__('os').path.exists(OUT+'.weps.json') else []
if weps:
    ko=imp(WK)
    for w in weps:
        src=[o for o in ko if o.name.split('.')[0]==w['n']][0];src.parent=None;src.matrix_world=mathutils.Matrix.Identity(4)
        src.modifiers.clear() if hasattr(src,'modifiers') else None
        src.parent=A;src.parent_type='BONE';src.parent_bone=w['bone']
        bl=A.data.bones[w['bone']].length
        src.location=mathutils.Vector(w.get('loc',[0,0,0]))+mathutils.Vector((0,-bl,0));src.rotation_euler=[math.radians(x) for x in w.get('rot',[0,0,0])];src.scale=(w.get('s',1),)*3
        src['keep']=1
    for o in ko:
        if not o.get('keep'):bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.parent is None:bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=OUT+'.glb',export_format='GLB',export_animation_mode='ACTIONS',export_apply=False)
print('PREP_DONE')

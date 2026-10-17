# compose a UAL-rigged humanoid: blender -b -P prep_h2.py -- cfg.json
import bpy,sys,json,math,mathutils,bmesh,os
C=json.load(open(sys.argv[sys.argv.index('--')+1]))
UAL='/workspace/hd/ual2/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    b=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=p);return [o for o in bpy.data.objects if o not in b]
base=imp(UAL);A=[o for o in base if o.type=='ARMATURE'][0]
for o in base:
    if o.type=='MESH':bpy.data.objects.remove(o)
for part in C['parts']:
    objs=imp(part['f']);arms=[o for o in objs if o.type=='ARMATURE']
    for o in objs:
        if o.type!='MESH':continue
        nm=o.name
        if 'Icosphere' in nm or any(d in nm for d in part.get('drop',[])) or (part.get('only') and not any(k in nm for k in part['only'])):
            bpy.data.objects.remove(o);continue
        mw=o.matrix_world.copy();o.parent=A;o.matrix_world=mw
        for m in o.modifiers:
            if m.type=='ARMATURE':m.object=A
        if part.get('headonly'):
            gi={g.index:g.name for g in o.vertex_groups};bm=bmesh.new();bm.from_mesh(o.data);dl=bm.verts.layers.deform.active
            kill=[v for v in bm.verts if not v[dl] or not gi[max(v[dl].items(),key=lambda x:x[1])[0]].lower().startswith(('head','neck'))]
            bmesh.ops.delete(bm,geom=kill,context='VERTS');bm.to_mesh(o.data);bm.free()
    for ar in arms:bpy.data.objects.remove(ar)
# texture swaps
for m in bpy.data.materials:
    for k,tex in C.get('texswap',{}).items():
        if m.name.startswith(k) and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type=='TEX_IMAGE' and n.image and 'BaseColor' in n.image.name:
                    n.image=bpy.data.images.load(tex);print('SWAP',m.name)
# props from glb files attached to bones
for w in C.get('props',[]):
    ko=imp(w['src']);src=[o for o in ko if o.name.split('.')[0]==w['n']][0]
    src.parent=None;src.modifiers.clear();src.matrix_world=mathutils.Matrix.Identity(4)
    if src.vertex_groups:src.vertex_groups.clear()
    if w.get('center'):
        vs=[v.co for v in src.data.vertices];c=sum(vs,mathutils.Vector())/len(vs)
        for v in src.data.vertices:v.co-=c
    src.parent=A;src.parent_type='BONE';src.parent_bone=w['bone']
    bl=A.data.bones[w['bone']].length
    sc_=w.get('s',1)
    if w.get('len'):
        vs=[v.co for v in src.data.vertices];md=max(max(v[i] for v in vs)-min(v[i] for v in vs) for i in range(3));sc_=w['len']/md
    src.rotation_mode='XYZ';src.location=mathutils.Vector(w.get('loc',[0,0,0]))+mathutils.Vector((0,-bl,0));src.rotation_euler=[math.radians(x) for x in w.get('rot',[0,0,0])];src.scale=(sc_,)*3
    src['keep']=1
    for o in ko:
        if not o.get('keep'):bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.parent is None:bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=C['out'],export_format='GLB',export_animation_mode='ACTIONS')
print('PREP_DONE',[o.name for o in bpy.data.objects])

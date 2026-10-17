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
        if part.get('dropbones'):
            gi={g.index:g.name for g in o.vertex_groups};bm=bmesh.new();bm.from_mesh(o.data);dl=bm.verts.layers.deform.active
            if dl:
                kill=[v for v in bm.verts if v[dl] and gi[max(v[dl].items(),key=lambda x:x[1])[0]].startswith(tuple(part['dropbones']))]
                bmesh.ops.delete(bm,geom=kill,context='VERTS');bm.to_mesh(o.data)
            bm.free()
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
                if n.type=='TEX_IMAGE' and n.image and ('BaseColor' in n.image.name or n.image.name.endswith('_Dark')) and not any(x in n.image.name for x in ('Normal','Rough','ORM')):
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
W=C.get('wings')
if W:
    mat=bpy.data.materials.new('Wing');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*W.get('col',[0.95,0.93,0.88]),1);bs.inputs['Roughness'].default_value=0.75
    if 'Subsurface Weight' in bs.inputs:pass
    bpy.context.view_layer.update()
    bh=A.matrix_world@A.pose.bones[W['bone']].head;sp=W.get('span',1.0);n=W.get('n',8)
    for side in (1,-1):
        for i in range(n):
            t=i/(n-1);ang=math.radians(-15+t*95);L=sp*(1.0-0.45*t)*(1-0.25*abs(t-0.35))
            d=mathutils.Vector((side*math.cos(ang),0.35+0.1*t,math.sin(ang))).normalized()
            root=bh+mathutils.Vector((side*0.06,W.get('back',0.14),W.get('up',0.05)))
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1)
            f=bpy.context.active_object;f.name=f'Wing_{side}_{i}'
            q=mathutils.Vector((1,0,0)).rotation_difference(d)
            f.rotation_mode='QUATERNION';f.rotation_quaternion=q;f.scale=(L/2,0.11*sp*(1-0.3*t),0.022*sp)
            f.location=root+d*(L/2)
            f.data.materials.append(mat)
            bpy.context.view_layer.update();mw=f.matrix_world.copy()
            f.parent=A;f.parent_type='BONE';f.parent_bone=W['bone'];bpy.context.view_layer.update();f.matrix_world=mw;f['keep']=1
    bpy.context.view_layer.update()
for o in list(bpy.data.objects):
    if o.type=='MESH' and o.parent is None and not o.get('keep'):bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=C['out'],export_format='GLB',export_animation_mode='ACTIONS')
print('PREP_DONE',[o.name for o in bpy.data.objects])

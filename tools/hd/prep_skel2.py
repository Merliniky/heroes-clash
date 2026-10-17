import bpy
D='/workspace/hd/SkeletonOutlaw_0/SkeletonOutlaw/'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/workspace/hd/skg/merged.glb')
print('ACTS',[a.name for a in bpy.data.actions][:20],len(bpy.data.actions))
for m in bpy.data.materials:
    if not m.use_nodes:continue
    nt=m.node_tree;b=[x for x in nt.nodes if x.type=='BSDF_PRINCIPLED']
    if not b:continue
    tex='Axe00.png' if 'axe' in m.name.lower() else 'SkeletonOutlaw00.png'
    t=nt.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(D+'Textures/'+tex)
    nt.links.new(t.outputs[0],b[0].inputs['Base Color']);b[0].inputs['Roughness'].default_value=0.6
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'):bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath='/workspace/hd/units/skeleton_hd.glb',export_format='GLB',export_animation_mode='ACTIONS')
print('PREP_DONE')

import bpy
for o in list(bpy.data.objects):
    if o.type not in('ARMATURE',) and o.name!='dragon':bpy.data.objects.remove(o)
A=bpy.data.objects['Armature'];A.animation_data_create()
for a in bpy.data.actions:a.use_fake_user=True
A.animation_data.action=bpy.data.actions['Idle']
d=bpy.data.objects['dragon']
for m in list(d.modifiers):
    if m.type=='NODES':d.modifiers.remove(m)
bpy.ops.export_scene.gltf(filepath='/workspace/hd/units/dragon_hd.glb',export_format='GLB',export_animation_mode='ACTIONS')
print('PREP_DONE')

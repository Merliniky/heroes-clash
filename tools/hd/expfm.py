import bpy
T='/workspace/hd/pp/fm/texture/'
for o in list(bpy.data.objects):
    if o.name not in ('Armature','Monster'): bpy.data.objects.remove(o)
m=bpy.data.objects['Monster'];mat=m.material_slots[0].material;mat.use_nodes=True;nt=mat.node_tree
b=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]
def img(f,cs='sRGB'):
    n=nt.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(T+f);n.image.colorspace_settings.name=cs;return n
c=img('skin_b.png');nm=img('forest-monster-norm.png','Non-Color')

nt.links.new(c.outputs[0],b.inputs['Base Color'])
nn=nt.nodes.new('ShaderNodeNormalMap');nt.links.new(nm.outputs[0],nn.inputs['Color']);nt.links.new(nn.outputs[0],b.inputs['Normal'])
b.inputs['Roughness'].default_value=0.85;b.inputs['Metallic'].default_value=0
mat.name='Monster'
bpy.ops.export_scene.gltf(filepath='/workspace/hd/units/behemoth_fm.glb',export_animations=True,export_animation_mode='ACTIONS')

# Blender 4.2 headless: builds the Gem TD tower kit -> assets/td/towers.glb
#   blender -b -P tools/td_models/build_towers.py -- assets/td/towers.glb
# Objects: ped_q0..ped_q4 (pedestals per quality, child empty anchor_*), gem_<cut> (unit gems), sp_<special> (special towers, child anchor_*).
# Material names are placeholders that td.js swaps for its own toon / gem materials: stone_d stone_l stone_t gold band iron obsidian jade marble wood roof gemc
import bpy, bmesh, math, random, sys
from mathutils import Vector, Matrix
out = sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else '/tmp/towers.glb'
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
MATS = {}
COL = dict(stone_d=(.45,.42,.5),stone_l=(.66,.62,.68),stone_t=(.8,.77,.8),gold=(1,.75,.2),band=(.5,.5,.9),iron=(.25,.24,.28),obsidian=(.12,.08,.15),jade=(.55,.85,.65),marble=(.92,.93,.97),wood=(.5,.32,.18),roof=(.2,.6,.35),gemc=(1,.3,.4))
def mat(n):
    if n not in MATS:
        m = bpy.data.materials.new(n); m.diffuse_color = (*COL.get(n,(1,1,1)),1)
        m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*COL.get(n,(1,1,1)),1)
        MATS[n] = m
    return MATS[n]
def obj_from_bm(bm, name, m, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(mat(m)); return o
def bevel(o, w=0.02, seg=1, ang=40):
    md = o.modifiers.new('bv','BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(ang); md.harden_normals = False
    return o
def apply_all(o):
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.ops.object.modifier_apply(modifier=md.name)
def cyl(name, r1, r2, h, seg, m, z=0, bw=0.02, rot=0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0,0,0), matrix=Matrix.Rotation(rot,3,'Z'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0,0,z+h/2)); o = obj_from_bm(bm, name, m)
    if bw: bevel(o, bw, 1)
    return o
def box(name, sx, sy, sz, m, loc=(0,0,0), rot=(0,0,0), bw=0.018):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(sx,sy,sz), verts=bm.verts)
    o = obj_from_bm(bm, name, m); o.location = loc; o.rotation_euler = rot
    if bw: bevel(o, bw, 1)
    return o
def join(objs, name, parent=None):
    for o in objs: apply_all(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o
def anchor(parent, name, z):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e); e.parent = parent; e.location = (0,0,z); return e
# ---------- pedestals ----------
QH = [0.16,0.26,0.36,0.46,0.58]
def stone_ring(z, h, r, n, m, off=0, jit=0.012, tag=''):
    parts = []
    for i in range(n):
        a = (i+off)/n*math.tau; w = 2*r*math.sin(math.pi/n)*1.02
        parts.append(box(f'blk{tag}{i}', 0.17+random.uniform(-jit,jit), w*0.96, h*0.94, m, loc=(math.cos(a)*r, math.sin(a)*r, z+h/2), rot=(0,0,a+random.uniform(-0.05,0.05)), bw=0.022))
    return parts
def pedestal(q):
    P = []; h = QH[q]
    P.append(cyl('plinth', 0.47, 0.44, 0.08, 8, 'stone_d', 0, 0.025, math.pi/8))
    P.append(cyl('plinth2', 0.43, 0.40, 0.07, 8, 'stone_d', 0.08, 0.02, math.pi/8))
    core = cyl('core', 0.26, 0.26, h, 8, 'stone_d', 0.15, 0); P.append(core)
    rows = max(1, round(h/0.13)); rh = h/rows
    for k in range(rows): P += stone_ring(0.15+k*rh, rh, 0.255, 8, 'stone_l', off=0.5*(k%2), tag=f'{q}{k}')
    zt = 0.15+h
    P.append(cyl('band', 0.335, 0.335, 0.06, 8, 'band', 0.15+h*0.5-0.03, 0.012, math.pi/8))
    P.append(cyl('cap', 0.37, 0.33, 0.08, 8, 'gold' if q>=4 else 'stone_t', zt, 0.022, math.pi/8))
    if q >= 2:
        for i in range(4):
            a = i/4*math.tau+math.pi/4
            P.append(box(f'butt{i}', 0.14, 0.12, h*0.75, 'stone_d', loc=(math.cos(a)*0.34, math.sin(a)*0.34, 0.15+h*0.375), rot=(0, 0, a), bw=0.02))
            P.append(box(f'butt_t{i}', 0.16, 0.14, 0.05, 'stone_t', loc=(math.cos(a)*0.34, math.sin(a)*0.34, 0.15+h*0.75+0.02), rot=(0,0,a), bw=0.012))
    n_merl = 0 if q == 0 else (4 if q < 3 else 8)
    for i in range(n_merl):
        a = i/n_merl*math.tau
        P.append(box(f'merl{i}', 0.09, 0.11, 0.08, 'gold' if q>=3 else 'stone_t', loc=(math.cos(a)*0.32, math.sin(a)*0.32, zt+0.12), rot=(0,0,a), bw=0.015))
    if q >= 3:
        P.append(cyl('trim', 0.385, 0.385, 0.03, 8, 'gold', zt+0.035, 0.008, math.pi/8))
    if q >= 4:  # gold claws holding the gem
        for i in range(6):
            a = i/6*math.tau
            c = cyl(f'claw{i}', 0.035, 0.012, 0.36, 5, 'gold', 0, 0.006)
            apply_all(c); c.rotation_euler = (0, -0.38, a); c.location = (math.cos(a)*0.27, math.sin(a)*0.27, zt+0.08); P.append(c)
    o = join(P, f'ped_q{q}'); anchor(o, f'anchor_q{q}', zt+0.1); return o
# ---------- gems (unit size: girdle radius ~0.5, centred at origin) ----------
def rings_mesh(name, rings, seg, m='gemc', top=None, bot=None, phase=None):
    bm = bmesh.new(); R = []
    for k,(r,z,sx,sy) in enumerate(rings):
        ph = (phase[k] if phase else 0)*math.pi/seg
        R.append([bm.verts.new((math.cos(i/seg*math.tau+ph)*r*sx, math.sin(i/seg*math.tau+ph)*r*sy, z)) for i in range(seg)])
    for a,b in zip(R, R[1:]):
        for i in range(seg):
            bm.faces.new((a[i], a[(i+1)%seg], b[(i+1)%seg], b[i]))
    if top is None: bm.faces.new(R[-1])
    else:
        t = bm.verts.new((0,0,top)); [bm.faces.new((R[-1][i], R[-1][(i+1)%seg], t)) for i in range(seg)]
    if bot is None: bm.faces.new(list(reversed(R[0])))
    else:
        b0 = bm.verts.new((0,0,bot)); [bm.faces.new((R[0][(i+1)%seg], R[0][i], b0)) for i in range(seg)]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts)>4])
    return obj_from_bm(bm, name, m)
def gems():
    # round brilliant: pavilion point, girdle, crown, table
    rings_mesh('gem_brilliant', [(0.5,0,1,1),(0.5,0.04,1,1),(0.38,0.17,1,1),(0.25,0.24,1,1)], 16, bot=-0.42, phase=[0,0,1,0])
    rings_mesh('gem_oval', [(0.5,0,1,0.78),(0.5,0.04,1,0.78),(0.4,0.16,1,0.78),(0.27,0.23,1,0.78)], 14, bot=-0.4, phase=[0,0,1,0])
    rings_mesh('gem_cushion', [(0.52,0,1,1),(0.52,0.05,1,1),(0.36,0.2,1,1)], 8, bot=-0.38, phase=[0,0,1])
    # step (emerald) cut: octagonal rectangle with stepped crown and pavilion
    rings_mesh('gem_step', [(0.28,-0.3,1,0.7),(0.42,-0.14,1,0.7),(0.5,0,1,0.7),(0.5,0.05,1,0.7),(0.42,0.15,1,0.7),(0.32,0.22,1,0.7)], 8, bot=None)
    # double-terminated hexagonal crystals
    rings_mesh('gem_hex', [(0.4,-0.32,1,1),(0.4,0.32,1,1)], 6, top=0.64, bot=-0.6)
    rings_mesh('gem_long', [(0.3,-0.45,1,1),(0.3,0.45,1,1)], 6, top=0.78, bot=-0.7)
    # cabochon (opal)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.48)
    for v in bm.verts:
        if v.co.z < 0: v.co.z *= 0.45
    o = obj_from_bm(bm, 'gem_cabochon', 'gemc', smooth=True)
    # amethyst cluster
    parts = []
    for i,(x,y,s,tx,ty) in enumerate([(0,0,1,0,0),(-0.22,0.05,0.68,0,-0.5),(0.22,-0.04,0.62,0.1,0.55),(0.05,0.2,0.55,-0.5,0.1),(0.02,-0.2,0.5,0.5,-0.1)]):
        c = rings_mesh(f'cl{i}', [(0.17*s,-0.3*s,1,1),(0.17*s,0.25*s,1,1)], 6, top=0.48*s, bot=-0.34*s); c.location=(x,y,-0.05); c.rotation_euler=(tx,ty,random.random()); parts.append(c)
    join(parts, 'gem_cluster')
    # star (stellated icosahedron)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.3)
    res = bmesh.ops.poke(bm, faces=bm.faces[:])
    for v in res['verts']: v.co *= 1.65
    obj_from_bm(bm, 'gem_star', 'gemc')
# ---------- special towers ----------
def special_towers():
    # Silver: white marble spire on a wide base
    P = [cyl('b', 0.5, 0.46, 0.1, 8, 'stone_d', 0, 0.025, math.pi/8), cyl('t1', 0.36, 0.3, 0.32, 8, 'marble', 0.1, 0.02, math.pi/8), cyl('r1', 0.4, 0.4, 0.05, 8, 'gold', 0.42, 0.01, math.pi/8),
         cyl('t2', 0.27, 0.21, 0.36, 8, 'marble', 0.47, 0.02, math.pi/8), cyl('r2', 0.3, 0.3, 0.04, 8, 'band', 0.83, 0.01, math.pi/8), cyl('t3', 0.2, 0.16, 0.22, 8, 'marble', 0.87, 0.015, math.pi/8)]
    for i in range(4):
        a = i/4*math.tau; P.append(box(f'f{i}', 0.08, 0.08, 0.5, 'marble', loc=(math.cos(a)*0.38, math.sin(a)*0.38, 0.35), rot=(0,0,a)))
        c = cyl(f'fc{i}', 0.07, 0.001, 0.16, 4, 'gold', 0.6, 0.004, a); c.location = (math.cos(a)*0.38, math.sin(a)*0.38, 0); P.append(c)
    o = join(P, 'sp_silver'); anchor(o, 'anchor_silver', 1.42)
    # Malachite: iron tripod brazier with a ring of green crystals
    P = [cyl('b', 0.48, 0.44, 0.1, 8, 'stone_d', 0, 0.025, math.pi/8)]
    for i in range(3):
        a = i/3*math.tau; l = cyl(f'l{i}', 0.045, 0.035, 0.75, 6, 'iron', 0, 0.008); apply_all(l); l.rotation_euler = (0, 0.32, a); l.location = (math.cos(a)*0.3, math.sin(a)*0.3, 0.08); P.append(l)
    P.append(cyl('bowl', 0.24, 0.38, 0.18, 10, 'iron', 0.72, 0.02)); P.append(cyl('rim', 0.4, 0.4, 0.04, 10, 'gold', 0.89, 0.01))
    for i in range(6):
        a = i/6*math.tau; c = rings_mesh(f'mc{i}', [(0.07,-0.1,1,1),(0.07,0.12,1,1)], 6, top=0.26, bot=-0.12); c.location = (math.cos(a)*0.25, math.sin(a)*0.25, 0.98); c.rotation_euler = (math.sin(a)*0.45, -math.cos(a)*0.45, 0); P.append(c)
    o = join(P, 'sp_malachite'); anchor(o, 'anchor_malachite', 1.3)
    # Jade: two-tier pagoda with flared green roofs
    def roof(n, r, h, z):
        bm = bmesh.new(); ring = [bm.verts.new((math.cos(i/4*math.tau+math.pi/4)*r, math.sin(i/4*math.tau+math.pi/4)*r, z)) for i in range(4)]
        mid = [bm.verts.new((math.cos(i/4*math.tau+math.pi/4)*r*0.62, math.sin(i/4*math.tau+math.pi/4)*r*0.62, z+h*0.42)) for i in range(4)]
        tip = bm.verts.new((0,0,z+h))
        for i in range(4): bm.faces.new((ring[i], ring[(i+1)%4], mid[(i+1)%4], mid[i])); bm.faces.new((mid[i], mid[(i+1)%4], tip))
        bm.faces.new(list(reversed(ring))); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); o = obj_from_bm(bm, n, 'roof'); s = o.modifiers.new('s','SOLIDIFY'); s.thickness = 0.04; return o
    P = [cyl('b', 0.48, 0.44, 0.1, 8, 'stone_d', 0, 0.025, math.pi/8), box('w1', 0.48, 0.48, 0.36, 'jade', loc=(0,0,0.28)), roof('r1', 0.6, 0.34, 0.46),
         box('w2', 0.32, 0.32, 0.22, 'jade', loc=(0,0,0.86)), roof('r2', 0.44, 0.3, 0.95), cyl('sp', 0.03, 0.03, 0.3, 6, 'gold', 1.2, 0.0)]
    for i in range(4):
        a = i/4*math.tau+math.pi/4; P.append(cyl(f'col{i}', 0.04, 0.04, 0.36, 6, 'wood', 0.1, 0.005)); P[-1].location = (math.cos(a)*0.27, math.sin(a)*0.27, 0)
    o = join(P, 'sp_jade'); anchor(o, 'anchor_jade', 1.62)
    # Star Ruby: iron brazier with flame-shaped crystal spikes
    P = [cyl('b', 0.48, 0.44, 0.1, 8, 'stone_d', 0, 0.025, math.pi/8), cyl('st', 0.18, 0.24, 0.4, 8, 'iron', 0.1, 0.02), cyl('bowl', 0.2, 0.42, 0.22, 10, 'iron', 0.5, 0.02), cyl('rim', 0.44, 0.44, 0.04, 10, 'gold', 0.71, 0.01)]
    for i in range(7):
        a = i/7*math.tau; c = rings_mesh(f'fs{i}', [(0.07,0,1,1),(0.05,0.1,1,1)], 5, top=0.42, bot=None); c.location = (math.cos(a)*0.3, math.sin(a)*0.3, 0.7); c.rotation_euler = (math.sin(a)*0.55, -math.cos(a)*0.55, 0); P.append(c)
    o = join(P, 'sp_starRuby'); anchor(o, 'anchor_starRuby', 1.12)
    # Gold: stepped golden obelisk crowned with claws
    P = [cyl('b', 0.5, 0.46, 0.1, 4, 'stone_d', 0, 0.025, math.pi/4), cyl('s1', 0.42, 0.4, 0.1, 4, 'gold', 0.1, 0.02, math.pi/4), cyl('ob', 0.3, 0.17, 0.75, 4, 'gold', 0.2, 0.02, math.pi/4), cyl('cap', 0.27, 0.22, 0.07, 8, 'gold', 0.95, 0.015)]
    for i in range(4):
        a = i/4*math.tau; P.append(box(f'gl{i}', 0.03, 0.1, 0.5, 'band', loc=(math.cos(a)*0.215, math.sin(a)*0.215, 0.5), rot=(0, 0.17, a), bw=0.005))
    for i in range(6):
        a = i/6*math.tau; c = cyl(f'cl{i}', 0.04, 0.012, 0.4, 5, 'gold', 0, 0.006); apply_all(c); c.rotation_euler = (0, -0.42, a); c.location = (math.cos(a)*0.2, math.sin(a)*0.2, 0.98); P.append(c)
    o = join(P, 'sp_gold'); anchor(o, 'anchor_gold', 1.3)
    # Bloodstone: jagged obsidian crown on a dark plinth
    P = [cyl('b', 0.5, 0.46, 0.1, 8, 'obsidian', 0, 0.025, math.pi/8), cyl('c', 0.34, 0.28, 0.5, 7, 'obsidian', 0.1, 0.02), cyl('cap', 0.36, 0.3, 0.06, 7, 'band', 0.6, 0.012)]
    for i in range(7):
        a = i/7*math.tau; s = 0.6+random.random()*0.5; c = rings_mesh(f'sh{i}', [(0.08,0,1,1),(0.06,0.15*s,1,1)], 4, top=0.55*s, bot=None, m='obsidian'); c.location = (math.cos(a)*0.37, math.sin(a)*0.37, 0.05); c.rotation_euler = (math.sin(a)*0.35, -math.cos(a)*0.35, a); P.append(c)
    o = join(P, 'sp_bloodstone'); anchor(o, 'anchor_bloodstone', 1.05)
for q in range(5): pedestal(q)
gems(); special_towers()
# glTF is Y-up; Blender exporter converts Z-up automatically
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True, export_normals=True, export_materials='EXPORT', export_extras=False)
print('WROTE', out)

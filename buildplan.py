#!/usr/bin/env python3
# Leest de Illustrator-PDF en zet muren/deuren/ramen/kasten/labels om naar
# een PLAN-object (meters, z-omhoog) voor de 3D-render. 1-op-1, geen interpretatie.
import fitz, json

PDF = '/root/.claude/uploads/c1aecefe-0a1f-52bc-b0d8-93189852be7e/a459df13-apt.pdf'
p = fitz.open(PDF)[0]

# ---- ruwe geometrie ----
rects, lines = [], []
for g in p.get_drawings():
    for it in g['items']:
        if it[0] == 're':
            r = it[1]; rects.append((r.x0, r.y0, r.x1, r.y1))
        elif it[0] == 'l':
            a, b = it[1], it[2]; lines.append((a.x, a.y, b.x, b.y))
words = p.get_text('words')

# ---- kalibratie naar meters ----
WEST, EAST, SOUTH = 508.4, 860.9, 613.3
S = 9.156 / (EAST - WEST)   # breedte = 9,156 m
# X gespiegeld (EAST->0) zodat de 3D-dollhouse net als de plattegrond leest
def MX(px): return round((EAST - px) * S, 3)
def MZ(py): return round((SOUTH - py) * S, 3)

# ---- muren (H/V) ----
def cls(l):
    x0, y0, x1, y1 = l
    if abs(y0 - y1) < 1.5: return ('x', y0, min(x0, x1), max(x0, x1))   # horizontaal: vast z (y), loopt in x
    if abs(x0 - x1) < 1.5: return ('z', x0, min(y0, y1), max(y0, y1))   # verticaal: vast x, loopt in z (y)
    return None
walls_raw = [c for c in (cls(l) for l in lines) if c and c[2] != c[3]]

# ---- openingen (deuren/ramen) : elk small rect ----
# raam = window (breder, op buitenmuur), deur/hoofddeur = door
raam_rects = [(532.7,166.6,593.1,173.5),(622.1,166.6,703.0,173.5),(781.2,166.6,833.7,173.5),
              (559.1,583.3,664.8,590.2),(690.1,609.2,726.3,616.1),(745.5,609.2,783.2,616.1)]
deur_rects = [(539.3,300.0,567.9,306.8),(652.1,409.5,658.9,435.5),(715.9,265.8,722.7,291.9),
              (715.9,339.2,722.7,365.3),(756.0,265.8,762.8,291.9),(756.0,409.5,762.8,435.5)]
def op_info(r):  # -> (axis, fixed_pt, center_pt, length_pt)
    x0,y0,x1,y1 = r
    if (x1-x0) >= (y1-y0):   # breed horizontaal -> op horizontale muur (vast y)
        return ('x', (y0+y1)/2, (x0+x1)/2, x1-x0)
    else:                    # hoog verticaal -> op verticale muur (vast x)
        return ('z', (x0+x1)/2, (y0+y1)/2, y1-y0)
openings = [('window',)+op_info(r) for r in raam_rects] + [('door',)+op_info(r) for r in deur_rects]

# ---- match opening -> muur ----
TOLF, TOLR = 6.0, 4.0
def build_walls():
    out = []
    for axis, fixed, a, b in walls_raw:
        ops = []
        for kind, oax, ofix, ocen, olen in openings:
            if oax != axis: continue
            if abs(ofix - fixed) > 10: continue
            if ocen < a - TOLR or ocen > b + TOLR: continue
            ops.append((kind, ocen, olen))
        # naar meters
        if axis == 'x':      # horizontale muur op vaste y(z), loopt in x
            ma, mb = MX(a), MX(b)
            seg = {'ax':'x','z':MZ(fixed),'a':min(ma,mb),'b':max(ma,mb),'op':[]}
            for kind,c,l in ops:
                seg['op'].append({'k':kind,'at':MX(c),'w':abs(l*S)})
        else:                # verticale muur op vaste x, loopt in z(y)
            seg = {'ax':'z','x':MX(fixed),'a':MZ(b),'b':MZ(a),'op':[]}  # b>a in y => kleinere z
            for kind,c,l in ops:
                seg['op'].append({'k':kind,'at':MZ(c),'w':abs(l*S)})
        out.append(seg)
    return out

walls = build_walls()

# ---- buitenmuur? (voor materiaal/dikte) ----
def is_ext(w):
    if w['ax']=='z':
        return abs(w['x'])<0.05 or abs(w['x']-9.156)<0.05 or any(o['k']=='window' for o in w['op']) or abs(w['x']-MX(508.4))<0.05
    else:
        zt=MZ(169.8); return abs(w['z'])<0.05 or abs(w['z']-zt)<0.05 or abs(w['z']-MZ(586.8))<0.05 or any(o['k']=='window' for o in w['op'])
for w in walls: w['ext']=is_ext(w)

# ---- vloeren (kamers) in meters ----
def F(x1,z1,x2,z2,mat,name=''):
    return {'x1':MX(x1),'z1':MZ(z1),'x2':MX(x2),'z2':MZ(z2),'mat':mat,'name':name}
# let op: z1,z2 hier als py (grote py = kleine z); F rekent om
floors = [
    F(508.4,303.3,599.6,169.8,'tegels','keuken'),
    F(599.6,303.3,719.3,169.8,'flex','slaapkamer1'),
    F(759.4,303.3,860.9,169.8,'flex','slaapkamer2'),
    F(719.3,257.7,738.5,169.8,'warm','inbouwkast1'),
    F(738.5,257.7,759.4,169.8,'warm','inbouwkast2'),
    F(655.5,396.5,719.3,303.3,'bad','badkamer'),
    # hal L: voet + verticaal
    F(655.5,442.8,759.4,396.5,'warm','hal'),
    F(719.3,396.5,759.4,257.7,'warm','hal2'),
    F(759.4,442.8,833.7,303.3,'tegels','trappenhal'),
    # living/leefruimte
    F(508.4,442.8,719.3,169.8+ (303.3-169.8),'tapis','livingWestUp'),  # placeholder, herzet hieronder
]
# living exact als losse rechthoeken (py-space):
floors = [
    F(508.4,303.3,599.6,169.8,'tegels','keuken'),
    F(599.6,303.3,719.3,169.8,'flex','slaapkamer1'),
    F(759.4,303.3,860.9,169.8,'flex','slaapkamer2'),
    F(719.3,257.7,738.5,169.8,'warm','inbouwkast1'),
    F(738.5,257.7,759.4,169.8,'warm','inbouwkast2'),
    F(655.5,396.5,719.3,303.3,'bad','badkamer'),
    F(655.5,442.8,759.4,396.5,'warm','hal'),
    F(719.3,396.5,759.4,257.7,'warm','halv'),
    F(759.4,442.8,833.7,303.3,'tegels','trappenhal'),
    F(508.4,586.8,655.5,303.3,'tapis','livingW'),     # westkolom (onder keuken/slk1, west van badk)
    F(655.5,586.8,801.0,442.8,'tapis','livingS'),     # zuid-midden (onder hal/trappenhal)
    F(557.4,613.3,801.0,586.8,'tapis','livingZ'),     # onderste strook (naast terras)
]
terras = [
    {'x1':MX(557.4),'z1':MZ(613.3),'x2':MX(673.0),'z2':MZ(586.8),'south':True},   # onder
    {'x1':MX(528.6),'z1':MZ(169.8),'x2':MX(611.6),'z2':MZ(140.1),'south':False},  # boven
]
inbouwkast = [
    {'x1':MX(719.3),'z1':MZ(257.7),'x2':MX(738.5),'z2':MZ(171.0)},
    {'x1':MX(738.5),'z1':MZ(257.7),'x2':MX(759.4),'z2':MZ(171.0)},
]
# labels
labels=[]
name_map={'keuken':'Keuken','badkamer':'Badkamer','trappenhal':'Traphal','hal':'Hal','living/leefruimte':'Living / Leefruimte'}
seen={}
for w in words:
    x0,y0,x1,y1,txt=w[0],w[1],w[2],w[3],w[4]
labels=[
    ('Keuken',MX(555),MZ(236)),('Slaapkamer 1',MX(660),MZ(236)),('Slaapkamer 2',MX(815),MZ(236)),
    ('Inbouwkasten',MX(739),MZ(215)),('Badkamer',MX(688),MZ(361)),('Hal',MX(707),MZ(420)),
    ('Traphal',MX(796),MZ(372)),('Living / Leefruimte',MX(623),MZ(495)),
]

PLAN={'W':9.156,'D':MZ(169.8),'walls':walls,'floors':floors,'terras':terras,'inbouwkast':inbouwkast,'labels':labels}
open('plandata.js','w').write('const PLAN = '+json.dumps(PLAN)+';\n')
print('W',PLAN['W'],'D',PLAN['D'],'walls',len(walls),'floors',len(floors))
print('sample wall',walls[0])

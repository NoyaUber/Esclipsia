"""Generates data/maps/ashenveil_village.json — Phase 2 Ashenveil map (40x30 tiles).

Layers
  ground : terrain tiles (some solid, e.g. water)
  decor  : non-solid ground decoration drawn over terrain
  objects: static y-sorted world objects (types in data/objects.json), pixel positions
  npcs / interactables / spawns: gameplay data, kept apart from visuals
Run: python3 tools/build_ashenveil_map.py
"""
import json, os, random

W, H, T = 40, 30, 16
random.seed(20261123)
ground = [['g'] * W for _ in range(H)]
decor = [['.'] * W for _ in range(H)]
objects = []
occupied = set()  # tiles blocked by objects (avoid overlaps when scattering)

def fill(layer, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            layer[y][x] = ch

def add(type_, tx, ty, variant=0, ox=0, oy=0, block=None, **extra):
    """Place an object with its top-left at tile (tx, ty) + pixel offset."""
    o = {'type': type_, 'x': tx * T + ox, 'y': ty * T + oy}
    if variant: o['variant'] = variant
    o.update(extra)
    objects.append(o)
    for b in (block or []):
        occupied.add(b)
    return o

def tree(tx, ty, variant=None):
    """Tree whose trunk stands on tile (tx, ty)."""
    if (tx, ty) in occupied: return
    add('tree', tx, ty - 1, random.randrange(3) if variant is None else variant, block=[(tx, ty)])

# ---------------- Terrain ----------------
# River (east), flowing north→south, with a bridge on the main east road.
for y in range(H):
    fill(ground, 31, y, 32, y, 'W')
fill(ground, 31, 15, 32, 16, 'B')

# West forest floor (small forest section, NW)
fill(ground, 0, 0, 12, 10, 'G')
# Winding dark-soil trail through the forest to a clearing with a shrine stone
for (x, y) in [(12, 8), (11, 8), (10, 8), (10, 7), (9, 7), (8, 7), (8, 6), (7, 6), (6, 6), (5, 6), (5, 5), (12, 9), (13, 9), (13, 10)]:
    ground[y][x] = 'd'
fill(ground, 3, 3, 6, 5, 'd')

# Ruined structure (north centre): cracked stone courtyard
fill(ground, 13, 2, 24, 7, 's')
# Main pathway: stone path from the ruins to the plaza, dirt road to the south gate
fill(ground, 18, 8, 19, 11, 's')
fill(ground, 14, 12, 23, 17, 'p')   # village plaza
fill(ground, 18, 18, 19, H - 1, 'r')
# East–west village road
fill(ground, 2, 15, 13, 16, 'r')
fill(ground, 24, 15, 30, 16, 'r')
fill(ground, 33, 15, 37, 16, 'r')
# Southern lane for the south houses
fill(ground, 10, 24, 17, 24, 'r')
fill(ground, 20, 24, 26, 24, 'r')
# House door paths
for (x, y0, y1) in [(5, 14, 14), (11, 14, 14), (26, 13, 14), (11, 23, 23), (26, 23, 23)]:
    fill(ground, x, y0, x, y1, 'r')
# Farm: tilled dark soil
fill(ground, 3, 20, 7, 25, 't')
# East clearing
fill(ground, 33, 9, 37, 22, 'G')
fill(ground, 33, 15, 37, 16, 'r')

# ---------------- Objects ----------------
# Houses (80x64 = 5x4 tiles). Door is the centre tile of the bottom row.
houses = [
    ('house_west', 3, 11, 0), ('house_mill', 9, 11, 1),
    ('house_elder', 24, 10, 2), ('house_south', 9, 20, 1), ('house_smith', 24, 20, 0),
]
for hid, hx, hy, var in houses:
    add('house', hx, hy, var, id=hid, block=[(hx + i, hy + j) for i in range(5) for j in range(4)])

# Ruined chapel (Forgotten Chapel exterior) + broken pillars and walls
add('chapel_ruin', 16, 2, id='forgotten_chapel', block=[(16 + i, 2 + j) for i in range(5) for j in range(4)])
for (x, y, v) in [(14, 4, 0), (22, 4, 1), (14, 7, 1), (23, 7, 0)]:
    add('pillar', x, y - 1, v, block=[(x, y)])
add('ruin_wall', 13, 2, 0, oy=4, block=[(13, 2), (14, 2), (13, 3), (14, 3)])
add('ruin_wall', 22, 2, 1, oy=4, block=[(22, 2), (23, 2), (22, 3), (23, 3)])
for (x, y) in [(15, 6), (21, 6), (13, 5), (24, 5), (16, 7)]:
    decor[y][x] = 'x'

# Plaza: well, notice board, lamps
add('well', 18, 13, oy=-8, id='village_well', block=[(18, 13)])
add('noticeboard', 15, 12, oy=-8, id='notice_board', block=[(15, 12), (16, 12)])
for (x, y) in [(14, 12), (23, 12), (14, 17), (23, 17)]:
    add('lamp', x, y - 1, block=[(x, y)])

# Farm fence (opening at the top for the gate) and props
for x in range(2, 9):
    if x != 5: add('fence_h', x, 19, block=[(x, 19)])
    add('fence_h', x, 26, block=[(x, 26)])
for y in range(20, 26):
    add('fence_v', 2, y, block=[(2, y)])
    add('fence_v', 8, y, block=[(8, y)])
# Barrels & crates beside houses
for (t, x, y) in [('barrel', 8, 13), ('crate', 2, 13), ('barrel', 29, 12), ('crate', 29, 13),
                  ('barrel', 14, 21), ('crate', 23, 22), ('barrel', 29, 22)]:
    add(t, x, y, block=[(x, y)])

# Village entrance (south gate): pillars and a sign
add('pillar', 17, 26, 0, block=[(17, 27)])
add('pillar', 20, 26, 1, block=[(20, 27)])
add('sign', 21, 27, id='sign_entrance', block=[(21, 27)])
# East road sign by the fallen trees
add('sign', 36, 14, id='sign_east', block=[(36, 14)])
add('stump', 37, 15, block=[(37, 15)])
add('stump', 37, 16, block=[(37, 16)])

# Forest shrine stone in the clearing
add('shrine_stone', 4, 3, oy=-8, id='shrine_stone', block=[(4, 3)])

# Large old tree in the forest
add('tree_large', 8, 2, oy=-8, block=[(8, 3), (9, 3), (8, 2), (9, 2)])

# Reserve NPC standing tiles and spawn tiles so nothing is scattered onto them
for t in [(21, 13), (7, 18), (5, 18), (16, 16), (16, 26), (19, 18), (18, 28), (18, 7)]:
    occupied.add(t)

# ---------------- Forest border & scattered trees ----------------
keep_clear = set()
for x in (18, 19):
    for y in range(26, H): keep_clear.add((x, y))      # south entrance
for x in range(W):
    for y in range(H):
        if ground[y][x] in ('W', 'B'): keep_clear.add((x, y))

for y in range(H):
    for x in range(W):
        if (x, y) in keep_clear: continue
        edge = min(x, y, W - 1 - x, H - 1 - y)
        if edge == 0 or (edge == 1 and random.random() < 0.85):
            tree(x, y)

# Dense-ish forest section in the NW (avoid trail and clearing)
for y in range(1, 11):
    for x in range(1, 13):
        if ground[y][x] in ('d',) or (x, y) in occupied: continue
        if 3 <= x <= 6 and 2 <= y <= 6: continue
        if random.random() < 0.42: tree(x, y)
# East clearing edge trees and rocks
for y in range(2, 28):
    for x in range(33, 39):
        if ground[y][x] in ('r',) or (x, y) in occupied or (x, y) in keep_clear: continue
        if y in (14, 15, 16, 17): continue
        if random.random() < (0.5 if (y < 9 or y > 22) else 0.12): tree(x, y)
# Trees in the south-east and south-west corners
for (x0, y0, x1, y1) in [(1, 27, 15, 28), (22, 26, 30, 28), (27, 2, 30, 8)]:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) in occupied or ground[y][x] not in ('g', 'G'): continue
            if random.random() < 0.55: tree(x, y)

# Rocks, bushes and stumps scattered on free grass
def free(x, y):
    return (x, y) not in occupied and ground[y][x] in ('g', 'G') and decor[y][x] == '.'
for _ in range(26):
    x, y = random.randrange(2, 38), random.randrange(2, 28)
    if free(x, y) and not (13 <= x <= 24 and 11 <= y <= 18):
        kind = random.choice(['rock', 'bush', 'bush', 'rock', 'stump'])
        add(kind, x, y, random.randrange(2) if kind in ('rock', 'bush') else 0, block=[(x, y)])

# Foreground canopies overhanging the forest trail (drawn above Kael)
for (x, y, v) in [(9, 5, 0), (5, 7, 1), (11, 9, 0)]:
    add('canopy', x, y, v, ox=-8, oy=-12)

# ---------------- Decorations ----------------
for _ in range(140):
    x, y = random.randrange(1, 39), random.randrange(1, 29)
    if ground[y][x] in ('g', 'G') and (x, y) not in occupied and decor[y][x] == '.':
        decor[y][x] = random.choice([',', ',', ',', '*', 'o', 'm' if ground[y][x] == 'G' else '*'])
# Tall grass patches (future encounter zones)
for (cx, cy, r) in [(35, 19, 2), (27, 26, 1), (10, 27, 1)]:
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 < x < W - 1 and 0 < y < H - 1 and ground[y][x] in ('g', 'G') and (x, y) not in occupied:
                decor[y][x] = ','

legend = {
    'ground': {
        'g': {'tile': 'grass', 'solid': False},
        'G': {'tile': 'grass_dark', 'solid': False},
        'r': {'tile': 'dirt', 'solid': False},
        's': {'tile': 'stone_path', 'solid': False},
        'p': {'tile': 'plaza', 'solid': False},
        'd': {'tile': 'dark_soil', 'solid': False},
        't': {'tile': 'tilled_soil', 'solid': False},
        'W': {'tile': 'water', 'solid': True},
        'B': {'tile': 'bridge', 'solid': False},
    },
    'decor': {
        '.': None,
        ',': {'tile': 'tall_grass'},
        '*': {'tile': 'flowers'},
        'o': {'tile': 'pebbles'},
        'm': {'tile': 'mushrooms'},
        'x': {'tile': 'rubble'},
    },
}
legend['decor'] = {k: v for k, v in legend['decor'].items() if v}

npcs = [
    {'id': 'elder_maren', 'name': 'Elder Maren', 'look': 'elder', 'x': 21, 'y': 13, 'facing': 'down',
     'lines': ['Kael. The sky burns redder each dusk.', 'The Forgotten Chapel to the north has been sealed since before I was born.', 'Stay close to the village for now, child.']},
    {'id': 'farmer_tobin', 'name': 'Tobin', 'look': 'farmer', 'x': 7, 'y': 18, 'facing': 'left',
     'lines': ['These ash-grey turnips are all that grow anymore.', 'Something has been digging through my field at night...']},
    {'id': 'lira', 'name': 'Lira', 'look': 'child', 'x': 16, 'y': 16, 'facing': 'right',
     'lines': ['Kael! Can you really hear the souls of monsters?', 'I saw a shadow with glowing eyes near the old trees!']},
    {'id': 'guard_doran', 'name': 'Doran', 'look': 'guard', 'x': 16, 'y': 26, 'facing': 'right',
     'lines': ['Halt— oh, it is you, Kael.', 'The south road is quiet. Too quiet, since the Shattering storms began.']},
]

interactables = [
    {'id': 'sign_entrance', 'name': 'Signpost', 'x': 21, 'y': 27, 'lines': ['ASHENVEIL', 'Last light of the Forgotten Kingdom.']},
    {'id': 'sign_east', 'name': 'Signpost', 'x': 36, 'y': 14, 'lines': ['East Road — Mourningfen', 'The road is blocked by fallen trees.']},
    {'id': 'village_well', 'name': 'Village Well', 'x': 18, 'y': 13, 'lines': ['The water far below glimmers with a faint red light.']},
    {'id': 'notice_board', 'name': 'Notice Board', 'x': 15, 'y': 12, 'w': 2, 'lines': ['"Curfew at dusk by order of the Elder."', '"Missing: one goat. Answers to Bram."']},
    {'id': 'chapel_gate', 'name': 'Forgotten Chapel', 'x': 18, 'y': 5, 'lines': ['A heavy door sealed by a strange violet sigil.', 'It does not move.']},
    {'id': 'shrine_stone', 'name': 'Shrine Stone', 'x': 4, 'y': 3, 'lines': ['Ancient runes are carved into the moss-covered stone.', 'You feel a faint pulse of Aether.']},
]
for hid, hx, hy, _ in houses:
    interactables.append({'id': f'{hid}_door', 'name': 'Door', 'x': hx + 2, 'y': hy + 3, 'lines': ['The door is locked.']})

data = {
    'id': 'ashenveil_village',
    'name': 'Ashenveil Village',
    'region': 'ashenveil',
    'regionName': 'Ashenveil',
    'regionTitle': 'The Forgotten Kingdom',
    'tileSize': T,
    'width': W,
    'height': H,
    'legend': legend,
    'layers': {
        'ground': [''.join(r) for r in ground],
        'decor': [''.join(r) for r in decor],
    },
    'objects': objects,
    'npcs': npcs,
    'interactables': interactables,
    'spawns': {
        'village_start': {'x': 19, 'y': 18, 'facing': 'down'},
        'village_entrance': {'x': 18, 'y': 28, 'facing': 'up'},
        'chapel_exit': {'x': 18, 'y': 7, 'facing': 'down'},
    },
}
out = os.path.join(os.path.dirname(__file__), '..', 'data', 'maps', 'ashenveil_village.json')
with open(out, 'w') as f:
    json.dump(data, f, indent=1)
print(f'objects={len(objects)} npcs={len(npcs)} interactables={len(interactables)}')
for gr, dr in zip(data['layers']['ground'], data['layers']['decor']):
    print(gr, ' ', dr)

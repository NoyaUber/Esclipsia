# Eclipsia: Shattered World

An original 2D dark fantasy monster-collection RPG built with HTML5 Canvas and vanilla JavaScript (ES Modules). No frameworks, no build step, fully offline-capable (PWA).

**Current status: Phase 2 — Player, Mobile Controls & World Exploration (v0.2.0)**

## Run locally

ES Modules and `fetch()` need an HTTP server (opening `index.html` via `file://` will not work).

```bash
# any static server works, for example:
python3 -m http.server 8000
# or
npx serve .
```

Open <http://localhost:8000>.

## Controls

| Action | Desktop | Android / touch |
| --- | --- | --- |
| Move / navigate | WASD or arrow keys | On-screen D-pad (slide between arrows) |
| Confirm / interact / next line | Z, Enter, Space | A button, or tap a menu item |
| Cancel / back / close dialogue | X, Esc, Backspace | B button |
| Open / close pause menu | Tab, Esc | MENU button |

Keyboard and touch feed the same unified actions (`UP, DOWN, LEFT, RIGHT, CONFIRM, CANCEL, MENU`) in `InputManager`. Touch uses Pointer Events with per-pointer tracking (hold a direction and press A at the same time). Inputs held while a menu/dialogue opens or closes are ignored until released, so nothing repeats or leaks between screens. Touch controls appear automatically when touch input is detected; this can be forced on or off in **Settings → Touch Controls**, and sized in **Settings → Control Size**. In portrait on a touch device the game pauses and asks to rotate.

## Architecture

```
index.html, manifest.json, service-worker.js, vercel.json
css/        main (palette/base), layout (16:9 letterbox), ui (boot/error), menus, mobile (touch controls)
js/main.js  bootstrap, error screen, service worker registration
js/core/    Game, GameLoop (fixed 60 Hz), Renderer (320x180 back buffer), SceneManager,
            InputManager (action mapping), TouchControls, AssetManager, Camera, AudioManager, Settings
js/scenes/  Scene (base), MainMenuScene, OverworldScene, UIScene (pause overlay)
js/entities Player (Kael, 16x24), NPC (data-driven villagers), CharacterConstants
js/render/  PlaceholderArt (procedural original pixel art: tiles, objects, characters, backdrops)
js/ui/      MenuList, SettingsPanel, InteractionIndicator, DialogueBox (Phase 2 placeholder)
js/utils/   MathUtils, DataUtils (JSON validation)
js/systems/ CollisionSystem (tiles + object hitboxes + NPC bodies), InteractionSystem
data/       objects.json (object types: size, variants, hitbox, layer)
data/maps/  ashenveil_village.json (40x30: ground + decor layers, objects, npcs, interactables, spawns)
assets/     icons (PWA); characters/monsters/tilesets/... reserved for final art
tools/      build_ashenveil_map.py (regenerates the village map JSON)
```

Key design rules:

- **Rendering**: all pixel art is drawn into a 320×180 back buffer and scaled with nearest-neighbour (integer scale when it wastes <15% of the screen). Text is drawn at native resolution in logical coordinates for readability on phones. Stacked scenes are composited as separate layers.
- **Input**: gameplay asks for actions (`confirm`, `up`), never keys. Each action tracks multiple sources, so overlapping inputs never double-fire.
- **Scenes**: `change()` swaps the stack with a fade transition and input lock; `push()/pop()` handle overlays.
- **Data**: maps are JSON and validated on load (`DataUtils.validateMap` / `validateObjectTypes`). Ground + decoration layers are pre-rendered once; objects, NPCs and the player are y-sorted by their feet line each frame; `foreground` objects (canopies) draw above characters. Collision data (legend `solid`, object `hitbox`) is separate from rendering.
- **Map editing**: edit `tools/build_ashenveil_map.py` and run `python3 tools/build_ashenveil_map.py`.
- **Offline**: the service worker precaches the app shell. Bump `CACHE_VERSION` in `service-worker.js` whenever shipped files change, and add new files to `PRECACHE`.

## Development phases

1. Core foundation — **done**
2. Player, mobile controls & exploration — **done (awaiting review)**
3. World interaction (NPCs, dialogue, transitions, quests)
4. Eidolon system (database, encounters, capture, party/storage)
5. Battle system
6. Progression (EXP, evolution, inventory, save/load)
7. Story content (prologue, Forgotten Chapel, first boss)
8. Polish & release

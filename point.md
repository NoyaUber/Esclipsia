# ECLIPSIA: SHATTERED WORLD — PROJECT HANDOFF

Project version: 1.1.0  
Current phase: Phase 7 — Step 5: Forgotten Chapel Dungeon Foundation  
Completed phases: Phase 1–6; Phase 7 Steps 1–5  
Technology: HTML5, CSS3, Vanilla JavaScript ES Modules, Canvas API  
Logical resolution: 320×180 · Target 60 FPS · Primary Android landscape · Secondary Windows

## Continuation rules

Read this file and inspect the project before changing code. Preserve Phases 1–6 and Phase 7 Steps 1–5. Implement only the next scope explicitly approved by the user. Stop at Step 5; do not implement Step 6 puzzles, boss battle, dungeon completion story, other dungeons/regions, World Map UI or Quest Journal UI without approval. Do not claim physical-device tests that were not run.

## Existing architecture (verified)

- `Game` is the composition root; services are exposed through `game.*`.
- `SceneManager` changes the active OverworldScene for map/room transitions and pushes BattleScene as an overlay.
- `OverworldScene` loads map JSON through `AssetManager`, pre-renders ground/decor into cached canvases, y-sorts objects/NPC/player and culls off-screen static objects.
- Existing systems: `Player`, `InputManager`, `TouchControls`, `Camera`, `CollisionSystem`, `NPC`, `InteractionSystem`, `DialogueBox`, `EncounterSystem`, `BattleManager`, `BattleResultManager`.
- There is no dedicated `MapManager`, `PlayerManager`, `CameraManager`, `SaveManager`, `InventoryManager` or `DialogueManager`. Do not create duplicates. `EidolonManager` owns the save adapter, inventory, Eidolon state, party/storage, StoryFlagManager, quest snapshot, world-state snapshot, world session and dungeon snapshot.
- `WorldStateManager` persists registered object/location state. CollisionSystem has static map collision and dynamic NPC bodies, but no dynamic door collider toggling.
- `AssetManager` caches fetched JSON and generated image/canvas assets. Room maps are loaded on entry, then cached.

## Phase 7 Step 1 — Quest Foundation

- `js/data/quests.js` defines quest configuration.
- `QuestManager` handles registration/lookup, LOCKED / AVAILABLE / ACTIVE / COMPLETED / FAILED, prerequisites and duplicate protection.
- `StoryFlagManager` persists boolean flags and notifies subscribers.

## Phase 7 Step 2 — Objectives & Rewards

- `GameEventBus` is the synchronous event contract; `QuestObjectiveTracker` consumes typed objective events.
- Supported objective types: TALK_TO_NPC, VISIT_LOCATION, DEFEAT_EIDOLON, COLLECT_ITEM, FIND_OBJECT, COMPLETE_DUNGEON and ACTIVATE_MECHANISM.
- COLLECT_ITEM counts positive acquisition events, not inventory totals. Loading inventory does not emit acquisition events.
- Optional, sequential and multiple objectives are supported; duplicate event IDs are guarded and progress is persisted.
- `QuestRewardManager` uses existing EidolonManager inventory/currency and ExperienceManager; claims are idempotent and rollback on save failure.

## Phase 7 Step 3 — World State

- `WorldStateManager` supports DOOR, CHEST, MECHANISM, NPC and LOCATION states.
- Safe declarative condition evaluator supports all/any/not, storyFlag, questStatus, itemOwned, objectState and event. No eval/Function.
- Completing `qst_echoes_beneath_ash` applies the configured rule to set `chapel_gate_unlocked`, open logical chapel gate and update NPC state.
- World object states and applied event IDs persist.

## Phase 7 Step 4 — Ashenveil World Expansion

| Map ID | Size | World pixels |
|---|---:|---:|
| `ashenveil_village` | 40×30 | 640×480 |
| `ashenveil_forest` | 64×48 | 1024×768 |
| `forgotten_chapel_entrance` | 32×24 | 512×384 |

- Village retains four NPCs and adds Edrick, Seren and Darian. Forest has branching paths, trees/rocks/bushes, Ancient Altar, hidden chest, three persistent Herb patches and an encounter zone. Chapel Entrance is the exterior map.
- Village ↔ Forest ↔ Chapel exterior transitions use named spawns. Existing OverworldScene/SceneManager/Camera/CollisionSystem/InputManager/TouchControls are reused.
- Forest encounter rolls after at least 48px movement inside its configured zone; stationary players do not roll. BattleScene/BattleManager are reused.
- Existing `worldSession` saves current map and player position.

## Phase 7 Step 5 — Dungeon Foundation

### Systems

- Added `js/systems/DungeonManager.js` and `js/systems/DungeonRoomManager.js`.
- `DungeonRoomManager`: register rooms, lookup by ID, list by dungeon, resolve map ID; validates unique map IDs and spawn records.
- `DungeonManager`: register dungeon, `loadDungeon`/`enterDungeon`, exit, room lookup, access checks, room transition, discovered/current room tracking, room state, unlocked connections, entry state, completion state, save snapshot/restore, and `DUNGEON_COMPLETED` event.
- Room connection validation checks source/target room IDs and destination spawn IDs. Access checks use the existing safe WorldState condition evaluator.
- `Game` creates exactly one DungeonManager after WorldStateManager and QuestManager. No parallel Map/Player/Camera/Save manager was introduced.

### Six playable room maps

All use the existing map JSON schema, 16×16 tiles, and 24×18 dimensions (384×288 world pixels):

1. `chapel_room_01_entrance` — safe orientation room, Main Hall passage and return exit to Chapel exterior.
2. `chapel_room_02_main_hall` — branching paths, altar-like shrine and old bench/shelf placeholder props.
3. `chapel_room_03_library` — broken shelf rows and inspectable Weathered Chronicle.
4. `chapel_room_04_sanctuary` — ruined worship chamber, inscription, Main Hall/Library/Sealed Chamber/Ancient Sanctum routes and low-rate encounter zone.
5. `chapel_room_05_sealed_chamber` — gated branch, persistent room state and sealed door reserved for Step 6 puzzle.
6. `chapel_room_06_ancient_sanctum` — ancient structure and inspectable Ancient Conduit; connected by a side aisle so all six rooms can be explored before puzzle content.

Room definitions live in `js/data/dungeons.js`; map geometry lives in `data/maps/chapel_room_*.json`. Each room defines unique ID, dungeon ID, display name, map ID, connections, entry/exit points, spawn points, interactable IDs, encounter definitions and room world-state defaults.

### Transition / state flow

- The exterior chapel door carries `enterDungeon` metadata. DungeonManager requires `chapel_gate_unlocked` before entry.
- Each room exit carries destination map, destination spawn, dungeon ID, room ID and connection ID. DungeonManager validates the edge and spawn before SceneManager changes scenes.
- SceneManager fade/busy state locks input; `InputManager.releaseAll()` clears held input. A transition guard prevents repeated activation. New OverworldScene builds the Player and Camera at the named spawn.
- Room 01 can exit to `forgotten_chapel_entrance`; every other room can return through the graph to Room 01. Sealed Chamber is an optional branch; it has a return route. Ancient Sanctum is reachable from Sanctuary through a side passage.
- `LOCATION_VISITED` on room map entry feeds VISIT_LOCATION. Inspectable room objects emit OBJECT_FOUND and update room/world state. `DungeonManager.completeDungeon()` persists completion and emits DUNGEON_COMPLETED for QuestObjectiveTracker.
- Completion is an API/event contract only; no boss, puzzle or normal gameplay completion trigger is implemented in Step 5.

### Battle integration

- Broken Sanctuary encounter zone uses the new `forgotten_chapel` table in `js/data/encounters.js`.
- Existing EncounterSystem rolls species, `EidolonManager.startEncounterFromRoll` creates the encounter, and BattleScene/BattleManager/BattleResultManager resolve it.
- BattleScene is pushed as an overlay. Underlying OverworldScene, room, player and camera remain alive. Position is saved before battle; existing EIDOLON_DEFEATED events remain available to quests.
- No new battle AI, battle manager or boss was added.

### Save compatibility

- Existing localStorage key remains `eclipsia.phase4`.
- `EidolonSaveAdapter` writes envelope version 7 and accepts versions 1–7. v1–v6 data is upgraded when saved.
- New `dungeonState` stores current dungeon/room, entry state, discovered rooms, persistent room states, unlocked connections and completion records. `worldSession` stores current map and player position.
- Static map geometry is not copied into saves.

### Performance / input

- Map JSON and rendered room canvases load on room entry and are cached by AssetManager. Six 384×288 RGBA canvases represent about 2.53 MiB of raw pixel storage if all are visited/cached; actual browser memory overhead varies.
- No per-room DOM event listeners were added. Existing WorldState subscription is removed in OverworldScene.exit; DungeonManager's one game-lifetime OBJECT_FOUND listener is released by `destroy()`.
- Android physical touch controls, Windows real-browser keyboard controls, Android FPS and device memory were not tested in this environment. InputManager and TouchControls remain the shared control path.

## Known limitations / blockers

1. Step 4's Main Quest objective still targets `guardian_eidolon`, but there is no species or encounter with that ID. A fresh playthrough therefore cannot normally complete the Main Quest and set `chapel_gate_unlocked`. Dungeon entry is intentionally gated by that flag; automated tests set it explicitly. Step 5 does not bypass the story gate or add a boss.
2. The Sealed Chamber's inner door requires `chapel_inner_seal_open`, which has no setter in Step 5. This is deliberate preparation for Step 6; no puzzle is implemented.
3. `completeDungeon()` is available and persists/emits the quest event, but no in-game trigger calls it yet.
4. Dynamic physical door collider toggling remains unsupported; exits are interaction markers.
5. No Android/Windows real-device testing or device FPS/memory profiling was performed. Node map validation/collision timing is not a device FPS measurement.

## Tests executed

All passed after Step 5:

```bash
node --experimental-default-type=module tools/test_phase4.mjs
node --experimental-default-type=module tools/test_phase5.mjs
node --experimental-default-type=module tools/test_phase6.mjs
node --experimental-default-type=module tools/test_phase7_step1.mjs
node --experimental-default-type=module tools/test_phase7_step2.mjs
node --experimental-default-type=module tools/test_phase7_step3.mjs
node --experimental-default-type=module tools/test_phase7_step4.mjs
node --experimental-default-type=module tools/test_phase7_step5.mjs
```

Step 5 test covers six map schemas/dimensions, spawn collision clearance, room graph and destination spawn consistency, gated entry, room transitions, return/exit, discovered rooms, room-state persistence, v7 save restore, WorldState/Quest event contracts, existing encounter/battle pipeline and SceneManager overlay preservation. Physical Android/Windows input tests are not included.

## Stop point

Phase 7 Step 5 is complete. Stop and wait for explicit instruction before Phase 7 Step 6. Do not implement puzzles, boss battles, dungeon completion story, other dungeons, other regions, World Map UI or Quest Journal UI proactively.

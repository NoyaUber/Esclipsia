# Eclipsia: Shattered World

An original 2D dark-fantasy monster-collection RPG built with HTML5 Canvas and vanilla JavaScript ES Modules. Logical resolution: **320 × 180**, target: **60 FPS**, primary platform: Android landscape, secondary: Windows. No framework or build step is required.

**Current status: Phase 7, Step 5 — Forgotten Chapel Dungeon Foundation (v1.1.0).**

## Run locally

ES Modules and `fetch()` require an HTTP server; do not open `index.html` with `file://`.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Controls

| Action | Desktop | Android / touch |
|---|---|---|
| Move / navigate | WASD or arrow keys | On-screen D-pad |
| Confirm / interact / next line | Z, Enter, Space | A button / tap |
| Cancel / back | X, Esc, Backspace | B button |
| Pause menu | Tab, Esc | MENU button |

Battle menus use the same InputManager actions. The D-pad navigates battle commands; A confirms and B returns to the previous menu. Canvas taps select the visible battle menu rows. The battle scene is an overlay, so the overworld player and camera are preserved when battle ends.

## Phase 5 battle test

1. Start a new game. A fresh save receives a level 3 Emberling companion so the first battle is playable.
2. Open Pause → Eidolon Archive → Test Encounter.
3. Select **Begin Battle**.
4. Test Fight, Switch, Item, Soul Sigil capture and Flee.
5. Win a battle and inspect EXP / level progression in Eidolon Archive.

The existing Ashenveil Forest encounter table is used by the test encounter flow. Ashenveil Village, Ashenveil Forest and Forgotten Chapel Entrance are playable connected maps. Forest encounters are movement-distance based with a cooldown; they do not roll while the player stands still.

## Architecture

```
js/core/       Game, GameLoop, Renderer, SceneManager, InputManager, TouchControls
js/scenes/     MainMenuScene, OverworldScene, UIScene, BattleScene
js/battle/     BattleManager, BattleStateMachine, TurnManager, DamageCalculator,
               EnemyAI, BattleResultManager
js/data/       eidolons, encounters, soulSigils, skills, quests, elementalChart,
               statusEffects, battleBalance, progressionConfig, experienceCurves,
               skillLearning, evolutions, evolutionItems, questRewards, worldState
js/systems/    EidolonManager, EidolonInstance, PartyManager, StorageManager,
               BestiaryManager, EncounterSystem, CaptureSystem, EidolonSaveAdapter,
               StoryFlagManager, QuestManager, GameEventBus,
               QuestObjectiveTracker, QuestRewardManager, WorldStateManager,
               SkillSystem, ElementSystem, StatusEffectSystem, StatGrowthSystem,
               ExperienceManager, LevelUpManager, SkillLearningManager, EvolutionManager
js/ui/         MenuList, SettingsPanel, DialogueBox, InteractionIndicator, EidolonUI,
               LevelUpUI, SkillLearningUI, SkillReplacementUI, EvolutionUI, EvolutionAnimation
js/render/     PlaceholderArt, VisualEffects, EidolonArt, EidolonArtPhase4
data/maps/     ashenveil_village.json, ashenveil_forest.json, forgotten_chapel_entrance.json
tools/         build_ashenveil_map.py, test_phase4.mjs, test_phase5.mjs, test_phase6.mjs,
               test_phase7_step1.mjs, test_phase7_step2.mjs, test_phase7_step3.mjs
```

## Battle design notes

- One active Eidolon per side; party size remains four.
- Each species has four initial skill references. Skill definitions are centralized and immutable.
- Turn order uses action priority, then Speed, then a random tie-break for equal Speed.
- Damage is calculated centrally with accuracy, Physical/Special stats, element multipliers, variation, critical hits and defensive guard.
- Status effects: Burn, Poison, Freeze, Paralysis, Curse and Sleep. One major status is allowed at a time; duration and remaining turns are persisted for owned Eidolons.
- Items use the existing persisted Eidolon inventory object: Potion and Basic/Refined/Ancient Soul Sigils. A failed capture can be attempted again with a new action token during the same battle.
- Wild enemies are temporary battle objects. They enter owned instances only after successful capture.
- Victory awards EXP to participating owned Eidolons and may award configured Potion drops. Defeat restores the party to a configurable fraction of maximum HP.
- Battle state itself is temporary and is not written as an owned monster. Owned HP, status, EXP, inventory and captures use the existing `eclipsia.phase4` save namespace without replacing unrelated localStorage keys.

## Element chart clarification

The supplied proposal lists Light as both strong and weak against Shadow, and Shadow as both strong and weak against Light. This is contradictory. The current implementation follows the listed **strong** relationship in both directions (2×) and leaves the conflict documented for future balancing.

## Tests

```bash
node --experimental-default-type=module tools/test_phase4.mjs
node --experimental-default-type=module tools/test_phase5.mjs
node --experimental-default-type=module tools/test_phase6.mjs
node --experimental-default-type=module tools/test_phase7_step1.mjs
node --experimental-default-type=module tools/test_phase7_step2.mjs
node --experimental-default-type=module tools/test_phase7_step3.mjs
node --experimental-default-type=module tools/test_phase7_step4.mjs
```

The tests cover Phase 4 collection/persistence, Phase 5 battle/counterattack behavior, Phase 6 progression/evolution, and Phase 7 quest lifecycle, objective events, reward transactions, world-state conditions/events, persistence and legacy migration. See [`point.md`](point.md) for exact test evidence and remaining limitations.

## Development phases

1. Core foundation — implemented
2. Player, mobile controls & exploration — implemented
3. NPC, dialogue & interaction — implemented
4. Eidolon system & monster collection — implemented
5. Turn-based battle system — foundational implementation added; device/browser verification remains
6. Eidolon progression & evolution — implemented; device verification pending
7. Story content — not started
8. Polish & release — not started

**Only continue to Phase 7 Step 6 or later after explicit user approval.**


## Phase 6 progression

- Six derived stats (HP, Attack, Defense, Special Attack, Special Defense, Speed) are calculated by StatGrowthSystem from species base stats and growth parameters.
- EXP curves (Fast, Medium, Slow) are centralized in data/experienceCurves.js. Victory EXP is awarded through ExperienceManager and LevelUpManager, including multiple level-ups and overflow preservation.
- New skills are learned from data/skillLearning.js. When all four slots are occupied, the skill remains pending until the player replaces a selected skill, declines it, or defers the choice.
- Grimfang has two evolution paths: Dreadwolf at level 20, or Moonwraith using a Shadow Crystal. Evolution preserves instanceId, nickname, level, EXP, party/storage membership and records history.
- Evolution items are in data/evolutionItems.js. A development Shadow Crystal is present in a save that does not already define the item; additional cores are defined but not initially granted.
- Eidolon save envelope version 5 accepts versions 1–4 and preserves the existing eclipsia.phase4 localStorage key; unrelated localStorage keys are untouched.
- Progression, pending skill choices and evolution are accessible in Pause → Eidolon Archive → Progress.


## Phase 7 — Step 1: Quest System Foundation

- `js/data/quests.js` contains a small immutable set of quest definitions. Objectives and rewards are schema placeholders; no objective tracker or reward delivery engine is implemented.
- `js/systems/QuestManager.js` provides ID registration/lookup, LOCKED / AVAILABLE / ACTIVE / COMPLETED / FAILED lifecycle, prerequisite checks (completed quest IDs and story flags), duplicate registration protection, and accept-once behavior.
- `js/systems/StoryFlagManager.js` provides persistent boolean story flags and change subscriptions.
- `Game` exposes `game.quests`; QuestManager shares `game.eidolons.inventory` by reference and does not create a second inventory.
- At the end of Step 1, the existing `eclipsia.phase4` save namespace remained unchanged and the envelope wrote version 5; later Phase 7 steps migrated it forward. Quest states and story flags are stored alongside existing Eidolon data.
- Dialogue remains presentation-only through `DialogueBox`; a dedicated DialogueManager does not exist yet. Quest definitions are not yet triggered by dialogue.
- Step 1 did not include Quest Journal UI, objective progression, reward delivery, Dungeon or World Map systems.


## Phase 7 — Step 2: Quest Objectives & Rewards

- `QuestObjectiveTracker` consumes typed events from `GameEventBus`; it supports TALK_TO_NPC, VISIT_LOCATION, DEFEAT_EIDOLON, COLLECT_ITEM, FIND_OBJECT, COMPLETE_DUNGEON and ACTIVATE_MECHANISM. Objective definitions are configuration in `data/quests.js`, including target, required amount, optional and sequence fields.
- `COLLECT_ITEM` counts positive acquisition deltas, not the current inventory total. `EidolonManager.addInventoryItem` is the acquisition adapter and accepts an idempotency token; battle drops use stable battle/item tokens. Loading or synchronizing inventory never emits acquisition events.
- Required objectives complete a quest automatically; optional objectives do not block completion. Sequential objectives use their `sequence` value; unsequenced objectives can progress independently. Progress and processed event IDs are saved.
- `QuestRewardManager` grants Aether Shards, Eidolon EXP and catalogued inventory items using the existing `EidolonManager.inventory` and `ExperienceManager`. EXP is awarded to the party using the existing ExperienceManager behavior. Reward delivery is synchronous and idempotent; a failed save rolls back in-memory inventory, currency, Eidolon EXP and claim state.
- Inventory has no capacity limit in the current project, so an inventory-full condition cannot currently occur. No separate InventoryManager was introduced. Aether Shards are a new persisted currency field.
- `NPC_TALKED`, `OBJECT_FOUND`, and `LOCATION_VISITED` are emitted by the existing Overworld/DialogueBox callback path. `EIDOLON_DEFEATED` and battle item drops are emitted by BattleResultManager. Dungeon completion and mechanism activation are available as event contracts on `game.events`, but no Dungeon or mechanism source system currently exists.
- There is no DialogueManager. The existing DialogueBox remains the presentation layer; the OverworldScene close callback acts as the NPC-talk adapter. Map visits are emitted on map entry, not on arbitrary sub-area movement.
- The two requested sample quests are configuration entries in `js/data/quests.js`: Echoes Beneath the Ash and A Healer's Request. Their sample target IDs are test/config data; matching Edrick, Seren, Ancient Altar and Guardian Eidolon world content is not asserted to exist in the current playable map.
- Automated test command: `node --experimental-default-type=module tools/test_phase7_step2.mjs`.


## Phase 7 — Step 3: World State Integration

- `js/systems/WorldStateManager.js` registers validated world-object IDs and supported states for DOOR, CHEST, MECHANISM, NPC and LOCATION. Definitions and quest-completion rules are configuration in `js/data/worldState.js`.
- Door states: LOCKED/CLOSED/OPEN; chest: CLOSED/OPENED/CLAIMED; mechanism: INACTIVE/ACTIVE; NPC: DEFAULT/QUEST_AVAILABLE/QUEST_ACTIVE/QUEST_COMPLETED/CUSTOM; location: UNDISCOVERED/DISCOVERED.
- The condition evaluator supports `all`, `any`, `not`, `storyFlag`, `questStatus`, `itemOwned`, `objectState` and typed `event` conditions. It never evaluates strings as code. Unknown/malformed operators fail closed.
- Completing `qst_echoes_beneath_ash` applies the configured world rule once: sets `chapel_gate_unlocked`, opens the logical chapel gate, and updates Elder Maren and Edrick world-state records. Edrick is a configured world-state record, not a live NPC in the current village map.
- Existing NPC and DialogueBox are reused. OverworldScene obtains state-aware dialogue from WorldStateManager and emits interaction events on dialogue close. Elder Maren's dialogue changes after the quest. There is no DialogueManager; DialogueBox remains the Phase 3 presentation component.
- At the end of Step 3, the village map-entry event discovered the registered village location; Step 4 adds the Forest and Chapel Entrance maps. The current chapel gate is a map interactable marker rather than a dynamic collision body, so OPEN is a persisted logical/interaction state; CollisionSystem does not yet dynamically remove a physical gate collider.
- Chest claim API marks CLAIMED only after a successful grant callback and supports rollback when save fails. No live chest reward interaction is placed in the map. Mechanism state supports event integration, but there is no live mechanism source.
- At the end of Step 3, `EidolonSaveAdapter` wrote envelope v6 and read v1–v6; the `eclipsia.phase4` key was unchanged.
- Automated test command: `node --experimental-default-type=module tools/test_phase7_step3.mjs`.


## Phase 7 — Step 4: Ashenveil World Expansion

- Three playable maps are available: Ashenveil Village (40×30), Ashenveil Forest (64×48), and Forgotten Chapel Entrance (32×24), all using 16×16 tiles.
- The existing OverworldScene, CollisionSystem, Camera, Player, InputManager, TouchControls, NPC, InteractionSystem and DialogueBox are reused. Map transitions replace the overworld scene and select a named destination spawn.
- Village adds Edrick, Seren and Darian without removing existing NPCs. Forest contains branching paths, trees/rocks/bushes, three persistent Herb patches, Ancient Altar, hidden chest and a Chapel Path. Its configured encounter zone rolls only after 48 pixels of player movement and respects EncounterSystem cooldown.
- Forest encounter checks occur only after player movement accumulates 48 world pixels; EncounterSystem cooldown remains active. Stationary players do not roll encounters. Existing BattleScene is reused.
- The Chapel exterior is reachable from the Forest; at the end of Step 4 the entrance door was only a gated interaction marker and no dungeon interior existed yet. Forest location visits and altar discovery emit the existing quest objective events. Chest state uses WorldStateManager and a one-time Potion claim.
- At Step 4, save envelope v6 stored `worldSession` (map ID and player position); the `eclipsia.phase4` key remained unchanged and v1–v5 envelopes were readable at that stage. Step 5 upgrades the envelope to v7 with `dungeonState`.
- Physical Android touch testing, Windows browser keyboard testing and device FPS profiling remain unverified in this environment.


## Phase 7 — Step 5: Forgotten Chapel Dungeon Foundation

- `DungeonManager` and `DungeonRoomManager` are the single dungeon/room registry. They register dungeons and rooms, validate room connections and destination spawns, gate access with the existing safe world-condition evaluator, track discovered/current rooms, room state, unlocked connections, entry/exit and completion state.
- There is no `MapManager`, `PlayerManager`, `CameraManager` or `SaveManager` in this project. Dungeon rooms use the existing map JSON schema, `AssetManager` JSON/canvas cache, `OverworldScene`, `Player`, `Camera`, `CollisionSystem`, `InputManager` and `TouchControls`. No duplicate manager was added.
- Six explorable 24×18 maps (16px tiles) are included: Entrance, Main Hall, Forgotten Library, Broken Sanctuary, Sealed Chamber and Ancient Sanctum. The Sealed Chamber is gated by the chapel story flag; its inner seal remains locked for the Step 6 puzzle. The Ancient Sanctum is reachable through a separate side aisle so all six foundation rooms can be explored without a puzzle.
- Room exits carry dungeon/room/connection/spawn IDs. DungeonManager validates the connection and target spawn before the scene transition. SceneManager handles the fade/input lock; the destination OverworldScene rebuilds Player and Camera at the named spawn. Room 01 has the return route to the Chapel exterior; all other rooms have a path back to Room 01.
- Room entry emits the existing `LOCATION_VISITED`; inspectable records emit `OBJECT_FOUND`; `DungeonManager.completeDungeon()` emits `DUNGEON_COMPLETED`. `QuestObjectiveTracker` consumes these existing objective contracts; no QuestManager was duplicated.
- The Broken Sanctuary has a low-rate `forgotten_chapel` encounter zone. It uses the existing EncounterSystem, species definitions, BattleScene, BattleManager and BattleResultManager. Battle remains an overlay, preserving the active room/player/camera; the overworld position is saved before battle.
- Save envelope v7 adds `dungeonState` while preserving `eclipsia.phase4`; v1–v6 saves are accepted. Map geometry remains static JSON and is not copied into saves.
- Map JSON and rendered canvases are loaded lazily on room entry and cached by AssetManager. The six 384×288 RGBA room canvases represent about 2.53 MiB of raw pixel storage if all six are visited/cached; browser overhead varies. No new per-room DOM listeners are registered.
- Known progression blocker remains from Step 4: the Main Quest's `guardian_eidolon` target has no configured species/encounter, so a fresh playthrough cannot normally set `chapel_gate_unlocked`. Dungeon entry remains correctly gated by that story flag; automated tests set the flag to exercise the dungeon. This Step does not add a boss or bypass story progression.
- Dungeon completion has a persistent API/event contract but no gameplay completion trigger yet; the boss/puzzle and actual completion trigger are reserved for later approved content. Android touch, Windows real-browser keyboard and physical-device FPS/memory testing remain unverified.
- Automated test: `node --experimental-default-type=module tools/test_phase7_step5.mjs`. Full regression suite also runs Phase 4, 5, 6 and Phase 7 Steps 1–4.

## Latest implementation update
See `IMPLEMENTATION_REPORT.md` for the forced Eidolon switch fix, battle UI changes, supplied character/monument assets, New Game prologue, and verification results. Run the new regression check with:

```bash
node --experimental-default-type=module tools/test_battle_switch_fix.mjs
```

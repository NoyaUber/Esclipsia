# Eclipsia: Shattered World — implementation update

## Scope
Updated the existing HTML/CSS/JavaScript Canvas project in place. No engine migration or replacement project was created.

## Changes

### 1. Forced Eidolon switch fix
- Added context-aware raw keyboard key tracking to `InputManager`.
- In the battle switch list, Windows `A` now confirms the selected Eidolon instead of being interpreted as the left navigation key; `B` cancels voluntary switching. The touch A/B buttons continue to use the shared confirm/cancel actions.
- Fixed the battle turn-resolution branch so a forced switch action is executed even when the outgoing active Eidolon has 0 HP. Previously, the player-action branch required `player.hp > 0`, which silently skipped the switch action and left the player trapped in the forced-switch flow.
- Added validation tests for one remaining reserve, attempting to select a defeated reserve, and having no surviving Eidolon.

### 2. Battle UI
- Reworked the battle backdrop and panel treatment with darker blue/violet surfaces and clearer accent hierarchy.
- Improved the switch list with level and HP information, and visually dims unavailable Eidolons.
- Added selected-skill detail readout for element, category, power, accuracy, energy cost, and description when the data provides those fields.
- Updated canvas tap hit positions to match the new menu layout.

### 3. Kael dialogue illustration
- Added the supplied first image byte-for-byte as `assets/characters/kael-dialogue.png`.
- Extended `DialogueBox` to support an optional portrait without distorting the source aspect ratio and to reserve text width beside it.
- The New Game prologue uses the Kael portrait as its character illustration.

### 4. Monument Easter Egg
- Added the supplied second image byte-for-byte as `assets/easter-eggs/lost-swordsman-original.jpg`.
- Added a custom monument display in Ashenveil Village using proportional rendering of the original image. The source file itself is unchanged.
- Added a discoverable interaction trigger. Interacting displays the original image alongside the exact inscription: **“Pendekar yang telah kehilangan jati dirinya.”**

### 5. New Game prologue and dialogue
- Added `PrologueScene` with six chapters: The World Before, The Seven Kingdoms, The Shattering, The Forgotten Age, Ashenveil, and The Beginning.
- Introduces Aether, Origin Core, the seven kingdoms, the Shattering, Eidolons, and Kael without explaining Soul Resonance in full.
- Uses persistent story flags and only launches from New Game when `prologue_completed` is not set. Continue does not launch it.
- Expanded existing Ashenveil conversations for Elder Maren, Edrick, Seren, and Darian without removing their original information.

## Files changed / added
- `js/core/InputManager.js`
- `js/core/Game.js`
- `js/battle/BattleManager.js`
- `js/scenes/BattleScene.js`
- `js/scenes/MainMenuScene.js`
- `js/scenes/OverworldScene.js`
- `js/scenes/PrologueScene.js` (new)
- `js/ui/DialogueBox.js`
- `data/maps/ashenveil_village.json`
- `assets/characters/kael-dialogue.png` (new, original supplied asset)
- `assets/easter-eggs/lost-swordsman-original.jpg` (new, original supplied asset)
- `tools/test_battle_switch_fix.mjs` (new)
- `IMPLEMENTATION_REPORT.md` (new)

## Tests run
- New battle-switch regression test: passed.
- Phase 4 test suite: passed.
- Phase 5 test suite: passed.
- Phase 6 test suite: passed.
- Phase 7 Steps 1–5 test suites: passed.
- `node --check` across all JavaScript files: passed.
- SHA-256 verification confirms both committed image assets are byte-identical to the uploaded originals.

## Not verified in this environment
- No live browser/device session was available, so Android touch layout and Windows keyboard interaction were not manually play-tested in an actual game window.
- Battle UI visual balance, dialogue portrait placement, and monument discoverability still need a visual smoke test on a small landscape Android display.
- The project has no supplied scene-specific painted backgrounds for each prologue chapter; the prologue uses the existing Canvas renderer, atmosphere, text panels, and Kael portrait rather than inventing replacement art.
- No claim is made that every regression item in the master prompt was manually tested. The automated tests above cover the existing project suites and the new forced-switch cases.

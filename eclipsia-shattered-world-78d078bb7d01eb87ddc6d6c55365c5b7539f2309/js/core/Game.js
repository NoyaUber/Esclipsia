import { Renderer, PALETTE, LOGICAL_WIDTH as W } from './Renderer.js';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { TouchControls } from './TouchControls.js';
import { AssetManager } from './AssetManager.js';
import { AudioManager } from './AudioManager.js';
import { Settings } from './Settings.js';
import { MainMenuScene } from '../scenes/MainMenuScene.js';
import { OverworldScene } from '../scenes/OverworldScene.js';
import { UIScene } from '../scenes/UIScene.js';
import { validateMap, validateObjectTypes } from '../utils/DataUtils.js';

export const GAME_VERSION = '0.2.0';

/**
 * Game — owns every core service and wires them together.
 * Scenes and systems reach services through `game.*`, never through globals.
 */
export class Game {
  constructor({ canvas, onProgress, onFatal }) {
    this.canvas = canvas;
    this.onProgress = onProgress ?? (() => {});
    this.onFatal = onFatal ?? ((err) => console.error(err));
    this.version = GAME_VERSION;

    this.settings = new Settings();
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(this.renderer);
    this.touch = new TouchControls(this.input);
    this.assets = new AssetManager();
    this.audio = new AudioManager(this.settings);
    this.scenes = new SceneManager(this);

    // Runtime session state (persisted by SaveSystem in Phase 6).
    this.state = {
      currentMap: null,
      playerPosition: { x: 0, y: 0 },
      playtime: 0,
    };

    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: () => this.render(),
    });

    this._portraitQuery = window.matchMedia('(orientation: portrait)');
    this._wasRotationPaused = false;
    this.renderer.onResize(() => this.scenes.onResize());
    this.input.onDeviceChange(() => this._refreshTouchVisibility());
    this.settings.onChange((key) => {
      if (key === 'touchControls') this._refreshTouchVisibility();
      if (key === 'controlSize') this._applyControlSize();
      if (key === 'soundEnabled' || key === 'volume') this.audio.applySettings();
    });

    // Browsers only allow audio after a user gesture.
    const unlock = () => this.audio.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  async init() {
    this.onProgress(0.2, 'Registering scenes…');
    this.scenes.register('mainMenu', MainMenuScene);
    this.scenes.register('overworld', OverworldScene);
    this.scenes.register('ui', UIScene);

    this.onProgress(0.5, 'Reading the old maps…');
    // Warm the cache for the starting map so New Game is instant.
    await this.assets.loadJSON('data/objects.json', validateObjectTypes)
      .then((types) => this.assets.loadJSON('data/maps/ashenveil_village.json', (m, src) => validateMap(m, src, types)))
      .catch((err) => {
        console.warn('Map preload failed; will retry on New Game.', err);
      });

    this.onProgress(0.9, 'Opening the gate…');
    this._refreshTouchVisibility();
    this._applyControlSize();
    await this.scenes.change('mainMenu', {}, { fade: false });
    this.loop.start();
    this.onProgress(1, 'Ready');
  }

  _applyControlSize() {
    const size = this.settings.get('controlSize');
    document.body.classList.toggle('controls-medium', size === 'medium');
    document.body.classList.toggle('controls-xl', size === 'xl');
  }

  _refreshTouchVisibility() {
    const mode = this.settings.get('touchControls');
    const visible = mode === 'on' || (mode === 'auto' && this.input.device === 'touch');
    this.touch.setVisible(visible);
  }

  /** Portrait on a touch device shows the rotate hint (CSS) and pauses gameplay. */
  get rotationPaused() {
    return document.body.classList.contains('touch-mode') && this._portraitQuery.matches;
  }

  update(dt) {
    if (this.rotationPaused) {
      // State is preserved untouched; held inputs are dropped so nothing is stuck on return.
      if (!this._wasRotationPaused) { this.input.releaseAll(); this._wasRotationPaused = true; }
      this.input.endStep();
      return;
    }
    if (this._wasRotationPaused) { this._wasRotationPaused = false; this.input.latchHeld(); }
    this.input.update(dt);
    this.scenes.update(dt);
    if (this.scenes.base?.name === 'overworld') this.state.playtime += dt;
    this.input.endStep();
  }

  render() {
    const r = this.renderer;
    r.beginFrame();
    this.scenes.render(r);
    if (this.settings.get('showFps')) {
      r.text(`${this.loop.fps} FPS`, W - 4, 4, { align: 'right', size: 6, color: PALETTE.goldHi });
    }
    r.endFrame(this.scenes.fadeAlpha);
  }

  fatal(err) {
    this.loop.stop();
    this.onFatal(err);
  }
}

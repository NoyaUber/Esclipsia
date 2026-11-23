/** Base class for all scenes. Subclasses override the lifecycle hooks they need. */
export class Scene {
  constructor(game) {
    this.game = game;
    this.name = '';
    this.isOverlay = false;
  }
  get input() { return this.game.input; }
  get audio() { return this.game.audio; }
  get renderer() { return this.game.renderer; }
  /** May return a Promise (e.g. to load map data). */
  enter(_params) {}
  exit() {}
  pause() {}
  resume() {}
  update(_dt) {}
  render(_r) {}
}

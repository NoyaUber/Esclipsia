import { Scene } from './Scene.js';
import { MenuList } from '../ui/MenuList.js';
import { createSettingsMenu } from '../ui/SettingsPanel.js';
import { PALETTE, LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../core/Renderer.js';

/**
 * UIScene — overlay pushed on top of gameplay scenes. Phase 1 provides the pause menu
 * (Resume / Settings / Return to Title). Party, Bestiary, Inventory, Quest Journal and
 * Save/Load panels will be added here in their respective phases.
 */
export class UIScene extends Scene {
  enter() {
    this.mode = 'pause';
    this.time = 0;
    this.menu = new MenuList({
      x: W / 2 - 60, y: 44, width: 120, itemHeight: 15, title: 'PAUSED',
      items: [
        { id: 'resume', label: 'Resume', action: 'resume' },
        { id: 'settings', label: 'Settings', action: 'settings' },
        { id: 'title', label: 'Return to Title', action: 'title' },
      ],
    });
    this.settingsMenu = createSettingsMenu(this.game, { x: W / 2 - 80, y: 34, width: 160 });
  }

  update(dt) {
    this.time += dt;
    if (this.mode === 'pause') {
      if (this.input.wasPressed('menu')) { this.audio.play('cancel'); this.game.scenes.pop(); return; }
      const res = this.menu.update(dt, this.input, this.audio);
      if (!res) return;
      if (res.type === 'cancel' || res.item.action === 'resume') this.game.scenes.pop();
      else if (res.item.action === 'settings') { this.settingsMenu.index = 0; this.mode = 'settings'; }
      else if (res.item.action === 'title') this.game.scenes.change('mainMenu', {}, { duration: 0.8 });
    } else {
      const res = this.settingsMenu.update(dt, this.input, this.audio);
      if (res?.type === 'cancel' || res?.item?.action === 'back') this.mode = 'pause';
    }
  }

  render(r) {
    r.ctx.globalAlpha = 0.55;
    r.rect(0, 0, W, H, PALETTE.black);
    r.ctx.globalAlpha = 1;
    if (this.mode === 'pause') {
      this.menu.render(r);
      const mins = Math.floor(this.game.state.playtime / 60);
      const secs = Math.floor(this.game.state.playtime % 60).toString().padStart(2, '0');
      r.text(`Playtime ${mins}:${secs}`, W / 2, this.menu.y + this.menu.height + 8, { align: 'center', size: 6, color: PALETTE.textDim });
    } else {
      this.settingsMenu.render(r);
    }
  }
}

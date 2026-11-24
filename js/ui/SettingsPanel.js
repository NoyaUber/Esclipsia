import { MenuList } from './MenuList.js';

const TOUCH_MODES = ['auto', 'on', 'off'];
const TOUCH_LABEL = { auto: 'Auto', on: 'On', off: 'Off' };
const SIZES = ['medium', 'large', 'xl'];
const SIZE_LABEL = { medium: 'Medium', large: 'Large', xl: 'Extra Large' };

/** Settings menu shared by the main menu and the pause menu. Changes apply instantly and persist. */
export function createSettingsMenu(game, { x, y, width }) {
  const s = game.settings;
  const cycle = (key, list, dir) => {
    const i = list.indexOf(s.get(key));
    s.set(key, list[(i + dir + list.length) % list.length]);
  };
  const volStep = (dir) => {
    const v = Math.round((s.get('volume') + dir * 0.1) * 10) / 10;
    s.set('volume', Math.min(1, Math.max(0, v)));
  };
  const toggle = (key) => () => s.set(key, !s.get(key));

  const items = [
    { id: 'sound', label: 'Sound', value: () => (s.get('soundEnabled') ? 'On' : 'Off'), onLeft: toggle('soundEnabled'), onRight: toggle('soundEnabled'), onTap: toggle('soundEnabled') },
    { id: 'volume', label: 'Volume', value: () => `${Math.round(s.get('volume') * 100)}%`, onLeft: () => volStep(-1), onRight: () => volStep(1), onTap: (d) => volStep(d) },
    { id: 'fps', label: 'Show FPS', value: () => (s.get('showFps') ? 'On' : 'Off'), onLeft: toggle('showFps'), onRight: toggle('showFps'), onTap: toggle('showFps') },
    { id: 'touch', label: 'Touch Controls', value: () => TOUCH_LABEL[s.get('touchControls')], onLeft: () => cycle('touchControls', TOUCH_MODES, -1), onRight: () => cycle('touchControls', TOUCH_MODES, 1), onTap: (d) => cycle('touchControls', TOUCH_MODES, d) },
    { id: 'size', label: 'Control Size', value: () => SIZE_LABEL[s.get('controlSize')], onLeft: () => cycle('controlSize', SIZES, -1), onRight: () => cycle('controlSize', SIZES, 1), onTap: (d) => cycle('controlSize', SIZES, d) },
    { id: 'back', label: 'Back', action: 'back' },
  ];
  return new MenuList({ items, x, y, width, title: 'SETTINGS', itemHeight: 13 });
}

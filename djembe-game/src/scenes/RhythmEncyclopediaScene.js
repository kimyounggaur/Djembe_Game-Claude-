/**
 * RhythmEncyclopediaScene.js - stub (Phase 6 full implementation)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';

export class RhythmEncyclopediaScene extends Scene {
  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('백과사전 (Phase 6)', w / 2, h / 2);
  }
  handleInput(evt) {
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('rhythmLibrary');
  }
}

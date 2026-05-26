/**
 * MedleyMenuScene.js - stub (Phase 7 full implementation)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';

export class MedleyMenuScene extends Scene {
  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('메들리 챌린지 (Phase 7)', w / 2, h / 2);
  }
  handleInput(evt) {
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('title');
  }
}

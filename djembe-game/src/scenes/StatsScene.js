/**
 * StatsScene.js - stub (Phase 8 full implementation)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';

export class StatsScene extends Scene {
  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('통계 대시보드 (Phase 8)', w / 2, h / 2);
  }
  handleInput(evt) {
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('title');
  }
}

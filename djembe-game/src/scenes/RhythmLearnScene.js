/**
 * RhythmLearnScene.js - stub (Phase 5 full implementation)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';

export class RhythmLearnScene extends Scene {
  onEnter(data) { this.rhythmId = data?.rhythmId; }
  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('단계별 학습 (Phase 5)', w / 2, h / 2);
  }
  handleInput(evt) {
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId });
  }
}

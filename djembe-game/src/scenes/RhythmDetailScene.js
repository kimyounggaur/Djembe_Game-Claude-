/**
 * RhythmDetailScene.js - 리듬 상세 화면 (Phase 4 구현 — 이 파일은 Phase 3 단계 stub)
 * Phase 4에서 완전히 재작성됨
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';

export class RhythmDetailScene extends Scene {
  constructor(app) {
    super(app);
    this.rhythmId = null;
    this.rhythm = null;
  }

  async onEnter(data) {
    this.rhythmId = data.rhythmId;
    this.rhythm = await this.app.rhythmLoader.loadRhythm(this.rhythmId);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const name = this.rhythm?.name?.[i18n.getLang()] || this.rhythm?.name?.ko || this.rhythmId || '...';
    ctx.fillText(name, w / 2, h / 2);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText('ESC to go back', w / 2, h / 2 + 40);
  }

  handleInput(evt) {
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('rhythmLibrary');
    if (evt.type === 'down' && evt.source === 'touch') this.manager.goTo('rhythmLibrary');
  }
}

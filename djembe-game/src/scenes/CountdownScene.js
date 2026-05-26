/**
 * CountdownScene.js - 3-2-1-GO! (오디오/비주얼 동기화)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { easeOutElastic } from '../utils/MathUtils.js';

export class CountdownScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.phase = 3;
    this.phaseElapsed = 0;
    this.targetData = null;
    this.flash = 0;
  }

  async onEnter(data) {
    this.targetData = data;
    this.elapsed = 0;
    this.phase = 3;
    this.phaseElapsed = 0;
    this.flash = 0;
    await this.app.audioEngine.unlock();
    if (this.app.settings.countdownSound) {
      this.app.sampleBank.generateBeep(880, 0.15, 'sine', 0.3);
    }
  }

  update(dt) {
    this.elapsed += dt;
    this.phaseElapsed += dt;
    if (this.phaseElapsed >= 1.0) {
      this.phase--;
      this.phaseElapsed = 0;
      if (this.phase === 2 && this.app.settings.countdownSound) this.app.sampleBank.generateBeep(880, 0.15, 'sine', 0.3);
      else if (this.phase === 1 && this.app.settings.countdownSound) this.app.sampleBank.generateBeep(880, 0.15, 'sine', 0.3);
      else if (this.phase === 0) {
        if (this.app.settings.countdownSound) this.app.sampleBank.generateBeep(1320, 0.25, 'sine', 0.4);
        this.flash = 1.0;
      }
      if (this.phase < -1) {
        this.manager.goTo('play', this.targetData);
        return;
      }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    const text = this.phase >= 1 ? String(this.phase) : (this.phase === 0 ? 'GO!' : '');
    if (text) {
      const p = Math.min(1, this.phaseElapsed / 0.4);
      const scale = this.phase === 0 ?
        (this.phaseElapsed < 0.5 ? 1.2 + easeOutElastic(p) * 0.5 : 1.5 + this.phaseElapsed * 1.5) :
        easeOutElastic(p) * 1.2;
      const alpha = this.phaseElapsed < 0.7 ? 1 : Math.max(0, 1 - (this.phaseElapsed - 0.7) * 3);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const size = Math.min(w, h) * 0.25;
      ctx.font = `bold ${size}px 'Black Han Sans', sans-serif`;
      const g = ctx.createLinearGradient(0, -size, 0, size);
      g.addColorStop(0, T.primary);
      g.addColorStop(1, '#FFD93D');
      ctx.fillStyle = g;
      ctx.shadowColor = T.primary;
      ctx.shadowBlur = 60;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  handleInput() {}
}

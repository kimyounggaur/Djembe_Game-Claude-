/**
 * CalibrationScene.js - 입력 오프셋 측정 (메트로놈 + 스페이스)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';

export class CalibrationScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.bpm = 100;
    this.startTime = 0;
    this.beats = [];
    this.inputs = [];
    this.running = false;
    this.done = false;
    this.result = 0;
    this.inputHandler = null;
    this.lastBeatIdx = -1;
  }

  onEnter() {
    this.elapsed = 0;
    this.beats = [];
    this.inputs = [];
    this.running = false;
    this.done = false;
    this.result = 0;
    this.lastBeatIdx = -1;
    this.uiButtons = [
      { label: '시작', x: this.app.width / 2 - 100, y: this.app.height / 2 + 80, w: 200, h: 50, bg: Theme.current.primary, color: '#fff', fontSize: 18, radius: 10, onClick: () => this._start() },
      { label: '뒤로', x: 20, y: 20, w: 60, h: 50, bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 18, radius: 10, onClick: () => this.manager.goTo('settings') }
    ];
    this.inputHandler = (evt) => this._onInput(evt);
    this.app.inputManager.on(this.inputHandler);
  }

  onExit() {
    this.app.inputManager.off(this.inputHandler);
  }

  _start() {
    this.running = true;
    this.startTime = this.app.audioEngine.currentTime + 1.0;
    this.beats = [];
    this.inputs = [];
    this.done = false;
    this.lastBeatIdx = -1;
    this.uiButtons[0].label = '진행 중...';
  }

  _onInput(evt) {
    if (!this.running || this.done) return;
    if (evt.type === 'down') {
      this.inputs.push(evt.time);
      if (this.inputs.length >= 16) this._finish();
    }
  }

  _finish() {
    this.running = false;
    this.done = true;
    const beatInterval = 60 / this.bpm;
    const deltas = [];
    for (const inp of this.inputs) {
      const beatNum = Math.round((inp - this.startTime) / beatInterval);
      const expected = this.startTime + beatNum * beatInterval;
      deltas.push((inp - expected) * 1000);
    }
    deltas.sort((a, b) => a - b);
    const trimmed = deltas.slice(2, deltas.length - 2);
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    this.result = avg;
    this.app.settings.inputOffset = avg;
    this.app.inputManager.setInputOffset(avg);
    Storage.saveSettings(this.app.settings);
    this.uiButtons[0].label = '다시 측정';
    this.uiButtons[0].onClick = () => this._start();
  }

  update(dt) {
    this.elapsed += dt;
    if (this.running) {
      const beatInterval = 60 / this.bpm;
      const now = this.app.audioEngine.currentTime;
      const idx = Math.floor((now - this.startTime) / beatInterval);
      if (idx >= 0 && idx !== this.lastBeatIdx) {
        if (idx < 32) this.app.sampleBank.generateBeep(idx % 4 === 0 ? 1200 : 800, 0.05, 'square', 0.4);
        this.lastBeatIdx = idx;
      }
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(i18n.t('calibration'), w / 2, 60);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = T.text.secondary;
    const desc = this.done
      ? `측정 완료! 입력 오프셋: ${this.result.toFixed(0)} ms`
      : (this.running ? `메트로놈에 맞춰 스페이스/D/K를 16회 눌러주세요 (${this.inputs.length}/16)` : '시작 버튼을 누르면 메트로놈이 100 BPM으로 재생됩니다');
    const lines = desc.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, w / 2, 110 + i * 20));
    if (this.running) {
      const beatInterval = 60 / this.bpm;
      const now = this.app.audioEngine.currentTime;
      const phase = ((now - this.startTime) / beatInterval) % 1;
      const r = 60 - phase * 40;
      ctx.fillStyle = T.primary + Math.floor((1 - phase) * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.max(20, r), 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.done) {
      ctx.fillStyle = T.primary;
      ctx.font = 'bold 60px monospace';
      ctx.fillText(`${this.result > 0 ? '+' : ''}${this.result.toFixed(0)}ms`, w / 2, h / 2);
    }
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('settings');
  }
}

/**
 * TutorialScene.js - 단계별 튜토리얼 (Bass → Slap+Bass → All)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';

const STEPS = [
  {
    title: 'BASS 익히기',
    desc: '가운데 스페이스 키(또는 화면 중앙)를 눌러 BASS를 쳐보세요',
    lane: 'bass',
    requiredHits: 4
  },
  {
    title: 'SLAP 익히기',
    desc: 'D 키(또는 화면 왼쪽)를 눌러 SLAP을 쳐보세요',
    lane: 'slap',
    requiredHits: 4
  },
  {
    title: 'TONE 익히기',
    desc: 'K 키(또는 화면 오른쪽)를 눌러 TONE을 쳐보세요',
    lane: 'tone',
    requiredHits: 4
  },
  {
    title: '리듬 완성!',
    desc: '이제 실전 곡에 도전해보세요',
    lane: null,
    requiredHits: 0
  }
];

export class TutorialScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.stepIdx = 0;
    this.hitCount = 0;
    this.flashLane = { slap: 0, bass: 0, tone: 0 };
    this.uiButtons = [];
    this.inputHandler = null;
    this.nextRequested = false;
  }

  onEnter() {
    this.elapsed = 0;
    this.stepIdx = 0;
    this.hitCount = 0;
    this.nextRequested = false;
    this._buildButtons();
    this.inputHandler = (evt) => this._onInput(evt);
    this.app.inputManager.on(this.inputHandler);
  }

  onExit() {
    if (this.inputHandler) this.app.inputManager.off(this.inputHandler);
  }

  _buildButtons() {
    const w = this.app.width, h = this.app.height;
    this.uiButtons = [
      { label: '◀', x: 20, y: 20, w: 50, h: 50, bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22, radius: 10, onClick: () => this.manager.goTo('title') },
      { label: '다음', x: w / 2 - 80, y: h - 80, w: 160, h: 50, bg: Theme.current.primary, color: '#fff', fontSize: 18, radius: 10, onClick: () => this._next() }
    ];
  }

  _onInput(evt) {
    if (evt.type !== 'down') return;
    const step = STEPS[this.stepIdx];
    if (!step || !step.lane) return;
    if (evt.lane === step.lane) {
      this.app.sampleBank.playHit(evt.lane, 'perfect');
      this.flashLane[evt.lane] = 1.0;
      this.hitCount++;
      if (this.hitCount >= step.requiredHits) {
        this.nextRequested = true;
      }
    } else {
      this.flashLane[evt.lane] = 0.5;
    }
  }

  _next() {
    if (this.stepIdx >= STEPS.length - 1) {
      this.manager.goTo('songSelect');
    } else {
      this.stepIdx++;
      this.hitCount = 0;
      this.nextRequested = false;
    }
  }

  update(dt) {
    this.elapsed += dt;
    for (const l in this.flashLane) {
      if (this.flashLane[l] > 0) this.flashLane[l] = Math.max(0, this.flashLane[l] - dt * 3);
    }
    if (this.nextRequested && this.elapsed > 0) {
      this.uiButtons[1].pulse = true;
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    const step = STEPS[this.stepIdx];
    ctx.textAlign = 'center';
    ctx.fillStyle = T.primary;
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(step.title, w / 2, 110);
    ctx.fillStyle = T.text.primary;
    ctx.font = '18px sans-serif';
    ctx.fillText(step.desc, w / 2, 150);
    if (step.lane) {
      ctx.fillStyle = T.text.secondary;
      ctx.font = '14px sans-serif';
      ctx.fillText(`${this.hitCount} / ${step.requiredHits}`, w / 2, 180);
    }
    if (step.lane) {
      const cx = step.lane === 'slap' ? w * 0.25 : step.lane === 'bass' ? w * 0.5 : w * 0.75;
      const cy = h * 0.55;
      const flash = this.flashLane[step.lane];
      const r = 80 + flash * 30 + Math.sin(this.elapsed * 4) * 5;
      ctx.save();
      ctx.fillStyle = T.lane[step.lane] + '33';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = T.lane[step.lane];
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(step.lane.toUpperCase(), cx, cy);
      ctx.restore();
      const keyMap = { slap: 'D', bass: 'SPACE', tone: 'K' };
      ctx.fillStyle = T.text.secondary;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`[${keyMap[step.lane]}]`, cx, cy + r + 30);
    } else {
      ctx.fillStyle = T.text.primary;
      ctx.font = '64px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉', w / 2, h * 0.5);
    }
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  onResize() { this._buildButtons(); }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('title');
    if (evt.type === 'keydown' && (evt.code === 'Enter') && this.nextRequested) this._next();
  }
}

/**
 * LoadingScene.js - 자산 로딩 + 진행률 표시
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';

const MESSAGES = [
  '리듬을 준비하는 중...',
  '북 가죽을 조율하는 중...',
  '사바나의 바람을 부르는 중...',
  '심장 박동을 동기화하는 중...'
];

export class LoadingScene extends Scene {
  constructor(app) {
    super(app);
    this.progress = 0;
    this.targetProgress = 0;
    this.elapsed = 0;
    this.message = MESSAGES[0];
    this.djembeRotation = 0;
    this.completed = false;
  }

  async onEnter() {
    this.progress = 0;
    this.targetProgress = 0;
    this.elapsed = 0;
    this.completed = false;
    this.message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    const manifest = {
      images: [
        ['djembe-main', 'assets/images/djembe-main.png'],
        ['djembe-icon', 'assets/images/djembe-icon.png'],
        ['djembe-realistic', 'assets/images/djembe-realistic.png'],
        ['note-slap', 'assets/images/note-slap.png'],
        ['note-bass', 'assets/images/note-bass.png'],
        ['note-tone', 'assets/images/note-tone.png']
      ],
      sounds: [
        ['slap', 'assets/sounds/slap.wav'],
        ['bass', 'assets/sounds/bass.wav'],
        ['tone', 'assets/sounds/tone.wav']
      ]
    };
    await this.app.assetLoader.loadAll(manifest, (p) => {
      this.targetProgress = p;
    });
    setTimeout(() => {
      this.completed = true;
      setTimeout(() => this.manager.goTo('title'), 600);
    }, 200);
  }

  update(dt) {
    this.elapsed += dt;
    this.progress += (this.targetProgress - this.progress) * Math.min(1, dt * 6);
    this.djembeRotation += dt * (Math.PI * 2 / 8);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    const img = this.app.assetLoader.getImage('djembe-main');
    const cx = w / 2;
    const cy = h / 2 - 60;
    if (img) {
      const size = Math.min(w, h) * 0.32;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.djembeRotation);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.djembeRotation);
      ctx.fillStyle = T.primary;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = '24px sans-serif';
    ctx.fillText(this.completed ? '준비 완료!' : this.message, cx, h / 2 + 80);
    const barW = Math.min(400, w * 0.7);
    const barH = 10;
    const barX = cx - barW / 2;
    const barY = h / 2 + 130;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, barX, barY, barW, barH, barH / 2);
    ctx.fill();
    ctx.fillStyle = T.primary;
    this._roundRect(ctx, barX, barY, barW * this.progress, barH, barH / 2);
    ctx.fill();
    ctx.fillStyle = T.text.secondary;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${Math.floor(this.progress * 100)}%`, cx, barY + 35);
  }

  handleInput() {}
}

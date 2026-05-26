/**
 * TitleScene.js - 타이틀 + 메인 메뉴
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';

export class TitleScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.particles = [];
    this.spawnTimer = 0;
    this.uiButtons = [];
    this.hoveredIdx = -1;
  }

  onEnter() {
    this.elapsed = 0;
    this.particles = [];
    this.spawnTimer = 0;
    this._buildButtons();
  }

  _buildButtons() {
    const w = this.app.width;
    const h = this.app.height;
    const isMobile = w < 700;
    const btnW = isMobile ? 220 : 280;
    const btnH = isMobile ? 50 : 60;
    const gap = isMobile ? 12 : 16;
    const items = [
      { key: 'start', label: i18n.t('start'), onClick: () => this.manager.goTo('songSelect') },
      { key: 'tutorial', label: i18n.t('tutorial'), onClick: () => this.manager.goTo('tutorial') },
      { key: 'achievements', label: i18n.t('achievements'), onClick: () => this.manager.goTo('achievements') },
      { key: 'settings', label: i18n.t('settings'), onClick: () => this.manager.goTo('settings') },
      { key: 'about', label: i18n.t('about'), onClick: () => this.manager.goTo('about') }
    ];
    const total = items.length * btnH + (items.length - 1) * gap;
    const startY = h * 0.45;
    this.uiButtons = items.map((it, i) => ({
      ...it,
      x: w / 2 - btnW / 2,
      y: startY + i * (btnH + gap),
      w: btnW,
      h: btnH,
      bg: i === 0 ? Theme.current.primary : 'rgba(255,255,255,0.1)',
      color: '#fff',
      fontSize: isMobile ? 18 : 22,
      pulse: i === 0,
      radius: 14,
      shadowColor: i === 0 ? 'rgba(78,205,196,0.6)' : 'rgba(0,0,0,0)'
    }));
  }

  onResize() { this._buildButtons(); }

  update(dt) {
    this.elapsed += dt;
    this.spawnTimer += dt;
    if (this.spawnTimer > 0.4) {
      this.spawnTimer = 0;
      this.particles.push({
        x: Math.random() * this.app.width,
        y: this.app.height + 20,
        vy: -30 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 15,
        symbol: Math.random() > 0.5 ? '♪' : '♫',
        size: 20 + Math.random() * 16,
        alpha: 0.5 + Math.random() * 0.3,
        rot: 0,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }
    this.particles = this.particles.filter(p => p.y > -50);
    for (const p of this.particles) {
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      p.rot += p.rotSpeed * dt;
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = T.primary;
      ctx.font = `${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.symbol, 0, 0);
      ctx.restore();
    }
    const img = this.app.assetLoader.getImage('djembe-main');
    if (img) {
      const size = Math.min(w * 0.5, h * 0.45);
      const bob = Math.sin(this.elapsed * 1.2) * 8;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.drawImage(img, w / 2 - size / 2, h * 0.55 + bob, size, size);
      ctx.restore();
    }
    const titleSize = Math.min(w, h) < 700 ? 44 : 72;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${titleSize}px 'Black Han Sans', sans-serif`;
    const tg = ctx.createLinearGradient(0, h * 0.15, 0, h * 0.25);
    tg.addColorStop(0, T.primary);
    tg.addColorStop(1, '#FFD93D');
    ctx.fillStyle = tg;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillText(i18n.t('title'), w / 2, h * 0.22);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.max(14, titleSize * 0.28)}px sans-serif`;
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(i18n.t('subtitle'), w / 2, h * 0.22 + titleSize * 0.55);
    ctx.restore();
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
    ctx.fillStyle = T.text.tertiary;
    ctx.textAlign = 'center';
    ctx.font = '11px sans-serif';
    ctx.fillText('Made with Claude Opus 4.7  •  v1.0', w / 2, h - 20);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown') {
      if (evt.code === 'Enter' || evt.code === 'Space') {
        this.manager.goTo('songSelect');
      }
    }
  }
}

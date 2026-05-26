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
    this._updateLibraryProgress();
    this._buildButtons();
  }

  _updateLibraryProgress() {
    try {
      if (!this.app.rhythmLoader || !this.app.rhythmLoader.library) {
        this.libraryProgress = null;
        return;
      }
      const total = this.app.rhythmLoader.getAllMetadata().length;
      const { Storage } = window.__djembeMods || {};
      // dynamic-safe access
      const scores = (typeof localStorage !== 'undefined')
        ? JSON.parse(localStorage.getItem('djembe_rhythm_scores') || '{}')
        : {};
      const cleared = Object.values(scores).filter(s => s && s.bestGrade && ['S','A','B'].includes(s.bestGrade)).length;
      const mastered = Object.values(scores).filter(s => s && s.mastered).length;
      const fullCombo = Object.values(scores).filter(s => s && s.fullCombo).length;
      this.libraryProgress = { cleared, total, mastered, fullCombo };
    } catch (e) {
      this.libraryProgress = null;
    }
  }

  _buildButtons() {
    const w = this.app.width;
    const h = this.app.height;
    const isMobile = w < 700;
    const btnW = isMobile ? 240 : 300;
    const btnH = isMobile ? 46 : 56;
    const gap = isMobile ? 10 : 14;
    const items = [
      { key: 'start', label: i18n.t('start'), onClick: () => this.manager.goTo('songSelect') },
      { key: 'library', label: i18n.t('rhythmLibrary'), onClick: () => this.manager.goTo('rhythmLibrary'), highlight: true },
      { key: 'medley', label: i18n.t('medleyChallenge'), onClick: () => this.manager.goTo('medleyMenu') },
      { key: 'tutorial', label: i18n.t('tutorial'), onClick: () => this.manager.goTo('tutorial') },
      { key: 'achievements', label: i18n.t('achievements'), onClick: () => this.manager.goTo('achievements') },
      { key: 'settings', label: i18n.t('settings'), onClick: () => this.manager.goTo('settings') },
      { key: 'about', label: i18n.t('about'), onClick: () => this.manager.goTo('about') }
    ];
    const total = items.length * btnH + (items.length - 1) * gap;
    const startY = Math.max(h * 0.38, h * 0.5 - total / 2);
    this.uiButtons = items.map((it, i) => ({
      ...it,
      x: w / 2 - btnW / 2,
      y: startY + i * (btnH + gap),
      w: btnW,
      h: btnH,
      bg: it.highlight ? '#FF6B6B' : (i === 0 ? Theme.current.primary : 'rgba(255,255,255,0.1)'),
      color: '#fff',
      fontSize: isMobile ? 17 : 21,
      pulse: it.highlight || i === 0,
      radius: 14,
      shadowColor: it.highlight ? 'rgba(255,107,107,0.6)' : (i === 0 ? 'rgba(78,205,196,0.6)' : 'rgba(0,0,0,0)')
    }));
  }

  _drawNewBadge(ctx, btn) {
    const bx = btn.x + btn.w - 30;
    const by = btn.y - 6;
    ctx.save();
    ctx.fillStyle = '#FFD93D';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, bx, by, 44, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW', bx + 22, by + 11);
    ctx.restore();
  }

  _drawProgressBar(ctx, btn) {
    if (!this.libraryProgress) return;
    const { cleared, total, mastered, fullCombo } = this.libraryProgress;
    if (!total) return;
    const pct = cleared / total;
    const bw = btn.w * 0.7;
    const bh = 4;
    const bx = btn.x + (btn.w - bw) / 2;
    const by = btn.y + btn.h - 9;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#FFD93D';
    ctx.fillRect(bx, by, bw * pct, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${cleared}/${total}   ⭐ ${mastered}  🔥 ${fullCombo}`, btn.x + btn.w - 16, by - 8);
    ctx.restore();
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
    for (const btn of this.uiButtons) {
      this.drawButton(ctx, btn, this.elapsed);
      if (btn.highlight) this._drawNewBadge(ctx, btn);
      if (btn.key === 'library' && this.libraryProgress) this._drawProgressBar(ctx, btn);
    }
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

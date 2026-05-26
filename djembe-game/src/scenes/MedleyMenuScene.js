/**
 * MedleyMenuScene.js - 메들리 챌린지 메인 화면 (5개 사전 정의 + 커스텀)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { UserSkillEstimator } from '../utils/UserSkillEstimator.js';
import { StarRating } from '../ui/components/StarRating.js';
import { clamp, easeOutCubic } from '../utils/MathUtils.js';

export class MedleyMenuScene extends Scene {
  constructor(app) {
    super(app);
    this.medleys = [];
    this.customMedleys = [];
    this.scroll = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
    this.entranceT = 0;
    this.hoveredIdx = -1;
    this.focusedIdx = 0;
  }

  async onEnter() {
    this.scroll = 0;
    this.targetScroll = 0;
    this.entranceT = 0;
    try {
      const res = await fetch('assets/medleys.json');
      const data = await res.json();
      this.medleys = data.medleys || data || [];
    } catch (e) {
      console.error('medleys load failed', e);
      this.medleys = [];
    }
    this.customMedleys = Storage.getCustomMedleys();
  }

  update(dt) {
    this.entranceT += dt;
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  _layout() {
    const w = this.app.width;
    const h = this.app.height;
    const isMobile = w < 700;
    const top = 70;
    const pad = 20;
    const cardW = isMobile ? w - pad * 2 : 380;
    const cardH = isMobile ? 130 : 160;
    const gap = 16;
    const cols = isMobile ? 1 : Math.max(1, Math.floor((w - pad * 2 + gap) / (cardW + gap)));
    return { top, pad, cardW, cardH, gap, cols, viewH: h - top - 80 };
  }

  _allItems() {
    const customCard = {
      __custom: true,
      id: '_new_custom',
      name: { ko: '🎨 새 커스텀 메들리', en: '🎨 New Custom Medley' },
      description: { ko: '나만의 시퀀스를 만들어보세요', en: 'Build your own sequence' },
      difficulty: 0,
      sequence: []
    };
    return [...this.medleys, ...this.customMedleys, customCard];
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    this._renderHeader(ctx, w);
    this._renderCards(ctx, w, h);
  }

  _renderHeader(ctx, w) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, 12, 14, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 30);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(i18n.t('medleyChallenge'), 60, 30);
    ctx.restore();
  }

  _renderCards(ctx, w, h) {
    const T = Theme.current;
    const L = this._layout();
    const items = this._allItems();
    const masteredCount = UserSkillEstimator.getMasteredCount();
    const medleyScores = Storage.getMedleyScores();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.top - 4, w, L.viewH + 8);
    ctx.clip();

    items.forEach((m, idx) => {
      const col = idx % L.cols;
      const row = Math.floor(idx / L.cols);
      const x = L.pad + col * (L.cardW + L.gap) + (L.cols === 1 ? 0 : (w - L.cols * L.cardW - (L.cols - 1) * L.gap) / 2 - L.pad);
      const y = L.top + row * (L.cardH + L.gap) - this.scroll;
      if (y > h + 20 || y + L.cardH < L.top - 20) return;

      const ease = easeOutCubic(clamp((this.entranceT - idx * 0.06) / 0.4, 0, 1));
      const drawY = y + (1 - ease) * 20;
      const alpha = ease;
      const isLocked = m.unlockCondition && masteredCount < (m.unlockCondition.value || 0);

      ctx.save();
      ctx.globalAlpha = alpha;
      this._drawMedleyCard(ctx, x, drawY, L.cardW, L.cardH, m, {
        focused: this.focusedIdx === idx,
        locked: isLocked,
        topScores: m.__custom ? null : (medleyScores[m.id]?.topScores || [])
      });
      ctx.restore();

      m._bounds = { x, y: drawY, w: L.cardW, h: L.cardH };
    });

    this.maxScroll = Math.max(0, Math.ceil(items.length / L.cols) * (L.cardH + L.gap) - L.viewH + 40);
    ctx.restore();
  }

  _drawMedleyCard(ctx, x, y, w, h, m, opts = {}) {
    const T = Theme.current;
    const lang = i18n.getLang();
    const isCustom = m.__custom;
    const isCustomUser = m.createdAt !== undefined;
    const baseColor = isCustom ? '#9C27B0' : (m.region === 'guinea' ? '#E63946' : m.region === 'mali' ? '#F4A261' : '#4ECDC4');

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, baseColor + 'CC');
    grad.addColorStop(1, baseColor + '55');
    ctx.fillStyle = grad;
    if (opts.focused) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 16;
    }
    this._roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = opts.focused ? '#fff' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = opts.focused ? 2 : 1;
    this._roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();

    if (opts.locked) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this._roundRect(ctx, x, y, w, h, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + w / 2, y + h / 2 - 12);
      ctx.font = '13px sans-serif';
      ctx.fillText(`마스터 ${m.unlockCondition?.value} 필요`, x + w / 2, y + h / 2 + 22);
      return;
    }

    const pad = 16;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const name = m.name?.[lang] || m.name?.ko || m.id;
    ctx.fillText(name, x + pad, y + pad);

    if (m.description) {
      ctx.font = '12.5px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const desc = m.description?.[lang] || m.description?.ko || '';
      ctx.fillText(desc.slice(0, 60), x + pad, y + pad + 26);
    }

    if (!isCustom) {
      ctx.font = '11.5px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const seqCount = (m.sequence || []).length;
      const totalBars = (m.sequence || []).reduce((a, b) => a + (b.bars || 0), 0);
      const dur = m.duration || 0;
      ctx.fillText(`🎶 ${seqCount} rhythms  •  ${totalBars} bars  •  ~${Math.floor(dur / 60)}'${dur % 60}"`, x + pad, y + h - 56);

      if (m.difficulty != null) {
        StarRating.render(ctx, x + pad, y + h - 36, { stars: m.difficulty, maxStars: 10, size: 'sm', showNumber: false });
      }

      if (opts.topScores && opts.topScores.length > 0) {
        ctx.fillStyle = '#FFD93D';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`🏆 ${opts.topScores[0].score.toLocaleString()}`, x + w - pad, y + pad);
      } else if (isCustomUser) {
        ctx.fillStyle = '#FFD93D';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('CUSTOM', x + w - pad, y + pad);
      }
    } else {
      // 빈 카드 (새 만들기)
      ctx.font = '40px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w / 2, y + h / 2 + 10);
    }
  }

  handleInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('title'); return; }
      const items = this._allItems();
      const L = this._layout();
      if (evt.code === 'ArrowLeft') this.focusedIdx = Math.max(0, this.focusedIdx - 1);
      else if (evt.code === 'ArrowRight') this.focusedIdx = Math.min(items.length - 1, this.focusedIdx + 1);
      else if (evt.code === 'ArrowUp') this.focusedIdx = Math.max(0, this.focusedIdx - L.cols);
      else if (evt.code === 'ArrowDown') this.focusedIdx = Math.min(items.length - 1, this.focusedIdx + L.cols);
      else if (evt.code === 'Enter') {
        this._select(items[this.focusedIdx]);
        return;
      }
      this._ensureFocusVisible();
      return;
    }
    if (evt.type === 'wheel') {
      this.targetScroll = clamp(this.targetScroll + evt.dy, 0, this.maxScroll);
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      this._handleClick(evt.x, evt.y);
    }
  }

  _ensureFocusVisible() {
    const L = this._layout();
    const row = Math.floor(this.focusedIdx / L.cols);
    const cardTop = row * (L.cardH + L.gap);
    const cardBottom = cardTop + L.cardH;
    if (cardTop < this.targetScroll) this.targetScroll = cardTop;
    else if (cardBottom > this.targetScroll + L.viewH) this.targetScroll = cardBottom - L.viewH;
  }

  _handleClick(mx, my) {
    if (mx < 50 && my < 50) { this.manager.goTo('title'); return; }
    if (my < 60) return;
    const items = this._allItems();
    for (let i = 0; i < items.length; i++) {
      const b = items[i]._bounds;
      if (!b) continue;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this._select(items[i]);
        return;
      }
    }
  }

  _select(m) {
    if (!m) return;
    if (m.__custom) {
      this.manager.goTo('customMedley');
      return;
    }
    const masteredCount = UserSkillEstimator.getMasteredCount();
    if (m.unlockCondition && masteredCount < (m.unlockCondition.value || 0)) return;
    this.manager.goTo('countdown', {
      mode: 'medley',
      medleyId: m.id,
      medleyCustom: m.createdAt !== undefined ? m : null,
      songId: 'medley_' + m.id,
      difficulty: 'normal'
    });
  }

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

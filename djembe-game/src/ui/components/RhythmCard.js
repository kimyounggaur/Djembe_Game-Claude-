/**
 * RhythmCard.js - 리듬 도감 카드 (Canvas)
 */
import { StarRating } from './StarRating.js';
import { TierBadge } from './TierBadge.js';
import { DifficultyCalculator } from '../../utils/DifficultyCalculator.js';

export const RhythmCard = {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 좌상단 X
   * @param {number} y - 좌상단 Y
   * @param {number} w - 너비
   * @param {number} h - 높이
   * @param {Object} rhythm - library.json의 rhythm 메타
   * @param {Object} progress - { played, cleared, grade, fullCombo, mastered }
   * @param {Object} opts - { hovered, region, lang, focused }
   */
  render(ctx, x, y, w, h, rhythm, progress = {}, opts = {}) {
    const { hovered = false, focused = false, region = null, lang = 'ko' } = opts;
    const scale = hovered ? 1.04 : (focused ? 1.02 : 1.0);
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    const regionColor = region?.color || '#888';
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, regionColor + 'CC');
    grad.addColorStop(1, regionColor + '66');

    if (hovered || focused) {
      ctx.shadowColor = regionColor;
      ctx.shadowBlur = 16;
    }
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = hovered ? '#fff' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = hovered || focused ? 2 : 1;
    this._roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    if (!rhythm.unlocked) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      this._roundRect(ctx, x, y, w, h, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${w * 0.18}px sans-serif`;
      ctx.fillText('🔒', cx, cy);
      ctx.restore();
      return;
    }

    const pad = Math.max(8, w * 0.06);
    const nameSize = Math.min(22, w * 0.13);
    const nameY = y + pad + nameSize * 0.7;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `bold ${nameSize}px sans-serif`;
    ctx.fillText(rhythm.name[lang] || rhythm.name.ko, cx, y + pad);

    if (rhythm.name.en && lang === 'ko') {
      ctx.font = `${nameSize * 0.55}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(rhythm.name.en, cx, y + pad + nameSize + 2);
    }

    const starsY = y + pad + nameSize + nameSize * 0.7 + 6;
    const starWidth = StarRating.width(10, 'sm', false);
    StarRating.render(ctx, cx - starWidth / 2, starsY, { stars: rhythm.stars, maxStars: 10, size: 'sm', showNumber: false });

    if (region) {
      const flagY = starsY + 18;
      ctx.font = `${w * 0.14}px sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(region.flag || '', cx - 30, flagY + 4);
      ctx.font = `${w * 0.075}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(region.name[lang] || region.name.ko, cx - 12, flagY + 12);
    }

    const purposes = rhythm.purposes || [];
    const purposeY = y + h * 0.52;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${w * 0.18}px sans-serif`;
    ctx.fillText(purposes.slice(0, 3).map(p => this._purposeIcon(p)).join(' '), cx, purposeY);

    ctx.font = `${w * 0.085}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textBaseline = 'middle';
    ctx.fillText(`♩ ${rhythm.baseBpm} BPM`, cx, y + h * 0.74);

    const tierW = TierBadge.measureWidth(ctx, rhythm.tier, lang, { size: 'sm' });
    TierBadge.render(ctx, cx - tierW / 2, y + h - 30, rhythm.tier, lang, { size: 'sm' });

    if (progress.grade) {
      ctx.save();
      ctx.fillStyle = this._gradeColor(progress.grade);
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(progress.grade, x + 18, y + 18);
      ctx.restore();
    }
    if (progress.fullCombo) {
      ctx.save();
      ctx.fillStyle = '#FFD93D';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('⭐', x + w - 8, y + 4);
      ctx.restore();
    }
    if (progress.mastered) {
      ctx.save();
      ctx.fillStyle = '#9C27B0';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('👑', x + w - 26, y + 4);
      ctx.restore();
    }

    ctx.restore();
  },

  _purposeIcon(p) {
    const map = {
      celebration: '🎉', ritual: '🔥', warrior: '⚔️',
      labor: '🌾', courtship: '💕', initiation: '🌿'
    };
    return map[p] || '•';
  },

  _gradeColor(g) {
    const map = { S: '#FFD93D', A: '#76FF03', B: '#4ECDC4', C: '#FF9800', D: '#9E9E9E' };
    return map[g] || '#9E9E9E';
  },

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
};

/**
 * TierBadge.js - 초급/중급/고급 뱃지 (Canvas)
 */
import { DifficultyCalculator } from '../../utils/DifficultyCalculator.js';

export const TierBadge = {
  render(ctx, x, y, tier, lang = 'ko', opts = {}) {
    const size = opts.size || 'md';
    const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
    const padX = fontSize * 0.6;
    const padY = fontSize * 0.35;

    const icons = { beginner: '🌱', intermediate: '🔥', advanced: '👑' };
    const icon = icons[tier] || '';
    const label = DifficultyCalculator.tierLabel(tier, lang);
    const color = DifficultyCalculator.tierColor(tier);
    const text = icon ? `${icon} ${label}` : label;

    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    const w = ctx.measureText(text).width + padX * 2;
    const h = fontSize + padY * 2;

    ctx.fillStyle = color + '33';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    this._roundRect(ctx, x, y, w, h, h * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + padX, y + h / 2);
    ctx.restore();
    return { width: w, height: h };
  },

  measureWidth(ctx, tier, lang = 'ko', opts = {}) {
    const size = opts.size || 'md';
    const fontSize = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
    const padX = fontSize * 0.6;
    const icons = { beginner: '🌱', intermediate: '🔥', advanced: '👑' };
    const icon = icons[tier] || '';
    const label = DifficultyCalculator.tierLabel(tier, lang);
    const text = icon ? `${icon} ${label}` : label;
    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    const w = ctx.measureText(text).width + padX * 2;
    ctx.restore();
    return w;
  },

  _roundRect(ctx, x, y, w, h, r) {
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

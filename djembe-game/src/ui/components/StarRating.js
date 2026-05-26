/**
 * StarRating.js - Canvas 기반 별점 (1~10) 컴포넌트
 */
import { DifficultyCalculator } from '../../utils/DifficultyCalculator.js';

export const StarRating = {
  /**
   * Canvas에 별점 그리기
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 좌측 시작 X
   * @param {number} y - 중심 Y
   * @param {Object} opts - { stars, maxStars=10, size='md', showNumber=false }
   */
  render(ctx, x, y, opts) {
    const { stars, maxStars = 10, size = 'md', showNumber = false } = opts;
    const starSize = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
    const gap = starSize * 0.4;
    const color = DifficultyCalculator.starColor(stars);

    ctx.save();
    for (let i = 0; i < maxStars; i++) {
      const cx = x + i * (starSize * 2 + gap);
      const filled = i < stars;
      this._drawStar(ctx, cx, y, starSize, filled ? color : 'rgba(255,255,255,0.15)', filled);
    }
    if (showNumber) {
      ctx.fillStyle = color;
      ctx.font = `${starSize * 1.3}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(`${stars}/${maxStars}`, x + maxStars * (starSize * 2 + gap) + 4, y);
    }
    ctx.restore();
  },

  width(maxStars = 10, size = 'md', showNumber = false) {
    const starSize = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
    const gap = starSize * 0.4;
    let w = maxStars * (starSize * 2 + gap);
    if (showNumber) w += 50;
    return w;
  },

  _drawStar(ctx, cx, cy, r, color, filled) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
};

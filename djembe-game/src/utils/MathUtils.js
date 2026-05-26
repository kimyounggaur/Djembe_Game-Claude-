/**
 * MathUtils.js - 수학 헬퍼
 */
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOutElastic = (t) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const random = (min, max) => Math.random() * (max - min) + min;
export const randomInt = (min, max) => Math.floor(random(min, max + 1));
export const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const formatScore = (s) => s.toString().padStart(8, '0');
export const formatTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

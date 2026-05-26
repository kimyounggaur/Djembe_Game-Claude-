/**
 * ParticleSystem.js - Spark/Star/Heart/Ring 파티클
 */
import { random } from '../utils/MathUtils.js';

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.active = false;
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.gravity = 0;
    this.life = 0; this.maxLife = 1;
    this.size = 4;
    this.color = '#fff';
    this.alpha = 1;
    this.rotation = 0;
    this.rotSpeed = 0;
    this.shape = 'circle';
  }
  init(opts) {
    Object.assign(this, opts);
    this.active = true;
    this.life = this.maxLife;
  }
  update(dt) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
    if (this.life <= 0) this.active = false;
  }
}

export class ParticleSystem {
  constructor(maxParticles = 500) {
    this.max = maxParticles;
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) this.particles.push(new Particle());
    this.quality = 'high';
  }

  setQuality(q) {
    this.quality = q;
    if (q === 'low') this.max = 100;
    else if (q === 'medium') this.max = 250;
    else this.max = 500;
  }

  _spawn(opts) {
    for (const p of this.particles) {
      if (!p.active) { p.init(opts); return p; }
    }
    return null;
  }

  spark(x, y, color = '#FFD700', count = 20) {
    const n = Math.floor(count * (this.quality === 'low' ? 0.3 : this.quality === 'medium' ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + random(-0.3, 0.3);
      const speed = random(120, 400);
      this._spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        gravity: 800,
        maxLife: random(0.5, 0.9),
        size: random(2, 5),
        color,
        shape: 'circle'
      });
    }
  }

  star(x, y, color = '#00E5FF', count = 5) {
    const n = Math.floor(count * (this.quality === 'low' ? 0.3 : this.quality === 'medium' ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + random(-0.5, 0.5);
      const speed = random(100, 200);
      this._spawn({
        x: x + random(-10, 10),
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 150,
        maxLife: random(0.8, 1.2),
        size: random(8, 14),
        color,
        rotSpeed: random(-6, 6),
        shape: 'star'
      });
    }
  }

  heart(x, y, color = '#FF6B6B', count = 8) {
    const n = Math.floor(count * (this.quality === 'low' ? 0.3 : this.quality === 'medium' ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      this._spawn({
        x: x + random(-30, 30),
        y: y + random(-10, 10),
        vx: random(-60, 60),
        vy: random(-180, -120),
        gravity: 100,
        maxLife: random(1.0, 1.6),
        size: random(10, 18),
        color,
        rotSpeed: random(-3, 3),
        shape: 'heart'
      });
    }
  }

  ring(x, y, color = '#FFD93D') {
    this._spawn({
      x, y, vx: 0, vy: 0, gravity: 0,
      maxLife: 0.5, size: 30, color, shape: 'ring'
    });
  }

  update(dt) {
    for (const p of this.particles) p.update(dt);
  }

  render(ctx) {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        this._drawStar(ctx, 0, 0, 5, p.size, p.size * 0.5);
        ctx.fill();
      } else if (p.shape === 'heart') {
        this._drawHeart(ctx, p.size);
      } else if (p.shape === 'ring') {
        const t = 1 - p.alpha;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, p.size + t * 120, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawStar(ctx, cx, cy, spikes, outer, inner) {
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outer;
      let y = cy + Math.sin(rot) * outer;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * inner;
      y = cy + Math.sin(rot) * inner;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
  }

  _drawHeart(ctx, size) {
    const s = size / 12;
    ctx.beginPath();
    ctx.moveTo(0, 3 * s);
    ctx.bezierCurveTo(0, 0, -6 * s, -2 * s, -6 * s, -5 * s);
    ctx.bezierCurveTo(-6 * s, -8 * s, -3 * s, -8 * s, 0, -5 * s);
    ctx.bezierCurveTo(3 * s, -8 * s, 6 * s, -8 * s, 6 * s, -5 * s);
    ctx.bezierCurveTo(6 * s, -2 * s, 0, 0, 0, 3 * s);
    ctx.fill();
  }

  clear() {
    for (const p of this.particles) p.active = false;
  }
}

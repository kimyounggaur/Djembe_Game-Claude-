/**
 * Scene.js - 모든 Scene의 기반 클래스
 */
export class Scene {
  constructor(app) {
    this.app = app;
    this.name = '';
    this.manager = null;
    this.uiButtons = [];
  }

  onEnter(data) {}
  onExit() {}
  update(dt) {}
  render(ctx, w, h) {}
  handleInput(evt) {
    if (evt.type === 'down' && evt.source === 'touch') {
      this._hitTestButtons(evt.x, evt.y);
    }
  }
  onResize(w, h) {}

  _hitTestButtons(x, y) {
    for (const btn of this.uiButtons) {
      if (btn.visible !== false && x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (btn.onClick) btn.onClick();
        return true;
      }
    }
    return false;
  }

  drawButton(ctx, btn, t) {
    const hover = btn.hover ? 1 : 0;
    const pulse = btn.pulse ? Math.sin(t * 2) * 0.05 + 1 : 1;
    ctx.save();
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-cx, -cy);
    if (btn.shadow !== false) {
      ctx.shadowColor = btn.shadowColor || 'rgba(78,205,196,0.5)';
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = btn.bg || '#4ECDC4';
    this._roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.radius || 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = btn.color || '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${btn.fontSize || 20}px sans-serif`;
    ctx.fillText(btn.label || '', cx, cy);
    ctx.restore();
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

  drawBackground(ctx, w, h, gradient) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, gradient[0]);
    g.addColorStop(1, gradient[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

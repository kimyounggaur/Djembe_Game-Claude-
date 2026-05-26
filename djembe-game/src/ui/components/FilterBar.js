/**
 * FilterBar.js - 필터 칩(tab) + 드롭다운 가로 바
 */
export class FilterBar {
  constructor(opts = {}) {
    this.x = 0;
    this.y = 0;
    this.w = 800;
    this.h = 48;
    this.options = opts.options || {};
    this.values = opts.values || {};
    this.onChange = opts.onChange || (() => {});
    this.lang = opts.lang || 'ko';
    this.chips = [];
    this.dropdowns = [];
    this.expandedDropdown = null;
    this._layout();
  }

  setBounds(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this._layout();
  }

  setValues(values) {
    this.values = { ...this.values, ...values };
  }

  _layout() {
    this.chips = [];
    this.dropdowns = [];

    // Chips for "tier" (initial sticky group)
    const tierOpts = this.options.tier || [];
    const chipPadX = 14;
    const chipH = 32;
    let cx = this.x;
    const chipY = this.y + (this.h - chipH) / 2;

    tierOpts.forEach(opt => {
      const label = opt.label;
      const w = this._textWidth(label, 13) + chipPadX * 2;
      this.chips.push({
        kind: 'tier', value: opt.value, label,
        x: cx, y: chipY, w, h: chipH
      });
      cx += w + 6;
    });

    cx += 16;
    const ddH = 32;
    const ddY = this.y + (this.h - ddH) / 2;
    const dropdownDefs = [
      { key: 'region', options: this.options.region },
      { key: 'purpose', options: this.options.purpose },
      { key: 'tempo', options: this.options.tempo },
      { key: 'sort', options: this.options.sort }
    ];

    dropdownDefs.forEach(d => {
      if (!d.options) return;
      const cur = this.values[d.key];
      const curOpt = d.options.find(o => o.value === cur) || d.options[0];
      const label = `${d.options[0].groupLabel || d.key}: ${curOpt.label}`;
      const w = Math.min(180, this._textWidth(label, 13) + 28);
      this.dropdowns.push({
        kind: d.key,
        x: cx, y: ddY, w, h: ddH,
        options: d.options,
        currentValue: cur
      });
      cx += w + 8;
    });
  }

  _textWidth(text, fontSize) {
    return text.length * fontSize * 0.7;
  }

  hitTest(mx, my) {
    if (this.expandedDropdown) {
      const dd = this.dropdowns.find(d => d.kind === this.expandedDropdown);
      if (dd) {
        const ddOpenH = dd.options.length * 30 + 4;
        if (mx >= dd.x && mx <= dd.x + dd.w && my >= dd.y + dd.h && my <= dd.y + dd.h + ddOpenH) {
          const idx = Math.floor((my - dd.y - dd.h - 2) / 30);
          if (idx >= 0 && idx < dd.options.length) {
            const opt = dd.options[idx];
            this.values[dd.kind] = opt.value;
            this.expandedDropdown = null;
            this._layout();
            this.onChange(dd.kind, opt.value);
            return true;
          }
        }
        this.expandedDropdown = null;
        return false;
      }
    }
    for (const c of this.chips) {
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        const newVal = this.values[c.kind] === c.value ? null : c.value;
        this.values[c.kind] = newVal;
        this._layout();
        this.onChange(c.kind, newVal);
        return true;
      }
    }
    for (const d of this.dropdowns) {
      if (mx >= d.x && mx <= d.x + d.w && my >= d.y && my <= d.y + d.h) {
        this.expandedDropdown = this.expandedDropdown === d.kind ? null : d.kind;
        return true;
      }
    }
    return false;
  }

  render(ctx) {
    ctx.save();
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'middle';

    for (const c of this.chips) {
      const active = this.values[c.kind] === c.value;
      ctx.fillStyle = active ? '#FF6B6B' : 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, c.x, c.y, c.w, c.h, c.h / 2);
      ctx.fill();
      ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(c.label, c.x + c.w / 2, c.y + c.h / 2);
    }

    for (const d of this.dropdowns) {
      const isOpen = this.expandedDropdown === d.kind;
      const curOpt = d.options.find(o => o.value === d.currentValue) || d.options[0];
      const label = `${curOpt.groupLabel || d.kind}: ${curOpt.label}`;
      ctx.fillStyle = isOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, d.x, d.y, d.w, d.h, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(label, d.x + 10, d.y + d.h / 2);
      ctx.textAlign = 'right';
      ctx.fillText(isOpen ? '▲' : '▼', d.x + d.w - 8, d.y + d.h / 2);
    }
    ctx.restore();
  }

  /** 드롭다운 펼친 패널 — 카드들 위에 그리도록 별도 호출 */
  renderOverlay(ctx) {
    if (!this.expandedDropdown) return;
    const dd = this.dropdowns.find(d => d.kind === this.expandedDropdown);
    if (!dd) return;
    const ddOpenH = dd.options.length * 30 + 4;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#1a2530';
    this._roundRect(ctx, dd.x, dd.y + dd.h + 2, dd.w, ddOpenH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    dd.options.forEach((opt, i) => {
      const itemY = dd.y + dd.h + 4 + i * 30;
      if (opt.value === dd.currentValue) {
        ctx.fillStyle = 'rgba(255,107,107,0.25)';
        ctx.fillRect(dd.x + 2, itemY, dd.w - 4, 30);
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(opt.label, dd.x + 12, itemY + 15);
    });
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
}

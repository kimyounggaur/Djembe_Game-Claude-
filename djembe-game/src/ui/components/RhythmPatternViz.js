/**
 * RhythmPatternViz.js - 피아노 롤 스타일 리듬 패턴 시각화
 */
const LANE_ORDER = ['slap', 'tone', 'bass'];
const LANE_COLORS = {
  slap: '#FF1744',
  tone: '#4CAF50',
  bass: '#9C27B0'
};
const LANE_LABEL = { slap: 'S', tone: 'T', bass: 'B' };

export class RhythmPatternViz {
  /**
   * @param {Object} pattern - { lengthInBeats, subdivisions?, notes: [{step, lane, type}] }
   * @param {Object} opts
   */
  constructor(pattern, opts = {}) {
    this.pattern = pattern || { lengthInBeats: 4, notes: [] };
    this.subdivisions = opts.subdivisions || 4;
    this.totalSteps = (this.pattern.lengthInBeats || 4) * this.subdivisions;
    this.currentStep = -1;        // 재생 중일 때 현재 step
    this.playProgress = 0;        // 0..1 within current step
    this.hoveredNote = null;
  }

  setPattern(pattern, subdivisions) {
    this.pattern = pattern || { lengthInBeats: 4, notes: [] };
    this.subdivisions = subdivisions || this.subdivisions;
    this.totalSteps = (this.pattern.lengthInBeats || 4) * this.subdivisions;
  }

  setProgress(stepFloat) {
    if (stepFloat < 0) { this.currentStep = -1; this.playProgress = 0; return; }
    this.currentStep = Math.floor(stepFloat) % this.totalSteps;
    this.playProgress = stepFloat - Math.floor(stepFloat);
  }

  render(ctx, x, y, w, h) {
    const labelW = 28;
    const gridX = x + labelW;
    const gridW = w - labelW;
    const gridY = y + 24;          // 헤더 공간
    const gridH = h - 48;          // 푸터 공간
    const stepW = gridW / this.totalSteps;
    const laneH = gridH / LANE_ORDER.length;

    ctx.save();

    // 헤더: beat 카운트
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const beats = this.pattern.lengthInBeats || 4;
    for (let i = 0; i < this.totalSteps; i++) {
      const sx = gridX + i * stepW + stepW / 2;
      const isBeat = i % this.subdivisions === 0;
      ctx.fillStyle = isBeat ? '#FFD93D' : 'rgba(255,255,255,0.4)';
      if (isBeat) {
        const beatNum = Math.floor(i / this.subdivisions) + 1;
        ctx.fillText(String(beatNum), sx, y + 12);
      } else {
        const sub = i % this.subdivisions;
        const label = sub === 1 ? 'e' : sub === 2 ? '+' : 'a';
        ctx.fillText(label, sx, y + 12);
      }
    }

    // 배경 + 그리드
    LANE_ORDER.forEach((lane, li) => {
      const ly = gridY + li * laneH;
      ctx.fillStyle = li % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(gridX, ly, gridW, laneH);
      ctx.fillStyle = LANE_COLORS[lane];
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LANE_LABEL[lane], x + labelW / 2, ly + laneH / 2);
    });

    // 박자 구분선
    for (let i = 0; i <= this.totalSteps; i++) {
      const sx = gridX + i * stepW;
      const isBeat = i % this.subdivisions === 0;
      ctx.strokeStyle = isBeat ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = isBeat ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, gridY);
      ctx.lineTo(sx, gridY + gridH);
      ctx.stroke();
    }

    // 노트 렌더링
    const notes = this.pattern.notes || [];
    notes.forEach(n => {
      const laneIdx = LANE_ORDER.indexOf(n.lane);
      if (laneIdx < 0) return;
      const nx = gridX + n.step * stepW + 1;
      const ny = gridY + laneIdx * laneH + 4;
      const nh = laneH - 8;
      let nw = stepW - 2;
      if (n.type === 'hold' && n.duration) {
        // duration이 ms일 수 있음 → step 단위로 변환 (BPM 가정 필요)
        nw = Math.max(stepW - 2, n.holdSteps ? n.holdSteps * stepW - 2 : nw);
      }

      const color = LANE_COLORS[n.lane];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      this._roundRect(ctx, nx, ny, nw, nh, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 재생 헤드
    if (this.currentStep >= 0) {
      const headX = gridX + (this.currentStep + this.playProgress) * stepW;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#FFD93D';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(headX, gridY);
      ctx.lineTo(headX, gridY + gridH);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 푸터: 비트 카운트 "1 e + a 2 e + a ..."
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const totalText = `${beats} beats / ${this.totalSteps} steps`;
    ctx.fillText(totalText, gridX, y + h - 12);

    ctx.restore();
  }

  /** 호버 노트 식별 */
  hitTestNote(mx, my, x, y, w, h) {
    const labelW = 28;
    const gridX = x + labelW;
    const gridW = w - labelW;
    const gridY = y + 24;
    const gridH = h - 48;
    const stepW = gridW / this.totalSteps;
    const laneH = gridH / LANE_ORDER.length;
    for (const n of this.pattern.notes || []) {
      const laneIdx = LANE_ORDER.indexOf(n.lane);
      if (laneIdx < 0) continue;
      const nx = gridX + n.step * stepW;
      const ny = gridY + laneIdx * laneH;
      if (mx >= nx && mx <= nx + stepW && my >= ny && my <= ny + laneH) return n;
    }
    return null;
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

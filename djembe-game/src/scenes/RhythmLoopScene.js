/**
 * RhythmLoopScene.js - BPM 조정 가능한 무한 반복 연습 모드
 *   - 사용자가 BPM 슬라이더로 속도 조정
 *   - Auto BPM Up 옵션: 4마디 클리어마다 BPM 자동 상승
 *   - 정확도/콤보/최고 BPM 실시간 표시
 *   - 미스해도 게임 안 끝남 (연습용)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { RhythmPlayer } from '../audio/RhythmPlayer.js';
import { RhythmPatternViz } from '../ui/components/RhythmPatternViz.js';
import { clamp, easeOutCubic, formatScore } from '../utils/MathUtils.js';

const LANE_X_RATIO = { slap: 0.2, bass: 0.5, tone: 0.8 };
const LANE_COLOR = { slap: '#FF1744', bass: '#9C27B0', tone: '#4CAF50' };

export class RhythmLoopScene extends Scene {
  constructor(app) {
    super(app);
    this.rhythmId = null;
    this.rhythm = null;
    this.variationIdx = 0;
    this.pattern = null;
    this.bpm = 90;
    this.minBpm = 60;
    this.maxBpm = 200;
    this.player = null;
    this.viz = null;
    this.barCounter = 0;
    this.barsAccuracy = [];      // per-bar accuracy
    this.combo = 0;
    this.maxCombo = 0;
    this.maxBpmReached = 0;
    this.hits = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.totalHits = 0;
    this.lastJudgmentTime = 0;
    this.lastJudgment = null;
    this.autoBpmUp = false;
    this.flashLane = { slap: 0, bass: 0, tone: 0 };
    this.inputHandler = null;
    this.uiButtons = [];
    this.bpmDragging = false;
    this.judgmentY = 0.78;
    this.scrollSpeed = 1.6;
    this.spawnedNotes = [];      // {time, lane, type, hit}
    this.lookahead = 2500;       // ms — show notes 2.5s ahead
    this.startedAt = 0;
    this.lastSpawnTime = -1;
  }

  async onEnter(data) {
    this.rhythmId = data?.rhythmId;
    this.variationIdx = data?.variationIdx ?? 0;
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
    this.rhythm = await this.app.rhythmLoader.loadRhythm(this.rhythmId);
    if (!this.rhythm) { this.manager.goTo('rhythmLibrary'); return; }
    const v = this.rhythm.variations?.[this.variationIdx];
    this.pattern = (v && !v.patternRef) ? { lengthInBeats: this.rhythm.pattern.lengthInBeats, notes: v.notes } : this.rhythm.pattern;
    this.bpm = data?.bpm || Math.max(60, this.rhythm.baseBpm - 30);
    this.minBpm = this.rhythm.bpmRange?.min || 60;
    this.maxBpm = this.rhythm.bpmRange?.max || 200;
    this.barCounter = 0;
    this.barsAccuracy = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.maxBpmReached = 0;
    this.hits = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.totalHits = 0;
    this.spawnedNotes = [];
    this.lastSpawnTime = -1;
    this.judgmentY = this.app.settings.judgmentY;
    this.scrollSpeed = this.app.settings.scrollSpeed;

    this.player = new RhythmPlayer(this.app.audioEngine, this.app.sampleBank);
    this.player.onLoop = (loopNum) => this._onLoopComplete(loopNum);
    this.viz = new RhythmPatternViz(this.pattern, { subdivisions: this.rhythm.subdivisions || 4 });
    this.player.start(this.pattern, { bpm: this.bpm, subdivisions: this.rhythm.subdivisions || 4, loop: true, metronome: this.app.settings.metronome !== 'off' });
    this.startedAt = this.app.audioEngine.currentTime;
    this.inputHandler = (evt) => this._onInput(evt);
    this.app.inputManager.on(this.inputHandler);
    this._buildButtons();
  }

  onExit() {
    if (this.player) this.player.stop();
    if (this.inputHandler) this.app.inputManager.off(this.inputHandler);
    // 결과 저장
    if (this.maxBpmReached > 0 && this.rhythmId) {
      Storage.saveRhythmScore(this.rhythmId, {
        score: 0,
        grade: 'D',
        accuracy: this.totalHits > 0 ? this.hits.perfect / this.totalHits : 0,
        maxBpm: this.maxBpmReached
      });
    }
  }

  _buildButtons() {
    const w = this.app.width;
    const isMobile = w < 700;
    const topY = 70;
    const bx = w - 380;
    this.uiButtons = [
      { kind: 'bpmDelta', val: -10, label: '-10', x: bx, y: topY, w: 50, h: 32 },
      { kind: 'bpmDelta', val: -5, label: '-5', x: bx + 56, y: topY, w: 40, h: 32 },
      { kind: 'bpmDelta', val: +5, label: '+5', x: bx + 102, y: topY, w: 40, h: 32 },
      { kind: 'bpmDelta', val: +10, label: '+10', x: bx + 148, y: topY, w: 50, h: 32 },
      { kind: 'autoBpm', label: 'Auto BPM ↑', x: bx + 210, y: topY, w: 130, h: 32 }
    ];
  }

  onResize() { this._buildButtons(); }

  _onLoopComplete(loopNum) {
    this.barCounter++;
    const barNotes = this.spawnedNotes.filter(n => n._bar === loopNum - 1);
    const hits = barNotes.filter(n => n.judgment && n.judgment !== 'miss').length;
    const acc = barNotes.length ? hits / barNotes.length : 1;
    this.barsAccuracy.push(acc);
    if (this.barsAccuracy.length > 8) this.barsAccuracy.shift();
    if (this.autoBpmUp) {
      const lastFour = this.barsAccuracy.slice(-4);
      if (lastFour.length >= 4) {
        const avg = lastFour.reduce((a, b) => a + b, 0) / lastFour.length;
        if (avg >= 1.0) this._adjustBpm(+10);
        else if (avg >= 0.9) this._adjustBpm(+5);
        else if (avg < 0.5) this._adjustBpm(-5);
      }
    }
    this.maxBpmReached = Math.max(this.maxBpmReached, this.bpm);
    // 오래된 노트 정리
    this.spawnedNotes = this.spawnedNotes.filter(n => n._bar >= loopNum - 1);
  }

  _adjustBpm(delta) {
    const newBpm = clamp(this.bpm + delta, this.minBpm, this.maxBpm);
    if (newBpm === this.bpm) return;
    this.bpm = newBpm;
    this.player.setBpm(this.bpm);
  }

  _onInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') {
        this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId });
        return;
      }
      if (evt.code === 'ArrowLeft') { this._adjustBpm(-5); return; }
      if (evt.code === 'ArrowRight') { this._adjustBpm(+5); return; }
      if (evt.code === 'KeyA') { this.autoBpmUp = !this.autoBpmUp; return; }
    }
    if (evt.type === 'down') {
      if (evt.source === 'touch') {
        const hit = this._hitTestUI(evt.x, evt.y);
        if (hit) return;
      }
      this._handleLaneHit(evt.lane, evt.time);
    }
    if (evt.type === 'wheel') {
      const delta = evt.dy > 0 ? -5 : +5;
      this._adjustBpm(delta);
    }
  }

  _hitTestUI(mx, my) {
    if (mx < 50 && my < 50) {
      this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId });
      return true;
    }
    for (const b of this.uiButtons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (b.kind === 'bpmDelta') this._adjustBpm(b.val);
        else if (b.kind === 'autoBpm') this.autoBpmUp = !this.autoBpmUp;
        return true;
      }
    }
    return false;
  }

  _handleLaneHit(lane, evtTime) {
    this.flashLane[lane] = 1.0;
    const inputMs = (evtTime - this.startedAt) * 1000;
    const nowMs = (this.app.audioEngine.currentTime - this.startedAt) * 1000;
    // 가장 가까운 spawnedNote 찾기
    let best = null;
    let bestDist = Infinity;
    for (const n of this.spawnedNotes) {
      if (n.judgment) continue;
      if (n.lane !== lane) continue;
      const dist = Math.abs(n.absoluteTime - nowMs);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    let judgment = null;
    if (best && bestDist <= 100) {
      judgment = bestDist <= 30 ? 'perfect' : bestDist <= 60 ? 'great' : 'good';
      best.judgment = judgment;
      this.hits[judgment]++;
      this.totalHits++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.app.sampleBank.playHit(lane, judgment);
      this.lastJudgment = { judgment, lane };
      this.lastJudgmentTime = this.app.elapsed;
    } else {
      this.app.sampleBank.playHit(lane, 'perfect');
    }
  }

  update(dt) {
    if (!this.player || !this.pattern || !this.rhythm) return;
    const ctxTime = this.app.audioEngine.currentTime;
    const stepFloat = this.player.getCurrentStepFloat();
    if (this.viz) this.viz.setProgress(stepFloat);

    const stepDur = this.player.stepDuration() * 1000; // ms
    const patternDurMs = this.player.patternDuration() * 1000;
    const nowMs = (ctxTime - this.startedAt) * 1000;

    // 노트 스폰: 현재 시간 + lookahead 안에 들어오는 노트들
    const horizon = nowMs + this.lookahead;
    const startBar = Math.max(0, Math.floor((nowMs - 100) / patternDurMs));
    const endBar = Math.ceil(horizon / patternDurMs) + 1;
    for (let bar = startBar; bar <= endBar; bar++) {
      for (const n of (this.pattern.notes || [])) {
        const absT = bar * patternDurMs + n.step * stepDur;
        if (absT < nowMs - 200) continue;
        if (absT > horizon) continue;
        const key = `${bar}-${n.step}-${n.lane}`;
        if (this.spawnedNotes.find(x => x._key === key)) continue;
        this.spawnedNotes.push({
          _key: key, _bar: bar,
          lane: n.lane,
          absoluteTime: absT,
          spawnedAt: nowMs,
          judgment: null
        });
      }
    }

    // 미스 감지: 판정선 통과 후 100ms 이상 안 친 노트
    for (const n of this.spawnedNotes) {
      if (n.judgment) continue;
      if (nowMs > n.absoluteTime + 100) {
        n.judgment = 'miss';
        this.hits.miss++;
        this.totalHits++;
        this.combo = 0;
      }
    }

    // 오래된 노트 가비지 컬렉션
    this.spawnedNotes = this.spawnedNotes.filter(n => n.absoluteTime > nowMs - 1500);

    for (const lane of ['slap', 'bass', 'tone']) {
      this.flashLane[lane] = Math.max(0, this.flashLane[lane] - dt * 3);
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    if (!this.rhythm || !this.player || !this.pattern) {
      ctx.fillStyle = T.text.primary;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i18n.t('loading'), w / 2, h / 2);
      return;
    }
    this._renderHeader(ctx, w, h);
    this._renderLanes(ctx, w, h);
    this._renderJudgmentLine(ctx, w, h);
    this._renderNotes(ctx, w, h);
    this._renderBpmPanel(ctx, w, h);
    this._renderHud(ctx, w, h);
    this._renderJudgmentText(ctx, w, h);
    this._renderViz(ctx, w, h);
  }

  _renderHeader(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, 12, 12, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 28);
    const name = this.rhythm.name?.[i18n.getLang()] || this.rhythm.name?.ko || this.rhythmId;
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🔁 ${i18n.t('loopPractice')} — ${name}`, 60, 28);
    ctx.restore();
  }

  _renderLanes(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    const laneW = w * 0.28;
    for (const lane of ['slap', 'bass', 'tone']) {
      const cx = w * LANE_X_RATIO[lane];
      const flash = this.flashLane[lane];
      const g = ctx.createLinearGradient(cx - laneW / 2, 0, cx + laneW / 2, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${0.05 + flash * 0.2})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - laneW / 2, 56, laneW, h);
    }
    ctx.restore();
  }

  _renderJudgmentLine(ctx, w, h) {
    const T = Theme.current;
    const y = h * this.judgmentY;
    ctx.save();
    ctx.strokeStyle = T.primary;
    ctx.lineWidth = 2;
    ctx.shadowColor = T.primary;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.restore();
  }

  _renderNotes(ctx, w, h) {
    const judgY = h * this.judgmentY;
    const topY = 56;
    const nowMs = (this.app.audioEngine.currentTime - this.startedAt) * 1000;
    const travelMs = this.lookahead / this.scrollSpeed;
    ctx.save();
    for (const n of this.spawnedNotes) {
      if (n.judgment === 'miss' || (n.judgment && n.absoluteTime < nowMs - 200)) continue;
      const dt = n.absoluteTime - nowMs;
      if (dt < -100 || dt > this.lookahead) continue;
      const progress = 1 - dt / travelMs; // 0 = top, 1 = judgY
      const ny = topY + (judgY - topY) * Math.max(0, progress);
      const nx = w * LANE_X_RATIO[n.lane];
      const radius = 22;
      ctx.fillStyle = LANE_COLOR[n.lane];
      ctx.shadowColor = LANE_COLOR[n.lane];
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderBpmPanel(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    // BPM 큰 디스플레이 (상단 중앙)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this._roundRect(ctx, w / 2 - 100, 64, 200, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bpm}`, w / 2 - 30, 89);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText('BPM', w / 2 + 30, 91);

    // BPM 슬라이더
    const sliderY = 124;
    const sliderX = w / 2 - 140;
    const sliderW = 280;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, sliderX, sliderY, sliderW, 6, 3);
    ctx.fill();
    const pct = (this.bpm - this.minBpm) / Math.max(1, this.maxBpm - this.minBpm);
    ctx.fillStyle = T.primary;
    this._roundRect(ctx, sliderX, sliderY, sliderW * pct, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sliderX + sliderW * pct, sliderY + 3, 10, 0, Math.PI * 2);
    ctx.fill();
    this.bpmSlider = { x: sliderX, y: sliderY - 10, w: sliderW, h: 26 };

    // BPM ± 버튼 + Auto BPM 토글
    for (const b of this.uiButtons) {
      const isAuto = b.kind === 'autoBpm';
      const active = isAuto && this.autoBpmUp;
      ctx.fillStyle = active ? '#4ECDC4' : 'rgba(255,255,255,0.15)';
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }

    // 최고 BPM
    ctx.fillStyle = T.text.tertiary;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i18n.t('maxBpmReached')}: ${this.maxBpmReached}`, 14, 80);
    ctx.restore();
  }

  _renderHud(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    // 진행 바 (현재 마디)
    const stepFloat = this.player.getCurrentStepFloat();
    const subdivisions = this.rhythm.subdivisions || 4;
    const beatsInBar = this.pattern.lengthInBeats || 4;
    const stepInBar = stepFloat % (beatsInBar * subdivisions);
    const barPct = stepInBar / (beatsInBar * subdivisions);
    const barW = 200;
    const barX = 14;
    const barY = h - 40;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, barX, barY, barW, 6, 3);
    ctx.fill();
    ctx.fillStyle = T.primary;
    this._roundRect(ctx, barX, barY, barW * barPct, 6, 3);
    ctx.fill();
    ctx.fillStyle = T.text.secondary;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Bar ${this.barCounter + 1} • Beat ${Math.floor(stepInBar / subdivisions) + 1}/${beatsInBar}`, barX, barY - 6);

    // 정확도
    const accPct = this.totalHits ? this.hits.perfect / this.totalHits * 100 : 0;
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${i18n.t('accuracy')}: ${accPct.toFixed(1)}%`, w - 14, h - 36);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(`${i18n.t('combo')}: ${this.combo}  /  ${i18n.t('maxBpmReached')}: ${this.maxCombo}`, w - 14, h - 18);
    ctx.restore();
  }

  _renderJudgmentText(ctx, w, h) {
    if (!this.lastJudgment) return;
    const T = Theme.current;
    const age = this.app.elapsed - this.lastJudgmentTime;
    if (age > 0.6) return;
    const alpha = 1 - age / 0.6;
    const scale = 1 + (1 - alpha) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h * this.judgmentY - 60);
    ctx.scale(scale, scale);
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = T.judgment[this.lastJudgment.judgment] || '#fff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fillText(this.lastJudgment.judgment.toUpperCase(), 0, 0);
    ctx.restore();
  }

  _renderViz(ctx, w, h) {
    if (!this.viz) return;
    const vw = Math.min(560, w * 0.65);
    const vh = 90;
    const vx = (w - vw) / 2;
    const vy = h - 130;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this._roundRect(ctx, vx - 8, vy - 8, vw + 16, vh + 16, 10);
    ctx.fill();
    this.viz.render(ctx, vx, vy, vw, vh);
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

  handleInput(evt) {
    // delegated via inputManager.on registration in onEnter
  }
}

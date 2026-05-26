/**
 * RhythmLearnScene.js - 5단계 학습 모드
 *   Step 1: Watch (시각만)
 *   Step 2: Listen (소리만)
 *   Step 3: Echo (한 마디 듣고 따라치기)
 *   Step 4: Together (낮은 BPM에서 함께 치기, 점진 가속)
 *   Step 5: Master (baseBpm × 8마디 도전)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { RhythmPlayer } from '../audio/RhythmPlayer.js';
import { RhythmPatternViz } from '../ui/components/RhythmPatternViz.js';
import { clamp, easeOutCubic } from '../utils/MathUtils.js';

const STEPS = [
  { id: 'watch',    bpm: 90,  loops: 2, mode: 'viz_only' },
  { id: 'listen',   bpm: 90,  loops: 2, mode: 'audio_only' },
  { id: 'echo',     bpm: 80,  loops: 4, mode: 'echo' },         // 1bar play → 1bar user
  { id: 'together', bpm: 60,  loops: 8, mode: 'together' },     // user plays with player, gradually faster
  { id: 'master',   bpm: null, loops: 8, mode: 'master' }       // baseBpm, no helper audio
];

export class RhythmLearnScene extends Scene {
  constructor(app) {
    super(app);
    this.rhythmId = null;
    this.rhythm = null;
    this.variationIdx = 0;
    this.pattern = null;
    this.stepIdx = 0;
    this.step = null;
    this.player = null;
    this.viz = null;
    this.stepStartedAt = 0;
    this.loopsDone = 0;
    this.echoPhase = 'listen'; // 'listen' or 'play'
    this.userHitsInBar = [];
    this.accuracyInBar = 0;
    this.bpm = 90;
    this.startedAt = 0;
    this.completed = false;
    this.failures = 0;
    this.tips = [];
    this.activeTip = null;
    this.inputHandler = null;
    this.uiButtons = [];
    this.completedTotal = 0;
    this.message = '';
  }

  async onEnter(data) {
    this.rhythmId = data?.rhythmId;
    this.variationIdx = data?.variationIdx ?? 0;
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
    this.rhythm = await this.app.rhythmLoader.loadRhythm(this.rhythmId);
    if (!this.rhythm) { this.manager.goTo('rhythmLibrary'); return; }
    const v = this.rhythm.variations?.[this.variationIdx];
    this.pattern = (v && !v.patternRef) ? { lengthInBeats: this.rhythm.pattern.lengthInBeats, notes: v.notes } : this.rhythm.pattern;
    this.viz = new RhythmPatternViz(this.pattern, { subdivisions: this.rhythm.subdivisions || 4 });
    this.player = new RhythmPlayer(this.app.audioEngine, this.app.sampleBank);
    this.stepIdx = 0;
    this.completed = false;
    this.failures = 0;
    this.tips = this.rhythm.tips?.[i18n.getLang()] || this.rhythm.tips?.ko || [];
    this.inputHandler = (evt) => this._onInput(evt);
    this.app.inputManager.on(this.inputHandler);
    this._startStep();
  }

  onExit() {
    if (this.player) this.player.stop();
    if (this.inputHandler) this.app.inputManager.off(this.inputHandler);
  }

  _startStep() {
    if (this.player) this.player.stop();
    this.step = STEPS[this.stepIdx];
    this.loopsDone = 0;
    this.userHitsInBar = [];
    this.echoPhase = 'listen';
    this.bpm = this.step.bpm || this.rhythm.baseBpm;
    this.failures = 0;
    this.startedAt = this.app.audioEngine.currentTime + 0.3;
    this.stepStartedAt = this.app.elapsed;
    this.message = '';

    if (this.step.mode === 'viz_only') {
      // 시각만 보여주는 모드 — 패턴 재생은 하지만 볼륨 0
      this.player.start(this.pattern, { bpm: this.bpm, subdivisions: this.rhythm.subdivisions || 4, loop: true, metronome: false });
      this.player.onLoop = (n) => { this.loopsDone = n; if (n >= this.step.loops) this._nextStep(); };
    } else if (this.step.mode === 'audio_only') {
      this.player.start(this.pattern, { bpm: this.bpm, subdivisions: this.rhythm.subdivisions || 4, loop: true, metronome: false });
      this.player.onLoop = (n) => { this.loopsDone = n; if (n >= this.step.loops) this._nextStep(); };
    } else if (this.step.mode === 'echo') {
      // 한 마디 재생, 한 마디 침묵 (사용자 차례)
      this._startEchoCycle();
    } else if (this.step.mode === 'together' || this.step.mode === 'master') {
      this.player.start(this.pattern, { bpm: this.bpm, subdivisions: this.rhythm.subdivisions || 4, loop: true, metronome: this.step.mode === 'master' });
      this.player.onLoop = (n) => {
        this.loopsDone = n;
        const acc = this._calcBarAccuracy();
        this.userHitsInBar = [];
        if (this.step.mode === 'together') {
          if (acc >= 0.8 && this.bpm < this.rhythm.baseBpm) {
            this._adjustBpm(+10);
          }
          if (this.bpm >= this.rhythm.baseBpm && n >= 4) this._nextStep();
          if (n >= this.step.loops) this._nextStep();
        } else if (this.step.mode === 'master') {
          if (n >= this.step.loops) {
            if (acc >= 0.9) this._masterAchieved();
            else this._retryStep();
          }
        }
      };
    }
  }

  _startEchoCycle() {
    // 한 마디만 재생 (loop=false), 끝나면 사용자 차례
    this.echoPhase = 'listen';
    this.userHitsInBar = [];
    this.startedAt = this.app.audioEngine.currentTime + 0.3;
    this.player.start(this.pattern, { bpm: this.bpm, subdivisions: this.rhythm.subdivisions || 4, loop: false, metronome: false });
    const patternDur = (60 / this.bpm) * (this.pattern.lengthInBeats || 4);
    setTimeout(() => {
      if (this.stepIdx !== STEPS.findIndex(s => s.id === 'echo')) return;
      this.player.stop();
      this.echoPhase = 'play';
      this.echoStartedAt = this.app.audioEngine.currentTime;
    }, patternDur * 1000 + 100);
    setTimeout(() => {
      if (this.stepIdx !== STEPS.findIndex(s => s.id === 'echo')) return;
      const acc = this._calcBarAccuracy();
      this.accuracyInBar = acc;
      this.loopsDone++;
      if (acc >= 0.8) {
        if (this.loopsDone >= this.step.loops) this._nextStep();
        else this._startEchoCycle();
      } else {
        this.failures++;
        if (this.failures >= 3) {
          this.activeTip = this.tips[Math.min(this.tips.length - 1, this.failures - 1)];
        }
        this._startEchoCycle();
      }
    }, patternDur * 2 * 1000 + 200);
  }

  _calcBarAccuracy() {
    const total = (this.pattern.notes || []).length;
    if (total === 0) return 1;
    const hit = this.userHitsInBar.filter(h => h.judgment !== 'miss').length;
    return hit / total;
  }

  _adjustBpm(delta) {
    this.bpm = clamp(this.bpm + delta, 40, this.rhythm.baseBpm);
    this.player.setBpm(this.bpm);
  }

  _nextStep() {
    this.completedTotal++;
    this.stepIdx++;
    if (this.stepIdx >= STEPS.length) {
      this._masterAchieved();
      return;
    }
    this._startStep();
  }

  _retryStep() {
    this.failures++;
    this._startStep();
  }

  _masterAchieved() {
    if (this.player) this.player.stop();
    this.completed = true;
    Storage.setRhythmMastered(this.rhythmId, true);
    Storage.saveRhythmScore(this.rhythmId, {
      score: 0,
      grade: 'A',
      accuracy: 0.95,
      mastered: true,
      maxBpm: this.rhythm.baseBpm
    });
    setTimeout(() => {
      this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId });
    }, 3500);
  }

  _onInput(evt) {
    if (this.completed) return;
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId }); return; }
      if (evt.code === 'KeyS') { this._nextStep(); return; }       // skip step
      if (evt.code === 'KeyR') { this._startStep(); return; }      // retry step
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      // check UI hit
      const hit = this._hitTestUI(evt.x, evt.y);
      if (hit) return;
      this._registerHit(evt.lane);
      return;
    }
    if (evt.type === 'down') {
      this._registerHit(evt.lane);
    }
  }

  _hitTestUI(mx, my) {
    if (mx < 50 && my < 50) { this.manager.goTo('rhythmDetail', { rhythmId: this.rhythmId }); return true; }
    for (const b of this.uiButtons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (b.kind === 'skip') this._nextStep();
        else if (b.kind === 'retry') this._startStep();
        return true;
      }
    }
    return false;
  }

  _registerHit(lane) {
    const mode = this.step?.mode;
    if (mode === 'viz_only' || mode === 'audio_only') {
      this.app.sampleBank.playHit(lane, 'perfect');
      return;
    }
    // Calculate timing in the current bar
    const stepDur = (60 / this.bpm) / (this.rhythm.subdivisions || 4) * 1000;
    const patternDurMs = stepDur * (this.pattern.lengthInBeats || 4) * (this.rhythm.subdivisions || 4);
    let elapsedMs = 0;
    if (mode === 'echo') {
      if (this.echoPhase !== 'play') {
        this.app.sampleBank.playHit(lane, 'perfect');
        return;
      }
      elapsedMs = (this.app.audioEngine.currentTime - this.echoStartedAt) * 1000;
    } else {
      const stepFloat = this.player.getCurrentStepFloat() % ((this.pattern.lengthInBeats || 4) * (this.rhythm.subdivisions || 4));
      elapsedMs = stepFloat * stepDur;
    }
    // 가장 가까운 노트
    let best = null, bestDist = Infinity;
    for (const n of (this.pattern.notes || [])) {
      if (n.lane !== lane) continue;
      const noteTime = n.step * stepDur;
      const dist = Math.abs(elapsedMs - noteTime);
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    let judgment;
    if (best && bestDist <= 150) {
      judgment = bestDist <= 40 ? 'perfect' : bestDist <= 80 ? 'great' : 'good';
    } else {
      judgment = 'miss';
    }
    this.userHitsInBar.push({ lane, judgment, dist: best ? bestDist : 0 });
    this.app.sampleBank.playHit(lane, judgment === 'miss' ? 'good' : judgment);
  }

  update(dt) {
    if (this.viz && this.player && this.player.playing) {
      this.viz.setProgress(this.player.getCurrentStepFloat());
    } else if (this.viz) {
      this.viz.setProgress(-1);
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);

    if (!this.rhythm || !this.pattern) {
      ctx.fillStyle = T.text.primary;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i18n.t('loading'), w / 2, h / 2);
      return;
    }
    if (this.completed) {
      this._renderCompletion(ctx, w, h);
      return;
    }

    this._renderHeader(ctx, w, h);
    this._renderStepInfo(ctx, w, h);
    this._renderViz(ctx, w, h);
    if (this.step?.mode === 'echo') this._renderEchoIndicator(ctx, w, h);
    if (this.step?.mode === 'together' || this.step?.mode === 'master') this._renderBpmDisplay(ctx, w, h);
    this._renderControls(ctx, w, h);
    if (this.activeTip) this._renderTip(ctx, w, h);
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
    ctx.fillText(`🎓 ${i18n.t('stepLearn')} — ${name}`, 60, 28);
    // 진행도
    ctx.textAlign = 'right';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(`Step ${this.stepIdx + 1} / ${STEPS.length}`, w - 14, 20);
    // Progress bar
    const pw = 160;
    const px = w - pw - 14;
    const py = 38;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, px, py, pw, 6, 3);
    ctx.fill();
    ctx.fillStyle = T.primary;
    const prog = (this.stepIdx + (this.loopsDone / Math.max(1, this.step?.loops || 1))) / STEPS.length;
    this._roundRect(ctx, px, py, pw * Math.min(1, prog), 6, 3);
    ctx.fill();
    ctx.restore();
  }

  _renderStepInfo(ctx, w, h) {
    const T = Theme.current;
    const titles = {
      watch:    { ko: '👁 1단계: 눈으로 보기',       en: '👁 Step 1: Watch' },
      listen:   { ko: '👂 2단계: 소리만 듣기',       en: '👂 Step 2: Listen' },
      echo:     { ko: '🔊 3단계: 따라치기',          en: '🔊 Step 3: Echo' },
      together: { ko: '🤝 4단계: 함께 치기 (점진 가속)', en: '🤝 Step 4: Together (gradual)' },
      master:   { ko: '🏆 5단계: 마스터',            en: '🏆 Step 5: Master' }
    };
    const hints = {
      watch:    i18n.t('stepWatchHint'),
      listen:   i18n.t('stepListenHint'),
      echo:     i18n.t('stepEchoHint'),
      together: i18n.t('stepTogetherHint'),
      master:   i18n.t('stepMasterHint')
    };
    if (!this.step) return;
    const titleObj = titles[this.step.id];
    const title = titleObj?.[i18n.getLang()] || titleObj?.ko || '';
    const hint = hints[this.step.id];

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(title, w / 2, 110);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(hint, w / 2, 144);

    // Loops counter
    ctx.font = '13px sans-serif';
    ctx.fillStyle = T.text.tertiary;
    ctx.fillText(`${i18n.t('progressLabel')}: ${this.loopsDone} / ${this.step.loops}`, w / 2, 170);
    ctx.restore();
  }

  _renderViz(ctx, w, h) {
    if (!this.viz) return;
    const vw = Math.min(700, w * 0.8);
    const vh = 120;
    const vx = (w - vw) / 2;
    const vy = h * 0.35;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, vx - 12, vy - 12, vw + 24, vh + 24, 12);
    ctx.fill();
    this.viz.render(ctx, vx, vy, vw, vh);
    ctx.restore();
  }

  _renderEchoIndicator(ctx, w, h) {
    const T = Theme.current;
    const isPlay = this.echoPhase === 'play';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = isPlay ? '#4ECDC4' : '#FFD93D';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fillText(isPlay ? '🎯 당신 차례!' : '👂 듣는 중...', w / 2, h * 0.65);
    if (isPlay && this.accuracyInBar !== undefined && this.userHitsInBar.length) {
      ctx.font = '16px sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillStyle = T.text.secondary;
      ctx.fillText(`정확도: ${(this._calcBarAccuracy() * 100).toFixed(0)}%`, w / 2, h * 0.65 + 50);
    }
    ctx.restore();
  }

  _renderBpmDisplay(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this._roundRect(ctx, w / 2 - 80, h * 0.62, 160, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.bpm} BPM`, w / 2, h * 0.62 + 25);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(`목표: ${this.rhythm.baseBpm} BPM`, w / 2, h * 0.62 + 70);
    ctx.restore();
  }

  _renderControls(ctx, w, h) {
    const isMobile = w < 700;
    const bx = (w - 280) / 2;
    const by = h - 70;
    this.uiButtons = [
      { kind: 'retry', label: '🔄 ' + i18n.t('retryStep'), x: bx, y: by, w: 130, h: 44 },
      { kind: 'skip', label: '⏭ ' + i18n.t('skipStep'), x: bx + 150, y: by, w: 130, h: 44 }
    ];
    ctx.save();
    for (const b of this.uiButtons) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.restore();
  }

  _renderTip(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(255,217,61,0.15)';
    this._roundRect(ctx, w / 2 - 250, h - 140, 500, 50, 10);
    ctx.fill();
    ctx.strokeStyle = '#FFD93D';
    ctx.stroke();
    ctx.fillStyle = '#FFD93D';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💡 ' + this.activeTip, w / 2, h - 115);
    ctx.restore();
  }

  _renderCompletion(ctx, w, h) {
    const T = Theme.current;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 64px sans-serif';
    ctx.shadowColor = '#FFD93D';
    ctx.shadowBlur = 30;
    ctx.fillText(i18n.t('masteryAchieved'), w / 2, h / 2 - 30);
    ctx.shadowBlur = 0;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    const name = this.rhythm.name?.[i18n.getLang()] || this.rhythm.name?.ko || this.rhythmId;
    ctx.fillText(name, w / 2, h / 2 + 30);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText('👑 Master Badge Earned!', w / 2, h / 2 + 60);
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

  handleInput(evt) {} // delegated to inputManager.on
}

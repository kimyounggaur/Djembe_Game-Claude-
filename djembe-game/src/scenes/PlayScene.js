/**
 * PlayScene.js - 메인 게임 플레이
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { Conductor } from '../audio/Conductor.js';
import { NoteSpawner } from '../game/NoteSpawner.js';
import { JudgmentSystem } from '../game/JudgmentSystem.js';
import { ScoreSystem } from '../game/ScoreSystem.js';
import { ParticleSystem } from '../ui/ParticleSystem.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { easeOutCubic, clamp, formatScore } from '../utils/MathUtils.js';

export class PlayScene extends Scene {
  constructor(app) {
    super(app);
    this.conductor = null;
    this.spawner = null;
    this.judge = null;
    this.score = null;
    this.particles = null;
    this.chart = null;
    this.difficulty = 'normal';
    this.mode = 'arcade';
    this.notesData = [];
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.flashLane = { slap: 0, bass: 0, tone: 0 };
    this.lastJudgment = null;
    this.lastJudgmentTime = 0;
    this.comboPulse = 0;
    this.bgBeatPulse = 0;
    this.elapsed = 0;
    this.gameOver = false;
    this.paused = false;
    this.pauseMenuIdx = 0;
    this.inputHandler = null;
  }

  async onEnter(data) {
    this.difficulty = data.difficulty || 'normal';
    this.mode = data.mode || 'arcade';
    this.songId = data.songId;
    this.playbackRate = data.playbackRate || 1.0;
    this.gameOver = false;
    this.paused = false;
    this.elapsed = 0;
    this.shakeT = 0; this.shakeAmp = 0;
    this.flashLane = { slap: 0, bass: 0, tone: 0 };
    this.lastJudgment = null;
    this.particles = new ParticleSystem();
    this.particles.setQuality(this.app.settings.particleQuality);
    this.chart = await this._loadChart(this.songId);
    this.notesData = this.chart.notes[this.difficulty] || this.chart.notes.normal || [];
    this.spawner = new NoteSpawner();
    this.spawner.load(this.notesData);
    this.judge = new JudgmentSystem();
    this.judge.onJudgment = (r) => this._onJudgment(r);
    this.score = new ScoreSystem(this.notesData.length);
    this.conductor = new Conductor(this.app.audioEngine, this.app.sampleBank);
    this.conductor.setAudioOffset(this.app.settings.audioOffset || 0);
    this.conductor.onBeat((b) => {
      this.bgBeatPulse = 1.0;
      if (this.app.settings.metronome !== 'off') {
        const vol = this.app.settings.metronome === 'soft' ? 0.1 : 0.3;
        this.app.sampleBank.generateBeep(b % 4 === 0 ? 1200 : 800, 0.05, 'square', vol);
      }
    });
    if (this.chart.audioFile && this.app.sampleBank.has('bgm_' + this.songId)) {
      this.conductor.start('bgm_' + this.songId, this.chart.bpm, this.chart.offset || 0, this.chart.duration / 1000, this.playbackRate);
    } else {
      this.conductor.start(null, this.chart.bpm, this.chart.offset || 0, this.chart.duration / 1000, this.playbackRate);
    }
    this.inputHandler = (evt) => this._onInput(evt);
    this.app.inputManager.on(this.inputHandler);
  }

  onExit() {
    if (this.inputHandler) this.app.inputManager.off(this.inputHandler);
    if (this.conductor) this.conductor.stop();
  }

  async _loadChart(songId) {
    const c = this.app.chartLoader.getChart(songId);
    if (c) return c;
    return await this.app.chartLoader.load(songId, `assets/charts/${songId}.json`);
  }

  _onInput(evt) {
    if (this.gameOver) return;
    if (this.paused) {
      if (evt.type === 'keydown') {
        if (evt.code === 'Escape') this._togglePause();
        else if (evt.code === 'ArrowUp') this.pauseMenuIdx = Math.max(0, this.pauseMenuIdx - 1);
        else if (evt.code === 'ArrowDown') this.pauseMenuIdx = Math.min(2, this.pauseMenuIdx + 1);
        else if (evt.code === 'Enter') this._pauseMenuSelect();
      }
      return;
    }
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this._togglePause(); return; }
    }
    if (evt.type === 'down') {
      const lane = evt.lane;
      this.flashLane[lane] = 1.0;
      const inputMs = (evt.time - this.conductor.startTime - this.conductor.totalPaused - (this.conductor.audioOffset / 1000)) * 1000 * this.playbackRate;
      const active = this.spawner.getActiveNotes();
      const result = this.judge.handleInput(lane, inputMs, active);
      if (result) {
        this.app.sampleBank.playHit(lane, result.judgment);
        this._applyJudgment(result);
      } else {
        this.app.sampleBank.playHit(lane, 'perfect');
      }
    } else if (evt.type === 'up') {
      const lane = evt.lane;
      if (this.conductor.isPlaying) {
        const inputMs = (evt.time - this.conductor.startTime - this.conductor.totalPaused - (this.conductor.audioOffset / 1000)) * 1000 * this.playbackRate;
        const active = this.spawner.getActiveNotes();
        this.judge.handleHoldRelease(lane, inputMs, active);
      }
    }
  }

  _onJudgment(result) {
    this._applyJudgment(result);
  }

  _applyJudgment(result) {
    const isChallenge = this.mode === 'challenge';
    this.score.addJudgment(result.judgment, this.conductor.songPositionInMs, result.isTail, isChallenge);
    this.lastJudgment = result;
    this.lastJudgmentTime = this.elapsed;
    if (result.judgment !== 'miss') this.comboPulse = 1.0;
    const T = Theme.current;
    const w = this.app.width;
    const h = this.app.height;
    const laneX = result.lane === 'slap' ? w * 0.2 : (result.lane === 'bass' ? w * 0.5 : w * 0.8);
    const judgmentY = h * this.app.settings.judgmentY;
    if (result.judgment === 'perfect') {
      this.particles.spark(laneX, judgmentY, T.judgment.perfect, 20);
      this.particles.star(laneX, judgmentY, T.judgment.perfect, 5);
      if (result.lane === 'bass') this.particles.ring(laneX, judgmentY, T.judgment.perfect);
      if (navigator.vibrate && this.app.settings.haptic) navigator.vibrate(10);
    } else if (result.judgment === 'great') {
      this.particles.spark(laneX, judgmentY, T.judgment.great, 12);
      if (navigator.vibrate && this.app.settings.haptic) navigator.vibrate(15);
    } else if (result.judgment === 'good') {
      this.particles.spark(laneX, judgmentY, T.judgment.good, 8);
      if (navigator.vibrate && this.app.settings.haptic) navigator.vibrate(20);
    } else {
      if (this.app.settings.screenShake) {
        this.shakeAmp = Math.min(8, this.shakeAmp + 4);
        this.shakeT = 0.3;
      }
      if (navigator.vibrate && this.app.settings.haptic) navigator.vibrate([30, 20, 30]);
      if (this.score.missStreak === 5) {
        this.app.audioEngine.setBgmFilterCutoff(800, 200);
      } else if (this.score.missStreak === 10) {
        this.app.audioEngine.setBgmFilterCutoff(400, 200);
      }
    }
    if (result.judgment !== 'miss' && this.score.combo > 0 && this.score.combo % 50 === 0) {
      this.particles.heart(w / 2, judgmentY - 60, T.secondary, 8);
      this.app.audioEngine.setBgmFilterCutoff(20000, 300);
    }
    if (this.score.combo === 100 || this.score.combo === 200 || this.score.combo === 500) {
      this.particles.spark(w / 2, h / 2, T.judgment.perfect, 50);
      this.particles.star(w / 2, h / 2, T.primary, 15);
    }
    if (isChallenge && result.judgment === 'miss') {
      this._endGame();
    }
  }

  _togglePause() {
    if (this.paused) {
      this.paused = false;
      this.conductor.resume();
    } else {
      this.paused = true;
      this.conductor.pause();
      this.pauseMenuIdx = 0;
    }
  }

  _pauseMenuSelect() {
    if (this.pauseMenuIdx === 0) this._togglePause();
    else if (this.pauseMenuIdx === 1) this.manager.goTo('countdown', { songId: this.songId, difficulty: this.difficulty, mode: this.mode, playbackRate: this.playbackRate });
    else if (this.pauseMenuIdx === 2) this.manager.goTo('title');
  }

  _endGame() {
    this.gameOver = true;
    const summary = this.score.getSummary();
    const songId = this.songId;
    const result = Storage.saveScore(songId, this.difficulty, summary);
    Storage.addStats({
      totalPlayTime: this.elapsed * 1000,
      totalNotes: summary.totalNotes,
      totalPerfect: summary.tally.perfect,
      totalMisses: summary.tally.miss
    });
    setTimeout(() => {
      this.manager.goTo('result', {
        songId, difficulty: this.difficulty, mode: this.mode,
        summary, isNew: result.isNew, totalScore: result.total, chart: this.chart
      });
    }, 800);
  }

  update(dt) {
    if (this.paused) return;
    this.elapsed += dt;
    this.conductor.update();
    const t = this.conductor.songPositionInMs;
    this.spawner.update(t);
    this.judge.checkMissed(t, this.spawner.getActiveNotes());
    this.particles.update(dt);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.shakeAmp *= 0.92;
    }
    if (this.comboPulse > 0) this.comboPulse = Math.max(0, this.comboPulse - dt * 3);
    if (this.bgBeatPulse > 0) this.bgBeatPulse = Math.max(0, this.bgBeatPulse - dt * 4);
    for (const l of Object.keys(this.flashLane)) {
      if (this.flashLane[l] > 0) this.flashLane[l] = Math.max(0, this.flashLane[l] - dt * 4);
    }
    if (this.conductor.isFinished() && !this.gameOver) {
      this._endGame();
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    const beatPulse = 1 + this.bgBeatPulse * 0.02;
    ctx.save();
    if (this.shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp);
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(beatPulse, beatPulse);
    ctx.translate(-w / 2, -h / 2);
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.restore();
    const laneCenters = { slap: w * 0.2, bass: w * 0.5, tone: w * 0.8 };
    const laneW = w * 0.28;
    const judgmentY = h * this.app.settings.judgmentY;
    const djembeImg = this.app.assetLoader.getImage('djembe-realistic');
    if (djembeImg) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      const dW = Math.min(w * 0.7, h * 0.5);
      const dH = dW * 1.3;
      ctx.drawImage(djembeImg, w / 2 - dW / 2, judgmentY - dH * 0.3, dW, dH);
      ctx.restore();
    }
    for (const lane of ['slap', 'bass', 'tone']) {
      const cx = laneCenters[lane];
      ctx.save();
      const grad = ctx.createLinearGradient(cx - laneW / 2, 0, cx + laneW / 2, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - laneW / 2, 0, laneW, h);
      ctx.restore();
    }
    ctx.strokeStyle = T.primary;
    ctx.lineWidth = 3;
    ctx.shadowColor = T.primary;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, judgmentY);
    ctx.lineTo(w, judgmentY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (const lane of ['slap', 'bass', 'tone']) {
      const cx = laneCenters[lane];
      const flash = this.flashLane[lane];
      const r = 50 + flash * 12;
      ctx.save();
      ctx.fillStyle = `rgba(${this._laneColorRGB(lane)},${0.15 + flash * 0.3})`;
      ctx.strokeStyle = T.lane[lane];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, judgmentY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.toUpperCase(), cx, judgmentY);
      ctx.restore();
    }
    const songPos = this.conductor.songPositionInMs;
    const scrollSpeedPx = 600 * this.app.settings.scrollSpeed;
    const noteSizeMap = { small: 50, medium: 70, large: 90 };
    let noteSize = noteSizeMap[this.app.settings.noteSize] || 70;
    if (w < 700) noteSize *= 0.85;
    const active = this.spawner.getActiveNotes();
    for (const note of active) {
      if (note.state === 'hit' || note.state === 'missed') continue;
      const dt = (note.time - songPos) / 1000;
      const y = judgmentY - dt * scrollSpeedPx;
      if (y < -100 || y > h + 100) continue;
      const cx = laneCenters[note.lane];
      if (note.type === 'hold') {
        const tailDt = (note.time + note.duration - songPos) / 1000;
        const tailY = judgmentY - tailDt * scrollSpeedPx;
        ctx.fillStyle = T.lane[note.lane] + 'AA';
        const trailW = noteSize * 0.5;
        ctx.fillRect(cx - trailW / 2, Math.min(y, tailY), trailW, Math.abs(tailY - y));
      }
      const img = this.app.assetLoader.getImage(`note-${note.lane}`);
      if (img) {
        ctx.save();
        ctx.translate(cx, y);
        ctx.rotate(note.rotation);
        note.rotation += 0.005;
        ctx.shadowColor = T.lane[note.lane];
        ctx.shadowBlur = 20;
        ctx.drawImage(img, -noteSize / 2, -noteSize / 2, noteSize, noteSize);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = T.lane[note.lane];
        ctx.shadowColor = T.lane[note.lane];
        ctx.shadowBlur = 20;
        ctx.fillRect(cx - noteSize / 2, y - noteSize / 2, noteSize, noteSize);
        ctx.restore();
      }
    }
    this.particles.render(ctx);
    this._renderHUD(ctx, w, h);
    if (this.lastJudgment && this.elapsed - this.lastJudgmentTime < 0.5) {
      const dt = this.elapsed - this.lastJudgmentTime;
      const alpha = dt < 0.1 ? dt * 10 : Math.max(0, 1 - (dt - 0.1) * 2.5);
      const scale = dt < 0.1 ? 1 + dt * 5 : 1.5 - Math.min(0.5, (dt - 0.1) * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, judgmentY - 100);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold 36px 'Black Han Sans', sans-serif`;
      const label = this.lastJudgment.judgment.toUpperCase();
      ctx.fillStyle = T.judgment[this.lastJudgment.judgment];
      ctx.shadowColor = T.judgment[this.lastJudgment.judgment];
      ctx.shadowBlur = 20;
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    if (this.paused) this._renderPauseMenu(ctx, w, h);
  }

  _laneColorRGB(lane) {
    if (lane === 'slap') return '255,107,107';
    if (lane === 'bass') return '255,217,61';
    return '78,205,196';
  }

  _renderHUD(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = T.text.secondary;
    ctx.textAlign = 'left';
    ctx.font = '11px sans-serif';
    ctx.fillText(i18n.t('score'), 20, 24);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'right';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(formatScore(this.score.score), w - 20, 42);
    if (this.score.combo > 0) {
      const pulse = 1 + this.comboPulse * 0.3;
      const fontSize = clamp(20 + this.score.combo / 10, 24, 80) * pulse;
      ctx.save();
      ctx.translate(w / 2, h * 0.18);
      ctx.scale(pulse, pulse);
      ctx.textAlign = 'center';
      ctx.font = `bold ${fontSize}px 'Black Han Sans', sans-serif`;
      ctx.fillStyle = T.text.primary;
      ctx.shadowColor = T.primary;
      ctx.shadowBlur = 15;
      ctx.fillText(this.score.combo, 0, 0);
      ctx.font = `${fontSize * 0.3}px sans-serif`;
      ctx.fillStyle = T.text.secondary;
      ctx.shadowBlur = 0;
      ctx.fillText('COMBO', 0, fontSize * 0.6);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(`${i18n.t('accuracy')}: ${this.score.accuracy.toFixed(1)}%`, w / 2, 24);
    if (this.app.settings.debug && this.lastJudgment) {
      ctx.textAlign = 'right';
      ctx.font = '11px monospace';
      ctx.fillStyle = T.text.tertiary;
      ctx.fillText(`Last: ${this.lastJudgment.judgment} ${this.lastJudgment.deltaMs > 0 ? '+' : ''}${this.lastJudgment.deltaMs.toFixed(0)}ms`, w - 20, h - 20);
    }
    const progress = clamp(this.conductor.songPositionInSeconds / this.conductor.duration, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, h - 4, w, 4);
    ctx.fillStyle = T.primary;
    ctx.fillRect(0, h - 4, w * progress, 4);
    ctx.restore();
  }

  _renderPauseMenu(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = T.bg.secondary;
    this._roundRect(ctx, w / 2 - 180, h / 2 - 160, 360, 320, 16);
    ctx.fill();
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(i18n.t('pause'), w / 2, h / 2 - 100);
    const items = [i18n.t('resume'), i18n.t('restart'), i18n.t('mainMenu')];
    items.forEach((label, i) => {
      const selected = i === this.pauseMenuIdx;
      const y = h / 2 - 40 + i * 60;
      ctx.fillStyle = selected ? T.primary : 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, w / 2 - 140, y, 280, 50, 12);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(label, w / 2, y + 32);
    });
    ctx.fillStyle = T.text.tertiary;
    ctx.font = '12px sans-serif';
    ctx.fillText('ESC: 계속  /  ↑↓: 선택  /  Enter: 확인', w / 2, h / 2 + 140);
    ctx.restore();
  }

  handleInput(evt) {
    if (this.paused && evt.type === 'down' && evt.source === 'touch') {
      const w = this.app.width, h = this.app.height;
      for (let i = 0; i < 3; i++) {
        const y = h / 2 - 40 + i * 60;
        if (evt.x >= w / 2 - 140 && evt.x <= w / 2 + 140 && evt.y >= y && evt.y <= y + 50) {
          this.pauseMenuIdx = i;
          this._pauseMenuSelect();
          return;
        }
      }
    }
  }
}

/**
 * RhythmPlayer.js - 리듬 패턴을 audioContext 기준으로 정확히 스케줄링하여 재생
 *
 * Why: 미리듣기와 루프 연습에서 동일한 정밀 타이밍이 필요. Conductor를 직접 빌릴 수도 있지만
 *      이건 BGM 없이 패턴만 반복하는 단순 케이스라 가벼운 별도 모듈로 분리.
 */
export class RhythmPlayer {
  constructor(audioEngine, sampleBank) {
    this.engine = audioEngine;
    this.sampleBank = sampleBank;
    this.pattern = null;
    this.bpm = 100;
    this.subdivisions = 4;
    this.startTime = 0;       // ctx time when playback started
    this.totalSteps = 16;
    this.loop = false;
    this.playing = false;
    this.metronome = false;
    this.scheduledIds = [];
    this.lookaheadMs = 100;
    this.scheduleAheadSec = 0.2;
    this.scheduleCursor = 0;  // next step index to schedule
    this._tickId = null;
    this.onLoop = null;
    this.onStop = null;
    this.onStep = null;       // callback(stepFloat)
  }

  /**
   * @param {Object} pattern - { lengthInBeats, notes }
   * @param {Object} opts - { bpm, subdivisions=4, loop=false, metronome=false }
   */
  start(pattern, opts = {}) {
    this.stop();
    this.pattern = pattern;
    this.bpm = opts.bpm || 100;
    this.subdivisions = opts.subdivisions || 4;
    this.loop = !!opts.loop;
    this.metronome = !!opts.metronome;
    this.totalSteps = (pattern.lengthInBeats || 4) * this.subdivisions;
    this.startTime = this.engine.currentTime + 0.05;  // small delay
    this.scheduleCursor = 0;
    this.playing = true;
    this._scheduleLoop();
  }

  stop() {
    this.playing = false;
    if (this._tickId) {
      clearTimeout(this._tickId);
      this._tickId = null;
    }
    if (this.onStop) this.onStop();
  }

  setBpm(bpm) {
    if (!this.playing) { this.bpm = bpm; return; }
    // 부드러운 전환: 현재 step 위치를 보존하며 startTime 재계산
    const stepFloat = this.getCurrentStepFloat();
    const stepDurNew = 60 / bpm / this.subdivisions;
    this.startTime = this.engine.currentTime - stepFloat * stepDurNew;
    this.bpm = bpm;
  }

  stepDuration() {
    return 60 / this.bpm / this.subdivisions;
  }

  patternDuration() {
    return this.stepDuration() * this.totalSteps;
  }

  /**
   * 현재 시간 기준의 step 위치 (float, 0..totalSteps)
   */
  getCurrentStepFloat() {
    if (!this.playing) return -1;
    const elapsed = this.engine.currentTime - this.startTime;
    if (elapsed < 0) return 0;
    const stepDur = this.stepDuration();
    const stepFloat = elapsed / stepDur;
    if (this.loop) return stepFloat % this.totalSteps;
    return Math.min(stepFloat, this.totalSteps);
  }

  /**
   * 루프 진행 중인지 (loop=false이고 끝났으면 자동 정지)
   */
  isFinished() {
    if (this.loop) return false;
    const stepDur = this.stepDuration();
    return (this.engine.currentTime - this.startTime) >= stepDur * this.totalSteps;
  }

  _scheduleLoop() {
    if (!this.playing) return;
    if (!this.loop && this.isFinished()) {
      this.stop();
      return;
    }

    const stepDur = this.stepDuration();
    const horizon = this.engine.currentTime + this.scheduleAheadSec;

    while (true) {
      const cursorTime = this.startTime + this.scheduleCursor * stepDur;
      if (cursorTime > horizon) break;
      const stepInPattern = this.scheduleCursor % this.totalSteps;
      // pattern notes at this step
      for (const n of this.pattern.notes || []) {
        if (n.step === stepInPattern) {
          this.sampleBank.play(n.lane, { time: cursorTime, volume: 0.9, channel: 'sfx' });
        }
      }
      // metronome
      if (this.metronome && stepInPattern % this.subdivisions === 0) {
        const beatIdx = stepInPattern / this.subdivisions;
        const freq = beatIdx === 0 ? 1200 : 800;
        this._scheduleBeep(cursorTime, freq, 0.04);
      }
      // loop boundary
      if (this.scheduleCursor > 0 && stepInPattern === 0 && this.onLoop) {
        try { this.onLoop(Math.floor(this.scheduleCursor / this.totalSteps)); } catch (e) {}
      }
      this.scheduleCursor++;
      if (!this.loop && this.scheduleCursor >= this.totalSteps) break;
    }

    this._tickId = setTimeout(() => this._scheduleLoop(), this.lookaheadMs);
  }

  _scheduleBeep(when, freq, dur) {
    const ctx = this.engine.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.15, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(this.engine.sfxGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }
}

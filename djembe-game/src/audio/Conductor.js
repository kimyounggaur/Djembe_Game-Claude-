/**
 * Conductor.js - 모든 게임 타이밍의 단일 진실 (audioContext.currentTime 기반)
 *
 * Why: requestAnimationFrame delta time이나 Date.now()는 미세하게 어긋남 (5분 후 수십 ms 편차).
 * audioContext.currentTime은 오디오 하드웨어 클럭에 맞춰져 있어 BGM과 절대 어긋나지 않음.
 */
export class Conductor {
  constructor(audioEngine, sampleBank) {
    this.engine = audioEngine;
    this.bank = sampleBank;
    this.bpm = 120;
    this.offset = 0;
    this.startTime = 0;
    this.pauseTime = 0;
    this.totalPaused = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.bgmName = null;
    this.bgmHandle = null;
    this.audioOffset = 0;
    this.lastBeat = -1;
    this.onBeatCb = null;
    this.duration = 0;
    this.playbackRate = 1.0;
  }

  start(bgmName, bpm, offsetMs = 0, durationSec = 60, playbackRate = 1.0) {
    this.bpm = bpm;
    this.offset = offsetMs;
    this.bgmName = bgmName;
    this.duration = durationSec;
    this.playbackRate = playbackRate;
    const ctx = this.engine.ctx;
    const when = ctx.currentTime + 0.1;
    this.startTime = when - (offsetMs / 1000);
    this.totalPaused = 0;
    this.lastBeat = -1;
    if (this.bank.has(bgmName)) {
      const handle = this.bank.playBgm(bgmName, when, false);
      if (handle && handle.source.playbackRate) {
        handle.source.playbackRate.value = playbackRate;
      }
      this.bgmHandle = handle;
    } else {
      this.bgmHandle = null;
    }
    this.isPlaying = true;
    this.isPaused = false;
  }

  stop() {
    if (this.bgmHandle && this.bgmHandle.source) {
      try { this.bgmHandle.source.stop(); } catch (e) {}
    }
    this.bgmHandle = null;
    this.isPlaying = false;
    this.isPaused = false;
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return;
    this.pauseTime = this.engine.ctx.currentTime;
    this.isPaused = true;
    if (this.bgmHandle && this.bgmHandle.gain) {
      this.bgmHandle.gain.gain.setValueAtTime(this.bgmHandle.gain.gain.value, this.engine.ctx.currentTime);
      this.bgmHandle.gain.gain.linearRampToValueAtTime(0, this.engine.ctx.currentTime + 0.05);
    }
    this.engine.suspend();
  }

  async resume() {
    if (!this.isPlaying || !this.isPaused) return;
    await this.engine.resume();
    const pausedDuration = this.engine.ctx.currentTime - this.pauseTime;
    this.totalPaused += pausedDuration;
    this.isPaused = false;
    if (this.bgmHandle && this.bgmHandle.gain) {
      this.bgmHandle.gain.gain.setValueAtTime(0, this.engine.ctx.currentTime);
      this.bgmHandle.gain.gain.linearRampToValueAtTime(1.0, this.engine.ctx.currentTime + 0.1);
    }
  }

  get songPositionInSeconds() {
    if (!this.isPlaying) return 0;
    if (this.isPaused) return (this.pauseTime - this.startTime - this.totalPaused - (this.audioOffset / 1000)) * this.playbackRate;
    return (this.engine.ctx.currentTime - this.startTime - this.totalPaused - (this.audioOffset / 1000)) * this.playbackRate;
  }

  get songPositionInMs() {
    return this.songPositionInSeconds * 1000;
  }

  get songPositionInBeats() {
    return this.songPositionInSeconds * (this.bpm / 60);
  }

  get currentBeat() {
    return Math.floor(this.songPositionInBeats);
  }

  setAudioOffset(ms) {
    this.audioOffset = ms;
  }

  onBeat(callback) {
    this.onBeatCb = callback;
  }

  update() {
    if (!this.isPlaying || this.isPaused) return;
    const beat = this.currentBeat;
    if (beat !== this.lastBeat && this.onBeatCb) {
      this.onBeatCb(beat);
      this.lastBeat = beat;
    }
  }

  isFinished() {
    return this.songPositionInSeconds >= this.duration;
  }
}

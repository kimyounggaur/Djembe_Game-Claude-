/**
 * AudioEngine.js - Web Audio API 래퍼 (마스터 채널, 이펙트 체인)
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.convolver = null;
    this.compressor = null;
    this.bgmFilter = null;
    this.unlocked = false;
    this.volumes = { master: 0.9, bgm: 0.7, sfx: 1.0 };
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.1;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumes.master;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.volumes.bgm;
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.volumes.sfx;
    this.bgmFilter = this.ctx.createBiquadFilter();
    this.bgmFilter.type = 'lowpass';
    this.bgmFilter.frequency.value = 20000;
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this._createSyntheticIR(2.0, 1.5);
    const reverbGain = this.ctx.createGain();
    reverbGain.gain.value = 0.12;
    this.sfxGain.connect(this.compressor);
    this.bgmGain.connect(this.bgmFilter);
    this.bgmFilter.connect(this.compressor);
    this.sfxGain.connect(this.convolver);
    this.convolver.connect(reverbGain);
    reverbGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  _createSyntheticIR(duration = 2.0, decay = 2.0) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  async unlock() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch (e) {}
    }
    if (!this.unlocked) {
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
      this.unlocked = true;
    }
  }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (this.masterGain) this.masterGain.gain.value = this.volumes.master;
    if (this.bgmGain) this.bgmGain.gain.value = this.volumes.bgm;
    if (this.sfxGain) this.sfxGain.gain.value = this.volumes.sfx;
  }

  setBgmFilterCutoff(hz, rampMs = 0) {
    if (!this.bgmFilter) return;
    if (rampMs > 0) {
      this.bgmFilter.frequency.linearRampToValueAtTime(hz, this.ctx.currentTime + rampMs / 1000);
    } else {
      this.bgmFilter.frequency.value = hz;
    }
  }

  setBgmDetune(cents, rampMs = 0) {
    if (!this.bgmFilter) return;
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') return this.ctx.resume();
  }

  get currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }
}

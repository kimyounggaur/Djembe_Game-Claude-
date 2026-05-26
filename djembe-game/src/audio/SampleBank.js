/**
 * SampleBank.js - 오디오 샘플 캐시 + 재생 (velocity layer 지원)
 */
export class SampleBank {
  constructor(audioEngine) {
    this.engine = audioEngine;
    this.buffers = new Map();
  }

  async load(name, url) {
    if (!this.engine.ctx) this.engine.init();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      const buf = await this.engine.ctx.decodeAudioData(arr);
      this.buffers.set(name, buf);
      return buf;
    } catch (e) {
      console.warn(`Sample ${name} failed to load (${e.message}), using synthesized fallback`);
      this.buffers.set(name, this._synthFallback(name));
      return this.buffers.get(name);
    }
  }

  _synthFallback(name) {
    const ctx = this.engine.ctx;
    const rate = ctx.sampleRate;
    const dur = 0.3;
    const length = Math.floor(rate * dur);
    const buf = ctx.createBuffer(1, length, rate);
    const data = buf.getChannelData(0);
    let freq = 200, decay = 8;
    if (name === 'slap') { freq = 800; decay = 15; }
    else if (name === 'bass') { freq = 80; decay = 5; }
    else if (name === 'tone') { freq = 400; decay = 10; }
    else if (name === 'countdown') { freq = 880; decay = 12; }
    else if (name === 'go') { freq = 1320; decay = 4; }
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-t * decay);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
    }
    return buf;
  }

  has(name) {
    return this.buffers.has(name);
  }

  /**
   * 샘플 재생
   * @param {string} name
   * @param {object} opts - { time, volume, rate, detune, channel }
   */
  play(name, opts = {}) {
    const buf = this.buffers.get(name);
    if (!buf || !this.engine.ctx) return null;
    const src = this.engine.ctx.createBufferSource();
    src.buffer = buf;
    const rate = opts.rate ?? 1.0;
    src.playbackRate.value = rate;
    if (opts.detune && src.detune) src.detune.value = opts.detune;
    const g = this.engine.ctx.createGain();
    g.gain.value = opts.volume ?? 1.0;
    src.connect(g);
    const target = opts.channel === 'bgm' ? this.engine.bgmGain : this.engine.sfxGain;
    g.connect(target);
    const when = opts.time ?? this.engine.ctx.currentTime;
    src.start(when);
    return { source: src, gain: g };
  }

  /**
   * 노트 히트 사운드 (velocity layer 자동 적용)
   */
  playHit(lane, judgment = 'perfect') {
    let rate = 1.0, detune = 0, vol = 1.0;
    if (judgment === 'great') {
      rate = 0.98 + Math.random() * 0.04;
      detune = (Math.random() - 0.5) * 50;
      vol = 0.95;
    } else if (judgment === 'good') {
      rate = 0.95 + Math.random() * 0.10;
      detune = (Math.random() - 0.5) * 100;
      vol = 0.9;
    } else {
      rate = 0.99 + Math.random() * 0.02;
      detune = (Math.random() - 0.5) * 30;
      vol = 1.0;
    }
    return this.play(lane, { rate, detune, volume: vol });
  }

  /**
   * BGM 재생 시작 (loop 옵션)
   */
  playBgm(name, when = 0, loop = false) {
    const buf = this.buffers.get(name);
    if (!buf || !this.engine.ctx) return null;
    const src = this.engine.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = this.engine.ctx.createGain();
    g.gain.value = 1.0;
    src.connect(g);
    g.connect(this.engine.bgmGain);
    src.start(when || this.engine.ctx.currentTime);
    return { source: src, gain: g };
  }

  generateBeep(freq, duration, type = 'sine', volume = 0.3) {
    if (!this.engine.ctx) return;
    const osc = this.engine.ctx.createOscillator();
    const g = this.engine.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = volume;
    g.gain.setValueAtTime(volume, this.engine.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.engine.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.engine.sfxGain);
    osc.start();
    osc.stop(this.engine.ctx.currentTime + duration);
  }
}

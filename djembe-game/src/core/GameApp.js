/**
 * GameApp.js - 전체 앱 컨트롤러 (rAF 루프, 캔버스, 모든 시스템 holder)
 */
import { AudioEngine } from '../audio/AudioEngine.js';
import { SampleBank } from '../audio/SampleBank.js';
import { AssetLoader } from './AssetLoader.js';
import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { ChartLoader } from '../game/ChartLoader.js';
import { RhythmLoader } from '../game/RhythmLoader.js';
import { Storage } from '../utils/Storage.js';
import { i18n } from '../utils/i18n.js';
import { Theme } from '../ui/Theme.js';

import { LoadingScene } from '../scenes/LoadingScene.js';
import { TitleScene } from '../scenes/TitleScene.js';
import { SongSelectScene } from '../scenes/SongSelectScene.js';
import { CountdownScene } from '../scenes/CountdownScene.js';
import { PlayScene } from '../scenes/PlayScene.js';
import { ResultScene } from '../scenes/ResultScene.js';
import { SettingsScene } from '../scenes/SettingsScene.js';
import { CalibrationScene } from '../scenes/CalibrationScene.js';
import { TutorialScene } from '../scenes/TutorialScene.js';
import { AchievementScene } from '../scenes/AchievementScene.js';
import { AboutScene } from '../scenes/AboutScene.js';
import { RhythmLibraryScene } from '../scenes/RhythmLibraryScene.js';
import { RhythmDetailScene } from '../scenes/RhythmDetailScene.js';
import { RhythmLoopScene } from '../scenes/RhythmLoopScene.js';
import { RhythmLearnScene } from '../scenes/RhythmLearnScene.js';
import { RhythmEncyclopediaScene } from '../scenes/RhythmEncyclopediaScene.js';
import { MedleyMenuScene } from '../scenes/MedleyMenuScene.js';
import { CustomMedleyScene } from '../scenes/CustomMedleyScene.js';
import { StatsScene } from '../scenes/StatsScene.js';

const FALLBACK_SONGS = [
  {
    id: 'tutorial_01',
    title: '첫 만남',
    artist: 'Djembe Master',
    bpm: 90, duration: 48,
    difficulty: { easy: 1, normal: 3, hard: 5 },
    unlocked: true
  },
  {
    id: 'savanna_dawn',
    title: '사바나의 새벽',
    artist: 'African Vibes',
    bpm: 110, duration: 60,
    difficulty: { easy: 2, normal: 5, hard: 7 },
    unlocked: true
  },
  {
    id: 'rhythm_storm',
    title: '리듬의 폭풍',
    artist: 'Tribal Fusion',
    bpm: 140, duration: 72,
    difficulty: { easy: 4, normal: 7, hard: 10 },
    unlocked: false,
    unlockCondition: { type: 'totalScore', value: 100000 }
  }
];

export class GameApp {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.lastTime = 0;
    this.elapsed = 0;
    this.running = false;
    this.fps = 60;
    this.fpsBuf = [];
    this.settings = Storage.getSettings();
    i18n.setLang(this.settings.language);
    Theme.setTheme(this.settings.theme);
    Theme.setColorblind(this.settings.colorblind);
    this.audioEngine = new AudioEngine();
    this.sampleBank = new SampleBank(this.audioEngine);
    this.assetLoader = new AssetLoader(this.sampleBank);
    this.inputManager = new InputManager(this.audioEngine, this.settings);
    this.sceneManager = new SceneManager();
    this.chartLoader = new ChartLoader();
    this.rhythmLoader = new RhythmLoader();
    this.songsFallback = FALLBACK_SONGS;
    this.konamiSeq = [];
    this.konamiTarget = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    this._setupCanvas();
    this._setupScenes();
    this._setupVisibility();
    this._setupErrorHandling();
    this._loadInlineCharts();
    this.audioEngine.setVolumes(this.settings.volume);
    this.inputManager.setInputOffset(this.settings.inputOffset);
    this.inputManager.attach(this.canvas);
    this.inputManager.on((evt) => this.sceneManager.handleInput(evt));
    this.inputManager.on((evt) => this._handleGlobalInput(evt));
    const unlockOnce = async () => {
      await this.audioEngine.unlock();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce);
    window.addEventListener('keydown', unlockOnce);
  }

  _loadInlineCharts() {
    this.chartLoader.loadInline('tutorial_01', generateChart('tutorial_01', '첫 만남', 'Djembe Master', 90, 48));
    this.chartLoader.loadInline('savanna_dawn', generateChart('savanna_dawn', '사바나의 새벽', 'African Vibes', 110, 60));
    this.chartLoader.loadInline('rhythm_storm', generateChart('rhythm_storm', '리듬의 폭풍', 'Tribal Fusion', 140, 72));
  }

  _setupCanvas() {
    const resize = () => {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.sceneManager.resize(this.width, this.height);
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));
  }

  _setupScenes() {
    this.sceneManager.register('loading', new LoadingScene(this));
    this.sceneManager.register('title', new TitleScene(this));
    this.sceneManager.register('songSelect', new SongSelectScene(this));
    this.sceneManager.register('countdown', new CountdownScene(this));
    this.sceneManager.register('play', new PlayScene(this));
    this.sceneManager.register('result', new ResultScene(this));
    this.sceneManager.register('settings', new SettingsScene(this));
    this.sceneManager.register('calibration', new CalibrationScene(this));
    this.sceneManager.register('tutorial', new TutorialScene(this));
    this.sceneManager.register('achievements', new AchievementScene(this));
    this.sceneManager.register('about', new AboutScene(this));
    this.sceneManager.register('rhythmLibrary', new RhythmLibraryScene(this));
    this.sceneManager.register('rhythmDetail', new RhythmDetailScene(this));
    this.sceneManager.register('rhythmLoop', new RhythmLoopScene(this));
    this.sceneManager.register('rhythmLearn', new RhythmLearnScene(this));
    this.sceneManager.register('rhythmEncyclopedia', new RhythmEncyclopediaScene(this));
    this.sceneManager.register('medleyMenu', new MedleyMenuScene(this));
    this.sceneManager.register('customMedley', new CustomMedleyScene(this));
    this.sceneManager.register('stats', new StatsScene(this));
    this.sceneManager.goTo('loading', null, { skipTransition: true });
  }

  _setupVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.audioEngine.suspend();
      } else {
        this.audioEngine.resume();
      }
    });
  }

  _setupErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error', e.error);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Promise rejection', e.reason);
    });
  }

  _handleGlobalInput(evt) {
    if (evt.type === 'keydown') {
      this.konamiSeq.push(evt.code);
      if (this.konamiSeq.length > this.konamiTarget.length) this.konamiSeq.shift();
      const match = this.konamiSeq.every((c, i) => c === this.konamiTarget[i]);
      if (match && this.konamiSeq.length === this.konamiTarget.length) {
        this._activateEasterEgg();
        this.konamiSeq = [];
      }
    }
  }

  _activateEasterEgg() {
    this.songsFallback.forEach(s => Storage.unlockSong(s.id));
    alert('🎉 이스터에그 발견! 모든 곡이 해금되었습니다.');
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(time) {
    if (!this.running) return;
    const dt = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.elapsed += dt;
    this.fpsBuf.push(1 / dt);
    if (this.fpsBuf.length > 60) this.fpsBuf.shift();
    this.fps = this.fpsBuf.reduce((a, b) => a + b, 0) / this.fpsBuf.length;
    this.sceneManager.update(dt);
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.sceneManager.render(this.ctx, this.width, this.height);
    if (this.settings.debug) {
      this.ctx.fillStyle = '#0f0';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`FPS: ${this.fps.toFixed(0)}`, 10, this.height - 10);
    }
    requestAnimationFrame((t) => this._loop(t));
  }
}

function generateChart(id, title, artist, bpm, durationSec) {
  const beatMs = 60000 / bpm;
  const totalBeats = Math.floor(durationSec * 1000 / beatMs);
  const offset = 1500;
  const easy = [], normal = [], hard = [];
  const lanes = ['bass', 'slap', 'tone'];
  for (let b = 4; b < totalBeats - 4; b++) {
    const t = offset + b * beatMs;
    if (b % 4 === 0) easy.push({ time: t, lane: 'bass', type: 'tap' });
    if (b % 2 === 0) normal.push({ time: t, lane: b % 8 === 0 ? 'bass' : (b % 4 === 0 ? 'slap' : 'tone'), type: 'tap' });
    else if (b % 4 === 1) normal.push({ time: t, lane: 'slap', type: 'tap' });
    const pattern = b % 8;
    if (pattern === 0) hard.push({ time: t, lane: 'bass', type: 'tap' });
    else if (pattern === 1) hard.push({ time: t, lane: 'slap', type: 'tap' });
    else if (pattern === 2) hard.push({ time: t, lane: 'tone', type: 'tap' });
    else if (pattern === 3) {
      hard.push({ time: t, lane: 'slap', type: 'tap' });
      hard.push({ time: t, lane: 'tone', type: 'tap' });
    }
    else if (pattern === 4) hard.push({ time: t, lane: 'bass', type: 'tap' });
    else if (pattern === 5) hard.push({ time: t, lane: 'tone', type: 'tap' });
    else if (pattern === 6) hard.push({ time: t, lane: 'slap', type: 'tap' });
    else if (pattern === 7) hard.push({ time: t, lane: 'bass', type: 'hold', duration: beatMs * 1.5 });
  }
  return {
    songId: id, title, artist, bpm, offset, duration: durationSec * 1000,
    difficulty: { easy: 1, normal: 3, hard: 5 },
    notes: { easy, normal, hard }
  };
}

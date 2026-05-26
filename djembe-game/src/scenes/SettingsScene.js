/**
 * SettingsScene.js - 설정 메뉴 (오디오/입력/화면/언어)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';

export class SettingsScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.uiButtons = [];
    this.controls = [];
    this.scrollY = 0;
    this.dragging = null;
  }

  onEnter() {
    this.elapsed = 0;
    this.scrollY = 0;
    this._buildUI();
  }

  _buildUI() {
    const w = this.app.width, h = this.app.height;
    const s = this.app.settings;
    this.uiButtons = [{
      key: 'back', label: '◀', x: 20, y: 20, w: 50, h: 50,
      bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 24, radius: 10,
      onClick: () => this.manager.goTo('title')
    }];
    const controls = [
      { type: 'header', label: i18n.t('settings_audio') },
      { type: 'slider', label: i18n.t('masterVolume'), min: 0, max: 1, step: 0.05, get: () => s.volume.master, set: (v) => { s.volume.master = v; this.app.audioEngine.setVolumes({ master: v }); } },
      { type: 'slider', label: i18n.t('bgmVolume'), min: 0, max: 1, step: 0.05, get: () => s.volume.bgm, set: (v) => { s.volume.bgm = v; this.app.audioEngine.setVolumes({ bgm: v }); } },
      { type: 'slider', label: i18n.t('sfxVolume'), min: 0, max: 1, step: 0.05, get: () => s.volume.sfx, set: (v) => { s.volume.sfx = v; this.app.audioEngine.setVolumes({ sfx: v }); } },
      { type: 'toggle', label: '카운트다운 사운드', get: () => s.countdownSound, set: (v) => s.countdownSound = v },
      { type: 'cycle', label: i18n.t('metronome'), options: ['off', 'soft', 'loud'], get: () => s.metronome, set: (v) => s.metronome = v },
      { type: 'header', label: i18n.t('settings_input') },
      { type: 'slider', label: i18n.t('inputOffset') + ' (ms)', min: -200, max: 200, step: 5, get: () => s.inputOffset, set: (v) => { s.inputOffset = v; this.app.inputManager.setInputOffset(v); }, fmt: (v) => v.toFixed(0) },
      { type: 'slider', label: i18n.t('audioOffset') + ' (ms)', min: -200, max: 200, step: 5, get: () => s.audioOffset, set: (v) => s.audioOffset = v, fmt: (v) => v.toFixed(0) },
      { type: 'button', label: i18n.t('calibration'), onClick: () => this.manager.goTo('calibration') },
      { type: 'header', label: i18n.t('settings_gameplay') },
      { type: 'slider', label: i18n.t('scrollSpeed'), min: 1.0, max: 3.0, step: 0.1, get: () => s.scrollSpeed, set: (v) => s.scrollSpeed = v, fmt: (v) => v.toFixed(1) + 'x' },
      { type: 'cycle', label: i18n.t('noteSize'), options: ['small', 'medium', 'large'], get: () => s.noteSize, set: (v) => s.noteSize = v },
      { type: 'toggle', label: i18n.t('screenShake'), get: () => s.screenShake, set: (v) => s.screenShake = v },
      { type: 'header', label: i18n.t('settings_display') },
      { type: 'cycle', label: i18n.t('theme'), options: ['default', 'dark', 'savanna', 'night'], get: () => s.theme, set: (v) => { s.theme = v; Theme.setTheme(v); } },
      { type: 'cycle', label: i18n.t('colorblind'), options: ['off', 'protanopia', 'deuteranopia', 'tritanopia'], get: () => s.colorblind, set: (v) => { s.colorblind = v; Theme.setColorblind(v); } },
      { type: 'cycle', label: i18n.t('particleQuality'), options: ['low', 'medium', 'high'], get: () => s.particleQuality, set: (v) => s.particleQuality = v },
      { type: 'toggle', label: i18n.t('largeFont'), get: () => s.largeFont, set: (v) => s.largeFont = v },
      { type: 'toggle', label: i18n.t('reducedMotion'), get: () => s.reducedMotion, set: (v) => s.reducedMotion = v },
      { type: 'toggle', label: i18n.t('haptic'), get: () => s.haptic, set: (v) => s.haptic = v },
      { type: 'header', label: i18n.t('settings_language') },
      { type: 'cycle', label: '언어 / Language', options: ['ko', 'en'], get: () => s.language, set: (v) => { s.language = v; i18n.setLang(v); this._buildUI(); } },
      { type: 'header', label: i18n.t('settings_data') },
      { type: 'button', label: i18n.t('resetData'), danger: true, onClick: () => {
        if (confirm(i18n.t('confirmReset'))) { Storage.resetAll(); location.reload(); }
      } }
    ];
    this.controls = controls;
  }

  _saveSettings() {
    Storage.saveSettings(this.app.settings);
  }

  update(dt) {
    this.elapsed += dt;
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(i18n.t('settings'), w / 2, 50);
    const startY = 100 - this.scrollY;
    const itemH = 50;
    const itemX = Math.max(40, w * 0.15);
    const itemW = w - itemX * 2;
    let y = startY;
    this._renderAreas = [];
    for (const c of this.controls) {
      if (c.type === 'header') {
        if (y > 60 && y < h) {
          ctx.fillStyle = T.primary;
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(c.label, itemX, y + 24);
        }
        y += 40;
        continue;
      }
      if (y > 60 && y < h - 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        this._roundRect(ctx, itemX, y, itemW, itemH - 8, 8);
        ctx.fill();
        ctx.fillStyle = T.text.primary;
        ctx.textAlign = 'left';
        ctx.font = '14px sans-serif';
        ctx.fillText(c.label, itemX + 16, y + 28);
        if (c.type === 'slider') {
          const val = c.get();
          const t = (val - c.min) / (c.max - c.min);
          const sx = itemX + itemW * 0.55, sw = itemW * 0.38;
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(sx, y + 22, sw, 4);
          ctx.fillStyle = T.primary;
          ctx.fillRect(sx, y + 22, sw * t, 4);
          ctx.beginPath();
          ctx.arc(sx + sw * t, y + 24, 10, 0, Math.PI * 2);
          ctx.fillStyle = T.primary;
          ctx.fill();
          ctx.fillStyle = T.text.secondary;
          ctx.textAlign = 'right';
          ctx.font = '11px monospace';
          ctx.fillText(c.fmt ? c.fmt(val) : val.toFixed(2), itemX + itemW - 16, y + 14);
          this._renderAreas.push({ x: sx - 10, y: y, w: sw + 20, h: itemH - 8, control: c, type: 'slider', sx, sw });
        } else if (c.type === 'toggle') {
          const val = c.get();
          const tw = 50, th = 26;
          const tx = itemX + itemW - tw - 16, ty = y + 11;
          ctx.fillStyle = val ? T.primary : 'rgba(255,255,255,0.2)';
          this._roundRect(ctx, tx, ty, tw, th, th / 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(tx + (val ? tw - th / 2 : th / 2), ty + th / 2, th / 2 - 3, 0, Math.PI * 2);
          ctx.fill();
          this._renderAreas.push({ x: tx, y: ty, w: tw, h: th, control: c, type: 'toggle' });
        } else if (c.type === 'cycle') {
          const val = c.get();
          ctx.fillStyle = T.primary;
          ctx.textAlign = 'right';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('< ' + val + ' >', itemX + itemW - 16, y + 28);
          this._renderAreas.push({ x: itemX + itemW - 160, y, w: 144, h: itemH - 8, control: c, type: 'cycle' });
        } else if (c.type === 'button') {
          ctx.fillStyle = c.danger ? '#FF1744' : T.primary;
          ctx.textAlign = 'right';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText('▶ ' + (c.label || ''), itemX + itemW - 16, y + 28);
          this._renderAreas.push({ x: itemX + itemW - 200, y, w: 184, h: itemH - 8, control: c, type: 'button' });
        }
      }
      y += itemH;
    }
    if (y - 100 + this.scrollY > h) {
      ctx.fillStyle = T.text.tertiary;
      ctx.textAlign = 'center';
      ctx.font = '11px sans-serif';
      ctx.fillText('▼ 스크롤 ▼', w / 2, h - 8);
    }
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'down' && evt.source === 'touch') {
      for (const a of (this._renderAreas || [])) {
        if (evt.x >= a.x && evt.x <= a.x + a.w && evt.y >= a.y && evt.y <= a.y + a.h) {
          this._activate(a, evt.x);
          return;
        }
      }
    }
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') this.manager.goTo('title');
      if (evt.code === 'ArrowDown') this.scrollY = Math.min(this.scrollY + 50, 1000);
      if (evt.code === 'ArrowUp') this.scrollY = Math.max(0, this.scrollY - 50);
    }
  }

  _activate(area, clickX) {
    const c = area.control;
    if (area.type === 'slider') {
      const t = Math.max(0, Math.min(1, (clickX - area.sx) / area.sw));
      let v = c.min + t * (c.max - c.min);
      v = Math.round(v / c.step) * c.step;
      c.set(v);
      this._saveSettings();
    } else if (area.type === 'toggle') {
      c.set(!c.get());
      this._saveSettings();
    } else if (area.type === 'cycle') {
      const i = c.options.indexOf(c.get());
      c.set(c.options[(i + 1) % c.options.length]);
      this._saveSettings();
    } else if (area.type === 'button') {
      c.onClick && c.onClick();
    }
  }
}

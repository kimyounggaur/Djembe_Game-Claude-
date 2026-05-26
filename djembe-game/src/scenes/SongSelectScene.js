/**
 * SongSelectScene.js - 곡 선택 (좌: 곡 목록, 우: 상세)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { formatTime } from '../utils/MathUtils.js';

export class SongSelectScene extends Scene {
  constructor(app) {
    super(app);
    this.songs = [];
    this.selectedIdx = 0;
    this.difficulty = 'normal';
    this.elapsed = 0;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.uiButtons = [];
    this.listAreas = [];
    this.previewHandle = null;
  }

  async onEnter() {
    this.elapsed = 0;
    try {
      const res = await fetch('assets/songs.json');
      const data = await res.json();
      this.songs = data.songs;
    } catch (e) {
      this.songs = this.app.songsFallback || [];
    }
    const unlocks = Storage.getUnlocks();
    const total = Storage.getTotalScore();
    this.songs = this.songs.map(s => {
      if (s.unlocked) return s;
      if (s.unlockCondition && s.unlockCondition.type === 'totalScore' && total >= s.unlockCondition.value) return { ...s, unlocked: true };
      if (unlocks[s.id]) return { ...s, unlocked: true };
      return s;
    });
    this.selectedIdx = 0;
    this._buildButtons();
    this._playPreview();
  }

  onExit() {
    this._stopPreview();
  }

  _playPreview() {
    this._stopPreview();
  }

  _stopPreview() {
    if (this.previewHandle && this.previewHandle.source) {
      try { this.previewHandle.source.stop(); } catch (e) {}
    }
    this.previewHandle = null;
  }

  _buildButtons() {
    const w = this.app.width;
    const h = this.app.height;
    const isMobile = w < 700;
    const padding = 20;
    const btnSize = isMobile ? 48 : 56;
    this.uiButtons = [];
    this.uiButtons.push({
      key: 'back', label: '◀', x: padding, y: padding, w: btnSize, h: btnSize,
      bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 24, radius: 12,
      onClick: () => this.manager.goTo('title')
    });
    const diffs = ['easy', 'normal', 'hard'];
    const diffLabels = { easy: i18n.t('easy'), normal: i18n.t('normal'), hard: i18n.t('hard') };
    const diffColors = { easy: '#76FF03', normal: '#FFD93D', hard: '#FF6B6B' };
    const detailX = isMobile ? padding : w * 0.5 + 20;
    const diffW = isMobile ? (w - padding * 2 - 20) / 3 : 100;
    diffs.forEach((d, i) => {
      this.uiButtons.push({
        key: `diff_${d}`,
        label: diffLabels[d],
        x: detailX + i * (diffW + 10),
        y: isMobile ? h - 150 : h * 0.7,
        w: diffW, h: 44,
        bg: this.difficulty === d ? diffColors[d] : 'rgba(255,255,255,0.1)',
        color: this.difficulty === d ? '#000' : '#fff',
        fontSize: 16, radius: 10,
        onClick: () => { this.difficulty = d; this._buildButtons(); }
      });
    });
    const playY = isMobile ? h - 80 : h - 100;
    const playW = isMobile ? w - padding * 2 : w * 0.4;
    const playX = isMobile ? padding : w * 0.5 + 20;
    const song = this.songs[this.selectedIdx];
    const locked = song && !song.unlocked;
    this.uiButtons.push({
      key: 'play', label: locked ? i18n.t('locked') : i18n.t('play'),
      x: playX, y: playY, w: playW, h: 64,
      bg: locked ? '#666' : Theme.current.primary,
      color: '#fff', fontSize: 24, radius: 16,
      pulse: !locked,
      onClick: () => {
        if (!locked) {
          this.manager.goTo('countdown', { songId: song.id, difficulty: this.difficulty, mode: 'arcade' });
        }
      }
    });
  }

  update(dt) {
    this.elapsed += dt;
    this.scrollY += (this.targetScrollY - this.scrollY) * Math.min(1, dt * 8);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    const isMobile = w < 700;
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(i18n.t('songSelect'), w / 2, 50);
    const listX = 20;
    const listY = 100;
    const listW = isMobile ? w - 40 : w * 0.5 - 30;
    const listH = isMobile ? h * 0.35 : h - 160;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this._roundRect(ctx, listX, listY, listW, listH, 12);
    ctx.fill();
    ctx.beginPath();
    this._roundRect(ctx, listX, listY, listW, listH, 12);
    ctx.clip();
    const itemH = 70;
    this.listAreas = [];
    for (let i = 0; i < this.songs.length; i++) {
      const s = this.songs[i];
      const y = listY + 10 + i * (itemH + 8) - this.scrollY;
      this.listAreas.push({ idx: i, x: listX, y, w: listW, h: itemH });
      if (y + itemH < listY || y > listY + listH) continue;
      const selected = i === this.selectedIdx;
      ctx.fillStyle = selected ? 'rgba(78,205,196,0.25)' : 'rgba(255,255,255,0.05)';
      this._roundRect(ctx, listX + 8, y, listW - 16, itemH, 8);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = T.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = s.unlocked ? T.text.primary : T.text.tertiary;
      ctx.textAlign = 'left';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(s.unlocked ? s.title : '🔒 ???', listX + 20, y + 26);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = T.text.secondary;
      ctx.fillText(`${s.artist || 'Unknown'}  •  BPM ${s.bpm}  •  ${formatTime(s.duration * 1000)}`, listX + 20, y + 48);
    }
    ctx.restore();
    const detailX = isMobile ? 20 : w * 0.5 + 20;
    const detailY = isMobile ? listY + listH + 20 : listY;
    const detailW = isMobile ? w - 40 : w * 0.5 - 40;
    const song = this.songs[this.selectedIdx];
    if (song) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this._roundRect(ctx, detailX, detailY, detailW, isMobile ? 250 : h * 0.55, 12);
      ctx.fill();
      ctx.fillStyle = song.unlocked ? T.text.primary : T.text.tertiary;
      ctx.textAlign = 'left';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(song.unlocked ? song.title : '???', detailX + 24, detailY + 40);
      ctx.fillStyle = T.text.secondary;
      ctx.font = '14px sans-serif';
      ctx.fillText(song.artist || '', detailX + 24, detailY + 64);
      const stars = Math.round((song.difficulty?.[this.difficulty] || 0));
      ctx.fillStyle = '#FFD93D';
      ctx.font = '18px sans-serif';
      let starStr = '';
      for (let i = 1; i <= 10; i++) starStr += i <= stars ? '★' : '☆';
      ctx.fillText(`난이도: ${starStr}`, detailX + 24, detailY + 100);
      const scores = Storage.getScores();
      const best = scores[song.id]?.[this.difficulty];
      ctx.fillStyle = T.text.primary;
      ctx.font = '13px sans-serif';
      if (best) {
        ctx.fillText(`${i18n.t('highScore')}: ${best.highScore.toLocaleString()}  /  ${i18n.t('bestGrade')}: ${best.bestGrade}  ${best.fullCombo ? '(FC)' : ''}`, detailX + 24, detailY + 130);
        ctx.fillText(`${i18n.t('playCount')}: ${best.playCount}`, detailX + 24, detailY + 150);
      } else {
        ctx.fillStyle = T.text.tertiary;
        ctx.fillText('아직 플레이하지 않음', detailX + 24, detailY + 130);
      }
      if (!song.unlocked && song.unlockCondition) {
        ctx.fillStyle = '#FFD93D';
        ctx.font = '13px sans-serif';
        ctx.fillText(i18n.t('unlockHint', song.unlockCondition.value.toLocaleString()), detailX + 24, detailY + 180);
      }
    }
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'down' && evt.source === 'touch') {
      for (const area of this.listAreas) {
        if (evt.x >= area.x && evt.x <= area.x + area.w && evt.y >= area.y && evt.y <= area.y + area.h) {
          this.selectedIdx = area.idx;
          this._buildButtons();
          return;
        }
      }
    }
    if (evt.type === 'keydown') {
      if (evt.code === 'ArrowDown') {
        this.selectedIdx = Math.min(this.songs.length - 1, this.selectedIdx + 1);
        this._buildButtons();
      } else if (evt.code === 'ArrowUp') {
        this.selectedIdx = Math.max(0, this.selectedIdx - 1);
        this._buildButtons();
      } else if (evt.code === 'ArrowLeft') {
        const order = ['easy', 'normal', 'hard'];
        const idx = order.indexOf(this.difficulty);
        if (idx > 0) { this.difficulty = order[idx - 1]; this._buildButtons(); }
      } else if (evt.code === 'ArrowRight') {
        const order = ['easy', 'normal', 'hard'];
        const idx = order.indexOf(this.difficulty);
        if (idx < order.length - 1) { this.difficulty = order[idx + 1]; this._buildButtons(); }
      } else if (evt.code === 'Enter' || evt.code === 'Space') {
        const song = this.songs[this.selectedIdx];
        if (song && song.unlocked) {
          this.manager.goTo('countdown', { songId: song.id, difficulty: this.difficulty, mode: 'arcade' });
        }
      } else if (evt.code === 'Escape') {
        this.manager.goTo('title');
      }
    }
  }
}

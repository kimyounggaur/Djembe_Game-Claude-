/**
 * ResultScene.js - 곡 종료 결과 (등급, 점수, 정확도, 그래프)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { easeOutCubic, easeOutBack, formatScore } from '../utils/MathUtils.js';
import { Storage } from '../utils/Storage.js';

const ACHIEVEMENT_DEFS = {
  first_step: { name: '첫 발걸음', cond: (stats) => stats.songPlays && Object.keys(stats.songPlays).length >= 1 },
  rhythm_master: { name: '리듬의 시작', cond: (stats, summary) => summary?.maxCombo >= 100 },
  divine: { name: '기교의 정점', cond: (stats, summary) => summary?.fullCombo },
  marathon: { name: '마라톤 러너', cond: (stats) => stats.totalPlayTime >= 3600 * 1000 },
  precise: { name: '정확한 손', cond: (stats, summary) => summary?.accuracy >= 95 },
  combo_master: { name: '콤보 마스터', cond: (stats, summary) => summary?.maxCombo >= 500 },
  djembe_god: { name: '젬베의 신', cond: (stats, summary, ctx) => ctx?.difficulty === 'hard' && summary?.fullCombo }
};

export class ResultScene extends Scene {
  constructor(app) {
    super(app);
    this.summary = null;
    this.elapsed = 0;
    this.displayedScore = 0;
    this.uiButtons = [];
    this.unlockedAchievements = [];
    this.songData = null;
    this.data = null;
  }

  onEnter(data) {
    this.data = data;
    this.summary = data.summary;
    this.songData = data.chart;
    this.elapsed = 0;
    this.displayedScore = 0;
    this.unlockedAchievements = [];
    const stats = { ...Storage.getStats() };
    Object.entries(ACHIEVEMENT_DEFS).forEach(([id, def]) => {
      try {
        if (def.cond(stats, this.summary, { difficulty: data.difficulty })) {
          if (Storage.unlockAchievement(id)) this.unlockedAchievements.push(def.name);
        }
      } catch (e) {}
    });
    // 리듬 도감 도전과제 자동 체크
    try {
      import('./AchievementScene.js').then(mod => {
        const newly = mod.checkAllAchievements(this.app);
        if (Array.isArray(newly)) {
          newly.forEach(id => {
            const names = {
              first_rhythm: '첫 리듬', library_explorer: '도감 탐험가', library_completionist: '도감 완성자',
              master_path: '마스터의 길', versatile: '다재다능', groove_master: '그루브 마스터',
              speed_demon: '스피드 데몬', world_tour: '세계 일주', bookworm: '책벌레',
              medley_champion: '메들리 챔피언', custom_creator: '나만의 길', culture_scholar: '문화 학도'
            };
            if (names[id] && !this.unlockedAchievements.includes(names[id])) {
              this.unlockedAchievements.push(names[id]);
            }
          });
        }
      }).catch(() => {});
    } catch (e) {}
    this._buildButtons();
  }

  _buildButtons() {
    const w = this.app.width, h = this.app.height;
    const isMobile = w < 700;
    const btnH = 50;
    const btnW = isMobile ? (w - 60) / 2 : 180;
    const gap = 12;
    const startX = isMobile ? 20 : w / 2 - (btnW * 4 + gap * 3) / 2;
    const y = h - 80;
    const items = [
      { label: i18n.t('retry'), bg: Theme.current.primary, onClick: () => this.manager.goTo('countdown', { songId: this.data.songId, difficulty: this.data.difficulty, mode: this.data.mode }) },
      { label: i18n.t('nextSong'), bg: 'rgba(255,255,255,0.15)', onClick: () => this.manager.goTo('songSelect') },
      { label: i18n.t('share'), bg: 'rgba(255,255,255,0.15)', onClick: () => this._share() },
      { label: i18n.t('mainMenu'), bg: 'rgba(255,255,255,0.15)', onClick: () => this.manager.goTo('title') }
    ];
    this.uiButtons = [];
    if (isMobile) {
      items.forEach((it, i) => {
        const row = Math.floor(i / 2), col = i % 2;
        this.uiButtons.push({
          ...it, color: '#fff', fontSize: 16, radius: 10,
          x: 20 + col * (btnW + gap), y: y - (1 - row) * (btnH + gap), w: btnW, h: btnH
        });
      });
    } else {
      items.forEach((it, i) => {
        this.uiButtons.push({
          ...it, color: '#fff', fontSize: 16, radius: 10,
          x: startX + i * (btnW + gap), y, w: btnW, h: btnH
        });
      });
    }
  }

  _share() {
    const s = this.summary;
    const text = `🥁 젬베 리듬 게임 결과! 등급 ${s.grade} / 점수 ${s.score.toLocaleString()} / 정확도 ${s.accuracy.toFixed(1)}%`;
    if (navigator.share) {
      navigator.share({ title: '젬베 리듬 게임', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => alert('결과가 클립보드에 복사되었습니다'));
    } else {
      alert(text);
    }
  }

  update(dt) {
    this.elapsed += dt;
    const target = this.summary?.score || 0;
    this.displayedScore += (target - this.displayedScore) * Math.min(1, dt * 1.5);
    if (Math.abs(target - this.displayedScore) < 50) this.displayedScore = target;
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    const t = this.elapsed;
    const s = this.summary;
    if (!s) return;
    const stagger = (delay) => Math.max(0, Math.min(1, (t - delay) * 2.5));
    ctx.save();
    ctx.globalAlpha = stagger(0);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(this.songData?.title || '', w / 2, 60);
    ctx.fillStyle = T.text.secondary;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${this.data.difficulty.toUpperCase()}  •  ${this.songData?.artist || ''}`, w / 2, 84);
    ctx.restore();
    const gp = stagger(0.3);
    if (gp > 0) {
      const scale = easeOutBack(gp);
      ctx.save();
      ctx.translate(w / 2, h * 0.32);
      ctx.scale(scale, scale);
      const gColor = { S: '#FFD700', A: '#76FF03', B: '#00E5FF', C: '#FFD93D', D: '#FF6B6B' }[s.grade];
      ctx.fillStyle = gColor;
      ctx.shadowColor = gColor;
      ctx.shadowBlur = 50;
      ctx.font = `bold ${Math.min(w, h) * 0.2}px 'Black Han Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.grade, 0, 0);
      ctx.restore();
    }
    const sp = stagger(0.6);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i18n.t('score'), w / 2, h * 0.48);
      ctx.fillStyle = T.text.primary;
      ctx.font = `bold ${w < 700 ? 36 : 56}px monospace`;
      ctx.fillText(formatScore(Math.floor(this.displayedScore)), w / 2, h * 0.55);
      ctx.font = `${w < 700 ? 14 : 16}px sans-serif`;
      ctx.fillStyle = T.primary;
      ctx.fillText(`${i18n.t('accuracy')}: ${s.accuracy.toFixed(2)}%  •  Max Combo: ${s.maxCombo}`, w / 2, h * 0.62);
      ctx.restore();
    }
    const tp = stagger(0.9);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      const cy = h * 0.72;
      const counts = [
        { label: 'PERFECT', val: s.tally.perfect, color: T.judgment.perfect },
        { label: 'GREAT', val: s.tally.great, color: T.judgment.great },
        { label: 'GOOD', val: s.tally.good, color: T.judgment.good },
        { label: 'MISS', val: s.tally.miss, color: T.judgment.miss }
      ];
      const itemW = Math.min(120, w / 5);
      const totalW = itemW * 4 + 12 * 3;
      counts.forEach((c, i) => {
        const x = w / 2 - totalW / 2 + i * (itemW + 12);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this._roundRect(ctx, x, cy, itemW, 60, 8);
        ctx.fill();
        ctx.fillStyle = c.color;
        ctx.textAlign = 'center';
        ctx.font = '11px sans-serif';
        ctx.fillText(c.label, x + itemW / 2, cy + 16);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(c.val, x + itemW / 2, cy + 44);
      });
      ctx.restore();
    }
    if (this.data.isNew && tp > 0) {
      ctx.save();
      ctx.translate(w * 0.85, h * 0.32);
      ctx.rotate(-0.2);
      ctx.fillStyle = '#FF1744';
      this._roundRect(ctx, -60, -20, 120, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i18n.t('newRecord'), 0, 0);
      ctx.restore();
    }
    if (s.fullCombo) {
      ctx.save();
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.allPerfect ? i18n.t('allPerfect') : i18n.t('fullCombo'), w / 2, h * 0.66);
      ctx.restore();
    }
    if (this.unlockedAchievements.length > 0 && tp > 0) {
      ctx.save();
      ctx.fillStyle = '#FFD93D';
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🏆 ' + i18n.t('achievementUnlocked'), 20, 100);
      ctx.fillStyle = T.text.primary;
      ctx.font = '12px sans-serif';
      this.unlockedAchievements.forEach((n, i) => ctx.fillText('• ' + n, 30, 122 + i * 18));
      ctx.restore();
    }
    if (stagger(1.2) > 0) {
      for (const btn of this.uiButtons) this.drawButton(ctx, btn, t);
    }
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown') {
      if (evt.code === 'Enter') this.uiButtons[0]?.onClick?.();
      else if (evt.code === 'Escape') this.manager.goTo('title');
    }
  }
}

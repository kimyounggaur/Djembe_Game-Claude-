/**
 * StatsScene.js - 통계 대시보드
 *   - 종합 (플레이 횟수, 시간, 정확도, 콤보, 점수)
 *   - 리듬 진행도 (클리어/마스터/풀콤보 % 바)
 *   - 지역별 진행도
 *   - 가장 많이 친 리듬 Top 5
 *   - 다음 추천
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { UserSkillEstimator } from '../utils/UserSkillEstimator.js';
import { clamp } from '../utils/MathUtils.js';

export class StatsScene extends Scene {
  constructor(app) {
    super(app);
    this.scroll = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
  }

  async onEnter() {
    this.scroll = 0;
    this.targetScroll = 0;
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
  }

  update(dt) {
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    this._renderHeader(ctx, w);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 60, w, h - 60);
    ctx.clip();
    ctx.translate(0, -this.scroll);

    const pad = 20;
    let y = 80;

    y = this._renderOverallStats(ctx, pad, y, w - pad * 2);
    y = this._renderRhythmProgress(ctx, pad, y + 14, w - pad * 2);
    y = this._renderRegionProgress(ctx, pad, y + 14, w - pad * 2);
    y = this._renderMostPlayed(ctx, pad, y + 14, w - pad * 2);
    y = this._renderRecommendation(ctx, pad, y + 14, w - pad * 2);

    this.maxScroll = Math.max(0, y - h + 100);
    ctx.restore();
  }

  _renderHeader(ctx, w) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, 12, 14, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 30);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📊 ' + i18n.t('statsDashboard'), 60, 30);
    ctx.restore();
  }

  _renderOverallStats(ctx, x, y, w) {
    const T = Theme.current;
    const stats = Storage.getStats();
    const totalScore = Storage.getTotalScore();
    const playMin = Math.floor((stats.totalPlayTime || 0) / 60000);
    const playSec = Math.floor(((stats.totalPlayTime || 0) % 60000) / 1000);
    const totalNotes = stats.totalNotes || 0;
    const totalPerfect = stats.totalPerfect || 0;
    const accuracy = totalNotes ? (totalPerfect / totalNotes * 100).toFixed(1) : '0.0';
    const cleared = UserSkillEstimator.getClearedCount();

    const cardH = 130;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📈 종합', x + 16, y + 14);

    const items = [
      { label: '총 점수', value: totalScore.toLocaleString(), color: '#FFD93D' },
      { label: '플레이 시간', value: `${playMin}분 ${playSec}초`, color: '#4ECDC4' },
      { label: '총 노트 수', value: totalNotes.toLocaleString(), color: '#FF6B6B' },
      { label: '평균 정확도', value: `${accuracy}%`, color: '#76FF03' },
      { label: '클리어 리듬', value: cleared, color: '#9C27B0' },
      { label: '마스터 리듬', value: UserSkillEstimator.getMasteredCount(), color: '#FF9800' }
    ];

    const cols = 3;
    const itemW = (w - 32) / cols;
    items.forEach((it, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const ix = x + 16 + col * itemW;
      const iy = y + 44 + row * 38;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '11px sans-serif';
      ctx.fillText(it.label, ix, iy);
      ctx.fillStyle = it.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(String(it.value), ix, iy + 16);
    });
    ctx.restore();
    return y + cardH;
  }

  _renderRhythmProgress(ctx, x, y, w) {
    const T = Theme.current;
    const total = this.app.rhythmLoader.getAllMetadata().length;
    const cleared = UserSkillEstimator.getClearedCount();
    const mastered = UserSkillEstimator.getMasteredCount();
    const fullCombo = UserSkillEstimator.getFullComboCount();

    const cardH = 160;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🥁 리듬 진행도', x + 16, y + 14);

    const bars = [
      { label: '클리어', value: cleared, total, color: '#4ECDC4' },
      { label: '마스터', value: mastered, total, color: '#9C27B0' },
      { label: '풀콤보', value: fullCombo, total, color: '#FFD93D' }
    ];
    bars.forEach((b, i) => {
      const by = y + 50 + i * 32;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(b.label, x + 16, by);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      const pct = b.total > 0 ? (b.value / b.total * 100).toFixed(0) : '0';
      ctx.fillText(`${b.value} / ${b.total}  (${pct}%)`, x + w - 16, by);
      // 바
      const barX = x + 80;
      const barW = w - 80 - 130;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, barX, by + 6, barW, 8, 4);
      ctx.fill();
      ctx.fillStyle = b.color;
      this._roundRect(ctx, barX, by + 6, barW * (b.value / Math.max(1, b.total)), 8, 4);
      ctx.fill();
    });
    ctx.restore();
    return y + cardH;
  }

  _renderRegionProgress(ctx, x, y, w) {
    const T = Theme.current;
    const progress = UserSkillEstimator.getRegionProgress(this.app.rhythmLoader);
    const regions = this.app.rhythmLoader.getCategories().regions || [];
    const lang = i18n.getLang();

    const cardH = 30 + regions.length * 26 + 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🗺 지역별 진행도', x + 16, y + 14);

    regions.forEach((r, i) => {
      const ry = y + 44 + i * 26;
      const p = progress[r.id] || { cleared: 0, total: 0 };
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = T.text.primary;
      ctx.fillText(`${r.flag || ''}  ${r.name?.[lang] || r.name?.ko || r.id}`, x + 16, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFD93D';
      ctx.fillText(`${p.cleared} / ${p.total}`, x + w - 16, ry);
      const barX = x + 200;
      const barW = w - 200 - 80;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, barX, ry + 2, barW, 8, 4);
      ctx.fill();
      ctx.fillStyle = r.color || '#fff';
      this._roundRect(ctx, barX, ry + 2, barW * (p.cleared / Math.max(1, p.total)), 8, 4);
      ctx.fill();
    });
    ctx.restore();
    return y + cardH;
  }

  _renderMostPlayed(ctx, x, y, w) {
    const T = Theme.current;
    const rhythmScores = Storage.getRhythmScores();
    const sorted = Object.entries(rhythmScores)
      .map(([id, s]) => ({ id, ...s, meta: this.app.rhythmLoader.getMetadata(id) }))
      .filter(s => s.meta)
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 5);

    if (sorted.length === 0) {
      const cardH = 70;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this._roundRect(ctx, x, y, w, cardH, 12);
      ctx.fill();
      ctx.fillStyle = T.text.primary;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('🎵 가장 많이 친 리듬', x + 16, y + 14);
      ctx.fillStyle = T.text.secondary;
      ctx.font = '13px sans-serif';
      ctx.fillText('아직 플레이 기록이 없습니다', x + 16, y + 40);
      ctx.restore();
      return y + cardH;
    }

    const cardH = 36 + sorted.length * 28 + 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🎵 가장 많이 친 리듬', x + 16, y + 14);
    const lang = i18n.getLang();
    sorted.forEach((s, i) => {
      const ry = y + 46 + i * 28;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#FFD93D' : T.text.primary;
      ctx.fillText(`${i + 1}.`, x + 16, ry);
      ctx.fillStyle = T.text.primary;
      ctx.font = '14px sans-serif';
      ctx.fillText(s.meta.name?.[lang] || s.meta.name?.ko || s.id, x + 40, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${s.playCount}회  •  ${s.bestGrade}`, x + w - 16, ry);
    });
    ctx.restore();
    return y + cardH;
  }

  _renderRecommendation(ctx, x, y, w) {
    const T = Theme.current;
    const rec = UserSkillEstimator.getNextRecommendation(this.app.rhythmLoader);
    const skill = UserSkillEstimator.estimateUserSkill(this.app.rhythmLoader);
    const cardH = 90;
    ctx.save();
    ctx.fillStyle = 'rgba(255,217,61,0.1)';
    this._roundRect(ctx, x, y, w, cardH, 12);
    ctx.fill();
    ctx.strokeStyle = '#FFD93D';
    ctx.stroke();
    ctx.fillStyle = '#FFD93D';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('💡 다음 도전 추천', x + 16, y + 14);
    ctx.fillStyle = T.text.secondary;
    ctx.font = '12px sans-serif';
    ctx.fillText(`현재 추정 실력: ★${skill}`, x + 16, y + 38);
    if (rec) {
      const lang = i18n.getLang();
      const name = rec.name?.[lang] || rec.name?.ko || rec.id;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`→ ${name}  (★${rec.stars})`, x + 16, y + 58);
    }
    ctx.restore();
    return y + cardH;
  }

  handleInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('title'); return; }
      if (evt.code === 'ArrowDown') { this.targetScroll = clamp(this.targetScroll + 60, 0, this.maxScroll); return; }
      if (evt.code === 'ArrowUp') { this.targetScroll = clamp(this.targetScroll - 60, 0, this.maxScroll); return; }
    }
    if (evt.type === 'wheel') {
      this.targetScroll = clamp(this.targetScroll + evt.dy, 0, this.maxScroll);
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      if (evt.x < 50 && evt.y < 50) this.manager.goTo('title');
    }
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
}

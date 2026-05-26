/**
 * RhythmLibraryScene.js - 12개 전통 리듬 도감 그리드
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { UserSkillEstimator } from '../utils/UserSkillEstimator.js';
import { RhythmCard } from '../ui/components/RhythmCard.js';
import { FilterBar } from '../ui/components/FilterBar.js';
import { easeOutCubic, clamp } from '../utils/MathUtils.js';

export class RhythmLibraryScene extends Scene {
  constructor(app) {
    super(app);
    this.scroll = 0;
    this.targetScroll = 0;
    this.filtered = [];
    this.hoveredIdx = -1;
    this.focusedIdx = 0;
    this.entranceT = 0;
    this.recommended = null;
    this.filters = { tier: null, region: null, purpose: null, tempo: null, sort: 'order', query: '' };
    this.filterBar = null;
  }

  async onEnter() {
    this.entranceT = 0;
    this.scroll = 0;
    this.targetScroll = 0;
    this.hoveredIdx = -1;
    this.focusedIdx = 0;
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
    this._buildFilterBar();
    this._applyFilters();
    try {
      this.recommended = UserSkillEstimator.getNextRecommendation(this.app.rhythmLoader);
    } catch (e) { this.recommended = null; }
  }

  _buildFilterBar() {
    const cats = this.app.rhythmLoader.getCategories();
    const lang = i18n.getLang();
    const tierOpts = [
      { value: null, label: i18n.t('filterAll'), groupLabel: i18n.t('filterTier') },
      { value: 'beginner', label: i18n.t('tier_beginner') },
      { value: 'intermediate', label: i18n.t('tier_intermediate') },
      { value: 'advanced', label: i18n.t('tier_advanced') }
    ];
    const regionOpts = [
      { value: null, label: i18n.t('filterAll'), groupLabel: i18n.t('filterRegion') },
      ...cats.regions.map(r => ({ value: r.id, label: r.name[lang] || r.name.ko, groupLabel: i18n.t('filterRegion') }))
    ];
    const purposeOpts = [
      { value: null, label: i18n.t('filterAll'), groupLabel: i18n.t('filterPurpose') },
      ...cats.purposes.map(p => ({ value: p.id, label: `${p.icon} ${p.name[lang] || p.name.ko}`, groupLabel: i18n.t('filterPurpose') }))
    ];
    const tempoOpts = [
      { value: null, label: i18n.t('filterAll'), groupLabel: i18n.t('filterTempo') },
      ...cats.tempos.map(t => ({ value: t.id, label: t.name[lang] || t.name.ko, groupLabel: i18n.t('filterTempo') }))
    ];
    const sortOpts = [
      { value: 'order', label: i18n.t('sortOrder'), groupLabel: '↕' },
      { value: 'stars-asc', label: i18n.t('sortStarsAsc'), groupLabel: '↕' },
      { value: 'stars-desc', label: i18n.t('sortStarsDesc'), groupLabel: '↕' },
      { value: 'name', label: i18n.t('sortName'), groupLabel: '↕' },
      { value: 'bpm-asc', label: i18n.t('sortBpmAsc'), groupLabel: '↕' },
      { value: 'bpm-desc', label: i18n.t('sortBpmDesc'), groupLabel: '↕' }
    ];
    this.filterBar = new FilterBar({
      options: { tier: tierOpts, region: regionOpts, purpose: purposeOpts, tempo: tempoOpts, sort: sortOpts },
      values: { ...this.filters },
      lang,
      onChange: (key, value) => {
        this.filters[key] = value;
        this._applyFilters();
      }
    });
    this._layoutFilterBar();
  }

  _layoutFilterBar() {
    if (!this.filterBar) return;
    this.filterBar.setBounds(20, 64, this.app.width - 40, 48);
  }

  _applyFilters() {
    if (!this.app.rhythmLoader.library) return;
    const result = this.app.rhythmLoader.filter(this.filters, i18n.getLang());
    this.filtered = this.app.rhythmLoader.sortBy(result, this.filters.sort);
    this.focusedIdx = Math.min(this.focusedIdx, this.filtered.length - 1);
    if (this.focusedIdx < 0) this.focusedIdx = 0;
  }

  onResize() { this._layoutFilterBar(); }

  _gridLayout() {
    const w = this.app.width;
    const h = this.app.height;
    const isMobile = w < 700;
    const pad = 20;
    const top = 140;
    const bottom = 80;
    const cardW = isMobile ? 140 : 180;
    const cardH = isMobile ? 200 : 240;
    const gap = isMobile ? 12 : 18;
    const cols = Math.max(2, Math.floor((w - pad * 2 + gap) / (cardW + gap)));
    const rowH = cardH + gap;
    return { pad, top, bottom, cardW, cardH, gap, cols, rowH, viewH: h - top - bottom };
  }

  update(dt) {
    this.entranceT += dt;
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);

    // 헤더
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, w, 56);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('rhythmLibrary'), 60, 28);

    // 뒤로 버튼
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, 12, 12, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 28);

    // 진행도 (우측 상단)
    const totalCount = this.app.rhythmLoader.getAllMetadata().length;
    const cleared = UserSkillEstimator.getClearedCount();
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`${cleared} / ${totalCount} ${i18n.t('cleared')}`, w - 16, 28);
    ctx.restore();

    // 필터 바
    if (this.filterBar) this.filterBar.render(ctx);

    // 카드 그리드
    const L = this._gridLayout();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.top - 4, w, L.viewH + 8);
    ctx.clip();

    const rhythmScores = Storage.getRhythmScores();
    const regions = this.app.rhythmLoader.getCategories().regions;

    this.filtered.forEach((r, idx) => {
      const col = idx % L.cols;
      const row = Math.floor(idx / L.cols);
      const x = (w - L.cols * L.cardW - (L.cols - 1) * L.gap) / 2 + col * (L.cardW + L.gap);
      const cardY = L.top + row * L.rowH - this.scroll;
      if (cardY > h + 50 || cardY + L.cardH < L.top - 50) return;

      const entranceDelay = idx * 0.04;
      const localT = clamp((this.entranceT - entranceDelay) / 0.35, 0, 1);
      const ease = easeOutCubic(localT);
      const drawY = cardY + (1 - ease) * 30;
      const alpha = ease;

      const region = regions.find(rg => rg.id === r.region) || null;
      const progress = rhythmScores[r.id] ? {
        played: rhythmScores[r.id].playCount,
        grade: rhythmScores[r.id].bestGrade,
        fullCombo: rhythmScores[r.id].fullCombo,
        mastered: rhythmScores[r.id].mastered
      } : {};

      ctx.save();
      ctx.globalAlpha = alpha;
      RhythmCard.render(ctx, x, drawY, L.cardW, L.cardH, r, progress, {
        hovered: this.hoveredIdx === idx,
        focused: this.focusedIdx === idx,
        region,
        lang: i18n.getLang()
      });
      ctx.restore();
    });

    if (this.filtered.length === 0) {
      ctx.fillStyle = T.text.secondary;
      ctx.textAlign = 'center';
      ctx.font = '18px sans-serif';
      ctx.fillText('조건에 맞는 리듬이 없습니다', w / 2, h / 2);
    }
    ctx.restore();

    // 필터바 드롭다운 오버레이 (카드 위에)
    if (this.filterBar) this.filterBar.renderOverlay(ctx);

    // 하단 추천
    if (this.recommended) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, h - 60, w, 60);
      ctx.fillStyle = '#FFD93D';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const name = this.recommended.name[i18n.getLang()] || this.recommended.name.ko;
      ctx.fillText(`${i18n.t('recommendedNext')} → ${name} (★${this.recommended.stars})`, w / 2, h - 30);
      ctx.restore();
    }
  }

  handleInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('title'); return; }
      if (evt.code === 'Enter') {
        if (this.filtered[this.focusedIdx]) this._selectRhythm(this.filtered[this.focusedIdx]);
        return;
      }
      const L = this._gridLayout();
      if (evt.code === 'ArrowLeft') this.focusedIdx = Math.max(0, this.focusedIdx - 1);
      else if (evt.code === 'ArrowRight') this.focusedIdx = Math.min(this.filtered.length - 1, this.focusedIdx + 1);
      else if (evt.code === 'ArrowUp') this.focusedIdx = Math.max(0, this.focusedIdx - L.cols);
      else if (evt.code === 'ArrowDown') this.focusedIdx = Math.min(this.filtered.length - 1, this.focusedIdx + L.cols);
      else if (evt.code === 'Home') this.focusedIdx = 0;
      else if (evt.code === 'End') this.focusedIdx = this.filtered.length - 1;
      this._ensureFocusVisible();
      return;
    }
    if (evt.type === 'wheel') {
      this._scrollBy(evt.dy);
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      this._handleClick(evt.x, evt.y);
    }
  }

  _scrollBy(dy) {
    const L = this._gridLayout();
    const rows = Math.ceil(this.filtered.length / L.cols);
    const maxScroll = Math.max(0, rows * L.rowH - L.viewH);
    this.targetScroll = clamp(this.targetScroll + dy, 0, maxScroll);
  }

  _ensureFocusVisible() {
    const L = this._gridLayout();
    const row = Math.floor(this.focusedIdx / L.cols);
    const cardTop = row * L.rowH;
    const cardBottom = cardTop + L.cardH;
    if (cardTop < this.targetScroll) this.targetScroll = cardTop;
    else if (cardBottom > this.targetScroll + L.viewH) this.targetScroll = cardBottom - L.viewH;
  }

  _handleClick(mx, my) {
    if (mx < 50 && my < 50) { this.manager.goTo('title'); return; }
    if (my < 56) return;
    if (this.filterBar && my < 112) {
      if (this.filterBar.hitTest(mx, my)) return;
    }
    if (this.filterBar && this.filterBar.expandedDropdown) {
      if (this.filterBar.hitTest(mx, my)) return;
    }
    const L = this._gridLayout();
    if (my >= L.top && my <= L.top + L.viewH) {
      const w = this.app.width;
      const gridX = (w - L.cols * L.cardW - (L.cols - 1) * L.gap) / 2;
      const col = Math.floor((mx - gridX) / (L.cardW + L.gap));
      if (col < 0 || col >= L.cols) return;
      const innerX = mx - gridX - col * (L.cardW + L.gap);
      if (innerX < 0 || innerX > L.cardW) return;
      const row = Math.floor((my - L.top + this.scroll) / L.rowH);
      const innerY = (my - L.top + this.scroll) - row * L.rowH;
      if (innerY < 0 || innerY > L.cardH) return;
      const idx = row * L.cols + col;
      if (idx >= 0 && idx < this.filtered.length) {
        this._selectRhythm(this.filtered[idx]);
      }
    }
  }

  async _selectRhythm(rhythm) {
    if (!rhythm.unlocked) return;
    this.manager.goTo('rhythmDetail', { rhythmId: rhythm.id });
  }
}

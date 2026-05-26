/**
 * RhythmDetailScene.js - 리듬 상세 화면
 *   - 좌측: 헤로 일러스트 + 통계
 *   - 우측: 문화 정보 (요약/사용 맥락/마스터/팁)
 *   - 하단: 패턴 시각화 + 미리듣기/루프
 *   - 최하단: 변주 선택 + 도전/루프/학습 액션 버튼
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { RhythmPatternViz } from '../ui/components/RhythmPatternViz.js';
import { StarRating } from '../ui/components/StarRating.js';
import { TierBadge } from '../ui/components/TierBadge.js';
import { RhythmPlayer } from '../audio/RhythmPlayer.js';
import { clamp, easeOutCubic } from '../utils/MathUtils.js';

export class RhythmDetailScene extends Scene {
  constructor(app) {
    super(app);
    this.rhythmId = null;
    this.rhythm = null;
    this.meta = null;
    this.region = null;
    this.selectedVariationIdx = 0;
    this.viz = null;
    this.player = null;
    this.loopMode = false;
    this.entranceT = 0;
    this.scrollY = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
    this.uiButtons = [];
    this.variationButtons = [];
    this.previewButtons = [];
  }

  async onEnter(data) {
    this.rhythmId = data?.rhythmId;
    this.entranceT = 0;
    this.scrollY = 0;
    this.targetScroll = 0;
    this.selectedVariationIdx = 0;
    this.loopMode = false;
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
    this.rhythm = await this.app.rhythmLoader.loadRhythm(this.rhythmId);
    this.meta = this.app.rhythmLoader.getMetadata(this.rhythmId);
    this.region = this.app.rhythmLoader.getRegion(this.meta?.region);
    if (!this.player) this.player = new RhythmPlayer(this.app.audioEngine, this.app.sampleBank);
    this._buildViz();
    this._buildButtons();
  }

  onExit() {
    if (this.player) this.player.stop();
  }

  _currentVariation() {
    if (!this.rhythm || !this.rhythm.variations) return null;
    return this.rhythm.variations[this.selectedVariationIdx] || this.rhythm.variations[0];
  }

  _currentPattern() {
    if (!this.rhythm) return null;
    const v = this._currentVariation();
    if (!v) return this.rhythm.pattern;
    if (v.patternRef === 'default') return this.rhythm.pattern;
    if (v.notes) return { lengthInBeats: this.rhythm.pattern?.lengthInBeats || 4, notes: v.notes };
    return this.rhythm.pattern;
  }

  _buildViz() {
    const pat = this._currentPattern();
    if (!pat) { this.viz = null; return; }
    this.viz = new RhythmPatternViz(pat, { subdivisions: this.rhythm.subdivisions || 4 });
  }

  _buildButtons() {
    if (!this.rhythm) return;
    const w = this.app.width;
    const isMobile = w < 700;

    // Variation buttons (set below pattern viz)
    const variations = this.rhythm.variations || [];
    const varBtnH = 32;
    const varBtnGap = 8;
    this.variationButtons = variations.map((v, i) => ({
      kind: 'variation',
      idx: i,
      label: `${v.name?.[i18n.getLang()] || v.name?.ko || v.id} (★${v.stars})`,
      h: varBtnH
    }));

    // Preview buttons
    this.previewButtons = [
      { kind: 'preview', mode: 'once', label: i18n.t('preview') },
      { kind: 'preview', mode: 'loop', label: i18n.t('previewLoop') },
      { kind: 'preview', mode: 'stop', label: i18n.t('stopPreview') }
    ];

    // Action buttons (challenge / loop practice / step-learn)
    this.uiButtons = [
      {
        kind: 'action', key: 'challenge',
        label: i18n.t('challengeMode'),
        onClick: () => this._launchChallenge(),
        bg: '#FF6B6B'
      },
      {
        kind: 'action', key: 'loop',
        label: i18n.t('loopPractice'),
        onClick: () => this.manager.goTo('rhythmLoop', { rhythmId: this.rhythmId, variationIdx: this.selectedVariationIdx }),
        bg: '#4ECDC4'
      },
      {
        kind: 'action', key: 'learn',
        label: i18n.t('stepLearn'),
        onClick: () => this.manager.goTo('rhythmLearn', { rhythmId: this.rhythmId, variationIdx: this.selectedVariationIdx }),
        bg: '#FFD93D',
        color: '#222'
      }
    ];
  }

  _launchChallenge() {
    const v = this._currentVariation();
    this.manager.goTo('countdown', {
      mode: 'rhythm_challenge',
      rhythmId: this.rhythmId,
      variationId: v?.id || null,
      variationIdx: this.selectedVariationIdx,
      bpm: this.rhythm.baseBpm,
      difficulty: this.rhythm.tier === 'beginner' ? 'easy' : this.rhythm.tier === 'intermediate' ? 'normal' : 'hard',
      songId: this.rhythmId
    });
  }

  onResize() { this._buildButtons(); }

  update(dt) {
    this.entranceT += dt;
    this.scrollY += (this.targetScroll - this.scrollY) * Math.min(1, dt * 12);
    if (this.player && this.player.playing && this.viz) {
      this.viz.setProgress(this.player.getCurrentStepFloat());
    } else if (this.viz) {
      this.viz.setProgress(-1);
    }
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    if (!this.rhythm || !this.meta) {
      ctx.fillStyle = T.text.primary;
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i18n.t('loading'), w / 2, h / 2);
      return;
    }
    const isMobile = w < 700;

    // 헤더 바
    this._renderHeader(ctx, w);

    // 콘텐츠 (스크롤 가능 영역) — 헤더 아래
    const contentTop = 60;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, contentTop, w, h - contentTop - 90); // 하단 액션바 공간 확보
    ctx.clip();
    ctx.translate(0, -this.scrollY);

    const animY = (1 - Math.min(1, this.entranceT * 3)) * 20;
    ctx.translate(0, animY);

    if (isMobile) {
      this._renderMobileLayout(ctx, w, contentTop);
    } else {
      this._renderDesktopLayout(ctx, w, contentTop);
    }

    ctx.restore();

    // 하단 액션 바 (고정)
    this._renderActionBar(ctx, w, h);
  }

  _renderHeader(ctx, w) {
    const T = Theme.current;
    ctx.save();
    const bgColor = this.region?.color || T.primary;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, bgColor + '88');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 60);

    // 뒤로 버튼
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this._roundRect(ctx, 12, 14, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 30);

    const lang = i18n.getLang();
    const name = this.rhythm.name?.[lang] || this.rhythm.name?.ko || this.rhythmId;
    const altName = lang === 'ko' ? (this.rhythm.name?.en || '') : '';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 60, 22);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (altName) ctx.fillText(`(${altName})`, 60, 44);

    // 우측: 별점 + tier
    const starsX = w - 240;
    StarRating.render(ctx, starsX, 22, { stars: this.rhythm.stars || this.meta.stars || 1, size: 'sm', showNumber: true });
    const tierW = TierBadge.measureWidth(ctx, this.meta.tier, lang, { size: 'sm' });
    TierBadge.render(ctx, w - tierW - 12, 16, this.meta.tier, lang, { size: 'sm' });

    ctx.restore();
  }

  _renderDesktopLayout(ctx, w, top) {
    const lang = i18n.getLang();
    const pad = 24;
    const splitX = w * 0.45;
    let y = top + 16;

    // ─── 좌측: 헤로 + 통계 ──────────────────────────
    this._renderHero(ctx, pad, y, splitX - pad * 1.5, lang);
    this._renderStats(ctx, pad, y + 280, splitX - pad * 1.5);

    // ─── 우측: 문화 정보 ──────────────────────────
    this._renderCulturalInfo(ctx, splitX, y, w - splitX - pad, lang);

    // ─── 하단: 패턴 시각화 ─────────────────────────
    const vizY = Math.max(y + 620, y + 580);
    this._renderPatternSection(ctx, pad, vizY, w - pad * 2);
    this.maxScroll = Math.max(0, vizY + 240 - (this.app.height - 90));
  }

  _renderMobileLayout(ctx, w, top) {
    const lang = i18n.getLang();
    const pad = 14;
    let y = top + 12;
    this._renderHero(ctx, pad, y, w - pad * 2, lang);
    y += 280;
    this._renderStats(ctx, pad, y, w - pad * 2);
    y += 160;
    this._renderCulturalInfo(ctx, pad, y, w - pad * 2, lang);
    y += 540;
    this._renderPatternSection(ctx, pad, y, w - pad * 2);
    this.maxScroll = Math.max(0, y + 280 - (this.app.height - 90));
  }

  _renderHero(ctx, x, y, w, lang) {
    const T = Theme.current;
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x, y + 260);
    const baseColor = this.region?.color || T.primary;
    grad.addColorStop(0, baseColor + 'CC');
    grad.addColorStop(1, baseColor + '44');
    ctx.fillStyle = grad;
    this._roundRect(ctx, x, y, w, 260, 14);
    ctx.fill();

    // 일러스트 (젬베 이미지 활용)
    const img = this.app.assetLoader.getImage('djembe-realistic') || this.app.assetLoader.getImage('djembe-main');
    if (img) {
      const size = 160;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, x + w / 2 - size / 2, y + 30, size, size);
      ctx.restore();
    }

    // 메타 정보 (이미지 하단)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#fff';
    const region = this.region;
    const purposes = (this.meta.purposes || []).map(p => {
      const pObj = this.app.rhythmLoader.getPurpose(p);
      return pObj ? `${pObj.icon} ${pObj.name[lang] || pObj.name.ko}` : '';
    }).join('  ');
    ctx.fillText(`${region?.flag || ''} ${region?.name?.[lang] || region?.name?.ko || ''}`, x + w / 2, y + 210);
    ctx.fillText(purposes, x + w / 2, y + 230);
    ctx.fillText(`♩ BPM ${this.rhythm.baseBpm} (${this.rhythm.bpmRange?.min}-${this.rhythm.bpmRange?.max})`, x + w / 2, y + 248);
    ctx.restore();
  }

  _renderStats(ctx, x, y, w) {
    const T = Theme.current;
    const score = Storage.getRhythmScore(this.rhythmId);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this._roundRect(ctx, x, y, w, 140, 12);
    ctx.fill();

    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`📊 ${i18n.t('rhythmStats')}`, x + 14, y + 12);

    if (!score) {
      ctx.fillStyle = T.text.secondary;
      ctx.font = '13px sans-serif';
      ctx.fillText(i18n.t('notPlayed'), x + 14, y + 50);
      ctx.restore();
      return;
    }

    const items = [
      { label: i18n.t('highScore'), value: score.highScore?.toLocaleString() || '0' },
      { label: i18n.t('bestGrade'), value: score.bestGrade || 'D' },
      { label: i18n.t('playCount'), value: score.playCount || 0 },
      { label: i18n.t('accuracy'), value: `${(score.avgAccuracy * 100).toFixed(1)}%` },
      { label: i18n.t('maxBpmReached'), value: score.maxBpm || '-' },
      { label: i18n.t('fullCombo2'), value: score.fullCombo ? '✓' : '—' }
    ];
    ctx.font = '12px sans-serif';
    items.forEach((it, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const itemX = x + 14 + col * (w / 2 - 14);
      const itemY = y + 40 + row * 28;
      ctx.fillStyle = T.text.secondary;
      ctx.fillText(it.label, itemX, itemY);
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(String(it.value), itemX + 90, itemY);
      ctx.font = '12px sans-serif';
    });

    if (score.mastered) {
      ctx.fillStyle = '#9C27B0';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('👑 MASTER', x + w - 14, y + 12);
    }
    ctx.restore();
  }

  _renderCulturalInfo(ctx, x, y, w, lang) {
    const T = Theme.current;
    const cul = this.rhythm.culturalInfo?.[lang] || this.rhythm.culturalInfo?.ko || {};
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    this._roundRect(ctx, x, y, w, 520, 12);
    ctx.fill();

    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let cy = y + 16;
    ctx.fillText(i18n.t('culturalBackground'), x + 14, cy);
    cy += 26;

    const renderSection = (heading, body) => {
      if (!body) return;
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(heading, x + 14, cy);
      cy += 20;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12.5px sans-serif';
      cy = this._wrapText(ctx, String(body), x + 14, cy, w - 28, 17);
      cy += 14;
    };

    renderSection('📜 ' + i18n.t('history'), cul.summary);
    renderSection('🎭 ' + i18n.t('occasion'), cul.occasion);
    renderSection('💃 ' + i18n.t('danceStyle'), cul.dance);
    if (cul.history && cul.history !== cul.summary) renderSection('📖 ' + (lang === 'ko' ? '자세히' : 'Details'), cul.history);
    if (Array.isArray(cul.famousArtists) && cul.famousArtists.length) {
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(i18n.t('famousArtists'), x + 14, cy);
      cy += 20;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12.5px sans-serif';
      cy = this._wrapText(ctx, cul.famousArtists.join(', '), x + 14, cy, w - 28, 17);
      cy += 10;
    }

    // 팁
    const tips = this.rhythm.tips?.[lang] || this.rhythm.tips?.ko || [];
    if (tips.length) {
      ctx.fillStyle = '#76FF03';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(i18n.t('tips'), x + 14, cy);
      cy += 20;
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12.5px sans-serif';
      tips.forEach(t => {
        cy = this._wrapText(ctx, '• ' + t, x + 14, cy, w - 28, 17);
        cy += 4;
      });
    }
    ctx.restore();
  }

  _renderPatternSection(ctx, x, y, w) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this._roundRect(ctx, x, y, w, 250, 12);
    ctx.fill();

    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(i18n.t('patternViz'), x + 14, y + 12);

    const vizH = 110;
    if (this.viz) this.viz.render(ctx, x + 14, y + 40, w - 28, vizH);

    // 변주 버튼들
    let bx = x + 14;
    const by = y + 40 + vizH + 16;
    ctx.font = '12px sans-serif';
    this.variationButtons.forEach((vb, i) => {
      const isSelected = i === this.selectedVariationIdx;
      const labelW = ctx.measureText(vb.label).width + 22;
      vb.x = bx; vb.y = by; vb.w = labelW;
      ctx.fillStyle = isSelected ? '#FF6B6B' : 'rgba(255,255,255,0.1)';
      this._roundRect(ctx, vb.x, vb.y, vb.w, vb.h, 8);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.2)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vb.label, vb.x + vb.w / 2, vb.y + vb.h / 2);
      bx += labelW + 8;
    });

    // 미리듣기 버튼들
    let pbx = x + 14;
    const pby = by + 44;
    this.previewButtons.forEach(pb => {
      const labelW = ctx.measureText(pb.label).width + 24;
      pb.x = pbx; pb.y = pby; pb.w = labelW; pb.h = 30;
      const active = (pb.mode === 'loop' && this.loopMode && this.player.playing) ||
                     (pb.mode === 'once' && !this.loopMode && this.player.playing);
      ctx.fillStyle = active ? '#4ECDC4' : 'rgba(255,255,255,0.12)';
      this._roundRect(ctx, pb.x, pb.y, pb.w, pb.h, 6);
      ctx.fill();
      ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pb.label, pb.x + pb.w / 2, pb.y + pb.h / 2);
      pbx += labelW + 8;
    });

    ctx.restore();
  }

  _renderActionBar(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, h - 80, w, 80);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, h - 80);
    ctx.lineTo(w, h - 80);
    ctx.stroke();

    const isMobile = w < 700;
    const btnH = isMobile ? 50 : 56;
    const pad = 16;
    const gap = 10;
    const btnW = (w - pad * 2 - gap * 2) / 3;
    const by = h - 80 + (80 - btnH) / 2;

    this.uiButtons.forEach((b, i) => {
      b.x = pad + i * (btnW + gap);
      b.y = by;
      b.w = btnW;
      b.h = btnH;
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      grad.addColorStop(0, b.bg);
      grad.addColorStop(1, this._darken(b.bg, 0.7));
      ctx.fillStyle = grad;
      ctx.shadowColor = b.bg;
      ctx.shadowBlur = 12;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = b.color || '#fff';
      ctx.font = `bold ${isMobile ? 14 : 17}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    });
    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    if (!text) return y;
    const words = String(text).split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        y += lineH;
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lineH; }
    return y;
  }

  _darken(hex, factor) {
    const c = hex.replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
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

  handleInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') {
        if (this.player) this.player.stop();
        this.manager.goTo('rhythmLibrary');
        return;
      }
      if (evt.code === 'Enter') { this._launchChallenge(); return; }
      if (evt.code === 'Space') {
        this._togglePreview('once');
        return;
      }
      if (evt.code === 'KeyL') {
        this._togglePreview('loop');
        return;
      }
      if (evt.code === 'ArrowDown') { this.targetScroll = clamp(this.targetScroll + 60, 0, this.maxScroll); return; }
      if (evt.code === 'ArrowUp') { this.targetScroll = clamp(this.targetScroll - 60, 0, this.maxScroll); return; }
      if (evt.code === 'ArrowRight') {
        if (this.rhythm.variations && this.rhythm.variations.length) {
          this.selectedVariationIdx = (this.selectedVariationIdx + 1) % this.rhythm.variations.length;
          this._buildViz();
          if (this.player.playing) {
            const wasLoop = this.loopMode;
            this.player.stop();
            this._togglePreview(wasLoop ? 'loop' : 'once');
          }
        }
        return;
      }
      if (evt.code === 'ArrowLeft') {
        if (this.rhythm.variations && this.rhythm.variations.length) {
          this.selectedVariationIdx = (this.selectedVariationIdx - 1 + this.rhythm.variations.length) % this.rhythm.variations.length;
          this._buildViz();
        }
        return;
      }
    }
    if (evt.type === 'wheel') {
      this.targetScroll = clamp(this.targetScroll + evt.dy, 0, this.maxScroll);
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      this._handleClick(evt.x, evt.y);
    }
  }

  _handleClick(mx, my) {
    // Back
    if (mx < 50 && my < 50) {
      if (this.player) this.player.stop();
      this.manager.goTo('rhythmLibrary');
      return;
    }
    // Action bar (fixed at bottom)
    for (const b of this.uiButtons) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        b.onClick();
        return;
      }
    }
    // Variation + preview buttons are inside the scrollable content area
    const adjMy = my - 60 + this.scrollY;
    const realMy = my;
    // Use actual rendered positions (already in real screen coords minus scroll)
    const scrollOffset = -this.scrollY;
    for (const v of this.variationButtons) {
      if (v.x == null) continue;
      const yy = v.y + scrollOffset;
      if (mx >= v.x && mx <= v.x + v.w && realMy >= yy && realMy <= yy + v.h) {
        this.selectedVariationIdx = v.idx;
        this._buildViz();
        if (this.player.playing) {
          const wasLoop = this.loopMode;
          this.player.stop();
          this._togglePreview(wasLoop ? 'loop' : 'once');
        }
        return;
      }
    }
    for (const p of this.previewButtons) {
      if (p.x == null) continue;
      const yy = p.y + scrollOffset;
      if (mx >= p.x && mx <= p.x + p.w && realMy >= yy && realMy <= yy + p.h) {
        this._togglePreview(p.mode);
        return;
      }
    }
  }

  _togglePreview(mode) {
    if (!this.player) return;
    const pat = this._currentPattern();
    if (!pat) return;
    if (mode === 'stop') { this.player.stop(); this.loopMode = false; return; }
    if (this.player.playing && ((mode === 'loop' && this.loopMode) || (mode === 'once' && !this.loopMode))) {
      this.player.stop();
      this.loopMode = false;
      return;
    }
    this.player.stop();
    this.loopMode = (mode === 'loop');
    this.player.start(pat, { bpm: this.rhythm.baseBpm, subdivisions: this.rhythm.subdivisions || 4, loop: this.loopMode, metronome: false });
  }
}

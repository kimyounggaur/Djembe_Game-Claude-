/**
 * RhythmEncyclopediaScene.js - 백과사전 (좌측 사이드바 + 우측 본문)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { clamp } from '../utils/MathUtils.js';

export class RhythmEncyclopediaScene extends Scene {
  constructor(app) {
    super(app);
    this.index = null;
    this.sectionsCache = new Map();
    this.currentSectionId = 'intro';
    this.currentSection = null;
    this.scroll = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
    this.sidebarHover = -1;
    this.sidebarFocus = 0;
    this.contentHeight = 0;
  }

  async onEnter(data) {
    this.scroll = 0;
    this.targetScroll = 0;
    if (!this.index) await this._loadIndex();
    const startId = data?.sectionId || 'intro';
    await this._loadSection(startId);
  }

  async _loadIndex() {
    try {
      const res = await fetch('assets/encyclopedia/index.json');
      this.index = await res.json();
    } catch (e) {
      console.error('encyclopedia index load failed', e);
      this.index = { sections: [], masters: [] };
    }
  }

  async _loadSection(id) {
    this.currentSectionId = id;
    this.sidebarFocus = (this.index?.sections || []).findIndex(s => s.id === id);
    if (this.sectionsCache.has(id)) {
      this.currentSection = this.sectionsCache.get(id);
      Storage.markEncyclopediaRead(id);
      this.scroll = 0;
      this.targetScroll = 0;
      return;
    }
    try {
      const res = await fetch(`assets/encyclopedia/sections/${id}.json`);
      const data = await res.json();
      this.sectionsCache.set(id, data);
      this.currentSection = data;
      Storage.markEncyclopediaRead(id);
      this.scroll = 0;
      this.targetScroll = 0;
    } catch (e) {
      console.error(`section ${id} load failed`, e);
      this.currentSection = null;
    }
  }

  update(dt) {
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    this._renderHeader(ctx, w);
    this._renderSidebar(ctx, w, h);
    this._renderContent(ctx, w, h);
  }

  _renderHeader(ctx, w) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, 56);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this._roundRect(ctx, 12, 12, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('←', 30, 28);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📚 ' + i18n.t('rhythmEncyclopedia'), 60, 28);

    const read = Storage.getEncyclopediaRead();
    const total = (this.index?.sections || []).length;
    const readCount = (this.index?.sections || []).filter(s => read[s.id]).length;
    ctx.textAlign = 'right';
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`📖 ${readCount} / ${total}`, w - 14, 28);
    ctx.restore();
  }

  _renderSidebar(ctx, w, h) {
    const T = Theme.current;
    const isMobile = w < 700;
    if (isMobile) return; // mobile uses overlay nav (not implemented in this stub)
    const sidebarW = 220;
    const top = 60;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, top, sidebarW, h - top);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(sidebarW, top);
    ctx.lineTo(sidebarW, h);
    ctx.stroke();

    ctx.fillStyle = T.text.tertiary;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('encyclopediaTOC'), 16, top + 20);

    const sections = this.index?.sections || [];
    const read = Storage.getEncyclopediaRead();
    this.sidebarItems = [];
    sections.forEach((s, i) => {
      const y = top + 44 + i * 38;
      const isActive = s.id === this.currentSectionId;
      const isRead = !!read[s.id];
      const x = 12;
      const w_ = sidebarW - 24;
      this.sidebarItems.push({ x, y: y - 16, w: w_, h: 32, id: s.id });

      if (isActive) {
        ctx.fillStyle = 'rgba(255,107,107,0.2)';
        this._roundRect(ctx, x, y - 16, w_, 32, 6);
        ctx.fill();
        ctx.strokeStyle = '#FF6B6B';
        ctx.stroke();
      } else if (this.sidebarHover === i) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        this._roundRect(ctx, x, y - 16, w_, 32, 6);
        ctx.fill();
      }

      ctx.fillStyle = isActive ? '#fff' : (isRead ? T.text.secondary : T.text.primary);
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const icon = s.icon || '•';
      const title = s.title?.[i18n.getLang()] || s.title?.ko || s.id;
      ctx.fillText(`${icon}  ${title}`, x + 12, y);
      if (isRead) {
        ctx.fillStyle = '#76FF03';
        ctx.textAlign = 'right';
        ctx.fillText('✓', x + w_ - 8, y);
      }
    });
    ctx.restore();
  }

  _renderContent(ctx, w, h) {
    const T = Theme.current;
    const isMobile = w < 700;
    const sidebarW = isMobile ? 0 : 220;
    const contentTop = 60;
    const contentX = sidebarW + 24;
    const contentW = w - sidebarW - 48;

    ctx.save();
    ctx.beginPath();
    ctx.rect(sidebarW, contentTop, w - sidebarW, h - contentTop);
    ctx.clip();
    ctx.translate(0, -this.scroll);

    if (!this.currentSection) {
      ctx.fillStyle = T.text.secondary;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i18n.t('loading'), w / 2, h / 2);
      ctx.restore();
      return;
    }

    let y = contentTop + 24;
    const lang = i18n.getLang();
    const sec = this.currentSection;

    // 큰 제목
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${sec.icon || ''} ${sec.title?.[lang] || sec.title?.ko || sec.id}`, contentX, y);
    y += 50;

    // 본문 섹션들 (heading/paragraph/list/quote)
    for (const block of (sec.sections || [])) {
      if (block.type === 'heading') {
        y += 16;
        ctx.fillStyle = '#FFD93D';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(block.text?.[lang] || block.text?.ko || '', contentX, y);
        y += 32;
      } else if (block.type === 'paragraph') {
        ctx.fillStyle = T.text.secondary;
        ctx.font = '14.5px sans-serif';
        y = this._wrapText(ctx, block.text?.[lang] || block.text?.ko || '', contentX, y, contentW, 22);
        y += 12;
      } else if (block.type === 'list') {
        ctx.fillStyle = T.text.secondary;
        ctx.font = '14px sans-serif';
        for (const item of (block.items || [])) {
          y = this._wrapText(ctx, '• ' + (item[lang] || item.ko || ''), contentX, y, contentW, 22);
          y += 6;
        }
        y += 10;
      } else if (block.type === 'quote') {
        y += 8;
        ctx.fillStyle = 'rgba(255,217,61,0.15)';
        ctx.strokeStyle = '#FFD93D';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(contentX, y);
        ctx.lineTo(contentX, y + 80);
        ctx.stroke();
        ctx.fillStyle = T.text.primary;
        ctx.font = 'italic 16px serif';
        const q = this._wrapText(ctx, '"' + (block.text?.[lang] || block.text?.ko || '') + '"', contentX + 14, y + 6, contentW - 28, 24);
        if (block.author) {
          ctx.font = '13px sans-serif';
          ctx.fillStyle = T.text.tertiary;
          ctx.textAlign = 'right';
          ctx.fillText('— ' + block.author, contentX + contentW - 14, q + 6);
          ctx.textAlign = 'left';
          y = q + 30;
        } else {
          y = q + 14;
        }
      }
    }

    // 용어 사전 (glossary)는 별도 처리
    if (sec.terms && Array.isArray(sec.terms)) {
      for (const t of sec.terms) {
        ctx.fillStyle = '#FFD93D';
        ctx.font = 'bold 17px sans-serif';
        ctx.fillText(t.term, contentX, y);
        if (t.pronunciation) {
          ctx.fillStyle = T.text.tertiary;
          ctx.font = '13px sans-serif';
          ctx.fillText(`  [${t.pronunciation}]`, contentX + ctx.measureText(t.term).width + 4, y + 2);
        }
        y += 24;
        ctx.fillStyle = T.text.secondary;
        ctx.font = '14px sans-serif';
        y = this._wrapText(ctx, t.definition?.[lang] || t.definition?.ko || '', contentX + 12, y, contentW - 12, 20);
        y += 14;
      }
    }

    // 관련 리듬 링크
    if (sec.relatedRhythms && sec.relatedRhythms.length) {
      y += 20;
      ctx.fillStyle = '#76FF03';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(i18n.t('relatedRhythms'), contentX, y);
      y += 24;
      const all = this.app.rhythmLoader.getAllMetadata();
      let lx = contentX;
      this.relatedLinks = [];
      ctx.font = '13px sans-serif';
      for (const rid of sec.relatedRhythms) {
        const r = all.find(x => x.id === rid);
        if (!r) continue;
        const name = r.name?.[lang] || r.name?.ko || rid;
        const tw = ctx.measureText(name).width + 20;
        ctx.fillStyle = 'rgba(118,255,3,0.15)';
        this._roundRect(ctx, lx, y, tw, 28, 14);
        ctx.fill();
        ctx.strokeStyle = '#76FF03';
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, lx + tw / 2, y + 14);
        ctx.textAlign = 'left';
        this.relatedLinks.push({ x: lx, y, w: tw, h: 28, id: rid });
        lx += tw + 10;
        if (lx > contentX + contentW - 100) { lx = contentX; y += 36; }
      }
      y += 36;
    }

    // 이전/다음 섹션
    if (sec.nextSectionId) {
      y += 30;
      ctx.fillStyle = '#FF6B6B';
      this._roundRect(ctx, contentX, y, 200, 40, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('다음 →', contentX + 100, y + 20);
      this.nextLink = { x: contentX, y, w: 200, h: 40, id: sec.nextSectionId };
      y += 60;
    } else {
      this.nextLink = null;
    }

    this.contentHeight = y;
    this.maxScroll = Math.max(0, this.contentHeight - h + 40);
    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    if (!text) return y;
    const lines = String(text).split(/\n/);
    for (const line of lines) {
      const words = line.split(/\s+/);
      let cur = '';
      for (let i = 0; i < words.length; i++) {
        const test = cur ? cur + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && cur) {
          ctx.fillText(cur, x, y);
          y += lineH;
          cur = words[i];
        } else {
          cur = test;
        }
      }
      if (cur) { ctx.fillText(cur, x, y); y += lineH; }
    }
    return y;
  }

  handleInput(evt) {
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('rhythmLibrary'); return; }
      if (evt.code === 'ArrowDown') { this.targetScroll = clamp(this.targetScroll + 60, 0, this.maxScroll); return; }
      if (evt.code === 'ArrowUp') { this.targetScroll = clamp(this.targetScroll - 60, 0, this.maxScroll); return; }
      if (evt.code === 'PageDown') { this.targetScroll = clamp(this.targetScroll + 300, 0, this.maxScroll); return; }
      if (evt.code === 'PageUp') { this.targetScroll = clamp(this.targetScroll - 300, 0, this.maxScroll); return; }
      // 좌/우로 섹션 이동
      if (evt.code === 'ArrowLeft' || evt.code === 'ArrowRight') {
        const sections = this.index?.sections || [];
        const idx = sections.findIndex(s => s.id === this.currentSectionId);
        if (idx < 0) return;
        const nextIdx = evt.code === 'ArrowRight' ? (idx + 1) % sections.length : (idx - 1 + sections.length) % sections.length;
        this._loadSection(sections[nextIdx].id);
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
    if (mx < 50 && my < 50) { this.manager.goTo('rhythmLibrary'); return; }
    if (this.sidebarItems) {
      for (const it of this.sidebarItems) {
        if (mx >= it.x && mx <= it.x + it.w && my >= it.y && my <= it.y + it.h) {
          this._loadSection(it.id);
          return;
        }
      }
    }
    // 본문 영역 클릭은 스크롤 보정
    const adj = my + this.scroll;
    if (this.relatedLinks) {
      for (const l of this.relatedLinks) {
        if (mx >= l.x && mx <= l.x + l.w && adj >= l.y && adj <= l.y + l.h) {
          this.manager.goTo('rhythmDetail', { rhythmId: l.id });
          return;
        }
      }
    }
    if (this.nextLink) {
      const l = this.nextLink;
      if (mx >= l.x && mx <= l.x + l.w && adj >= l.y && adj <= l.y + l.h) {
        this._loadSection(l.id);
        return;
      }
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

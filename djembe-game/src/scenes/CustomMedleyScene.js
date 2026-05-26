/**
 * CustomMedleyScene.js - 사용자가 직접 메들리를 만드는 빌더
 *   - 리듬 추가/제거/순서 변경
 *   - 각 단계의 BPM + 마디 수 조정
 *   - 저장 / 플레이 / 공유
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { i18n } from '../utils/i18n.js';
import { Storage } from '../utils/Storage.js';
import { clamp } from '../utils/MathUtils.js';

export class CustomMedleyScene extends Scene {
  constructor(app) {
    super(app);
    this.medley = null;
    this.scroll = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
    this.uiButtons = [];
    this.editingIdx = -1;
    this.showRhythmPicker = false;
    this.pickerScroll = 0;
    this.transition = 'smooth';
  }

  async onEnter(data) {
    if (!this.app.rhythmLoader.library) await this.app.rhythmLoader.loadLibrary();
    this.medley = data?.medley ? JSON.parse(JSON.stringify(data.medley)) : this._newMedley();
    this.scroll = 0;
    this.targetScroll = 0;
    this.editingIdx = -1;
    this.showRhythmPicker = false;
  }

  _newMedley() {
    return {
      id: 'custom_' + Date.now(),
      name: { ko: '나만의 메들리', en: 'My Medley' },
      description: { ko: '직접 만든 메들리', en: 'Custom-made medley' },
      difficulty: 5,
      transitions: 'smooth',
      sequence: [],
      createdAt: Date.now()
    };
  }

  update(dt) {
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    this._renderHeader(ctx, w);
    if (this.showRhythmPicker) {
      this._renderRhythmPicker(ctx, w, h);
    } else {
      this._renderSequence(ctx, w, h);
      this._renderFooter(ctx, w, h);
    }
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
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎨 ' + i18n.t('customMedley'), 60, 30);

    // 총 길이 / 마디 수
    const seq = this.medley?.sequence || [];
    const totalBars = seq.reduce((a, b) => a + (b.bars || 0), 0);
    const totalSec = seq.reduce((a, b) => a + ((b.bars || 0) * 4 * 60 / (b.bpm || 100)), 0);
    ctx.textAlign = 'right';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = T.text.secondary;
    ctx.fillText(`${seq.length} rhythms • ${totalBars} bars • ~${Math.floor(totalSec)}s`, w - 14, 30);
    ctx.restore();
  }

  _renderSequence(ctx, w, h) {
    const T = Theme.current;
    const pad = 16;
    const top = 80;
    const rowH = 70;
    const seq = this.medley.sequence || [];
    const isMobile = w < 700;
    const rowW = w - pad * 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 4, w, h - top - 80);
    ctx.clip();
    ctx.translate(0, -this.scroll);

    this.rowBounds = [];

    seq.forEach((step, idx) => {
      const x = pad;
      const y = top + idx * (rowH + 10);
      const rhythm = this.app.rhythmLoader.getMetadata(step.rhythmId);
      const region = this.app.rhythmLoader.getRegion(rhythm?.region);
      const baseColor = region?.color || '#888';

      const grad = ctx.createLinearGradient(x, y, x, y + rowH);
      grad.addColorStop(0, baseColor + '88');
      grad.addColorStop(1, baseColor + '33');
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, rowW, rowH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();

      // 순서 번호
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), x + 30, y + rowH / 2);

      // 리듬 이름
      const lang = i18n.getLang();
      const name = rhythm ? (rhythm.name?.[lang] || rhythm.name?.ko || step.rhythmId) : step.rhythmId;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name, x + 65, y + rowH / 2 - 12);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`★${rhythm?.stars || 1}  •  ${region?.flag || ''}`, x + 65, y + rowH / 2 + 12);

      // BPM 컨트롤
      const bpmX = x + rowW - 350;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this._roundRect(ctx, bpmX, y + 20, 130, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#FFD93D';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BPM ${step.bpm}`, bpmX + 65, y + 35);
      this.rowBounds.push({
        x: bpmX + 6, y: y + 22, w: 24, h: 26, kind: 'bpm-', idx
      });
      this.rowBounds.push({
        x: bpmX + 100, y: y + 22, w: 24, h: 26, kind: 'bpm+', idx
      });

      // Bars 컨트롤
      const barsX = bpmX + 145;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this._roundRect(ctx, barsX, y + 20, 100, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#76FF03';
      ctx.fillText(`${step.bars} bars`, barsX + 50, y + 35);
      this.rowBounds.push({
        x: barsX + 6, y: y + 22, w: 22, h: 26, kind: 'bars-', idx
      });
      this.rowBounds.push({
        x: barsX + 72, y: y + 22, w: 22, h: 26, kind: 'bars+', idx
      });

      // 위/아래 이동
      const moveX = barsX + 110;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this._roundRect(ctx, moveX, y + 20, 28, 14, 4);
      ctx.fill();
      this._roundRect(ctx, moveX, y + 36, 28, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.fillText('▲', moveX + 14, y + 27);
      ctx.fillText('▼', moveX + 14, y + 43);
      this.rowBounds.push({ x: moveX, y: y + 20, w: 28, h: 14, kind: 'moveUp', idx });
      this.rowBounds.push({ x: moveX, y: y + 36, w: 28, h: 14, kind: 'moveDown', idx });

      // 삭제 버튼
      const delX = moveX + 34;
      ctx.fillStyle = 'rgba(255,23,68,0.3)';
      this._roundRect(ctx, delX, y + 20, 28, 30, 6);
      ctx.fill();
      ctx.strokeStyle = '#FF1744';
      ctx.stroke();
      ctx.fillStyle = '#FF1744';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('×', delX + 14, y + 35);
      this.rowBounds.push({ x: delX, y: y + 20, w: 28, h: 30, kind: 'delete', idx });
    });

    // "+ 리듬 추가" 버튼
    const addY = top + seq.length * (rowH + 10);
    const addX = pad;
    ctx.fillStyle = 'rgba(76,255,3,0.15)';
    this._roundRect(ctx, addX, addY, rowW, 56, 10);
    ctx.fill();
    ctx.strokeStyle = '#76FF03';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#76FF03';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+ 리듬 추가', w / 2, addY + 28);
    this.addRhythmBtn = { x: addX, y: addY, w: rowW, h: 56 };

    this.maxScroll = Math.max(0, addY + 70 - (h - 80));
    ctx.restore();
  }

  _renderFooter(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, h - 70, w, 70);

    // Transition 선택
    const transitions = ['smooth', 'break', 'accelerate'];
    const labels = { smooth: '🌊 매끄럽게', break: '✋ 1마디 휴식', accelerate: '⚡ 점진 가속' };
    let tx = 16;
    this.transitionBtns = [];
    transitions.forEach(t => {
      const lbl = labels[t];
      const active = (this.medley?.transitions || 'smooth') === t;
      ctx.font = '12px sans-serif';
      const tw = ctx.measureText(lbl).width + 18;
      ctx.fillStyle = active ? '#4ECDC4' : 'rgba(255,255,255,0.15)';
      this._roundRect(ctx, tx, h - 56, tw, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, tx + tw / 2, h - 42);
      this.transitionBtns.push({ x: tx, y: h - 56, w: tw, h: 28, value: t });
      tx += tw + 8;
    });

    // 저장 / 플레이 / 삭제 버튼
    const seq = this.medley?.sequence || [];
    const canPlay = seq.length >= 2;
    const btnY = h - 24;
    const btnTopY = h - 56;
    const btnH = 30;
    const btnGap = 8;
    const saveBtn = { kind: 'save', label: '💾 저장', x: w - 320, y: btnTopY, w: 90, h: btnH, bg: '#FFD93D', color: '#222' };
    const playBtn = { kind: 'play', label: '🎯 플레이', x: w - 220, y: btnTopY, w: 100, h: btnH, bg: canPlay ? '#FF6B6B' : 'rgba(255,107,107,0.3)', color: '#fff' };
    const delBtn = { kind: 'deleteMedley', label: '🗑', x: w - 110, y: btnTopY, w: 40, h: btnH, bg: 'rgba(255,23,68,0.2)', color: '#FF1744' };
    this.footerBtns = [saveBtn, playBtn, delBtn];
    for (const b of this.footerBtns) {
      ctx.fillStyle = b.bg;
      this._roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    ctx.restore();
  }

  _renderRhythmPicker(ctx, w, h) {
    const T = Theme.current;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 60, w, h - 60);
    ctx.fillStyle = T.text.primary;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('리듬 선택', w / 2, 90);

    const all = this.app.rhythmLoader.getAllMetadata();
    const cols = 4;
    const cardW = 200;
    const cardH = 80;
    const gap = 12;
    const top = 130;
    const gridStart = (w - cols * cardW - (cols - 1) * gap) / 2;

    ctx.beginPath();
    ctx.rect(0, top - 4, w, h - top - 60);
    ctx.clip();
    ctx.translate(0, -this.pickerScroll);

    this.pickerCards = [];
    all.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gridStart + col * (cardW + gap);
      const y = top + row * (cardH + gap);
      const region = this.app.rhythmLoader.getRegion(r.region);
      const grad = ctx.createLinearGradient(x, y, x, y + cardH);
      grad.addColorStop(0, (region?.color || '#888') + 'AA');
      grad.addColorStop(1, (region?.color || '#888') + '44');
      ctx.fillStyle = grad;
      this._roundRect(ctx, x, y, cardW, cardH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.stroke();
      const lang = i18n.getLang();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.name?.[lang] || r.name?.ko || r.id, x + cardW / 2, y + 26);
      ctx.font = '11px sans-serif';
      ctx.fillText(`★${r.stars}  •  BPM ${r.baseBpm}`, x + cardW / 2, y + 56);
      this.pickerCards.push({ x, y, w: cardW, h: cardH, id: r.id, bpm: r.baseBpm });
    });
    this.pickerMaxScroll = Math.max(0, Math.ceil(all.length / cols) * (cardH + gap) - (h - top - 80));
    ctx.restore();
  }

  handleInput(evt) {
    if (this.showRhythmPicker) {
      if (evt.type === 'keydown' && evt.code === 'Escape') {
        this.showRhythmPicker = false;
        return;
      }
      if (evt.type === 'wheel') {
        this.pickerScroll = clamp(this.pickerScroll + evt.dy, 0, this.pickerMaxScroll || 0);
        return;
      }
      if (evt.type === 'down' && evt.source === 'touch') {
        this._handlePickerClick(evt.x, evt.y);
      }
      return;
    }
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') { this.manager.goTo('medleyMenu'); return; }
      if (evt.code === 'KeyS') { this._save(); return; }
      if (evt.code === 'Enter') { this._play(); return; }
    }
    if (evt.type === 'wheel') {
      this.targetScroll = clamp(this.targetScroll + evt.dy, 0, this.maxScroll);
      return;
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      this._handleClick(evt.x, evt.y);
    }
  }

  _handlePickerClick(mx, my) {
    if (this.pickerCards) {
      for (const c of this.pickerCards) {
        const adjY = c.y - this.pickerScroll;
        if (mx >= c.x && mx <= c.x + c.w && my >= adjY && my <= adjY + c.h) {
          this.medley.sequence.push({
            rhythmId: c.id,
            variation: c.id + '_basic',
            bars: 4,
            bpm: c.bpm
          });
          this.showRhythmPicker = false;
          return;
        }
      }
    }
  }

  _handleClick(mx, my) {
    if (mx < 50 && my < 50) { this.manager.goTo('medleyMenu'); return; }
    // Footer
    if (this.transitionBtns) {
      for (const t of this.transitionBtns) {
        if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
          this.medley.transitions = t.value;
          return;
        }
      }
    }
    if (this.footerBtns) {
      for (const b of this.footerBtns) {
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          if (b.kind === 'save') this._save();
          else if (b.kind === 'play') this._play();
          else if (b.kind === 'deleteMedley') this._delete();
          return;
        }
      }
    }
    // Sequence rows (account for scroll)
    const adjY = my + this.scroll;
    if (this.rowBounds) {
      for (const r of this.rowBounds) {
        if (mx >= r.x && mx <= r.x + r.w && adjY >= r.y && adjY <= r.y + r.h) {
          this._handleRowAction(r.kind, r.idx);
          return;
        }
      }
    }
    if (this.addRhythmBtn) {
      const b = this.addRhythmBtn;
      if (mx >= b.x && mx <= b.x + b.w && adjY >= b.y && adjY <= b.y + b.h) {
        this.showRhythmPicker = true;
        this.pickerScroll = 0;
        return;
      }
    }
  }

  _handleRowAction(kind, idx) {
    const seq = this.medley.sequence;
    const s = seq[idx];
    if (!s) return;
    switch (kind) {
      case 'bpm-': s.bpm = Math.max(40, s.bpm - 5); break;
      case 'bpm+': s.bpm = Math.min(220, s.bpm + 5); break;
      case 'bars-': s.bars = Math.max(1, s.bars - 1); break;
      case 'bars+': s.bars = Math.min(16, s.bars + 1); break;
      case 'moveUp':
        if (idx > 0) { [seq[idx - 1], seq[idx]] = [seq[idx], seq[idx - 1]]; }
        break;
      case 'moveDown':
        if (idx < seq.length - 1) { [seq[idx + 1], seq[idx]] = [seq[idx], seq[idx + 1]]; }
        break;
      case 'delete':
        seq.splice(idx, 1);
        break;
    }
  }

  _save() {
    if (!this.medley) return;
    Storage.saveCustomMedley(this.medley);
  }

  _delete() {
    if (!this.medley) return;
    Storage.deleteCustomMedley(this.medley.id);
    this.manager.goTo('medleyMenu');
  }

  _play() {
    if (!this.medley || this.medley.sequence.length < 2) return;
    this._save();
    this.manager.goTo('countdown', {
      mode: 'medley',
      medleyCustom: this.medley,
      songId: 'medley_' + this.medley.id,
      difficulty: 'normal'
    });
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

/**
 * AboutScene.js - 게임 소개 + 젬베 역사 + 크레딧
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';

const TEXT = [
  { type: 'title', text: '젬베 리듬 게임 v1.0' },
  { type: 'p', text: '서아프리카 전통 타악기 "젬베"를 모티브로 한 모바일 웹 친화적 리듬 게임입니다.' },
  { type: 'h', text: '🥁 젬베란?' },
  { type: 'p', text: '젬베(Djembe)는 13세기경 말리 제국 시대에 만들어진 서아프리카의 손으로 치는 단면 드럼입니다.' },
  { type: 'p', text: '염소 가죽으로 만든 북면을 손바닥(BASS), 손가락 끝(TONE), 손가락 옆면(SLAP) 세 가지 방법으로 두드려 다양한 음색을 만들어냅니다.' },
  { type: 'h', text: '🎮 조작법' },
  { type: 'p', text: '• D 키 또는 화면 왼쪽 — SLAP (날카로운 소리)' },
  { type: 'p', text: '• Space 키 또는 화면 중앙 — BASS (묵직한 소리)' },
  { type: 'p', text: '• K 키 또는 화면 오른쪽 — TONE (맑은 소리)' },
  { type: 'p', text: '• ESC — 일시정지' },
  { type: 'h', text: '🎨 크레딧' },
  { type: 'p', text: '게임 디자인 & 개발: 사용자 본인' },
  { type: 'p', text: 'AI 어시스턴트: Claude Opus 4.7' },
  { type: 'p', text: '사운드: 직접 녹음한 젬베 샘플' },
  { type: 'p', text: '오픈소스 사용: 없음 (Vanilla JS)' }
];

export class AboutScene extends Scene {
  constructor(app) { super(app); this.elapsed = 0; this.scrollY = 0; }

  onEnter() {
    this.elapsed = 0;
    this.scrollY = 0;
    this.uiButtons = [
      { label: '◀', x: 20, y: 20, w: 50, h: 50, bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22, radius: 10, onClick: () => this.manager.goTo('title') }
    ];
  }

  update(dt) { this.elapsed += dt; }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('정보', w / 2, 50);
    let y = 110 - this.scrollY;
    const maxW = Math.min(700, w - 80);
    const x = w / 2 - maxW / 2;
    TEXT.forEach((b) => {
      if (b.type === 'title') {
        if (y > 60 && y < h) {
          ctx.fillStyle = T.primary;
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(b.text, x, y);
        }
        y += 40;
      } else if (b.type === 'h') {
        if (y > 60 && y < h) {
          ctx.fillStyle = T.primary;
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(b.text, x, y);
        }
        y += 32;
      } else {
        const lines = this._wrap(ctx, b.text, maxW, '14px sans-serif');
        lines.forEach(line => {
          if (y > 60 && y < h) {
            ctx.fillStyle = T.text.primary;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(line, x, y);
          }
          y += 22;
        });
        y += 8;
      }
    });
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  _wrap(ctx, text, maxW, font) {
    ctx.font = font;
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') this.manager.goTo('title');
      if (evt.code === 'ArrowDown') this.scrollY = Math.min(800, this.scrollY + 40);
      if (evt.code === 'ArrowUp') this.scrollY = Math.max(0, this.scrollY - 40);
    }
  }
}

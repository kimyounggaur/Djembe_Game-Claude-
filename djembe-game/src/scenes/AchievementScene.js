/**
 * AchievementScene.js - 도전과제 진행 현황
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { Storage } from '../utils/Storage.js';

const ACHIEVEMENTS = [
  { id: 'first_step', name: '첫 발걸음', desc: '곡 1개 완주', icon: '👣' },
  { id: 'rhythm_master', name: '리듬의 시작', desc: '100콤보 달성', icon: '🎵' },
  { id: 'divine', name: '기교의 정점', desc: '풀콤보 1회', icon: '👑' },
  { id: 'marathon', name: '마라톤 러너', desc: '누적 플레이 60분', icon: '🏃' },
  { id: 'easy_master', name: '초급 마스터', desc: 'Easy 난이도 모든 곡 S랭크', icon: '🥉' },
  { id: 'precise', name: '정확한 손', desc: '정확도 95% 이상', icon: '🎯' },
  { id: 'combo_master', name: '콤보 마스터', desc: '500콤보 달성', icon: '🔥' },
  { id: 'night_owl', name: '심야 연주자', desc: '자정~새벽 5시 사이 플레이', icon: '🌙' },
  { id: 'diverse', name: '다양성의 추구', desc: '모든 난이도 1회씩 플레이', icon: '🌈' },
  { id: 'djembe_god', name: '젬베의 신', desc: 'Hard 난이도 풀콤보', icon: '⭐' }
];

export class AchievementScene extends Scene {
  constructor(app) { super(app); this.elapsed = 0; }

  onEnter() {
    this.elapsed = 0;
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
    ctx.fillText('도전과제', w / 2, 50);
    const unlocked = Storage.getAchievements();
    const count = Object.keys(unlocked).length;
    ctx.fillStyle = T.primary;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${count} / ${ACHIEVEMENTS.length} 달성`, w / 2, 78);
    const cols = w < 700 ? 1 : 2;
    const itemW = (w - 80 - (cols - 1) * 16) / cols;
    const itemH = 80;
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = 40 + col * (itemW + 16);
      const y = 110 + row * (itemH + 12);
      if (y > h) return;
      const isUnlocked = !!unlocked[a.id];
      ctx.fillStyle = isUnlocked ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.04)';
      this._roundRect(ctx, x, y, itemW, itemH, 12);
      ctx.fill();
      ctx.strokeStyle = isUnlocked ? T.primary : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = isUnlocked ? T.text.primary : T.text.tertiary;
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isUnlocked ? a.icon : '🔒', x + 35, y + 50);
      ctx.fillStyle = isUnlocked ? T.text.primary : T.text.tertiary;
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(a.name, x + 70, y + 32);
      ctx.fillStyle = T.text.secondary;
      ctx.font = '12px sans-serif';
      ctx.fillText(a.desc, x + 70, y + 52);
    });
    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown' && evt.code === 'Escape') this.manager.goTo('title');
  }
}

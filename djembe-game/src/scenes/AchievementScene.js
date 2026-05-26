/**
 * AchievementScene.js - 도전과제 진행 현황 (기본 10 + 리듬 도감 12)
 */
import { Scene } from './Scene.js';
import { Theme } from '../ui/Theme.js';
import { Storage } from '../utils/Storage.js';
import { UserSkillEstimator } from '../utils/UserSkillEstimator.js';
import { clamp } from '../utils/MathUtils.js';

const ACHIEVEMENTS = [
  { id: 'first_step', name: '첫 발걸음', desc: '곡 1개 완주', icon: '👣', category: 'basic' },
  { id: 'rhythm_master', name: '리듬의 시작', desc: '100콤보 달성', icon: '🎵', category: 'basic' },
  { id: 'divine', name: '기교의 정점', desc: '풀콤보 1회', icon: '👑', category: 'basic' },
  { id: 'marathon', name: '마라톤 러너', desc: '누적 플레이 60분', icon: '🏃', category: 'basic' },
  { id: 'easy_master', name: '초급 마스터', desc: 'Easy 난이도 모든 곡 S랭크', icon: '🥉', category: 'basic' },
  { id: 'precise', name: '정확한 손', desc: '정확도 95% 이상', icon: '🎯', category: 'basic' },
  { id: 'combo_master', name: '콤보 마스터', desc: '500콤보 달성', icon: '🔥', category: 'basic' },
  { id: 'night_owl', name: '심야 연주자', desc: '자정~새벽 5시 사이 플레이', icon: '🌙', category: 'basic' },
  { id: 'diverse', name: '다양성의 추구', desc: '모든 난이도 1회씩 플레이', icon: '🌈', category: 'basic' },
  { id: 'djembe_god', name: '젬베의 신', desc: 'Hard 난이도 풀콤보', icon: '⭐', category: 'basic' },
  // 리듬 도감 도전과제 (Phase 8 신규)
  { id: 'first_rhythm', name: '첫 리듬', desc: '리듬 도감에서 1개 클리어', icon: '🥁', category: 'library' },
  { id: 'library_explorer', name: '도감 탐험가', desc: '5개 리듬 클리어', icon: '🗺', category: 'library' },
  { id: 'library_completionist', name: '도감 완성자', desc: '12개 리듬 모두 클리어', icon: '🏆', category: 'library' },
  { id: 'master_path', name: '마스터의 길', desc: '1개 리듬 마스터 (Step 5 완료)', icon: '👑', category: 'library' },
  { id: 'versatile', name: '다재다능', desc: '5개 리듬 마스터', icon: '🎭', category: 'library' },
  { id: 'groove_master', name: '그루브 마스터', desc: '리듬 1개 풀콤보', icon: '🌟', category: 'library' },
  { id: 'speed_demon', name: '스피드 데몬', desc: '루프 연습에서 BPM 180+ 달성', icon: '⚡', category: 'library' },
  { id: 'world_tour', name: '세계 일주', desc: '5개 지역 모두 1개씩 클리어', icon: '🌍', category: 'library' },
  { id: 'bookworm', name: '책벌레', desc: '백과사전 모든 항목 읽기', icon: '📚', category: 'library' },
  { id: 'medley_champion', name: '메들리 챔피언', desc: '메들리 1개 S랭크', icon: '🎼', category: 'library' },
  { id: 'custom_creator', name: '나만의 길', desc: '커스텀 메들리 5개 생성', icon: '🎨', category: 'library' },
  { id: 'culture_scholar', name: '문화 학도', desc: '마스터 5명 프로필 모두 읽기', icon: '🎓', category: 'library' }
];

export function checkAllAchievements(app) {
  const unlocked = Storage.getAchievements();
  const stats = Storage.getStats();
  const newlyUnlocked = [];

  const tryUnlock = (id) => {
    if (!unlocked[id] && Storage.unlockAchievement(id)) newlyUnlocked.push(id);
  };

  if (stats.totalNotes > 0) tryUnlock('first_step');

  const cleared = UserSkillEstimator.getClearedRhythmIds();
  if (cleared.length >= 1) tryUnlock('first_rhythm');
  if (cleared.length >= 5) tryUnlock('library_explorer');
  if (app?.rhythmLoader && cleared.length >= app.rhythmLoader.getAllMetadata().length) tryUnlock('library_completionist');

  const mastered = UserSkillEstimator.getMasteredCount();
  if (mastered >= 1) tryUnlock('master_path');
  if (mastered >= 5) tryUnlock('versatile');

  if (UserSkillEstimator.getFullComboCount() >= 1) tryUnlock('groove_master');

  // 지역별 클리어
  if (app?.rhythmLoader) {
    const progress = UserSkillEstimator.getRegionProgress(app.rhythmLoader);
    const regionsCleared = Object.values(progress).filter(p => p.cleared > 0).length;
    if (regionsCleared >= 5) tryUnlock('world_tour');
  }

  // 백과사전 완독
  const read = Storage.getEncyclopediaRead();
  if (Object.keys(read).length >= 8) tryUnlock('bookworm');

  // 커스텀 메들리 5개
  if (Storage.getCustomMedleys().length >= 5) tryUnlock('custom_creator');

  // 메들리 S랭크
  const medleyScores = Storage.getMedleyScores();
  for (const m of Object.values(medleyScores)) {
    if (m.topScores && m.topScores[0]?.grade === 'S') { tryUnlock('medley_champion'); break; }
  }

  // 누적 플레이 60분
  if ((stats.totalPlayTime || 0) >= 60 * 60 * 1000) tryUnlock('marathon');

  // 최고 BPM 180 (루프 연습)
  const rhythmScores = Storage.getRhythmScores();
  for (const s of Object.values(rhythmScores)) {
    if (s.maxBpm >= 180) { tryUnlock('speed_demon'); break; }
  }

  return newlyUnlocked;
}

export class AchievementScene extends Scene {
  constructor(app) {
    super(app);
    this.elapsed = 0;
    this.scroll = 0;
    this.targetScroll = 0;
    this.maxScroll = 0;
    this.filter = 'all'; // all | basic | library
  }

  onEnter() {
    this.elapsed = 0;
    this.scroll = 0;
    this.targetScroll = 0;
    this.uiButtons = [
      { label: '◀', x: 20, y: 20, w: 50, h: 50, bg: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22, radius: 10, onClick: () => this.manager.goTo('title') }
    ];
    // 자동 도전과제 체크 (Scene 진입 시)
    checkAllAchievements(this.app);
  }

  _getFiltered() {
    if (this.filter === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === this.filter);
  }

  update(dt) {
    this.elapsed += dt;
    this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 12);
  }

  render(ctx, w, h) {
    const T = Theme.current;
    this.drawBackground(ctx, w, h, T.bgGradient);
    ctx.fillStyle = T.text.primary;
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('도전과제', w / 2, 50);
    const unlocked = Storage.getAchievements();
    const filtered = this._getFiltered();
    const total = ACHIEVEMENTS.length;
    const count = ACHIEVEMENTS.filter(a => unlocked[a.id]).length;
    ctx.fillStyle = T.primary;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${count} / ${total} 달성`, w / 2, 78);

    // 카테고리 필터 칩 (전체 / 기본 / 리듬 도감)
    const chipY = 100;
    const chips = [
      { value: 'all', label: '전체' },
      { value: 'basic', label: '기본' },
      { value: 'library', label: '리듬 도감' }
    ];
    this.chipBounds = [];
    let chipX = w / 2 - 150;
    ctx.font = '13px sans-serif';
    chips.forEach(c => {
      const active = this.filter === c.value;
      const cw = 90;
      ctx.fillStyle = active ? '#FF6B6B' : 'rgba(255,255,255,0.12)';
      this._roundRect(ctx, chipX, chipY, cw, 28, 14);
      ctx.fill();
      ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.2)';
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.label, chipX + cw / 2, chipY + 14);
      this.chipBounds.push({ x: chipX, y: chipY, w: cw, h: 28, value: c.value });
      chipX += cw + 10;
    });

    // 카드 그리드 (스크롤 가능)
    const cols = w < 700 ? 1 : 2;
    const itemW = (w - 80 - (cols - 1) * 16) / cols;
    const itemH = 80;
    const top = 150;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 8, w, h - top - 12);
    ctx.clip();
    ctx.translate(0, -this.scroll);

    filtered.forEach((a, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = 40 + col * (itemW + 16);
      const y = top + row * (itemH + 12);
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
      // 카테고리 배지
      if (a.category === 'library') {
        ctx.fillStyle = '#9C27B0';
        ctx.textAlign = 'right';
        ctx.font = '10px sans-serif';
        ctx.fillText('🥁 LIB', x + itemW - 10, y + 14);
      }
    });

    const rows = Math.ceil(filtered.length / cols);
    this.maxScroll = Math.max(0, rows * (itemH + 12) - (h - top - 20));
    ctx.restore();

    for (const btn of this.uiButtons) this.drawButton(ctx, btn, this.elapsed);
  }

  handleInput(evt) {
    super.handleInput(evt);
    if (evt.type === 'keydown') {
      if (evt.code === 'Escape') this.manager.goTo('title');
      else if (evt.code === 'ArrowDown') this.targetScroll = clamp(this.targetScroll + 60, 0, this.maxScroll);
      else if (evt.code === 'ArrowUp') this.targetScroll = clamp(this.targetScroll - 60, 0, this.maxScroll);
    }
    if (evt.type === 'wheel') {
      this.targetScroll = clamp(this.targetScroll + evt.dy, 0, this.maxScroll);
    }
    if (evt.type === 'down' && evt.source === 'touch') {
      if (this.chipBounds) {
        for (const c of this.chipBounds) {
          if (evt.x >= c.x && evt.x <= c.x + c.w && evt.y >= c.y && evt.y <= c.y + c.h) {
            this.filter = c.value;
            this.targetScroll = 0;
            return;
          }
        }
      }
    }
  }
}

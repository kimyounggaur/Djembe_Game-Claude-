/**
 * UserSkillEstimator.js - LocalStorage의 점수 데이터로 사용자 실력(별점)을 추정
 */
import { Storage } from './Storage.js';

export const UserSkillEstimator = {
  /**
   * 사용자의 현재 실력을 별점(1~10)으로 추정
   * @param {RhythmLoader} loader
   * @returns {number} 1~10
   */
  estimateUserSkill(loader) {
    const scores = Storage.getRhythmScores();
    if (!loader) return 1;
    const completed = Object.entries(scores)
      .filter(([id, data]) => data && data.bestGrade && ['S', 'A', 'B'].includes(data.bestGrade))
      .map(([id]) => loader.getMetadata(id))
      .filter(Boolean);

    if (completed.length === 0) return 1;

    const sortedStars = completed.map(r => r.stars).sort((a, b) => b - a);
    const top30count = Math.max(1, Math.ceil(sortedStars.length * 0.3));
    const top30 = sortedStars.slice(0, top30count);
    const avg = top30.reduce((a, b) => a + b, 0) / top30.length;

    return Math.min(10, Math.round(avg) + 1);
  },

  /**
   * 클리어한 리듬 ID 목록
   */
  getClearedRhythmIds() {
    const scores = Storage.getRhythmScores();
    return Object.entries(scores)
      .filter(([id, data]) => data && data.bestGrade && ['S', 'A', 'B'].includes(data.bestGrade))
      .map(([id]) => id);
  },

  getMasteredRhythmIds() {
    const scores = Storage.getRhythmScores();
    return Object.entries(scores)
      .filter(([id, data]) => data && data.mastered)
      .map(([id]) => id);
  },

  getFullComboRhythmIds() {
    const scores = Storage.getRhythmScores();
    return Object.entries(scores)
      .filter(([id, data]) => data && data.fullCombo)
      .map(([id]) => id);
  },

  getClearedCount() {
    return this.getClearedRhythmIds().length;
  },

  getMasteredCount() {
    return this.getMasteredRhythmIds().length;
  },

  getFullComboCount() {
    return this.getFullComboRhythmIds().length;
  },

  /**
   * 지역별 진행도 { regionId: { cleared, total } }
   */
  getRegionProgress(loader) {
    const regions = loader.getCategories().regions || [];
    const all = loader.getAllMetadata();
    const cleared = new Set(this.getClearedRhythmIds());
    const result = {};
    regions.forEach(r => {
      const inRegion = all.filter(rh => rh.region === r.id);
      const clearedHere = inRegion.filter(rh => cleared.has(rh.id));
      result[r.id] = { cleared: clearedHere.length, total: inRegion.length };
    });
    return result;
  },

  /**
   * 다음 추천 리듬 (사용자 실력에 맞는, 아직 안 깬 리듬)
   */
  getNextRecommendation(loader) {
    const skill = this.estimateUserSkill(loader);
    const cleared = this.getClearedRhythmIds();
    return loader.getRecommendedNext(skill, cleared);
  }
};

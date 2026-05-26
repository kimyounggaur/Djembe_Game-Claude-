/**
 * DifficultyCalculator.js - 리듬 패턴의 별점(1~10)을 자동 계산
 */
export const DifficultyCalculator = {
  /**
   * @param {Object} pattern - { lengthInBeats, notes: [{step, lane, type}] }
   * @param {number} bpm - 기준 BPM
   * @returns {number} 1~10 별점
   */
  calcStars(pattern, bpm) {
    if (!pattern || !pattern.notes || pattern.notes.length === 0) return 1;

    let score = 0;

    // 요소 1: BPM (0~3점)
    if (bpm < 80) score += 0;
    else if (bpm < 110) score += 1;
    else if (bpm < 140) score += 2;
    else score += 3;

    // 요소 2: 노트 밀도 (NPS - Notes Per Second) (0~3점)
    const lengthInBeats = pattern.lengthInBeats || 4;
    const durationSec = (lengthInBeats * 60) / bpm;
    const nps = pattern.notes.length / durationSec;
    if (nps < 2) score += 0;
    else if (nps < 4) score += 1;
    else if (nps < 6) score += 2;
    else score += 3;

    // 요소 3: lane 전환 빈도 (0~2점)
    let switches = 0;
    for (let i = 1; i < pattern.notes.length; i++) {
      if (pattern.notes[i].lane !== pattern.notes[i - 1].lane) switches++;
    }
    const switchRate = switches / Math.max(1, pattern.notes.length);
    if (switchRate < 0.4) score += 0;
    else if (switchRate < 0.7) score += 1;
    else score += 2;

    // 요소 4: 동시타/hold/roll 등 특수 노트 (0~2점)
    const specialNotes = pattern.notes.filter(n => n.type && n.type !== 'tap').length;
    if (specialNotes === 0) score += 0;
    else if (specialNotes < 3) score += 1;
    else score += 2;

    return Math.max(1, Math.min(10, score));
  },

  /**
   * 별점에서 tier 그룹으로 매핑
   */
  starsToTier(stars) {
    if (stars <= 3) return 'beginner';
    if (stars <= 7) return 'intermediate';
    return 'advanced';
  },

  /**
   * tier를 기존 difficulty(easy/normal/hard)로 매핑
   */
  tierToLegacyDifficulty(tier) {
    if (tier === 'beginner') return 'easy';
    if (tier === 'intermediate') return 'normal';
    return 'hard';
  },

  tierLabel(tier, lang = 'ko') {
    const labels = {
      beginner:     { ko: '초급', en: 'Beginner' },
      intermediate: { ko: '중급', en: 'Intermediate' },
      advanced:     { ko: '고급', en: 'Advanced' }
    };
    return (labels[tier] || labels.beginner)[lang] || '';
  },

  tierColor(tier) {
    if (tier === 'beginner') return '#76FF03';
    if (tier === 'intermediate') return '#FFD600';
    return '#FF1744';
  },

  starColor(stars) {
    if (stars <= 3) return '#76FF03';
    if (stars <= 7) return '#FFD600';
    return '#FF1744';
  }
};

/**
 * ScoreSystem.js - 점수/콤보/정확도/등급 계산
 */
import { JUDGMENT_SCORE, JUDGMENT_ACCURACY } from './JudgmentSystem.js';

export class ScoreSystem {
  constructor(totalNotes) {
    this.totalNotes = totalNotes;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.accuracySum = 0;
    this.judgedCount = 0;
    this.tally = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.fullCombo = true;
    this.allPerfect = true;
    this.comboHistory = [];
    this.recentJudgmentTimes = [];
    this.missStreak = 0;
    this.maxMissStreak = 0;
    this.challengeFailed = false;
  }

  addJudgment(judgment, currentTimeMs, isTail = false, challengeMode = false) {
    if (judgment === 'miss') {
      this.tally.miss++;
      this.fullCombo = false;
      this.allPerfect = false;
      this.combo = 0;
      this.missStreak++;
      this.maxMissStreak = Math.max(this.maxMissStreak, this.missStreak);
      if (challengeMode) this.challengeFailed = true;
    } else {
      this.tally[judgment]++;
      if (judgment !== 'perfect') this.allPerfect = false;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.missStreak = 0;
    }
    const base = JUDGMENT_SCORE[judgment] || 0;
    const comboBonus = challengeMode ? 1 + Math.min(this.combo, 100) / 100 : 1 + Math.min(this.combo / 50, 1.0) * 0.5;
    const finalScore = Math.round(base * comboBonus);
    this.score += finalScore;
    this.accuracySum += JUDGMENT_ACCURACY[judgment] || 0;
    this.judgedCount++;
    this.comboHistory.push({ time: currentTimeMs, combo: this.combo });
    return finalScore;
  }

  get accuracy() {
    if (this.judgedCount === 0) return 100;
    return this.accuracySum / this.judgedCount;
  }

  get grade() {
    const acc = this.accuracy;
    if (acc >= 95) return 'S';
    if (acc >= 90) return 'A';
    if (acc >= 80) return 'B';
    if (acc >= 70) return 'C';
    return 'D';
  }

  getSummary() {
    return {
      score: this.score,
      maxCombo: this.maxCombo,
      accuracy: this.accuracy,
      grade: this.grade,
      tally: { ...this.tally },
      fullCombo: this.fullCombo,
      allPerfect: this.allPerfect,
      totalNotes: this.totalNotes,
      maxMissStreak: this.maxMissStreak,
      comboHistory: this.comboHistory.slice()
    };
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.accuracySum = 0;
    this.judgedCount = 0;
    this.tally = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.fullCombo = true;
    this.allPerfect = true;
    this.comboHistory = [];
    this.missStreak = 0;
    this.maxMissStreak = 0;
    this.challengeFailed = false;
  }
}

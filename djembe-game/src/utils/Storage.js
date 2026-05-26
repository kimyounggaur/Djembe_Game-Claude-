/**
 * Storage.js - LocalStorage 래퍼
 */
const KEY = {
  SETTINGS: 'djembe_settings',
  SCORES: 'djembe_scores',
  TOTAL: 'djembe_totalScore',
  ACHIEVEMENTS: 'djembe_achievements',
  UNLOCKS: 'djembe_unlocks',
  ONBOARDING: 'djembe_onboarded',
  STATS: 'djembe_stats',
  RHYTHM_SCORES: 'djembe_rhythm_scores',
  RHYTHM_ENCYCLOPEDIA: 'djembe_rhythm_encyclopedia',
  CUSTOM_MEDLEYS: 'djembe_custom_medleys',
  MEDLEY_SCORES: 'djembe_medley_scores',
  RHYTHM_ONBOARDED: 'djembe_rhythm_onboarded'
};

const DEFAULT_SETTINGS = {
  keyMap: { slap: 'KeyD', bass: 'Space', tone: 'KeyK' },
  volume: { master: 0.9, bgm: 0.7, sfx: 1.0 },
  audioOffset: 0,
  inputOffset: 0,
  scrollSpeed: 1.6,
  noteSize: 'medium',
  judgmentY: 0.78,
  screenShake: true,
  countdownSound: true,
  metronome: 'off',
  theme: 'default',
  colorblind: 'off',
  particleQuality: 'high',
  language: 'ko',
  haptic: true,
  largeFont: false,
  reducedMotion: false,
  debug: false
};

const Storage = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage quota exceeded', e);
      return false;
    }
  },
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...this.load(KEY.SETTINGS, {}) };
  },
  saveSettings(settings) {
    return this.save(KEY.SETTINGS, settings);
  },
  updateSetting(path, value) {
    const s = this.getSettings();
    const keys = path.split('.');
    let target = s;
    for (let i = 0; i < keys.length - 1; i++) {
      target[keys[i]] = target[keys[i]] || {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    this.saveSettings(s);
    return s;
  },
  getScores() {
    return this.load(KEY.SCORES, {});
  },
  saveScore(songId, difficulty, result) {
    const scores = this.getScores();
    if (!scores[songId]) scores[songId] = {};
    const prev = scores[songId][difficulty] || { highScore: 0, bestGrade: 'D', fullCombo: false, playCount: 0 };
    const isNew = result.score > prev.highScore;
    scores[songId][difficulty] = {
      highScore: Math.max(prev.highScore, result.score),
      bestGrade: gradeMax(prev.bestGrade, result.grade),
      fullCombo: prev.fullCombo || result.fullCombo,
      playCount: prev.playCount + 1,
      lastPlayed: Date.now()
    };
    this.save(KEY.SCORES, scores);
    const total = this.load(KEY.TOTAL, 0) + result.score;
    this.save(KEY.TOTAL, total);
    return { isNew, total };
  },
  getTotalScore() {
    return this.load(KEY.TOTAL, 0);
  },
  getAchievements() {
    return this.load(KEY.ACHIEVEMENTS, {});
  },
  unlockAchievement(id) {
    const a = this.getAchievements();
    if (a[id]) return false;
    a[id] = { unlocked: true, date: Date.now() };
    this.save(KEY.ACHIEVEMENTS, a);
    return true;
  },
  getUnlocks() {
    return this.load(KEY.UNLOCKS, {});
  },
  unlockSong(songId) {
    const u = this.getUnlocks();
    if (u[songId]) return false;
    u[songId] = true;
    this.save(KEY.UNLOCKS, u);
    return true;
  },
  isOnboarded() {
    return this.load(KEY.ONBOARDING, false);
  },
  markOnboarded() {
    this.save(KEY.ONBOARDING, true);
  },
  getStats() {
    return this.load(KEY.STATS, { totalPlayTime: 0, totalNotes: 0, totalPerfect: 0, totalMisses: 0, songPlays: {} });
  },
  addStats(delta) {
    const s = this.getStats();
    for (const k in delta) {
      if (typeof delta[k] === 'object') {
        s[k] = { ...(s[k] || {}), ...delta[k] };
      } else {
        s[k] = (s[k] || 0) + delta[k];
      }
    }
    this.save(KEY.STATS, s);
  },
  getRhythmScores() {
    return this.load(KEY.RHYTHM_SCORES, {});
  },
  getRhythmScore(rhythmId) {
    const all = this.getRhythmScores();
    return all[rhythmId] || null;
  },
  saveRhythmScore(rhythmId, result) {
    const all = this.getRhythmScores();
    const prev = all[rhythmId] || {
      highScore: 0, bestGrade: 'D', fullCombo: false, mastered: false,
      playCount: 0, maxBpm: 0, avgAccuracy: 0, totalAccuracy: 0
    };
    const playCount = prev.playCount + 1;
    const accuracy = result.accuracy != null ? result.accuracy : 0;
    const totalAccuracy = (prev.totalAccuracy || 0) + accuracy;
    const isNew = (result.score || 0) > prev.highScore;
    all[rhythmId] = {
      highScore: Math.max(prev.highScore, result.score || 0),
      bestGrade: gradeMax(prev.bestGrade, result.grade || 'D'),
      fullCombo: prev.fullCombo || !!result.fullCombo,
      mastered: prev.mastered || !!result.mastered,
      playCount,
      maxBpm: Math.max(prev.maxBpm || 0, result.maxBpm || 0),
      totalAccuracy,
      avgAccuracy: totalAccuracy / playCount,
      lastPlayed: Date.now()
    };
    this.save(KEY.RHYTHM_SCORES, all);
    return { isNew, score: all[rhythmId] };
  },
  setRhythmMastered(rhythmId, value = true) {
    const all = this.getRhythmScores();
    if (!all[rhythmId]) all[rhythmId] = {
      highScore: 0, bestGrade: 'D', fullCombo: false, mastered: false,
      playCount: 0, maxBpm: 0, avgAccuracy: 0, totalAccuracy: 0
    };
    all[rhythmId].mastered = value;
    this.save(KEY.RHYTHM_SCORES, all);
  },
  getEncyclopediaRead() {
    return this.load(KEY.RHYTHM_ENCYCLOPEDIA, {});
  },
  markEncyclopediaRead(sectionId) {
    const read = this.getEncyclopediaRead();
    if (read[sectionId]) return false;
    read[sectionId] = { date: Date.now() };
    this.save(KEY.RHYTHM_ENCYCLOPEDIA, read);
    return true;
  },
  getCustomMedleys() {
    return this.load(KEY.CUSTOM_MEDLEYS, []);
  },
  saveCustomMedley(medley) {
    const list = this.getCustomMedleys();
    const existingIdx = list.findIndex(m => m.id === medley.id);
    if (existingIdx >= 0) list[existingIdx] = medley;
    else list.push({ ...medley, createdAt: Date.now() });
    if (list.length > 10) list.shift();
    this.save(KEY.CUSTOM_MEDLEYS, list);
    return list;
  },
  deleteCustomMedley(id) {
    const list = this.getCustomMedleys().filter(m => m.id !== id);
    this.save(KEY.CUSTOM_MEDLEYS, list);
  },
  getMedleyScores() {
    return this.load(KEY.MEDLEY_SCORES, {});
  },
  saveMedleyScore(medleyId, result) {
    const all = this.getMedleyScores();
    const prev = all[medleyId] || { topScores: [], playCount: 0 };
    const entry = {
      score: result.score || 0,
      grade: result.grade || 'D',
      accuracy: result.accuracy || 0,
      name: result.name || 'Anon',
      date: Date.now()
    };
    prev.topScores = [...prev.topScores, entry].sort((a, b) => b.score - a.score).slice(0, 5);
    prev.playCount += 1;
    all[medleyId] = prev;
    this.save(KEY.MEDLEY_SCORES, all);
    return prev;
  },
  isRhythmOnboarded() {
    return this.load(KEY.RHYTHM_ONBOARDED, false);
  },
  markRhythmOnboarded() {
    this.save(KEY.RHYTHM_ONBOARDED, true);
  },
  resetAll() {
    Object.values(KEY).forEach(k => localStorage.removeItem(k));
  },
  exportData() {
    const data = {};
    Object.entries(KEY).forEach(([k, v]) => {
      data[k] = localStorage.getItem(v);
    });
    return data;
  },
  importData(data) {
    Object.entries(data).forEach(([k, v]) => {
      if (KEY[k] && v) localStorage.setItem(KEY[k], v);
    });
  }
};

const GRADE_ORDER = { D: 0, C: 1, B: 2, A: 3, S: 4 };
function gradeMax(a, b) {
  return (GRADE_ORDER[b] || 0) > (GRADE_ORDER[a] || 0) ? b : a;
}

export { Storage, DEFAULT_SETTINGS };

/**
 * ChartLoader.js - JSON 차트 로드 + 검증
 */
export class ChartLoader {
  constructor() {
    this.cache = new Map();
  }

  async load(songId, url) {
    if (this.cache.has(songId)) return this.cache.get(songId);
    try {
      const res = await fetch(url);
      const data = await res.json();
      this._validate(data);
      this.cache.set(songId, data);
      return data;
    } catch (e) {
      console.error(`Chart ${songId} failed to load`, e);
      return null;
    }
  }

  loadInline(songId, data) {
    this._validate(data);
    this.cache.set(songId, data);
    return data;
  }

  _validate(chart) {
    if (!chart.songId) throw new Error('chart.songId required');
    if (!chart.bpm) throw new Error('chart.bpm required');
    if (!chart.notes) throw new Error('chart.notes required');
    ['easy', 'normal', 'hard'].forEach(d => {
      if (chart.notes[d]) {
        chart.notes[d].sort((a, b) => a.time - b.time);
      }
    });
  }

  getNotes(songId, difficulty) {
    const chart = this.cache.get(songId);
    if (!chart || !chart.notes[difficulty]) return [];
    return chart.notes[difficulty];
  }

  getChart(songId) {
    return this.cache.get(songId);
  }
}

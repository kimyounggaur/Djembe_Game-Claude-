/**
 * RhythmLoader.js - 전통 리듬 데이터 로드/필터/검색
 */
export class RhythmLoader {
  constructor() {
    this.library = null;
    this.rhythms = new Map();
  }

  async loadLibrary() {
    if (this.library) return this.library;
    try {
      const res = await fetch('assets/rhythms/library.json');
      this.library = await res.json();
      return this.library;
    } catch (e) {
      console.error('[RhythmLoader] Failed to load library', e);
      this.library = { version: '1.0.0', categories: { regions: [], purposes: [], tempos: [] }, rhythms: [] };
      return this.library;
    }
  }

  async loadRhythm(id) {
    if (this.rhythms.has(id)) return this.rhythms.get(id);
    try {
      const res = await fetch(`assets/rhythms/${id}.json`);
      const data = await res.json();
      this.rhythms.set(id, data);
      return data;
    } catch (e) {
      console.error(`[RhythmLoader] Failed to load rhythm ${id}`, e);
      return null;
    }
  }

  getRhythm(id) {
    return this.rhythms.get(id) || null;
  }

  getAllMetadata() {
    return this.library ? this.library.rhythms : [];
  }

  getMetadata(id) {
    return this.library ? this.library.rhythms.find(r => r.id === id) : null;
  }

  getCategories() {
    return this.library ? this.library.categories : { regions: [], purposes: [], tempos: [] };
  }

  getRegion(id) {
    if (!this.library) return null;
    return this.library.categories.regions.find(r => r.id === id) || null;
  }

  getPurpose(id) {
    if (!this.library) return null;
    return this.library.categories.purposes.find(p => p.id === id) || null;
  }

  getRhythmsByTier(tier) {
    return this.getAllMetadata().filter(r => r.tier === tier);
  }

  getRhythmsByStars(min, max) {
    return this.getAllMetadata().filter(r => r.stars >= min && r.stars <= max);
  }

  getRhythmsByRegion(region) {
    return this.getAllMetadata().filter(r => r.region === region);
  }

  getRhythmsByPurpose(purpose) {
    return this.getAllMetadata().filter(r => r.purposes && r.purposes.includes(purpose));
  }

  getRhythmsByTempo(tempoCategory) {
    return this.getAllMetadata().filter(r => r.tempoCategory === tempoCategory);
  }

  search(query, lang = 'ko') {
    if (!query) return this.getAllMetadata();
    const q = query.toLowerCase().trim();
    return this.getAllMetadata().filter(r => {
      const name = (r.name?.[lang] || r.name?.ko || '').toLowerCase();
      const enName = (r.name?.en || '').toLowerCase();
      const region = (this.getRegion(r.region)?.name?.[lang] || '').toLowerCase();
      const purposes = (r.purposes || []).map(p => (this.getPurpose(p)?.name?.[lang] || '').toLowerCase()).join(' ');
      return name.includes(q) || enName.includes(q) || region.includes(q) || purposes.includes(q) || r.id.includes(q);
    });
  }

  /**
   * 필터 객체에 따른 다중 조건 검색 (AND 조건)
   * filters: { tier, region, purpose, tempo, query }
   */
  filter(filters = {}, lang = 'ko') {
    let result = this.getAllMetadata();
    if (filters.tier) result = result.filter(r => r.tier === filters.tier);
    if (filters.region) result = result.filter(r => r.region === filters.region);
    if (filters.purpose) result = result.filter(r => r.purposes && r.purposes.includes(filters.purpose));
    if (filters.tempo) result = result.filter(r => r.tempoCategory === filters.tempo);
    if (filters.query) {
      const q = filters.query.toLowerCase().trim();
      result = result.filter(r => {
        const name = (r.name?.[lang] || r.name?.ko || '').toLowerCase();
        const enName = (r.name?.en || '').toLowerCase();
        return name.includes(q) || enName.includes(q) || r.id.includes(q);
      });
    }
    return result;
  }

  sortBy(rhythms, sortKey = 'order') {
    const sorted = [...rhythms];
    switch (sortKey) {
      case 'stars-asc':   sorted.sort((a, b) => a.stars - b.stars); break;
      case 'stars-desc':  sorted.sort((a, b) => b.stars - a.stars); break;
      case 'name':        sorted.sort((a, b) => (a.name?.ko || '').localeCompare(b.name?.ko || '')); break;
      case 'bpm-asc':     sorted.sort((a, b) => a.baseBpm - b.baseBpm); break;
      case 'bpm-desc':    sorted.sort((a, b) => b.baseBpm - a.baseBpm); break;
      case 'order':
      default:            sorted.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
    return sorted;
  }

  /**
   * 사용자 실력 기반 다음 추천 리듬
   */
  getRecommendedNext(userLevel, completedIds = []) {
    const candidates = this.getAllMetadata().filter(r =>
      !completedIds.includes(r.id) &&
      r.stars >= Math.max(1, userLevel - 1) &&
      r.stars <= Math.min(10, userLevel + 1)
    );
    if (candidates.length === 0) {
      const fallback = this.getAllMetadata().filter(r => !completedIds.includes(r.id));
      return fallback[Math.floor(Math.random() * fallback.length)] || null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}

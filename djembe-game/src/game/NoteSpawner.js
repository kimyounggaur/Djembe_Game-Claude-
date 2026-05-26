/**
 * NoteSpawner.js - 차트의 노트를 시간에 맞춰 활성화/풀링
 */
import { NotePool } from './Note.js';

export class NoteSpawner {
  constructor() {
    this.pool = new NotePool(300);
    this.notesData = [];
    this.nextIndex = 0;
    this.lookaheadMs = 2500;
    this.cleanupAfterMs = 250;
    this.totalNotes = 0;
    this.nextId = 0;
  }

  load(notes) {
    this.notesData = notes.slice();
    this.nextIndex = 0;
    this.totalNotes = notes.length;
    this.nextId = 0;
    this.pool.releaseAll();
  }

  update(currentTimeMs) {
    while (this.nextIndex < this.notesData.length) {
      const data = this.notesData[this.nextIndex];
      if (data.time - currentTimeMs <= this.lookaheadMs) {
        this.pool.acquire(data, this.nextId++);
        this.nextIndex++;
      } else {
        break;
      }
    }
    const active = this.pool.active;
    for (let i = active.length - 1; i >= 0; i--) {
      const n = active[i];
      const endTime = n.type === 'hold' ? n.time + n.duration : n.time;
      if (n.state === 'hit' || n.state === 'missed') {
        if (currentTimeMs > endTime + this.cleanupAfterMs) {
          this.pool.release(n);
        }
      }
    }
  }

  getActiveNotes() {
    return this.pool.active;
  }

  reset() {
    this.nextIndex = 0;
    this.nextId = 0;
    this.pool.releaseAll();
  }

  get remaining() {
    return this.totalNotes - this.nextIndex + this.pool.active.length;
  }
}

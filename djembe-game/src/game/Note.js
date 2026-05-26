/**
 * Note.js - 단일 노트 객체 (오브젝트 풀링용)
 */
export class Note {
  constructor() {
    this.reset();
  }

  reset() {
    this.time = 0;
    this.lane = 'bass';
    this.type = 'tap';
    this.duration = 0;
    this.state = 'upcoming';
    this.hitTime = 0;
    this.hitJudgment = null;
    this.holdReleased = false;
    this.holdTailJudgment = null;
    this.id = 0;
    this.rotation = 0;
  }

  init(data, id) {
    this.id = id;
    this.time = data.time;
    this.lane = data.lane;
    this.type = data.type || 'tap';
    this.duration = data.duration || 0;
    this.state = 'upcoming';
    this.hitTime = 0;
    this.hitJudgment = null;
    this.holdReleased = false;
    this.holdTailJudgment = null;
    this.rotation = 0;
  }

  /** 현재 노트의 Y 위치 (judgmentY에서 위로 올라간 만큼) */
  getYAt(currentTimeMs, scrollSpeed, judgmentY, screenH) {
    const dt = (this.time - currentTimeMs) / 1000;
    return judgmentY - dt * scrollSpeed;
  }

  isVisible(currentTimeMs, scrollSpeed, judgmentY, screenH) {
    const y = this.getYAt(currentTimeMs, scrollSpeed, judgmentY, screenH);
    if (this.type === 'hold') {
      const tailY = judgmentY - ((this.time + this.duration - currentTimeMs) / 1000) * scrollSpeed;
      return tailY < screenH + 100 && y > -100;
    }
    return y < screenH + 100 && y > -100;
  }
}

export class NotePool {
  constructor(size = 200) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < size; i++) this.pool.push(new Note());
  }

  acquire(data, id) {
    let n = this.pool.pop();
    if (!n) n = new Note();
    n.init(data, id);
    this.active.push(n);
    return n;
  }

  release(note) {
    const idx = this.active.indexOf(note);
    if (idx >= 0) this.active.splice(idx, 1);
    note.reset();
    this.pool.push(note);
  }

  releaseAll() {
    while (this.active.length > 0) this.release(this.active[0]);
  }
}

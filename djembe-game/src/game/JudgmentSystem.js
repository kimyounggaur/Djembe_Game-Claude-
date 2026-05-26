/**
 * JudgmentSystem.js - 입력과 노트를 매칭, Perfect/Great/Good/Miss 판정
 */
export const JUDGMENT_WINDOW = {
  perfect: 30,
  great: 60,
  good: 100
};

export const JUDGMENT_SCORE = {
  perfect: 1000,
  great: 700,
  good: 300,
  miss: 0
};

export const JUDGMENT_ACCURACY = {
  perfect: 100,
  great: 75,
  good: 50,
  miss: 0
};

export class JudgmentSystem {
  constructor() {
    this.onJudgment = null;
    this.missGraceMs = 100;
  }

  /**
   * 사용자가 lane을 눌렀을 때 호출
   * @returns {{judgment, deltaMs, note}|null}
   */
  handleInput(lane, inputTimeMs, activeNotes) {
    let best = null;
    let bestDelta = Infinity;
    for (const note of activeNotes) {
      if (note.lane !== lane) continue;
      if (note.state !== 'upcoming') continue;
      if (note.type === 'hold' && note.state === 'active') continue;
      const delta = inputTimeMs - note.time;
      if (Math.abs(delta) < Math.abs(bestDelta) && Math.abs(delta) <= JUDGMENT_WINDOW.good + 50) {
        bestDelta = delta;
        best = note;
      }
    }
    if (!best) return null;
    const abs = Math.abs(bestDelta);
    let judgment;
    if (abs <= JUDGMENT_WINDOW.perfect) judgment = 'perfect';
    else if (abs <= JUDGMENT_WINDOW.great) judgment = 'great';
    else if (abs <= JUDGMENT_WINDOW.good) judgment = 'good';
    else return null;
    best.state = best.type === 'hold' ? 'active' : 'hit';
    best.hitTime = inputTimeMs;
    best.hitJudgment = judgment;
    const result = { judgment, deltaMs: bestDelta, note: best, lane };
    if (this.onJudgment) this.onJudgment(result);
    return result;
  }

  /**
   * Hold 노트의 tail 판정 (key release 시)
   */
  handleHoldRelease(lane, releaseTimeMs, activeNotes) {
    for (const note of activeNotes) {
      if (note.lane !== lane) continue;
      if (note.type !== 'hold') continue;
      if (note.state !== 'active') continue;
      const tailTime = note.time + note.duration;
      const delta = releaseTimeMs - tailTime;
      const abs = Math.abs(delta);
      let judgment;
      if (abs <= JUDGMENT_WINDOW.perfect) judgment = 'perfect';
      else if (abs <= JUDGMENT_WINDOW.great) judgment = 'great';
      else if (abs <= JUDGMENT_WINDOW.good + 50) judgment = 'good';
      else judgment = 'miss';
      note.holdReleased = true;
      note.holdTailJudgment = judgment;
      note.state = 'hit';
      if (this.onJudgment) this.onJudgment({ judgment, deltaMs: delta, note, lane, isTail: true });
      return judgment;
    }
    return null;
  }

  /**
   * 매 프레임 호출: 판정선을 지나가버린 노트를 Miss 처리
   */
  checkMissed(currentTimeMs, activeNotes) {
    const missed = [];
    for (const note of activeNotes) {
      if (note.state === 'upcoming' && currentTimeMs > note.time + this.missGraceMs) {
        note.state = 'missed';
        note.hitJudgment = 'miss';
        missed.push({ judgment: 'miss', deltaMs: currentTimeMs - note.time, note, lane: note.lane });
        if (this.onJudgment) this.onJudgment(missed[missed.length - 1]);
      } else if (note.state === 'active' && note.type === 'hold') {
        const tailTime = note.time + note.duration;
        if (currentTimeMs > tailTime + JUDGMENT_WINDOW.good + 50 && !note.holdReleased) {
          note.holdReleased = true;
          note.holdTailJudgment = 'miss';
          note.state = 'hit';
          if (this.onJudgment) this.onJudgment({ judgment: 'miss', deltaMs: currentTimeMs - tailTime, note, lane: note.lane, isTail: true });
        }
      }
    }
    return missed;
  }
}

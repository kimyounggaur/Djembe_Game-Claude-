/**
 * InputManager.js - 키보드/터치/포인터를 통합된 lane 입력으로 변환
 *
 * Why: 모바일은 touchstart, 데스크탑은 keydown 사용. 이벤트 발생 시점에 audioContext.currentTime을 즉시 캡처해야 input lag 보정 가능.
 */
export class InputManager {
  constructor(audioEngine, settings) {
    this.engine = audioEngine;
    this.settings = settings;
    this.listeners = new Set();
    this.keyMap = settings.keyMap;
    this.inputOffset = settings.inputOffset || 0;
    this.activeLanes = new Set();
    this.touchLaneByPointer = new Map();
    this.canvasRef = null;
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onWheel = this._onWheel.bind(this);
  }

  setKeyMap(map) { this.keyMap = map; }
  setInputOffset(ms) { this.inputOffset = ms; }

  attach(canvas) {
    this.canvasRef = canvas;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    canvas.style.touchAction = 'none';
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    if (this.canvasRef) {
      this.canvasRef.removeEventListener('pointerdown', this._onPointerDown);
      this.canvasRef.removeEventListener('pointerup', this._onPointerUp);
      this.canvasRef.removeEventListener('pointercancel', this._onPointerUp);
      this.canvasRef.removeEventListener('pointermove', this._onPointerMove);
      this.canvasRef.removeEventListener('wheel', this._onWheel);
    }
  }

  _onPointerMove(e) {
    if (!this.canvasRef) return;
    const rect = this.canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this._dispatch({ type: 'move', x, y, source: 'pointer' });
  }

  _onWheel(e) {
    e.preventDefault();
    const rect = this.canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this._dispatch({ type: 'wheel', x, y, dx: e.deltaX, dy: e.deltaY, source: 'wheel' });
  }

  _laneFromKey(code) {
    if (code === this.keyMap.slap) return 'slap';
    if (code === this.keyMap.bass) return 'bass';
    if (code === this.keyMap.tone) return 'tone';
    return null;
  }

  _laneFromX(x, w) {
    const r = x / w;
    if (r < 0.34) return 'slap';
    if (r < 0.67) return 'bass';
    return 'tone';
  }

  _onKeyDown(e) {
    if (e.repeat) return;
    const lane = this._laneFromKey(e.code);
    if (!lane) {
      this._dispatchKey(e.code, true);
      return;
    }
    e.preventDefault();
    const t = this.engine.currentTime - (this.inputOffset / 1000);
    this.activeLanes.add(lane);
    this._dispatch({ type: 'down', lane, time: t, source: 'key' });
  }

  _onKeyUp(e) {
    const lane = this._laneFromKey(e.code);
    if (!lane) {
      this._dispatchKey(e.code, false);
      return;
    }
    this.activeLanes.delete(lane);
    const t = this.engine.currentTime - (this.inputOffset / 1000);
    this._dispatch({ type: 'up', lane, time: t, source: 'key' });
  }

  _onPointerDown(e) {
    const rect = this.canvasRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const lane = this._laneFromX(x, rect.width);
    if (!lane) return;
    const t = this.engine.currentTime - (this.inputOffset / 1000);
    this.activeLanes.add(lane);
    this.touchLaneByPointer.set(e.pointerId, lane);
    this._dispatch({ type: 'down', lane, time: t, source: 'touch', x: x, y: e.clientY - rect.top });
    if (navigator.vibrate && this.settings.haptic) navigator.vibrate(10);
  }

  _onPointerUp(e) {
    const lane = this.touchLaneByPointer.get(e.pointerId);
    if (!lane) return;
    this.touchLaneByPointer.delete(e.pointerId);
    this.activeLanes.delete(lane);
    const t = this.engine.currentTime - (this.inputOffset / 1000);
    this._dispatch({ type: 'up', lane, time: t, source: 'touch' });
  }

  _dispatch(evt) {
    this.listeners.forEach(fn => fn(evt));
  }

  _dispatchKey(code, isDown) {
    this.listeners.forEach(fn => fn({ type: isDown ? 'keydown' : 'keyup', code, time: this.engine.currentTime }));
  }

  on(fn) { this.listeners.add(fn); }
  off(fn) { this.listeners.delete(fn); }
}

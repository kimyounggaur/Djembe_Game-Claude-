/**
 * SceneManager.js - Scene 전환 (fade in/out 트랜지션)
 */
export class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.current = null;
    this.next = null;
    this.transitioning = false;
    this.fadeAlpha = 0;
    this.fadeDir = 0;
    this.fadeDuration = 250;
    this.fadeElapsed = 0;
    this.history = [];
  }

  register(name, scene) {
    this.scenes.set(name, scene);
  }

  get(name) {
    return this.scenes.get(name);
  }

  goTo(name, data, opts = {}) {
    if (!this.scenes.has(name)) {
      console.error(`Scene ${name} not found`);
      return;
    }
    if (this.transitioning) return;
    if (opts.skipTransition) {
      this._immediateSwap(name, data);
      return;
    }
    this.next = { name, data };
    this.transitioning = true;
    this.fadeDir = 1;
    this.fadeElapsed = 0;
  }

  _immediateSwap(name, data) {
    if (this.current) this.current.onExit && this.current.onExit();
    if (this.current) this.history.push(this.current.name || '');
    const scene = this.scenes.get(name);
    scene.name = name;
    scene.manager = this;
    scene.onEnter && scene.onEnter(data || {});
    this.current = scene;
  }

  back() {
    if (this.history.length > 0) {
      const name = this.history.pop();
      this.goTo(name, null, { skipTransition: false });
    }
  }

  update(dt) {
    if (this.transitioning) {
      this.fadeElapsed += dt * 1000;
      const p = Math.min(1, this.fadeElapsed / this.fadeDuration);
      if (this.fadeDir > 0) {
        this.fadeAlpha = p;
        if (p >= 1) {
          if (this.current) this.current.onExit && this.current.onExit();
          if (this.current) this.history.push(this.current.name);
          const scene = this.scenes.get(this.next.name);
          scene.name = this.next.name;
          scene.manager = this;
          scene.onEnter && scene.onEnter(this.next.data || {});
          this.current = scene;
          this.next = null;
          this.fadeDir = -1;
          this.fadeElapsed = 0;
        }
      } else {
        this.fadeAlpha = 1 - p;
        if (p >= 1) {
          this.fadeAlpha = 0;
          this.fadeDir = 0;
          this.transitioning = false;
        }
      }
    }
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(ctx, w, h) {
    if (this.current && this.current.render) this.current.render(ctx, w, h);
    if (this.fadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  handleInput(evt) {
    if (this.current && this.current.handleInput) this.current.handleInput(evt);
  }

  resize(w, h) {
    if (this.current && this.current.onResize) this.current.onResize(w, h);
  }
}

/**
 * AssetLoader.js - 이미지/오디오 사전 로딩 + 진행률
 */
export class AssetLoader {
  constructor(sampleBank) {
    this.bank = sampleBank;
    this.images = new Map();
    this.progress = 0;
    this.total = 0;
    this.loaded = 0;
  }

  async loadImage(name, url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(name, img);
        this._tick();
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Image ${name} failed to load: ${url}`);
        this.images.set(name, null);
        this._tick();
        resolve(null);
      };
      img.src = url;
    });
  }

  async loadSound(name, url) {
    await this.bank.load(name, url);
    this._tick();
  }

  _tick() {
    this.loaded += 1;
    this.progress = this.total > 0 ? this.loaded / this.total : 1;
    if (this.onProgress) this.onProgress(this.progress);
  }

  getImage(name) {
    return this.images.get(name);
  }

  async loadAll(manifest, onProgress) {
    this.onProgress = onProgress;
    this.total = (manifest.images?.length || 0) + (manifest.sounds?.length || 0);
    this.loaded = 0;
    const tasks = [];
    (manifest.images || []).forEach(([name, url]) => tasks.push(this.loadImage(name, url)));
    (manifest.sounds || []).forEach(([name, url]) => tasks.push(this.loadSound(name, url)));
    await Promise.all(tasks);
  }
}

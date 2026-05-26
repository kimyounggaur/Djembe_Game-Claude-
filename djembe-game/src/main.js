/**
 * main.js - 엔트리 포인트
 */
import { GameApp } from './core/GameApp.js';

const canvas = document.getElementById('game');
const splash = document.getElementById('splash');
const app = new GameApp(canvas);
app.start();
if (splash) splash.style.display = 'none';

window.djembeApp = app;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((e) => {
      console.warn('SW registration failed', e);
    });
  });
}

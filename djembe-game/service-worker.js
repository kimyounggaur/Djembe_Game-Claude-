/**
 * service-worker.js - PWA 오프라인 캐싱 (Cache First)
 */
const CACHE_VERSION = 'djembe-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/main.js',
  './src/core/GameApp.js',
  './src/core/SceneManager.js',
  './src/core/InputManager.js',
  './src/core/AssetLoader.js',
  './src/audio/AudioEngine.js',
  './src/audio/SampleBank.js',
  './src/audio/Conductor.js',
  './src/game/Note.js',
  './src/game/NoteSpawner.js',
  './src/game/JudgmentSystem.js',
  './src/game/ScoreSystem.js',
  './src/game/ChartLoader.js',
  './src/scenes/Scene.js',
  './src/scenes/LoadingScene.js',
  './src/scenes/TitleScene.js',
  './src/scenes/SongSelectScene.js',
  './src/scenes/CountdownScene.js',
  './src/scenes/PlayScene.js',
  './src/scenes/ResultScene.js',
  './src/scenes/SettingsScene.js',
  './src/scenes/CalibrationScene.js',
  './src/scenes/TutorialScene.js',
  './src/scenes/AchievementScene.js',
  './src/scenes/AboutScene.js',
  './src/ui/ParticleSystem.js',
  './src/ui/Theme.js',
  './src/utils/Storage.js',
  './src/utils/i18n.js',
  './src/utils/MathUtils.js',
  './assets/images/djembe-main.png',
  './assets/images/djembe-icon.png',
  './assets/images/djembe-realistic.png',
  './assets/images/note-slap.png',
  './assets/images/note-bass.png',
  './assets/images/note-tone.png',
  './assets/sounds/slap.wav',
  './assets/sounds/bass.wav',
  './assets/sounds/tone.wav',
  './assets/songs.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(CORE_ASSETS.map((u) => cache.add(u).catch((err) => console.warn('cache fail', u, err))))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

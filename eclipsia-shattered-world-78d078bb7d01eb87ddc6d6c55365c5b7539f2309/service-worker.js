/**
 * Eclipsia service worker — precaches the app shell so the game runs offline.
 * Strategy: network-first (so new versions reach players immediately), falling back to
 * the cache when offline. Bump CACHE_VERSION whenever shipped files change.
 */
const CACHE_VERSION = 'eclipsia-v0.2.0';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/layout.css',
  './css/ui.css',
  './css/menus.css',
  './css/mobile.css',
  './js/main.js',
  './js/core/Game.js',
  './js/core/GameLoop.js',
  './js/core/Renderer.js',
  './js/core/SceneManager.js',
  './js/core/InputManager.js',
  './js/core/TouchControls.js',
  './js/core/AssetManager.js',
  './js/core/AudioManager.js',
  './js/core/Camera.js',
  './js/core/Settings.js',
  './js/scenes/Scene.js',
  './js/scenes/MainMenuScene.js',
  './js/scenes/OverworldScene.js',
  './js/scenes/UIScene.js',
  './js/entities/Player.js',
  './js/entities/NPC.js',
  './js/entities/CharacterConstants.js',
  './js/systems/InteractionSystem.js',
  './js/ui/InteractionIndicator.js',
  './js/ui/DialogueBox.js',
  './js/systems/CollisionSystem.js',
  './js/render/PlaceholderArt.js',
  './js/ui/MenuList.js',
  './js/ui/SettingsPanel.js',
  './js/utils/MathUtils.js',
  './js/utils/DataUtils.js',
  './data/objects.json',
  './data/maps/ashenveil_village.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('eclipsia-') && k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});

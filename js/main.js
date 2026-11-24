/**
 * Entry point: boots the Game, reports loading progress and registers the
 * service worker for offline play.
 */
import { Game } from './core/Game.js';

const bootScreen = document.getElementById('boot-screen');
const bootProgress = document.getElementById('boot-progress');
const bootText = document.getElementById('boot-text');
const errorScreen = document.getElementById('error-screen');
const errorMessage = document.getElementById('error-message');

function showError(err) {
  console.error(err);
  errorMessage.textContent = err?.stack || err?.message || String(err);
  errorScreen.hidden = false;
  bootScreen.classList.add('is-done');
}

document.getElementById('error-reload').addEventListener('click', () => location.reload());
window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

async function boot() {
  const game = new Game({
    canvas: document.getElementById('game-canvas'),
    onProgress: (p, text) => {
      bootProgress.style.width = `${Math.round(p * 100)}%`;
      if (text) bootText.textContent = text;
    },
    onFatal: showError,
  });
  await game.init();
  bootScreen.classList.add('is-done');
  setTimeout(() => bootScreen.remove(), 500);
  // Exposed for debugging in the browser console only.
  window.__eclipsia = game;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  // When an updated service worker takes over, reload once so the new version is used.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

registerServiceWorker();
boot().catch(showError);

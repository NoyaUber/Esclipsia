/**
 * Eclipsia service worker — precaches the app shell so the game runs offline.
 * Strategy: network-first (so new versions reach players immediately), falling back to
 * the cache when offline. Bump CACHE_VERSION whenever shipped files change.
 */
const CACHE_VERSION = 'eclipsia-v1.1.0';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/layout.css',
  './css/ui.css',
  './css/menus.css',
  './css/mobile.css',
  './css/eidolon.css',
  './js/scenes/BattleScene.js',
  './js/battle/BattleManager.js',
  './js/battle/BattleStateMachine.js',
  './js/battle/TurnManager.js',
  './js/battle/DamageCalculator.js',
  './js/battle/EnemyAI.js',
  './js/battle/BattleResultManager.js',
  './js/data/skills.js',
  './js/data/elementalChart.js',
  './js/data/statusEffects.js',
  './js/data/battleBalance.js',
  './js/data/progressionConfig.js',
  './js/data/experienceCurves.js',
  './js/data/skillLearning.js',
  './js/data/evolutions.js',
  './js/data/evolutionItems.js',
  './js/data/quests.js',
  './js/systems/StatGrowthSystem.js',
  './js/systems/ExperienceManager.js',
  './js/systems/LevelUpManager.js',
  './js/systems/SkillLearningManager.js',
  './js/systems/EvolutionManager.js',
  './js/ui/LevelUpUI.js',
  './js/ui/SkillLearningUI.js',
  './js/ui/SkillReplacementUI.js',
  './js/ui/EvolutionUI.js',
  './js/ui/EvolutionAnimation.js',
  './js/systems/SkillSystem.js',
  './js/systems/ElementSystem.js',
  './js/systems/StatusEffectSystem.js',
  './js/main.js',
  './js/core/Game.js',
  './js/data/eidolons.js',
  './js/data/encounters.js',
  './js/data/soulSigils.js',
  './js/systems/EidolonInstance.js',
  './js/systems/PartyManager.js',
  './js/systems/StorageManager.js',
  './js/systems/BestiaryManager.js',
  './js/systems/EncounterSystem.js',
  './js/systems/CaptureSystem.js',
  './js/systems/EidolonSaveAdapter.js',
  './js/systems/StoryFlagManager.js',
  './js/systems/QuestManager.js',
  './js/data/questRewards.js',
  './js/systems/QuestRewardManager.js',
  './js/systems/WorldStateManager.js',
  './js/systems/DungeonManager.js',
  './js/systems/DungeonRoomManager.js',
  './js/data/dungeons.js',
  './js/data/worldState.js',
  './js/systems/QuestObjectiveTracker.js',
  './js/systems/GameEventBus.js',
  './js/systems/EidolonManager.js',
  './js/ui/EidolonUI.js',
  './js/render/EidolonArtPhase4.js',
  './js/render/EidolonArt.js',
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
  './data/maps/ashenveil_forest.json',
  './data/maps/forgotten_chapel_entrance.json',
  './data/maps/chapel_room_01_entrance.json',
  './data/maps/chapel_room_02_main_hall.json',
  './data/maps/chapel_room_03_library.json',
  './data/maps/chapel_room_04_sanctuary.json',
  './data/maps/chapel_room_05_sealed_chamber.json',
  './data/maps/chapel_room_06_ancient_sanctum.json',
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

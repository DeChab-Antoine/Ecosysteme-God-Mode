import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderers/createRenderer.js";
import { createViewState } from "./viewState.js";
import { spawnPoisonPlantAt } from "./systems/plantSystem.js";
import { spawnInitialAliens, makeAlien } from "./systems/alienSpawnSystem.js";
import { spawnInitialBlobs, makeBlob, updateBlobDay } from "./systems/blobSystem.js";
import { updateAlienDay } from "./systems/alienSystem.js";
import { createPopulationChart } from "./ui/populationChart.js";
import { cellKey } from "./systems/worldOps.js";
import { createAudioManager } from "./audio/audioManager.js";
import { createIntroScreen } from "./ui/introScreen.js";
import { createShopBar } from "./ui/shopBar.js";
import { createWinLoseScreen } from "./ui/winLoseScreen.js";

// =========================
// Eléments DOM
// =========================
const canvas = document.getElementById("game");
const eventLogEl = document.getElementById("eventLog");
const speedBadgeEl = document.getElementById("speedBadge");
const pauseBadgeEl = document.getElementById("pauseBadge");
const phaseLabelEl = document.getElementById("phaseLabel");
const countAliensEl = document.getElementById("countAliens");
const countBlobsEl  = document.getElementById("countBlobs");

// =========================
// Etat de vue + config centralisée
// =========================
const viewState = createViewState();
const SHOP_COSTS  = viewState.config.shop.costs;
const WIN_ALIENS  = viewState.config.shop.winAliens;
const LOSE_ALIENS = viewState.config.shop.loseAliens;
const GRACE_TICKS = viewState.config.shop.graceTicks;

// =========================
// Création du monde
// =========================
const world = createWorld({
  gridW: viewState.config.world.gridW,
  gridH: viewState.config.world.gridH,
  dayTicks: viewState.config.world.dayTicks,
  nightTicks: viewState.config.world.nightTicks,
  seed: crypto.getRandomValues(new Uint32Array(1))[0],
});

world.rand = mulberry32(world.seed);
world.maxBlobs = viewState.config.initialBlobs.maxBlobs;

// =========================
// Renderer + audio
// =========================
const renderer = createRenderer(canvas, world, viewState);
const audio = createAudioManager();

// =========================
// Spawn initial
// =========================
spawnInitialAliens(world, viewState.config.initialAliens);
spawnInitialBlobs(world, viewState.config.initialBlobs);

// =========================
// Graphes de population
// =========================
const MAX_POINTS = 300;
const popChart = createPopulationChart();

// =========================
// Journal d'événements
// =========================
const eventMessages = [];

function logEvent(msg) {
  eventMessages.unshift(msg);
  if (eventMessages.length > 7) eventMessages.pop();
  if (eventLogEl) {
    eventLogEl.innerHTML = eventMessages
      .map((m) => `<div class="evt">${m}</div>`)
      .join("");
  }
}

// =========================
// UI stats
// =========================
function updateStatsUI(phase) {
  const isNight = phase.name === "NIGHT";
  if (phaseLabelEl) {
    phaseLabelEl.textContent = isNight ? `Nuit — Jour ${world.day}` : `Jour ${world.day}`;
    phaseLabelEl.className = isNight ? "night" : "";
  }
  if (countAliensEl) countAliensEl.textContent = world.aliens.size;
  if (countBlobsEl)  countBlobsEl.textContent  = world.blobs.size;
  if (speedBadgeEl)  speedBadgeEl.textContent   = `×${viewState.speedMultiplier}`;
  if (pauseBadgeEl)  pauseBadgeEl.style.display  = viewState.paused ? "inline-block" : "none";
}

// =========================
// Phase jour / nuit
// =========================
function getPhase() {
  if (viewState.forceNight) {
    return { name: "NIGHT", tInPhase: 0, duration: 1 };
  }
  const cycle = world.dayTicks + world.nightTicks;
  const t = world.tick % cycle;
  if (t < world.dayTicks) {
    return { name: "DAY", tInPhase: t, duration: world.dayTicks };
  }
  return { name: "NIGHT", tInPhase: t - world.dayTicks, duration: world.nightTicks };
}

// =========================
// Placement de plante poison via shop
// =========================
function tryPlacePoisonPlant(x, y) {
  const gx = Math.max(0, Math.min(world.gridW - 1, x));
  const gy = Math.max(0, Math.min(world.gridH - 1, y));
  return spawnPoisonPlantAt(world, gx, gy);
}

// =========================
// Gestion pause / vitesse
// =========================
const BASE_TICK_MS = viewState.config.timing.tickMs;
let gameInterval = null;

function applySpeed(multiplier) {
  viewState.speedMultiplier = multiplier;
  if (gameInterval !== null) {
    clearInterval(gameInterval);
    gameInterval = setInterval(tick, Math.floor(BASE_TICK_MS / multiplier));
  }
  logEvent(`Vitesse ×${multiplier}`);
}

// =========================
// Contrôles clavier
// =========================
function setupKeyboard() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      viewState.paused = !viewState.paused;
      audio.resume();
      logEvent(viewState.paused ? "Simulation en pause" : "Simulation reprise");
      return;
    }
    if (e.code === "Digit1") { applySpeed(1); return; }
    if (e.code === "Digit2") { applySpeed(2); return; }
    if (e.code === "Digit3") { applySpeed(4); return; }
  });
}

// =========================
// Tick principal
// =========================
let shopBar = null;
let winLoseScreen = null;

function tick() {
  if (viewState.paused) {
    audio.stopAllBlobSteps();
    renderer.renderWorld(world, viewState);
    return;
  }

  // Vider les événements de kill poison du tick précédent
  world.poisonKillEvents.length = 0;

  viewState._alienCount = world.aliens.size;
  if (shopBar) shopBar.refresh();

  // Graphique — échantillonnage toutes les 5 ticks
  if (world.tick % 5 === 0) {
    popChart.pushPoint(world.tick, world.aliens.size, world.blobs.size);
    popChart.keepLast(MAX_POINTS);
  }

  // Vérification victoire / défaite
  if (!viewState.gameOver && world.tick > GRACE_TICKS) {
    if (world.aliens.size === WIN_ALIENS) {
      viewState.gameOver = true;
      viewState.paused = true;
      if (winLoseScreen) winLoseScreen.showWin();
      audio.playDeath();
      logEvent(`VICTOIRE — tous les aliens ont été éliminés !`);
    } else if (world.aliens.size >= LOSE_ALIENS) {
      viewState.gameOver = true;
      viewState.paused = true;
      if (winLoseScreen) winLoseScreen.showLose();
      audio.playBirth();
      logEvent(`DÉFAITE — les aliens ont envahi la planète (${LOSE_ALIENS}) !`);
    }
  }

  const phase = getPhase();
  const wasNight = viewState.isNight;
  viewState.isNight = phase.name === "NIGHT";

  if (!wasNight && viewState.isNight) {
    audio.playDayNight();
  }

  if (phase.name === "DAY") {
    const alienIdsBefore = new Set(world.aliens.keys());
    for (const alien of world.aliens.values()) {
      const prevAction = alien.lastAction;
      updateAlienDay(world, alien);
      if (alien.lastAction !== prevAction && alien.lastAction?.tick === world.tick) {
        const vol = renderer.getAudioVolume ? renderer.getAudioVolume(alien.x, alien.y) : 1;
        if (alien.lastAction.type === "eatBlob") audio.playEatBlob(vol * 0.55);
      }
    }
    for (const [id, alien] of world.aliens.entries()) {
      if (!alienIdsBefore.has(id)) {
        const vol = renderer.getAudioVolume ? renderer.getAudioVolume(alien.x, alien.y) : 1;
        audio.playBirth(vol * 0.45);
      }
    }

    const blobIdsBefore = new Set(world.blobs.keys());
    const movingBlobs = new Set();
    for (const [id, blob] of world.blobs.entries()) {
      const prevX = blob.x;
      const prevY = blob.y;
      updateBlobDay(world, blob);
      const vol = renderer.getAudioVolume ? renderer.getAudioVolume(blob.x, blob.y) : 1;
      if (blob.x !== prevX || blob.y !== prevY) {
        movingBlobs.add(id);
        audio.startBlobStep(id, vol * 0.3);
      }
    }
    for (const [id, blob] of world.blobs.entries()) {
      if (!blobIdsBefore.has(id)) {
        const vol = renderer.getAudioVolume ? renderer.getAudioVolume(blob.x, blob.y) : 1;
        audio.playBirth(vol * 0.45);
      }
    }
    audio.stopBlobStepsExcept(movingBlobs);

    // Récompenses pour les kills par poison
    for (const evt of world.poisonKillEvents) {
      if (evt.type === "alien") {
        viewState.points += 10;
        logEvent(`Alien empoisonné ! (+10 pts)`);
      } else if (evt.type === "blob") {
        viewState.points += 5;
        logEvent(`Blob empoisonné (+5 pts)`);
      }
    }
    if (world.poisonKillEvents.length > 0 && shopBar) shopBar.refresh();

  } else {
    audio.stopAllBlobSteps();
    if (phase.tInPhase === 0) {
      let deadCount = 0;
      for (const [id, alien] of world.aliens.entries()) {
        if (alien.E <= 0) {
          const vol = renderer.getAudioVolume ? renderer.getAudioVolume(alien.x, alien.y) : 1;
          audio.playDeath(vol * 0.5);
          const key = cellKey(world, alien.x, alien.y);
          world.occupiedAliens.delete(key);
          world.aliens.delete(id);
          deadCount++;
        }
      }
      if (deadCount > 0) {
        logEvent(`${deadCount} alien(s) ont disparu cette nuit`);
      }

      world.day++;
    }
  }

  updateStatsUI(phase);
  renderer.renderWorld(world, viewState);
  world.tick++;
}

// =========================
// Démarrage du jeu (après écran d'intro)
// =========================
function startGame() {
  audio.resume();
  audio.startAmbient();

  setupKeyboard();

  shopBar = createShopBar(viewState, (isCameraMode) => {
    if (renderer.setCameraControl) renderer.setCameraControl(isCameraMode);
  });
  shopBar.refresh();
  // Démarre en mode caméra (par défaut)
  if (renderer.setCameraControl) renderer.setCameraControl(true);

  winLoseScreen = createWinLoseScreen(() => {
    location.reload();
  });

  // Clic droit → annuler sélection + retour mode caméra
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (viewState.selectedShopItem) {
      viewState.selectedShopItem = null;
      viewState.cameraMode = true;
      if (renderer.setCameraControl) renderer.setCameraControl(true);
      shopBar.refresh();
    }
  });

  // Clic sur terrain → placer la plante poison sélectionnée
  if (renderer.setGroundClickCallback) {
    renderer.setGroundClickCallback((x, z) => {
      const entity = viewState.selectedShopItem;
      if (!entity) return;
      const cost = SHOP_COSTS[entity];
      if (viewState.points < cost) return;

      let placed = false;
      const spawnVol = renderer.getAudioVolume ? renderer.getAudioVolume(x, z) : 1;
      if (entity === "poisonPlant") {
        placed = tryPlacePoisonPlant(x, z);
        if (placed) audio.playSpawn(spawnVol * 0.5);
      }

      if (placed) {
        viewState.points -= cost;
        logEvent(`Poison posé en (${x}, ${z}) (-${cost} pts)`);
        shopBar.refresh();
      }
    });
  }

  logEvent("Bienvenue — vous êtes le Dieu de ce monde.");

  gameInterval = setInterval(tick, BASE_TICK_MS);
}

// =========================
// Lancement de l'écran d'intro
// =========================
createIntroScreen(startGame);

import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderers/createRenderer.js";
import { createViewState } from "./viewState.js";
import { spawnPoisonPlantAt, spawnRagePlantAt } from "./systems/plantSystem.js";
import { spawnInitialAliens } from "./systems/alienSpawnSystem.js";
import { spawnInitialBlobs, updateBlobDay } from "./systems/blobSystem.js";
import { updateAlienDay } from "./systems/alienSystem.js";
import { updateAlien2Day } from "./systems/alien2System.js";
import { createPopulationChart } from "./ui/populationChart.js";
import { cellKey } from "./systems/worldOps.js";
import { createAudioManager } from "./audio/audioManager.js";
import { createIntroScreen } from "./ui/introScreen.js";
import { createShopBar } from "./ui/shopBar.js";
import { createWinLoseScreen } from "./ui/winLoseScreen.js";

// =========================
// Eléments DOM
// =========================
const canvas      = document.getElementById("game");
const eventLogEl  = document.getElementById("eventLog");
const speedBadgeEl = document.getElementById("speedBadge");
const pauseBadgeEl = document.getElementById("pauseBadge");
const phaseLabelEl = document.getElementById("phaseLabel");
const countAliensEl  = document.getElementById("countAliens");
const countAlien2sEl = document.getElementById("countAlien2s");
const countBlobsEl   = document.getElementById("countBlobs");
const achievementsListEl = document.getElementById("achievementsList");

// =========================
// Etat de vue + config centralisée
// =========================
const viewState   = createViewState();
const SHOP_COSTS      = viewState.config.shop.costs;
const SHOP_COOLDOWNS  = viewState.config.shop.cooldownTicks;
const WIN_ALIENS      = viewState.config.shop.winAliens;
const LOSE_ALIENS     = viewState.config.shop.loseAliens;
const GRACE_TICKS     = viewState.config.shop.graceTicks;
const NUKE_RADIUS     = 10;

// =========================
// Création du monde
// =========================
const world = createWorld({
  gridW:      viewState.config.world.gridW,
  gridH:      viewState.config.world.gridH,
  dayTicks:   viewState.config.world.dayTicks,
  nightTicks: viewState.config.world.nightTicks,
  seed: crypto.getRandomValues(new Uint32Array(1))[0],
});

world.rand     = mulberry32(world.seed);
world.maxBlobs = viewState.config.initialBlobs.maxBlobs;

// =========================
// Renderer + audio
// =========================
const renderer = createRenderer(canvas, world, viewState);
const audio    = createAudioManager();

// =========================
// Spawn initial
// =========================
spawnInitialAliens(world, viewState.config.initialAliens);
spawnInitialBlobs(world, viewState.config.initialBlobs);

// =========================
// Graphe de population
// =========================
const MAX_CHART_POINTS = 300;
const popChart = createPopulationChart();

// =========================
// Journal d'événements
// =========================
const eventMessages = [];

function logEvent(msg) {
  eventMessages.unshift(msg);
  if (eventMessages.length > 7) eventMessages.pop();
  if (eventLogEl) {
    eventLogEl.innerHTML = eventMessages.map((m) => `<div class="evt">${m}</div>`).join("");
  }
}

// =========================
// Succes
// =========================
let hadMutation = false; // vrai dès qu'un alien s'est transformé en mutant

const ACHIEVEMENTS = [
  {
    id: "poison_master",
    name: "Piege toxique",
    desc: "Empoisonner 5 aliens",
    reward: 35,
    isDone: () => viewState.achievementStats.poisonAlienKills >= 5,
    progress: () => `${Math.min(viewState.achievementStats.poisonAlienKills, 5)}/5`,
  },
  {
    id: "perfect_nuke",
    name: "Frappe chirurgicale",
    desc: "Tuer 4 aliens avec une seule frappe",
    reward: 45,
    isDone: () => viewState.achievementStats.bestNukeAlienKills >= 4,
    progress: () => `${Math.min(viewState.achievementStats.bestNukeAlienKills, 4)}/4`,
  },
  {
    id: "early_control",
    name: "Controle precoce",
    desc: "Descendre a 35 aliens avant le jour 5",
    reward: 50,
    isDone: () => world.day <= 5 && world.aliens.size + world.aliens2.size <= 35,
    progress: () => world.day <= 5 ? `${world.aliens.size + world.aliens2.size}/35` : "raté",
  },
  {
    id: "first_mutation",
    name: "Première mutation",
    desc: "⚗ Un alien absorbe une plante rage",
    reward: 0,
    isDone: () => hadMutation,
    progress: () => hadMutation ? "✓" : "0/1",
  },
  {
    id: "epidemic_contained",
    name: "Épidémie maîtrisée",
    desc: "☣ Éliminer tous les mutants",
    reward: 25,
    isDone: () => hadMutation && world.aliens2.size === 0,
    progress: () => hadMutation ? (world.aliens2.size === 0 ? "✓" : `${world.aliens2.size} restants`) : "aucun mutant",
  },
];

function renderAchievements() {
  if (!achievementsListEl) return;
  achievementsListEl.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const done = !!viewState.unlockedAchievements[achievement.id];
    return `
      <div class="achievement-item ${done ? "done" : ""}">
        <div class="achievement-icon">${done ? "OK" : "--"}</div>
        <div>
          <div class="achievement-name">${achievement.name}</div>
          <div class="achievement-desc">${achievement.desc} (${achievement.progress()})</div>
        </div>
        <div class="achievement-reward">+${achievement.reward}</div>
      </div>
    `;
  }).join("");
}

function checkAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    if (viewState.unlockedAchievements[achievement.id]) continue;
    if (!achievement.isDone()) continue;

    viewState.unlockedAchievements[achievement.id] = true;
    viewState.points += achievement.reward;
    logEvent(`Succes : ${achievement.name} (+${achievement.reward} pts)`);
  }
  renderAchievements();
}

// =========================
// UI stats
// =========================
function updateStatsUI(phase) {
  const isNight = phase.name === "NIGHT";
  if (phaseLabelEl) {
    phaseLabelEl.textContent = isNight ? `Nuit — Jour ${world.day}` : `Jour ${world.day}`;
    phaseLabelEl.className   = isNight ? "night" : "";
  }
  if (countAliensEl)  countAliensEl.textContent  = world.aliens.size;
  if (countAlien2sEl) countAlien2sEl.textContent = world.aliens2.size;
  if (countBlobsEl)   countBlobsEl.textContent   = world.blobs.size;
  if (speedBadgeEl)  speedBadgeEl.textContent  = `×${viewState.speedMultiplier}`;
  if (pauseBadgeEl)  pauseBadgeEl.style.display = viewState.paused ? "inline-block" : "none";
}

// =========================
// Phase jour / nuit
// =========================
function getPhase() {
  if (viewState.forceNight) return { name: "NIGHT", tInPhase: 0, duration: 1 };
  const cycle = world.dayTicks + world.nightTicks;
  const t = world.tick % cycle;
  if (t < world.dayTicks) return { name: "DAY",   tInPhase: t,                  duration: world.dayTicks };
  return                         { name: "NIGHT", tInPhase: t - world.dayTicks, duration: world.nightTicks };
}

// =========================
// Actions joueur
// =========================
function tryPlacePoisonPlant(x, y) {
  const gx = Math.max(0, Math.min(world.gridW - 1, x));
  const gy = Math.max(0, Math.min(world.gridH - 1, y));
  return spawnPoisonPlantAt(world, gx, gy);
}

function tryPlaceRagePlant(x, y) {
  const gx = Math.max(0, Math.min(world.gridW - 1, x));
  const gy = Math.max(0, Math.min(world.gridH - 1, y));
  return spawnRagePlantAt(world, gx, gy);
}

function fireNukeAt(x, y) {
  const r2 = NUKE_RADIUS * NUKE_RADIUS;
  let aliensKilled = 0;
  let blobsKilled  = 0;

  for (const [id, alien] of world.aliens.entries()) {
    const dx = alien.x - x, dy = alien.y - y;
    if (dx * dx + dy * dy <= r2) {
      world.occupiedAliens.delete(cellKey(world, alien.x, alien.y));
      world.aliens.delete(id);
      aliensKilled++;
    }
  }

  for (const [id, alien2] of world.aliens2.entries()) {
    const dx = alien2.x - x, dy = alien2.y - y;
    if (dx * dx + dy * dy <= r2) {
      world.occupiedAliens2.delete(cellKey(world, alien2.x, alien2.y));
      world.aliens2.delete(id);
      aliensKilled++;
    }
  }

  for (const [id, blob] of world.blobs.entries()) {
    const dx = blob.x - x, dy = blob.y - y;
    if (dx * dx + dy * dy <= r2) {
      world.occupiedBlobs.delete(cellKey(world, blob.x, blob.y));
      world.blobs.delete(id);
      blobsKilled++;
    }
  }

  world.nukeEvents.push({ x, y, radius: NUKE_RADIUS });
  return { aliensKilled, blobsKilled };
}

function isCoolingDown(entity) {
  return world.tick < (viewState.cooldownUntilTick[entity] ?? 0);
}

function setCooldown(entity) {
  viewState.cooldownUntilTick[entity] = world.tick + (SHOP_COOLDOWNS[entity] ?? 0);
}

// =========================
// Volume audio spatialisé
// =========================
function vol(x, y) {
  return renderer.getAudioVolume ? renderer.getAudioVolume(x, y) : 1;
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
let shopBar      = null;
let winLoseScreen = null;

function tick() {
  if (viewState.paused) {
    audio.stopAllBlobSteps();
    renderer.renderWorld(world, viewState);
    return;
  }

  world.poisonKillEvents.length = 0;

  // Reconstruction des sets d'occupation depuis les Maps d'entités.
  // Nécessaire car les entités du même type se traversent mutuellement (pas de blocage
  // inter-même-type dans moveTo), ce qui peut laisser des clés périmées dans les sets.
  world.occupiedAliens.clear();
  for (const a of world.aliens.values())  world.occupiedAliens.add(cellKey(world, a.x, a.y));
  world.occupiedAliens2.clear();
  for (const a of world.aliens2.values()) world.occupiedAliens2.add(cellKey(world, a.x, a.y));
  world.occupiedBlobs.clear();
  for (const b of world.blobs.values())   world.occupiedBlobs.add(cellKey(world, b.x, b.y));

  // Graphique — échantillonnage toutes les 5 ticks
  if (world.tick % 5 === 0) {
    popChart.pushPoint(world.tick, world.aliens.size, world.blobs.size, world.aliens2.size);
    popChart.keepLast(MAX_CHART_POINTS);
  }

  const phase    = getPhase();
  const wasNight = viewState.isNight;
  viewState.isNight = phase.name === "NIGHT";
  if (!wasNight && viewState.isNight) audio.playDayNight();

  // =========================
  // Phase Jour
  // =========================
  if (phase.name === "DAY") {

    // Mise à jour aliens
    const alienIdsBefore = new Set(world.aliens.keys());
    for (const alien of world.aliens.values()) {
      const prevAction = alien.lastAction;
      updateAlienDay(world, alien);
      if (alien.lastAction !== prevAction && alien.lastAction?.tick === world.tick) {
        if (alien.lastAction.type === "eatBlob") audio.playEatBlob(vol(alien.x, alien.y) * 0.55);
      }
    }
    for (const [id, alien] of world.aliens.entries()) {
      if (!alienIdsBefore.has(id)) audio.playBirth(vol(alien.x, alien.y) * 0.45);
    }

    // Détection transformation alien → alien2
    if (world.transformEvents.length > 0 && !hadMutation) {
      hadMutation = true;
    }
    for (const evt of world.transformEvents) {
      logEvent(`Mutation ! Un alien s'est transformé en mutant !`);
    }

    // Mise à jour mutants (alien2)
    const alien2IdsBefore = new Set(world.aliens2.keys());
    for (const alien2 of world.aliens2.values()) {
      const prevAction = alien2.lastAction;
      updateAlien2Day(world, alien2);
      if (alien2.lastAction !== prevAction && alien2.lastAction?.tick === world.tick) {
        if (alien2.lastAction.type === "attackAlien") {
          viewState.points += 5;
          audio.playDeath(vol(alien2.x, alien2.y) * 0.6);
          logEvent(`Mutant élimine un alien ! (+5 pts)`);
        }
      }
    }
    for (const [id, alien2] of world.aliens2.entries()) {
      if (!alien2IdsBefore.has(id)) audio.playBirth(vol(alien2.x, alien2.y) * 0.55);
    }

    // Mise à jour blobs
    const blobIdsBefore = new Set(world.blobs.keys());
    const movingBlobs   = new Set();
    for (const [id, blob] of world.blobs.entries()) {
      const prevX = blob.x, prevY = blob.y;
      updateBlobDay(world, blob);
      if (blob.x !== prevX || blob.y !== prevY) {
        movingBlobs.add(id);
        audio.startBlobStep(id, vol(blob.x, blob.y) * 0.3);
      }
    }
    for (const [id, blob] of world.blobs.entries()) {
      if (!blobIdsBefore.has(id)) audio.playBirth(vol(blob.x, blob.y) * 0.45);
    }
    audio.stopBlobStepsExcept(movingBlobs);

    // Kills par poison — son + points
    for (const evt of world.poisonKillEvents) {
      const v = vol(evt.x, evt.y);
      if (evt.type === "alien") {
        viewState.achievementStats.poisonAlienKills++;
        viewState.points += 10;
        audio.playDeath(v * 0.7);
        logEvent(`Alien empoisonné ! (+10 pts)`);
      } else if (evt.type === "alien2") {
        viewState.points += 15;
        audio.playDeath(v * 0.85);
        logEvent(`Mutant empoisonné ! (+15 pts)`);
      } else if (evt.type === "blob") {
        viewState.points += 5;
        audio.playDeath(v * 0.4);
        logEvent(`Blob empoisonné (+5 pts)`);
      }
    }

  // =========================
  // Phase Nuit
  // =========================
  } else {
    audio.stopAllBlobSteps();
    if (phase.tInPhase === 0) {
      let deadCount = 0;
      for (const [id, alien] of world.aliens.entries()) {
        if (alien.E <= 0) {
          audio.playDeath(vol(alien.x, alien.y) * 0.5);
          world.occupiedAliens.delete(cellKey(world, alien.x, alien.y));
          world.aliens.delete(id);
          deadCount++;
        }
      }
      // Les mutants (alien2) sont immortels — ils ne meurent pas la nuit.
      if (deadCount > 0) logEvent(`${deadCount} entité(s) ont disparu cette nuit`);
      world.day++;
    }
  }

  // Vérification victoire / défaite — après toutes les mises à jour du tick
  const totalAliens = world.aliens.size + world.aliens2.size;
  if (!viewState.gameOver && world.tick > GRACE_TICKS) {
    if (totalAliens === WIN_ALIENS) {
      viewState.gameOver = true;
      viewState.paused   = true;
      if (winLoseScreen) winLoseScreen.showWin();
      audio.playDeath();
      logEvent(`VICTOIRE — tous les aliens et mutants ont été éliminés !`);
    } else if (totalAliens >= LOSE_ALIENS) {
      viewState.gameOver = true;
      viewState.paused   = true;
      if (winLoseScreen) winLoseScreen.showLose();
      audio.playBirth();
      logEvent(`DÉFAITE — les aliens ont envahi la planète (${LOSE_ALIENS}) !`);
    }
  }

  // UI — une seule passe, après toutes les modifications d'état
  viewState._alienCount  = world.aliens.size + world.aliens2.size;
  viewState._alien2Count = world.aliens2.size;
  viewState._tick        = world.tick;
  checkAchievements();
  updateStatsUI(phase);
  if (shopBar) shopBar.refresh();

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
  if (renderer.setCameraControl) renderer.setCameraControl(true);

  winLoseScreen = createWinLoseScreen(() => location.reload());

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (viewState.selectedShopItem) {
      viewState.selectedShopItem = null;
      viewState.cameraMode = true;
      if (renderer.setCameraControl) renderer.setCameraControl(true);
      shopBar.refresh();
    }
  });

  if (renderer.setGroundClickCallback) {
    renderer.setGroundClickCallback((x, z) => {
      const entity = viewState.selectedShopItem;
      if (!entity) return;

      const cost = SHOP_COSTS[entity];
      if (viewState.points < cost) return;
      if (isCoolingDown(entity)) return;

      if (entity === "poisonPlant" && tryPlacePoisonPlant(x, z)) {
        viewState.points -= cost;
        setCooldown("poisonPlant");
        audio.playSpawn(vol(x, z) * 0.5);
        logEvent(`Poison posé (-${cost} pts)`);
        shopBar.refresh();
      }

      if (entity === "ragePlant" && tryPlaceRagePlant(x, z)) {
        viewState.points -= cost;
        setCooldown("ragePlant");
        audio.playSpawn(vol(x, z) * 0.5);
        logEvent(`Rage posée (-${cost} pts)`);
        shopBar.refresh();
      }

      if (entity === "nuke") {
        viewState.points -= cost;
        setCooldown("nuke");
        const { aliensKilled, blobsKilled } = fireNukeAt(x, z);
        viewState.achievementStats.bestNukeAlienKills = Math.max(
          viewState.achievementStats.bestNukeAlienKills,
          aliensKilled
        );
        viewState.points += aliensKilled * 10 + blobsKilled * 2;
        audio.playDeath(vol(x, z) * 1.1);
        const gain = aliensKilled * 10 + blobsKilled * 2 - cost;
        const gainStr = gain >= 0 ? `+${gain}` : `${gain}`;
        logEvent(`Frappe ! ${aliensKilled} aliens, ${blobsKilled} blobs (${gainStr} pts)`);
        checkAchievements();
        shopBar.refresh();
      }
    });
  }

  logEvent("Bienvenue — vous êtes le Dieu de ce monde.");
  renderAchievements();
  gameInterval = setInterval(tick, BASE_TICK_MS);
}

// =========================
// Lancement de l'écran d'intro
// =========================
createIntroScreen(startGame);

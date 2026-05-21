import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderers/createRenderer.js";
import { createViewState } from "./viewState.js";
import { updatePlantSpawns, updatePlantsAging } from "./systems/plantSystem.js";
import { spawnInitialAliens } from "./systems/alienSpawnSystem.js";
import { spawnInitialBlobs, updateBlobDay } from "./systems/blobSystem.js";
import { updateAlienDay } from "./systems/alienSystem.js";
import { createPopulationAliensChart, createPopulationBlobsChart } from "./ui/populationChart.js";
import { cellKey } from "./systems/worldOps.js";

const canvas = document.getElementById("game");
const statsSummaryEl = document.getElementById("statsSummary");

// =========================
// Etat de vue + config centralisée
// =========================
const viewState = createViewState();
const labels = viewState.config.labels;

// =========================
// Création du monde
// =========================
const world = createWorld({
  gridW: viewState.config.world.gridW,
  gridH: viewState.config.world.gridH,
  dayTicks: viewState.config.world.dayTicks,
  nightTicks: viewState.config.world.nightTicks,
  seed: crypto.getRandomValues(new Uint32Array(1))[0], // seed aléatoire
});

world.rand = mulberry32(world.seed);

// =========================
// Création du renderer actif
// =========================
const renderer = createRenderer(canvas, world, viewState);

// =========================
// Spawn initial
// =========================
spawnInitialAliens(world, viewState.config.initialAliens);
spawnInitialBlobs(world, viewState.config.initialBlobs);

// =========================
// Timing
// =========================
const TICK_MS = viewState.config.timing.tickMs;
const SAMPLE_EVERY = viewState.config.timing.sampleEvery;
const MAX_POINTS = viewState.config.timing.maxPoints;

// =========================
// UI stats
// =========================
function updateStatsUI(world, phase) {
  const alienCount = world.aliens.size;

  let avgE = 0;
  let avgEmax = 0;
  let avgAge = 0;
  let avgLifespan = 0;
  let avgR = 0;
  let avgEnergyDecayPerTick = 0;

  if (alienCount > 0) {
    for (const h of world.aliens.values()) {
      avgE += h.E;
      avgEmax += h.Emax;
      avgAge += h.age;
      avgLifespan += h.lifespan;
      avgR += h.R;
      avgEnergyDecayPerTick += h.energyDecayPerTick;
    }

    avgE /= alienCount;
    avgEmax /= alienCount;
    avgAge /= alienCount;
    avgLifespan /= alienCount;
    avgR /= alienCount;
    avgEnergyDecayPerTick /= alienCount;
  }

  const linesStats = [];
  linesStats.push(`Seed=${world.seed}`);
  linesStats.push(`day=${world.day}`);
  linesStats.push(`phase=${phase.name} (t=${phase.tInPhase}/${phase.duration})`);
  linesStats.push(`${labels.aliens}=${world.aliens.size}`);
  linesStats.push(`${labels.blobs}=${world.blobs.size}`);
  linesStats.push(`${labels.plants}=${world.plants.size}`);

  linesStats.push(`avgE=${avgE.toFixed(1)} / ${avgEmax.toFixed(1)}`);
  linesStats.push(`avgAge=${avgAge.toFixed(1)} / ${avgLifespan.toFixed(1)}`);
  linesStats.push(`avgVision=${avgR.toFixed(2)}`);
  linesStats.push(`avgEnergyDecayPerTick=${avgEnergyDecayPerTick.toFixed(2)}`);

  statsSummaryEl.textContent = linesStats.join("\n");
}

// =========================
// Jour / Nuit
// =========================
function getPhase(world) {
  const cycle = world.dayTicks + world.nightTicks;
  const t = world.tick % cycle;

  if (t < world.dayTicks) {
    return { name: "DAY", tInPhase: t, duration: world.dayTicks };
  } else {
    return { name: "NIGHT", tInPhase: t - world.dayTicks, duration: world.nightTicks };
  }
}

// =========================
// Graphes
// =========================
const popChartAliens = createPopulationAliensChart();
const popChartBlobs = createPopulationBlobsChart();

// =========================
// Boucle principale
// =========================
setInterval(() => {
  const phase = getPhase(world);
  viewState.isNight = phase.name === "NIGHT";

  if (phase.name === "DAY") {
    updatePlantSpawns(world, viewState.config.plants);
    updatePlantsAging(world);

    for (const alien of world.aliens.values()) {
      updateAlienDay(world, alien);
    }

    for (const blob of world.blobs.values()) {
      updateBlobDay(world, blob);
    }
  } else {
    if (phase.tInPhase === 0) {
      // Supprimer les agents sans energie
      for (const [id, alien] of world.aliens.entries()) {
        if (alien.E <= 0) {
          console.log(`alien#${alien.id} a disparu`);
          const key = cellKey(world, alien.x, alien.y);
          world.occupiedAliens.delete(key);
          world.aliens.delete(id);
        }
      }

      world.day++;

      if (world.day % SAMPLE_EVERY === 0) {
        popChartAliens.pushPoint(world.day, world.aliens.size);
        popChartAliens.keepLast(MAX_POINTS);

        popChartBlobs.pushPoint(world.day, world.blobs.size);
        popChartBlobs.keepLast(MAX_POINTS);
      }
    }
  }

  updateStatsUI(world, phase);
  renderer.renderWorld(world, viewState);

  world.tick++;
}, TICK_MS);

import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderers/createRenderer.js";
import { createViewState } from "./viewState.js";
import { updateCarrotSpawns, updateCarrotsAging } from "./systems/carrotSystem.js";
import { spawnInitialHumans } from "./systems/humanSpawnSystem.js";
import { spawnInitialPigs, updatePigDay } from "./systems/pigSystem.js";
import { updateHumanDay } from "./systems/humanSystem.js";
import { createPopulationHumansChart, createPopulationPigsChart } from "./ui/populationChart.js";
import { cellKey } from "./systems/worldOps.js";

const canvas = document.getElementById("game");
const statsSummaryEl = document.getElementById("statsSummary");

// =========================
// Etat de vue + config centralisée
// =========================
const viewState = createViewState();

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
spawnInitialHumans(world, viewState.config.initialHumans);
spawnInitialPigs(world, viewState.config.initialPigs);

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
  const humanCount = world.humans.size;

  let avgE = 0;
  let avgEmax = 0;
  let avgAge = 0;
  let avgLifespan = 0;
  let avgR = 0;
  let avgEnergyDecayPerTick = 0;

  if (humanCount > 0) {
    for (const h of world.humans.values()) {
      avgE += h.E;
      avgEmax += h.Emax;
      avgAge += h.age;
      avgLifespan += h.lifespan;
      avgR += h.R;
      avgEnergyDecayPerTick += h.energyDecayPerTick;
    }

    avgE /= humanCount;
    avgEmax /= humanCount;
    avgAge /= humanCount;
    avgLifespan /= humanCount;
    avgR /= humanCount;
    avgEnergyDecayPerTick /= humanCount;
  }

  const linesStats = [];
  linesStats.push(`Seed=${world.seed}`);
  linesStats.push(`day=${world.day}`);
  linesStats.push(`phase=${phase.name} (t=${phase.tInPhase}/${phase.duration})`);
  linesStats.push(`humans=${world.humans.size}`);
  linesStats.push(`pigs=${world.pigs.size}`);
  linesStats.push(`carrots=${world.carrots.size}`);

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
const popChartHumans = createPopulationHumansChart();
const popChartPigs = createPopulationPigsChart();

// =========================
// Boucle principale
// =========================
setInterval(() => {
  const phase = getPhase(world);
  viewState.isNight = phase.name === "NIGHT";

  if (phase.name === "DAY") {
    updateCarrotSpawns(world, viewState.config.carrots);
    updateCarrotsAging(world);

    for (const human of world.humans.values()) {
      updateHumanDay(world, human);
    }

    for (const pig of world.pigs.values()) {
      updatePigDay(world, pig);
    }
  } else {
    if (phase.tInPhase === 0) {
      // Supprimer les humains morts
      for (const [id, human] of world.humans.entries()) {
        if (human.E <= 0) {
          console.log(`Humain#${human.id} a disparu`);
          const key = cellKey(world, human.x, human.y);
          world.occupiedHumans.delete(key);
          world.humans.delete(id);
        }
      }

      world.day++;

      if (world.day % SAMPLE_EVERY === 0) {
        popChartHumans.pushPoint(world.day, world.humans.size);
        popChartHumans.keepLast(MAX_POINTS);

        popChartPigs.pushPoint(world.day, world.pigs.size);
        popChartPigs.keepLast(MAX_POINTS);
      }
    }
  }

  updateStatsUI(world, phase);
  renderer.renderWorld(world, viewState);

  world.tick++;
}, TICK_MS);
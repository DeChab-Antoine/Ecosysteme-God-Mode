// src/main.js
import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderer.js";
import { updateCarrotSpawns, updateCarrotsAging } from "./systems/carrotSystem.js";
import { spawnInitialHumans } from "./systems/humanSpawnSystem.js";
import { updateHumansDay, nightCleanup } from "./systems/humanSystem.js";



const canvas = document.getElementById("game");
const statsSummaryEl = document.getElementById("statsSummary");

// Paramètres du monde
const world = createWorld({
  gridW: 80,
  gridH: 55,
  dayTicks: 100,
  nightTicks: 1,
  seed: crypto.getRandomValues(new Uint32Array(1))[0] // seed aléatoire
});
world.rand = mulberry32(world.seed);

const renderer = createRenderer(canvas, {
  gridW: world.gridW,
  gridH: world.gridH,
  cellSize: 12
});

// Paramètres carottes 
const carrotConfig = {
  maxCarrots: 60,
  spawnAttemptsPerTick: 5,
  spawnChance: 1,
  valE: 10,
  maxAge: 100,
};


function computeEmax() {
  return 100 + world.rand() * 100;
}

// Paramètres Spawn initial des humains
spawnInitialHumans(world, {
  count: 10,
  maxAttempts: 5000,

  createHumanTemplate: (world) => {
    const emax = computeEmax();

    return {
      E: 100,
      Emax: emax,
      energyDecayPerTick: emax * 1.0025 - emax,

      R: 5 + world.rand() * 10,

      lifespan: 500 + world.rand() * 1000,

      duplicationCost: 60,
      duplicationTick: 0,
      duplicationTickDelay: 400 + world.rand() * 200
    };
    
  }
});

const TICK_MS = 1;


// les stats
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

  // Liste des stats
  const linesStats = [];
  linesStats.push(`Seed=${world.seed}`);
  linesStats.push(`day=${Math.floor(world.tick/(world.dayTicks+world.nightTicks))}`);
  linesStats.push(`phase=${phase.name} (t=${phase.tInPhase}/${phase.duration})`);
  linesStats.push(`humans=${world.humans.size}`);
  linesStats.push(`carrots=${world.carrots.size}`);

  linesStats.push(`avgE=${avgE.toFixed(1)} / ${avgEmax.toFixed(1)}`);
  linesStats.push(`avgAge=${avgAge.toFixed(1)} / ${avgLifespan.toFixed(1)}`);
  linesStats.push(`avgVision=${avgR.toFixed(2)}`);
  linesStats.push(`avgEnergyDecayPerTick=${avgEnergyDecayPerTick.toFixed(2)}`);

  statsSummaryEl.textContent = linesStats.join("\n");
}

// Jour ou Nuit 
function getPhase(world) {
  const cycle = world.dayTicks + world.nightTicks;
  const t = world.tick % cycle;

  if (t < world.dayTicks) {
    return { name: "DAY", tInPhase: t, duration: world.dayTicks };
  } else {
    return { name: "NIGHT", tInPhase: t - world.dayTicks, duration: world.nightTicks };
  }
}


setInterval(() => {
  const phase = getPhase(world);

  if (phase.name === "DAY") {
    // JOUR : tout avance
    updateCarrotSpawns(world, carrotConfig);
    updateCarrotsAging(world);
    updateHumansDay(world);
  } else {
    // NUIT : tout se fige
    // On fait le nettoyage une seule fois au début de la nuit
    if (phase.tInPhase === 0) {
      nightCleanup(world);
    }
    // pas de spawn, pas de mouvement
  }

  // UI
  updateStatsUI(world, phase);

  // Rendu (overlay nuit)
  renderer.renderWorld(world, {
    isNight: phase.name === "NIGHT",
  });

  world.tick++;
}, TICK_MS);



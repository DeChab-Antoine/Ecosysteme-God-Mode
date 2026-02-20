// src/main.js
import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderer.js";
import { updateCarrotSpawns } from "./systems/carrotSystem.js";
import { spawnInitialHumans } from "./systems/humanSpawnSystem.js";
import { updateHumansDay, nightCleanup } from "./systems/humanSystem.js";



const canvas = document.getElementById("game");
const statsSummaryEl = document.getElementById("statsSummary");
const statsHumansEl = document.getElementById("statsHumans");

// Paramètres du monde
const world = createWorld({
  gridW: 80,
  gridH: 55,
  dayTicks: 90,
  nightTicks: 1,
  seed: 1
});
world.rand = mulberry32(world.seed);

const renderer = createRenderer(canvas, {
  gridW: world.gridW,
  gridH: world.gridH,
  cellSize: 12
});

// Paramètres carottes 
const carrotConfig = {
  maxCarrots: 20,
  spawnAttemptsPerTick: 1,
  spawnChance: 0.3,
  valE: 1
};

// Paramètres Spawn initial des humains
spawnInitialHumans(world, {
  count: 10,
  maxAttempts: 5000,
  humanTemplate: {
    E: 100,
    Emax: 100,
    R: 20,

    lifespan: 20
  }
});


const humanConfig = {
  energyDecayPerTick: 0.4, 
  logEat: false            
};


const TICK_MS = 100;


// les stats
function updateStatsUI(world, phase) {
  // Liste des stats
  const linesStats = [];
  linesStats.push(`day=${Math.floor(world.tick/(world.dayTicks+world.nightTicks))}`);
  linesStats.push(`phase=${phase.name} (t=${phase.tInPhase}/${phase.duration})`);
  linesStats.push(`humans=${world.humans.size}`);
  linesStats.push(`carrots=${world.carrots.size}`);

  statsSummaryEl.textContent = linesStats.join("\n");

  // Liste humains (on limite pour éviter un panneau infini)
  const lines = [];
  const maxLines = 40;

  let i = 0;
  for (const h of world.humans.values()) {
    lines.push(`#${h.id} (${h.x},${h.y}) E=${h.E.toFixed(1)}/${h.Emax} age=${h.age}/${h.lifespan}`);
    i++;
    if (i >= maxLines) {
      lines.push(`... (${world.humans.size - maxLines} autres)`);
      break;
    }
  }

  statsHumansEl.textContent = lines.join("\n");
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
    updateHumansDay(world, humanConfig);
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



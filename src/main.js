// src/main.js
import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderer.js";
import { updateCarrotSpawns, updateCarrotsAging } from "./systems/carrotSystem.js";
import { spawnInitialHumans } from "./systems/humanSpawnSystem.js";
import { spawnInitialPigs, updatePigDay } from "./systems/pigSystem.js";
import { updateHumanDay} from "./systems/humanSystem.js";
import { createPopulationHumansChart, createPopulationPigsChart } from "./ui/populationChart.js";
import { cellKey } from "./systems/worldOps.js";


const canvas = document.getElementById("game");
const statsSummaryEl = document.getElementById("statsSummary");

// Paramètres du monde
const world = createWorld({
  gridW: 120,
  gridH: 80,
  dayTicks: 100,
  nightTicks: 1,
  seed: crypto.getRandomValues(new Uint32Array(1))[0] // seed aléatoire
});
world.rand = mulberry32(world.seed);

const renderer = createRenderer(canvas, {
  gridW: world.gridW,
  gridH: world.gridH,
  cellSize: 8
});

// Paramètres carottes 
const carrotConfig = {
  maxCarrots: 60,
  spawnAttemptsPerTick: 5,
  spawnChance: 1,
  valE: 5,
  maxAge: 500,
};


// Paramètres Spawn initial des humains
spawnInitialHumans(world, {
  count: 10,
  maxAttempts: 5000,

  createHumanTemplate: (world) => {
    return {
      E: 100,
      Emax: 200,
      energyDecayPerTick: 0.03,
      R: 8,
      lifespan: 10000,
      duplicationCost: 150,
      duplicationTickDelay: 1000,
      duplicationTick: 0
    };
  }
});


// Paramètres Spawn initial des cochons
spawnInitialPigs(world, {
  count: 30,
  maxAttempts: 5000,
      
  createPigTemplate: (world) => {
    return {
      Emax: 10,
      lifespan: 1000,
      valE: 50,
    }
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


// le graphe nb humain et cochon dans le temps 
const popChartHumans = createPopulationHumansChart();
const popChartPigs = createPopulationPigsChart();

const SAMPLE_EVERY = 1;   // un point tout les jours
const MAX_POINTS = 3000;    

setInterval(() => {
  const phase = getPhase(world);

  if (phase.name === "DAY") {
    // JOUR : tout avance
    updateCarrotSpawns(world, carrotConfig);
    updateCarrotsAging(world);
    
    for (const human of world.humans.values()) {
      updateHumanDay(world, human);
    }

    for (const pig of world.pigs.values()) {
      updatePigDay(world, pig);
    }

  } else {
    // NUIT : tout se fige
    // On fait le nettoyage une seule fois au début de la nuit
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
      popChartHumans.pushPoint(world.day, world.humans.size);
      popChartHumans.keepLast(MAX_POINTS);
      popChartPigs.pushPoint(world.day, world.pigs.size);
      popChartPigs.keepLast(MAX_POINTS);
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



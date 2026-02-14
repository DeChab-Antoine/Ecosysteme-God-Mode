// src/main.js
import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderer.js";
import { updateCarrotSpawns } from "./systems/carrotSystem.js";
import { spawnInitialHumans } from "./systems/humanSpawnSystem.js";
import { updateHumansDay, nightCleanup } from "./systems/humanSystem.js";



const canvas = document.getElementById("game");

// Paramètres du monde
const world = createWorld({
  gridW: 60,
  gridH: 35,
  dayTicks: 80,
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
  maxCarrots: 60,
  spawnAttemptsPerTick: 1,
  spawnChance: 0.3,
  valE: 25
};

// Paramètres Spawn initial des humains
spawnInitialHumans(world, {
  count: 10,
  maxAttempts: 5000,
  humanTemplate: {
    E: 100,
    Emax: 100,
    R: 6
  }
});


const humanConfig = {
  energyDecayPerTick: 0.6, 
  logEat: false            
};


const TICK_MS = 100;

setInterval(() => {
  // Phase jour/nuit
  const cycle = world.dayTicks + 1;
  const t = world.tick % cycle;
  const isDay = (t < world.dayTicks);

  if (isDay) {
    // Spawn carottes 
    updateCarrotSpawns(world, carrotConfig);
    updateHumansDay(world, humanConfig);
  } else {
    nightCleanup(world);
  }

  world.tick++;
  renderer.renderWorld(world);
}, TICK_MS);


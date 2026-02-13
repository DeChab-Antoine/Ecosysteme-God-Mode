// src/main.js
import { createWorld } from "./world.js";
import { mulberry32 } from "./rng.js";
import { createRenderer } from "./renderer.js";
import { updateCarrotSpawns } from "./systems/carrotSystem.js";

const canvas = document.getElementById("game");

// Paramètres du monde
const world = createWorld({
  gridW: 60,
  gridH: 35,
  dayTicks: 80,
  seed: 12345
});
world.rand = mulberry32(world.seed);

const renderer = createRenderer(canvas, {
  gridW: world.gridW,
  gridH: world.gridH,
  cellSize: 12
});

// Paramètres carottes (à tuner pour “stabilité”)
const carrotConfig = {
  maxCarrots: 60,
  spawnAttemptsPerTick: 1,
  spawnChance: 0.5,
  valE: 25
};

const TICK_MS = 80;

setInterval(() => {
  // 1) Update logique
  updateCarrotSpawns(world, carrotConfig);
  world.tick++;

  // 2) Render
  renderer.renderWorld(world);
}, TICK_MS);

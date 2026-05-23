import { removePlantAt, cellKey } from "./worldOps.js";

/**
 * Essaie de spawn un plant nutritif sur une case libre.
 * Les noms internes "plant" restent pour limiter le risque de regression,
 * mais la fiction du jeu parle maintenant de Plants extraterrestres.
 */
function trySpawnPlant(world, x, y, config) {
  const key = cellKey(world, x, y);

  if (world.occupiedPlants.has(key)) return false;
  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedBlobs.has(key)) return false;

  world.plants.set(key, {
    x,
    y,
    valE: config.valE,
    age: 0,
    maxAge: config.maxAge
  });

  world.occupiedPlants.add(key);
  return true;
}

/**
 * Spawn probabiliste par tick avec cap global.
 */
export function updatePlantSpawns(world, config) {
  const {
    maxPlants,
    spawnAttemptsPerTick,
    spawnChance
  } = config;

  if (world.plants.size >= maxPlants) return;

  for (let i = 0; i < spawnAttemptsPerTick; i++) {
    if (world.plants.size >= maxPlants) break;

    if (world.rand() > spawnChance) continue;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    trySpawnPlant(world, x, y, config);
  }
}

/**
 * Spawn direct d'un plant en (x,y) — utilisé par le mode Dieu.
 */
export function spawnPlantAt(world, x, y, config) {
  return trySpawnPlant(world, x, y, config);
}

/**
 * Vieillissement et dissipation des Plants nutritifs.
 */
export function updatePlantsAging(world) {
  for (const plant of Array.from(world.plants.values())) {
    plant.age += 1;

    if (plant.age >= plant.maxAge) {
      removePlantAt(world, plant.x, plant.y);
      console.log(`plant dissipe a (${plant.x},${plant.y})`);
    }
  }
}

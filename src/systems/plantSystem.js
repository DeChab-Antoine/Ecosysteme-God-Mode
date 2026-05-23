import { cellKey } from "./worldOps.js";

function trySpawnPoisonPlant(world, x, y) {
  const key = cellKey(world, x, y);
  if (world.occupiedPoisonPlants.has(key)) return false;
  if (world.occupiedRagePlants.has(key)) return false;
  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedBlobs.has(key)) return false;

  world.poisonPlants.set(key, { x, y, type: "poisonPlant" });
  world.occupiedPoisonPlants.add(key);
  return true;
}

function trySpawnRagePlant(world, x, y) {
  const key = cellKey(world, x, y);
  if (world.occupiedPoisonPlants.has(key)) return false;
  if (world.occupiedRagePlants.has(key)) return false;
  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedBlobs.has(key)) return false;

  world.ragePlants.set(key, { x, y, type: "ragePlant" });
  world.occupiedRagePlants.add(key);
  return true;
}

// Spawn direct d'une plante poison en (x,y) — utilisé par le mode Dieu.
export function spawnPoisonPlantAt(world, x, y) {
  return trySpawnPoisonPlant(world, x, y);
}

export function spawnRagePlantAt(world, x, y) {
  return trySpawnRagePlant(world, x, y);
}

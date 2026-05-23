import { removePoisonPlantAt, removeRagePlantAt, removeBlobAt, cellKey, dist2, clamp, findFreeNeighborCell } from "./worldOps.js";
import { makeAlien } from "./alienSpawnSystem.js";
import { makeAlien2 } from "./alien2System.js";
import { stepTowards, wanderStep } from "./movementUtils.js";

const PURSUIT_MEMORY_TICKS  = 40;
const POISON_ATTRACT_RADIUS = 10;
const RAGE_ATTRACT_RADIUS   = 15;

function findBestTarget(world, alien) {
  const blobR2   = alien.R * alien.R;
  const rageR2   = RAGE_ATTRACT_RADIUS * RAGE_ATTRACT_RADIUS;
  const poisonR2 = POISON_ATTRACT_RADIUS * POISON_ATTRACT_RADIUS;

  // Priorité 1 : plante rage (transformation)
  let bestRage = null, bestRageD2 = Infinity;
  for (const p of world.ragePlants.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= rageR2 && d2 < bestRageD2) { bestRageD2 = d2; bestRage = p; }
  }
  if (bestRage) return bestRage;

  // Priorité 2 : plante poison
  let bestPoison = null, bestPoisonD2 = Infinity;
  for (const p of world.poisonPlants.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= poisonR2 && d2 < bestPoisonD2) { bestPoisonD2 = d2; bestPoison = p; }
  }
  if (bestPoison) return bestPoison;

  // Priorité 3 : blob
  let bestBlob = null, bestBlobD2 = Infinity;
  for (const p of world.blobs.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= blobR2 && d2 < bestBlobD2) { bestBlobD2 = d2; bestBlob = p; }
  }
  return bestBlob;
}

function findTouchedPoisonPlant(world, entity) {
  for (const plant of world.poisonPlants.values()) {
    const dx = Math.abs(entity.x - plant.x);
    const dy = Math.abs(entity.y - plant.y);
    if (dx <= 1 && dy <= 1) return plant;
  }
  return null;
}

function findTouchedRagePlant(world, entity) {
  for (const plant of world.ragePlants.values()) {
    const dx = Math.abs(entity.x - plant.x);
    const dy = Math.abs(entity.y - plant.y);
    if (dx <= 1 && dy <= 1) return plant;
  }
  return null;
}

// =========================
// Reproduction
// =========================

function canDuplicate(world, alien) {
  return (
    Number.isFinite(alien.E) &&
    Number.isFinite(alien.Emax) &&
    alien.E >= alien.Emax * 0.95 &&
    world.rand() < alien.duplicationChance
  );
}

function createChildTemplate(parent) {
  return {
    E:                  parent.Emax,
    Emax:               parent.Emax,
    energyDecayPerTick: parent.energyDecayPerTick,
    R:                  parent.R,
    age:                0,
    lifespan:           parent.lifespan,
    duplicationCost:    parent.duplicationCost,
    duplicationChance:  parent.duplicationChance,
  };
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;
  makeAlien(world, spot.x, spot.y, createChildTemplate(parent));
  world.occupiedAliens.add(cellKey(world, spot.x, spot.y));
  parent.E = clamp(parent.E - parent.duplicationCost, 0, parent.Emax);
  return true;
}

// =========================
// Tick principal
// =========================

export function updateAlienDay(world, alien) {
  if (alien.age >= alien.lifespan) { alien.E = 0; return; }
  if (alien.E < 0) return;

  alien.E -= alien.energyDecayPerTick;
  alien.age++;

  const wellFed = alien.E > alien.Emax * 0.8;
  const target  = findBestTarget(world, alien);

  if (target) {
    if (target.type === "blob") {
      alien.memory = { x: target.x, y: target.y, tick: world.tick };
    }
    stepTowards(world, alien, target.x, target.y);
  } else if (!wellFed && alien.memory && (world.tick - alien.memory.tick) < PURSUIT_MEMORY_TICKS) {
    stepTowards(world, alien, alien.memory.x, alien.memory.y);
    if (alien.x === alien.memory.x && alien.y === alien.memory.y) alien.memory = null;
  } else {
    alien.memory = null;
    wanderStep(world, alien);
  }

  if (canDuplicate(world, alien)) tryDuplicate(world, alien);

  const key = cellKey(world, alien.x, alien.y);

  // Plante rage → transformation en alien2
  const touchedRage = findTouchedRagePlant(world, alien);
  if (touchedRage) {
    removeRagePlantAt(world, touchedRage.x, touchedRage.y);
    world.transformEvents.push({ alienId: alien.id, x: alien.x, y: alien.y });
    world.occupiedAliens.delete(key);
    world.aliens.delete(alien.id);
    makeAlien2(world, alien.x, alien.y, {
      E:    alien.Emax,
      Emax: alien.Emax,
      R:    alien.R * 1.5,
    });
    world.occupiedAliens2.add(key);
    return;
  }

  // Plante poison → mort instantanée
  const touchedPoison = findTouchedPoisonPlant(world, alien);
  if (touchedPoison) {
    removePoisonPlantAt(world, touchedPoison.x, touchedPoison.y);
    world.poisonKillEvents.push({ type: "alien", x: alien.x, y: alien.y });
    world.occupiedAliens.delete(key);
    world.aliens.delete(alien.id);
    return;
  }

  // Manger un blob sur la même case
  if (world.occupiedBlobs.has(key) && alien.E < alien.Emax) {
    for (const p of world.blobs.values()) {
      if (p.x === alien.x && p.y === alien.y) {
        removeBlobAt(world, p);
        alien.E = clamp(alien.E + p.valE, 0, alien.Emax);
        alien.lastAction = { type: "eatBlob", tick: world.tick };
        alien.memory = null;
        break;
      }
    }
  }
}

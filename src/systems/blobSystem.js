import { cellKey, dist2, findFreeNeighborCell, removePoisonPlantAt, removeBlobAt } from "./worldOps.js";
import { stepTowards, wanderStep } from "./movementUtils.js";

const POISON_ATTRACT_RADIUS = 10; // rayon d'attraction vers les plantes poison (priorité absolue)
const BLOB_FEAR_RADIUS       = 8;  // rayon de détection des aliens

export function makeBlob(world, x, y, template) {
  const id = world.nextBlobId++;

  world.blobs.set(id, {
    id,
    x,
    y,
    type: "blob",
    valE:              template.valE,
    age:               template.age ?? 0,
    lifespan:          template.lifespan,
    duplicationChance: template.duplicationChance ?? 0,
  });
}

function trySpawnBlob(world, x, y, createBlobTemplate) {
  const key = cellKey(world, x, y);
  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedPoisonPlants.has(key)) return false;
  if (world.occupiedBlobs.has(key)) return false;

  const template = createBlobTemplate(world);
  makeBlob(world, x, y, template);
  world.occupiedBlobs.add(key);
  return true;
}

export function spawnInitialBlobs(world, config) {
  const { count, maxAttempts, createBlobTemplate } = config;
  let spawned = 0, attempts = 0;
  while (spawned < count && attempts < maxAttempts) {
    attempts++;
    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);
    if (trySpawnBlob(world, x, y, createBlobTemplate)) spawned++;
  }
}

// =========================
// Perception
// =========================

function findNearestPoisonPlant(world, blob) {
  const R2 = POISON_ATTRACT_RADIUS * POISON_ATTRACT_RADIUS;
  let best = null, bestD2 = Infinity;
  for (const p of world.poisonPlants.values()) {
    const d2 = dist2(blob.x, blob.y, p.x, p.y);
    if (d2 <= R2 && d2 < bestD2) { bestD2 = d2; best = p; }
  }
  return best;
}

function findNearestAlienThreat(world, blob) {
  const R2 = BLOB_FEAR_RADIUS * BLOB_FEAR_RADIUS;
  let best = null, bestD2 = Infinity;
  for (const a of world.aliens.values()) {
    const d2 = dist2(blob.x, blob.y, a.x, a.y);
    if (d2 <= R2 && d2 < bestD2) { bestD2 = d2; best = a; }
  }
  return best;
}

function findTouchedPoisonPlant(world, entity) {
  for (const plant of world.poisonPlants.values()) {
    const dx = Math.abs(entity.x - plant.x);
    const dy = Math.abs(entity.y - plant.y);
    if (dx <= 1 && dy <= 1) return plant;
  }
  return null;
}

// =========================
// Duplication — probabiliste, sans énergie
// Plafond global pour éviter l'explosion si les aliens disparaissent.
// =========================

export function tryDuplicate(world, parent) {
  if (!Number.isFinite(parent.duplicationChance)) return false;
  const chance = Math.max(0, Math.min(1, parent.duplicationChance));
  if (world.rand() >= chance) return false;
  if (world.blobs.size >= world.maxBlobs) return false;
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  makeBlob(world, spot.x, spot.y, {
    valE:                 parent.valE,
    age:                  0,
    lifespan:             parent.lifespan,
    duplicationChance:    parent.duplicationChance,
  });
  world.occupiedBlobs.add(cellKey(world, spot.x, spot.y));
  return true;
}

// =========================
// Tick principal
// =========================

export function updateBlobDay(world, blob) {
  // Mort de vieillesse
  if (blob.age >= blob.lifespan) {
    removeBlobAt(world, blob);
    return;
  }

  blob.age++;

  const threat = findNearestAlienThreat(world, blob);
  if (threat) {
    const fleeX = blob.x + Math.sign(blob.x - threat.x) * 3;
    const fleeY = blob.y + Math.sign(blob.y - threat.y) * 3;
    stepTowards(world, blob, fleeX, fleeY);
  } else {
    const poisonTarget = findNearestPoisonPlant(world, blob);
    if (poisonTarget) {
      stepTowards(world, blob, poisonTarget.x, poisonTarget.y);
    } else {
      wanderStep(world, blob);
    }
  }

  // Duplication probabiliste, indépendante de l'énergie.
  tryDuplicate(world, blob);

  const touchedPoison = findTouchedPoisonPlant(world, blob);
  if (touchedPoison) {
    removePoisonPlantAt(world, touchedPoison.x, touchedPoison.y);
    world.poisonKillEvents.push({ type: "blob", x: blob.x, y: blob.y });
    removeBlobAt(world, blob);
  }
}

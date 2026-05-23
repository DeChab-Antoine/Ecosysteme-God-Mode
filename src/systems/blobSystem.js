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
    valE:                 template.valE,               // énergie donnée à l'alien qui le mange
    age:                  template.age  ?? 0,
    lifespan:             template.lifespan,
    duplicationTick:      template.duplicationTick      ?? 0,
    duplicationTickDelay: template.duplicationTickDelay,
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

// =========================
// Duplication — timer pur, sans énergie
// Plafond global pour éviter l'explosion si les aliens disparaissent.
// =========================

export function tryDuplicate(world, parent) {
  if (world.blobs.size >= world.maxBlobs) return false;
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  makeBlob(world, spot.x, spot.y, {
    valE:                 parent.valE,
    age:                  0,
    lifespan:             parent.lifespan,
    duplicationTick:      0,
    duplicationTickDelay: parent.duplicationTickDelay,
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
  blob.duplicationTick++;

  // Priorité 1 : plante poison dans le rayon d'attraction (attirante mais mortelle)
  const poisonTarget = findNearestPoisonPlant(world, blob);
  if (poisonTarget) {
    stepTowards(world, blob, poisonTarget.x, poisonTarget.y);
  } else {
    // Priorité 2 : fuite devant les aliens
    const threat = findNearestAlienThreat(world, blob);
    if (threat) {
      const fleeX = blob.x + Math.sign(blob.x - threat.x) * 3;
      const fleeY = blob.y + Math.sign(blob.y - threat.y) * 3;
      stepTowards(world, blob, fleeX, fleeY);
    } else {
      wanderStep(world, blob);
    }
  }

  // Duplication par timer pur (indépendante de l'énergie)
  if (blob.duplicationTick >= blob.duplicationTickDelay) {
    tryDuplicate(world, blob);
    blob.duplicationTick = 0;
  }

  // Contact avec une plante poison → mort instantanée
  const key = cellKey(world, blob.x, blob.y);
  if (world.occupiedPoisonPlants.has(key) && world.poisonPlants.has(key)) {
    removePoisonPlantAt(world, blob.x, blob.y);
    world.poisonKillEvents.push({ type: "blob", x: blob.x, y: blob.y });
    removeBlobAt(world, blob);
  }
}

import { cellKey, dist2, clamp, moveTo, findFreeNeighborCell, removePoisonPlantAt, removeBlobAt } from "./worldOps.js";

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
// Mouvement
// =========================

// Avance vers (tx, ty) avec essais successifs puis fallback 4 directions mélangées.
function stepTowards(world, entity, tx, ty) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (sx !== 0 && sy !== 0 && moveTo(world, entity, entity.x + sx, entity.y + sy)) return;

  const primary = Math.abs(dx) >= Math.abs(dy)
    ? { x: entity.x + sx, y: entity.y }
    : { x: entity.x,      y: entity.y + sy };
  if (moveTo(world, entity, primary.x, primary.y)) return;

  const secondary = Math.abs(dx) >= Math.abs(dy)
    ? { x: entity.x,      y: entity.y + sy }
    : { x: entity.x + sx, y: entity.y };
  if (moveTo(world, entity, secondary.x, secondary.y)) return;

  // Bloqué : essaie les 4 cardinales en ordre aléatoire (contournement d'obstacle)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(world.rand() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  for (const [ddx, ddy] of dirs) {
    if (moveTo(world, entity, entity.x + ddx, entity.y + ddy)) return;
  }
}

// Errance globale : se dirige vers un waypoint aléatoire sur toute la carte.
// Quand la destination est atteinte (dist ≤ 3), en choisit une nouvelle.
// Garantit une couverture de la carte entière, pas une zone locale.
function wanderStep(world, entity) {
  if (entity.wanderX === undefined ||
      Math.abs(entity.x - entity.wanderX) + Math.abs(entity.y - entity.wanderY) <= 3) {
    entity.wanderX = Math.floor(world.rand() * world.gridW);
    entity.wanderY = Math.floor(world.rand() * world.gridH);
  }
  stepTowards(world, entity, entity.wanderX, entity.wanderY);
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
    world.poisonKillEvents.push({ type: "blob" });
    removeBlobAt(world, blob);
  }
}

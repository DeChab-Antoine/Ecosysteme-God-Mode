import { cellKey, dist2, clamp, moveTo, findFreeNeighborCell, removePlantAt, removeBlobAt } from "./worldOps.js";

const BLOB_VISION_RADIUS = 18;  // champ de vision pour chercher les plantes
const BLOB_FEAR_RADIUS   = 8;   // rayon de détection des aliens

export function makeBlob(world, x, y, template) {
  const id = world.nextBlobId++;

  const blob = {
    id,
    x,
    y,
    type: "blob",

    E:    template.E    ?? Math.ceil((template.Emax ?? 20) * 0.75),
    Emax: template.Emax,

    // Energie récupérée par l'alien qui absorbe ce blob
    valE: template.valE,

    age:      template.age      ?? 0,
    lifespan: template.lifespan,

    duplicationCost:      template.duplicationCost      ?? Math.ceil(template.Emax * 0.5),
    duplicationTick:      template.duplicationTick      ?? 0,
    duplicationTickDelay: template.duplicationTickDelay ?? 250,

    energyDecayPerTick: template.energyDecayPerTick ?? 0.015,
  };

  world.blobs.set(id, blob);
}

function trySpawnBlob(world, x, y, createBlobTemplate) {
  const key = cellKey(world, x, y);
  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedPlants.has(key)) return false;
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

// Plante la plus proche dans le champ de vision (pas omniscient)
function findNearestPlantInVision(world, blob) {
  const R2 = BLOB_VISION_RADIUS * BLOB_VISION_RADIUS;
  let best = null, bestD2 = Infinity;
  for (const c of world.plants.values()) {
    const d2 = dist2(blob.x, blob.y, c.x, c.y);
    if (d2 <= R2 && d2 < bestD2) { bestD2 = d2; best = c; }
  }
  return best;
}

// Alien la plus proche dans le rayon de peur
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

function stepTowards(world, blob, tx, ty) {
  const dx = tx - blob.x;
  const dy = ty - blob.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (sx !== 0 && sy !== 0 && moveTo(world, blob, blob.x + sx, blob.y + sy)) return;

  const primary   = Math.abs(dx) >= Math.abs(dy)
    ? { x: blob.x + sx, y: blob.y }
    : { x: blob.x, y: blob.y + sy };
  if (moveTo(world, blob, primary.x, primary.y)) return;

  const secondary = Math.abs(dx) >= Math.abs(dy)
    ? { x: blob.x, y: blob.y + sy }
    : { x: blob.x + sx, y: blob.y };
  if (moveTo(world, blob, secondary.x, secondary.y)) return;

  randomStep(world, blob);
}

function randomStep(world, blob) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const [dx, dy] = dirs[Math.floor(world.rand() * dirs.length)];
  moveTo(world, blob, blob.x + dx, blob.y + dy);
}

// =========================
// Reproduction
// =========================

function canDuplicate(blob) {
  return (
    Number.isFinite(blob.E) &&
    Number.isFinite(blob.Emax) &&
    blob.duplicationTick >= blob.duplicationTickDelay &&
    blob.E >= blob.Emax * 0.95
  );
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  const cost = parent.duplicationCost ?? Math.ceil(parent.Emax * 0.5);
  makeBlob(world, spot.x, spot.y, {
    E:    cost,
    Emax: parent.Emax,
    valE: parent.valE,
    age:  0,
    lifespan:             parent.lifespan,
    duplicationCost:      cost,
    duplicationTick:      0,
    duplicationTickDelay: parent.duplicationTickDelay,
    energyDecayPerTick:   parent.energyDecayPerTick,
  });
  world.occupiedBlobs.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - cost, 0, parent.Emax);
  parent.duplicationTick = 0;
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

  // Decay d'énergie passif
  blob.E = clamp(blob.E - (blob.energyDecayPerTick ?? 0.015), 0, blob.Emax);

  // --- Décision de mouvement ---
  const threat = findNearestAlienThreat(world, blob);
  const starving = blob.E < blob.Emax * 0.25;

  if (threat && !starving) {
    // Fuite : direction opposée à la menace
    // Si en train de mourir de faim, le blob prend le risque d'ignorer la menace
    const fleeX = blob.x + Math.sign(blob.x - threat.x) * 3;
    const fleeY = blob.y + Math.sign(blob.y - threat.y) * 3;
    stepTowards(world, blob, fleeX, fleeY);
  } else {
    const target = findNearestPlantInVision(world, blob);
    if (target) {
      stepTowards(world, blob, target.x, target.y);
    } else {
      randomStep(world, blob);
    }
  }

  if (canDuplicate(blob)) tryDuplicate(world, blob);

  // Manger une plante si on est sur la même case
  const key = cellKey(world, blob.x, blob.y);
  if (world.occupiedPlants.has(key)) {
    const plant = world.plants.get(key);
    if (plant) {
      removePlantAt(world, blob.x, blob.y);
      blob.E = clamp(blob.E + plant.valE, 0, blob.Emax);
      blob.lastAction = { type: "eatPlant", tick: world.tick };
    }
  }

  // Mort par famine
  if (blob.E <= 0) removeBlobAt(world, blob);
}

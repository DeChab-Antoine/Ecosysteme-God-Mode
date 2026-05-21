import { cellKey, dist2, clamp, moveTo, findFreeNeighborCell, removePlantAt, removeBlobAt } from "./worldOps.js";

// Cree une blob mobile. Le type interne "blob" reste pour compatibilite.
export function makeBlob(world, x, y, template) {
  const id = world.nextBlobId++;

  const blob = {
    id,
    x,
    y,
    type: "blob",

    // Energie
    E: template.E ?? 0,
    Emax: template.Emax,

    // Energie recuperee par une alien qui absorbe la blob
    valE: template.valE,

    // Age
    age: template.age ?? 0,
    lifespan: template.lifespan,

    // Duplication
    duplicationCost: template.duplicationCost ?? Math.ceil(template.Emax * 0.5),
    duplicationTick: template.duplicationTick ?? 0,
    duplicationTickDelay: template.duplicationTickDelay ?? 250,
  };

  world.blobs.set(id, blob);
}

// Essaie de placer une blob sur une case libre
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

  let spawned = 0;
  let attempts = 0;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    const ok = trySpawnBlob(world, x, y, createBlobTemplate);
    if (ok) spawned++;
  }
}

// Cherche le plant nutritif le plus proche
function findNearestPlant(world, blob) {
  let best = null;
  let bestD2 = Infinity;

  for (const c of world.plants.values()) {
    const d2 = dist2(blob.x, blob.y, c.x, c.y);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }

  return best;
}

// Mouvement d'un pas vers une cible (x,y)
function stepTowards(world, blob, tx, ty) {
  const dx = tx - blob.x;
  const dy = ty - blob.y;

  const primary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: blob.x + Math.sign(dx), y: blob.y }
    : { x: blob.x, y: blob.y + Math.sign(dy) };

  if (moveTo(world, blob, primary.x, primary.y)) return;

  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: blob.x, y: blob.y + Math.sign(dy) }
    : { x: blob.x + Math.sign(dx), y: blob.y };

  if (moveTo(world, blob, secondary.x, secondary.y)) return;

  randomStep(world, blob);
}

function randomStep(world, blob) {
  const r = Math.floor(world.rand() * 4);
  let nx = blob.x;
  let ny = blob.y;

  if (r === 0) nx += 1;
  else if (r === 1) nx -= 1;
  else if (r === 2) ny += 1;
  else ny -= 1;

  moveTo(world, blob, nx, ny);
}

function canDuplicate(blob) {
  return (
    Number.isFinite(blob.E) &&
    Number.isFinite(blob.Emax) &&
    blob.duplicationTick >= blob.duplicationTickDelay &&
    blob.E >= (blob.Emax * 0.95)
  );
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  const duplicationCost = parent.duplicationCost ?? Math.ceil(parent.Emax * 0.5);
  const childTemplate = {
    E: duplicationCost,
    Emax: parent.Emax,
    valE: parent.valE,
    age: 0,
    lifespan: parent.lifespan,
    duplicationCost,
    duplicationTick: 0,
    duplicationTickDelay: parent.duplicationTickDelay,
  };

  makeBlob(world, spot.x, spot.y, childTemplate);
  world.occupiedBlobs.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - duplicationCost, 0, parent.Emax);
  parent.duplicationTick = 0;

  return true;
}

// Un tick "JOUR" pour 1 blob
export function updateBlobDay(world, blob) {
  if (blob.age >= blob.lifespan) {
    console.log(`blob#${blob.id} s'est dissipee`);
    removeBlobAt(world, blob);
    return;
  }

  blob.age++;
  blob.duplicationTick++;

  const target = findNearestPlant(world, blob);

  if (target) {
    stepTowards(world, blob, target.x, target.y);
  } else {
    randomStep(world, blob);
  }

  if (canDuplicate(blob)) {
    tryDuplicate(world, blob);
  }

  const key = cellKey(world, blob.x, blob.y);
  if (world.occupiedPlants.has(key)) {
    const plant = world.plants.get(key);
    if (plant) {
      removePlantAt(world, blob.x, blob.y);
      blob.E = clamp(blob.E + plant.valE, 0, blob.Emax);
      blob.lastAction = { type: "eatPlant", tick: world.tick };
      console.log(`blob#${blob.id} absorbe un plant de val = ${plant.valE}`);
    }
  }
}

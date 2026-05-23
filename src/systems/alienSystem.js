import { moveTo, removePlantAt, removeBlobAt, cellKey, dist2, clamp, findFreeNeighborCell } from "./worldOps.js";
import { makeAlien } from "./alienSpawnSystem.js";

const PURSUIT_MEMORY_TICKS = 40; // ticks pendant lesquels l'alien poursuit une dernière position connue

// =========================
// Perception — avec priorité selon la faim
// =========================

function findBestTarget(world, alien) {
  const R2 = alien.R * alien.R;
  const hungry = alien.E < alien.Emax * 0.6;

  let bestBlob = null, bestBlobD2 = Infinity;
  let bestPlant = null, bestPlantD2 = Infinity;

  for (const p of world.blobs.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= R2 && d2 < bestBlobD2) { bestBlobD2 = d2; bestBlob = p; }
  }

  for (const c of world.plants.values()) {
    const d2 = dist2(alien.x, alien.y, c.x, c.y);
    if (d2 <= R2 && d2 < bestPlantD2) { bestPlantD2 = d2; bestPlant = c; }
  }

  // Affamé et un blob en vue → chasse le blob en priorité
  if (hungry && bestBlob) return bestBlob;
  // Sinon → la cible la plus proche (blob ou plante)
  if (bestBlob && bestPlant) return bestBlobD2 < bestPlantD2 ? bestBlob : bestPlant;
  return bestBlob ?? bestPlant;
}

// =========================
// Reproduction
// =========================

function canDuplicate(alien) {
  return (
    Number.isFinite(alien.E) &&
    Number.isFinite(alien.Emax) &&
    alien.duplicationTick >= alien.duplicationTickDelay &&
    alien.E >= alien.Emax * 0.95
  );
}

function mutate(world, a) {
  return a * (0.8 + world.rand() * 0.4);
}

function createChildTemplate(world, parent) {
  const Emax = mutate(world, parent.Emax);
  return {
    E:    Emax,
    Emax,
    energyDecayPerTick:   parent.energyDecayPerTick,
    R:                    mutate(world, parent.R),
    age:  0,
    lifespan:             mutate(world, parent.lifespan),
    duplicationCost:      parent.duplicationCost,
    duplicationTick:      0,
    duplicationTickDelay: parent.duplicationTickDelay,
  };
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  makeAlien(world, spot.x, spot.y, createChildTemplate(world, parent));
  world.occupiedAliens.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - parent.duplicationCost, 0, parent.Emax);
  parent.duplicationTick = 0;
  return true;
}

// =========================
// Mouvement
// =========================

function stepTowards(world, alien, tx, ty) {
  const dx = tx - alien.x;
  const dy = ty - alien.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (sx !== 0 && sy !== 0 && moveTo(world, alien, alien.x + sx, alien.y + sy)) return;

  const primary   = Math.abs(dx) >= Math.abs(dy)
    ? { x: alien.x + sx, y: alien.y }
    : { x: alien.x,      y: alien.y + sy };
  if (moveTo(world, alien, primary.x, primary.y)) return;

  const secondary = Math.abs(dx) >= Math.abs(dy)
    ? { x: alien.x,      y: alien.y + sy }
    : { x: alien.x + sx, y: alien.y };
  if (moveTo(world, alien, secondary.x, secondary.y)) return;

  randomStep(world, alien);
}

function randomStep(world, alien) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const [dx, dy] = dirs[Math.floor(world.rand() * dirs.length)];
  moveTo(world, alien, alien.x + dx, alien.y + dy);
}

// =========================
// Tick principal
// =========================

export function updateAlienDay(world, alien) {
  if (alien.age >= alien.lifespan) { alien.E = 0; return; }
  if (alien.E < 0) return;

  alien.E -= alien.energyDecayPerTick;
  alien.age++;
  alien.duplicationTick++;

  const wellFed = alien.E > alien.Emax * 0.8;
  const target  = findBestTarget(world, alien);

  if (target) {
    // Met à jour la mémoire si c'est un blob (mobile)
    if (target.type === "blob") {
      alien.memory = { x: target.x, y: target.y, tick: world.tick };
    }
    stepTowards(world, alien, target.x, target.y);

  } else if (!wellFed && alien.memory && (world.tick - alien.memory.tick) < PURSUIT_MEMORY_TICKS) {
    // Poursuite vers la dernière position connue d'un blob
    stepTowards(world, alien, alien.memory.x, alien.memory.y);
    // Arrivé sur place : efface la mémoire
    if (alien.x === alien.memory.x && alien.y === alien.memory.y) alien.memory = null;

  } else {
    // Errance (rassasié ou mémoire expirée)
    alien.memory = null;
    randomStep(world, alien);
  }

  if (canDuplicate(alien)) tryDuplicate(world, alien);

  const key = cellKey(world, alien.x, alien.y);

  if (world.occupiedPlants.has(key)) {
    const plant = world.plants.get(key);
    if (plant) {
      removePlantAt(world, alien.x, alien.y);
      alien.E = clamp(alien.E + plant.valE, 0, alien.Emax);
      alien.lastAction = { type: "eatPlant", tick: world.tick };
    }
  }

  if (world.occupiedBlobs.has(key) && alien.E < alien.Emax) {
    for (const p of world.blobs.values()) {
      if (p.x === alien.x && p.y === alien.y) {
        removeBlobAt(world, p);
        alien.E = clamp(alien.E + p.valE, 0, alien.Emax);
        alien.lastAction = { type: "eatBlob", tick: world.tick };
        alien.memory = null; // proie capturée, mémoire inutile
        break;
      }
    }
  }
}

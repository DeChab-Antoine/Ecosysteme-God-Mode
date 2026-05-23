import { moveTo, removePoisonPlantAt, removeBlobAt, cellKey, dist2, clamp, findFreeNeighborCell } from "./worldOps.js";
import { makeAlien } from "./alienSpawnSystem.js";

const PURSUIT_MEMORY_TICKS  = 40; // ticks pendant lesquels l'alien poursuit une dernière position connue
const POISON_ATTRACT_RADIUS = 10; // rayon d'attraction vers les plantes poison (priorité absolue)

// =========================
// Perception — avec priorité selon la faim et les plantes poison
// =========================

function findBestTarget(world, alien) {
  const blobR2   = alien.R * alien.R;
  const poisonR2 = POISON_ATTRACT_RADIUS * POISON_ATTRACT_RADIUS;

  // Plantes poison — priorité absolue dans le rayon 10
  let bestPoison = null, bestPoisonD2 = Infinity;
  for (const p of world.poisonPlants.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= poisonR2 && d2 < bestPoisonD2) { bestPoisonD2 = d2; bestPoison = p; }
  }
  if (bestPoison) return bestPoison;

  // Blobs — dans le rayon de vision alien
  const hungry = alien.E < alien.Emax * 0.6;
  let bestBlob = null, bestBlobD2 = Infinity;
  for (const p of world.blobs.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= blobR2 && d2 < bestBlobD2) { bestBlobD2 = d2; bestBlob = p; }
  }
  return bestBlob;
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

function createChildTemplate(parent) {
  return {
    E:                    parent.Emax,
    Emax:                 parent.Emax,
    energyDecayPerTick:   parent.energyDecayPerTick,
    R:                    parent.R,
    age:                  0,
    lifespan:             parent.lifespan,
    duplicationCost:      parent.duplicationCost,
    duplicationTick:      0,
    duplicationTickDelay: parent.duplicationTickDelay,
  };
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  makeAlien(world, spot.x, spot.y, createChildTemplate(parent));
  world.occupiedAliens.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - parent.duplicationCost, 0, parent.Emax);
  parent.duplicationTick = 0;
  return true;
}

// =========================
// Mouvement
// =========================

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

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(world.rand() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  for (const [ddx, ddy] of dirs) {
    if (moveTo(world, entity, entity.x + ddx, entity.y + ddy)) return;
  }
}

function wanderStep(world, entity) {
  if (entity.wanderX === undefined ||
      Math.abs(entity.x - entity.wanderX) + Math.abs(entity.y - entity.wanderY) <= 3) {
    entity.wanderX = Math.floor(world.rand() * world.gridW);
    entity.wanderY = Math.floor(world.rand() * world.gridH);
  }
  stepTowards(world, entity, entity.wanderX, entity.wanderY);
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
    // Met à jour la mémoire uniquement pour les blobs (mobiles)
    if (target.type === "blob") {
      alien.memory = { x: target.x, y: target.y, tick: world.tick };
    }
    stepTowards(world, alien, target.x, target.y);

  } else if (!wellFed && alien.memory && (world.tick - alien.memory.tick) < PURSUIT_MEMORY_TICKS) {
    // Poursuite vers la dernière position connue d'un blob
    stepTowards(world, alien, alien.memory.x, alien.memory.y);
    if (alien.x === alien.memory.x && alien.y === alien.memory.y) alien.memory = null;

  } else {
    // Errance (rassasié ou mémoire expirée) : waypoint global
    alien.memory = null;
    wanderStep(world, alien);
  }

  if (canDuplicate(alien)) tryDuplicate(world, alien);

  const key = cellKey(world, alien.x, alien.y);

  // Vérifier si l'alien marche sur une plante poison → mort instantanée
  if (world.occupiedPoisonPlants.has(key)) {
    if (world.poisonPlants.has(key)) {
      removePoisonPlantAt(world, alien.x, alien.y);
      world.poisonKillEvents.push({ type: "alien" });
      world.occupiedAliens.delete(key);
      world.aliens.delete(alien.id);
      return;
    }
  }

  // Manger un blob si on est sur la même case
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

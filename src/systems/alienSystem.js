import { moveTo, removePlantAt, removeBlobAt, cellKey, dist2, clamp, findFreeNeighborCell } from "./worldOps.js";
import { makeAlien } from "./alienSpawnSystem.js";

// Cherche la source d'energie la plus proche dans le rayon R.
function findNearestInVision(world, alien) {
  const R2 = alien.R * alien.R;

  let best = null;
  let bestD2 = Infinity;

  // Plants nutritifs.
  for (const c of world.plants.values()) {
    const d2 = dist2(alien.x, alien.y, c.x, c.y);
    if (d2 <= R2 && d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }

  // Blobs mobiles.
  for (const p of world.blobs.values()) {
    const d2 = dist2(alien.x, alien.y, p.x, p.y);
    if (d2 <= R2 && d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }

  return best;
}

function canDuplicate(alien) {
  return (
    Number.isFinite(alien.E) &&
    Number.isFinite(alien.Emax) &&
    alien.duplicationTick >= alien.duplicationTickDelay &&
    alien.E >= (alien.Emax * 0.95)
  );
}

function mutate(world, a) {
  const factor = 0.8 + world.rand() * 0.4;
  return a * factor;
}

// Cree le template d'une nouvelle alien autonome.
function createChildTemplate(world, parent) {
  const Emax = mutate(world, parent.Emax);
  const r = mutate(world, parent.R);
  const lifespan = mutate(world, parent.lifespan);

  return {
    E: Emax,
    Emax,
    energyDecayPerTick: parent.energyDecayPerTick,
    R: r,
    age: 0,
    lifespan,
    duplicationCost: parent.duplicationCost,
    duplicationTick: 0,
    duplicationTickDelay: parent.duplicationTickDelay
  };
}

export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  const childTemplate = createChildTemplate(world, parent);
  makeAlien(world, spot.x, spot.y, childTemplate);
  world.occupiedAliens.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - parent.duplicationCost, 0, parent.Emax);
  parent.duplicationTick = 0;

  return true;
}

function stepTowards(world, alien, tx, ty) {
  const dx = tx - alien.x;
  const dy = ty - alien.y;

  const primary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: alien.x + Math.sign(dx), y: alien.y }
    : { x: alien.x, y: alien.y + Math.sign(dy) };

  if (moveTo(world, alien, primary.x, primary.y)) return;

  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: alien.x, y: alien.y + Math.sign(dy) }
    : { x: alien.x + Math.sign(dx), y: alien.y };

  if (moveTo(world, alien, secondary.x, secondary.y)) return;

  randomStep(world, alien);
}

function randomStep(world, alien) {
  const r = Math.floor(world.rand() * 4);
  let nx = alien.x;
  let ny = alien.y;

  if (r === 0) nx += 1;
  else if (r === 1) nx -= 1;
  else if (r === 2) ny += 1;
  else ny -= 1;

  moveTo(world, alien, nx, ny);
}

// Un tick "JOUR" pour 1 alien.
export function updateAlienDay(world, alien) {
  if (alien.age >= alien.lifespan) {
    alien.E = 0;
    console.log(`alien#${alien.id} s'est eteinte`);
    return;
  }

  if (alien.E < 0) {
    console.log(`alien#${alien.id} n'a plus d'energie`);
    return;
  }

  alien.E -= alien.energyDecayPerTick;
  alien.age++;
  alien.duplicationTick++;

  const target = findNearestInVision(world, alien);

  if (target) {
    stepTowards(world, alien, target.x, target.y);
  } else {
    randomStep(world, alien);
  }

  if (canDuplicate(alien)) {
    tryDuplicate(world, alien);
  }

  const key = cellKey(world, alien.x, alien.y);

  if (world.occupiedPlants.has(key)) {
    const plant = world.plants.get(key);
    if (plant) {
      removePlantAt(world, alien.x, alien.y);
      alien.E = clamp(alien.E + plant.valE, 0, alien.Emax);
      alien.lastAction = { type: "eatPlant", tick: world.tick };
      console.log(`alien#${alien.id} absorbe un plant de val = ${plant.valE}`);
    }
  }

  if (world.occupiedBlobs.has(key) && (alien.E < alien.Emax - 50) && alien.duplicationTick >= alien.duplicationTickDelay) {
    let blob = null;
    for (const p of world.blobs.values()) {
      if (p.x === alien.x && p.y === alien.y) {
        blob = p;
        break;
      }
    }

    if (blob) {
      removeBlobAt(world, blob);
      alien.E = clamp(alien.E + blob.valE, 0, alien.Emax);
      alien.lastAction = { type: "eatBlob", tick: world.tick };
      console.log(`alien#${alien.id} absorbe une blob de val = ${blob.valE}`);
    }
  }
}

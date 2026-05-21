import { cellKey, dist2, clamp, moveTo, findFreeNeighborCell, removeCarrotAt, removePigAt } from "./worldOps.js";

// Cree un cochon (factory)
export function makePig(world, x, y, template) {
  const id = world.nextPigId++;

  const pig = {
    id,
    x,
    y,
    type: "pig",

    // Energie
    E: template.E ?? 0,
    Emax: template.Emax,

    // Energie recuperee par un humain qui mange le cochon
    valE: template.valE,

    // Age
    age: template.age ?? 0,
    lifespan: template.lifespan,

    // Duplication
    duplicationCost: template.duplicationCost ?? Math.ceil(template.Emax * 0.5),
    duplicationTick: template.duplicationTick ?? 0,
    duplicationTickDelay: template.duplicationTickDelay ?? 250,
  };

  world.pigs.set(id, pig);
}

// Essaie de placer un cochon sur une case libre
function trySpawnPig(world, x, y, createPigTemplate) {
  const key = cellKey(world, x, y);

  if (world.occupiedHumans.has(key)) return false;
  if (world.occupiedCarrots.has(key)) return false;
  if (world.occupiedPigs.has(key)) return false;

  const template = createPigTemplate(world);
  makePig(world, x, y, template);
  world.occupiedPigs.add(key);
  return true;
}

export function spawnInitialPigs(world, config) {
  const { count, maxAttempts, createPigTemplate } = config;

  let spawned = 0;
  let attempts = 0;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    const ok = trySpawnPig(world, x, y, createPigTemplate);
    if (ok) spawned++;
  }
}

// Cherche la carotte la plus proche
function findNearestCarrot(world, pig) {
  let best = null;
  let bestD2 = Infinity;

  for (const c of world.carrots.values()) {
    const d2 = dist2(pig.x, pig.y, c.x, c.y);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }

  return best;
}

// Mouvement d'un pas vers une cible (x,y)
function stepTowards(world, pig, tx, ty) {
  const dx = tx - pig.x;
  const dy = ty - pig.y;

  const primary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: pig.x + Math.sign(dx), y: pig.y }
    : { x: pig.x, y: pig.y + Math.sign(dy) };

  if (moveTo(world, pig, primary.x, primary.y)) return;

  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: pig.x, y: pig.y + Math.sign(dy) }
    : { x: pig.x + Math.sign(dx), y: pig.y };

  if (moveTo(world, pig, secondary.x, secondary.y)) return;

  randomStep(world, pig);
}

function randomStep(world, pig) {
  const r = Math.floor(world.rand() * 4);
  let nx = pig.x;
  let ny = pig.y;

  if (r === 0) nx += 1;
  else if (r === 1) nx -= 1;
  else if (r === 2) ny += 1;
  else ny -= 1;

  moveTo(world, pig, nx, ny);
}

function canDuplicate(pig) {
  return (
    Number.isFinite(pig.E) &&
    Number.isFinite(pig.Emax) &&
    pig.duplicationTick >= pig.duplicationTickDelay &&
    pig.E >= (pig.Emax * 0.95)
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

  makePig(world, spot.x, spot.y, childTemplate);
  world.occupiedPigs.add(cellKey(world, spot.x, spot.y));

  parent.E = clamp(parent.E - duplicationCost, 0, parent.Emax);
  parent.duplicationTick = 0;

  return true;
}

// Un tick "JOUR" pour 1 cochon
export function updatePigDay(world, pig) {
  if (pig.age >= pig.lifespan) {
    console.log(`Cochon#${pig.id} est mort de vieillesse`);
    removePigAt(world, pig);
    return;
  }

  pig.age++;
  pig.duplicationTick++;

  const target = findNearestCarrot(world, pig);

  if (target) {
    stepTowards(world, pig, target.x, target.y);
  } else {
    randomStep(world, pig);
  }

  if (canDuplicate(pig)) {
    tryDuplicate(world, pig);
  }

  const key = cellKey(world, pig.x, pig.y);
  if (world.occupiedCarrots.has(key)) {
    const carrot = world.carrots.get(key);
    if (carrot) {
      removeCarrotAt(world, pig.x, pig.y);
      pig.E = clamp(pig.E + carrot.valE, 0, pig.Emax);
      console.log(`Cochon#${pig.id} mange une carotte de val = ${carrot.valE}`);
    }
  }
}

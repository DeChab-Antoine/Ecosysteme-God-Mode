import { cellKey, dist2, clamp, moveTo, findFreeNeighborCell, removeCarrotAt, removePigAt } from "./worldOps.js";

// Crée un cochon (factory)
export function makePig(world, x, y, template) {
  const id = world.nextPigId++;

  // On clone le template et on ajoute l'id + position
  const pig = {
    id,
    x,
    y,
    type: "pig",

    // Energie
    E: 0,
    Emax: template.Emax,

    // Energie pour humain
    valE: template.valE,

    // Age
    age: 0,
    lifespan: template.lifespan,
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

  // Simple (bruteforce) : 
  for (const c of world.carrots.values()) {
    const d2 = dist2(pig.x, pig.y, c.x, c.y);
    if (d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }
  return best; // soit {x,y,valE} soit null
}


// Mouvement d'un pas vers une cible (x,y)
function stepTowards(world, pig, tx, ty) {
  const dx = tx - pig.x;
  const dy = ty - pig.y;

  // 1) direction principale (axe dominant)
  const primary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: pig.x + Math.sign(dx), y: pig.y }
    : { x: pig.x, y: pig.y + Math.sign(dy) };

  if (moveTo(world, pig, primary.x, primary.y)) return;

  // 2) direction secondaire (l'autre axe)
  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: pig.x, y: pig.y + Math.sign(dy) }
    : { x: pig.x + Math.sign(dx), y: pig.y };

  if (moveTo(world, pig, secondary.x, secondary.y)) return;

  // 3) sinon: petit déplacement aléatoire pour se dégager
  randomStep(world, pig);
}


// Mouvement random 
function randomStep(world, pig) {
  const r = Math.floor(world.rand() * 4); // 0..3
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
    // Assez d'énergie pour se dupliquer
    pig.E >= (pig.Emax * 0.95)
  );
}


// crée le bébé
export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  // Crée un adulte
  const childTemplate = {
        // Energie
        E: parent.E,
        Emax: parent.Emax,

        // Energie pour humain
        valE: parent.valE,

        // Age
        age: 0,
        lifespan: parent.lifespan,
    };
  makePig(world, spot.x, spot.y, childTemplate);

  // Ajout au world
  world.occupiedPigs.add(cellKey(world, spot.x, spot.y));

  // Coût énergie + reset cooldown parent
  parent.E -= parent.duplicationCost;

  parent.duplicationTick = 0;

  return true;
}

// Un tick "JOUR" pour 1 cochon
export function updatePigDay(world, pig) {
  // si trop vieux supprimer energie 
  if (pig.age >= pig.lifespan) {
    console.log(`Cochon#${pig.id} est mort de vielliesse`);
    removePigAt(world, pig);
    return; 
  }

  // age augmente 
  pig.age++;

  // comportement
  let target = findNearestCarrot(world, pig);

  if (target) {
    stepTowards(world, pig, target.x, target.y);
  } else {
    randomStep(world, pig);
  }

  if (canDuplicate(pig)) {
    tryDuplicate(world, pig);
  }


  // si sur carotte => manger
  const key = cellKey(world, pig.x, pig.y);
  if (world.occupiedCarrots.has(key)) {
    // récup valE avant suppression
    const carrot = world.carrots.get(key);
    if (carrot) {
      removeCarrotAt(world, pig.x, pig.y);
      pig.E = clamp(pig.E + carrot.valE, 0, pig.Emax);
      console.log(`Cochon#${pig.id} mange une carotte de val = ${carrot.valE}`);
    }
  }
}


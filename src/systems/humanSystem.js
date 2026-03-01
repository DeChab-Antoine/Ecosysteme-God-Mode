import { moveTo, removeCarrotAt, removePigAt, cellKey, dist2, clamp, findFreeNeighborCell, isAdjacentOrSame} from "./worldOps.js";
import { makeHuman } from "./humanSpawnSystem.js";

// Cherche la nourriture la plus proche dans le rayon R
function findNearestInVision(world, human) {
  const R2 = human.R * human.R;

  let best = null;
  let bestD2 = Infinity;

  // Simple (bruteforce) : 
  // On cherche les carottes dans le rayon de vision
  for (const c of world.carrots.values()) {
    const d2 = dist2(human.x, human.y, c.x, c.y);
    if (d2 <= R2 && d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }

  // On cherche les cochons dans le rayon de vision
  for (const p of world.pigs.values()) {
    const d2 = dist2(human.x, human.y, p.x, p.y);   
    if (d2 <= R2 && d2 < bestD2) {
      bestD2 = d2;
      best = p;
    }
  }

  return best; // soit {x,y,valE} soit null
}


function canDuplicate(human) {
  return (
    // A envie de se dupliquer 
    human.duplicationTick >= human.duplicationTickDelay &&
    // Assez d'énergie pour se dupliquer
    human.E >= (human.Emax * 0.95)
  );
}


function mutate(a) {
    const factor = 0.8 + Math.random() * 0.4; 
    return a * factor;
}


// Crée le template bébé
function createChildTemplate(parent) {
    const Emax = mutate(parent.Emax);
    const r = mutate(parent.R);
    const lifespan = mutate(parent.lifespan);



    return {
        // Energie
        E: Emax,
        Emax: Emax,
        energyDecayPerTick: parent.energyDecayPerTick,

        // Vision rayon
        R: r,

        // Age
        age: 0,
        lifespan: lifespan,
        
        // Duplication 
        duplicationCost: parent.duplicationCost,
        duplicationTick: 0,
        duplicationTickDelay: parent.duplicationTickDelay
    }
}


// crée le bébé
export function tryDuplicate(world, parent) {
  const spot = findFreeNeighborCell(world, parent.x, parent.y);
  if (!spot) return false;

  // Crée un adulte
  const childTemplate = createChildTemplate(parent);
  makeHuman(world, spot.x, spot.y, childTemplate);

  // Ajout au world
  world.occupiedHumans.add(cellKey(world, spot.x, spot.y));

  // Coût énergie + reset cooldown parent
  parent.E -= parent.duplicationCost;

  parent.duplicationTick = 0;

  return true;
}

// Mouvement d'un pas vers une cible (x,y)
function stepTowards(world, human, tx, ty) {
  const dx = tx - human.x;
  const dy = ty - human.y;

  // 1) direction principale (axe dominant)
  const primary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: human.x + Math.sign(dx), y: human.y }
    : { x: human.x, y: human.y + Math.sign(dy) };

  if (moveTo(world, human, primary.x, primary.y)) return;

  // 2) direction secondaire (l'autre axe)
  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: human.x, y: human.y + Math.sign(dy) }
    : { x: human.x + Math.sign(dx), y: human.y };

  if (moveTo(world, human, secondary.x, secondary.y)) return;

  // 3) sinon: petit déplacement aléatoire pour se dégager
  randomStep(world, human);
}


// Mouvement random 
function randomStep(world, human) {
  const r = Math.floor(world.rand() * 4); // 0..3
  let nx = human.x;
  let ny = human.y;

  if (r === 0) nx += 1;
  else if (r === 1) nx -= 1;
  else if (r === 2) ny += 1;
  else ny -= 1;

  moveTo(world, human, nx, ny);
}


// Un tick "JOUR" pour 1 humain
export function updateHumanDay(world, human) {
  // si trop vieux supprimer energie 
  if (human.age >= human.lifespan) {
    human.E = 0;
    console.log(`Humain#${human.id} est mort de vielliesse`);
    return; 
  }

  // si plus d'énergie peut plus bouger (et va mourir)
  if (human.E < 0) {
    console.log(`Humain#${human.id} est mort d'épuissement`);
    return;
  }

  // perte d'énergie
  human.E -= human.energyDecayPerTick;

  // age augmente 
  human.age++;

  // envie de se reproduire 
  human.duplicationTick++;

  // comportement
  let target = findNearestInVision(world, human);

  if (target && (human.E < human.Emax - 50) && human.duplicationTick >= human.duplicationTickDelay) {
    stepTowards(world, human, target.x, target.y);
  } else {
    randomStep(world, human);
  }

  if (canDuplicate(human)) {
    tryDuplicate(world, human);
  }

  // si sur carotte => manger
  const key = cellKey(world, human.x, human.y);
  
  if (world.occupiedCarrots.has(key)) {
    // récup valE avant suppression
    const carrot = world.carrots.get(key);
    if (carrot) {
      removeCarrotAt(world, human.x, human.y);
      human.E = clamp(human.E + carrot.valE, 0, human.Emax);
      console.log(`Humain#${human.id} mange une carotte de val = ${carrot.valE}`);
    }
  }

  // si sur cochon => manger
  if (world.occupiedPigs.has(key) && (human.E < human.Emax - 50) && human.duplicationTick >= human.duplicationTickDelay) {
    let pig = null;
    for (const p of world.pigs.values()) {
      if (p.x === human.x && p.y === human.y) {
        pig = p;
        break;
      }
    }  
    if (pig) {
      removePigAt(world, pig);
      human.E = clamp(human.E + pig.valE, 0, human.Emax);
      console.log(`Humain#${human.id} mange un cochon de val = ${pig.valE}`);
    }
  }
}

import { cellKey } from "../world.js";
import { moveHumanTo, removeCarrotAt } from "./worldOps.js";
import { makeHuman } from "./humanSpawnSystem.js";

// Petite fonction utilitaire
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Distance au carré (évite sqrt)
function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// Cherche la carotte la plus proche dans le rayon R
function findNearestCarrotInVision(world, human) {
  const R2 = human.R * human.R;

  let best = null;
  let bestD2 = Infinity;

  // Simple (bruteforce) : 
  for (const c of world.carrots.values()) {
    const d2 = dist2(human.x, human.y, c.x, c.y);
    if (d2 <= R2 && d2 < bestD2) {
      bestD2 = d2;
      best = c;
    }
  }
  return best; // soit {x,y,valE} soit null
}


function isAdjacentOrSame(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx + dy) <= 1;
}


function canDuplicate(human) {
  return (
    // A envie de se dupliquer 
    human.duplicationTick >= human.duplicationTickDelay &&
    // Assez d'énergie pour se dupliquer
    human.E >= (human.Emax * 0.95)
  );
}


// Cherche une case pour faire spawn le bébé
function findFreeNeighborCell(world, x, y) {
  // 4 directions (tu peux ajouter diagonales si tu veux)
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  // On mélange un peu l'ordre pour ne pas avoir toujours la même direction
  for (let i = dirs.length - 1; i > 0; i--) {
    const j = Math.floor(world.rand() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;

    if (nx < 0 || nx >= world.gridW) continue;
    if (ny < 0 || ny >= world.gridH) continue;

    const k = cellKey(world, nx, ny);
    if (!world.occupiedHumans.has(k)) {
      return { x: nx, y: ny };
    }
  }
  return null;
}


function mutate(a) {
    const factor = 1 + Math.random() * 0;
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
        energyDecayPerTick: parent.Emax * 1.0025 - parent.Emax,

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

  if (moveHumanTo(world, human, primary.x, primary.y)) return;

  // 2) direction secondaire (l'autre axe)
  const secondary = (Math.abs(dx) >= Math.abs(dy))
    ? { x: human.x, y: human.y + Math.sign(dy) }
    : { x: human.x + Math.sign(dx), y: human.y };

  if (moveHumanTo(world, human, secondary.x, secondary.y)) return;

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

  moveHumanTo(world, human, nx, ny);
}


// Un tick "JOUR" pour 1 humain
function updateHumanDay(world, human) {
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
  let target = findNearestCarrotInVision(world, human);

  if (target) {
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
}

// Tick "JOUR" : update tous les humains
export function updateHumansDay(world) {
  for (const human of world.humans.values()) {
    updateHumanDay(world, human);
  }
}

// Tick "NUIT" : supprimer les morts
export function nightCleanup(world) {
  for (const [id, human] of world.humans.entries()) {
    if (human.E <= 0) {
      console.log(`Humain#${human.id} a disparu`);
      const key = cellKey(world, human.x, human.y);
      world.occupiedHumans.delete(key);
      world.humans.delete(id);

    } 
  }
}

import { cellKey } from "../world.js";
import { moveHumanTo, removeCarrotAt } from "./worldOps.js";

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

// Mouvement d'un pas vers une cible (x,y)
function stepTowards(world, human, tx, ty) {
  const dx = tx - human.x;
  const dy = ty - human.y;

  // Choix d'une direction : on avance sur l'axe le plus "loin"
  let nx = human.x;
  let ny = human.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    nx += Math.sign(dx);
  } else {
    ny += Math.sign(dy);
  }

  moveHumanTo(world, human, nx, ny)
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
function updateHumanDay(world, human, config) {
  // si trop vieux supprimer energie 
  if (human.age >= human.lifespan) {
    human.E = 0;
    return; 
  }

  // si plus d'énergie peut plus bouger (et va mourir)
  if (human.E < 0) {
    return;
  }

  // perte d'énergie
  human.E -= config.energyDecayPerTick;

  // age augmente 
  human.age++

  // comportement
  const target = findNearestCarrotInVision(world, human);

  if (target) {
    stepTowards(world, human, target.x, target.y);
  } else {
    randomStep(world, human, config);
  }

  // si sur carotte => manger
  const key = cellKey(world, human.x, human.y);
  if (world.occupiedCarrots.has(key)) {
    // récup valE avant suppression
    const carrot = world.carrots.get(key);
    if (carrot) {
      removeCarrotAt(world, human.x, human.y);
      human.E = clamp(human.E + carrot.valE, 0, human.Emax);

    }
  }
}

// Tick "JOUR" : update tous les humains
export function updateHumansDay(world, config) {
  for (const human of world.humans.values()) {
    updateHumanDay(world, human, config);
  }
}

// Tick "NUIT" : supprimer les morts
export function nightCleanup(world) {
  for (const [id, human] of world.humans.entries()) {
    if (human.E <= 0) {
      const key = cellKey(world, human.x, human.y);
      world.occupiedHumans.delete(key);
      world.humans.delete(id);

    } 
  }
}

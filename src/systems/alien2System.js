import { cellKey, dist2, removePoisonPlantAt } from "./worldOps.js";
import { stepTowards, wanderStep } from "./movementUtils.js";

export function makeAlien2(world, x, y, template) {
  const id = world.nextAlien2Id++;
  world.aliens2.set(id, {
    id, x, y,
    type: "alien2",
    E:    template.E,
    Emax: template.Emax,
    R:    template.R,
    age:  0,
  });
}

function findNearestAlien(world, alien2) {
  const r2 = alien2.R * alien2.R;
  let best = null, bestD2 = Infinity;
  for (const a of world.aliens.values()) {
    const d2 = dist2(alien2.x, alien2.y, a.x, a.y);
    if (d2 <= r2 && d2 < bestD2) { bestD2 = d2; best = a; }
  }
  return best;
}

export function updateAlien2Day(world, alien2) {
  alien2.age++;

  // Chasse les aliens normaux en priorité, erre sinon
  const target = findNearestAlien(world, alien2);
  if (target) {
    stepTowards(world, alien2, target.x, target.y);
  } else {
    wanderStep(world, alien2);
  }

  const key = cellKey(world, alien2.x, alien2.y);

  // Tue l'alien normal sur la même case
  if (world.occupiedAliens.has(key)) {
    for (const a of world.aliens.values()) {
      if (a.x === alien2.x && a.y === alien2.y) {
        world.occupiedAliens.delete(cellKey(world, a.x, a.y));
        world.aliens.delete(a.id);
        alien2.lastAction = { type: "attackAlien", tick: world.tick };
        break;
      }
    }
  }

  // Plante poison → mort instantanée
  if (world.occupiedPoisonPlants.has(key) && world.poisonPlants.has(key)) {
    removePoisonPlantAt(world, alien2.x, alien2.y);
    world.poisonKillEvents.push({ type: "alien2", x: alien2.x, y: alien2.y });
    world.occupiedAliens2.delete(key);
    world.aliens2.delete(alien2.id);
  }
}

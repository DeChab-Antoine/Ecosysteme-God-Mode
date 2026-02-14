import { cellKey } from "../world.js";

// Crée un humain (factory)
function makeHuman(world, x, y, template) {
  const id = world.nextHumanId++;

  // On clone le template et on ajoute l'id + position
  const human = {
    id,
    x,
    y,
    E: template.E,
    Emax: template.Emax,
    R: template.R,
  };

  world.humans.set(id, human);
}

// Essaie de placer un humain sur une case libre (pas d'humain, pas de carotte)
function trySpawnHuman(world, x, y, template) {
  const key = cellKey(world, x, y);

  if (world.occupiedHumans.has(key)) return false;
  if (world.occupiedCarrots.has(key)) return false;

  makeHuman(world, x, y, template);
  world.occupiedHumans.add(key);
  return true;
}

export function spawnInitialHumans(world, config) {
  const {
    count,
    maxAttempts,
    humanTemplate
  } = config;

  let spawned = 0;
  let attempts = 0;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    const ok = trySpawnHuman(world, x, y, humanTemplate);
    if (ok) spawned++;
  }

}

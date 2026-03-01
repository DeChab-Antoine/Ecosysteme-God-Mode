import { cellKey } from "./worldOps.js";

// Crée un humain (factory)
export function makeHuman(world, x, y, template) {
  const id = world.nextHumanId++;

  // On clone le template et on ajoute l'id + position
  const human = {
    id,
    x,
    y,
    type: "human",

    // Energie
    E: template.E,
    Emax: template.Emax,
    energyDecayPerTick: template.energyDecayPerTick,

    // Vision rayon
    R: template.R,

    // Age
    age: 0,
    lifespan: template.lifespan,
    
    // Clonage 
    duplicationCost: template.duplicationCost,
    duplicationTick: template.duplicationTick,
    duplicationTickDelay: template.duplicationTickDelay
  };

  world.humans.set(id, human);
}

// Essaie de placer un humain sur une case libre 
function trySpawnHuman(world, x, y, createHumanTemplate) {
  const key = cellKey(world, x, y);

  if (world.occupiedHumans.has(key)) return false;
  if (world.occupiedCarrots.has(key)) return false;
  if (world.occupiedPigs.has(key)) return false;

  const template = createHumanTemplate(world); 
  makeHuman(world, x, y, template);
  world.occupiedHumans.add(key);
  return true;
}

export function spawnInitialHumans(world, config) {
  const { count, maxAttempts, createHumanTemplate } = config;

  let spawned = 0;
  let attempts = 0;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    const ok = trySpawnHuman(world, x, y, createHumanTemplate);
    if (ok) spawned++;
  }
}

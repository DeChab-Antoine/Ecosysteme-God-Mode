import { cellKey } from "./worldOps.js";

// Cree une alien autonome. Le type interne "alien" reste pour compatibilite.
export function makeAlien(world, x, y, template) {
  const id = world.nextAlienId++;

  // On clone le template et on ajoute l'id + position
  const alien = {
    id,
    x,
    y,
    type: "alien",

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
    duplicationCost:   template.duplicationCost,
    duplicationChance: template.duplicationChance ?? 0,
  };

  world.aliens.set(id, alien);
}

// Essaie de placer une alien sur une case libre.
function trySpawnAlien(world, x, y, createAlienTemplate) {
  const key = cellKey(world, x, y);

  if (world.occupiedAliens.has(key)) return false;
  if (world.occupiedPoisonPlants.has(key)) return false;
  if (world.occupiedBlobs.has(key)) return false;

  const template = createAlienTemplate(world); 
  makeAlien(world, x, y, template);
  world.occupiedAliens.add(key);
  return true;
}

export function spawnInitialAliens(world, config) {
  const { count, maxAttempts, createAlienTemplate } = config;

  let spawned = 0;
  let attempts = 0;

  while (spawned < count && attempts < maxAttempts) {
    attempts++;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    const ok = trySpawnAlien(world, x, y, createAlienTemplate);
    if (ok) spawned++;
  }
}

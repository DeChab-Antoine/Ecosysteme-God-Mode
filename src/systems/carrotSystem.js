import { cellKey } from "../world.js";

// Essaie de spawn une carotte sur une case libre
function trySpawnCarrot(world, x, y, valE) {
  const key = cellKey(world, x, y);

  // Refuse si case déjà occupée
  if (world.occupied.has(key)) return false;

  // Ajoute la carotte
  world.carrots.set(key, { x, y, valE });

  // Marque occupé (important pour plus tard humains + carottes)
  world.occupied.add(key);

  return true;
}

// Spawn "probabiliste par tick" mais stable via un cap + tentatives limitées
export function updateCarrotSpawns(world, config) {
  const {
    maxCarrots,           // cap global => stabilité
    spawnAttemptsPerTick, // nb d'essais aléatoires par tick
    spawnChance,          // probabilité de réussir un essai
    valE
  } = config;

  // Si déjà au cap, ne spawn plus
  if (world.carrots.size >= maxCarrots) return;

  for (let i = 0; i < spawnAttemptsPerTick; i++) {
    if (world.carrots.size >= maxCarrots) break;

    // Un essai n'aboutit que selon spawnChance
    if (world.rand() > spawnChance) continue;

    // Choix d'une case aléatoire
    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    trySpawnCarrot(world, x, y, valE);
  }
}

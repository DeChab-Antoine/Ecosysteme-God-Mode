import { removeCarrotAt, cellKey } from "./worldOps.js";

/**
 * Essaie de spawn une carotte sur une case libre.
 * - interdit si déjà carotte
 * - interdit si déjà humain (même règle que ton spawn humains)
 */
function trySpawnCarrot(world, x, y, config) {
  const key = cellKey(world, x, y);

  // Case déjà occupée
  if (world.occupiedCarrots.has(key)) return false;
  if (world.occupiedHumans.has(key)) return false;
  if (world.occupiedPigs.has(key)) return false;

  // Carotte = entité avec cycle de vie (pourriture)
  world.carrots.set(key, {
    x,
    y,
    valE: config.valE,
    age: 0,
    maxAge: config.maxAge
  });

  world.occupiedCarrots.add(key);
  return true;
}

/**
 * Spawn probabiliste par tick avec cap global (stable).
 * config attendu :
 * - maxCarrots
 * - spawnAttemptsPerTick
 * - spawnChance
 * - valE
 * - maxAge
 */
export function updateCarrotSpawns(world, config) {
  const {
    maxCarrots,
    spawnAttemptsPerTick,
    spawnChance
  } = config;

  if (world.carrots.size >= maxCarrots) return;

  for (let i = 0; i < spawnAttemptsPerTick; i++) {
    if (world.carrots.size >= maxCarrots) break;

    if (world.rand() > spawnChance) continue;

    const x = Math.floor(world.rand() * world.gridW);
    const y = Math.floor(world.rand() * world.gridH);

    trySpawnCarrot(world, x, y, config);
  }
}

/**
 * Vieillissement / pourriture des carottes.
 * À appeler pendant le JOUR (comme l'âge des humains).
 */
export function updateCarrotsAging(world) {
  // On itère sur une copie car on supprime pendant la boucle
  for (const carrot of Array.from(world.carrots.values())) {
    carrot.age += 1;

    if (carrot.age >= carrot.maxAge) {
      // suppression propre via worldOps (met à jour Map + Set)
      removeCarrotAt(world, carrot.x, carrot.y);

      console.log(`Carotte pourrie à (${carrot.x},${carrot.y})`);
    }
  }
}
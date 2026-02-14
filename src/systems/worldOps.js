import { cellKey } from "../world.js";

// Retire une carotte si elle existe sur (x,y)
export function removeCarrotAt(world, x, y) {
  const key = cellKey(world, x, y);
  if (!world.occupiedCarrots.has(key)) return false;

  world.occupiedCarrots.delete(key);
  world.carrots.delete(key);
  return true;
}

// Déplace un humain (1 case) en mettant à jour occupiedHumans
export function moveHumanTo(world, human, newX, newY) {
  // Monde borné
  if (newX < 0 || newX >= world.gridW) return false;
  if (newY < 0 || newY >= world.gridH) return false;

  const oldKey = cellKey(world, human.x, human.y);
  const newKey = cellKey(world, newX, newY);

  // 1 humain par case
  if (world.occupiedHumans.has(newKey)) return false;

  // Met à jour occupation + position
  world.occupiedHumans.delete(oldKey);
  world.occupiedHumans.add(newKey);

  human.x = newX;
  human.y = newY;
  return true;
}

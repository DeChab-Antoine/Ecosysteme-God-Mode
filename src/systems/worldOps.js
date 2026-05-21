// Retire une carotte si elle existe sur (x,y)
export function removeCarrotAt(world, x, y) {
  const key = cellKey(world, x, y);
  if (!world.occupiedCarrots.has(key)) return false;

  world.occupiedCarrots.delete(key);
  world.carrots.delete(key);
  return true;
}


// Retire un cochon 
export function removePigAt(world, pig) {
  const key = cellKey(world, pig.x, pig.y);
  if (!world.occupiedPigs.has(key)) return false;

  world.occupiedPigs.delete(key);
  world.pigs.delete(pig.id);

  return true;
}

// Déplace un objet (1 case) en mettant à jour occupiedHumans, occupiedPigs
export function moveTo(world, obj, newX, newY) {
  // 1) Monde borné
  if (newX < 0 || newX >= world.gridW) return false;
  if (newY < 0 || newY >= world.gridH) return false;

  const oldKey = cellKey(world, obj.x, obj.y);
  const newKey = cellKey(world, newX, newY);

  // Si on ne bouge pas
  if (newKey === oldKey) return true;

  const isHuman = obj.type === 'human';

  // 2) Règles de collision
  if (isHuman) {
    // humain bloqué seulement par humain
    if (world.occupiedHumans.has(newKey)) return false;
  } else {
    // cochon bloqué par humain ET cochon
    if (world.occupiedHumans.has(newKey)) return false;
    if (world.occupiedPigs.has(newKey)) return false;
  }

  // 3) Mise à jour des sets
  if (isHuman) {
    world.occupiedHumans.delete(oldKey);
    world.occupiedHumans.add(newKey);
  } else {
    world.occupiedPigs.delete(oldKey);
    world.occupiedPigs.add(newKey);
  }

  obj.x = newX;
  obj.y = newY;

  return true;
}


// Petite fonction utilitaire
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Distance au carré (évite sqrt)
export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}


// Convertit (x,y) en index unique pour Set/Map
export function cellKey(world, x, y) {
  return y * world.gridW + x;
}


export function isAdjacentOrSame(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx + dy) <= 1;
}

// Cherche une case pour faire spawn un bébé
export function findFreeNeighborCell(world, x, y) {
  // 4 directions 
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
    if (
      !world.occupiedHumans.has(k) &&
      !world.occupiedPigs.has(k) &&
      !world.occupiedCarrots.has(k)
    ) {
      return { x: nx, y: ny };
    }
  }
  return null;
}

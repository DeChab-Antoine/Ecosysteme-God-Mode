// Retire un plant nutritif si il existe sur (x,y).
export function removePlantAt(world, x, y) {
  const key = cellKey(world, x, y);
  if (!world.occupiedPlants.has(key)) return false;

  world.occupiedPlants.delete(key);
  world.plants.delete(key);
  return true;
}

// Retire une blob.
export function removeBlobAt(world, blob) {
  const key = cellKey(world, blob.x, blob.y);
  if (!world.occupiedBlobs.has(key)) return false;

  world.occupiedBlobs.delete(key);
  world.blobs.delete(blob.id);

  return true;
}

// Deplace une entite (1 case) en mettant a jour les sets d'occupation.
export function moveTo(world, obj, newX, newY) {
  if (newX < 0 || newX >= world.gridW) return false;
  if (newY < 0 || newY >= world.gridH) return false;

  const oldKey = cellKey(world, obj.x, obj.y);
  const newKey = cellKey(world, newX, newY);

  if (newKey === oldKey) return true;

  const isSentinel = obj.type === "alien";

  if (isSentinel) {
    if (world.occupiedAliens.has(newKey)) return false;
  } else {
    if (world.occupiedAliens.has(newKey)) return false;
    if (world.occupiedBlobs.has(newKey)) return false;
  }

  if (isSentinel) {
    world.occupiedAliens.delete(oldKey);
    world.occupiedAliens.add(newKey);
  } else {
    world.occupiedBlobs.delete(oldKey);
    world.occupiedBlobs.add(newKey);
  }

  obj.x = newX;
  obj.y = newY;

  return true;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function cellKey(world, x, y) {
  return y * world.gridW + x;
}

export function isAdjacentOrSame(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx + dy) <= 1;
}

// Cherche une case pour faire apparaitre une nouvelle entite.
export function findFreeNeighborCell(world, x, y) {
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

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
      !world.occupiedAliens.has(k) &&
      !world.occupiedBlobs.has(k) &&
      !world.occupiedPlants.has(k)
    ) {
      return { x: nx, y: ny };
    }
  }

  return null;
}

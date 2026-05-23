// Retire une plante poison si elle existe sur (x,y).
export function removePoisonPlantAt(world, x, y) {
  const key = cellKey(world, x, y);
  if (!world.occupiedPoisonPlants.has(key)) return false;

  world.occupiedPoisonPlants.delete(key);
  world.poisonPlants.delete(key);
  return true;
}

export function removeRagePlantAt(world, x, y) {
  const key = cellKey(world, x, y);
  if (!world.occupiedRagePlants.has(key)) return false;

  world.occupiedRagePlants.delete(key);
  world.ragePlants.delete(key);
  return true;
}

// Retire un blob. Ne se fie pas au set d'occupation (plusieurs blobs peuvent partager
// une case depuis la suppression du blocage inter-blobs) — supprime directement la Map.
export function removeBlobAt(world, blob) {
  world.blobs.delete(blob.id);
  // Le set occupiedBlobs sera reconstruit au prochain tick (main.js).
  // On le met à jour ici uniquement si aucun autre blob n'est encore sur cette case.
  const key = cellKey(world, blob.x, blob.y);
  const stillOccupied = [...world.blobs.values()].some(
    (b) => b.x === blob.x && b.y === blob.y
  );
  if (!stillOccupied) world.occupiedBlobs.delete(key);
  return true;
}

// Deplace une entite (1 case) en mettant a jour les sets d'occupation.
// Les entités du même type se traversent mutuellement pour éviter les embouteillages.
// Les sets sont reconstruits au début de chaque tick (main.js) pour rester cohérents.
export function moveTo(world, obj, newX, newY) {
  if (newX < 0 || newX >= world.gridW) return false;
  if (newY < 0 || newY >= world.gridH) return false;

  const oldKey = cellKey(world, obj.x, obj.y);
  const newKey = cellKey(world, newX, newY);

  if (newKey === oldKey) return true;

  if (obj.type === "blob") {
    // Les blobs fuient tous les aliens, mais ne bloquent pas entre eux
    if (world.occupiedAliens.has(newKey))  return false;
    if (world.occupiedAliens2.has(newKey)) return false;
  }
  // alien et alien2 se traversent mutuellement et n'ont aucun blocage entre eux

  if (obj.type === "alien") {
    world.occupiedAliens.delete(oldKey);
    world.occupiedAliens.add(newKey);
  } else if (obj.type === "alien2") {
    world.occupiedAliens2.delete(oldKey);
    world.occupiedAliens2.add(newKey);
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
      !world.occupiedAliens2.has(k) &&
      !world.occupiedBlobs.has(k) &&
      !world.occupiedPoisonPlants.has(k) &&
      !world.occupiedRagePlants.has(k)
    ) {
      return { x: nx, y: ny };
    }
  }

  return null;
}

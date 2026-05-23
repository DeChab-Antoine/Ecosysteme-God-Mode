import { moveTo } from "./worldOps.js";

// Avance vers (tx, ty) : diagonale en premier, puis axe dominant, puis axe secondaire,
// puis 4 cardinales mélangées aléatoirement (contournement d'obstacle).
export function stepTowards(world, entity, tx, ty) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (sx !== 0 && sy !== 0 && moveTo(world, entity, entity.x + sx, entity.y + sy)) return;

  const primary = Math.abs(dx) >= Math.abs(dy)
    ? { x: entity.x + sx, y: entity.y }
    : { x: entity.x,      y: entity.y + sy };
  if (moveTo(world, entity, primary.x, primary.y)) return;

  const secondary = Math.abs(dx) >= Math.abs(dy)
    ? { x: entity.x,      y: entity.y + sy }
    : { x: entity.x + sx, y: entity.y };
  if (moveTo(world, entity, secondary.x, secondary.y)) return;

  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(world.rand() * (i + 1));
    [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
  }
  for (const [ddx, ddy] of dirs) {
    if (moveTo(world, entity, entity.x + ddx, entity.y + ddy)) return;
  }
}

// Errance globale : waypoint aléatoire sur toute la carte, garantit une vraie couverture.
export function wanderStep(world, entity) {
  if (
    entity.wanderX === undefined ||
    Math.abs(entity.x - entity.wanderX) + Math.abs(entity.y - entity.wanderY) <= 3
  ) {
    entity.wanderX = Math.floor(world.rand() * world.gridW);
    entity.wanderY = Math.floor(world.rand() * world.gridH);
  }
  stepTowards(world, entity, entity.wanderX, entity.wanderY);
}

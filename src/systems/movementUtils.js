import { moveTo } from "./worldOps.js";

// Dérive angulaire par entité — évolue lentement pour créer des courbes organiques.
const MAX_DRIFT  = 0.70; // ~40° d'écart max par rapport à la direction idéale
const DRIFT_RATE = 0.22; // amplitude de changement par tick

function updateDrift(world, entity) {
  if (entity._drift === undefined) {
    entity._drift = (world.rand() - 0.5) * MAX_DRIFT;
  }
  entity._drift += (world.rand() - 0.5) * DRIFT_RATE;
  if (entity._drift >  MAX_DRIFT) entity._drift =  MAX_DRIFT;
  if (entity._drift < -MAX_DRIFT) entity._drift = -MAX_DRIFT;
}

// 8 directions possibles triées par alignement décroissant avec (cx, cy).
// Permet d'essayer d'abord la meilleure direction puis de se rabattre en cas de blocage.
function rankedSteps(cx, cy) {
  return [
    [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1],
    [ 1,  1], [ 1, -1], [-1,  1], [-1, -1],
  ].sort((a, b) => (b[0] * cx + b[1] * cy) - (a[0] * cx + a[1] * cy));
}

// Avance d'une case vers (tx, ty) avec une dérive angulaire organique.
// La dérive s'atténue à l'approche de la cible pour garantir la convergence.
export function stepTowards(world, entity, tx, ty) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  if (dx === 0 && dy === 0) return;

  updateDrift(world, entity);

  const dist = Math.sqrt(dx * dx + dy * dy);
  // Dérive atténuée quand l'entité est proche de sa cible
  const driftFactor = Math.min(1, dist / 6);
  const angle = Math.atan2(dy, dx) + entity._drift * driftFactor;

  const cx = Math.cos(angle);
  const cy = Math.sin(angle);

  for (const [ddx, ddy] of rankedSteps(cx, cy)) {
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

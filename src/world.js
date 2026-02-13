// Le World contient UNIQUEMENT l'état (pas de logique)

// Convertit (x,y) en index unique pour Set/Map
export function cellKey(world, x, y) {
  return y * world.gridW + x;
}

export function createWorld({ gridW, gridH, dayTicks, seed }) {
  return {
    gridW,
    gridH,
    dayTicks,
    tick: 0,

    // RNG seedé (fonction rand())
    seed,
    rand: null, // sera injecté dans main

    // Entités
    carrots: new Map(), // key -> { x, y, valE }

    // Occupation (pour empêcher spawn sur case déjà prise)
    // Plus tard: on ajoutera humansKeys / ou une occupancy globale
    occupied: new Set()
  };
}

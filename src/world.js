// Le World contient UNIQUEMENT l'état (pas de logique)

// Convertit (x,y) en index unique pour Set/Map
export function cellKey(world, x, y) {
  return y * world.gridW + x;
}

export function createWorld({ gridW, gridH, dayTicks, nightTicks, seed }) {
  return {
    gridW,
    gridH,
    dayTicks,
    nightTicks,
    tick: 0,


    // RNG seedé (fonction rand())
    seed,
    rand: null, // sera injecté dans main

    // Entités
    carrots: new Map(), // key -> { x, y, valE }
    humans: new Map(),  // id -> { id, x, y, E, Emax, R }

    // Occupation (pour empêcher spawn sur case déjà prise)
    occupiedCarrots: new Set(), // key
    occupiedHumans: new Set(),  // key

    // compteur d'ID humains
    nextHumanId: 1
  };
}

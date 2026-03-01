// Le World contient UNIQUEMENT l'état (pas de logique)

export function createWorld({ gridW, gridH, dayTicks, nightTicks, seed }) {
  return {
    gridW,
    gridH,
    dayTicks,
    nightTicks,
    tick: 0,
    day: 0,


    // RNG seedé (fonction rand())
    seed,
    rand: null, // sera injecté dans main

    // Entités
    carrots: new Map(), // key -> { x, y, valE }
    humans: new Map(),  // id -> { id, x, y, E, Emax, R }
    pigs: new Map(),    // id -> { id, x, y, E, Emax}

    // Occupation (pour empêcher spawn sur case déjà prise)
    occupiedCarrots: new Set(), // key
    occupiedHumans: new Set(),  // key
    occupiedPigs: new Set(),    // key

    // compteur d'ID humains
    nextHumanId: 1,
    nextPigId: 1
  };
}

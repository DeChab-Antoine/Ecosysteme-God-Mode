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
    plants: new Map(), // plants nutritives, key -> { x, y, valE }
    aliens: new Map(), // aliens, id -> { id, x, y, E, Emax, R }
    blobs: new Map(), // blobs, id -> { id, x, y, E, Emax}

    // Occupation (pour empêcher spawn sur case déjà prise)
    occupiedPlants: new Set(), // key
    occupiedAliens: new Set(),  // key
    occupiedBlobs: new Set(),    // key

    // Compteurs d'ID des entites autonomes.
    nextAlienId: 1,
    nextBlobId: 1
  };
}

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
    poisonPlants: new Map(), // plantes poison, key -> { x, y }
    aliens: new Map(),       // aliens, id -> { id, x, y, E, Emax, R }
    blobs: new Map(),        // blobs, id -> { id, x, y, E, Emax }

    // Occupation (pour empêcher spawn sur case déjà prise)
    occupiedPoisonPlants: new Set(),
    occupiedAliens: new Set(),
    occupiedBlobs: new Set(),

    // Compteurs d'ID des entites autonomes.
    nextAlienId: 1,
    nextBlobId: 1,
    maxBlobs: 120,  // injecté depuis config au démarrage

    // Événements de kills par poison (lus et vidés chaque tick par main.js)
    poisonKillEvents: [],
  };
}

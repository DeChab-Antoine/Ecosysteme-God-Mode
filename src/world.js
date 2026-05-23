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
    ragePlants: new Map(),   // plantes de rage, key -> { x, y }
    aliens: new Map(),       // aliens normaux, id -> { id, x, y, E, Emax, R }
    aliens2: new Map(),      // aliens mutants (nés d'une plante rage), id -> { ... }
    blobs: new Map(),        // blobs, id -> { id, x, y, E, Emax }

    // Occupation (pour empêcher spawn sur case déjà prise)
    occupiedPoisonPlants: new Set(),
    occupiedRagePlants: new Set(),
    occupiedAliens: new Set(),
    occupiedAliens2: new Set(),
    occupiedBlobs: new Set(),

    // Compteurs d'ID des entites autonomes.
    nextAlienId: 1,
    nextAlien2Id: 1,
    nextBlobId: 1,
    maxBlobs: 120,  // injecté depuis config au démarrage

    // Événements de kills (lus et vidés par le renderer/main.js)
    poisonKillEvents: [],
    nukeEvents: [],         // { x, y, radius } — produits par l'action Frappe du joueur
    transformEvents: [],    // { alienId, x, y } — alien → alien2, consommés par le renderer
  };
}

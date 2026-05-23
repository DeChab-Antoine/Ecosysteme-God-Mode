export function createViewState() {
  return {
    // =========================
    // Etat visuel courant
    // =========================
    renderMode: "3d",   // "2d" ou "3d"
    isNight: false,

    // Options d'affichage
    showGrid: true,
    showWorldBorder: true,

    // =========================
    // Etat de jeu
    // =========================
    paused: false,
    speedMultiplier: 1,
    forceNight: false,
    points: 150,
    selectedShopItem: null,   // "plant" | "blob" | "alien" | null
    gameOver: false,
    cameraMode: true,         // true = clic gauche orbite | false = clic gauche place
    _alienCount: 0,           // cache mis à jour chaque tick pour shopBar

    // =========================
    // Paramétrage centralisé
    // =========================
    config: {
      world: {
        gridW: 240,
        gridH: 160,
        dayTicks: 100,
        nightTicks: 1,
      },

      render: {
        cellSize: 8,
      },

      timing: {
        tickMs: 100,
        sampleEvery: 1,
        maxPoints: 3000,
      },

      plants: {
        maxPlants: 60,
        spawnAttemptsPerTick: 5,
        spawnChance: 1,
        valE: 5,
        maxAge: 500,
      },

      initialAliens: {
        count: 10,
        maxAttempts: 5000,

        createAlienTemplate: (world) => {
          return {
            E: 100,
            Emax: 200,
            energyDecayPerTick: 0.03,
            R: 8,
            lifespan: 10000,
            duplicationCost: 150,
            duplicationTickDelay: 1000,
            duplicationTick: 0,
          };
        },
      },

      initialBlobs: {
        count: 16,
        maxAttempts: 5000,

        createBlobTemplate: (world) => {
          return {
            E:    15,                // énergie initiale (75% de Emax)
            Emax: 20,
            lifespan: 1400,
            valE: 50,
            duplicationCost: 16,
            duplicationTickDelay: 350,
            duplicationTick: 0,
            energyDecayPerTick: 0.015,
          };
        },
      },

      labels: {
        aliens: "Aliens",
        blobs: "Blobs",
        plants: "Plants",
      },

      shop: {
        startingPoints: 150,
        pointsPerTick: 2,
        costs: {
          plant: 30,
          blob: 120,
          alien: 350,
        },
        winAliens: 50,
        graceTicks: 50,
      },
    },
  };
}

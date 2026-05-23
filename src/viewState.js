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
    points: 10,
    selectedShopItem: null,   // "poisonPlant" | null
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

      initialAliens: {
        count: 50,
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
        maxBlobs: 120,       // plafond global anti-explosion

        createBlobTemplate: (world) => {
          return {
            lifespan: 1400,
            valE: 50,               // énergie donnée à l'alien qui le mange
            duplicationTickDelay: 350,
            duplicationTick: 0,
          };
        },
      },

      labels: {
        aliens: "Aliens",
        blobs: "Blobs",
      },

      shop: {
        startingPoints: 10,
        costs: {
          poisonPlant: 5,
        },
        winAliens:  0,
        loseAliens: 100,
        graceTicks: 50,
      },
    },
  };
}

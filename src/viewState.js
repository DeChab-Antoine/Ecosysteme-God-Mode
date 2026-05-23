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
    selectedShopItem: null,   // "poisonPlant" | "ragePlant" | "nuke" | null
    gameOver: false,
    cameraMode: true,         // true = clic gauche orbite | false = clic gauche place
    _alienCount: 0,           // total aliens + mutants (mis à jour chaque tick)
    _alien2Count: 0,
    _tick: 0,
    cooldownUntilTick: {},    // { poisonPlant: N, nuke: N } — tick d'expiration du cooldown
    achievementStats: {
      poisonAlienKills: 0,
      bestNukeAlienKills: 0,
    },
    unlockedAchievements: {},

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
            duplicationChance: 0.005,
          };
        },
      },

      initialBlobs: {
        count: 30,
        maxAttempts: 5000,
        maxBlobs: 100,       // plafond global anti-explosion

        createBlobTemplate: (world) => {
          return {
            lifespan: 4000,              // ~400s à ×1 — vivent bien plus longtemps
            valE: 50,                    // énergie donnée à l'alien qui le mange
            duplicationChance: 0.005,     // 0.5% de chance de duplication par tick
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
          ragePlant:   12,
          nuke:        30,
        },
        cooldownTicks: {
          poisonPlant: 6,    // 0.6s à ×1 — action principale, doit rester très réactive
          ragePlant:   45,   // 4.5s à ×1 — contrôle indirect des aliens
          nuke:        90,   // 9s à ×1 — arme lourde mais utilisable plusieurs fois
        },
        winAliens:  0,
        loseAliens: 100,
        graceTicks: 50,
      },
    },
  };
}

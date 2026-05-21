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
    // Paramétrage centralisé
    // =========================
    config: {
      world: {
        gridW: 120,
        gridH: 80,
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

      carrots: {
        maxCarrots: 60,
        spawnAttemptsPerTick: 5,
        spawnChance: 1,
        valE: 5,
        maxAge: 500,
      },

      initialHumans: {
        count: 10,
        maxAttempts: 5000,

        createHumanTemplate: (world) => {
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

      initialPigs: {
        count: 16,
        maxAttempts: 5000,

        createPigTemplate: (world) => {
          return {
            Emax: 20,
            lifespan: 1400,
            valE: 50,
            duplicationCost: 16,
            duplicationTickDelay: 350,
            duplicationTick: 0,
          };
        },
      },
    },
  };
}

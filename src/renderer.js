// Cette fonction crée un moteur de rendu pour une grille 2D
// Elle s’occupe uniquement d’affichage (pas de logique de jeu)
export function createRenderer(canvas, { gridW, gridH, cellSize }) {

  // On récupère le contexte 2D du canvas
  const ctx = canvas.getContext("2d");

  // On fixe la taille réelle du canvas en pixels
  // largeur = nb colonnes * taille d'une cellule
  canvas.width = gridW * cellSize;
  canvas.height = gridH * cellSize;

  // =========================
  // Fonction : effacer l'écran
  // =========================
  function clear() {
    // On remplit tout en blanc (fond)
    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // =========================
  // Fonction : dessiner la grille légère
  // =========================
  function drawGrid() {
    // Ligne fine et transparente
    ctx.strokeStyle = "rgba(255, 255, 255, 0.33)";
    ctx.lineWidth = 1;

    // Lignes verticales
    for (let x = 1; x < gridW; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }

    // Lignes horizontales
    for (let y = 1; y < gridH; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // =========================
  // Fonction : colorer une cellule
  // =========================
  // x = colonne
  // y = ligne
  function fillCell(x, y, color) {

    // Sécurité : éviter de sortir du monde borné
    if (x < 0 || x >= gridW) return;
    if (y < 0 || y >= gridH) return;

    ctx.fillStyle = color;

    // On dessine la cellule à la position correspondante
    ctx.fillRect(
      x * cellSize,
      y * cellSize,
      cellSize,
      cellSize
    );
  }

  // =========================
  // Fonction : dessiner le bord noir du monde
  // =========================
  function drawWorldBorder() {

    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.lineWidth = 3;

    // Important : on dessine le bord APRÈS les cellules
    // pour qu'il reste visible même si une cellule est colorée
    ctx.strokeRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  // =========================
  // Fonction principale de rendu
  // =========================
  function renderWorld(world) {
    clear();
    drawGrid();

    // Carottes = pixels orange
    for (const carrot of world.carrots.values()) {
        fillCell(carrot.x, carrot.y, "orange");
    }

    // Humains = pixels bleus
    for (const human of world.humans.values()) {
        fillCell(human.x, human.y, "rgb(215, 152, 152)");
    }

    // Important: le bord en dernier pour rester visible
    drawWorldBorder();
  }

  return { renderWorld };
}

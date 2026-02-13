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
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // =========================
  // Fonction : dessiner la grille légère
  // =========================
  function drawGrid() {
    // Ligne fine et transparente
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
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

    ctx.strokeStyle = "black";
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
  function render() {
    clear();          // 1) on efface
    drawGrid();       // 2) on dessine la grille

    // Les cellules seront dessinées depuis l'extérieur
    // (main.js ou plus tard le moteur de simulation)

    drawWorldBorder(); // 3) on dessine le bord EN DERNIER
  }

  // On expose les fonctions utiles à l'extérieur
  return {
    render,
    fillCell,
    drawWorldBorder
  };
}

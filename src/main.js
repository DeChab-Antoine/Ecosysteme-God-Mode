import { createRenderer } from "./renderer.js";

const canvas = document.getElementById("game");

// Configuration du monde
const WORLD = {
  gridW: 60,
  gridH: 40,
  cellSize: 12,
};

const renderer = createRenderer(canvas, WORLD);

// On lance le rendu de base
renderer.render();

// On teste en colorant une cellule AU BORD
renderer.fillCell(0, 0, "orange");                                  // coin haut gauche
renderer.fillCell(WORLD.gridW - 1, WORLD.gridH - 1, "orange");      // coin bas droit

// On dessine le bord pour garantir qu'il reste visible
renderer.drawWorldBorder();

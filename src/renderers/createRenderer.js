import {createRenderer2D } from "./renderer2D.js";
import {createRenderer3D } from "./renderer3D.js";

export function createRenderer(canvas, world, viewState) {
  const { renderMode, config } = viewState;

  if (renderMode === "2d") {
    return createRenderer2D(canvas, {
      gridW: world.gridW,
      gridH: world.gridH,
      cellSize: config.render.cellSize,
    });
  }

  if (renderMode === "3d") {
    return createRenderer3D(canvas, {
      gridW: world.gridW,
      gridH: world.gridH,
      cellSize: config.render.cellSize,
    });
  }

  throw new Error(`Mode de rendu inconnu : ${renderMode}`);
}
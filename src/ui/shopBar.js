export function createShopBar(viewState, onCameraToggle) {
  const cards = document.querySelectorAll(".shop-card");
  const pointsEl = document.getElementById("pointsDisplay");
  const alienCountEl = document.getElementById("alienCount");
  const cameraBtnEl = document.getElementById("cameraModeBtn");
  const costs = viewState.config.shop.costs;

  // Clic sur une carte entité
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const entity = card.dataset.entity;
      if (viewState.points < costs[entity]) return;

      if (viewState.selectedShopItem === entity) {
        // Déselect → retour mode caméra
        viewState.selectedShopItem = null;
        viewState.cameraMode = true;
      } else {
        // Sélection → mode placement automatique
        viewState.selectedShopItem = entity;
        viewState.cameraMode = false;
      }
      onCameraToggle(viewState.cameraMode);
      refresh();
    });
  });

  // Bouton caméra
  if (cameraBtnEl) {
    cameraBtnEl.addEventListener("click", () => {
      viewState.cameraMode = !viewState.cameraMode;
      if (viewState.cameraMode) {
        viewState.selectedShopItem = null;
      }
      onCameraToggle(viewState.cameraMode);
      refresh();
    });
  }

  // ESC → déselect + mode caméra
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && viewState.selectedShopItem) {
      viewState.selectedShopItem = null;
      viewState.cameraMode = true;
      onCameraToggle(true);
      refresh();
    }
  });

  function refresh() {
    const pts = Math.floor(viewState.points);
    if (pointsEl) pointsEl.textContent = pts;

    // Cartes entités
    cards.forEach((card) => {
      const entity = card.dataset.entity;
      const canAfford = pts >= costs[entity];
      card.classList.toggle("disabled", !canAfford);
      card.classList.toggle("selected", viewState.selectedShopItem === entity);
    });

    // Curseur canvas
    const canvasEl = document.getElementById("game");
    if (canvasEl) {
      canvasEl.style.cursor =
        !viewState.cameraMode && viewState.selectedShopItem ? "crosshair" : "";
    }

    // Bouton caméra
    if (cameraBtnEl) {
      cameraBtnEl.classList.toggle("active", viewState.cameraMode);
      cameraBtnEl.title = viewState.cameraMode
        ? "Mode caméra actif — clic gauche pour orbiter"
        : "Mode placement actif — clic gauche pour poser";
    }

    // Compteur d'aliens restants
    if (alienCountEl) {
      alienCountEl.textContent = viewState._alienCount ?? 0;
    }
  }

  return { refresh };
}

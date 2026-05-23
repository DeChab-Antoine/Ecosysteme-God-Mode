export function createShopBar(viewState, onCameraToggle) {
  const cards       = document.querySelectorAll(".shop-card");
  const pointsEl    = document.getElementById("pointsDisplay");
  const alienCountEl = document.getElementById("alienCount");
  const cameraBtnEl  = document.getElementById("cameraModeBtn");
  const costs        = viewState.config.shop.costs;

  // Clic sur une carte entité
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const entity    = card.dataset.entity;
      const tick      = viewState._tick ?? 0;
      const onCooldown = tick < (viewState.cooldownUntilTick?.[entity] ?? 0);

      if (viewState.points < costs[entity] || onCooldown) return;

      if (viewState.selectedShopItem === entity) {
        viewState.selectedShopItem = null;
        viewState.cameraMode = true;
      } else {
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
      if (viewState.cameraMode) viewState.selectedShopItem = null;
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
    const pts  = Math.floor(viewState.points);
    const tick = viewState._tick ?? 0;

    if (pointsEl) pointsEl.textContent = pts;

    cards.forEach((card) => {
      const entity    = card.dataset.entity;
      const cdUntil   = viewState.cooldownUntilTick?.[entity] ?? 0;
      const remaining = Math.max(0, cdUntil - tick);
      const onCooldown = remaining > 0;
      const canAfford  = pts >= costs[entity] && !onCooldown;

      card.classList.toggle("disabled",  !canAfford);
      card.classList.toggle("selected",  viewState.selectedShopItem === entity && !onCooldown);

      // Si on est en cooldown avec cet item sélectionné, on désélectionne
      if (onCooldown && viewState.selectedShopItem === entity) {
        viewState.selectedShopItem = null;
        viewState.cameraMode = true;
        onCameraToggle(true);
      }

      // Overlay de cooldown
      let overlay = card.querySelector(".shop-cooldown");
      if (onCooldown) {
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "shop-cooldown";
          overlay.innerHTML =
            `<span class="shop-cooldown-num"></span>` +
            `<span class="shop-cooldown-lbl">CD</span>`;
          card.appendChild(overlay);
        }
        overlay.querySelector(".shop-cooldown-num").textContent = remaining;
      } else if (overlay) {
        overlay.remove();
      }
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

    // Compteur aliens
    if (alienCountEl) alienCountEl.textContent = viewState._alienCount ?? 0;
  }

  return { refresh };
}

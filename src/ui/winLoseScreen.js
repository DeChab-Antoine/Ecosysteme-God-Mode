export function createWinLoseScreen(onRestart) {
  const screen = document.getElementById("gameOverScreen");
  const titleEl = document.getElementById("gameOverTitle");
  const msgEl = document.getElementById("gameOverMsg");
  const btn = document.getElementById("restartBtn");

  btn.addEventListener("click", () => {
    screen.style.display = "none";
    onRestart();
  });

  return {
    showWin() {
      titleEl.textContent = "VICTOIRE";
      titleEl.className = "win";
      msgEl.innerHTML =
        "50 aliens dominent la planète.<br>La vie a trouvé un chemin.";
      screen.style.display = "flex";
    },
    showLose() {
      titleEl.textContent = "DÉFAITE";
      titleEl.className = "lose";
      msgEl.innerHTML =
        "Tous les aliens ont disparu...<br>La planète retourne au silence.";
      screen.style.display = "flex";
    },
  };
}

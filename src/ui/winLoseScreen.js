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
      titleEl.textContent = "EXTERMINATION";
      titleEl.className = "win";
      msgEl.innerHTML =
        "Tous les aliens ont été éliminés.<br>La planète est libérée.";
      screen.style.display = "flex";
    },
    showLose() {
      titleEl.textContent = "INVASION";
      titleEl.className = "lose";
      msgEl.innerHTML =
        "Les aliens ont submergé la planète.<br>Vous n'avez pas pu les contenir.";
      screen.style.display = "flex";
    },
  };
}

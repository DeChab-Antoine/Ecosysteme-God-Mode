export function createIntroScreen(onStart) {
  const overlay = document.getElementById("introScreen");
  const startBtn = document.getElementById("startBtn");
  let started = false;

  function start() {
    if (started) return;
    started = true;
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
      onStart();
    }, 800);
  }

  startBtn.addEventListener("click", start);

  const onKey = (e) => {
    if (e.code === "Enter") {
      start();
      window.removeEventListener("keydown", onKey);
    }
  };
  window.addEventListener("keydown", onKey);
}

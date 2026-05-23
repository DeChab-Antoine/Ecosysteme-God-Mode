export function createAchievements() {
  const listEl = document.getElementById("achievementsList");
  const unlocked = new Set();

  const ALL = [
    { key: "firstMutation",     icon: "⚗", title: "Première mutation",   desc: "Un alien a absorbé une plante rage" },
    { key: "epidemicContained", icon: "☣", title: "Épidémie maîtrisée",  desc: "Tous les mutants ont été éliminés"  },
  ];

  const itemEls = {};
  for (const ach of ALL) {
    const el = document.createElement("div");
    el.className = "achievement-item";
    el.innerHTML =
      `<span class="achievement-icon">${ach.icon}</span>` +
      `<div><div class="achievement-title">${ach.title}</div>` +
      `<div class="achievement-desc">${ach.desc}</div></div>`;
    if (listEl) listEl.appendChild(el);
    itemEls[ach.key] = el;
  }

  function unlock(key) {
    if (unlocked.has(key)) return false;
    unlocked.add(key);
    const el = itemEls[key];
    if (el) {
      el.classList.add("done", "new");
      setTimeout(() => el.classList.remove("new"), 3500);
    }
    return true;
  }

  return {
    unlock,
    isUnlocked: (key) => unlocked.has(key),
  };
}

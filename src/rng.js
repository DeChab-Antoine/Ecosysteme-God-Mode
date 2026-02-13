// Petit générateur pseudo-aléatoire seedé (reproducible)
// Avantage: même seed => mêmes spawns => tests + debug faciles
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}

const AUDIO_ROOT = "../assets/audio/";

const MUSIC_TRACKS = [
  "1 - Astro Reverie (Loop).ogg",
  "2 - Galactic Odyssey (Loop).ogg",
  "3 - Lunar Serenity (Loop).ogg",
  "4 - Celestial Echoes (Loop).ogg",
  "5 - Stellar Drift  (Loop).ogg",
  "6 - Orbital Echoes (Loop).ogg",
];

export function createAudioManager() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let ambientStarted  = false;
  let currentTrackIdx = 0;
  let musicGain       = null;
  const buffers = {};

  async function preload(name, file) {
    try {
      const res = await fetch(AUDIO_ROOT + file);
      if (!res.ok) return;
      buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch (_) {}
  }

  for (let i = 0; i < MUSIC_TRACKS.length; i++) {
    preload(`track_${i}`, MUSIC_TRACKS[i]);
  }
  preload("eat_plant",   "blobAlienEat.wav");
  preload("eat_blob",    "blobConsumeByAlien.wav");
  preload("death",       "alienDeath.wav");
  preload("birth_alien", "alienSpawn.ogg");
  preload("birth_blob",  "blobSpawn.wav");
  preload("spawn_alien", "alienSpawn.ogg");
  preload("spawn_blob",  "blobSpawn.wav");
  preload("footstep",    "blobStep.ogg");

  function resume() {
    if (ctx.state === "suspended") ctx.resume();
  }

  function playBuf(name, vol = 0.5) {
    const buf = buffers[name];
    if (!buf) return false;
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return true;
  }

  // =========================
  // Séquenceur musical 1→2→3→4→5→6→1→…
  // =========================
  function playTrackAt(idx) {
    const buf = buffers[`track_${idx}`];
    if (!buf) {
      setTimeout(() => playTrackAt(idx), 2000);
      return;
    }
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(musicGain);
    src.start();
    src.onended = () => {
      currentTrackIdx = (idx + 1) % MUSIC_TRACKS.length;
      playTrackAt(currentTrackIdx);
    };
  }

  function startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, ctx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 5);
    droneGain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(55, ctx.currentTime);
    osc1.connect(droneGain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(82.5, ctx.currentTime);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.3, ctx.currentTime);
    osc2.connect(g2);
    g2.connect(droneGain);
    osc2.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.07, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(5, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, ctx.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.38, ctx.currentTime + 6);
    musicGain.connect(ctx.destination);

    playTrackAt(0);
  }

  function playEatPlant(vol = 0.35) { playBuf("eat_plant", vol); }
  function playEatBlob(vol = 0.55)  { playBuf("eat_blob",  vol); }
  function playDeath(vol = 0.50)    { playBuf("death",     vol); }

  function playBirth(vol = 0.45) {
    // Alternance alien / blob (naissance des deux espèces via cette même fonction)
    playBuf(Math.random() < 0.5 ? "birth_alien" : "birth_blob", vol);
  }

  function playSpawn(vol = 0.50) {
    playBuf(Math.random() < 0.5 ? "spawn_alien" : "spawn_blob", vol);
  }

  function playDayNight() {}

  // =========================
  // Pas des blobs — une boucle par blob, volume selon distance caméra
  // =========================
  const blobStepMap = new Map(); // id → { src, gain }

  function startBlobStep(id, vol) {
    const buf = buffers["footstep"];
    if (!buf) return;
    if (blobStepMap.has(id)) {
      blobStepMap.get(id).gain.gain.setTargetAtTime(Math.min(vol, 0.35), ctx.currentTime, 0.05);
      return;
    }
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    gain.gain.setTargetAtTime(Math.min(vol, 0.35), ctx.currentTime, 0.06);
    blobStepMap.set(id, { src, gain });
  }

  function stopBlobStep(id) {
    const entry = blobStepMap.get(id);
    if (!entry) return;
    blobStepMap.delete(id);
    entry.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    const { src } = entry;
    setTimeout(() => { try { src.stop(); } catch (_) {} }, 500);
  }

  // Arrête tous les blobs sauf ceux dans keepSet (appelé chaque tick)
  function stopBlobStepsExcept(keepSet) {
    for (const id of [...blobStepMap.keys()]) {
      if (!keepSet.has(id)) stopBlobStep(id);
    }
  }

  function stopAllBlobSteps() {
    for (const id of [...blobStepMap.keys()]) stopBlobStep(id);
  }

  return { resume, startAmbient, playEatPlant, playEatBlob, playBirth, playDeath, playSpawn, playDayNight, startBlobStep, stopBlobStep, stopBlobStepsExcept, stopAllBlobSteps };
}

// Effets de particules pour les événements de jeu.
// BABYLON est chargé via CDN dans index.html.

function createFlareTexture(scene, name) {
  const SIZE = 64;
  const tex  = new BABYLON.DynamicTexture(name, { width: SIZE, height: SIZE }, scene, false);
  tex.hasAlpha = true;

  const ctx = tex.getContext();
  ctx.clearRect(0, 0, SIZE, SIZE);
  const grd = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  grd.addColorStop(0.00, "rgba(255, 255, 255, 1.0)");
  grd.addColorStop(0.25, "rgba(255, 220, 80,  0.9)");
  grd.addColorStop(0.60, "rgba(255, 80,  20,  0.5)");
  grd.addColorStop(1.00, "rgba(0,   0,   0,   0.0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, SIZE, SIZE);
  tex.update();
  return tex;
}

// Crée une explosion de nuke en (worldX, worldY) avec des particules feu + cendres
// et un anneau de choc se dilatant jusqu'au rayon d'effet.
export function createNukeExplosion(scene, worldX, worldY, radius) {
  if (!scene || scene.isDisposed) return;

  const effectId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const emitterPos = new BABYLON.Vector3(worldX, 1.0, worldY);
  const flare      = createFlareTexture(scene, `nukeFlare-${effectId}`);

  // ----- Particules feu (burst principal) -----
  const fire = new BABYLON.ParticleSystem(`nukeFire-${effectId}`, 600, scene);
  fire.particleTexture = flare;
  fire.emitter         = emitterPos.clone();

  fire.color1   = new BABYLON.Color4(1.0, 0.65, 0.10, 1.0);
  fire.color2   = new BABYLON.Color4(1.0, 0.90, 0.30, 0.9);
  fire.colorDead = new BABYLON.Color4(0.12, 0.05, 0.02, 0.0);

  fire.minSize     = 0.7;
  fire.maxSize     = 4.0;
  fire.minLifeTime = 0.4;
  fire.maxLifeTime = 1.8;

  fire.emitRate      = 4000;
  fire.minEmitPower  = 4;
  fire.maxEmitPower  = radius * 0.85;
  fire.updateSpeed   = 0.018;
  fire.gravity       = new BABYLON.Vector3(0, 3.5, 0);

  fire.createSphereEmitter(0.6);
  fire.start();

  // ----- Particules cendres (traînée lente) -----
  const ash = new BABYLON.ParticleSystem(`nukeAsh-${effectId}`, 200, scene);
  ash.particleTexture = flare;
  ash.emitter         = emitterPos.clone();

  ash.color1    = new BABYLON.Color4(0.38, 0.28, 0.22, 0.8);
  ash.color2    = new BABYLON.Color4(0.18, 0.12, 0.08, 0.6);
  ash.colorDead = new BABYLON.Color4(0.04, 0.04, 0.04, 0.0);

  ash.minSize     = 0.12;
  ash.maxSize     = 0.55;
  ash.minLifeTime = 1.5;
  ash.maxLifeTime = 3.2;

  ash.emitRate     = 1400;
  ash.minEmitPower = 2;
  ash.maxEmitPower = radius * 1.1;
  ash.updateSpeed  = 0.01;
  ash.gravity      = new BABYLON.Vector3(0, -0.4, 0);

  ash.createSphereEmitter(1.2);
  ash.start();

  // Arrêt de l'émission après la durée du burst
  setTimeout(() => {
    try { fire.stop(); } catch (_) {}
    try { ash.stop();  } catch (_) {}
  }, 200);

  // Nettoyage après expiration de vie max des particules
  setTimeout(() => {
    try { if (!fire.isDisposed()) fire.dispose(false); } catch (_) {}
  }, 2500);
  setTimeout(() => {
    try { if (!ash.isDisposed()) ash.dispose(false); } catch (_) {}
  }, 4000);
  setTimeout(() => {
    try { if (!flare.isDisposed()) flare.dispose(); } catch (_) {}
  }, 4300);

  // ----- Anneau de choc -----
  const ring = BABYLON.MeshBuilder.CreateTorus(`nukeRing-${effectId}`, {
    diameter: 1, thickness: 0.22, tessellation: 48,
  }, scene);
  ring.position.copyFrom(emitterPos);
  ring.position.y  = 0.12;
  ring.rotation.x  = Math.PI / 2;
  ring.isPickable  = false;

  const ringMat = new BABYLON.StandardMaterial(`nukeRingMat-${effectId}`, scene);
  ringMat.diffuseColor    = new BABYLON.Color3(1.0, 0.55, 0.10);
  ringMat.emissiveColor   = new BABYLON.Color3(1.0, 0.42, 0.06);
  ringMat.backFaceCulling = false;
  ringMat.alpha           = 0.92;
  ring.material = ringMat;

  const RING_DURATION_MS = 1500;
  const targetScale      = radius * 2;
  let   elapsed          = 0;
  let   ringDone         = false;

  const observer = scene.onBeforeRenderObservable.add(() => {
    if (ringDone) return;
    if (scene.isDisposed || ring.isDisposed()) {
      ringDone = true;
      scene.onBeforeRenderObservable.remove(observer);
      return;
    }
    elapsed += scene.getEngine().getDeltaTime();
    const t      = Math.min(1, elapsed / RING_DURATION_MS);
    const eased  = 1 - (1 - t) * (1 - t); // ease-out quad

    const s = 1 + eased * (targetScale - 1);
    ring.scaling.set(s, 1, s);
    ringMat.alpha = 0.92 * (1 - t);

    if (t >= 1) {
      ringDone = true;
      scene.onBeforeRenderObservable.remove(observer);
      try { ring.dispose(); ringMat.dispose(); } catch (_) {}
    }
  });
}

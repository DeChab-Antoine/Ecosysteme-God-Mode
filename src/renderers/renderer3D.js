// Orchestrateur du rendu 3D — assemble les sous-systèmes et expose l'API publique.
import { createScene }         from "./scene3D.js";
import { createSunSystem }     from "./suns3D.js";
import { createAssetLoader }   from "./assetLoader3D.js";
import { createDecorations }   from "./decorations3D.js";
import { createEntitySync }    from "./entitySync3D.js";
import { createNukeExplosion } from "./particles3D.js";

export function createRenderer3D(canvas, { gridW, gridH }) {
  // ----- Initialisation -----
  const { engine, scene, camera, hemiLight, dirLight, glowLayer, shadowGenerator, worldCenter }
    = createScene(canvas, gridW, gridH);

  const sunSystem  = createSunSystem(scene, gridW, gridH, { hemiLight, dirLight, glowLayer, worldCenter });
  const assetLoader = createAssetLoader(scene, shadowGenerator);
  const decorations = createDecorations(scene, shadowGenerator, assetLoader, gridW, gridH);
  const entitySync  = createEntitySync(scene, shadowGenerator, glowLayer, assetLoader);

  // ----- Click sur le sol (placement plantes) -----
  let groundClickCallback = null;

  scene.onPointerDown = (evt, pickResult) => {
    if (evt.button !== 0 || !groundClickCallback || !pickResult.hit) return;
    if (pickResult.pickedPoint.y > 1.5) return;
    groundClickCallback(
      Math.round(pickResult.pickedPoint.x),
      Math.round(pickResult.pickedPoint.z)
    );
  };

  // ----- Boucle de rendu -----
  let latestViewState = null;
  let latestWorld     = null;
  let sunElapsedMs    = 0;

  const resizeHandler = () => engine.resize();
  window.addEventListener("resize", resizeHandler);

  engine.runRenderLoop(() => {
    const deltaMs = engine.getDeltaTime();
    if (latestViewState && !latestViewState.paused) {
      sunElapsedMs += deltaMs * (latestViewState.speedMultiplier ?? 1);
    }
    entitySync.interpolateMovingEntities(deltaMs / 1000);
    sunSystem.update(sunElapsedMs, latestWorld);
    scene.render();
  });

  // ----- API publique -----
  function renderWorld(world, view) {
    latestViewState = view;
    latestWorld     = world;

    // Événements Frappe : particules + suppression des décorations dans le rayon
    for (const evt of world.nukeEvents) {
      try {
        createNukeExplosion(scene, evt.x, evt.y, evt.radius);
        decorations.removeInRadius(evt.x, evt.y, evt.radius);
      } catch (err) {
        console.error("Erreur pendant le rendu de la frappe", err);
      }
    }
    world.nukeEvents.length = 0;

    // Événements de transformation alien → alien2
    for (const evt of world.transformEvents) {
      entitySync.playTransformEffect(evt.alienId, evt.x, evt.y);
    }
    world.transformEvents.length = 0;

    entitySync.syncPoisonPlants(world);
    entitySync.syncRagePlants(world);
    entitySync.syncAliens(world);
    entitySync.syncAlien2s(world);
    entitySync.syncBlobs(world);
  }

  function dispose() {
    window.removeEventListener("resize", resizeHandler);
    engine.stopRenderLoop();
    entitySync.dispose();
    decorations.dispose();
    assetLoader.dispose();
    scene.dispose();
    engine.dispose();
  }

  return {
    renderWorld,
    dispose,
    setGroundClickCallback(fn) {
      groundClickCallback = fn;
    },
    // true  → orbite sur clic gauche (mode caméra)
    // false → clic gauche libre pour le placement
    setCameraControl(enabled) {
      const pointers = camera.inputs.attached.pointers;
      if (pointers) pointers.buttons = enabled ? [0, 1, 2] : [1, 2];
    },
    getAudioVolume(worldX, worldZ, maxDist = 80) {
      const dist = Math.sqrt((worldX - camera.position.x) ** 2 + (worldZ - camera.position.z) ** 2);
      return Math.max(0, 1 - dist / maxDist);
    },
  };
}

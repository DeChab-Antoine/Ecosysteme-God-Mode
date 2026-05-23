// Matériaux, meshes de secours et synchronisation des entités (aliens, blobs, plantes).
// BABYLON est chargé via CDN dans index.html.

import { DEATH_ANIMATION_MS, CORPSE_REMAIN_MS } from "./assetLoader3D.js";

const ENTITY_ASSETS = {
  alien:  "Alien.glb",
  alien2: "Alien2.glb",
  blob:   "Blob.glb",
  plant:  "Plant.glb",
  plant2: "Plant2.glb",
};

export function createEntitySync(scene, shadowGenerator, glowLayer, assetLoader) {
  // ----- Matériaux entités -----

  function mat(name, diffuse, emissive, specular) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor  = new BABYLON.Color3(...diffuse);
    m.emissiveColor = new BABYLON.Color3(...emissive);
    m.specularColor = new BABYLON.Color3(...specular);
    return m;
  }

  const alienCoreMat   = mat("alienCoreMat",   [0.84, 0.60, 0.60], [0.03,  0.015, 0.02],  [0.10, 0.04, 0.04]);
  const alienSensorMat = mat("alienSensorMat",  [0.50, 0.95, 1.00], [0.08,  0.22,  0.30],  [0.25, 0.50, 0.60]);
  const alien2CoreMat  = mat("alien2CoreMat",   [0.90, 0.25, 0.05], [0.35,  0.06,  0.01],  [0.60, 0.15, 0.05]);
  const alien2SpikeMat = mat("alien2SpikeMat",  [1.00, 0.50, 0.10], [0.55,  0.14,  0.02],  [0.80, 0.30, 0.08]);
  const blobCoreMat    = mat("blobCoreMat",     [0.95, 0.15, 0.58], [0.05,  0.00,  0.025], [0.12, 0.02, 0.08]);
  const blobAccentMat  = mat("blobAccentMat",   [1.00, 0.45, 0.78], [0.08,  0.01,  0.05],  [0.18, 0.04, 0.12]);
  const plantMat       = mat("poisonPlantMat",  [0.10, 0.72, 0.18], [0.04,  0.22,  0.06],  [0.08, 0.35, 0.10]);
  const plantGlowMat   = mat("poisonPlantGlowMat", [0.22, 1.00, 0.35], [0.08, 0.42, 0.10], [0.12, 0.55, 0.15]);
  const ragePlantMat   = mat("ragePlantMat",    [1.00, 0.05, 0.03], [0.45,  0.02,  0.01],  [0.60, 0.05, 0.03]);

  // ----- Registres visuels -----

  const alienMeshes             = new Map();
  const alien2Meshes            = new Map();
  const blobMeshes              = new Map();
  const plantMeshes             = new Map();
  const ragePlantMeshes         = new Map();
  const previousAlienPositions  = new Map();
  const previousAlien2Positions = new Map();
  const previousBlobPositions   = new Map();

  // Aliens en cours de transformation (affichent une animation de morphing à la disparition)
  const transformingAlienIds = new Set();

  // ----- Texture partagée pour les particules de transformation -----

  let _transformFlare = null;
  function getTransformFlare() {
    if (_transformFlare) return _transformFlare;
    const tex = new BABYLON.DynamicTexture("transformFlare", 64, scene, false);
    const ctx = tex.getContext();
    const g   = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   "rgba(255,200,80,1)");
    g.addColorStop(0.4, "rgba(255,80,20,0.85)");
    g.addColorStop(1,   "rgba(200,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    tex.update();
    _transformFlare = tex;
    return tex;
  }

  // ----- Burst de particules lors d'une transformation -----

  function createTransformBurst(x, z) {
    const ps = new BABYLON.ParticleSystem("transformBurst", 280, scene);
    ps.particleTexture = getTransformFlare();
    ps.emitter    = new BABYLON.Vector3(x, 0.5, z);
    ps.color1     = new BABYLON.Color4(1.0, 0.55, 0.10, 1.0);
    ps.color2     = new BABYLON.Color4(1.0, 0.10, 0.20, 0.9);
    ps.colorDead  = new BABYLON.Color4(0.2,  0.0,  0.0,  0.0);
    ps.minSize    = 0.10; ps.maxSize    = 0.65;
    ps.minLifeTime = 0.35; ps.maxLifeTime = 1.0;
    ps.emitRate   = 0;
    ps.manualEmitCount = 280;
    ps.minEmitPower = 2.0; ps.maxEmitPower = 5.5;
    ps.direction1 = new BABYLON.Vector3(-2, 2, -2);
    ps.direction2 = new BABYLON.Vector3(2, 7, 2);
    ps.gravity    = new BABYLON.Vector3(0, -6, 0);
    ps.targetStopDuration = 1.2;
    ps.disposeOnStop = true;
    ps.start();
  }

  // ----- Utilitaire interne -----

  function mergeMeshes(name, meshes) {
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    merged.name = name;
    merged.receiveShadows = true;
    shadowGenerator.addShadowCaster(merged);
    return merged;
  }

  // ----- Meshes de secours -----

  function createFallbackAlienMesh(name) {
    const body = BABYLON.MeshBuilder.CreateCylinder(`${name}-body`, { height: 0.85, diameterTop: 0.42, diameterBottom: 0.55, tessellation: 8 }, scene);
    body.position.y = 0.42;
    body.material   = alienCoreMat;

    const head = BABYLON.MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.38, segments: 10 }, scene);
    head.position.y = 1.02;
    head.material   = alienCoreMat;

    const sensor = BABYLON.MeshBuilder.CreateSphere(`${name}-sensor`, { diameter: 0.16, segments: 8 }, scene);
    sensor.position.set(0, 1.04, -0.2);
    sensor.material = alienSensorMat;

    return mergeMeshes(name, [body, head, sensor]);
  }

  function createFallbackAlien2Mesh(name) {
    const body = BABYLON.MeshBuilder.CreateCylinder(`${name}-body`, { height: 1.1, diameterTop: 0.52, diameterBottom: 0.68, tessellation: 8 }, scene);
    body.position.y = 0.55;
    body.material   = alien2CoreMat;

    const head = BABYLON.MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.50, segments: 10 }, scene);
    head.position.y = 1.28;
    head.material   = alien2CoreMat;

    const spike1 = BABYLON.MeshBuilder.CreateCylinder(`${name}-s1`, { height: 0.55, diameterTop: 0.0, diameterBottom: 0.13, tessellation: 5 }, scene);
    spike1.position.set(0.22, 1.58, 0);
    spike1.rotation.z = -0.32;
    spike1.material   = alien2SpikeMat;

    const spike2 = BABYLON.MeshBuilder.CreateCylinder(`${name}-s2`, { height: 0.55, diameterTop: 0.0, diameterBottom: 0.13, tessellation: 5 }, scene);
    spike2.position.set(-0.22, 1.58, 0);
    spike2.rotation.z = 0.32;
    spike2.material   = alien2SpikeMat;

    const eye = BABYLON.MeshBuilder.CreateSphere(`${name}-eye`, { diameter: 0.14, segments: 6 }, scene);
    eye.position.set(0, 1.32, -0.26);
    eye.material = alien2SpikeMat;

    return mergeMeshes(name, [body, head, spike1, spike2, eye]);
  }

  function createFallbackBlobMesh(name) {
    const body = BABYLON.MeshBuilder.CreateSphere(`${name}-body`, { diameter: 0.78, segments: 10 }, scene);
    body.scaling.set(1.15, 0.72, 0.9);
    body.position.y = 0.42;
    body.material   = blobCoreMat;

    const crest = BABYLON.MeshBuilder.CreateCylinder(`${name}-crest`, { height: 0.38, diameterTop: 0.05, diameterBottom: 0.22, tessellation: 5 }, scene);
    crest.position.set(0, 0.95, -0.18);
    crest.rotation.x = 0.35;
    crest.material   = blobAccentMat;

    const node = BABYLON.MeshBuilder.CreateSphere(`${name}-node`, { diameter: 0.22, segments: 8 }, scene);
    node.position.set(0, 0.48, -0.48);
    node.material = blobAccentMat;

    return mergeMeshes(name, [body, crest, node]);
  }

  function createFallbackPlantMesh(name) {
    const shard = BABYLON.MeshBuilder.CreateCylinder(`${name}-shard`, { height: 0.72, diameterTop: 0.05, diameterBottom: 0.32, tessellation: 6 }, scene);
    shard.position.y = 0.36;
    shard.rotation.z = 0.12;
    shard.material   = plantGlowMat;

    const base = BABYLON.MeshBuilder.CreateSphere(`${name}-base`, { diameter: 0.28, segments: 8 }, scene);
    base.scaling.y  = 0.35;
    base.position.y = 0.08;
    base.material   = plantMat;

    return mergeMeshes(name, [shard, base]);
  }

  function createFallbackRagePlantMesh(name) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, { size: 1.15, height: 0.18 }, scene);
    mesh.material = ragePlantMat;
    mesh.receiveShadows = true;
    mesh.isPickable = false;
    return mesh;
  }

  function createEntityMesh(kind, name) {
    const assetPath = ENTITY_ASSETS[kind];
    const fallbacks = {
      alien:  createFallbackAlienMesh,
      alien2: createFallbackAlien2Mesh,
      blob:   createFallbackBlobMesh,
      plant:  createFallbackPlantMesh,
      plant2: createFallbackRagePlantMesh,
    };
    return assetLoader.createAssetBackedMesh(name, assetPath, fallbacks[kind] ?? createFallbackAlienMesh);
  }

  function createAlienMesh(id) {
    const mesh = createEntityMesh("alien", `alien-${id}`);
    mesh.metadata = { entityKind: "alien", assetPath: ENTITY_ASSETS.alien };
    return mesh;
  }

  function createAlien2Mesh(id) {
    const mesh = createEntityMesh("alien2", `alien2-${id}`);
    mesh.metadata = { entityKind: "alien2", assetPath: ENTITY_ASSETS.alien2 };
    return mesh;
  }

  function createBlobMesh(id) {
    const mesh = createEntityMesh("blob", `blob-${id}`);
    mesh.scaling.set(0.008, 0.008, 0.008);
    mesh.metadata = { entityKind: "blob", assetPath: ENTITY_ASSETS.blob };
    return mesh;
  }

  function createPlantMesh(key) {
    const mesh = createEntityMesh("plant", `plant-${key}`);
    mesh.metadata = { entityKind: "plant", assetPath: ENTITY_ASSETS.plant };
    return mesh;
  }

  function createRagePlantMesh(key) {
    const mesh = createEntityMesh("plant2", `plant2-${key}`);
    mesh.metadata = { entityKind: "plant2", assetPath: ENTITY_ASSETS.plant2 };
    return mesh;
  }

  // ----- Placement sur la grille -----

  function placeOnGrid(mesh, x, y, height = 0.5) {
    mesh.metadata ??= {};
    mesh.metadata.targetPosition = { x, y: height, z: y };
    if (!mesh.metadata.hasInitialPosition) {
      mesh.position.set(x, height, y);
      mesh.metadata.hasInitialPosition = true;
    }
  }

  function snapToGrid(mesh, x, y, height = 0.5) {
    mesh.metadata ??= {};
    mesh.metadata.targetPosition    = { x, y: height, z: y };
    mesh.metadata.hasInitialPosition = true;
    mesh.position.set(x, height, y);
  }

  function faceMovementDirection(mesh, previousPositions, id, x, y) {
    const prev  = previousPositions.get(id);
    let   moved = false;

    if (prev) {
      const dx = x - prev.x;
      const dz = y - prev.y;
      if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
        mesh.metadata ??= {};
        mesh.metadata.targetRotationY = Math.atan2(dx, dz);
        moved = true;
      }
    }

    previousPositions.set(id, { x, y });
    assetLoader.playLoopAnimation(mesh, moved ? ["walk", "walking"] : ["idle"]);
  }

  function playEntityAction(mesh, action, entityKind) {
    if (!action || mesh.metadata?.lastActionTick === action.tick) return;

    let played = false;
    if ((entityKind === "alien" || entityKind === "alien2") && action.type === "eatBlob") {
      played = assetLoader.playActionAnimation(mesh, ["punch"], 650);
    }

    if (played) mesh.metadata.lastActionTick = action.tick;
  }

  // ----- Suppression d'un mesh (mort normale) -----

  function disposeEntityMesh(mesh, meshMap, previousPositions, id) {
    if (!mesh.metadata?.deathStarted) {
      mesh.metadata ??= {};
      mesh.metadata.deathStarted = true;
      const deathDuration = assetLoader.playDeathAnimation(mesh) ? DEATH_ANIMATION_MS : 0;
      mesh.metadata.disposeAt      = performance.now() + deathDuration + CORPSE_REMAIN_MS;
      mesh.metadata.targetPosition = {
        x: mesh.position.x,
        y: Math.max(0, mesh.position.y - 0.08),
        z: mesh.position.z,
      };
      return;
    }

    if (performance.now() < mesh.metadata.disposeAt) return;

    mesh.dispose();
    meshMap.delete(id);
    previousPositions.delete(id);
  }

  // ----- Suppression d'un alien en cours de transformation (scale + spin rapide) -----

  function disposeTransformingAlienMesh(mesh, id) {
    if (!mesh.metadata?.transformStarted) {
      mesh.metadata ??= {};
      mesh.metadata.transformStarted = true;
      mesh.metadata.transformStartMs = performance.now();
      return;
    }
    const elapsed = performance.now() - mesh.metadata.transformStartMs;
    const t = Math.min(1, elapsed / 420);
    const s = 1 + t * 2.0;
    mesh.scaling.set(s, s * (1 + t * 1.5), s);
    mesh.rotation.y += 0.18;

    if (elapsed >= 420) {
      mesh.dispose();
      alienMeshes.delete(id);
      previousAlienPositions.delete(id);
      transformingAlienIds.delete(id);
    }
  }

  // ----- Synchronisation -----

  function syncAliens(world) {
    for (const [id, alien] of world.aliens.entries()) {
      let mesh = alienMeshes.get(id);
      if (!mesh) { mesh = createAlienMesh(id); alienMeshes.set(id, mesh); }

      faceMovementDirection(mesh, previousAlienPositions, id, alien.x, alien.y);
      playEntityAction(mesh, alien.lastAction, "alien");
      placeOnGrid(mesh, alien.x, alien.y, 0);
    }

    for (const [id, mesh] of alienMeshes.entries()) {
      if (!world.aliens.has(id)) {
        if (transformingAlienIds.has(id)) {
          disposeTransformingAlienMesh(mesh, id);
        } else {
          disposeEntityMesh(mesh, alienMeshes, previousAlienPositions, id);
        }
      }
    }
  }

  function syncAlien2s(world) {
    for (const [id, alien2] of world.aliens2.entries()) {
      let mesh = alien2Meshes.get(id);
      if (!mesh) { mesh = createAlien2Mesh(id); alien2Meshes.set(id, mesh); }

      faceMovementDirection(mesh, previousAlien2Positions, id, alien2.x, alien2.y);
      playEntityAction(mesh, alien2.lastAction, "alien2");
      placeOnGrid(mesh, alien2.x, alien2.y, 0);
    }

    for (const [id, mesh] of alien2Meshes.entries()) {
      if (!world.aliens2.has(id)) disposeEntityMesh(mesh, alien2Meshes, previousAlien2Positions, id);
    }
  }

  function syncBlobs(world) {
    for (const [id, blob] of world.blobs.entries()) {
      let mesh = blobMeshes.get(id);
      if (!mesh) { mesh = createBlobMesh(id); blobMeshes.set(id, mesh); }

      faceMovementDirection(mesh, previousBlobPositions, id, blob.x, blob.y);
      playEntityAction(mesh, blob.lastAction, "blob");
      placeOnGrid(mesh, blob.x, blob.y, 0.90);
    }

    for (const [id, mesh] of blobMeshes.entries()) {
      if (!world.blobs.has(id)) disposeEntityMesh(mesh, blobMeshes, previousBlobPositions, id);
    }
  }

  function syncPoisonPlants(world) {
    for (const [key, plant] of world.poisonPlants.entries()) {
      let mesh = plantMeshes.get(key);
      if (!mesh) { mesh = createPlantMesh(key); plantMeshes.set(key, mesh); }
      snapToGrid(mesh, plant.x, plant.y, 0);
    }

    for (const [key, mesh] of plantMeshes.entries()) {
      if (!world.poisonPlants.has(key)) { mesh.dispose(); plantMeshes.delete(key); }
    }
  }

  function syncRagePlants(world) {
    for (const [key, plant] of world.ragePlants.entries()) {
      let mesh = ragePlantMeshes.get(key);
      if (!mesh) { mesh = createRagePlantMesh(key); ragePlantMeshes.set(key, mesh); }
      snapToGrid(mesh, plant.x, plant.y, 0);
    }

    for (const [key, mesh] of ragePlantMeshes.entries()) {
      if (!world.ragePlants.has(key)) { mesh.dispose(); ragePlantMeshes.delete(key); }
    }
  }

  // ----- Effet visuel de transformation -----

  function playTransformEffect(alienId, worldX, worldZ) {
    transformingAlienIds.add(alienId);
    createTransformBurst(worldX, worldZ);
  }

  // ----- Interpolation (appelée à chaque frame rendu) -----

  function interpolateMeshPosition(mesh, deltaSeconds) {
    const target = mesh.metadata?.targetPosition;
    const t      = Math.min(1, deltaSeconds * 8);

    if (target) {
      mesh.position.x += (target.x - mesh.position.x) * t;
      mesh.position.y += (target.y - mesh.position.y) * t;
      mesh.position.z += (target.z - mesh.position.z) * t;
    }

    if (Number.isFinite(mesh.metadata?.targetRotationY)) {
      let diff = mesh.metadata.targetRotationY - mesh.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      mesh.rotation.y += diff * Math.min(1, deltaSeconds * 10);
    }
  }

  function interpolateMovingEntities(deltaSeconds) {
    for (const mesh of alienMeshes.values())  interpolateMeshPosition(mesh, deltaSeconds);
    for (const mesh of alien2Meshes.values()) interpolateMeshPosition(mesh, deltaSeconds);
    for (const mesh of blobMeshes.values())   interpolateMeshPosition(mesh, deltaSeconds);
  }

  function dispose() {
    for (const mesh of alienMeshes.values())    mesh.dispose();
    for (const mesh of alien2Meshes.values())   mesh.dispose();
    for (const mesh of blobMeshes.values())     mesh.dispose();
    for (const mesh of plantMeshes.values())    mesh.dispose();
    for (const mesh of ragePlantMeshes.values()) mesh.dispose();
    alienMeshes.clear();
    alien2Meshes.clear();
    blobMeshes.clear();
    plantMeshes.clear();
    ragePlantMeshes.clear();
    previousAlienPositions.clear();
    previousAlien2Positions.clear();
    previousBlobPositions.clear();
  }

  return {
    syncAliens,
    syncAlien2s,
    syncBlobs,
    syncPoisonPlants,
    syncRagePlants,
    playTransformEffect,
    interpolateMovingEntities,
    dispose,
  };
}

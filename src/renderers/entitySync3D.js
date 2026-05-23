// Matériaux, meshes de secours et synchronisation des entités (aliens, blobs, plantes poison).
// BABYLON est chargé via CDN dans index.html.

import { DEATH_ANIMATION_MS, CORPSE_REMAIN_MS } from "./assetLoader3D.js";

const ENTITY_ASSETS = {
  alien: "Alien.glb",
  blob:  "Blob.glb",
  plant: "Plant.glb",
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

  const alienCoreMat  = mat("alienCoreMat",        [0.84, 0.60, 0.60], [0.03,  0.015, 0.02],  [0.10, 0.04,  0.04]);
  const alienSensorMat = mat("alienSensorMat",      [0.50, 0.95, 1.00], [0.08,  0.22,  0.30],  [0.25, 0.50,  0.60]);
  const blobCoreMat   = mat("blobCoreMat",          [0.95, 0.15, 0.58], [0.05,  0.00,  0.025], [0.12, 0.02,  0.08]);
  const blobAccentMat = mat("blobAccentMat",        [1.00, 0.45, 0.78], [0.08,  0.01,  0.05],  [0.18, 0.04,  0.12]);
  const plantMat      = mat("poisonPlantMat",       [0.10, 0.72, 0.18], [0.04,  0.22,  0.06],  [0.08, 0.35,  0.10]);
  const plantGlowMat  = mat("poisonPlantGlowMat",   [0.22, 1.00, 0.35], [0.08,  0.42,  0.10],  [0.12, 0.55,  0.15]);

  // ----- Registres visuels -----

  const alienMeshes            = new Map();
  const blobMeshes             = new Map();
  const plantMeshes            = new Map();
  const previousAlienPositions = new Map();
  const previousBlobPositions  = new Map();

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

  function createEntityMesh(kind, name) {
    const assetPath = ENTITY_ASSETS[kind];
    const fallbacks = { alien: createFallbackAlienMesh, blob: createFallbackBlobMesh, plant: createFallbackPlantMesh };
    return assetLoader.createAssetBackedMesh(name, assetPath, fallbacks[kind] ?? createFallbackAlienMesh);
  }

  function createAlienMesh(id) {
    const mesh = createEntityMesh("alien", `alien-${id}`);
    mesh.metadata = { entityKind: "alien", assetPath: ENTITY_ASSETS.alien };
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
    if (entityKind === "alien" && action.type === "eatBlob") {
      played = assetLoader.playActionAnimation(mesh, ["punch"], 650);
    }

    if (played) mesh.metadata.lastActionTick = action.tick;
  }

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
      if (!world.aliens.has(id)) disposeEntityMesh(mesh, alienMeshes, previousAlienPositions, id);
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
    for (const mesh of alienMeshes.values()) interpolateMeshPosition(mesh, deltaSeconds);
    for (const mesh of blobMeshes.values())  interpolateMeshPosition(mesh, deltaSeconds);
  }

  function dispose() {
    for (const mesh of alienMeshes.values()) mesh.dispose();
    for (const mesh of blobMeshes.values())  mesh.dispose();
    for (const mesh of plantMeshes.values()) mesh.dispose();
    alienMeshes.clear();
    blobMeshes.clear();
    plantMeshes.clear();
    previousAlienPositions.clear();
    previousBlobPositions.clear();
  }

  return { syncAliens, syncBlobs, syncPoisonPlants, interpolateMovingEntities, dispose };
}

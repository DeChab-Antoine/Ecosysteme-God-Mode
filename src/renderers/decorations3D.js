// Décorations statiques procédurales : matériaux, constructeurs de mesh, placement.
// BABYLON est chargé via CDN dans index.html.

const DECORATION_ASSETS = {
  bush: "Bush.glb",
  tree: "Tree.glb",
};

// Génère la liste des décorations avec un LCG reproductible (même seed que le jeu).
function generateDecorations(gW, gH) {
  let s = 0xDEAD_BEEF;
  function r() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xFFFF_FFFF;
  }

  const MARGIN     = 4;
  const treeCount  = Math.floor(gW * gH / 640);
  const bushCount  = Math.floor(gW * gH / 380);
  const list       = [];

  for (let i = 0; i < treeCount; i++) {
    list.push({ kind: "tree", x: MARGIN + r() * (gW - MARGIN * 2), y: MARGIN + r() * (gH - MARGIN * 2), scale: 0.9 + r() * 0.6, rotation: r() * Math.PI * 2, blocks: true });
  }
  for (let i = 0; i < bushCount; i++) {
    list.push({ kind: "bush", x: MARGIN + r() * (gW - MARGIN * 2), y: MARGIN + r() * (gH - MARGIN * 2), scale: 0.7 + r() * 0.5, rotation: r() * Math.PI * 2, blocks: false });
  }

  return list;
}

function createDecorationMaterials(scene) {
  function mat(name, diffuse, emissive, specular) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor  = new BABYLON.Color3(...diffuse);
    m.emissiveColor = new BABYLON.Color3(...emissive);
    m.specularColor = new BABYLON.Color3(...specular);
    return m;
  }

  return {
    rock:       mat("decorRockMat",         [0.28, 0.30, 0.42], [0.015, 0.017, 0.035], [0.03, 0.035, 0.06]),
    crystal:    mat("decorCrystalMat",      [0.28, 0.84, 1.00], [0.06,  0.28,  0.42],  [0.50, 0.80,  1.00]),
    plantStem:  mat("decorPlantStemMat",    [0.24, 0.19, 0.16], [0.025, 0.016, 0.014], [0.035,0.025, 0.02]),
    plantGlow:  mat("decorplantGlowMat",    [0.88, 0.58, 0.08], [0.14,  0.08,  0.01],  [0.18, 0.10,  0.02]),
    spore:      mat("decorSporeMat",        [0.72, 0.35, 0.90], [0.08,  0.03,  0.14],  [0.16, 0.08,  0.20]),
    monolith:   mat("decorMonolithMat",     [0.18, 0.20, 0.32], [0.025, 0.025, 0.08],  [0.08, 0.08,  0.16]),
    vein:       mat("decorEnergyVeinMat",   [0.22, 0.82, 1.00], [0.08,  0.26,  0.36],  [0.30, 0.65,  0.80]),
    patch:      mat("decorMineralPatchMat", [0.48, 0.36, 0.68], [0.05,  0.035, 0.09],  [0.12, 0.08,  0.16]),
    pool:       mat("decorGlowPoolMat",     [0.16, 0.58, 0.72], [0.03,  0.16,  0.22],  [0.08, 0.20,  0.24]),
    ridge:      mat("decorRidgeMat",        [0.30, 0.27, 0.42], [0.018, 0.016, 0.045], [0.06, 0.05,  0.10]),
    beacon:     mat("decorBeaconMat",       [0.18, 0.22, 0.36], [0.025, 0.035, 0.09],  [0.10, 0.14,  0.22]),
    beaconGlow: mat("decorBeaconGlowMat",   [0.70, 0.95, 1.00], [0.12,  0.28,  0.38],  [0.30, 0.55,  0.70]),
  };
}

// Crée les décorations statiques et les place dans la scène.
export function createDecorations(scene, shadowGenerator, assetLoader, gridW, gridH) {
  const mats            = createDecorationMaterials(scene);
  const decorationMeshes = [];

  function mergeMeshes(name, meshes) {
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    merged.name = name;
    merged.receiveShadows = true;
    shadowGenerator.addShadowCaster(merged);
    return merged;
  }

  // ----- Constructeurs de mesh -----

  function createCrystalCluster(name) {
    return mergeMeshes(name, [
      { h: 2.2, d: 0.70, x:  0,     z: 0,    r:  0.10 },
      { h: 1.6, d: 0.48, x:  0.48,  z: 0.18, r: -0.35 },
      { h: 1.3, d: 0.42, x: -0.42,  z: 0.12, r:  0.55 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateCylinder(`${name}-c`, { height: s.h, diameterTop: 0.08, diameterBottom: s.d, tessellation: 6 }, scene);
      m.position.set(s.x, s.h / 2, s.z);
      m.rotation.z = s.r;
      m.material = mats.crystal;
      return m;
    }));
  }

  function createBasaltRock(name) {
    return mergeMeshes(name, [
      { w: 1.7, h: 0.75, d: 1.2, x:  0,     z:  0    },
      { w: 1.0, h: 0.55, d: 0.9, x:  0.65,  z: -0.22 },
      { w: 0.9, h: 0.50, d: 0.7, x: -0.55,  z:  0.25 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateSphere(`${name}-r`, { diameter: 1, segments: 8 }, scene);
      m.scaling.set(s.w, s.h, s.d);
      m.position.set(s.x, s.h * 0.45, s.z);
      m.material = mats.rock;
      return m;
    }));
  }

  function createBush(name) {
    return mergeMeshes(name, [
      { d: 0.90, x:  0,     z:  0,    y: 0.34 },
      { d: 0.62, x:  0.42,  z: -0.08, y: 0.28 },
      { d: 0.58, x: -0.38,  z:  0.12, y: 0.26 },
      { d: 0.48, x:  0.05,  z:  0.42, y: 0.24 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateSphere(`${name}-l`, { diameter: s.d, segments: 8 }, scene);
      m.scaling.y = 0.7;
      m.position.set(s.x, s.y, s.z);
      m.material = mats.plantGlow;
      return m;
    }));
  }

  function createTree(name) {
    const meshes = [];
    const stem = BABYLON.MeshBuilder.CreateCylinder(`${name}-stem`, { height: 1.65, diameterTop: 0.18, diameterBottom: 0.34, tessellation: 7 }, scene);
    stem.position.y = 0.82;
    stem.material   = mats.plantStem;
    meshes.push(stem);

    for (let i = 0; i < 4; i++) {
      const angle  = i * (Math.PI * 2 / 4) + 0.35;
      const radius = i === 0 ? 0 : 0.42;
      const leaf   = BABYLON.MeshBuilder.CreateSphere(`${name}-leaf`, { diameter: i === 0 ? 1.25 : 0.92, segments: 10 }, scene);
      leaf.scaling.set(0.9, 0.72, 0.9);
      leaf.position.set(Math.cos(angle) * radius, 1.62 + i * 0.04, Math.sin(angle) * radius);
      leaf.rotation.y = angle;
      leaf.material   = mats.plantGlow;
      meshes.push(leaf);
    }

    return mergeMeshes(name, meshes);
  }

  function createSporeMound(name) {
    return mergeMeshes(name, [
      { d: 0.75, x:  0,     z:  0    },
      { d: 0.45, x:  0.50,  z:  0.08 },
      { d: 0.38, x: -0.42,  z:  0.18 },
      { d: 0.32, x:  0.10,  z: -0.45 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateSphere(`${name}-s`, { diameter: s.d, segments: 8 }, scene);
      m.scaling.y = 0.45;
      m.position.set(s.x, s.d * 0.18, s.z);
      m.material = mats.spore;
      return m;
    }));
  }

  function createMonolith(name) {
    const m = BABYLON.MeshBuilder.CreateBox(`${name}-body`, { width: 0.75, height: 3.0, depth: 0.75 }, scene);
    m.position.y = 1.5;
    m.rotation.z = 0.08;
    m.material   = mats.monolith;
    return mergeMeshes(name, [m]);
  }

  function createEnergyVein(name) {
    return mergeMeshes(name, [
      { w: 4.6, d: 0.18, x:  0,    z:  0,    r:  0.00 },
      { w: 2.2, d: 0.14, x: -1.3,  z:  0.42, r:  0.70 },
      { w: 2.6, d: 0.14, x:  1.1,  z: -0.34, r: -0.55 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateBox(`${name}-v`, { width: s.w, height: 0.035, depth: s.d }, scene);
      m.position.set(s.x, 0.04, s.z);
      m.rotation.y = s.r;
      m.material   = mats.vein;
      return m;
    }));
  }

  function createMineralPatch(name) {
    return mergeMeshes(name, [
      { w: 3.4, d: 2.0, x:  0,    z:  0,    r:  0.20 },
      { w: 1.8, d: 1.0, x:  1.45, z:  0.50, r: -0.40 },
      { w: 1.5, d: 0.9, x: -1.20, z: -0.55, r:  0.80 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateBox(`${name}-p`, { width: s.w, height: 0.025, depth: s.d }, scene);
      m.position.set(s.x, 0.03, s.z);
      m.rotation.y = s.r;
      m.material   = mats.patch;
      return m;
    }));
  }

  function createGlowPool(name) {
    return mergeMeshes(name, [
      { d: 3.6, x:  0,    z:  0,    sx: 1.35, sz: 0.82 },
      { d: 1.7, x:  1.55, z:  0.25, sx: 1.00, sz: 0.70 },
      { d: 1.2, x: -1.35, z: -0.35, sx: 0.90, sz: 0.65 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateCylinder(`${name}-pool`, { height: 0.028, diameter: s.d, tessellation: 24 }, scene);
      m.position.set(s.x, 0.035, s.z);
      m.scaling.x = s.sx;
      m.scaling.z = s.sz;
      m.material  = mats.pool;
      return m;
    }));
  }

  function createRidge(name) {
    return mergeMeshes(name, [
      { w: 7.5, h: 0.18, d: 0.55, x:  0,    z:  0    },
      { w: 2.4, h: 0.28, d: 0.75, x: -2.20, z:  0.15 },
      { w: 2.8, h: 0.24, d: 0.60, x:  2.50, z: -0.12 },
    ].map((s) => {
      const m = BABYLON.MeshBuilder.CreateBox(`${name}-ridge`, { width: s.w, height: s.h, depth: s.d }, scene);
      m.position.set(s.x, s.h / 2, s.z);
      m.material = mats.ridge;
      return m;
    }));
  }

  function createBeacon(name) {
    const meshes = [];

    const base = BABYLON.MeshBuilder.CreateCylinder(`${name}-base`, { height: 1.25, diameterTop: 0.42, diameterBottom: 0.72, tessellation: 8 }, scene);
    base.position.y = 0.62;
    base.material   = mats.beacon;
    meshes.push(base);

    const ring = BABYLON.MeshBuilder.CreateTorus(`${name}-ring`, { diameter: 0.98, thickness: 0.08, tessellation: 16 }, scene);
    ring.position.y  = 1.38;
    ring.rotation.x  = Math.PI / 2;
    ring.material    = mats.beaconGlow;
    meshes.push(ring);

    const core = BABYLON.MeshBuilder.CreateSphere(`${name}-core`, { diameter: 0.42, segments: 12 }, scene);
    core.position.y = 1.42;
    core.material   = mats.beaconGlow;
    meshes.push(core);

    return mergeMeshes(name, meshes);
  }

  // ----- Placement -----

  function buildDecorationMesh(decoration, index) {
    const name      = `decor-${decoration.kind}-${index}`;
    const assetPath = DECORATION_ASSETS[decoration.kind];
    const fallback  = decoration.kind === "bush" ? createBush
                    : decoration.kind === "tree" ? createTree
                    : createBasaltRock;

    return assetLoader.createAssetBackedMesh(name, assetPath, fallback);
  }

  const decorations = generateDecorations(gridW, gridH);
  for (let i = 0; i < decorations.length; i++) {
    const d    = decorations[i];
    const mesh = buildDecorationMesh(d, i);

    mesh.position.x = d.x;
    mesh.position.z = d.y;
    mesh.rotation.y = d.rotation ?? 0;
    mesh.scaling.scaleInPlace(Math.max(d.scale ?? 1, 0));
    mesh.metadata = {
      decorationKind: d.kind,
      blocks:         d.blocks,
      assetPath:      DECORATION_ASSETS[d.kind],
    };

    decorationMeshes.push(mesh);
  }

  return {
    // Supprime visuellement toutes les décorations dans le rayon de la nuke.
    removeInRadius(worldX, worldY, radius) {
      const r2 = radius * radius;
      for (let i = decorationMeshes.length - 1; i >= 0; i--) {
        const mesh = decorationMeshes[i];
        const dx   = mesh.position.x - worldX;
        const dz   = mesh.position.z - worldY;
        if (dx * dx + dz * dz <= r2) {
          mesh.dispose();
          decorationMeshes.splice(i, 1);
        }
      }
    },
    dispose() {
      for (const mesh of decorationMeshes) mesh.dispose();
      decorationMeshes.length = 0;
    },
  };
}

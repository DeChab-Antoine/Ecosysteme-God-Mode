const DECORATION_ASSETS = {
  crystalCluster: null,
  basaltRock: null,
  alienPlant: null,
  sporeMound: null,
  monolith: null,
};

const STATIC_DECORATIONS = [
  { kind: "crystalCluster", x: 8, y: 8, scale: 1.2, rotation: 0.2, blocks: true },
  { kind: "crystalCluster", x: 16, y: 60, scale: 0.9, rotation: 1.5, blocks: true },
  { kind: "crystalCluster", x: 101, y: 14, scale: 1.5, rotation: 0.8, blocks: true },
  { kind: "crystalCluster", x: 112, y: 66, scale: 1.1, rotation: 2.2, blocks: true },

  { kind: "basaltRock", x: 25, y: 12, scale: 1.5, rotation: 0.4, blocks: true },
  { kind: "basaltRock", x: 35, y: 65, scale: 1.1, rotation: 2.1, blocks: true },
  { kind: "basaltRock", x: 68, y: 20, scale: 1.3, rotation: 1.2, blocks: true },
  { kind: "basaltRock", x: 92, y: 55, scale: 1.7, rotation: 0.7, blocks: true },
  { kind: "basaltRock", x: 108, y: 35, scale: 1.0, rotation: 1.9, blocks: true },

  { kind: "alienPlant", x: 12, y: 35, scale: 1.0, rotation: 0.5, blocks: false },
  { kind: "alienPlant", x: 22, y: 30, scale: 0.8, rotation: 1.4, blocks: false },
  { kind: "alienPlant", x: 48, y: 11, scale: 1.2, rotation: 2.5, blocks: false },
  { kind: "alienPlant", x: 77, y: 65, scale: 1.0, rotation: 0.9, blocks: false },
  { kind: "alienPlant", x: 105, y: 22, scale: 0.9, rotation: 1.8, blocks: false },
  { kind: "alienPlant", x: 111, y: 48, scale: 1.3, rotation: 2.8, blocks: false },

  { kind: "sporeMound", x: 18, y: 18, scale: 1.0, rotation: 0.0, blocks: false },
  { kind: "sporeMound", x: 42, y: 48, scale: 1.2, rotation: 0.0, blocks: false },
  { kind: "sporeMound", x: 63, y: 67, scale: 0.9, rotation: 0.0, blocks: false },
  { kind: "sporeMound", x: 84, y: 30, scale: 1.1, rotation: 0.0, blocks: false },
  { kind: "sporeMound", x: 100, y: 70, scale: 1.0, rotation: 0.0, blocks: false },

  { kind: "monolith", x: 53, y: 27, scale: 1.5, rotation: 0.4, blocks: true },
  { kind: "monolith", x: 57, y: 31, scale: 1.1, rotation: -0.2, blocks: true },
  { kind: "monolith", x: 62, y: 27, scale: 1.3, rotation: 0.8, blocks: true },
];

export function createRenderer3D(canvas, { gridW, gridH, cellSize }) {
  // =========================
  // Moteur / scène
  // =========================
  const engine = new BABYLON.Engine(canvas, true, {
    adaptToDeviceRatio: true,
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.06, 0.07, 0.1, 1);
  scene.ambientColor = new BABYLON.Color3(0.15, 0.18, 0.25);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0028;
  scene.fogColor = new BABYLON.Color3(0.06, 0.07, 0.1);

  // =========================
  // Caméra
  // =========================
  const worldCenter = new BABYLON.Vector3(
    (gridW - 1) / 2,
    0,
    (gridH - 1) / 2
  );

  const cameraRadius = Math.max(gridW, gridH) * 0.95;

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -Math.PI / 2,
    1.05,
    cameraRadius,
    worldCenter,
    scene
  );

  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = Math.max(gridW, gridH) * 3;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 100;
  camera.lowerBetaLimit = 0.2;
  camera.upperBetaLimit = Math.PI / 2.1;

  // =========================
  // Lumières
  // =========================
  const hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.75;
  hemiLight.diffuse = new BABYLON.Color3(0.62, 0.75, 1.0);
  hemiLight.groundColor = new BABYLON.Color3(0.13, 0.09, 0.18);

  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-0.5, -1, -0.5),
    scene
  );
  dirLight.position = new BABYLON.Vector3(gridW * 0.25, 42, gridH * 0.15);
  dirLight.intensity = 1.1;
  dirLight.diffuse = new BABYLON.Color3(1.0, 0.78, 0.52);
  dirLight.specular = new BABYLON.Color3(0.5, 0.42, 0.32);

  const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel = 18;
  shadowGenerator.depthScale = 80;

  // =========================
  // Sol
  // =========================
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    {
      width: gridW,
      height: gridH,
      subdivisions: 32,
    },
    scene
  );

  // Important :
  // Babylon centre le sol sur son centre géométrique.
  // Nous voulons que la case (0,0) soit visible dans le coin du monde
  // et que les positions entités (x,y) correspondent naturellement.
  ground.position.x = (gridW - 1) / 2;
  ground.position.z = (gridH - 1) / 2;

  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = new BABYLON.Color3(0.18, 0.15, 0.23);
  groundMat.emissiveColor = new BABYLON.Color3(0.015, 0.012, 0.028);
  groundMat.specularColor = new BABYLON.Color3(0.04, 0.03, 0.06);
  ground.material = groundMat;
  ground.receiveShadows = true;

  const innerGround = BABYLON.MeshBuilder.CreateGround(
    "innerGround",
    {
      width: gridW - 8,
      height: gridH - 8,
      subdivisions: 8,
    },
    scene
  );
  innerGround.position.x = (gridW - 1) / 2;
  innerGround.position.z = (gridH - 1) / 2;
  innerGround.position.y = 0.015;

  const innerGroundMat = new BABYLON.StandardMaterial("innerGroundMat", scene);
  innerGroundMat.diffuseColor = new BABYLON.Color3(0.23, 0.2, 0.31);
  innerGroundMat.emissiveColor = new BABYLON.Color3(0.018, 0.018, 0.04);
  innerGroundMat.specularColor = new BABYLON.Color3(0.03, 0.025, 0.05);
  innerGround.material = innerGroundMat;
  innerGround.receiveShadows = true;

  // =========================
  // Bord du monde minimal
  // =========================
  const borderHeight = 0.5;
  const borderThickness = 0.2;

  function makeBorder(name, width, depth, x, z) {
    const mesh = BABYLON.MeshBuilder.CreateBox(
      name,
      { width, height: borderHeight, depth },
      scene
    );
    mesh.position.set(x, borderHeight / 2, z);

    const mat = new BABYLON.StandardMaterial(`${name}Mat`, scene);
    mat.diffuseColor = new BABYLON.Color3(0.34, 0.33, 0.47);
    mat.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.05);
    mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.08);
    mesh.material = mat;
    mesh.receiveShadows = true;
    shadowGenerator.addShadowCaster(mesh);

    return mesh;
  }

  makeBorder("borderTop", gridW, borderThickness, (gridW - 1) / 2, -0.5);
  makeBorder("borderBottom", gridW, borderThickness, (gridW - 1) / 2, gridH - 0.5);
  makeBorder("borderLeft", borderThickness, gridH, -0.5, (gridH - 1) / 2);
  makeBorder("borderRight", borderThickness, gridH, gridW - 0.5, (gridH - 1) / 2);

  // =========================
  // Matériaux entités
  // =========================
  const humanMat = new BABYLON.StandardMaterial("humanMat", scene);
  humanMat.diffuseColor = new BABYLON.Color3(0.84, 0.60, 0.60);
  humanMat.specularColor = new BABYLON.Color3(0, 0, 0);

  const pigMat = new BABYLON.StandardMaterial("pigMat", scene);
  pigMat.diffuseColor = new BABYLON.Color3(1.0, 0.0, 0.53);
  pigMat.specularColor = new BABYLON.Color3(0, 0, 0);

  const carrotMat = new BABYLON.StandardMaterial("carrotMat", scene);
  carrotMat.diffuseColor = new BABYLON.Color3(1.0, 0.47, 0.0);
  carrotMat.specularColor = new BABYLON.Color3(0, 0, 0);

  // =========================
  // Decorations statiques
  // =========================
  function createDecorationMaterials() {
    const rock = new BABYLON.StandardMaterial("decorRockMat", scene);
    rock.diffuseColor = new BABYLON.Color3(0.28, 0.3, 0.42);
    rock.emissiveColor = new BABYLON.Color3(0.015, 0.017, 0.035);
    rock.specularColor = new BABYLON.Color3(0.03, 0.035, 0.06);

    const crystal = new BABYLON.StandardMaterial("decorCrystalMat", scene);
    crystal.diffuseColor = new BABYLON.Color3(0.28, 0.84, 1.0);
    crystal.emissiveColor = new BABYLON.Color3(0.06, 0.28, 0.42);
    crystal.specularColor = new BABYLON.Color3(0.5, 0.8, 1.0);

    const plantStem = new BABYLON.StandardMaterial("decorPlantStemMat", scene);
    plantStem.diffuseColor = new BABYLON.Color3(0.22, 0.38, 0.28);
    plantStem.emissiveColor = new BABYLON.Color3(0.01, 0.04, 0.02);
    plantStem.specularColor = new BABYLON.Color3(0.02, 0.03, 0.02);

    const plantGlow = new BABYLON.StandardMaterial("decorPlantGlowMat", scene);
    plantGlow.diffuseColor = new BABYLON.Color3(0.68, 1.0, 0.5);
    plantGlow.emissiveColor = new BABYLON.Color3(0.08, 0.28, 0.08);
    plantGlow.specularColor = new BABYLON.Color3(0.05, 0.12, 0.04);

    const spore = new BABYLON.StandardMaterial("decorSporeMat", scene);
    spore.diffuseColor = new BABYLON.Color3(0.72, 0.35, 0.9);
    spore.emissiveColor = new BABYLON.Color3(0.08, 0.03, 0.14);
    spore.specularColor = new BABYLON.Color3(0.16, 0.08, 0.2);

    const monolith = new BABYLON.StandardMaterial("decorMonolithMat", scene);
    monolith.diffuseColor = new BABYLON.Color3(0.18, 0.2, 0.32);
    monolith.emissiveColor = new BABYLON.Color3(0.025, 0.025, 0.08);
    monolith.specularColor = new BABYLON.Color3(0.08, 0.08, 0.16);

    return { rock, crystal, plantStem, plantGlow, spore, monolith };
  }

  const decorationMaterials = createDecorationMaterials();
  const decorationMeshes = [];

  function mergeMeshes(name, meshes) {
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    merged.name = name;
    merged.receiveShadows = true;
    shadowGenerator.addShadowCaster(merged);
    return merged;
  }

  function createCrystalCluster(name, materials) {
    const meshes = [];
    const specs = [
      { h: 2.2, d: 0.7, x: 0, z: 0, r: 0.1 },
      { h: 1.6, d: 0.48, x: 0.48, z: 0.18, r: -0.35 },
      { h: 1.3, d: 0.42, x: -0.42, z: 0.12, r: 0.55 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(
        `${name}-crystal`,
        { height: spec.h, diameterTop: 0.08, diameterBottom: spec.d, tessellation: 6 },
        scene
      );
      mesh.position.set(spec.x, spec.h / 2, spec.z);
      mesh.rotation.z = spec.r;
      mesh.material = materials.crystal;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createBasaltRock(name, materials) {
    const meshes = [];
    const specs = [
      { w: 1.7, h: 0.75, d: 1.2, x: 0, z: 0 },
      { w: 1.0, h: 0.55, d: 0.9, x: 0.65, z: -0.22 },
      { w: 0.9, h: 0.5, d: 0.7, x: -0.55, z: 0.25 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateSphere(
        `${name}-rock`,
        { diameter: 1, segments: 8 },
        scene
      );
      mesh.scaling.set(spec.w, spec.h, spec.d);
      mesh.position.set(spec.x, spec.h * 0.45, spec.z);
      mesh.material = materials.rock;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createAlienPlant(name, materials) {
    const meshes = [];
    const stem = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-stem`,
      { height: 1.2, diameterTop: 0.12, diameterBottom: 0.22, tessellation: 7 },
      scene
    );
    stem.position.y = 0.6;
    stem.material = materials.plantStem;
    meshes.push(stem);

    for (let i = 0; i < 3; i++) {
      const leaf = BABYLON.MeshBuilder.CreateSphere(
        `${name}-leaf`,
        { diameter: 0.52, segments: 8 },
        scene
      );
      const angle = i * (Math.PI * 2 / 3);
      leaf.scaling.set(0.42, 0.18, 0.9);
      leaf.position.set(Math.cos(angle) * 0.25, 1.05, Math.sin(angle) * 0.25);
      leaf.rotation.y = angle;
      leaf.material = materials.plantGlow;
      meshes.push(leaf);
    }

    return mergeMeshes(name, meshes);
  }

  function createSporeMound(name, materials) {
    const meshes = [];
    const specs = [
      { d: 0.75, x: 0, z: 0 },
      { d: 0.45, x: 0.5, z: 0.08 },
      { d: 0.38, x: -0.42, z: 0.18 },
      { d: 0.32, x: 0.1, z: -0.45 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateSphere(
        `${name}-spore`,
        { diameter: spec.d, segments: 8 },
        scene
      );
      mesh.scaling.y = 0.45;
      mesh.position.set(spec.x, spec.d * 0.18, spec.z);
      mesh.material = materials.spore;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createMonolith(name, materials) {
    const mesh = BABYLON.MeshBuilder.CreateBox(
      `${name}-body`,
      { width: 0.75, height: 3.0, depth: 0.75 },
      scene
    );
    mesh.position.y = 1.5;
    mesh.rotation.z = 0.08;
    mesh.material = materials.monolith;

    return mergeMeshes(name, [mesh]);
  }

  function createFallbackDecorationMesh(decoration, index) {
    const name = `decor-${decoration.kind}-${index}`;

    if (DECORATION_ASSETS[decoration.kind]) {
      // Asset path reserved for a later GLB/GLTF loading pass.
      // For now every decoration uses the procedural fallback below.
    }

    if (decoration.kind === "crystalCluster") {
      return createCrystalCluster(name, decorationMaterials);
    }
    if (decoration.kind === "basaltRock") {
      return createBasaltRock(name, decorationMaterials);
    }
    if (decoration.kind === "alienPlant") {
      return createAlienPlant(name, decorationMaterials);
    }
    if (decoration.kind === "sporeMound") {
      return createSporeMound(name, decorationMaterials);
    }
    if (decoration.kind === "monolith") {
      return createMonolith(name, decorationMaterials);
    }

    return createBasaltRock(name, decorationMaterials);
  }

  function createStaticDecorations() {
    for (let i = 0; i < STATIC_DECORATIONS.length; i++) {
      const decoration = STATIC_DECORATIONS[i];
      const mesh = createFallbackDecorationMesh(decoration, i);

      mesh.position.x = decoration.x;
      mesh.position.z = decoration.y;
      mesh.rotation.y = decoration.rotation ?? 0;
      mesh.scaling.scaleInPlace(decoration.scale ?? 1);
      mesh.metadata = {
        decorationKind: decoration.kind,
        blocks: decoration.blocks,
        assetPath: DECORATION_ASSETS[decoration.kind],
      };

      decorationMeshes.push(mesh);
    }
  }

  createStaticDecorations();

  // =========================
  // Registres visuels
  // =========================
  const humanMeshes = new Map();   // id -> mesh
  const pigMeshes = new Map();     // id -> mesh
  const carrotMeshes = new Map();  // key -> mesh

  // =========================
  // Fabriques de mesh
  // =========================
  function createHumanMesh(id) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      `human-${id}`,
      {
        diameter: 0.75,
        segments: 12,
      },
      scene
    );
    mesh.material = humanMat;
    shadowGenerator.addShadowCaster(mesh);
    return mesh;
  }

  function createPigMesh(id) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(
      `pig-${id}`,
      {
        diameter: 0.9,
        segments: 12,
      },
      scene
    );
    mesh.material = pigMat;
    shadowGenerator.addShadowCaster(mesh);
    return mesh;
  }

  function createCarrotMesh(key) {
    const mesh = BABYLON.MeshBuilder.CreateBox(
      `carrot-${key}`,
      {
        size: 0.42,
      },
      scene
    );
    mesh.material = carrotMat;
    shadowGenerator.addShadowCaster(mesh);
    return mesh;
  }

  // =========================
  // Placement logique -> visuel
  // =========================
  function placeOnGrid(mesh, x, y, height = 0.5) {
    // Convention :
    // x logique -> x Babylon
    // y logique -> z Babylon
    // y Babylon -> hauteur
    mesh.position.x = x;
    mesh.position.z = y;
    mesh.position.y = height;
  }

  // =========================
  // Sync humains
  // =========================
  function syncHumans(world) {
    // création / mise à jour
    for (const [id, human] of world.humans.entries()) {
      let mesh = humanMeshes.get(id);

      if (!mesh) {
        mesh = createHumanMesh(id);
        humanMeshes.set(id, mesh);
      }

      placeOnGrid(mesh, human.x, human.y, 0.45);
    }

    // suppression
    for (const [id, mesh] of humanMeshes.entries()) {
      if (!world.humans.has(id)) {
        mesh.dispose();
        humanMeshes.delete(id);
      }
    }
  }

  // =========================
  // Sync cochons
  // =========================
  function syncPigs(world) {
    for (const [id, pig] of world.pigs.entries()) {
      let mesh = pigMeshes.get(id);

      if (!mesh) {
        mesh = createPigMesh(id);
        pigMeshes.set(id, mesh);
      }

      placeOnGrid(mesh, pig.x, pig.y, 0.5);
    }

    for (const [id, mesh] of pigMeshes.entries()) {
      if (!world.pigs.has(id)) {
        mesh.dispose();
        pigMeshes.delete(id);
      }
    }
  }

  // =========================
  // Sync carottes
  // =========================
  function syncCarrots(world) {
    for (const [key, carrot] of world.carrots.entries()) {
      let mesh = carrotMeshes.get(key);

      if (!mesh) {
        mesh = createCarrotMesh(key);
        carrotMeshes.set(key, mesh);
      }

      placeOnGrid(mesh, carrot.x, carrot.y, 0.22);
    }

    for (const [key, mesh] of carrotMeshes.entries()) {
      if (!world.carrots.has(key)) {
        mesh.dispose();
        carrotMeshes.delete(key);
      }
    }
  }

  // =========================
  // Jour / nuit minimal
  // =========================
  function updateLighting(view) {
    if (view?.isNight) {
      hemiLight.intensity = 0.2;
      dirLight.intensity = 0.18;
      dirLight.diffuse = new BABYLON.Color3(0.35, 0.45, 0.95);
      scene.clearColor = new BABYLON.Color4(0.025, 0.03, 0.06, 1);
      scene.fogColor = new BABYLON.Color3(0.025, 0.03, 0.06);
    } else {
      hemiLight.intensity = 0.75;
      dirLight.intensity = 1.1;
      dirLight.diffuse = new BABYLON.Color3(1.0, 0.78, 0.52);
      scene.clearColor = new BABYLON.Color4(0.06, 0.07, 0.1, 1);
      scene.fogColor = new BABYLON.Color3(0.06, 0.07, 0.1);
    }
  }

  // =========================
  // Resize
  // =========================
  function resize() {
    engine.resize();
  }

  window.addEventListener("resize", resize);

  // Premier resize
  resize();

  // =========================
  // Rendu principal
  // =========================
  function renderWorld(world, view) {
    syncCarrots(world);
    syncHumans(world);
    syncPigs(world);
    updateLighting(view);

    scene.render();
  }

  // =========================
  // Nettoyage
  // =========================
  function dispose() {
    window.removeEventListener("resize", resize);

    for (const mesh of humanMeshes.values()) mesh.dispose();
    for (const mesh of pigMeshes.values()) mesh.dispose();
    for (const mesh of carrotMeshes.values()) mesh.dispose();
    for (const mesh of decorationMeshes) mesh.dispose();

    humanMeshes.clear();
    pigMeshes.clear();
    carrotMeshes.clear();
    decorationMeshes.length = 0;

    scene.dispose();
    engine.dispose();
  }

  return {
    renderWorld,
    resize,
    dispose,
  };
}

const DECORATION_ASSETS = {
  smallRock: "Rock.glb",
  largeRock: "RockLarge.glb",
  bush: "Bush.glb",
  tree: "Tree.glb",
};

const ENTITY_ASSETS = {
  alien: "Alien.glb",
  blob: "Blob.glb",
  plant: "Plant.glb",
};

const ASSET_ROOT_URL = "../assets/";

const STATIC_DECORATIONS = [
  ...[
    [12, 11, 1.35, 0.2], [28, 18, 1.6, 1.4], [45, 10, 1.2, 2.1],
    [68, 17, 1.45, 0.8], [96, 13, 1.7, 1.9], [111, 28, 1.25, 2.7],
    [18, 58, 1.5, 0.6], [38, 70, 1.2, 2.0], [64, 61, 1.65, 1.1],
    [87, 70, 1.35, 0.4], [108, 57, 1.55, 2.3], [52, 38, 1.25, 1.6],
  ].map(([x, y, scale, rotation]) => ({
    kind: "largeRock",
    x,
    y,
    scale: scale * 0.5,
    rotation,
    blocks: true,
  })),

  ...[
    [7, 17, 0.45, 0.1], [16, 19, 0.55, 1.7], [24, 9, 0.5, 2.5],
    [34, 24, 0.42, 0.8], [51, 17, 0.5, 1.2], [59, 7, 0.44, 2.6],
    [75, 9, 0.5, 1.9], [84, 23, 0.46, 0.5], [103, 22, 0.52, 2.2],
    [115, 15, 0.42, 1.1], [9, 39, 0.48, 2.0], [23, 43, 0.54, 0.3],
    [35, 35, 0.44, 1.5], [47, 50, 0.52, 2.8], [61, 45, 0.43, 0.7],
    [73, 37, 0.5, 2.4], [83, 50, 0.46, 1.4], [99, 42, 0.55, 0.9],
    [113, 44, 0.42, 2.9], [8, 69, 0.5, 0.6], [27, 67, 0.46, 2.1],
    [45, 74, 0.55, 1.2], [57, 66, 0.44, 2.7], [75, 72, 0.5, 0.4],
    [93, 61, 0.48, 1.8], [116, 68, 0.52, 2.5],
  ].map(([x, y, scale, rotation]) => ({
    kind: "smallRock",
    x,
    y,
    scale: scale * 0.6,
    rotation,
    blocks: false,
  })),

  ...[
    [10, 27, 0.75, 0.4], [15, 31, 0.65, 1.7], [26, 30, 0.7, 2.4],
    [39, 14, 0.68, 0.8], [55, 25, 0.72, 1.5], [72, 28, 0.62, 2.2],
    [90, 27, 0.76, 0.6], [106, 37, 0.7, 1.9], [14, 50, 0.7, 2.8],
    [31, 55, 0.64, 0.3], [43, 62, 0.74, 1.1], [58, 55, 0.66, 2.5],
    [76, 57, 0.72, 0.7], [91, 50, 0.62, 1.4], [104, 65, 0.76, 2.1],
    [116, 53, 0.64, 0.9], [49, 31, 0.58, 2.6], [69, 43, 0.66, 1.0],
  ].map(([x, y, scale, rotation]) => ({ kind: "bush", x, y, scale, rotation, blocks: false })),

  ...[
    [18, 13, 1.0, 0.2], [36, 18, 1.15, 1.1], [62, 12, 0.95, 2.6],
    [89, 17, 1.08, 0.7], [109, 18, 0.95, 1.9], [13, 62, 1.12, 2.2],
    [33, 60, 1.0, 0.5], [55, 69, 1.08, 1.5], [81, 64, 0.96, 2.8],
    [101, 72, 1.14, 0.9], [21, 39, 0.95, 1.8], [98, 48, 1.05, 2.4],
  ].map(([x, y, scale, rotation]) => ({ kind: "tree", x, y, scale, rotation, blocks: true })),
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

  const sunPosition = new BABYLON.Vector3(-gridW * 0.16, 36, -gridH * 0.18);
  dirLight.position.copyFrom(sunPosition);
  dirLight.direction = worldCenter.subtract(sunPosition).normalize();

  const glowLayer = new BABYLON.GlowLayer("exoplanetGlow", scene, {
    blurKernelSize: 48,
  });
  glowLayer.intensity = 0.45;

  const sunRoot = new BABYLON.TransformNode("exoplanetSunRoot", scene);
  sunRoot.position.copyFrom(sunPosition);

  const sunMat = new BABYLON.StandardMaterial("exoplanetSunMat", scene);
  sunMat.diffuseColor = new BABYLON.Color3(1.0, 0.35, 0.75);
  sunMat.emissiveColor = new BABYLON.Color3(1.0, 0.28, 0.85);
  sunMat.specularColor = new BABYLON.Color3(0, 0, 0);

  const sun = BABYLON.MeshBuilder.CreateSphere(
    "exoplanetSun",
    { diameter: 8, segments: 48 },
    scene
  );
  sun.parent = sunRoot;
  sun.material = sunMat;

  const coronaMat = new BABYLON.StandardMaterial("exoplanetCoronaMat", scene);
  coronaMat.diffuseColor = new BABYLON.Color3(0.45, 0.8, 1.0);
  coronaMat.emissiveColor = new BABYLON.Color3(0.25, 0.95, 1.0);
  coronaMat.alpha = 0.72;
  coronaMat.specularColor = new BABYLON.Color3(0, 0, 0);

  const corona = BABYLON.MeshBuilder.CreateTorus(
    "exoplanetSunCorona",
    { diameter: 10.8, thickness: 0.18, tessellation: 96 },
    scene
  );
  corona.parent = sunRoot;
  corona.rotation.x = Math.PI / 2.7;
  corona.rotation.y = Math.PI / 5;
  corona.material = coronaMat;

  const haloMat = new BABYLON.StandardMaterial("exoplanetHaloMat", scene);
  haloMat.diffuseColor = new BABYLON.Color3(0.85, 0.35, 1.0);
  haloMat.emissiveColor = new BABYLON.Color3(0.38, 0.14, 0.85);
  haloMat.alpha = 0.28;
  haloMat.specularColor = new BABYLON.Color3(0, 0, 0);

  const halo = BABYLON.MeshBuilder.CreateSphere(
    "exoplanetSunHalo",
    { diameter: 15, segments: 48 },
    scene
  );
  halo.parent = sunRoot;
  halo.material = haloMat;

  const sunFillLight = new BABYLON.PointLight(
    "exoplanetSunFill",
    sunPosition,
    scene
  );
  sunFillLight.intensity = 1.65;
  sunFillLight.range = Math.max(gridW, gridH) * 1.45;
  sunFillLight.diffuse = new BABYLON.Color3(1.0, 0.32, 0.82);
  sunFillLight.specular = new BABYLON.Color3(0.45, 0.7, 1.0);

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
  const plantMat = new BABYLON.StandardMaterial("plantMat", scene);
  plantMat.diffuseColor = new BABYLON.Color3(0.95, 0.75, 0.25);
  plantMat.emissiveColor = new BABYLON.Color3(0.12, 0.08, 0.02);
  plantMat.specularColor = new BABYLON.Color3(0.28, 0.18, 0.04);

  const alienCoreMat = new BABYLON.StandardMaterial("alienCoreMat", scene);
  alienCoreMat.diffuseColor = new BABYLON.Color3(0.84, 0.60, 0.60);
  alienCoreMat.emissiveColor = new BABYLON.Color3(0.03, 0.015, 0.02);
  alienCoreMat.specularColor = new BABYLON.Color3(0.1, 0.04, 0.04);

  const alienSensorMat = new BABYLON.StandardMaterial("alienSensorMat", scene);
  alienSensorMat.diffuseColor = new BABYLON.Color3(0.5, 0.95, 1.0);
  alienSensorMat.emissiveColor = new BABYLON.Color3(0.08, 0.22, 0.3);
  alienSensorMat.specularColor = new BABYLON.Color3(0.25, 0.5, 0.6);

  const blobCoreMat = new BABYLON.StandardMaterial("blobCoreMat", scene);
  blobCoreMat.diffuseColor = new BABYLON.Color3(0.95, 0.15, 0.58);
  blobCoreMat.emissiveColor = new BABYLON.Color3(0.05, 0.0, 0.025);
  blobCoreMat.specularColor = new BABYLON.Color3(0.12, 0.02, 0.08);

  const blobAccentMat = new BABYLON.StandardMaterial("blobAccentMat", scene);
  blobAccentMat.diffuseColor = new BABYLON.Color3(1.0, 0.45, 0.78);
  blobAccentMat.emissiveColor = new BABYLON.Color3(0.08, 0.01, 0.05);
  blobAccentMat.specularColor = new BABYLON.Color3(0.18, 0.04, 0.12);

  const plantGlowMat = new BABYLON.StandardMaterial("plantGlowMat", scene);
  plantGlowMat.diffuseColor = new BABYLON.Color3(1.0, 0.55, 0.08);
  plantGlowMat.emissiveColor = new BABYLON.Color3(0.18, 0.08, 0.01);
  plantGlowMat.specularColor = new BABYLON.Color3(0.25, 0.14, 0.03);

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
    plantStem.diffuseColor = new BABYLON.Color3(0.24, 0.19, 0.16);
    plantStem.emissiveColor = new BABYLON.Color3(0.025, 0.016, 0.014);
    plantStem.specularColor = new BABYLON.Color3(0.035, 0.025, 0.02);

    const plantGlow = new BABYLON.StandardMaterial("decorplantGlowMat", scene);
    plantGlow.diffuseColor = new BABYLON.Color3(0.32, 0.62, 0.42);
    plantGlow.emissiveColor = new BABYLON.Color3(0.025, 0.09, 0.045);
    plantGlow.specularColor = new BABYLON.Color3(0.04, 0.1, 0.055);

    const spore = new BABYLON.StandardMaterial("decorSporeMat", scene);
    spore.diffuseColor = new BABYLON.Color3(0.72, 0.35, 0.9);
    spore.emissiveColor = new BABYLON.Color3(0.08, 0.03, 0.14);
    spore.specularColor = new BABYLON.Color3(0.16, 0.08, 0.2);

    const monolith = new BABYLON.StandardMaterial("decorMonolithMat", scene);
    monolith.diffuseColor = new BABYLON.Color3(0.18, 0.2, 0.32);
    monolith.emissiveColor = new BABYLON.Color3(0.025, 0.025, 0.08);
    monolith.specularColor = new BABYLON.Color3(0.08, 0.08, 0.16);

    const vein = new BABYLON.StandardMaterial("decorEnergyVeinMat", scene);
    vein.diffuseColor = new BABYLON.Color3(0.22, 0.82, 1.0);
    vein.emissiveColor = new BABYLON.Color3(0.08, 0.26, 0.36);
    vein.specularColor = new BABYLON.Color3(0.3, 0.65, 0.8);

    const patch = new BABYLON.StandardMaterial("decorMineralPatchMat", scene);
    patch.diffuseColor = new BABYLON.Color3(0.48, 0.36, 0.68);
    patch.emissiveColor = new BABYLON.Color3(0.05, 0.035, 0.09);
    patch.specularColor = new BABYLON.Color3(0.12, 0.08, 0.16);

    const pool = new BABYLON.StandardMaterial("decorGlowPoolMat", scene);
    pool.diffuseColor = new BABYLON.Color3(0.16, 0.58, 0.72);
    pool.emissiveColor = new BABYLON.Color3(0.03, 0.16, 0.22);
    pool.specularColor = new BABYLON.Color3(0.08, 0.2, 0.24);

    const ridge = new BABYLON.StandardMaterial("decorRidgeMat", scene);
    ridge.diffuseColor = new BABYLON.Color3(0.3, 0.27, 0.42);
    ridge.emissiveColor = new BABYLON.Color3(0.018, 0.016, 0.045);
    ridge.specularColor = new BABYLON.Color3(0.06, 0.05, 0.1);

    const beacon = new BABYLON.StandardMaterial("decorBeaconMat", scene);
    beacon.diffuseColor = new BABYLON.Color3(0.18, 0.22, 0.36);
    beacon.emissiveColor = new BABYLON.Color3(0.025, 0.035, 0.09);
    beacon.specularColor = new BABYLON.Color3(0.1, 0.14, 0.22);

    const beaconGlow = new BABYLON.StandardMaterial("decorBeaconGlowMat", scene);
    beaconGlow.diffuseColor = new BABYLON.Color3(0.7, 0.95, 1.0);
    beaconGlow.emissiveColor = new BABYLON.Color3(0.12, 0.28, 0.38);
    beaconGlow.specularColor = new BABYLON.Color3(0.3, 0.55, 0.7);

    return {
      rock,
      crystal,
      plantStem,
      plantGlow,
      spore,
      monolith,
      vein,
      patch,
      pool,
      ridge,
      beacon,
      beaconGlow,
    };
  }

  const decorationMaterials = createDecorationMaterials();
  const decorationMeshes = [];
  const assetContainerPromises = new Map();

  function mergeMeshes(name, meshes) {
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    merged.name = name;
    merged.receiveShadows = true;
    shadowGenerator.addShadowCaster(merged);
    return merged;
  }

  function loadAssetContainer(assetPath) {
    if (assetContainerPromises.has(assetPath)) {
      return assetContainerPromises.get(assetPath);
    }

    const containerPromise = BABYLON.SceneLoader.LoadAssetContainerAsync(ASSET_ROOT_URL, assetPath, scene)
      .then((container) => {
        for (const animationGroup of container.animationGroups) {
          animationGroup.stop();
        }
        return container;
      });

    assetContainerPromises.set(assetPath, containerPromise);
    return containerPromise;
  }

  function createAssetInstance(container, root) {
    const instance = container.instantiateModelsToScene(
      (sourceName) => `${root.name}-${sourceName}`,
      false
    );

    for (const node of instance.rootNodes) {
      node.parent = root;
    }

    for (const mesh of root.getChildMeshes(false)) {
      mesh.receiveShadows = true;
      mesh.isPickable = false;
      shadowGenerator.addShadowCaster(mesh);
    }

    for (const animationGroup of instance.animationGroups) {
      animationGroup.stop();
      animationGroup.speedRatio = 1;
    }

    root.metadata ??= {};
    root.metadata.animationGroups = instance.animationGroups;
  }

  function createAssetBackedMesh(name, assetPath, createFallbackMesh) {
    const root = new BABYLON.TransformNode(name, scene);
    const fallback = createFallbackMesh(`${name}-fallback`);
    fallback.parent = root;

    if (!assetPath || !BABYLON.SceneLoader?.LoadAssetContainerAsync) {
      return root;
    }

    loadAssetContainer(assetPath)
      .then((container) => {
        createAssetInstance(container, root);
        fallback.dispose(false, true);
      })
      .catch((error) => {
        console.warn(`Impossible de charger l'asset 3D ${assetPath}`, error);
      });

    return root;
  }

  function normalizeAnimationName(name) {
    return String(name ?? "").toLowerCase().replace(/[\s_-]/g, "");
  }

  function findAnimationGroup(mesh, names) {
    const groups = mesh.metadata?.animationGroups ?? [];
    const wanted = names.map(normalizeAnimationName);

    return groups.find((group) => {
      const groupName = normalizeAnimationName(group.name);
      return wanted.some((name) => groupName.includes(name));
    });
  }

  function playLoopAnimation(mesh, names) {
    if (mesh.metadata?.actionAnimationUntil && performance.now() < mesh.metadata.actionAnimationUntil) {
      return;
    }

    const group = findAnimationGroup(mesh, names);
    if (!group || mesh.metadata?.currentLoopAnimation === group.name) return;

    for (const animationGroup of mesh.metadata?.animationGroups ?? []) {
      animationGroup.stop();
    }

    group.reset();
    group.start(true);
    mesh.metadata.currentLoopAnimation = group.name;
  }

  function playActionAnimation(mesh, names, durationMs = 700) {
    const group = findAnimationGroup(mesh, names);
    if (!group) return false;

    for (const animationGroup of mesh.metadata?.animationGroups ?? []) {
      animationGroup.stop();
    }

    group.reset();
    group.start(false);
    mesh.metadata.currentLoopAnimation = null;
    mesh.metadata.actionAnimationUntil = performance.now() + durationMs;
    return true;
  }

  function playDeathAnimation(mesh) {
    return playActionAnimation(mesh, ["death", "die", "dead"], 900);
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

  function createBush(name, materials) {
    const meshes = [];
    const specs = [
      { d: 0.9, x: 0, z: 0, y: 0.34 },
      { d: 0.62, x: 0.42, z: -0.08, y: 0.28 },
      { d: 0.58, x: -0.38, z: 0.12, y: 0.26 },
      { d: 0.48, x: 0.05, z: 0.42, y: 0.24 },
    ];

    for (const spec of specs) {
      const leaf = BABYLON.MeshBuilder.CreateSphere(
        `${name}-leaf`,
        { diameter: spec.d, segments: 8 },
        scene
      );
      leaf.scaling.y = 0.7;
      leaf.position.set(spec.x, spec.y, spec.z);
      leaf.material = materials.plantGlow;
      meshes.push(leaf);
    }

    return mergeMeshes(name, meshes);
  }

  function createTree(name, materials) {
    const meshes = [];
    const stem = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-stem`,
      { height: 1.65, diameterTop: 0.18, diameterBottom: 0.34, tessellation: 7 },
      scene
    );
    stem.position.y = 0.82;
    stem.material = materials.plantStem;
    meshes.push(stem);

    for (let i = 0; i < 4; i++) {
      const leaf = BABYLON.MeshBuilder.CreateSphere(
        `${name}-leaf`,
        { diameter: i === 0 ? 1.25 : 0.92, segments: 10 },
        scene
      );
      const angle = i * (Math.PI * 2 / 4) + 0.35;
      const radius = i === 0 ? 0 : 0.42;
      leaf.scaling.set(0.9, 0.72, 0.9);
      leaf.position.set(Math.cos(angle) * radius, 1.62 + i * 0.04, Math.sin(angle) * radius);
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

  function createEnergyVein(name, materials) {
    const meshes = [];
    const specs = [
      { w: 4.6, d: 0.18, x: 0, z: 0, r: 0.0 },
      { w: 2.2, d: 0.14, x: -1.3, z: 0.42, r: 0.7 },
      { w: 2.6, d: 0.14, x: 1.1, z: -0.34, r: -0.55 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateBox(
        `${name}-vein`,
        { width: spec.w, height: 0.035, depth: spec.d },
        scene
      );
      mesh.position.set(spec.x, 0.04, spec.z);
      mesh.rotation.y = spec.r;
      mesh.material = materials.vein;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createMineralPatch(name, materials) {
    const meshes = [];
    const specs = [
      { w: 3.4, d: 2.0, x: 0, z: 0, r: 0.2 },
      { w: 1.8, d: 1.0, x: 1.45, z: 0.5, r: -0.4 },
      { w: 1.5, d: 0.9, x: -1.2, z: -0.55, r: 0.8 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateBox(
        `${name}-patch`,
        { width: spec.w, height: 0.025, depth: spec.d },
        scene
      );
      mesh.position.set(spec.x, 0.03, spec.z);
      mesh.rotation.y = spec.r;
      mesh.material = materials.patch;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createGlowPool(name, materials) {
    const meshes = [];
    const specs = [
      { d: 3.6, x: 0, z: 0, sx: 1.35, sz: 0.82 },
      { d: 1.7, x: 1.55, z: 0.25, sx: 1.0, sz: 0.7 },
      { d: 1.2, x: -1.35, z: -0.35, sx: 0.9, sz: 0.65 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateCylinder(
        `${name}-pool`,
        { height: 0.028, diameter: spec.d, tessellation: 24 },
        scene
      );
      mesh.position.set(spec.x, 0.035, spec.z);
      mesh.scaling.x = spec.sx;
      mesh.scaling.z = spec.sz;
      mesh.material = materials.pool;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createRidge(name, materials) {
    const meshes = [];
    const specs = [
      { w: 7.5, h: 0.18, d: 0.55, x: 0, z: 0 },
      { w: 2.4, h: 0.28, d: 0.75, x: -2.2, z: 0.15 },
      { w: 2.8, h: 0.24, d: 0.6, x: 2.5, z: -0.12 },
    ];

    for (const spec of specs) {
      const mesh = BABYLON.MeshBuilder.CreateBox(
        `${name}-ridge`,
        { width: spec.w, height: spec.h, depth: spec.d },
        scene
      );
      mesh.position.set(spec.x, spec.h / 2, spec.z);
      mesh.material = materials.ridge;
      meshes.push(mesh);
    }

    return mergeMeshes(name, meshes);
  }

  function createBeacon(name, materials) {
    const meshes = [];

    const base = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-base`,
      { height: 1.25, diameterTop: 0.42, diameterBottom: 0.72, tessellation: 8 },
      scene
    );
    base.position.y = 0.62;
    base.material = materials.beacon;
    meshes.push(base);

    const ring = BABYLON.MeshBuilder.CreateTorus(
      `${name}-ring`,
      { diameter: 0.98, thickness: 0.08, tessellation: 16 },
      scene
    );
    ring.position.y = 1.38;
    ring.rotation.x = Math.PI / 2;
    ring.material = materials.beaconGlow;
    meshes.push(ring);

    const core = BABYLON.MeshBuilder.CreateSphere(
      `${name}-core`,
      { diameter: 0.42, segments: 12 },
      scene
    );
    core.position.y = 1.42;
    core.material = materials.beaconGlow;
    meshes.push(core);

    return mergeMeshes(name, meshes);
  }

  function createFallbackDecorationMesh(decoration, index) {
    const name = `decor-${decoration.kind}-${index}`;
    const assetPath = DECORATION_ASSETS[decoration.kind];

    if (decoration.kind === "smallRock" || decoration.kind === "largeRock") {
      return createAssetBackedMesh(name, assetPath, (fallbackName) =>
        createBasaltRock(fallbackName, decorationMaterials)
      );
    }
    if (decoration.kind === "bush") {
      return createAssetBackedMesh(name, assetPath, (fallbackName) =>
        createBush(fallbackName, decorationMaterials)
      );
    }
    if (decoration.kind === "tree") {
      return createAssetBackedMesh(name, assetPath, (fallbackName) =>
        createTree(fallbackName, decorationMaterials)
      );
    }

    return createAssetBackedMesh(name, assetPath, (fallbackName) =>
      createBasaltRock(fallbackName, decorationMaterials)
    );
  }

  function createStaticDecorations() {
    for (let i = 0; i < STATIC_DECORATIONS.length; i++) {
      const decoration = STATIC_DECORATIONS[i];
      const mesh = createFallbackDecorationMesh(decoration, i);

      mesh.position.x = decoration.x;
      mesh.position.z = decoration.y;
      mesh.rotation.y = decoration.rotation ?? 0;
      const minVisibleScale = decoration.blocks ? 1 : 0;
      mesh.scaling.scaleInPlace(Math.max(decoration.scale ?? 1, minVisibleScale));
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
  const alienMeshes = new Map();   // id -> mesh
  const blobMeshes = new Map();     // id -> mesh
  const plantMeshes = new Map();  // key -> mesh
  const previousAlienPositions = new Map();
  const previousBlobPositions = new Map();

  // =========================
  // Fabriques de mesh
  // =========================
  function createFallbackAlienMesh(name) {
    const meshes = [];

    const body = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-body`,
      { height: 0.85, diameterTop: 0.42, diameterBottom: 0.55, tessellation: 8 },
      scene
    );
    body.position.y = 0.42;
    body.material = alienCoreMat;
    meshes.push(body);

    const head = BABYLON.MeshBuilder.CreateSphere(
      `${name}-head`,
      { diameter: 0.38, segments: 10 },
      scene
    );
    head.position.y = 1.02;
    head.material = alienCoreMat;
    meshes.push(head);

    const sensor = BABYLON.MeshBuilder.CreateSphere(
      `${name}-sensor`,
      { diameter: 0.16, segments: 8 },
      scene
    );
    sensor.position.set(0, 1.04, -0.2);
    sensor.material = alienSensorMat;
    meshes.push(sensor);

    return mergeMeshes(name, meshes);
  }

  function createFallbackBlobMesh(name) {
    const meshes = [];

    const body = BABYLON.MeshBuilder.CreateSphere(
      `${name}-body`,
      { diameter: 0.78, segments: 10 },
      scene
    );
    body.scaling.set(1.15, 0.72, 0.9);
    body.position.y = 0.42;
    body.material = blobCoreMat;
    meshes.push(body);

    const crest = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-crest`,
      { height: 0.38, diameterTop: 0.05, diameterBottom: 0.22, tessellation: 5 },
      scene
    );
    crest.position.set(0, 0.95, -0.18);
    crest.rotation.x = 0.35;
    crest.material = blobAccentMat;
    meshes.push(crest);

    const node = BABYLON.MeshBuilder.CreateSphere(
      `${name}-node`,
      { diameter: 0.22, segments: 8 },
      scene
    );
    node.position.set(0, 0.48, -0.48);
    node.material = blobAccentMat;
    meshes.push(node);

    return mergeMeshes(name, meshes);
  }

  function createFallbackPlantMesh(name) {
    const meshes = [];

    const shard = BABYLON.MeshBuilder.CreateCylinder(
      `${name}-shard`,
      { height: 0.72, diameterTop: 0.05, diameterBottom: 0.32, tessellation: 6 },
      scene
    );
    shard.position.y = 0.36;
    shard.rotation.z = 0.12;
    shard.material = plantGlowMat;
    meshes.push(shard);

    const base = BABYLON.MeshBuilder.CreateSphere(
      `${name}-base`,
      { diameter: 0.28, segments: 8 },
      scene
    );
    base.scaling.y = 0.35;
    base.position.y = 0.08;
    base.material = plantMat;
    meshes.push(base);

    return mergeMeshes(name, meshes);
  }

  function createFallbackEntityMesh(kind, name) {
    const assetPath = ENTITY_ASSETS[kind];

    if (kind === "alien") {
      return createAssetBackedMesh(name, assetPath, createFallbackAlienMesh);
    }
    if (kind === "blob") {
      return createAssetBackedMesh(name, assetPath, createFallbackBlobMesh);
    }
    if (kind === "plant") {
      return createAssetBackedMesh(name, assetPath, createFallbackPlantMesh);
    }

    return createAssetBackedMesh(name, assetPath, createFallbackAlienMesh);
  }

  function createAlienMesh(id) {
    const mesh = createFallbackEntityMesh("alien", `alien-${id}`);
    mesh.metadata = {
      entityKind: "alien",
      assetPath: ENTITY_ASSETS.alien,
    };
    return mesh;
  }

  function createBlobMesh(id) {
    const mesh = createFallbackEntityMesh("blob", `blob-${id}`);
    mesh.scaling.set(0.008, 0.008, 0.008);
    mesh.metadata = {
      entityKind: "blob",
      assetPath: ENTITY_ASSETS.blob,
    };
    return mesh;
  }

  function createPlantMesh(key) {
    const mesh = createFallbackEntityMesh("plant", `plant-${key}`);
    mesh.metadata = {
      entityKind: "plant",
      assetPath: ENTITY_ASSETS.plant,
    };
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
    mesh.metadata ??= {};
    mesh.metadata.targetPosition = { x, y: height, z: y };

    if (!mesh.metadata.hasInitialPosition) {
      mesh.position.set(x, height, y);
      mesh.metadata.hasInitialPosition = true;
    }
  }

  function snapToGrid(mesh, x, y, height = 0.5) {
    mesh.metadata ??= {};
    mesh.metadata.targetPosition = { x, y: height, z: y };
    mesh.metadata.hasInitialPosition = true;
    mesh.position.set(x, height, y);
  }

  function faceMovementDirection(mesh, previousPositions, id, x, y, rotationOffset = 0) {
    const previous = previousPositions.get(id);
    let moved = false;

    if (previous) {
      const dx = x - previous.x;
      const dz = y - previous.y;

      if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
        mesh.rotation.y = Math.atan2(dx, dz) + rotationOffset;
        moved = true;
      }
    }

    previousPositions.set(id, { x, y });
    playLoopAnimation(mesh, moved ? ["walk", "walking"] : ["idle"]);
  }

  function playEntityAction(mesh, action, entityKind) {
    if (!action || mesh.metadata?.lastActionTick === action.tick) return;
    let played = false;

    if (entityKind === "blob" && action.type === "eatPlant") {
      played = playActionAnimation(mesh, ["bitefront", "bite_front", "bite"], 650);
    } else if (entityKind === "alien" && action.type === "eatBlob") {
      played = playActionAnimation(mesh, ["punch"], 650);
    } else if (entityKind === "alien" && action.type === "eatPlant") {
      played = playActionAnimation(mesh, ["weapond", "weapon", "attack"], 700);
    }

    if (played) {
      mesh.metadata.lastActionTick = action.tick;
    }
  }

  function disposeEntityMesh(mesh, meshMap, previousPositions, id) {
    if (!mesh.metadata?.deathStarted) {
      mesh.metadata ??= {};
      mesh.metadata.deathStarted = true;
      mesh.metadata.disposeAt = performance.now() + (playDeathAnimation(mesh) ? 900 : 0);
      return;
    }

    if (performance.now() < mesh.metadata.disposeAt) return;

    mesh.dispose();
    meshMap.delete(id);
    previousPositions.delete(id);
  }

  // =========================
  // Sync Aliens
  // =========================
  function syncAliens(world) {
    // création / mise à jour
    for (const [id, alien] of world.aliens.entries()) {
      let mesh = alienMeshes.get(id);

      if (!mesh) {
        mesh = createAlienMesh(id);
        alienMeshes.set(id, mesh);
      }

      faceMovementDirection(mesh, previousAlienPositions, id, alien.x, alien.y);
      playEntityAction(mesh, alien.lastAction, "alien");
      placeOnGrid(mesh, alien.x, alien.y, 0);
    }

    // suppression
    for (const [id, mesh] of alienMeshes.entries()) {
      if (!world.aliens.has(id)) {
        disposeEntityMesh(mesh, alienMeshes, previousAlienPositions, id);
      }
    }
  }

  // =========================
  // Sync Blobs
  // =========================
  function syncBlobs(world) {
    for (const [id, blob] of world.blobs.entries()) {
      let mesh = blobMeshes.get(id);

      if (!mesh) {
        mesh = createBlobMesh(id);
        blobMeshes.set(id, mesh);
      }

      faceMovementDirection(mesh, previousBlobPositions, id, blob.x, blob.y);
      playEntityAction(mesh, blob.lastAction, "blob");
      placeOnGrid(mesh, blob.x, blob.y, 0);
    }

    for (const [id, mesh] of blobMeshes.entries()) {
      if (!world.blobs.has(id)) {
        disposeEntityMesh(mesh, blobMeshes, previousBlobPositions, id);
      }
    }
  }

  // =========================
  // Sync Plants nutritifs
  // =========================
  function syncPlants(world) {
    for (const [key, plant] of world.plants.entries()) {
      let mesh = plantMeshes.get(key);

      if (!mesh) {
        mesh = createPlantMesh(key);
        plantMeshes.set(key, mesh);
      }

      snapToGrid(mesh, plant.x, plant.y, 0);
    }

    for (const [key, mesh] of plantMeshes.entries()) {
      if (!world.plants.has(key)) {
        mesh.dispose();
        plantMeshes.delete(key);
      }
    }
  }

  // =========================
  // Jour / nuit minimal
  // =========================
  function animateExoplanetSun() {
    const t = performance.now() * 0.001;
    const pulse = 1 + Math.sin(t * 1.4) * 0.035;
    sunRoot.rotation.y = t * 0.06;
    corona.rotation.z = t * 0.18;
    halo.scaling.set(pulse, pulse, pulse);
  }

  function updateLighting(view) {
    if (view?.isNight) {
      hemiLight.intensity = 0.26;
      dirLight.intensity = 0.28;
      dirLight.diffuse = new BABYLON.Color3(0.46, 0.55, 1.0);
      sunFillLight.intensity = 0.55;
      glowLayer.intensity = 0.32;
      scene.clearColor = new BABYLON.Color4(0.025, 0.03, 0.06, 1);
      scene.fogColor = new BABYLON.Color3(0.025, 0.03, 0.06);
    } else {
      hemiLight.intensity = 0.95;
      dirLight.intensity = 1.45;
      dirLight.diffuse = new BABYLON.Color3(1.0, 0.62, 0.82);
      sunFillLight.intensity = 1.65;
      glowLayer.intensity = 0.45;
      scene.clearColor = new BABYLON.Color4(0.07, 0.075, 0.115, 1);
      scene.fogColor = new BABYLON.Color3(0.07, 0.075, 0.115);
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
  let latestViewState = null;

  function interpolateMeshPosition(mesh, deltaSeconds) {
    const target = mesh.metadata?.targetPosition;
    if (!target) return;

    const t = Math.min(1, deltaSeconds * 8);
    mesh.position.x += (target.x - mesh.position.x) * t;
    mesh.position.y += (target.y - mesh.position.y) * t;
    mesh.position.z += (target.z - mesh.position.z) * t;
  }

  function interpolateMovingEntities(deltaSeconds) {
    for (const mesh of alienMeshes.values()) {
      interpolateMeshPosition(mesh, deltaSeconds);
    }

    for (const mesh of blobMeshes.values()) {
      interpolateMeshPosition(mesh, deltaSeconds);
    }
  }

  engine.runRenderLoop(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    interpolateMovingEntities(deltaSeconds);
    updateLighting(latestViewState);
    animateExoplanetSun();
    scene.render();
  });

  function renderWorld(world, view) {
    latestViewState = view;
    syncPlants(world);
    syncAliens(world);
    syncBlobs(world);
  }

  // =========================
  // Nettoyage
  // =========================
  function dispose() {
    window.removeEventListener("resize", resize);
    engine.stopRenderLoop();

    for (const mesh of alienMeshes.values()) mesh.dispose();
    for (const mesh of blobMeshes.values()) mesh.dispose();
    for (const mesh of plantMeshes.values()) mesh.dispose();
    for (const mesh of decorationMeshes) mesh.dispose();

    alienMeshes.clear();
    blobMeshes.clear();
    plantMeshes.clear();
    previousAlienPositions.clear();
    previousBlobPositions.clear();
    decorationMeshes.length = 0;

    for (const containerPromise of assetContainerPromises.values()) {
      containerPromise.then((container) => container.dispose()).catch(() => {});
    }
    assetContainerPromises.clear();

    scene.dispose();
    engine.dispose();
  }

  return {
    renderWorld,
    resize,
    dispose,
  };
}

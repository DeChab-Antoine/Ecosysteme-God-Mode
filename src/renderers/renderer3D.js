const DECORATION_ASSETS = {
  bush: "Bush.glb",
  tree: "Tree.glb",
};

const ENTITY_ASSETS = {
  alien: "Alien.glb",
  blob: "Blob.glb",
  plant: "Plant.glb",
};

const ASSET_ROOT_URL = "../assets/";
const DEATH_ANIMATION_MS = 1800;
const CORPSE_REMAIN_MS = 2200;

// Décorations générées procéduralement (pas de tableau statique)
function generateDecorations(gW, gH) {
  // LCG pseudo-random reproductible
  let s = 0xDEAD_BEEF;
  function r() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xFFFF_FFFF;
  }
  const MARGIN = 4;
  const list = [];
  const treeCount  = Math.floor(gW * gH / 640);   // ~60 arbres sur 240×160
  const bushCount  = Math.floor(gW * gH / 380);   // ~100 buissons sur 240×160
  for (let i = 0; i < treeCount; i++) {
    list.push({ kind: "tree",  x: MARGIN + r() * (gW - MARGIN * 2), y: MARGIN + r() * (gH - MARGIN * 2), scale: 0.9 + r() * 0.6, rotation: r() * Math.PI * 2, blocks: true });
  }
  for (let i = 0; i < bushCount; i++) {
    list.push({ kind: "bush",  x: MARGIN + r() * (gW - MARGIN * 2), y: MARGIN + r() * (gH - MARGIN * 2), scale: 0.7 + r() * 0.5, rotation: r() * Math.PI * 2, blocks: false });
  }
  return list;
}

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
  hemiLight.intensity = 1.1;
  hemiLight.diffuse = new BABYLON.Color3(0.72, 0.82, 1.0);
  hemiLight.groundColor = new BABYLON.Color3(0.22, 0.16, 0.30);

  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-0.5, -1, -0.5),
    scene
  );
  dirLight.position = new BABYLON.Vector3(gridW * 0.25, 42, gridH * 0.15);
  dirLight.intensity = 1.5;
  dirLight.diffuse = new BABYLON.Color3(1.0, 0.82, 0.58);
  dirLight.specular = new BABYLON.Color3(0.6, 0.50, 0.38);

  // Initialisation temporaire de dirLight — sera mis à jour chaque frame
  const initSunPos = new BABYLON.Vector3(-gridW * 0.16, 36, -gridH * 0.18);
  dirLight.position.copyFrom(initSunPos);
  dirLight.direction = worldCenter.subtract(initSunPos).normalize();

  const glowLayer = new BABYLON.GlowLayer("exoplanetGlow", scene, {
    blurKernelSize: 48,
  });
  glowLayer.intensity = 0.45;

  // =========================
  // 3 soleils en orbite
  // =========================
  const ORBIT_RADIUS = Math.max(gridW, gridH) * 0.85;

  // Cluster circumpolaire — 3 soleils toujours au-dessus de l'horizon,
  // rotation interne lente en cercle serré.
  const T3 = (2 * Math.PI) / 3;
  const SUN_DEFS = [
    { clusterAngle: 0,
      meshColor: new BABYLON.Color3(1.0, 0.28, 0.85),
      haloColor: new BABYLON.Color3(0.38, 0.14, 0.85),
      lightColor: new BABYLON.Color3(1.0, 0.32, 0.82),
      maxIntensity: 3.5, contrib: 0.50, size: 14 },
    { clusterAngle: T3,
      meshColor: new BABYLON.Color3(0.35, 0.65, 1.0),
      haloColor: new BABYLON.Color3(0.18, 0.38, 1.0),
      lightColor: new BABYLON.Color3(0.45, 0.65, 1.0),
      maxIntensity: 2.5, contrib: 0.30, size: 10 },
    { clusterAngle: 2 * T3,
      meshColor: new BABYLON.Color3(1.0, 0.55, 0.22),
      haloColor: new BABYLON.Color3(0.8, 0.28, 0.06),
      lightColor: new BABYLON.Color3(1.0, 0.58, 0.28),
      maxIntensity: 1.8, contrib: 0.20, size: 8 },
  ];

  function buildSunMesh(def, idx) {
    const root = new BABYLON.TransformNode(`sun${idx}`, scene);

    const mat = new BABYLON.StandardMaterial(`sun${idx}Mat`, scene);
    mat.diffuseColor = def.meshColor;
    mat.emissiveColor = def.meshColor;
    mat.specularColor = BABYLON.Color3.Black();

    const sphere = BABYLON.MeshBuilder.CreateSphere(
      `sun${idx}Sphere`, { diameter: def.size, segments: 32 }, scene
    );
    sphere.parent = root;
    sphere.material = mat;
    sphere.isPickable = false;

    const haloMat = new BABYLON.StandardMaterial(`sun${idx}HaloMat`, scene);
    haloMat.diffuseColor = def.haloColor;
    haloMat.emissiveColor = def.haloColor;
    haloMat.alpha = 0.20;
    haloMat.specularColor = BABYLON.Color3.Black();
    const haloSphere = BABYLON.MeshBuilder.CreateSphere(
      `sun${idx}Halo`, { diameter: def.size * 2.2, segments: 18 }, scene
    );
    haloSphere.parent = root;
    haloSphere.material = haloMat;
    haloSphere.isPickable = false;

    const light = new BABYLON.PointLight(`sun${idx}Light`, BABYLON.Vector3.Zero(), scene);
    light.diffuse  = def.lightColor;
    light.specular = def.lightColor.scale(0.35);
    light.intensity = def.maxIntensity;
    light.range = ORBIT_RADIUS * 3.5;

    return { root, light, def };
  }

  const sunObjects = SUN_DEFS.map((def, i) => buildSunMesh(def, i));

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
  // =========================
  // Texture de sol procédurale — FBM violet + veines cyan
  // =========================
  function buildGroundTexture() {
    const SIZE = 512;
    const tex = new BABYLON.DynamicTexture(
      "groundProcTex",
      { width: SIZE, height: SIZE },
      scene, true,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE
    );

    const ctx = tex.getContext();
    const img = ctx.createImageData(SIZE, SIZE);
    const buf = img.data;

    // Interpolation lisse (Perlin-style)
    function smooth(t) { return t * t * (3 - 2 * t); }

    // Hash entier reproductible
    function h2(ix, iy) {
      let v = (Math.imul(ix, 1619) ^ Math.imul(iy, 31337)) | 0;
      v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) | 0;
      v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) | 0;
      return (v >>> 0) / 0xFFFFFFFF;
    }

    // Bruit de valeur interpolé bilinéairement
    function vnoise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = smooth(fx), uy = smooth(fy);
      const a = h2(ix,     iy),     b = h2(ix + 1, iy);
      const c = h2(ix,     iy + 1), d = h2(ix + 1, iy + 1);
      return a + ux * (b - a) + uy * ((c - a) + ux * (a - b - c + d));
    }

    // FBM (bruit fractal, 4 octaves)
    function fbm(x, y) {
      return vnoise(x,          y)          * 0.500
           + vnoise(x * 2.1,    y * 2.0)    * 0.250
           + vnoise(x * 4.3,    y * 4.1)    * 0.125
           + vnoise(x * 8.6,    y * 8.5)    * 0.0625;
    }

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        // nx/ny couvrent toute la map en une seule fois — pas de répétition, pas de raccord
        const nx = col / SIZE * 9.0;
        const ny = row / SIZE * 6.0;

        // 3 couches de bruit à échelles différentes
        const n1 = fbm(nx,               ny);               // grandes taches
        const n2 = fbm(nx * 1.8 + 3.9,   ny * 2.0 + 2.2);  // détail moyen (veines)
        const n3 = fbm(nx * 0.4 + 7.1,   ny * 0.4 + 4.8);  // larges variations douces

        // Couleur de base : combinaison des 3 couches
        const base = n1 * 0.50 + n3 * 0.33 + n2 * 0.17;

        // Veines bioluminescentes — bande plus douce (18 au lieu de 13)
        const vein = Math.max(0, 1 - Math.abs(n2 - 0.58) * 18);

        // Fissures sombres
        const crack = Math.max(0, 1 - Math.abs(n1 - 0.28) * 20);

        // Palette violette — veines moins criardes, base plus riche
        const r = Math.max(0, Math.min(255, Math.round( 32 + base * 68  + vein * 8   - crack * 15 )));
        const g = Math.max(0, Math.min(255, Math.round( 18 + base * 38  + vein * 40  - crack * 12 )));
        const b = Math.max(0, Math.min(255, Math.round( 55 + base * 95  + vein * 36  - crack * 18 )));

        const i = (row * SIZE + col) * 4;
        buf[i] = r;  buf[i + 1] = g;  buf[i + 2] = b;  buf[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
    tex.update(false);

    // uScale/vScale = 1 → texture couvre toute la map sans répétition → aucun raccord visible
    tex.uScale  = 1;
    tex.vScale  = 1;
    tex.wrapU   = BABYLON.Texture.WRAP_ADDRESSMODE;
    tex.wrapV   = BABYLON.Texture.WRAP_ADDRESSMODE;

    return tex;
  }

  const groundTex = buildGroundTexture();

  groundMat.diffuseColor   = BABYLON.Color3.White();
  groundMat.emissiveColor  = new BABYLON.Color3(0.012, 0.010, 0.022);
  groundMat.specularColor  = new BABYLON.Color3(0.06,  0.04,  0.09);
  groundMat.diffuseTexture = groundTex;
  ground.material = groundMat;
  ground.receiveShadows = true;

  // =========================
  // Bord du monde — plan vide infini (falaise dans le vide)
  // =========================
  // Plan sombre très large, légèrement en dessous du sol de jeu.
  // Combiné au fog, il donne l'effet d'une île flottant dans l'espace.
  const voidPlane = BABYLON.MeshBuilder.CreateGround("voidPlane", {
    width: gridW * 10, height: gridH * 10,
  }, scene);
  voidPlane.position.x = (gridW - 1) / 2;
  voidPlane.position.z = (gridH - 1) / 2;
  voidPlane.position.y = -0.4;
  const voidMat = new BABYLON.StandardMaterial("voidMat", scene);
  voidMat.diffuseColor  = new BABYLON.Color3(0.03, 0.02, 0.05);
  voidMat.emissiveColor = new BABYLON.Color3(0.003, 0.002, 0.006);
  voidMat.specularColor = BABYLON.Color3.Black();
  voidPlane.material = voidMat;

  const borderHeight = 0.5;
  const borderThickness = 0.2;

  // Les bordures sont purement logiques (worldOps.js contraint les entités par gridW/gridH).
  // Pas de mur visible — le plan vide + le fog créent la sensation de bord naturel.

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
    plantGlow.diffuseColor = new BABYLON.Color3(0.88, 0.58, 0.08);
    plantGlow.emissiveColor = new BABYLON.Color3(0.14, 0.08, 0.01);
    plantGlow.specularColor = new BABYLON.Color3(0.18, 0.10, 0.02);

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
    const played = playActionAnimation(mesh, ["death", "die", "dead"], DEATH_ANIMATION_MS);
    const deathGroup = findAnimationGroup(mesh, ["death", "die", "dead"]);

    if (played && deathGroup) {
      deathGroup.speedRatio = Math.max(
        0.25,
        (deathGroup.to - deathGroup.from) / (60 * (DEATH_ANIMATION_MS / 1000))
      );
    }

    return played;
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
    const decorations = generateDecorations(gridW, gridH);
    for (let i = 0; i < decorations.length; i++) {
      const decoration = decorations[i];
      const mesh = createFallbackDecorationMesh(decoration, i);

      mesh.position.x = decoration.x;
      mesh.position.z = decoration.y;
      mesh.rotation.y = decoration.rotation ?? 0;
      mesh.scaling.scaleInPlace(Math.max(decoration.scale ?? 1, 0));
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
  // Click-to-plant : callback déclenché quand le joueur clique sur le sol
  // =========================
  let groundClickCallback = null;

  scene.onPointerDown = (evt, pickResult) => {
    if (evt.button !== 0) return;
    if (!groundClickCallback) return;
    if (!pickResult.hit) return;
    // On accepte les clics proches du sol (y < 1.5) pour couvrir sol + décorations basses
    if (pickResult.pickedPoint.y > 1.5) return;

    const x = Math.round(pickResult.pickedPoint.x);
    const z = Math.round(pickResult.pickedPoint.z);
    groundClickCallback(x, z);
  };

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
        mesh.metadata ??= {};
        mesh.metadata.targetRotationY = Math.atan2(dx, dz) + rotationOffset;
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
      const deathDuration = playDeathAnimation(mesh) ? DEATH_ANIMATION_MS : 0;
      mesh.metadata.disposeAt = performance.now() + deathDuration + CORPSE_REMAIN_MS;
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

  // =========================
  // Sync Aliens
  // =========================
  function syncAliens(world) {
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
      placeOnGrid(mesh, blob.x, blob.y, 0.90);
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
  // Cycle jour / nuit — 3 soleils orbitaux
  // =========================
  let smoothAmbient = 0.75;

  function updateSunsAndLighting() {
    const dayTicks      = latestWorld?.dayTicks   ?? 100;
    const nightTicks    = latestWorld?.nightTicks  ?? 1;
    const cycleDuration = (dayTicks + nightTicks) * 100;

    // Orbite circumpolaire — un tour complet par cycle jour/nuit
    const baseAngle = (sunElapsedMs % cycleDuration) / cycleDuration * (2 * Math.PI);

    // Plan incliné fixe : élévation de 0.55 rad garantit que clusterY > 0 à tout moment
    const elevation = 0.55;
    const hC = ORBIT_RADIUS * Math.sin(elevation);   // hauteur centrale fixe
    const rH = ORBIT_RADIUS * Math.cos(elevation);   // rayon horizontal
    const rV = rH * 0.30;                             // oscillation verticale (ellipse aplatie)

    const clusterX = worldCenter.x + rH * Math.cos(baseAngle);
    const clusterY = hC + rV * Math.sin(baseAngle);
    const clusterZ = worldCenter.z + rH * Math.sin(baseAngle);

    // Rotation interne ~42 s par tour
    const CLUSTER_R   = 10;
    const internalRot = sunElapsedMs * 0.00015;

    // Visibilité oscillante (jour/nuit) — ne descend jamais à 0
    const vis = Math.max(0.15, Math.min(1, (clusterY - 20) / (rH * 0.8)));

    let totalContrib = 0;

    for (let i = 0; i < sunObjects.length; i++) {
      const sun = sunObjects[i];
      const ca  = internalRot + sun.def.clusterAngle;
      const x   = clusterX + CLUSTER_R * Math.cos(ca);
      const y   = clusterY + CLUSTER_R * 0.45 * Math.sin(ca);
      const z   = clusterZ + CLUSTER_R * 0.75 * Math.sin(ca);

      sun.root.position.set(x, y, z);
      sun.light.position.set(x, y, z);
      sun.light.intensity = sun.def.maxIntensity * vis;
      totalContrib += vis * sun.def.contrib;

      if (i === 0) {
        const dir = worldCenter.subtract(sun.root.position).normalize();
        dirLight.direction.copyFrom(dir);
        dirLight.position.copyFrom(sun.root.position);
        dirLight.intensity = 1.5 * vis;
      }
    }

    const targetAmbient = Math.max(0.22, Math.min(1.1, totalContrib * 1.7));
    smoothAmbient += (targetAmbient - smoothAmbient) * 0.028;
    hemiLight.intensity = smoothAmbient;

    const night = 1 - Math.min(1, totalContrib * 1.4);
    scene.clearColor.set(
      0.09 - night * 0.04,
      0.09 - night * 0.045,
      0.14 + night * 0.02,
      1
    );
    scene.fogColor.set(
      0.09 - night * 0.04,
      0.09 - night * 0.045,
      0.14 + night * 0.02
    );

    glowLayer.intensity = 0.28 + night * 0.30;
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
  let latestWorld     = null;
  let sunElapsedMs    = 0;   // temps de jeu écoulé (respecte pause et vitesse)

  function interpolateMeshPosition(mesh, deltaSeconds) {
    const target = mesh.metadata?.targetPosition;
    const t = Math.min(1, deltaSeconds * 8);

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
    for (const mesh of alienMeshes.values()) {
      interpolateMeshPosition(mesh, deltaSeconds);
    }

    for (const mesh of blobMeshes.values()) {
      interpolateMeshPosition(mesh, deltaSeconds);
    }
  }

  engine.runRenderLoop(() => {
    const deltaMs = engine.getDeltaTime();
    // Avance le temps de jeu uniquement si la simulation tourne
    if (latestViewState && !latestViewState.paused) {
      sunElapsedMs += deltaMs * (latestViewState.speedMultiplier ?? 1);
    }
    interpolateMovingEntities(deltaMs / 1000);
    updateSunsAndLighting();
    scene.render();
  });

  function renderWorld(world, view) {
    latestViewState = view;
    latestWorld     = world;
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
    setGroundClickCallback(fn) {
      groundClickCallback = fn;
    },
    // true  → clic gauche orbite la caméra (mode par défaut)
    // false → clic gauche libre pour le placement (caméra sur clic droit/molette)
    setCameraControl(enabled) {
      const pointers = camera.inputs.attached.pointers;
      if (pointers) {
        pointers.buttons = enabled ? [0, 1, 2] : [1, 2];
      }
    },
    getAudioVolume(worldX, worldZ, maxDist = 80) {
      const cx = camera.position.x;
      const cz = camera.position.z;
      const dist = Math.sqrt((worldX - cx) ** 2 + (worldZ - cz) ** 2);
      return Math.max(0, 1 - dist / maxDist);
    },
  };
}

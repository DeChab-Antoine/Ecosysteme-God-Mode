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
  scene.clearColor = new BABYLON.Color4(0.72, 0.72, 0.72, 1);

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
  hemiLight.intensity = 1.0;

  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-0.5, -1, -0.5),
    scene
  );
  dirLight.position = new BABYLON.Vector3(gridW * 0.5, 30, gridH * 0.5);
  dirLight.intensity = 0.6;

  // =========================
  // Sol
  // =========================
  const ground = BABYLON.MeshBuilder.CreateGround(
    "ground",
    {
      width: gridW,
      height: gridH,
      subdivisions: 1,
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
  groundMat.diffuseColor = new BABYLON.Color3(0.42, 0.42, 0.42);
  groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
  ground.material = groundMat;

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
    mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    mesh.material = mat;

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
      hemiLight.intensity = 0.22;
      dirLight.intensity = 0.12;
      scene.clearColor = new BABYLON.Color4(0.08, 0.08, 0.12, 1);
    } else {
      hemiLight.intensity = 1.0;
      dirLight.intensity = 0.6;
      scene.clearColor = new BABYLON.Color4(0.72, 0.72, 0.72, 1);
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

    humanMeshes.clear();
    pigMeshes.clear();
    carrotMeshes.clear();

    scene.dispose();
    engine.dispose();
  }

  return {
    renderWorld,
    resize,
    dispose,
  };
}
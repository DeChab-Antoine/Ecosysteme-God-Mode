// Crée le moteur BabylonJS, la scène, la caméra, les lumières, le sol et le plan vide.
// BABYLON est chargé via CDN dans index.html (variable globale).

function buildGroundTexture(scene) {
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

  function smooth(t) { return t * t * (3 - 2 * t); }

  function h2(ix, iy) {
    let v = (Math.imul(ix, 1619) ^ Math.imul(iy, 31337)) | 0;
    v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) | 0;
    v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) | 0;
    return (v >>> 0) / 0xFFFFFFFF;
  }

  function vnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = smooth(fx), uy = smooth(fy);
    const a = h2(ix,     iy),     b = h2(ix + 1, iy);
    const c = h2(ix,     iy + 1), d = h2(ix + 1, iy + 1);
    return a + ux * (b - a) + uy * ((c - a) + ux * (a - b - c + d));
  }

  // FBM 4 octaves — bruit fractal violet avec veines bioluminescentes
  function fbm(x, y) {
    return vnoise(x,       y)       * 0.500
         + vnoise(x * 2.1, y * 2.0) * 0.250
         + vnoise(x * 4.3, y * 4.1) * 0.125
         + vnoise(x * 8.6, y * 8.5) * 0.0625;
  }

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const nx = col / SIZE * 9.0;
      const ny = row / SIZE * 6.0;

      const n1 = fbm(nx,             ny);
      const n2 = fbm(nx * 1.8 + 3.9, ny * 2.0 + 2.2);
      const n3 = fbm(nx * 0.4 + 7.1, ny * 0.4 + 4.8);

      const base  = n1 * 0.50 + n3 * 0.33 + n2 * 0.17;
      const vein  = Math.max(0, 1 - Math.abs(n2 - 0.58) * 18);
      const crack = Math.max(0, 1 - Math.abs(n1 - 0.28) * 20);

      const r = Math.max(0, Math.min(255, Math.round( 32 + base * 68  + vein *  8 - crack * 15 )));
      const g = Math.max(0, Math.min(255, Math.round( 18 + base * 38  + vein * 40 - crack * 12 )));
      const b = Math.max(0, Math.min(255, Math.round( 55 + base * 95  + vein * 36 - crack * 18 )));

      const idx = (row * SIZE + col) * 4;
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  tex.update(false);
  tex.uScale = 1;
  tex.vScale = 1;
  tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  return tex;
}

export function createScene(canvas, gridW, gridH) {
  // ----- Moteur -----
  const engine = new BABYLON.Engine(canvas, true, {
    adaptToDeviceRatio: true,
    preserveDrawingBuffer: true,
    stencil: true,
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor  = new BABYLON.Color4(0.06, 0.07, 0.1, 1);
  scene.ambientColor = new BABYLON.Color3(0.15, 0.18, 0.25);
  scene.fogMode    = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0018;
  scene.fogColor   = new BABYLON.Color3(0.12, 0.13, 0.18);

  // ----- Caméra -----
  const worldCenter  = new BABYLON.Vector3((gridW - 1) / 2, 0, (gridH - 1) / 2);
  const cameraRadius = Math.max(gridW, gridH) * 0.95;

  const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, 1.05, cameraRadius, worldCenter, scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit     = 10;
  camera.upperRadiusLimit     = Math.max(gridW, gridH) * 3;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility   = 100;
  camera.lowerBetaLimit       = 0.2;
  camera.upperBetaLimit       = Math.PI / 2.1;

  // ----- Lumières -----
  const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
  hemiLight.intensity   = 1.8;
  hemiLight.diffuse     = new BABYLON.Color3(0.95, 1.0, 1.0);
  hemiLight.groundColor = new BABYLON.Color3(0.36, 0.28, 0.44);

  const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, -0.5), scene);
  dirLight.intensity = 3.4;
  dirLight.diffuse   = new BABYLON.Color3(1.0, 0.92, 0.72);
  dirLight.specular  = new BABYLON.Color3(0.95, 0.82, 0.60);

  // Position initiale — sera écrasée chaque frame par le système solaire
  const initSunPos = new BABYLON.Vector3(-gridW * 0.16, 36, -gridH * 0.18);
  dirLight.position.copyFrom(initSunPos);
  dirLight.direction = worldCenter.subtract(initSunPos).normalize();

  // ----- GlowLayer -----
  const glowLayer = new BABYLON.GlowLayer("exoplanetGlow", scene, { blurKernelSize: 48 });
  glowLayer.intensity = 0.65;

  // ----- Ombres -----
  const shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
  shadowGenerator.useBlurExponentialShadowMap = true;
  shadowGenerator.blurKernel  = 18;
  shadowGenerator.depthScale  = 80;

  // ----- Sol procédural -----
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: gridW, height: gridH, subdivisions: 32 }, scene);
  ground.position.x = (gridW - 1) / 2;
  ground.position.z = (gridH - 1) / 2;

  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor   = BABYLON.Color3.White();
  groundMat.emissiveColor  = new BABYLON.Color3(0.030, 0.026, 0.050);
  groundMat.specularColor  = new BABYLON.Color3(0.12,  0.09,  0.16);
  groundMat.diffuseTexture = buildGroundTexture(scene);
  ground.material      = groundMat;
  ground.receiveShadows = true;

  // ----- Plan vide (falaise dans l'espace) -----
  const voidPlane = BABYLON.MeshBuilder.CreateGround("voidPlane", { width: gridW * 10, height: gridH * 10 }, scene);
  voidPlane.position.x = (gridW - 1) / 2;
  voidPlane.position.z = (gridH - 1) / 2;
  voidPlane.position.y = -0.4;
  const voidMat = new BABYLON.StandardMaterial("voidMat", scene);
  voidMat.diffuseColor  = new BABYLON.Color3(0.03, 0.02, 0.05);
  voidMat.emissiveColor = new BABYLON.Color3(0.003, 0.002, 0.006);
  voidMat.specularColor = BABYLON.Color3.Black();
  voidPlane.material = voidMat;

  engine.resize();

  return { engine, scene, camera, hemiLight, dirLight, glowLayer, shadowGenerator, worldCenter };
}

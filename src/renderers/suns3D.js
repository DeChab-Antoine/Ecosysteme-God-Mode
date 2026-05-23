// Système des 3 soleils en orbite circumpolaire autour de l'exoplanète.
// Gère les meshes, les lumières ponctuelles et la mise à jour de l'éclairage global.

const T3 = (2 * Math.PI) / 3;

const SUN_DEFS = [
  { clusterAngle: 0,
    meshColor:  new BABYLON.Color3(1.0, 0.28, 0.85),
    haloColor:  new BABYLON.Color3(0.38, 0.14, 0.85),
    lightColor: new BABYLON.Color3(1.0, 0.32, 0.82),
    maxIntensity: 7.5, contrib: 0.50, size: 14 },
  { clusterAngle: T3,
    meshColor:  new BABYLON.Color3(0.35, 0.65, 1.0),
    haloColor:  new BABYLON.Color3(0.18, 0.38, 1.0),
    lightColor: new BABYLON.Color3(0.45, 0.65, 1.0),
    maxIntensity: 5.0, contrib: 0.30, size: 10 },
  { clusterAngle: 2 * T3,
    meshColor:  new BABYLON.Color3(1.0, 0.55, 0.22),
    haloColor:  new BABYLON.Color3(0.8,  0.28, 0.06),
    lightColor: new BABYLON.Color3(1.0, 0.58, 0.28),
    maxIntensity: 3.6, contrib: 0.20, size:  8 },
];

function buildSunMesh(scene, def, idx, ORBIT_RADIUS) {
  const root = new BABYLON.TransformNode(`sun${idx}`, scene);

  const mat = new BABYLON.StandardMaterial(`sun${idx}Mat`, scene);
  mat.diffuseColor  = def.meshColor;
  mat.emissiveColor = def.meshColor;
  mat.specularColor = BABYLON.Color3.Black();

  const sphere = BABYLON.MeshBuilder.CreateSphere(`sun${idx}Sphere`, { diameter: def.size, segments: 32 }, scene);
  sphere.parent    = root;
  sphere.material  = mat;
  sphere.isPickable = false;

  const haloMat = new BABYLON.StandardMaterial(`sun${idx}HaloMat`, scene);
  haloMat.diffuseColor  = def.haloColor;
  haloMat.emissiveColor = def.haloColor;
  haloMat.alpha         = 0.20;
  haloMat.specularColor = BABYLON.Color3.Black();

  const haloSphere = BABYLON.MeshBuilder.CreateSphere(`sun${idx}Halo`, { diameter: def.size * 2.2, segments: 18 }, scene);
  haloSphere.parent    = root;
  haloSphere.material  = haloMat;
  haloSphere.isPickable = false;

  const light = new BABYLON.PointLight(`sun${idx}Light`, BABYLON.Vector3.Zero(), scene);
  light.diffuse   = def.lightColor;
  light.specular  = def.lightColor.scale(0.35);
  light.intensity = def.maxIntensity;
  light.range     = ORBIT_RADIUS * 3.5;

  return { root, light, def };
}

// Crée le cluster de 3 soleils et retourne une fonction update(sunElapsedMs, latestWorld)
// appelée à chaque frame pour animer l'orbite et mettre à jour l'éclairage.
export function createSunSystem(scene, gridW, gridH, { hemiLight, dirLight, glowLayer, worldCenter }) {
  const ORBIT_RADIUS = Math.max(gridW, gridH) * 0.85;
  const sunObjects   = SUN_DEFS.map((def, i) => buildSunMesh(scene, def, i, ORBIT_RADIUS));

  let smoothAmbient = 1.35;

  function update(sunElapsedMs, latestWorld) {
    const dayTicks      = latestWorld?.dayTicks  ?? 100;
    const nightTicks    = latestWorld?.nightTicks ?? 1;
    const cycleDuration = (dayTicks + nightTicks) * 100;

    const baseAngle = (sunElapsedMs % cycleDuration) / cycleDuration * (2 * Math.PI);

    // Plan incliné : élévation 0.55 rad garantit clusterY > 0 en permanence
    const elevation = 0.55;
    const hC = ORBIT_RADIUS * Math.sin(elevation);
    const rH = ORBIT_RADIUS * Math.cos(elevation);
    const rV = rH * 0.30;

    const clusterX = worldCenter.x + rH * Math.cos(baseAngle);
    const clusterY = hC + rV * Math.sin(baseAngle);
    const clusterZ = worldCenter.z + rH * Math.sin(baseAngle);

    const CLUSTER_R   = 10;
    const internalRot = sunElapsedMs * 0.00015;

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
        dirLight.intensity = 3.4 * vis;
      }
    }

    const targetAmbient = Math.max(0.45, Math.min(2.2, totalContrib * 2.7));
    smoothAmbient += (targetAmbient - smoothAmbient) * 0.028;
    hemiLight.intensity = smoothAmbient;

    const night = 1 - Math.min(1, totalContrib * 1.4);
    scene.clearColor.set(0.16 - night * 0.09, 0.15 - night * 0.08, 0.22 - night * 0.03, 1);
    scene.fogColor.set(0.16 - night * 0.09, 0.15 - night * 0.08, 0.22 - night * 0.03);
    glowLayer.intensity = 0.40 + night * 0.35;
  }

  return { update };
}

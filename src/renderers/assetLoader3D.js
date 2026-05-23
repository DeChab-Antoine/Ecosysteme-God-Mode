// Chargement partagé des assets GLB (cache par chemin) et utilitaires d'animation.
// BABYLON est chargé via CDN dans index.html.

export const DEATH_ANIMATION_MS = 1800;
export const CORPSE_REMAIN_MS   = 2200;

const ASSET_ROOT_URL = new URL("../../assets/", import.meta.url).href;

export function createAssetLoader(scene, shadowGenerator) {
  const assetContainerPromises = new Map();

  // ----- Chargement GLB -----

  function loadAssetContainer(assetPath) {
    if (assetContainerPromises.has(assetPath)) return assetContainerPromises.get(assetPath);

    const promise = BABYLON.SceneLoader.LoadAssetContainerAsync(ASSET_ROOT_URL, assetPath, scene)
      .then((container) => {
        for (const ag of container.animationGroups) ag.stop();
        return container;
      });

    assetContainerPromises.set(assetPath, promise);
    return promise;
  }

  function createAssetInstance(container, root) {
    const instance = container.instantiateModelsToScene(
      (sourceName) => `${root.name}-${sourceName}`,
      false
    );

    for (const node of instance.rootNodes) node.parent = root;

    for (const mesh of root.getChildMeshes(false)) {
      mesh.receiveShadows = true;
      mesh.isPickable     = false;
      shadowGenerator.addShadowCaster(mesh);
    }

    for (const ag of instance.animationGroups) {
      ag.stop();
      ag.speedRatio = 1;
    }

    root.metadata ??= {};
    root.metadata.animationGroups = instance.animationGroups;
  }

  // Crée un TransformNode avec un mesh de secours immédiat, puis remplace par le GLB
  // quand il est chargé. Si le GLB échoue, le fallback reste affiché.
  function createAssetBackedMesh(name, assetPath, createFallbackMesh) {
    const root     = new BABYLON.TransformNode(name, scene);
    const fallback = createFallbackMesh(`${name}-fallback`);
    fallback.parent = root;

    if (!assetPath || !BABYLON.SceneLoader?.LoadAssetContainerAsync) return root;

    loadAssetContainer(assetPath)
      .then((container) => {
        createAssetInstance(container, root);
        fallback.dispose(false, true);
      })
      .catch((err) => console.warn(`Asset 3D introuvable : ${assetPath}`, err));

    return root;
  }

  // ----- Utilitaires d'animation -----

  function normalizeAnimationName(name) {
    return String(name ?? "").toLowerCase().replace(/[\s_-]/g, "");
  }

  function findAnimationGroup(mesh, names) {
    const groups  = mesh.metadata?.animationGroups ?? [];
    const wanted  = names.map(normalizeAnimationName);
    return groups.find((g) => {
      const gName = normalizeAnimationName(g.name);
      return wanted.some((n) => gName.includes(n));
    });
  }

  function playLoopAnimation(mesh, names) {
    if (mesh.metadata?.actionAnimationUntil && performance.now() < mesh.metadata.actionAnimationUntil) return;

    const group = findAnimationGroup(mesh, names);
    if (!group || mesh.metadata?.currentLoopAnimation === group.name) return;

    for (const ag of mesh.metadata?.animationGroups ?? []) ag.stop();
    group.reset();
    group.start(true);
    mesh.metadata.currentLoopAnimation = group.name;
  }

  function playActionAnimation(mesh, names, durationMs = 700) {
    const group = findAnimationGroup(mesh, names);
    if (!group) return false;

    for (const ag of mesh.metadata?.animationGroups ?? []) ag.stop();
    group.reset();
    group.start(false);
    mesh.metadata.currentLoopAnimation  = null;
    mesh.metadata.actionAnimationUntil = performance.now() + durationMs;
    return true;
  }

  function playDeathAnimation(mesh) {
    const played     = playActionAnimation(mesh, ["death", "die", "dead"], DEATH_ANIMATION_MS);
    const deathGroup = findAnimationGroup(mesh, ["death", "die", "dead"]);

    if (played && deathGroup) {
      deathGroup.speedRatio = Math.max(
        0.25,
        (deathGroup.to - deathGroup.from) / (60 * (DEATH_ANIMATION_MS / 1000))
      );
    }

    return played;
  }

  function dispose() {
    for (const p of assetContainerPromises.values()) {
      p.then((c) => c.dispose()).catch(() => {});
    }
    assetContainerPromises.clear();
  }

  return {
    createAssetBackedMesh,
    findAnimationGroup,
    playLoopAnimation,
    playActionAnimation,
    playDeathAnimation,
    dispose,
  };
}

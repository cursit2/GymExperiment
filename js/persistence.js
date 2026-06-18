// persistence.js — planner save/load and auto-save

const PLANNER_SCHEMA_VERSION = PlannerSchema.CURRENT_SCHEMA_VERSION;
const PLANNER_LOCAL_STORAGE_KEY = "gym-planner-state-v1";
const LAST_SERVER_SAVE_NAME_KEY = "gym-planner-last-server-save";
const CUSTOM_EQUIPMENT_LOCAL_STORAGE_KEY = "gym-planner-custom-equipment-v1";
const DEFAULT_PLANNER_KEY = "default";

// Per-map equipment/object storage. Keyed by backgroundSelect.value.
const perMapObjects = {};
let currentMapSrc = backgroundSelect?.value || null;

function captureSceneObjects() {
  const objects = [...roomCanvas.querySelectorAll(".room-object")].map((obj) => ({
    id: obj.dataset.id,
    type: obj.dataset.type,
    x: parseFloat(obj.style.left) + obj.offsetWidth / 2,
    y: parseFloat(obj.style.top) + obj.offsetHeight / 2,
    rotation: Number(obj.dataset.rotation) || 0,
  }));
  const annotations = typeof getSceneAnnotationsState === "function"
    ? getSceneAnnotationsState()
    : [];
  return { objects, annotations };
}

function saveMapObjectsForSrc(src) {
  if (!src) return;
  perMapObjects[src] = captureSceneObjects();
}

function cloneMapObjectsState(state) {
  const objects = Array.isArray(state?.objects)
    ? state.objects.map((obj) => ({
      id: obj?.id,
      type: obj?.type,
      x: Number(obj?.x) || 0,
      y: Number(obj?.y) || 0,
      rotation: Number(obj?.rotation) || 0,
    }))
    : [];
  const annotations = Array.isArray(state?.annotations)
    ? state.annotations
      .map((annotation) => {
        if (annotation?.kind === "measure") {
          return {
            id: annotation?.id,
            kind: "measure",
            x1: Number(annotation?.x1) || 0,
            y1: Number(annotation?.y1) || 0,
            x2: Number(annotation?.x2) || 0,
            y2: Number(annotation?.y2) || 0,
          };
        }
        if (annotation?.kind === "area-measure" && Array.isArray(annotation?.pts) && annotation.pts.length === 4) {
          return {
            id: annotation?.id,
            kind: "area-measure",
            pts: annotation.pts.map((p) => ({ x: Number(p?.x) || 0, y: Number(p?.y) || 0 })),
            areaName: String(annotation?.areaName || ""),
            pricePerSqm: Number.isFinite(Number(annotation?.pricePerSqm))
              ? Number(annotation?.pricePerSqm)
              : null,
            totalPrice: Number.isFinite(Number(annotation?.totalPrice))
              ? Number(annotation?.totalPrice)
              : null,
          };
        }
        return {
          id: annotation?.id,
          kind: "note",
          text: String(annotation?.text || ""),
          x: Number(annotation?.x) || 0,
          y: Number(annotation?.y) || 0,
          width: Number(annotation?.width) || 180,
          height: Number(annotation?.height) || 88,
          color: String(annotation?.color || "#fff5bf"),
        };
      })
      .filter((annotation) => (annotation.kind === "measure" || annotation.kind === "area-measure"
        ? true
        : annotation.text.length > 0))
    : [];

  return { objects, annotations };
}

function serializeCustomEquipmentState() {
  return getCustomEquipmentCatalog();
}

function saveCustomEquipmentToLocalStorage() {
  const payload = JSON.stringify(serializeCustomEquipmentState());
  localStorage.setItem(CUSTOM_EQUIPMENT_LOCAL_STORAGE_KEY, payload);
}

async function saveCustomEquipmentToServer(options = {}) {
  const silent = options.silent !== false;
  try {
    const payload = JSON.stringify(serializeCustomEquipmentState());
    localStorage.setItem(CUSTOM_EQUIPMENT_LOCAL_STORAGE_KEY, payload);
    const res = await fetch("/api/custom-equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`Custom equipment save failed (${res.status})`);
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error(error);
    }
    return false;
  }
}

function applyCustomEquipmentState(items, { replace = true } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (replace) {
    resetCustomEquipmentCatalog();
  }

  list.forEach((item) => {
    try {
      upsertCustomEquipmentItem({
        key: item.key,
        name: item.name,
        length: item.length,
        width: item.width,
        color: item.color,
      });
    } catch {
      // Skip malformed catalog entries.
    }
  });
}

async function loadCustomEquipmentFromServer() {
  try {
    const res = await fetch("/api/custom-equipment");
    if (!res.ok) return false;
    const parsed = await res.json();
    if (!Array.isArray(parsed)) return false;
    applyCustomEquipmentState(parsed, { replace: true });
    saveCustomEquipmentToLocalStorage();
    return true;
  } catch {
    return false;
  }
}

function loadCustomEquipmentFromLocalStorage() {
  const raw = localStorage.getItem(CUSTOM_EQUIPMENT_LOCAL_STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;
    applyCustomEquipmentState(parsed, { replace: true });
    return true;
  } catch {
    return false;
  }
}

async function saveCustomEquipmentCatalog(options = {}) {
  saveCustomEquipmentToLocalStorage();
  await saveCustomEquipmentToServer(options);
}

function getMapObjectUsageForType(typeKey) {
  if (!typeKey) return [];
  saveCurrentMapObjects();
  return Object.entries(perMapObjects)
    .filter(([, state]) => Array.isArray(state?.objects) && state.objects.some((obj) => obj?.type === typeKey))
    .map(([mapSrc]) => mapSrc);
}

function serializePlannerState() {
  // Always snapshot the currently selected map before saving.
  const activeSrc = backgroundSelect?.value || currentMapSrc;
  saveMapObjectsForSrc(activeSrc);
  const objects = [...roomCanvas.querySelectorAll(".room-object")].map((obj) => ({
    id: obj.dataset.id,
    type: obj.dataset.type,
    x: parseFloat(obj.style.left) + obj.offsetWidth / 2,
    y: parseFloat(obj.style.top) + obj.offsetHeight / 2,
    rotation: Number(obj.dataset.rotation) || 0,
  }));

  const activeMapState = cloneMapObjectsState(perMapObjects[activeSrc] || {
    objects,
  });
  const serializedPerMapObjects = activeSrc
    ? { [activeSrc]: activeMapState }
    : {};

  return {
    schemaVersion: PLANNER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    background: {
      src: backgroundSelect.value,
      zoom: backgroundState.zoom,
      panX: backgroundState.panX,
      panY: backgroundState.panY,
      customMap: backgroundSelect.value === CUSTOM_BACKGROUND_KEY ? customBackgroundConfig : null,
    },
    objects,
    perMapObjects: serializedPerMapObjects,
  };
}

function isValidPlannerState(state) {
  return PlannerSchema.isValidPlannerState(state);
}

function clearPlannerScene() {
  roomCanvas.querySelectorAll(".room-object, .planner-annotation").forEach((obj) => obj.remove());
  if (typeof deselectAll === "function") {
    deselectAll();
  } else {
    selectedId = null;
  }
}

function saveCurrentMapObjects() {
  if (!currentMapSrc) currentMapSrc = backgroundSelect?.value || null;
  saveMapObjectsForSrc(currentMapSrc);
}

function clearCurrentMapObjectsStore() {
  const src = currentMapSrc || backgroundSelect?.value || null;
  if (!src) return;
  perMapObjects[src] = { objects: [], annotations: [] };
}

// Save old map's objects, clear the scene, then restore objects for newSrc.
// Pass { clearStore: true } when activating a brand-new map (e.g. after "New Map"
// or Google import) so the fresh map starts empty.
function switchMapObjects(newSrc, { clearStore = false } = {}) {
  saveCurrentMapObjects();
  if (clearStore) delete perMapObjects[newSrc];

  const saved = perMapObjects[newSrc] || { objects: [], annotations: [] };

  withHistorySuppressed(() => {
    clearPlannerScene();

    saved.objects.forEach((savedObj) => {
      if (!objectCatalog[savedObj.type]) return;
      const created = createRoomObject(savedObj.type, savedObj.x, savedObj.y);
      if (!created) return;
      created.dataset.id = String(savedObj.id);
      const rotation = Number(savedObj.rotation) || 0;
      created.dataset.rotation = String(rotation);
      created.style.transform = `rotate(${rotation}deg)`;
    });

    if (typeof restoreSceneAnnotationsState === "function") {
      restoreSceneAnnotationsState(saved.annotations || []);
    }
  });

  const maxObjectId = [...roomCanvas.querySelectorAll(".room-object")]
    .reduce((max, obj) => Math.max(max, Number(obj.dataset.id) || 0), 0);
  idCounter = maxObjectId + 1;

  deselectAll();
  currentMapSrc = newSrc;
}

function applyPlannerState(rawState) {
  let state;
  try {
    state = PlannerSchema.migratePlannerState(rawState);
  } catch {
    throw new Error(t("error.invalidPlannerFileFormat"));
  }

  if (!isValidPlannerState(state)) {
    throw new Error(t("error.invalidPlannerFileFormat"));
  }

  let importedLegacyCustomEquipment = false;

  withHistorySuppressed(() => {
    clearPlannerScene();
    clearCustomMapRegistration();

    if (Array.isArray(state.customEquipment)) {
      // Backward compatibility for old planner files that embedded custom equipment.
      applyCustomEquipmentState(state.customEquipment, { replace: false });
      importedLegacyCustomEquipment = state.customEquipment.length > 0;
    }

    if (state.background.src === CUSTOM_BACKGROUND_KEY && state.background.customMap) {
      const custom = state.background.customMap;
      if (custom.sourceType === "image" && (custom.imageSource || custom.imageDataUrl)) {
        registerCustomImageMap(
          Number(custom.width),
          Number(custom.height),
          String(custom.name || "Imported Map"),
          String(custom.imageSource || custom.imageDataUrl),
          custom.mapMeta || null,
        );
      } else {
        registerCustomMap(
          Number(custom.width),
          Number(custom.height),
          String(custom.textureName || custom.colorName || "indoorGym"),
          String(custom.name || "Custom Map"),
          custom.mapMeta || null,
        );
      }
    }

    if (backgroundDimensions[state.background.src]) {
      backgroundSelect.value = state.background.src;
    }
    applyBackground(backgroundSelect.value);

    const currentSrc = backgroundSelect.value;
    const savedCurrentMapState = (state.perMapObjects && typeof state.perMapObjects === "object")
      ? state.perMapObjects[currentSrc]
      : null;
    const restoredCurrentMapState = cloneMapObjectsState(savedCurrentMapState || {
      // Old save format: use top-level arrays when per-map entry is missing.
      objects: state.objects,
      annotations: [],
    });
    perMapObjects[currentSrc] = restoredCurrentMapState;

    const { objects: objectsToRestore, annotations: annotationsToRestore } = restoredCurrentMapState;

    objectsToRestore.forEach((saved) => {
      if (!objectCatalog[saved.type]) return;
      const created = createRoomObject(saved.type, saved.x, saved.y);
      if (!created) return;
      created.dataset.id = String(saved.id);
      const rotation = Number(saved.rotation) || 0;
      created.dataset.rotation = String(rotation);
      created.style.transform = `rotate(${rotation}deg)`;
    });

    if (typeof restoreSceneAnnotationsState === "function") {
      restoreSceneAnnotationsState(annotationsToRestore);
    }
  });

  const maxObjectId = [...roomCanvas.querySelectorAll(".room-object")]
    .reduce((max, obj) => Math.max(max, Number(obj.dataset.id) || 0), 0);
  idCounter = maxObjectId + 1;

  backgroundState.zoom = clamp(state.background.zoom, 0.05, 3.0);
  backgroundState.panX = Number(state.background.panX) || 0;
  backgroundState.panY = Number(state.background.panY) || 0;
  clampBackgroundPan();
  renderBackgroundView();

  deselectAll();
  currentMapSrc = backgroundSelect.value;

  if (importedLegacyCustomEquipment) {
    // Promote legacy embedded custom equipment into the new global catalog store.
    saveCustomEquipmentToLocalStorage();
    void saveCustomEquipmentToServer({ silent: true });
  }
}

function savePlannerToLocalStorage() {
  const payload = JSON.stringify(serializePlannerState());
  localStorage.setItem(PLANNER_LOCAL_STORAGE_KEY, payload);
}

function toServerSafeSaveName(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
  return normalized || "map_default";
}

function getMapSaveRootForSrc(src) {
  const source = src || backgroundSelect?.value || currentMapSrc || "default";
  if (source === CUSTOM_BACKGROUND_KEY && customBackgroundConfig) {
    const customIdentity = customBackgroundConfig.name
      || customBackgroundConfig.imageSource
      || `${customBackgroundConfig.width}x${customBackgroundConfig.height}`;
    return `map_${toServerSafeSaveName(`${source}_${customIdentity}`)}`;
  }
  return `map_${toServerSafeSaveName(source)}`;
}

function getPlannerKeyForSaveNaming() {
  const key = window.getActivePlannerKey?.();
  return toServerSafeSaveName(key || DEFAULT_PLANNER_KEY);
}

function buildPlannerSaveName(src, plannerKey) {
  const root = getMapSaveRootForSrc(src);
  const normalizedPlannerKey = toServerSafeSaveName(plannerKey || DEFAULT_PLANNER_KEY);
  return `${root}__planner_${normalizedPlannerKey}`;
}

function getLegacyMapSaveNameForSrc(src) {
  return getMapSaveRootForSrc(src);
}

function getCurrentMapSaveName() {
  const src = backgroundSelect?.value || currentMapSrc || "default";
  const plannerKey = getPlannerKeyForSaveNaming();
  return buildPlannerSaveName(src, plannerKey);
}

function getCurrentMapLegacySaveName() {
  const src = backgroundSelect?.value || currentMapSrc || "default";
  return getLegacyMapSaveNameForSrc(src);
}

async function deletePlannerSaveFromServer(name) {
  const saveName = name || localStorage.getItem(LAST_SERVER_SAVE_NAME_KEY) || getCurrentMapSaveName();
  if (!saveName) return false;

  try {
    const res = await fetch(`/api/saves/${encodeURIComponent(saveName)}`, {
      method: "DELETE",
    });
    if (!res.ok) return false;
    if (localStorage.getItem(LAST_SERVER_SAVE_NAME_KEY) === saveName) {
      localStorage.removeItem(LAST_SERVER_SAVE_NAME_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

async function savePlannerToServer(name, options = {}) {
  const saveName = name || getCurrentMapSaveName();
  const silent = options.silent !== false;
  try {
    const payload = JSON.stringify(serializePlannerState());
    localStorage.setItem(PLANNER_LOCAL_STORAGE_KEY, payload);
    const res = await fetch(`/api/saves/${encodeURIComponent(saveName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    if (!res.ok) {
      throw new Error(`Save failed (${res.status})`);
    }

    localStorage.setItem(LAST_SERVER_SAVE_NAME_KEY, saveName);

    if (!silent) {
      setHint(t("hint.plannerSavedDisk"));
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error(error);
      setHint(t("hint.unableSaveDisk"));
    }
    return false;
  }
}

async function loadPlannerFromServer(name) {
  const preferredName = name || localStorage.getItem(LAST_SERVER_SAVE_NAME_KEY) || getCurrentMapSaveName();
  const candidates = [
    preferredName,
    getCurrentMapSaveName(),
    getCurrentMapLegacySaveName(),
    "autosave",
  ].filter((value, index, arr) => value && arr.indexOf(value) === index);

  try {
    for (const saveName of candidates) {
      const res = await fetch(`/api/saves/${encodeURIComponent(saveName)}`);
      if (!res.ok) continue;
      const parsed = await res.json();
      window.setActivePlannerKeyFromSaveName?.(saveName, parsed?.background?.src);
      applyPlannerState(parsed);
      localStorage.setItem(PLANNER_LOCAL_STORAGE_KEY, JSON.stringify(parsed));
      localStorage.setItem(LAST_SERVER_SAVE_NAME_KEY, saveName);
      clearUndoStack();
      setHint(t("hint.plannerRestoredServer"));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function loadPlannerFromLocalStorage() {
  const raw = localStorage.getItem(PLANNER_LOCAL_STORAGE_KEY);
  if (!raw) return false;
  const parsed = JSON.parse(raw);
  applyPlannerState(parsed);
  clearUndoStack();
  setHint(t("hint.plannerRestoredLocal"));
  return true;
}

function startPlannerAutosave() {
  let lastSnapshot = "";
  let serverSaveTimer = null;

  setInterval(() => {
    const snapshot = JSON.stringify(serializePlannerState());
    if (snapshot === lastSnapshot) return;
    localStorage.setItem(PLANNER_LOCAL_STORAGE_KEY, snapshot);
    lastSnapshot = snapshot;

    // Debounce server save: write to disk 3 s after the last change.
    clearTimeout(serverSaveTimer);
    serverSaveTimer = setTimeout(() => savePlannerToServer(), 3000);
  }, 800);
}

window.switchMapObjects = switchMapObjects;
window.getCurrentMapSaveName = getCurrentMapSaveName;
window.getLegacyMapSaveNameForSrc = getLegacyMapSaveNameForSrc;
window.buildPlannerSaveName = buildPlannerSaveName;
window.getMapSaveRootForSrc = getMapSaveRootForSrc;
window.deletePlannerSaveFromServer = deletePlannerSaveFromServer;
window.clearCurrentMapObjectsStore = clearCurrentMapObjectsStore;
window.saveCustomEquipmentCatalog = saveCustomEquipmentCatalog;
window.loadCustomEquipmentFromServer = loadCustomEquipmentFromServer;
window.loadCustomEquipmentFromLocalStorage = loadCustomEquipmentFromLocalStorage;
window.getMapObjectUsageForType = getMapObjectUsageForType;

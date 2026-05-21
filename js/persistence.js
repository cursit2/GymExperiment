// persistence.js — planner save/load and auto-save

const PLANNER_SCHEMA_VERSION = 1;
const PLANNER_LOCAL_STORAGE_KEY = "gym-planner-state-v1";
const LAST_SERVER_SAVE_NAME_KEY = "gym-planner-last-server-save";

// Per-map equipment/divider storage. Keyed by backgroundSelect.value.
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
  const dividersArr = dividers.map((d) => ({
    id: d.id,
    centerX: d.centerX,
    centerY: d.centerY,
    angle: d.angle,
  }));
  return { objects, dividers: dividersArr };
}

function saveMapObjectsForSrc(src) {
  if (!src) return;
  perMapObjects[src] = captureSceneObjects();
}

function serializePlannerState() {
  // Always snapshot the currently selected map before saving.
  saveMapObjectsForSrc(backgroundSelect?.value || currentMapSrc);
  const objects = [...roomCanvas.querySelectorAll(".room-object")].map((obj) => ({
    id: obj.dataset.id,
    type: obj.dataset.type,
    x: parseFloat(obj.style.left) + obj.offsetWidth / 2,
    y: parseFloat(obj.style.top) + obj.offsetHeight / 2,
    rotation: Number(obj.dataset.rotation) || 0,
  }));

  const dividerStates = dividers.map((divider) => ({
    id: divider.id,
    centerX: divider.centerX,
    centerY: divider.centerY,
    angle: divider.angle,
  }));

  return {
    schemaVersion: PLANNER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    customEquipment: getCustomEquipmentCatalog(),
    background: {
      src: backgroundSelect.value,
      zoom: backgroundState.zoom,
      panX: backgroundState.panX,
      panY: backgroundState.panY,
      customMap: backgroundSelect.value === CUSTOM_BACKGROUND_KEY ? customBackgroundConfig : null,
    },
    objects,
    dividers: dividerStates,
    perMapObjects,
  };
}

function isValidPlannerState(state) {
  return Boolean(
    state
    && typeof state === "object"
    && Number.isFinite(state.schemaVersion)
    && state.background
    && typeof state.background.src === "string"
    && Number.isFinite(state.background.zoom)
    && Number.isFinite(state.background.panX)
    && Number.isFinite(state.background.panY)
    && (!state.customEquipment || Array.isArray(state.customEquipment))
    && Array.isArray(state.objects)
    && Array.isArray(state.dividers)
  );
}

function clearPlannerScene() {
  roomCanvas.querySelectorAll(".room-object").forEach((obj) => obj.remove());
  dividers.splice(0).forEach((divider) => {
    divider.lineEl.remove();
    divider.rotateTop.remove();
    divider.rotateBottom.remove();
  });
  selectedId = null;
  selectedDividerId = null;
}

function saveCurrentMapObjects() {
  if (!currentMapSrc) currentMapSrc = backgroundSelect?.value || null;
  saveMapObjectsForSrc(currentMapSrc);
}

// Save old map's objects, clear the scene, then restore objects for newSrc.
// Pass { clearStore: true } when activating a brand-new map (e.g. after "New Map"
// or Google import) so the fresh map starts empty.
function switchMapObjects(newSrc, { clearStore = false } = {}) {
  saveCurrentMapObjects();
  if (clearStore) delete perMapObjects[newSrc];

  const saved = perMapObjects[newSrc] || { objects: [], dividers: [] };

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

    saved.dividers.forEach((savedDiv) => {
      const created = addDivider();
      if (!created) return;
      created.id = String(savedDiv.id);
      created.lineEl.dataset.dividerId = String(savedDiv.id);
      created.centerX = Number(savedDiv.centerX) || 0;
      created.centerY = Number(savedDiv.centerY) || 0;
      created.angle = Number(savedDiv.angle) || 0;
      renderDivider(created);
    });
  });

  const maxObjectId = [...roomCanvas.querySelectorAll(".room-object")]
    .reduce((max, obj) => Math.max(max, Number(obj.dataset.id) || 0), 0);
  idCounter = maxObjectId + 1;

  const maxDividerId = dividers.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0);
  dividerIdCounter = maxDividerId + 1;

  deselectAll();
  deselectDivider();
  currentMapSrc = newSrc;
}

function applyPlannerState(state) {
  if (!isValidPlannerState(state)) {
    throw new Error(t("error.invalidPlannerFileFormat"));
  }

  withHistorySuppressed(() => {
    clearPlannerScene();
    resetCustomEquipmentCatalog();
    clearCustomMapRegistration();

    if (Array.isArray(state.customEquipment)) {
      state.customEquipment.forEach((item) => {
        try {
          upsertCustomEquipmentItem({
            key: item.key,
            name: item.name,
            length: item.length,
            width: item.width,
            color: item.color,
          });
        } catch (error) {
          console.warn("Skipped invalid custom equipment item", error);
        }
      });
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
          String(custom.colorName),
          String(custom.name || "Custom Map"),
          custom.mapMeta || null,
        );
      }
    }

    if (backgroundDimensions[state.background.src]) {
      backgroundSelect.value = state.background.src;
    }
    applyBackground(backgroundSelect.value);

    // Restore per-map object store, clearing any stale in-memory state.
    Object.keys(perMapObjects).forEach((k) => delete perMapObjects[k]);
    if (state.perMapObjects && typeof state.perMapObjects === "object") {
      Object.assign(perMapObjects, state.perMapObjects);
    }
    const currentSrc = backgroundSelect.value;
    if (!perMapObjects[currentSrc]) {
      // Old save format: seed the current map's entry from the top-level arrays.
      perMapObjects[currentSrc] = { objects: state.objects, dividers: state.dividers };
    }
    const { objects: objectsToRestore, dividers: dividersToRestore } = perMapObjects[currentSrc];

    objectsToRestore.forEach((saved) => {
      if (!objectCatalog[saved.type]) return;
      const created = createRoomObject(saved.type, saved.x, saved.y);
      if (!created) return;
      created.dataset.id = String(saved.id);
      const rotation = Number(saved.rotation) || 0;
      created.dataset.rotation = String(rotation);
      created.style.transform = `rotate(${rotation}deg)`;
    });

    dividersToRestore.forEach((saved) => {
      const created = addDivider();
      if (!created) return;
      created.id = String(saved.id);
      created.lineEl.dataset.dividerId = String(saved.id);
      created.centerX = Number(saved.centerX) || 0;
      created.centerY = Number(saved.centerY) || 0;
      created.angle = Number(saved.angle) || 0;
      renderDivider(created);
    });
  });

  const maxObjectId = [...roomCanvas.querySelectorAll(".room-object")]
    .reduce((max, obj) => Math.max(max, Number(obj.dataset.id) || 0), 0);
  idCounter = maxObjectId + 1;

  const maxDividerId = dividers.reduce((max, divider) => Math.max(max, Number(divider.id) || 0), 0);
  dividerIdCounter = maxDividerId + 1;

  backgroundState.zoom = clamp(state.background.zoom, 0.05, 3.0);
  backgroundState.panX = Number(state.background.panX) || 0;
  backgroundState.panY = Number(state.background.panY) || 0;
  clampBackgroundPan();
  renderBackgroundView();

  deselectAll();
  deselectDivider();
  currentMapSrc = backgroundSelect.value;
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

function getCurrentMapSaveName() {
  const src = backgroundSelect?.value || currentMapSrc || "default";
  if (src === CUSTOM_BACKGROUND_KEY && customBackgroundConfig) {
    const customIdentity = customBackgroundConfig.name
      || customBackgroundConfig.imageSource
      || `${customBackgroundConfig.width}x${customBackgroundConfig.height}`;
    return `map_${toServerSafeSaveName(`${src}_${customIdentity}`)}`;
  }
  return `map_${toServerSafeSaveName(src)}`;
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
    "autosave",
  ].filter((value, index, arr) => value && arr.indexOf(value) === index);

  try {
    for (const saveName of candidates) {
      const res = await fetch(`/api/saves/${encodeURIComponent(saveName)}`);
      if (!res.ok) continue;
      const parsed = await res.json();
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

function savePlannerToFile() {
  const state = serializePlannerState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planner-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setHint(t("hint.plannerFileSaved"));
}

async function loadPlannerFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  applyPlannerState(parsed);
  clearUndoStack();
  savePlannerToLocalStorage();
  setHint(t("hint.plannerFileLoaded"));
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
window.deletePlannerSaveFromServer = deletePlannerSaveFromServer;

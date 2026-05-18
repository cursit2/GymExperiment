// persistence.js — planner save/load and auto-save

const PLANNER_SCHEMA_VERSION = 1;
const PLANNER_LOCAL_STORAGE_KEY = "gym-planner-state-v1";

function serializePlannerState() {
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

function applyPlannerState(state) {
  if (!isValidPlannerState(state)) {
    throw new Error("Invalid planner file format.");
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
        );
      }
    }

    if (backgroundDimensions[state.background.src]) {
      backgroundSelect.value = state.background.src;
    }
    applyBackground(backgroundSelect.value);

    state.objects.forEach((saved) => {
      if (!objectCatalog[saved.type]) return;
      const created = createRoomObject(saved.type, saved.x, saved.y);
      if (!created) return;
      created.dataset.id = String(saved.id);
      const rotation = Number(saved.rotation) || 0;
      created.dataset.rotation = String(rotation);
      created.style.transform = `rotate(${rotation}deg)`;
    });

    state.dividers.forEach((saved) => {
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
}

function savePlannerToLocalStorage() {
  const payload = JSON.stringify(serializePlannerState());
  localStorage.setItem(PLANNER_LOCAL_STORAGE_KEY, payload);
}

async function savePlannerToServer(name = 'autosave') {
  try {
    const payload = JSON.stringify(serializePlannerState());
    await fetch(`/api/saves/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
  } catch {
    // Server not available (e.g. opened directly as a file) — ignore silently.
  }
}

async function loadPlannerFromServer(name = 'autosave') {
  try {
    const res = await fetch(`/api/saves/${encodeURIComponent(name)}`);
    if (!res.ok) return false;
    const parsed = await res.json();
    applyPlannerState(parsed);
    clearUndoStack();
    setHint('Planner restored from server save.');
    return true;
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
  setHint("Planner restored from local save.");
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
  setHint("Planner file saved.");
}

async function loadPlannerFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  applyPlannerState(parsed);
  clearUndoStack();
  savePlannerToLocalStorage();
  setHint("Planner file loaded.");
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

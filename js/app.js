// app.js � event wiring and initialisation

const palette         = document.getElementById("palette");
const resetBackgroundBtn = document.getElementById("resetBackgroundBtn");
const newMapBtn      = document.getElementById("newMapBtn");
const importGoogleMapBtn = document.getElementById("importGoogleMapBtn");
const addNoteBtn = document.getElementById("addNoteBtn");
const suggestPlannerBtn = document.getElementById("suggestPlannerBtn");
const measureToolBtn = document.getElementById("measureToolBtn");
const measureAreaBtn = document.getElementById("measureAreaBtn");
const calibrateScaleBtn = document.getElementById("calibrateScaleBtn");
const toggleMouseModeBtn = document.getElementById("toggleMouseModeBtn");
const alignLeftBtn = document.getElementById("alignLeftBtn");
const alignCenterBtn = document.getElementById("alignCenterBtn");
const rotateCWBtn = document.getElementById("rotateCWBtn");
const rotateCCWBtn = document.getElementById("rotateCCWBtn");
const copySelectionBtn = document.getElementById("copySelectionBtn");
const pasteSelectionBtn = document.getElementById("pasteSelectionBtn");
const deleteBtn       = document.getElementById("deleteBtn");
const clearBtn        = document.getElementById("clearBtn");
const undoBtn         = document.getElementById("undoBtn");
const savePlannerBtn  = document.getElementById("savePlannerBtn");
const addEquipmentBtn = document.getElementById("addEquipmentBtn");
const equipmentTabBtn = document.getElementById("equipmentTabBtn");
const actionsTabBtn = document.getElementById("actionsTabBtn");
const mapTabBtn = document.getElementById("mapTabBtn");
const equipmentTabPanel = document.getElementById("equipmentTabPanel");
const actionsTabPanel = document.getElementById("actionsTabPanel");
const mapTabPanel = document.getElementById("mapTabPanel");
const newEquipmentDialog = document.getElementById("newEquipmentDialog");
const newEquipmentForm = document.getElementById("newEquipmentForm");
const newNoteDialog = document.getElementById("newNoteDialog");
const newNoteForm = document.getElementById("newNoteForm");
const newNoteTextInput = document.getElementById("newNoteTextInput");
const newNoteColorInput = document.getElementById("newNoteColorInput");
const newNoteCancelBtn = document.getElementById("newNoteCancelBtn");
const areaMeasureDialog = document.getElementById("areaMeasureDialog");
const areaMeasureForm = document.getElementById("areaMeasureForm");
const areaMeasureNameInput = document.getElementById("areaMeasureNameInput");
const areaMeasurePriceInput = document.getElementById("areaMeasurePriceInput");
const areaMeasureCancelBtn = document.getElementById("areaMeasureCancelBtn");
const suggestPlannerDialog = document.getElementById("suggestPlannerDialog");
const suggestPlannerForm = document.getElementById("suggestPlannerForm");
const suggestPlannerCancelBtn = document.getElementById("suggestPlannerCancelBtn");
const suggestBarsCountInput = document.getElementById("suggestBarsCountInput");
const suggestBeamCountInput = document.getElementById("suggestBeamCountInput");
const suggestBoxVaultCountInput = document.getElementById("suggestBoxVaultCountInput");
const suggestFloorCountInput = document.getElementById("suggestFloorCountInput");
const suggestVaultCountInput = document.getElementById("suggestVaultCountInput");
const plannerSelect = document.getElementById("plannerSelect");
const newPlannerBtn = document.getElementById("newPlannerBtn");
const deletePlannerBtn = document.getElementById("deletePlannerBtn");
const APP_DEFAULT_PLANNER_KEY = "default";
const SAVED_MAP_OPTION_PREFIX = "save:";
let measureToolActive = false;
let pendingMeasurePoint = null;
let measureAreaToolActive = false;
let pendingAreaPoints = [];
let scaleCalibrationToolActive = false;
let pendingScaleCalibrationPoint = null;
const MEASURE_PREVIEW_DOT_CLASS = "measure-preview-dot";
let copiedEquipmentSnapshot = null;
let pasteNudgeCount = 0;
let mouseInteractionMode = "drag";
let selectionBoxState = null;
let currentPlannerKey = APP_DEFAULT_PLANNER_KEY;
const plannerSelectionByMap = {};

const selectionMarqueeEl = document.createElement("div");
selectionMarqueeEl.className = "selection-marquee";
selectionMarqueeEl.hidden = true;
roomCanvas.appendChild(selectionMarqueeEl);

const SUGGEST_PLANNER_CORE_TYPES = ["bars", "beam", "boxVault", "floor", "vault"];

function syncMouseModeBtn() {
  if (!toggleMouseModeBtn) return;
  const isSelect = mouseInteractionMode === "select";
  toggleMouseModeBtn.dataset.active = String(isSelect);
  toggleMouseModeBtn.textContent = isSelect ? t("btn.mouseModeSelect") : t("btn.mouseModeDrag");
}

window.syncMouseModeBtn = syncMouseModeBtn;
window.getMouseInteractionMode = () => mouseInteractionMode;

function setMouseInteractionMode(mode) {
  const next = mode === "select" ? "select" : "drag";
  if (mouseInteractionMode === next) return;
  mouseInteractionMode = next;
  selectionBoxState = null;
  selectionMarqueeEl.hidden = true;
  syncMouseModeBtn();
  setHint(t(next === "select" ? "hint.selectModeEnabled" : "hint.dragModeEnabled"));
}

toggleMouseModeBtn?.addEventListener("click", () => {
  setMouseInteractionMode(mouseInteractionMode === "drag" ? "select" : "drag");
});

syncMouseModeBtn();

function copySelectedEquipmentToClipboard() {
  const snapshot = window.getSelectedObjectsClipboardData?.();
  if (!snapshot || !Array.isArray(snapshot.items) || snapshot.items.length === 0) {
    setHint(t("hint.nothingToCopy"));
    return false;
  }

  copiedEquipmentSnapshot = snapshot;
  pasteNudgeCount = 0;
  setHint(t("hint.copiedSelection", { count: snapshot.items.length }));
  return true;
}

function pasteCopiedEquipmentFromClipboard() {
  if (!copiedEquipmentSnapshot || !Array.isArray(copiedEquipmentSnapshot.items) || copiedEquipmentSnapshot.items.length === 0) {
    setHint(t("hint.nothingToPaste"));
    return false;
  }

  pasteNudgeCount += 1;
  const pasteOffset = 24 * pasteNudgeCount;
  const pasted = window.pasteObjectsFromClipboardData?.(copiedEquipmentSnapshot, {
    offsetX: pasteOffset,
    offsetY: pasteOffset,
  }) || [];

  if (pasted.length === 0) {
    setHint(t("hint.nothingToPaste"));
    return false;
  }

  savePlannerToLocalStorage();
  setHint(t("hint.pastedSelection", { count: pasted.length }));
  return true;
}

function setMeasureToolActive(active) {
  measureToolActive = Boolean(active);
  pendingMeasurePoint = null;
  roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="distance"]`).forEach((el) => el.remove());
  if (measureToolBtn) {
    measureToolBtn.dataset.active = String(measureToolActive);
  }
}

function setMeasureAreaToolActive(active) {
  measureAreaToolActive = Boolean(active);
  pendingAreaPoints = [];
  roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="area"]`).forEach((el) => el.remove());
  if (measureAreaBtn) {
    measureAreaBtn.dataset.active = String(measureAreaToolActive);
  }
}

function setScaleCalibrationToolActive(active) {
  scaleCalibrationToolActive = Boolean(active);
  pendingScaleCalibrationPoint = null;
  roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="calibration"]`).forEach((el) => el.remove());
  if (calibrateScaleBtn) {
    calibrateScaleBtn.dataset.active = String(scaleCalibrationToolActive);
  }
}

function addMeasurePreviewDot(point, kind) {
  const dot = document.createElement("div");
  dot.className = MEASURE_PREVIEW_DOT_CLASS;
  dot.dataset.measurePreview = kind;
  dot.style.left = `${(Number(point?.x) || 0) - 5}px`;
  dot.style.top = `${(Number(point?.y) || 0) - 5}px`;
  const previewLayer = typeof sceneEl !== "undefined" ? sceneEl : roomCanvas;
  previewLayer.appendChild(dot);
  return dot;
}

async function refreshSavedMapOptions() {
  const existingSavedOptions = [...backgroundSelect.options].filter((option) => (
    option.dataset.savedMap === "true"
    || String(option.value || "").startsWith(SAVED_MAP_OPTION_PREFIX)
  ));
  existingSavedOptions.forEach((opt) => opt.remove());

  try {
    const res = await fetch("/api/saved-maps");
    if (res.ok) {
      const savedMaps = await res.json();
      if (Array.isArray(savedMaps)) {
        const normalizeLabel = (value) => String(value || "").trim().toLowerCase();
        const existingLabels = new Set(
          [...backgroundSelect.options]
            .map((option) => normalizeLabel(option.textContent))
            .filter(Boolean),
        );

        savedMaps.forEach((item) => {
          const saveName = String(item?.saveName || "").trim();
          if (!saveName) return;

          const label = String(item?.label || saveName).trim() || saveName;
          const normalizedLabel = normalizeLabel(label);
          if (existingLabels.has(normalizedLabel)) return;

          const option = document.createElement("option");
          option.value = `${SAVED_MAP_OPTION_PREFIX}${saveName}`;
          option.textContent = label;
          option.dataset.savedMap = "true";
          option.dataset.fullLabel = label;
          backgroundSelect.appendChild(option);
          existingLabels.add(normalizedLabel);
        });
      }
    }
  } catch {
    // Keep base background options when saved-map listing is unavailable.
  }

  syncBackgroundSelectTitle();
  await refreshPlannerOptions();
}
window.refreshSavedMapOptions = refreshSavedMapOptions;

function sanitizePlannerKey(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return normalized || APP_DEFAULT_PLANNER_KEY;
}

function plannerDisplayName(key) {
  if (key === APP_DEFAULT_PLANNER_KEY) {
    return t("option.defaultPlanner");
  }
  return key.replace(/[_-]+/g, " ");
}

function setActivePlannerKey(nextKey) {
  const key = sanitizePlannerKey(nextKey);
  currentPlannerKey = key;
  const src = backgroundSelect?.value || "";
  if (src) {
    plannerSelectionByMap[src] = key;
  }
}

window.getActivePlannerKey = () => currentPlannerKey;

function derivePlannerKeyFromSaveName(saveName, src) {
  const mapRoot = window.getMapSaveRootForSrc?.(src);
  const normalizedSaveName = String(saveName || "").trim();
  if (!mapRoot || !normalizedSaveName) return APP_DEFAULT_PLANNER_KEY;
  const plannerPrefix = `${mapRoot}__planner_`;
  if (normalizedSaveName.startsWith(plannerPrefix)) {
    return sanitizePlannerKey(normalizedSaveName.slice(plannerPrefix.length));
  }
  if (normalizedSaveName === mapRoot) {
    return APP_DEFAULT_PLANNER_KEY;
  }
  return APP_DEFAULT_PLANNER_KEY;
}

window.setActivePlannerKeyFromSaveName = (saveName, src) => {
  const key = derivePlannerKeyFromSaveName(saveName, src || backgroundSelect?.value);
  const mapSrc = src || backgroundSelect?.value || "";
  currentPlannerKey = key;
  if (mapSrc) {
    plannerSelectionByMap[mapSrc] = key;
  }
  if (plannerSelect) {
    plannerSelect.value = key;
  }
};

async function refreshPlannerOptions(preferredKey = "") {
  if (!plannerSelect) return;

  const src = backgroundSelect?.value || "";
  const mapRoot = window.getMapSaveRootForSrc?.(src);
  const optionsByKey = new Map();

  const ensureOption = (key, { legacy = false } = {}) => {
    const normalized = sanitizePlannerKey(key);
    if (optionsByKey.has(normalized)) {
      const existing = optionsByKey.get(normalized);
      existing.legacy = existing.legacy && legacy;
      return;
    }
    optionsByKey.set(normalized, { key: normalized, legacy });
  };

  ensureOption(APP_DEFAULT_PLANNER_KEY);

  try {
    const res = await fetch("/api/saves");
    if (res.ok) {
      const saves = await res.json();
      if (Array.isArray(saves) && mapRoot) {
        const plannerPrefix = `${mapRoot}__planner_`;
        saves.forEach((saveNameRaw) => {
          const saveName = String(saveNameRaw || "").trim();
          if (!saveName) return;
          if (saveName === mapRoot) {
            ensureOption(APP_DEFAULT_PLANNER_KEY, { legacy: true });
            return;
          }
          if (saveName.startsWith(plannerPrefix)) {
            ensureOption(saveName.slice(plannerPrefix.length));
          }
        });
      }
    }
  } catch {
    // Keep default planner option when listing saves is unavailable.
  }

  const sortedOptions = [...optionsByKey.values()]
    .sort((a, b) => {
      if (a.key === APP_DEFAULT_PLANNER_KEY) return -1;
      if (b.key === APP_DEFAULT_PLANNER_KEY) return 1;
      return a.key.localeCompare(b.key);
    });

  plannerSelect.innerHTML = "";
  sortedOptions.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.key;
    option.textContent = plannerDisplayName(entry.key);
    plannerSelect.appendChild(option);
  });

  const desiredKey = sanitizePlannerKey(
    preferredKey
    || plannerSelectionByMap[src]
    || currentPlannerKey
    || APP_DEFAULT_PLANNER_KEY,
  );

  if (!sortedOptions.some((entry) => entry.key === desiredKey)) {
    const option = document.createElement("option");
    option.value = desiredKey;
    option.textContent = plannerDisplayName(desiredKey);
    plannerSelect.appendChild(option);
  }

  plannerSelect.value = desiredKey;
  setActivePlannerKey(desiredKey);
}
const newEquipmentNameInput = document.getElementById("newEquipmentNameInput");
const newEquipmentLengthInput = document.getElementById("newEquipmentLengthInput");
const newEquipmentWidthInput = document.getElementById("newEquipmentWidthInput");
const newEquipmentColorInput = document.getElementById("newEquipmentColorInput");
const newEquipmentCancelBtn = document.getElementById("newEquipmentCancelBtn");
const customEquipmentEditor = document.getElementById("customEquipmentEditor");
const customEquipmentSelect = document.getElementById("customEquipmentSelect");
const customEquipmentNameInput = document.getElementById("customEquipmentNameInput");
const customEquipmentLengthInput = document.getElementById("customEquipmentLengthInput");
const customEquipmentWidthInput = document.getElementById("customEquipmentWidthInput");
const customEquipmentColorEditorInput = document.getElementById("customEquipmentColorInput");
const deleteCustomEquipmentBtn = document.getElementById("deleteCustomEquipmentBtn");

function syncCustomEquipmentEditor(preferredKey = "") {
  if (!customEquipmentEditor || !customEquipmentSelect) return;

  const customItems = getCustomEquipmentCatalog();
  const hasCustom = customItems.length > 0;
  customEquipmentEditor.hidden = !hasCustom;
  customEquipmentEditor.setAttribute("aria-hidden", String(!hasCustom));

  [
    customEquipmentSelect,
    customEquipmentNameInput,
    customEquipmentLengthInput,
    customEquipmentWidthInput,
    customEquipmentColorEditorInput,
    deleteCustomEquipmentBtn,
  ].forEach((el) => {
    if (!el) return;
    el.disabled = !hasCustom;
  });

  if (!hasCustom) {
    customEquipmentSelect.innerHTML = "";
    customEquipmentNameInput.value = "";
    customEquipmentLengthInput.value = "";
    customEquipmentWidthInput.value = "";
    customEquipmentColorEditorInput.value = "#8ec2a2";
    return;
  }

  const previousSelection = preferredKey || customEquipmentSelect.value;
  customEquipmentSelect.innerHTML = "";
  customItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.key;
    option.textContent = item.name;
    customEquipmentSelect.appendChild(option);
  });

  const validSelection = customItems.some((item) => item.key === previousSelection)
    ? previousSelection
    : customItems[0].key;
  customEquipmentSelect.value = validSelection;

  const selected = customItems.find((item) => item.key === validSelection);
  customEquipmentNameInput.value = selected.name;
  customEquipmentLengthInput.value = String(selected.length);
  customEquipmentWidthInput.value = String(selected.width);
  customEquipmentColorEditorInput.value = selected.color;
}

function refreshPlacedObjectsForType(typeKey) {
  roomCanvas.querySelectorAll(`.room-object[data-type="${typeKey}"]`).forEach((obj) => {
    const template = window.objectCatalog[typeKey];
    if (!template) return;
    const rotateControls = obj.querySelector(".rotate-controls");
    obj.style.width = `${template.width}px`;
    obj.style.height = `${template.height}px`;
    obj.style.backgroundColor = template.color;
    obj.style.backgroundImage = template.image ? `url("${template.image}")` : "none";
    obj.style.backgroundSize = "cover";
    obj.style.backgroundPosition = "center";
    obj.style.backgroundRepeat = "no-repeat";
    obj.textContent = template.label;
    if (rotateControls) obj.appendChild(rotateControls);
  });
}

function activateSidebarTab(tabName) {
  const showEquipment = tabName === "equipment";
  const showActions = tabName === "actions";
  const showMap = tabName === "map";

  equipmentTabBtn.classList.toggle("active", showEquipment);
  actionsTabBtn.classList.toggle("active", showActions);
  mapTabBtn.classList.toggle("active", showMap);

  equipmentTabBtn.dataset.active = String(showEquipment);
  actionsTabBtn.dataset.active = String(showActions);
  mapTabBtn.dataset.active = String(showMap);

  equipmentTabBtn.setAttribute("aria-selected", String(showEquipment));
  actionsTabBtn.setAttribute("aria-selected", String(showActions));
  mapTabBtn.setAttribute("aria-selected", String(showMap));

  equipmentTabPanel.hidden = !showEquipment;
  actionsTabPanel.hidden = !showActions;
  mapTabPanel.hidden = !showMap;

  equipmentTabPanel.classList.toggle("active", showEquipment);
  actionsTabPanel.classList.toggle("active", showActions);
  mapTabPanel.classList.toggle("active", showMap);
}

// ---------------------------------------------------------------------------
// Palette drag-and-drop

palette.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".palette-item");
  if (!item) return;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("text/object-type", item.dataset.type);
  setHint(t("hint.dragging", { item: item.textContent }));
});

roomCanvas.addEventListener("dragover", (event) => {
  event.preventDefault();
  roomCanvas.classList.add("drag-over");
  event.dataTransfer.dropEffect = "copy";
});

roomCanvas.addEventListener("dragleave", () => {
  roomCanvas.classList.remove("drag-over");
});

roomCanvas.addEventListener("drop", (event) => {
  event.preventDefault();
  roomCanvas.classList.remove("drag-over");
  const type       = event.dataTransfer.getData("text/object-type");
  const scenePoint = clientToSceneCoords(event.clientX, event.clientY);
  createRoomObject(type, scenePoint.x, scenePoint.y);
});

// ---------------------------------------------------------------------------
// Canvas pointer events (deselect + background pan)

roomCanvas.addEventListener("pointerdown", () => {
  if (measureToolActive) return;
  if (mouseInteractionMode === "select") return;
  deselectAll();
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (mouseInteractionMode !== "select") return;
  if (measureToolActive) return;
  if (event.target.closest(".room-object, .planner-note")) return;

  const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
  if (!additiveSelection) {
    deselectAll();
  }

  const bounds = roomCanvas.getBoundingClientRect();
  selectionBoxState = {
    pointerId: event.pointerId,
    additiveSelection,
    startClientX: event.clientX,
    startClientY: event.clientY,
    latestClientX: event.clientX,
    latestClientY: event.clientY,
    startScene: clientToSceneCoords(event.clientX, event.clientY),
    latestScene: clientToSceneCoords(event.clientX, event.clientY),
    bounds,
  };

  const left = event.clientX - bounds.left;
  const top = event.clientY - bounds.top;
  selectionMarqueeEl.style.left = `${left}px`;
  selectionMarqueeEl.style.top = `${top}px`;
  selectionMarqueeEl.style.width = "0px";
  selectionMarqueeEl.style.height = "0px";
  selectionMarqueeEl.hidden = false;
  roomCanvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

roomCanvas.addEventListener("pointermove", (event) => {
  if (!selectionBoxState || selectionBoxState.pointerId !== event.pointerId) return;

  selectionBoxState.latestClientX = event.clientX;
  selectionBoxState.latestClientY = event.clientY;
  selectionBoxState.latestScene = clientToSceneCoords(event.clientX, event.clientY);

  const leftPx = Math.min(selectionBoxState.startClientX, event.clientX) - selectionBoxState.bounds.left;
  const topPx = Math.min(selectionBoxState.startClientY, event.clientY) - selectionBoxState.bounds.top;
  const widthPx = Math.abs(event.clientX - selectionBoxState.startClientX);
  const heightPx = Math.abs(event.clientY - selectionBoxState.startClientY);

  selectionMarqueeEl.style.left = `${leftPx}px`;
  selectionMarqueeEl.style.top = `${topPx}px`;
  selectionMarqueeEl.style.width = `${widthPx}px`;
  selectionMarqueeEl.style.height = `${heightPx}px`;
});

roomCanvas.addEventListener("pointerup", (event) => {
  if (!selectionBoxState || selectionBoxState.pointerId !== event.pointerId) return;
  if (roomCanvas.hasPointerCapture(event.pointerId)) {
    roomCanvas.releasePointerCapture(event.pointerId);
  }

  const draggedDistance = Math.hypot(
    selectionBoxState.latestClientX - selectionBoxState.startClientX,
    selectionBoxState.latestClientY - selectionBoxState.startClientY,
  );

  const minX = Math.min(selectionBoxState.startScene.x, selectionBoxState.latestScene.x);
  const maxX = Math.max(selectionBoxState.startScene.x, selectionBoxState.latestScene.x);
  const minY = Math.min(selectionBoxState.startScene.y, selectionBoxState.latestScene.y);
  const maxY = Math.max(selectionBoxState.startScene.y, selectionBoxState.latestScene.y);

  let selectedCount = 0;
  if (draggedDistance >= 3) {
    roomCanvas.querySelectorAll(".room-object, .planner-note").forEach((obj) => {
      const left = parseFloat(obj.style.left) || 0;
      const top = parseFloat(obj.style.top) || 0;
      const right = left + obj.offsetWidth;
      const bottom = top + obj.offsetHeight;
      const intersects = right >= minX && left <= maxX && bottom >= minY && top <= maxY;
      if (!intersects) return;
      const id = obj.dataset.id || obj.dataset.annotationId;
      if (!id) return;
      selectObject(id, { append: true });
      selectedCount += 1;
    });
  }

  selectionMarqueeEl.hidden = true;
  selectionBoxState = null;
  if (selectedCount > 0) {
    setHint(t("hint.selectionCaptured", { count: selectedCount }));
  }
});

roomCanvas.addEventListener("pointercancel", (event) => {
  if (!selectionBoxState || selectionBoxState.pointerId !== event.pointerId) return;
  selectionMarqueeEl.hidden = true;
  selectionBoxState = null;
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (!measureAreaToolActive) return;
  if (event.target.closest(".room-object, .planner-note")) return;

  const scenePoint = clientToSceneCoords(event.clientX, event.clientY);
  pendingAreaPoints.push(scenePoint);
  addMeasurePreviewDot(scenePoint, "area");
  const n = pendingAreaPoints.length;

  if (n < 4) {
    setHint(t("hint.measureAreaPoint", { n: n + 1 }));
    event.preventDefault();
    return;
  }

  // All 4 corners collected
  const pts = pendingAreaPoints.slice();
  const created = createAreaMeasurementAnnotation(pts);
  if (created) {
    pushUndo(() => {
      created.remove();
      savePlannerToLocalStorage();
      setHint(t("hint.undoAnnotationRemoved"));
    });
  }

  // Shoelace area
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  const areaSqM = (Math.abs(area) / 2 / 10000).toFixed(2);

  setMeasureAreaToolActive(false);
  savePlannerToLocalStorage();
  setHint(t("hint.measureAreaAdded", { sqm: areaSqM }));
  event.preventDefault();
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (!measureToolActive) return;
  if (event.target.closest(".room-object, .planner-note")) return;

  const scenePoint = clientToSceneCoords(event.clientX, event.clientY);
  if (!pendingMeasurePoint) {
    pendingMeasurePoint = scenePoint;
    addMeasurePreviewDot(scenePoint, "distance");
    setHint(t("hint.measureSecondPoint"));
    event.preventDefault();
    return;
  }

  const dx = scenePoint.x - pendingMeasurePoint.x;
  const dy = scenePoint.y - pendingMeasurePoint.y;
  const distanceCm = Math.sqrt((dx * dx) + (dy * dy));
  if (distanceCm < 1) {
    pendingMeasurePoint = null;
    roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="distance"]`).forEach((el) => el.remove());
    setHint(t("hint.measureTooShort"));
    event.preventDefault();
    return;
  }

  const createdMeasure = createMeasurementAnnotation(
    pendingMeasurePoint.x,
    pendingMeasurePoint.y,
    scenePoint.x,
    scenePoint.y,
  );
  if (createdMeasure) {
    pushUndo(() => {
      createdMeasure.remove();
      savePlannerToLocalStorage();
      setHint(t("hint.undoAnnotationRemoved"));
    });
  }
  pendingMeasurePoint = null;
  setMeasureToolActive(false);
  savePlannerToLocalStorage();
  setHint(t("hint.measureAdded", { meters: (distanceCm / 100).toFixed(2) }));
  event.preventDefault();
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (!scaleCalibrationToolActive) return;
  if (event.target.closest(".room-object, .planner-note")) return;

  const scenePoint = clientToSceneCoords(event.clientX, event.clientY);
  if (!pendingScaleCalibrationPoint) {
    pendingScaleCalibrationPoint = scenePoint;
    addMeasurePreviewDot(scenePoint, "calibration");
    setHint(t("hint.calibrationSecondPoint"));
    event.preventDefault();
    return;
  }

  addMeasurePreviewDot(scenePoint, "calibration");
  const dx = scenePoint.x - pendingScaleCalibrationPoint.x;
  const dy = scenePoint.y - pendingScaleCalibrationPoint.y;
  const measuredDistanceCm = Math.sqrt((dx * dx) + (dy * dy));
  if (measuredDistanceCm < 1) {
    pendingScaleCalibrationPoint = null;
    roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="calibration"]`).forEach((el) => el.remove());
    setHint(t("hint.calibrationTooShort"));
    event.preventDefault();
    return;
  }

  const promptText = t("prompt.calibrationDistanceMeters", {
    measured: (measuredDistanceCm / 100).toFixed(2),
  });
  const distanceInput = window.prompt(promptText, "");
  if (distanceInput == null) {
    setScaleCalibrationToolActive(false);
    setHint(t("hint.calibrationCanceled"));
    event.preventDefault();
    return;
  }

  const knownMeters = Number(distanceInput);
  if (!Number.isFinite(knownMeters) || knownMeters <= 0) {
    pendingScaleCalibrationPoint = null;
    roomCanvas.querySelectorAll(`.${MEASURE_PREVIEW_DOT_CLASS}[data-measure-preview="calibration"]`).forEach((el) => el.remove());
    setHint(t("hint.calibrationDistanceInvalid"));
    event.preventDefault();
    return;
  }

  const factor = (knownMeters * 100) / measuredDistanceCm;
  const result = window.applyCurrentMapScaleCalibration?.(factor);
  if (!result) {
    setScaleCalibrationToolActive(false);
    event.preventDefault();
    return;
  }

  setScaleCalibrationToolActive(false);
  savePlannerToLocalStorage();
  setHint(t("hint.calibrationApplied", {
    factor: factor.toFixed(4),
    width: result.width,
    height: result.height,
  }));
  event.preventDefault();
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (mouseInteractionMode === "select") return;
  if (measureToolActive || measureAreaToolActive || scaleCalibrationToolActive) return;
  if (!backgroundState.moveMode) return;
  if (event.target.closest(".room-object, .planner-note")) return;

  backgroundState.pointerId = event.pointerId;
  backgroundState.startX    = event.clientX;
  backgroundState.startY    = event.clientY;
  backgroundState.startPanX = backgroundState.panX;
  backgroundState.startPanY = backgroundState.panY;

  roomCanvas.classList.add("bg-moving");
  roomCanvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

roomCanvas.addEventListener("pointermove", (event) => {
  if (backgroundState.pointerId !== event.pointerId) return;
  const dx     = event.clientX - backgroundState.startX;
  const dy     = event.clientY - backgroundState.startY;
  const limits = getBackgroundPanLimits();
  backgroundState.panX = clamp(backgroundState.startPanX + dx, -limits.x, limits.x);
  backgroundState.panY = clamp(backgroundState.startPanY + dy, -limits.y, limits.y);
  renderBackgroundView();
});

roomCanvas.addEventListener("pointerup", (event) => {
  if (selectionBoxState && selectionBoxState.pointerId === event.pointerId) return;
  if (backgroundState.pointerId !== event.pointerId) return;
  backgroundState.pointerId = null;
  roomCanvas.classList.remove("bg-moving");
  if (roomCanvas.hasPointerCapture(event.pointerId)) {
    roomCanvas.releasePointerCapture(event.pointerId);
  }
});

roomCanvas.addEventListener("pointercancel", (event) => {
  if (selectionBoxState && selectionBoxState.pointerId === event.pointerId) return;
  if (backgroundState.pointerId !== event.pointerId) return;
  backgroundState.pointerId = null;
  roomCanvas.classList.remove("bg-moving");
});

// ---------------------------------------------------------------------------
// Zoom controls

roomCanvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
  setBackgroundZoom(backgroundState.zoom * factor, { x: event.clientX, y: event.clientY });
}, { passive: false });

backgroundZoom.addEventListener("input", () => {
  setBackgroundZoom(Number(backgroundZoom.value) / 100);
});

// ---------------------------------------------------------------------------
// Toolbar buttons

resetBackgroundBtn.addEventListener("click", () => {
  resetBackgroundView();
  setHint(t("hint.backgroundViewReset"));
});

newMapBtn.addEventListener("click", () => {
  activateSidebarTab("map");
  promptForNewMap();
});

importGoogleMapBtn.addEventListener("click", () => {
  activateSidebarTab("map");
  promptForGoogleMapImport();
});

addEquipmentBtn.addEventListener("click", () => {
  if (!newEquipmentDialog || !newEquipmentForm) {
    setHint(t("hint.equipmentDialogUnavailable"));
    return;
  }

  newEquipmentNameInput.value = "";
  newEquipmentLengthInput.value = "200";
  newEquipmentWidthInput.value = "120";
  newEquipmentColorInput.value = "#8ec2a2";

  const closeDialog = () => {
    newEquipmentForm.removeEventListener("submit", handleCreate);
    newEquipmentCancelBtn.removeEventListener("click", handleCancel);
    if (newEquipmentDialog.open) newEquipmentDialog.close();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const handleCreate = (event) => {
    event.preventDefault();

    try {
      const key = upsertCustomEquipmentItem({
        name: newEquipmentNameInput.value,
        length: newEquipmentLengthInput.value,
        width: newEquipmentWidthInput.value,
        color: newEquipmentColorInput.value,
      });
      syncCustomEquipmentEditor(key);
      void window.saveCustomEquipmentCatalog?.();
      savePlannerToLocalStorage();
      setHint(t("hint.addedEquipment", { name: window.objectCatalog[key].label }));
      closeDialog();
    } catch (error) {
      setHint(error?.message || t("hint.unableAddEquipment"));
    }
  };

  newEquipmentForm.addEventListener("submit", handleCreate);
  newEquipmentCancelBtn.addEventListener("click", handleCancel);
  newEquipmentDialog.showModal();
  newEquipmentNameInput.focus();
});

function openNoteDialog(options = {}) {
  if (!newNoteDialog || !newNoteForm) {
    setHint(t("hint.noteDialogUnavailable"));
    return;
  }
  if (newNoteDialog.open) return;

  const mode = options.mode === "edit" ? "edit" : "create";
  const targetNote = options.noteEl || null;
  const initialText = String(options.initialText || "");
  const initialColor = String(options.initialColor || "#fff5bf");

  newNoteTextInput.value = initialText;
  newNoteColorInput.value = initialColor;

  const closeDialog = () => {
    newNoteForm.removeEventListener("submit", handleSubmitNote);
    newNoteCancelBtn.removeEventListener("click", handleCancelNote);
    newNoteDialog.removeEventListener("close", handleDialogClose);
    if (newNoteDialog.open) newNoteDialog.close();
  };

  const handleDialogClose = () => {
    newNoteForm.removeEventListener("submit", handleSubmitNote);
    newNoteCancelBtn.removeEventListener("click", handleCancelNote);
    newNoteDialog.removeEventListener("close", handleDialogClose);
  };

  const handleCancelNote = () => {
    setHint(t("hint.noteCanceled"));
    closeDialog();
  };

  const handleSubmitNote = (event) => {
    event.preventDefault();

    const trimmed = newNoteTextInput.value.trim();
    if (!trimmed) {
      setHint(t("hint.noteEmpty"));
      return;
    }

    if (mode === "edit" && targetNote) {
      const contentEl = targetNote.querySelector(".planner-note-content");
      const previousText = targetNote.dataset.text || contentEl?.textContent || "";
      const previousColor = targetNote.dataset.color || targetNote.style.background || "#fff5bf";

      targetNote.dataset.text = trimmed;
      targetNote.dataset.color = newNoteColorInput.value;
      targetNote.style.background = newNoteColorInput.value;
      if (contentEl) {
        contentEl.textContent = trimmed;
      }

      if (trimmed !== previousText || newNoteColorInput.value !== previousColor) {
        pushUndo(() => {
          targetNote.dataset.text = previousText;
          targetNote.dataset.color = previousColor;
          targetNote.style.background = previousColor;
          if (contentEl) {
            contentEl.textContent = previousText;
          }
          savePlannerToLocalStorage();
          setHint(t("hint.undoAnnotationRemoved"));
        });
      }

      savePlannerToLocalStorage();
      setHint(t("hint.noteUpdated"));
      closeDialog();
      return;
    }

    const canvasRect = roomCanvas.getBoundingClientRect();
    const centerScene = clientToSceneCoords(
      canvasRect.left + (canvasRect.width / 2),
      canvasRect.top + (canvasRect.height / 2),
    );
    const createdNote = createNoteAnnotation(trimmed, centerScene.x, centerScene.y, {
      color: newNoteColorInput.value,
    });
    if (createdNote) {
      pushUndo(() => {
        createdNote.remove();
        savePlannerToLocalStorage();
        setHint(t("hint.undoAnnotationRemoved"));
      });
    }
    savePlannerToLocalStorage();
    setHint(t("hint.noteAdded"));
    closeDialog();
  };

  newNoteForm.addEventListener("submit", handleSubmitNote);
  newNoteCancelBtn.addEventListener("click", handleCancelNote);
  newNoteDialog.addEventListener("close", handleDialogClose);
  newNoteDialog.showModal();
  newNoteTextInput.focus();
}

window.openNoteEditorForExistingNote = (noteEl) => {
  if (!noteEl || String(noteEl.dataset.annotationType) !== "note") return;
  openNoteDialog({
    mode: "edit",
    noteEl,
    initialText: noteEl.dataset.text || "",
    initialColor: noteEl.dataset.color || "#fff5bf",
  });
};

function openAreaMeasureDetailsDialog(areaEl) {
  if (!areaEl || String(areaEl.dataset.annotationType) !== "area-measure") return;
  if (!areaMeasureDialog || !areaMeasureForm || !areaMeasureNameInput || !areaMeasurePriceInput) {
    setHint(t("hint.areaMeasureDialogUnavailable"));
    return;
  }
  if (areaMeasureDialog.open) return;

  areaMeasureNameInput.value = String(areaEl.dataset.areaName || "");
  const existingPrice = Number(areaEl.dataset.pricePerSqm);
  areaMeasurePriceInput.value = Number.isFinite(existingPrice) ? String(existingPrice) : "";

  const closeDialog = () => {
    areaMeasureForm.removeEventListener("submit", handleSubmitAreaMeasure);
    areaMeasureCancelBtn?.removeEventListener("click", handleCancelAreaMeasure);
    areaMeasureDialog.removeEventListener("close", handleDialogClose);
    if (areaMeasureDialog.open) areaMeasureDialog.close();
  };

  const handleDialogClose = () => {
    areaMeasureForm.removeEventListener("submit", handleSubmitAreaMeasure);
    areaMeasureCancelBtn?.removeEventListener("click", handleCancelAreaMeasure);
    areaMeasureDialog.removeEventListener("close", handleDialogClose);
  };

  const handleCancelAreaMeasure = () => {
    closeDialog();
  };

  const handleSubmitAreaMeasure = (event) => {
    event.preventDefault();

    const nextName = areaMeasureNameInput.value.trim();
    const priceRaw = areaMeasurePriceInput.value.trim();
    if (priceRaw && (!Number.isFinite(Number(priceRaw)) || Number(priceRaw) < 0)) {
      setHint(t("hint.areaMeasurePriceInvalid"));
      return;
    }

    const previousName = String(areaEl.dataset.areaName || "");
    const previousPriceRaw = String(areaEl.dataset.pricePerSqm || "");

    areaEl.dataset.areaName = nextName;
    if (priceRaw) {
      areaEl.dataset.pricePerSqm = String(Number(priceRaw));
    } else {
      delete areaEl.dataset.pricePerSqm;
      delete areaEl.dataset.totalPrice;
    }

    window.updateAreaMeasurementAnnotation?.(areaEl);

    if (nextName !== previousName || priceRaw !== previousPriceRaw) {
      pushUndo(() => {
        areaEl.dataset.areaName = previousName;
        if (previousPriceRaw) {
          areaEl.dataset.pricePerSqm = previousPriceRaw;
        } else {
          delete areaEl.dataset.pricePerSqm;
          delete areaEl.dataset.totalPrice;
        }
        window.updateAreaMeasurementAnnotation?.(areaEl);
        savePlannerToLocalStorage();
        setHint(t("hint.undoAnnotationRemoved"));
      });
    }

    savePlannerToLocalStorage();
    setHint(t("hint.areaMeasureDetailsUpdated"));
    closeDialog();
  };

  areaMeasureForm.addEventListener("submit", handleSubmitAreaMeasure);
  areaMeasureCancelBtn?.addEventListener("click", handleCancelAreaMeasure);
  areaMeasureDialog.addEventListener("close", handleDialogClose);
  areaMeasureDialog.showModal();
  areaMeasureNameInput.focus();
}

window.openAreaMeasureDetailsDialog = openAreaMeasureDetailsDialog;

addNoteBtn?.addEventListener("click", () => {
  openNoteDialog({
    mode: "create",
    initialText: "",
    initialColor: "#fff5bf",
  });
});

function parseSuggestPlannerCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(30, Math.floor(n));
}

function buildSuggestPlannerClusters(counts) {
  const clusters = [];
  SUGGEST_PLANNER_CORE_TYPES.forEach((type) => {
    const count = parseSuggestPlannerCount(counts[type]);
    for (let i = 0; i < count; i += 1) {
      if (type === "vault" || type === "boxVault") {
        clusters.push(["springboard", type, "mat"]);
      } else {
        clusters.push([type, "mat"]);
      }
    }
  });
  return clusters;
}

function getSuggestAdjacentGap(leftType, rightType) {
  if (!leftType || !rightType) return 40;

  const springToVault = leftType === "springboard" && (rightType === "vault" || rightType === "boxVault");
  const vaultToMat = (leftType === "vault" || leftType === "boxVault") && rightType === "mat";
  const equipmentToMat = rightType === "mat" && leftType !== "mat";
  if (springToVault || vaultToMat || equipmentToMat) {
    return 24;
  }

  return 40;
}

function getSuggestClusterSize(types, horizontal) {
  const dims = types
    .map((type) => window.objectCatalog[type])
    .filter(Boolean)
    .map((item) => ({ width: Number(item.width) || 0, height: Number(item.height) || 0 }));
  if (dims.length === 0) return { width: 0, height: 0 };

  let totalGap = 0;
  for (let i = 0; i < types.length - 1; i += 1) {
    totalGap += getSuggestAdjacentGap(types[i], types[i + 1]);
  }

  if (horizontal) {
    const width = dims.reduce((sum, item) => sum + item.width, 0) + totalGap;
    const height = dims.reduce((max, item) => Math.max(max, item.height), 0);
    return { width, height };
  }

  const width = dims.reduce((max, item) => Math.max(max, item.width), 0);
  const height = dims.reduce((sum, item) => sum + item.height, 0) + totalGap;
  return { width, height };
}

function placeSuggestCluster(types, horizontal, startX, startY) {
  const size = getSuggestClusterSize(types, horizontal);
  if (size.width <= 0 || size.height <= 0) return 0;

  let cursorX = startX;
  let cursorY = startY;
  let placed = 0;

  types.forEach((type, index) => {
    const item = window.objectCatalog[type];
    if (!item) return;

    let left;
    let top;
    if (horizontal) {
      left = cursorX;
      top = startY + ((size.height - item.height) / 2);
      const nextType = types[index + 1];
      cursorX += item.width + (nextType ? getSuggestAdjacentGap(type, nextType) : 0);
    } else {
      left = startX + ((size.width - item.width) / 2);
      top = cursorY;
      const nextType = types[index + 1];
      cursorY += item.height + (nextType ? getSuggestAdjacentGap(type, nextType) : 0);
    }

    createRoomObject(type, left + (item.width / 2), top + (item.height / 2));
    placed += 1;
  });

  return placed;
}

function applySuggestedPlanner(counts) {
  const clusters = buildSuggestPlannerClusters(counts);
  if (clusters.length === 0) {
    setHint(t("hint.suggestPlannerNoItems"));
    return;
  }

  const mapDims = backgroundDimensions[backgroundSelect.value] || { width: 4000, height: 7000 };
  const margin = 160;
  const clusterGap = 190;
  const rowGap = 240;

  const leftBound = (-mapDims.width / 2) + margin;
  const rightBound = (mapDims.width / 2) - margin;
  const topBound = (-mapDims.height / 2) + margin;
  const bottomBound = (mapDims.height / 2) - margin;
  const availableWidth = Math.max(600, rightBound - leftBound);

  roomCanvas.querySelectorAll(".room-object, .planner-annotation").forEach((obj) => obj.remove());
  deselectAll();
  setMeasureToolActive(false);
  window.clearCurrentMapObjectsStore?.();

  const summary = { placedClusters: 0, skippedClusters: 0 };
  const randomizedClusters = [...clusters].sort(() => Math.random() - 0.5);

  const placeAll = () => {
    let cursorX = leftBound;
    let cursorY = topBound;
    let rowHeight = 0;

    randomizedClusters.forEach((types) => {
      const horizontalSize = getSuggestClusterSize(types, true);
      const verticalSize = getSuggestClusterSize(types, false);
      const canHorizontal = horizontalSize.width <= availableWidth;
      const canVertical = verticalSize.width <= availableWidth;

      let useHorizontal;
      if (canHorizontal && canVertical) {
        useHorizontal = Math.random() >= 0.4;
      } else if (canHorizontal) {
        useHorizontal = true;
      } else if (canVertical) {
        useHorizontal = false;
      } else {
        summary.skippedClusters += 1;
        return;
      }

      const activeSize = useHorizontal ? horizontalSize : verticalSize;

      if (cursorX > leftBound && Math.random() < 0.18) {
        cursorX = leftBound;
        cursorY += rowHeight + rowGap;
        rowHeight = 0;
      }

      if (cursorX > leftBound && (cursorX + activeSize.width) > (leftBound + availableWidth)) {
        cursorX = leftBound;
        cursorY += rowHeight + rowGap;
        rowHeight = 0;
      }

      const placeX = cursorX;
      const placeY = cursorY;

      if ((placeY + activeSize.height) > bottomBound) {
        summary.skippedClusters += 1;
        return;
      }

      placeSuggestCluster(types, useHorizontal, placeX, placeY);
      summary.placedClusters += 1;
      cursorX += activeSize.width + clusterGap;
      rowHeight = Math.max(rowHeight, activeSize.height);
    });
  };

  if (typeof withHistorySuppressed === "function") {
    withHistorySuppressed(placeAll);
  } else {
    placeAll();
  }
  savePlannerToLocalStorage();

  if (summary.skippedClusters > 0) {
    setHint(t("hint.suggestPlannerAppliedPartial", {
      placed: summary.placedClusters,
      skipped: summary.skippedClusters,
    }));
    return;
  }

  setHint(t("hint.suggestPlannerApplied", { placed: summary.placedClusters }));
}

function openSuggestPlannerDialog() {
  if (!suggestPlannerDialog || !suggestPlannerForm) {
    setHint(t("hint.suggestPlannerDialogUnavailable"));
    return;
  }
  if (suggestPlannerDialog.open) return;

  [
    suggestBarsCountInput,
    suggestBeamCountInput,
    suggestBoxVaultCountInput,
    suggestFloorCountInput,
    suggestVaultCountInput,
  ].forEach((input) => {
    if (input) input.value = "0";
  });

  const closeDialog = () => {
    suggestPlannerForm.removeEventListener("submit", handleSubmitSuggestPlanner);
    suggestPlannerCancelBtn.removeEventListener("click", handleCancelSuggestPlanner);
    suggestPlannerDialog.removeEventListener("close", handleSuggestPlannerClose);
    if (suggestPlannerDialog.open) suggestPlannerDialog.close();
  };

  const handleSuggestPlannerClose = () => {
    suggestPlannerForm.removeEventListener("submit", handleSubmitSuggestPlanner);
    suggestPlannerCancelBtn.removeEventListener("click", handleCancelSuggestPlanner);
    suggestPlannerDialog.removeEventListener("close", handleSuggestPlannerClose);
  };

  const handleCancelSuggestPlanner = () => {
    closeDialog();
  };

  const handleSubmitSuggestPlanner = (event) => {
    event.preventDefault();

    applySuggestedPlanner({
      bars: suggestBarsCountInput?.value,
      beam: suggestBeamCountInput?.value,
      boxVault: suggestBoxVaultCountInput?.value,
      floor: suggestFloorCountInput?.value,
      vault: suggestVaultCountInput?.value,
    });

    closeDialog();
  };

  suggestPlannerForm.addEventListener("submit", handleSubmitSuggestPlanner);
  suggestPlannerCancelBtn.addEventListener("click", handleCancelSuggestPlanner);
  suggestPlannerDialog.addEventListener("close", handleSuggestPlannerClose);
  suggestPlannerDialog.showModal();
  suggestBarsCountInput?.focus();
}

suggestPlannerBtn?.addEventListener("click", () => {
  openSuggestPlannerDialog();
});

measureToolBtn?.addEventListener("click", () => {
  if (measureToolActive) {
    setMeasureToolActive(false);
    setHint(t("hint.measureToolDisabled"));
    return;
  }
  setMeasureAreaToolActive(false);
  setScaleCalibrationToolActive(false);
  setMeasureToolActive(true);
  setHint(t("hint.measureFirstPoint"));
});

measureAreaBtn?.addEventListener("click", () => {
  if (measureAreaToolActive) {
    setMeasureAreaToolActive(false);
    setHint(t("hint.measureAreaToolDisabled"));
    return;
  }
  setMeasureToolActive(false);
  setScaleCalibrationToolActive(false);
  setMeasureAreaToolActive(true);
  setHint(t("hint.measureAreaPoint", { n: 1 }));
});

calibrateScaleBtn?.addEventListener("click", () => {
  if (scaleCalibrationToolActive) {
    setScaleCalibrationToolActive(false);
    setHint(t("hint.calibrationToolDisabled"));
    return;
  }
  setMeasureToolActive(false);
  setMeasureAreaToolActive(false);
  setScaleCalibrationToolActive(true);
  setHint(t("hint.calibrationFirstPoint"));
});

alignLeftBtn?.addEventListener("click", () => {
  const aligned = window.alignSelectedObjects?.("left");
  if (!aligned) {
    setHint(t("hint.selectAtLeastTwoAlign"));
    return;
  }
  savePlannerToLocalStorage();
  setHint(t("hint.alignedLeft"));
});

alignCenterBtn?.addEventListener("click", () => {
  const aligned = window.alignSelectedObjects?.("center");
  if (!aligned) {
    setHint(t("hint.selectAtLeastTwoAlign"));
    return;
  }
  savePlannerToLocalStorage();
  setHint(t("hint.alignedCenter"));
});

rotateCWBtn?.addEventListener("click", () => {
  const rotated = window.rotateSelectedObjectsAroundGroupCenter?.(90);
  if (!rotated) {
    setHint(t("hint.selectAtLeastOneRotate"));
    return;
  }
  savePlannerToLocalStorage();
  setHint(t("hint.rotatedCW"));
});

rotateCCWBtn?.addEventListener("click", () => {
  const rotated = window.rotateSelectedObjectsAroundGroupCenter?.(-90);
  if (!rotated) {
    setHint(t("hint.selectAtLeastOneRotate"));
    return;
  }
  savePlannerToLocalStorage();
  setHint(t("hint.rotatedCCW"));
});

copySelectionBtn?.addEventListener("click", () => {
  copySelectedEquipmentToClipboard();
});

pasteSelectionBtn?.addEventListener("click", () => {
  pasteCopiedEquipmentFromClipboard();
});

equipmentTabBtn.addEventListener("click", () => {
  activateSidebarTab("equipment");
});

actionsTabBtn.addEventListener("click", () => {
  activateSidebarTab("actions");
});

mapTabBtn.addEventListener("click", () => {
  activateSidebarTab("map");
});

plannerSelect?.addEventListener("change", async () => {
  const nextKey = sanitizePlannerKey(plannerSelect.value);
  setActivePlannerKey(nextKey);

  const saveName = window.buildPlannerSaveName?.(backgroundSelect.value, nextKey)
    || window.getCurrentMapSaveName?.();
  const restored = await loadPlannerFromServer(saveName);
  if (!restored) {
    switchMapObjects(backgroundSelect.value, { clearStore: true });
    savePlannerToLocalStorage();
    setHint(t("hint.newPlannerBlankLoaded", { planner: plannerDisplayName(nextKey) }));
  }
  await refreshPlannerOptions(nextKey);
});

newPlannerBtn?.addEventListener("click", async () => {
  const input = window.prompt(t("prompt.newPlannerName"), "");
  if (input == null) return;

  const nextKey = sanitizePlannerKey(input);
  setActivePlannerKey(nextKey);
  if (plannerSelect) {
    const exists = [...plannerSelect.options].some((option) => option.value === nextKey);
    if (!exists) {
      const option = document.createElement("option");
      option.value = nextKey;
      option.textContent = plannerDisplayName(nextKey);
      plannerSelect.appendChild(option);
    }
    plannerSelect.value = nextKey;
  }

  switchMapObjects(backgroundSelect.value, { clearStore: true });
  savePlannerToLocalStorage();
  await savePlannerToServer(undefined, { silent: true });
  await refreshPlannerOptions(nextKey);
  setHint(t("hint.newPlannerCreated", { planner: plannerDisplayName(nextKey) }));
});

deletePlannerBtn?.addEventListener("click", async () => {
  const src = backgroundSelect?.value || "";
  const plannerKey = sanitizePlannerKey(plannerSelect?.value || currentPlannerKey);
  const plannerName = plannerDisplayName(plannerKey);
  const confirmed = window.confirm(t("confirm.deletePlanner", { planner: plannerName }));
  if (!confirmed) {
    setHint(t("hint.plannerDeleteCanceled"));
    return;
  }

  const primarySaveName = window.buildPlannerSaveName?.(src, plannerKey);
  const saveNamesToDelete = [primarySaveName].filter(Boolean);
  if (plannerKey === APP_DEFAULT_PLANNER_KEY) {
    const legacySaveName = window.getLegacyMapSaveNameForSrc?.(src);
    if (legacySaveName && !saveNamesToDelete.includes(legacySaveName)) {
      saveNamesToDelete.push(legacySaveName);
    }
  }

  let deletedAny = false;
  for (const saveName of saveNamesToDelete) {
    const deleted = await window.deletePlannerSaveFromServer?.(saveName);
    deletedAny = deletedAny || Boolean(deleted);
  }

  if (!deletedAny) {
    setHint(t("hint.unableDeletePlanner"));
    return;
  }

  await refreshPlannerOptions(APP_DEFAULT_PLANNER_KEY);
  const fallbackPlanner = sanitizePlannerKey(plannerSelect?.value || APP_DEFAULT_PLANNER_KEY);
  setActivePlannerKey(fallbackPlanner);
  if (plannerSelect) {
    plannerSelect.value = fallbackPlanner;
  }

  const fallbackSaveName = window.buildPlannerSaveName?.(src, fallbackPlanner)
    || window.getCurrentMapSaveName?.();
  const restored = await loadPlannerFromServer(fallbackSaveName);
  if (!restored) {
    switchMapObjects(src, { clearStore: true });
    savePlannerToLocalStorage();
  }

  setHint(t("hint.plannerDeleted", { planner: plannerName }));
});

customEquipmentSelect?.addEventListener("change", () => {
  syncCustomEquipmentEditor(customEquipmentSelect.value);
});

const handleCustomEquipmentEdit = () => {
  const key = customEquipmentSelect?.value;
  if (!key) return;
  try {
    updateCustomEquipmentItem(key, {
      name: customEquipmentNameInput.value,
      length: customEquipmentLengthInput.value,
      width: customEquipmentWidthInput.value,
      color: customEquipmentColorEditorInput.value,
    });
    refreshPlacedObjectsForType(key);
    syncCustomEquipmentEditor(key);
    void window.saveCustomEquipmentCatalog?.();
    savePlannerToLocalStorage();
    setHint(t("hint.customEquipmentUpdated"));
  } catch (error) {
    setHint(error?.message || t("hint.unableUpdateCustomEquipment"));
    syncCustomEquipmentEditor(key);
  }
};

customEquipmentNameInput?.addEventListener("change", handleCustomEquipmentEdit);
customEquipmentLengthInput?.addEventListener("change", handleCustomEquipmentEdit);
customEquipmentWidthInput?.addEventListener("change", handleCustomEquipmentEdit);
customEquipmentColorEditorInput?.addEventListener("change", handleCustomEquipmentEdit);

deleteCustomEquipmentBtn?.addEventListener("click", () => {
  const key = customEquipmentSelect?.value;
  if (!key) {
    setHint(t("hint.selectCustomEquipmentDelete"));
    return;
  }

  const customName = window.objectCatalog[key]?.label || t("label.item");
  const confirmed = window.confirm(t("confirm.deleteCustomEquipment", { name: customName }));
  if (!confirmed) {
    setHint(t("hint.customEquipmentDeleteCanceled"));
    return;
  }

  try {
    const usageMaps = window.getMapObjectUsageForType?.(key) || [];
    if (usageMaps.length > 0) {
      setHint(t("hint.customEquipmentInUseCannotDelete", { count: usageMaps.length }));
      return;
    }

    roomCanvas.querySelectorAll(`.room-object[data-type="${key}"]`).forEach((obj) => obj.remove());
    if (selectedId && !objectById(selectedId)) {
      selectedId = null;
      deselectAll();
    }
    deleteCustomEquipmentItem(key);
    syncCustomEquipmentEditor();
    void window.saveCustomEquipmentCatalog?.();
    savePlannerToLocalStorage();
    setHint(t("hint.customEquipmentDeleted"));
  } catch (error) {
    setHint(error?.message || t("hint.unableDeleteCustomEquipment"));
  }
});

deleteBtn.addEventListener("click", () => {
  const deleted = window.deleteSelectedObjects?.();
  if (deleted) {
    savePlannerToLocalStorage();
    setHint(t("hint.objectRemoved"));
    return;
  }
  setHint(t("hint.selectObjectDelete"));
});

clearBtn.addEventListener("click", () => {
  const savedObjects = window.getAllSceneItems?.() || [];
  pushUndo(() => {
    savedObjects.forEach((obj) => sceneEl.appendChild(obj));
    selectedId = null;
    setHint(t("hint.undoRoomRestored"));
  });
  savedObjects.forEach((obj) => obj.remove());
  selectedId = null;
  setMeasureToolActive(false);
  window.clearCurrentMapObjectsStore?.();
  savePlannerToLocalStorage();
  setHint(t("hint.roomCleared"));
});

// ---------------------------------------------------------------------------
// Resize

window.addEventListener("resize", () => {
  clampBackgroundPan();
  renderBackgroundView();
});

// ---------------------------------------------------------------------------
// Background selector

backgroundSelect.addEventListener("change", async () => {
  setMeasureToolActive(false);
  const newSrc = backgroundSelect.value;

  if (newSrc.startsWith(SAVED_MAP_OPTION_PREFIX)) {
    const saveName = newSrc.slice(SAVED_MAP_OPTION_PREFIX.length);
    const restored = await loadPlannerFromServer(saveName);
    if (restored) {
      syncCustomMapEditor();
      await refreshSavedMapOptions();
    }
    return;
  }

  switchMapObjects(newSrc);
  applyBackground(newSrc);
  backgroundState.zoom = getFitZoom();
  backgroundState.panX = 0;
  backgroundState.panY = 0;
  clampBackgroundPan();
  renderBackgroundView();
  syncCustomMapEditor();
  await refreshPlannerOptions(plannerSelectionByMap[newSrc] || APP_DEFAULT_PLANNER_KEY);
  const saveName = window.buildPlannerSaveName?.(newSrc, plannerSelectionByMap[newSrc] || APP_DEFAULT_PLANNER_KEY);
  const restored = await loadPlannerFromServer(saveName);
  if (!restored) {
    switchMapObjects(newSrc, { clearStore: true });
  }
  await refreshSavedMapOptions();
  setHint(t("hint.backgroundUpdated"));
});

// Initialise
// ---------------------------------------------------------------------------
// Undo button and keyboard hotkeys

undoBtn.addEventListener("click", () => performUndo());

savePlannerBtn.addEventListener("click", async () => {
  savePlannerToLocalStorage();
  await savePlannerToServer(undefined, { silent: false });
  await refreshSavedMapOptions();
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select, textarea")) return;
  const isCopyModifier = event.ctrlKey || event.metaKey;
  const key = String(event.key || "").toLowerCase();

  if (isCopyModifier && key === "c") {
    event.preventDefault();
    copySelectedEquipmentToClipboard();
    return;
  }

  if (isCopyModifier && key === "v") {
    event.preventDefault();
    pasteCopiedEquipmentFromClipboard();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    deleteBtn.click();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "z") {
    event.preventDefault();
    performUndo();
  }
});


// Try server save first (shared persistent storage), fall back to localStorage.
(async () => {
  try {
    let restoredCustomEquipment = await window.loadCustomEquipmentFromServer?.();
    if (!restoredCustomEquipment) {
      restoredCustomEquipment = window.loadCustomEquipmentFromLocalStorage?.();
    }

    let restored = await loadPlannerFromServer();
    if (!restored) restored = loadPlannerFromLocalStorage();
    syncCustomEquipmentEditor();
    await refreshSavedMapOptions();
    if (!restored) {
      applyBackground(backgroundSelect.value);
      backgroundState.zoom = getFitZoom();
      renderBackgroundView();
    }
  } catch (error) {
    console.error(error);
    await refreshSavedMapOptions();
    applyBackground(backgroundSelect.value);
    backgroundState.zoom = getFitZoom();
    renderBackgroundView();
  }

  activateSidebarTab("equipment");
  startPlannerAutosave();
})();

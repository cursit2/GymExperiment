// app.js � event wiring and initialisation

const palette         = document.getElementById("palette");
const resetBackgroundBtn = document.getElementById("resetBackgroundBtn");
const newMapBtn      = document.getElementById("newMapBtn");
const importGoogleMapBtn = document.getElementById("importGoogleMapBtn");
const dividerBtn      = document.getElementById("dividerBtn");
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
const SAVED_MAP_OPTION_PREFIX = "save:";

async function refreshSavedMapOptions() {
  const existingSavedOptions = [...backgroundSelect.options].filter((option) => (
    option.dataset.savedMap === "true"
    || String(option.value || "").startsWith(SAVED_MAP_OPTION_PREFIX)
  ));
  existingSavedOptions.forEach((opt) => opt.remove());

  try {
    const res = await fetch("/api/saved-maps");
    if (!res.ok) return;
    const savedMaps = await res.json();
    if (!Array.isArray(savedMaps)) return;

    const normalizeLabel = (value) => String(value || "").trim().toLowerCase();
    const existingOptionLabels = [...backgroundSelect.options]
      .map((option) => normalizeLabel(option.textContent))
      .filter(Boolean);
    const existingLabels = new Set(existingOptionLabels);
    const existingSources = new Set(
      [...backgroundSelect.options]
        .filter((option) => option.dataset.savedMap !== "true")
        .map((option) => String(option.value || "").trim())
        .filter(Boolean),
    );

    savedMaps.forEach((item) => {
      const saveName = String(item?.saveName || "").trim();
      if (!saveName) return;
      const src = String(item?.src || "").trim();
      if (src && src !== CUSTOM_BACKGROUND_KEY && existingSources.has(src)) return;
      const label = String(item?.label || saveName).trim();
      const normalizedLabel = normalizeLabel(label);
      const collidesWithExisting = existingOptionLabels.some((existing) => (
        existing === normalizedLabel
        || existing.startsWith(`${normalizedLabel} (`)
      ));
      if (collidesWithExisting || existingLabels.has(normalizedLabel)) return;

      const option = document.createElement("option");
      option.value = `${SAVED_MAP_OPTION_PREFIX}${saveName}`;
      option.textContent = label;
      option.dataset.savedMap = "true";
      option.dataset.fullLabel = option.textContent;
      backgroundSelect.appendChild(option);
      existingLabels.add(normalizedLabel);
    });

    syncBackgroundSelectTitle();
  } catch {
    // Keep normal background options when saved-map list is unavailable.
  }
}
window.refreshSavedMapOptions = refreshSavedMapOptions;
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
  deselectAll();
  deselectDivider();
});

roomCanvas.addEventListener("pointerdown", (event) => {
  if (!backgroundState.moveMode) return;
  if (
    event.target.closest(".room-object") ||
    event.target.closest(".room-divider") ||
    event.target.closest(".divider-rotate-anchor")
  ) return;

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
  if (backgroundState.pointerId !== event.pointerId) return;
  backgroundState.pointerId = null;
  roomCanvas.classList.remove("bg-moving");
  if (roomCanvas.hasPointerCapture(event.pointerId)) {
    roomCanvas.releasePointerCapture(event.pointerId);
  }
});

roomCanvas.addEventListener("pointercancel", (event) => {
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

equipmentTabBtn.addEventListener("click", () => {
  activateSidebarTab("equipment");
});

actionsTabBtn.addEventListener("click", () => {
  activateSidebarTab("actions");
});

mapTabBtn.addEventListener("click", () => {
  activateSidebarTab("map");
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
    roomCanvas.querySelectorAll(`.room-object[data-type="${key}"]`).forEach((obj) => obj.remove());
    if (selectedId && !objectById(selectedId)) {
      selectedId = null;
      deselectAll();
    }
    deleteCustomEquipmentItem(key);
    syncCustomEquipmentEditor();
    savePlannerToLocalStorage();
    setHint(t("hint.customEquipmentDeleted"));
  } catch (error) {
    setHint(error?.message || t("hint.unableDeleteCustomEquipment"));
  }
});

dividerBtn?.addEventListener("click", () => {
  addDivider();
});

deleteBtn.addEventListener("click", () => {
  if (selectedId) {
    const obj = objectById(selectedId);
    if (!obj) return;
    const savedId = selectedId;
    pushUndo(() => {
      sceneEl.appendChild(obj);
      selectObject(savedId);
      setHint(t("hint.undoObjectRestored"));
    });
    obj.remove();
    setHint(t("hint.objectRemoved"));
    selectedId = null;
    return;
  }
  if (removeSelectedDivider()) {
    setHint(t("hint.dividerRemoved"));
    return;
  }
  setHint(t("hint.selectObjectOrDividerDelete"));
});

clearBtn.addEventListener("click", () => {
  const savedObjects  = [...roomCanvas.querySelectorAll(".room-object")];
  const savedDividers = [...dividers];
  pushUndo(() => {
    savedObjects.forEach((obj) => sceneEl.appendChild(obj));
    savedDividers.forEach((d) => {
      dividers.push(d);
      sceneEl.appendChild(d.lineEl);
      roomCanvas.appendChild(d.rotateTop);
      roomCanvas.appendChild(d.rotateBottom);
      renderDivider(d);
    });
    selectedId        = null;
    selectedDividerId = null;
    setHint(t("hint.undoRoomRestored"));
  });
  savedObjects.forEach((obj) => obj.remove());
  dividers.splice(0).forEach((d) => {
    d.lineEl.remove();
    d.rotateTop.remove();
    d.rotateBottom.remove();
  });
  selectedId        = null;
  selectedDividerId = null;
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
  setHint(t("hint.backgroundUpdated"));
});

// ---------------------------------------------------------------------------
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

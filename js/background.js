// background.js — scene setup, coordinate system, pan/zoom

const roomCanvas = document.getElementById("roomCanvas");
const hint = document.getElementById("hint");
const backgroundSelect = document.getElementById("backgroundSelect");
const backgroundZoom = document.getElementById("backgroundZoom");
const backgroundZoomValue = document.getElementById("backgroundZoomValue");
const newMapDialog = document.getElementById("newMapDialog");
const newMapForm = document.getElementById("newMapForm");
const newMapNameInput = document.getElementById("newMapNameInput");
const newMapWidthInput = document.getElementById("newMapWidthInput");
const newMapHeightInput = document.getElementById("newMapHeightInput");
const newMapTextureSelect = document.getElementById("newMapTextureSelect");
const newMapCancelBtn = document.getElementById("newMapCancelBtn");
const importGoogleMapDialog = document.getElementById("importGoogleMapDialog");
const importGoogleMapForm = document.getElementById("importGoogleMapForm");
const googleMapLinkInput = document.getElementById("googleMapLinkInput");
const googleMapPostLinkSection = document.getElementById("googleMapPostLinkSection");
const googleMapPreviewWrap = document.getElementById("googleMapPreviewWrap");
const googleMapPreviewMap = document.getElementById("googleMapPreviewMap");
const googleMapScaleInfo = document.getElementById("googleMapScaleInfo");
const googleMapSizeWarning = document.getElementById("googleMapSizeWarning");
const googleMapDialogMessage = document.getElementById("googleMapDialogMessage");
const googleMapNameInput = document.getElementById("googleMapNameInput");
const googleMapImageFileInput = document.getElementById("googleMapImageFileInput");
const googleMapFileNameInfo = document.getElementById("googleMapFileNameInfo");
const googleMapCropWrap = document.getElementById("googleMapCropWrap");
const googleMapCropCanvas = document.getElementById("googleMapCropCanvas");
const googleMapCropInfo = document.getElementById("googleMapCropInfo");
const googleMapResetCropBtn = document.getElementById("googleMapResetCropBtn");
const googleMapDrawAreaBtn = document.getElementById("googleMapDrawAreaBtn");
const googleMapClearAreaBtn = document.getElementById("googleMapClearAreaBtn");
const importGoogleMapFileBtn = document.getElementById("importGoogleMapFileBtn");
const importGoogleMapCancelBtn = document.getElementById("importGoogleMapCancelBtn");
const importGoogleMapCreateBtn = document.getElementById("importGoogleMapCreateBtn");
const customMapEditor = document.getElementById("customMapEditor");
const customMapNameInput = document.getElementById("customMapNameInput");
const customMapWidthInput = document.getElementById("customMapWidthInput");
const customMapHeightInput = document.getElementById("customMapHeightInput");
const customMapTextureSelect = document.getElementById("customMapTextureSelect");
const customMapDrawLineBtn = document.getElementById("customMapDrawLineBtn");
const customMapDrawFreehandBtn = document.getElementById("customMapDrawFreehandBtn");
const customMapClearAreaBtn = document.getElementById("customMapClearAreaBtn");
const deleteCustomMapBtn = document.getElementById("deleteCustomMapBtn");

const backgroundState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  moveMode: true,
  pointerId: null,
  startX: 0,
  startY: 0,
  startPanX: 0,
  startPanY: 0,
};

const backgroundDimensions = {
  "assets/gym-floor-topdown-4000x7000cm.svg": { width: 4000, height: 7000 },
};

const backgroundSources = {
  "assets/gym-floor-topdown-4000x7000cm.svg": "assets/gym-floor-topdown-4000x7000cm.svg",
};
const discoveredBackgroundLabels = {};

const CUSTOM_BACKGROUND_KEY = "custom-map";
const BASIC_MAP_TEXTURES = {
  indoorGym: { base: "#e6dfd1", accent: "#cbbfa9", detail: "#8f7f68", labelKey: "option.indoorGym" },
  concrete: { base: "#d7dde2", accent: "#b6bec7", detail: "#7f8a94", labelKey: "option.concrete" },
  woodDeck: { base: "#d8b58a", accent: "#bf9263", detail: "#8b5f39", labelKey: "option.woodDeck" },
  stoneBrick: { base: "#d9d6d0", accent: "#b5ada3", detail: "#857b70", labelKey: "option.stoneBrick" },
  grass: { base: "#cfe3c3", accent: "#a8c98e", detail: "#6f9e57", labelKey: "option.grass" },
  dirtGravel: { base: "#d8c6a7", accent: "#bc9d6f", detail: "#8f6f43", labelKey: "option.dirtGravel" },
  asphalt: { base: "#7a848d", accent: "#646f79", detail: "#49535d", labelKey: "option.asphalt" },
};

const LEGACY_COLOR_TO_TEXTURE = {
  Beige: "indoorGym",
  Gray: "concrete",
  Blue: "asphalt",
  Green: "grass",
  Tan: "dirtGravel",
  White: "concrete",
};
let customBackgroundConfig = null;

const GOOGLE_MAPS_API_KEY = String(window.APP_CONFIG?.GOOGLE_MAPS_API_KEY || "").trim();
const GOOGLE_STATIC_MAP_SIZE = 640;
const MAX_GOOGLE_MAP_CM = 20000;
let googleMapsApiPromise = null;

const googleImportState = {
  mapContext: null,
  currentZoom: 15,
  map: null,
  listenersBound: false,
  syncingFromPreview: false,
  syncingFromInput: false,
  selectedImageSource: "",
  selectedFileName: "",
  selectedImageEl: null,
  selectedImageWidth: 0,
  selectedImageHeight: 0,
  cropRect: null,
  cropCanvasLayout: null,
  cropPointerId: null,
  cropDragStart: null,
  drawMode: false,
  drawAreaPath: null,
};

const sceneEl = document.createElement("div");
sceneEl.className = "scene-layer";

const backgroundImg = document.createElement("img");
backgroundImg.className = "room-background-img";
backgroundImg.alt = "";
backgroundImg.draggable = false;
backgroundImg.addEventListener("load", () => {
  const src = backgroundSelect.value;
  const dims = backgroundDimensions[src];
  if (!dims && Number.isFinite(backgroundImg.naturalWidth) && Number.isFinite(backgroundImg.naturalHeight)
    && backgroundImg.naturalWidth > 0 && backgroundImg.naturalHeight > 0) {
    backgroundDimensions[src] = {
      width: Math.round(backgroundImg.naturalWidth),
      height: Math.round(backgroundImg.naturalHeight),
    };
  }
  sizeBackgroundImg();
});
backgroundImg.addEventListener("error", () => {
  const src = backgroundImg.getAttribute("src") || "";
  if (/^https?:\/\//i.test(src)) {
    setHint(t("hint.satelliteDisplayFailed"));
  }
});
sceneEl.appendChild(backgroundImg);

const backgroundAnnotationsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
backgroundAnnotationsSvg.setAttribute("aria-hidden", "true");
backgroundAnnotationsSvg.style.position = "absolute";
backgroundAnnotationsSvg.style.pointerEvents = "none";
backgroundAnnotationsSvg.style.zIndex = "1";
sceneEl.appendChild(backgroundAnnotationsSvg);

roomCanvas.appendChild(sceneEl);

const backgroundGridCanvas = document.createElement("canvas");
backgroundGridCanvas.className = "background-grid";
backgroundGridCanvas.setAttribute("aria-hidden", "true");
backgroundGridCanvas.style.position = "absolute";
backgroundGridCanvas.style.left = "0";
backgroundGridCanvas.style.top = "0";
backgroundGridCanvas.style.width = "100%";
backgroundGridCanvas.style.height = "100%";
backgroundGridCanvas.style.pointerEvents = "none";
backgroundGridCanvas.style.zIndex = "1";
roomCanvas.appendChild(backgroundGridCanvas);

const sidebarDrawState = {
  enabled: false,
  mode: null,
  pointerId: null,
  activePath: null,
  previousMoveMode: true,
};

backgroundSelect.addEventListener("focus", () => {
  restoreBackgroundOptionLabels();
});

backgroundSelect.addEventListener("mousedown", () => {
  restoreBackgroundOptionLabels();
});

backgroundSelect.addEventListener("blur", () => {
  syncBackgroundSelectTitle();
});

backgroundSelect.addEventListener("change", () => {
  syncCustomMapEditor();
});

customMapNameInput?.addEventListener("change", () => {
  updateCurrentCustomMap({ name: customMapNameInput.value });
});

customMapWidthInput?.addEventListener("change", () => {
  updateCurrentCustomMap({ width: customMapWidthInput.value });
});

customMapHeightInput?.addEventListener("change", () => {
  updateCurrentCustomMap({ height: customMapHeightInput.value });
});

customMapTextureSelect?.addEventListener("change", () => {
  updateCurrentCustomMap({ textureName: customMapTextureSelect.value });
});

deleteCustomMapBtn?.addEventListener("click", async () => {
  const mapName = customBackgroundConfig?.name || t("label.mapName");
  const confirmed = window.confirm(t("confirm.deleteCustomMap", { name: mapName }));
  if (!confirmed) {
    setHint(t("hint.customMapDeleteCanceled"));
    return;
  }

  const saveName = window.getCurrentMapSaveName?.()
    || localStorage.getItem("gym-planner-last-server-save");
  if (saveName) {
    await window.deletePlannerSaveFromServer?.(saveName);
  }

  if (deleteCurrentCustomMap()) {
    savePlannerToLocalStorage();
    await window.refreshSavedMapOptions?.();
  }
});

// ---------------------------------------------------------------------------
// Utilities

function setHint(message) {
  if (!hint) return;
  hint.textContent = message;
}

function setGoogleMapDialogMessage(message, tone = "error") {
  if (!googleMapDialogMessage) return;
  const text = String(message || "").trim();
  googleMapDialogMessage.hidden = !text;
  googleMapDialogMessage.textContent = text;
  if (text) {
    googleMapDialogMessage.dataset.tone = tone;
  } else {
    delete googleMapDialogMessage.dataset.tone;
  }
}

function rememberBackgroundOptionLabel(option) {
  if (!option.dataset.fullLabel) {
    option.dataset.fullLabel = option.textContent;
  }
}

function restoreBackgroundOptionLabels() {
  [...backgroundSelect.options].forEach((option) => {
    rememberBackgroundOptionLabel(option);
    option.textContent = option.dataset.fullLabel;
  });
}

function applyClosedBackgroundLabel() {
  restoreBackgroundOptionLabels();
}

function syncCustomMapEditor() {
  if (!customMapEditor) return;
  const isCustom = backgroundSelect.value === CUSTOM_BACKGROUND_KEY && Boolean(customBackgroundConfig);
  const isImageMap = isCustom && customBackgroundConfig.sourceType === "image";

  if (!isCustom && sidebarDrawState.enabled) {
    sidebarDrawState.enabled = false;
    sidebarDrawState.mode = null;
    backgroundState.moveMode = sidebarDrawState.previousMoveMode;
    sidebarDrawState.pointerId = null;
    sidebarDrawState.activePath = null;
  }

  customMapEditor.hidden = !isCustom;
  customMapEditor.setAttribute("aria-hidden", String(!isCustom));

  [customMapNameInput, customMapWidthInput, customMapHeightInput, customMapTextureSelect, deleteCustomMapBtn].forEach((el) => {
    if (!el) return;
    el.disabled = !isCustom;
  });

  if (!isCustom) return;

  customMapNameInput.value = customBackgroundConfig.name;
  customMapWidthInput.value = String(customBackgroundConfig.width);
  customMapHeightInput.value = String(customBackgroundConfig.height);
  customMapTextureSelect.value = customBackgroundConfig.textureName || LEGACY_COLOR_TO_TEXTURE[customBackgroundConfig.colorName] || "indoorGym";
  customMapWidthInput.disabled = !isCustom || isImageMap;
  customMapHeightInput.disabled = !isCustom || isImageMap;
  customMapTextureSelect.disabled = !isCustom || isImageMap;
  if (customMapDrawLineBtn) {
    customMapDrawLineBtn.disabled = !isCustom;
    customMapDrawLineBtn.classList.toggle("active", sidebarDrawState.enabled && sidebarDrawState.mode === "line" && isCustom);
  }
  if (customMapDrawFreehandBtn) {
    customMapDrawFreehandBtn.disabled = !isCustom;
    customMapDrawFreehandBtn.classList.toggle("active", sidebarDrawState.enabled && sidebarDrawState.mode === "freehand" && isCustom);
  }
  if (customMapClearAreaBtn) {
    customMapClearAreaBtn.disabled = !isCustom;
  }
}

function syncBackgroundSelectTitle() {
  restoreBackgroundOptionLabels();
  const selected = backgroundSelect.selectedOptions?.[0];
  backgroundSelect.title = selected ? (selected.dataset.fullLabel || selected.textContent) : "";
  if (document.activeElement !== backgroundSelect) {
    applyClosedBackgroundLabel();
  }
  syncCustomMapEditor();
}

function ensureBackgroundSelectOptions() {
  const labelBySource = {
    "assets/gym-floor-topdown-4000x7000cm.svg": "Gym Floor (2 Courts)",
  };

  Object.keys(backgroundSources).forEach((source) => {
    let option = backgroundSelect.querySelector(`option[value="${source}"]`);
    if (!option) {
      option = document.createElement("option");
      option.value = source;
      backgroundSelect.appendChild(option);
    }
    if (!option.textContent || !option.textContent.trim()) {
      option.textContent = labelBySource[source] || discoveredBackgroundLabels[source] || source;
    }
    if (option.textContent === source && discoveredBackgroundLabels[source]) {
      option.textContent = discoveredBackgroundLabels[source];
    }
    option.dataset.fullLabel = option.textContent;
  });

  if (!backgroundSources[backgroundSelect.value]) {
    const fallback = Object.keys(backgroundSources)[0];
    if (fallback) backgroundSelect.value = fallback;
  }

  syncBackgroundSelectTitle();
}

ensureBackgroundSelectOptions();

async function loadBackgroundCatalogFromServer() {
  try {
    const res = await fetch("/api/backgrounds");
    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items)) return;

    items.forEach((item) => {
      const src = String(item?.src || "").trim();
      if (!src || src === CUSTOM_BACKGROUND_KEY) return;

      backgroundSources[src] = src;
      discoveredBackgroundLabels[src] = String(item.label || src);
      if (Number.isFinite(item.width) && Number.isFinite(item.height) && item.width > 0 && item.height > 0) {
        backgroundDimensions[src] = {
          width: Number(item.width),
          height: Number(item.height),
        };
      }
    });

    ensureBackgroundSelectOptions();
    if (typeof window.applyI18n === "function") {
      window.applyI18n();
    }
  } catch {
    // Keep defaults when background discovery is unavailable.
  }
}

loadBackgroundCatalogFromServer();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

let gridOverlayVisible = true;

const toggleGridBtn = document.getElementById("toggleGridBtn");

function syncToggleGridBtn() {
  if (!toggleGridBtn) return;
  toggleGridBtn.classList.toggle("active", gridOverlayVisible);
  toggleGridBtn.textContent = gridOverlayVisible ? t("btn.hideGrid") : t("btn.showGrid");
}

toggleGridBtn?.addEventListener("click", () => {
  gridOverlayVisible = !gridOverlayVisible;
  syncToggleGridBtn();
  renderBackgroundGrid();
});

function getMeterTickStep(pxPerM) {
  return pxPerM >= 2 ? 1 : Math.max(1, Math.ceil(2 / pxPerM));
}

function renderBackgroundGrid() {
  const canvasWidth = roomCanvas.clientWidth;
  const canvasHeight = roomCanvas.clientHeight;
  backgroundGridCanvas.width = Math.max(0, canvasWidth);
  backgroundGridCanvas.height = Math.max(0, canvasHeight);

  const ctx = backgroundGridCanvas.getContext("2d");
  if (!ctx || canvasWidth <= 0 || canvasHeight <= 0) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!gridOverlayVisible) return;

  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return;

  const bgLeft = canvasWidth / 2 + backgroundState.panX - (dims.width / 2) * backgroundState.zoom;
  const bgTop = canvasHeight / 2 + backgroundState.panY - (dims.height / 2) * backgroundState.zoom;
  const bgWidth = dims.width * backgroundState.zoom;
  const bgHeight = dims.height * backgroundState.zoom;
  const pxPerM = backgroundState.zoom * 100;
  const tickStep = getMeterTickStep(pxPerM);
  const totalMetersX = Math.floor(dims.width / 100);
  const totalMetersY = Math.floor(dims.height / 100);

  ctx.save();
  ctx.beginPath();
  ctx.rect(bgLeft, bgTop, bgWidth, bgHeight);
  ctx.clip();

  for (let meter = 0; meter <= totalMetersX; meter += tickStep) {
    const x = bgLeft + meter * pxPerM;
    if (x < 0 || x > canvasWidth) continue;
    const isMajor = meter % 10 === 0;
    const isMid = meter % 5 === 0;
    if (isMajor) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "rgba(50, 90, 105, 0.45)";
    } else if (isMid) {
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(60, 95, 110, 0.28)";
    } else {
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 7]);
      ctx.strokeStyle = "rgba(68, 102, 112, 0.10)";
    }
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, bgTop);
    ctx.lineTo(Math.round(x) + 0.5, bgTop + bgHeight);
    ctx.stroke();
  }

  for (let meter = 0; meter <= totalMetersY; meter += tickStep) {
    const y = bgTop + meter * pxPerM;
    if (y < 0 || y > canvasHeight) continue;
    const isMajor = meter % 10 === 0;
    const isMid = meter % 5 === 0;
    if (isMajor) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "rgba(50, 90, 105, 0.45)";
    } else if (isMid) {
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(60, 95, 110, 0.28)";
    } else {
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 7]);
      ctx.strokeStyle = "rgba(68, 102, 112, 0.10)";
    }
    ctx.beginPath();
    ctx.moveTo(bgLeft, Math.round(y) + 0.5);
    ctx.lineTo(bgLeft + bgWidth, Math.round(y) + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

window.getMeterTickStep = getMeterTickStep;

function getCustomImageAnnotations() {
  if (!customBackgroundConfig) return [];
  const annotations = customBackgroundConfig.mapMeta?.annotations;
  return Array.isArray(annotations) ? annotations : [];
}

function setCustomImageAnnotations(annotations) {
  if (!customBackgroundConfig) return;
  customBackgroundConfig.mapMeta = {
    ...(customBackgroundConfig.mapMeta || {}),
    annotations,
  };
}

function isPointInsideCurrentBackground(sceneX, sceneY) {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return false;
  return sceneX >= -dims.width / 2
    && sceneX <= dims.width / 2
    && sceneY >= -dims.height / 2
    && sceneY <= dims.height / 2;
}

function scenePointToMapPoint(sceneX, sceneY) {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return null;
  return {
    x: clamp(sceneX + dims.width / 2, 0, dims.width),
    y: clamp(sceneY + dims.height / 2, 0, dims.height),
  };
}

function buildAnnotationPathD(path) {
  return path
    .map((point, index) => `${index === 0 ? "M" : "L"}${Number(point.x).toFixed(2)} ${Number(point.y).toFixed(2)}`)
    .join(" ");
}

function appendAnnotationPath(path) {
  if (!Array.isArray(path) || path.length < 2) return;
  const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathEl.setAttribute("d", buildAnnotationPathD(path));
  pathEl.setAttribute("fill", "none");
  pathEl.setAttribute("stroke", "#ffe100");
  pathEl.setAttribute("stroke-width", "10");
  pathEl.setAttribute("stroke-linecap", "round");
  pathEl.setAttribute("stroke-linejoin", "round");
  backgroundAnnotationsSvg.appendChild(pathEl);
}

function renderSidebarMapAnnotations() {
  const dims = backgroundDimensions[backgroundSelect.value];
  const isCustomMap = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig;

  while (backgroundAnnotationsSvg.firstChild) {
    backgroundAnnotationsSvg.removeChild(backgroundAnnotationsSvg.firstChild);
  }

  if (!isCustomMap || !dims) {
    backgroundAnnotationsSvg.style.display = "none";
    return;
  }

  backgroundAnnotationsSvg.style.display = "block";
  backgroundAnnotationsSvg.style.width = `${dims.width}px`;
  backgroundAnnotationsSvg.style.height = `${dims.height}px`;
  backgroundAnnotationsSvg.style.left = `${-dims.width / 2}px`;
  backgroundAnnotationsSvg.style.top = `${-dims.height / 2}px`;
  backgroundAnnotationsSvg.setAttribute("viewBox", `0 0 ${dims.width} ${dims.height}`);

  getCustomImageAnnotations().forEach((path) => appendAnnotationPath(path));
  if (sidebarDrawState.activePath && sidebarDrawState.activePath.length > 1) {
    appendAnnotationPath(sidebarDrawState.activePath);
  }
}

function setSidebarDrawMode(mode) {
  const isCustomMap = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig;
  if (!isCustomMap) {
    setHint(t("hint.selectCustomMapForDraw"));
    return;
  }

  const normalizedMode = mode === "line" || mode === "freehand" ? mode : null;
  const nextMode = sidebarDrawState.enabled && sidebarDrawState.mode === normalizedMode ? null : normalizedMode;

  if (sidebarDrawState.pointerId != null && roomCanvas.hasPointerCapture(sidebarDrawState.pointerId)) {
    roomCanvas.releasePointerCapture(sidebarDrawState.pointerId);
  }

  if (!sidebarDrawState.enabled && nextMode) {
    sidebarDrawState.previousMoveMode = backgroundState.moveMode;
  }

  sidebarDrawState.enabled = Boolean(nextMode);
  sidebarDrawState.mode = nextMode;
  sidebarDrawState.pointerId = null;
  sidebarDrawState.activePath = null;
  backgroundState.moveMode = nextMode ? false : sidebarDrawState.previousMoveMode;
  renderBackgroundView();
  renderSidebarMapAnnotations();
  syncCustomMapEditor();

  if (!nextMode) {
    setHint(t("hint.drawModeDisabled"));
    return;
  }

  setHint(t(nextMode === "line" ? "hint.drawLineModeEnabled" : "hint.drawFreehandModeEnabled"));
}

function beginSidebarAnnotationDraw(event) {
  const isCustomMap = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig;
  if (!sidebarDrawState.enabled || !isCustomMap) return;
  if (event.target.closest(".room-object")) {
    return;
  }

  const scene = clientToSceneCoords(event.clientX, event.clientY);
  if (!isPointInsideCurrentBackground(scene.x, scene.y)) return;

  const mapPoint = scenePointToMapPoint(scene.x, scene.y);
  if (!mapPoint) return;

  sidebarDrawState.pointerId = event.pointerId;
  sidebarDrawState.activePath = [mapPoint];
  roomCanvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function updateSidebarAnnotationDraw(event) {
  if (sidebarDrawState.pointerId !== event.pointerId || !sidebarDrawState.activePath) return;
  const scene = clientToSceneCoords(event.clientX, event.clientY);
  const mapPoint = scenePointToMapPoint(scene.x, scene.y);
  if (!mapPoint) return;
  if (sidebarDrawState.mode === "line") {
    if (sidebarDrawState.activePath.length === 1) {
      sidebarDrawState.activePath.push(mapPoint);
    } else {
      sidebarDrawState.activePath[1] = mapPoint;
    }
    renderSidebarMapAnnotations();
    return;
  }

  const last = sidebarDrawState.activePath[sidebarDrawState.activePath.length - 1];
  if (!last || last.x !== mapPoint.x || last.y !== mapPoint.y) {
    sidebarDrawState.activePath.push(mapPoint);
    renderSidebarMapAnnotations();
  }
}

function finishSidebarAnnotationDraw(event) {
  if (sidebarDrawState.pointerId !== event.pointerId) return;
  if (roomCanvas.hasPointerCapture(event.pointerId)) {
    roomCanvas.releasePointerCapture(event.pointerId);
  }

  if (sidebarDrawState.activePath && sidebarDrawState.activePath.length > 1) {
    const annotations = [...getCustomImageAnnotations(), sidebarDrawState.activePath];
    setCustomImageAnnotations(annotations);
    savePlannerToLocalStorage();
  }

  sidebarDrawState.pointerId = null;
  sidebarDrawState.activePath = null;
  renderSidebarMapAnnotations();
}

roomCanvas.addEventListener("pointerdown", beginSidebarAnnotationDraw);
roomCanvas.addEventListener("pointermove", updateSidebarAnnotationDraw);
roomCanvas.addEventListener("pointerup", finishSidebarAnnotationDraw);
roomCanvas.addEventListener("pointercancel", finishSidebarAnnotationDraw);

customMapDrawLineBtn?.addEventListener("click", () => {
  setSidebarDrawMode("line");
});

customMapDrawFreehandBtn?.addEventListener("click", () => {
  setSidebarDrawMode("freehand");
});

customMapClearAreaBtn?.addEventListener("click", () => {
  const isCustomMap = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig;
  if (!isCustomMap) return;
  setCustomImageAnnotations([]);
  renderSidebarMapAnnotations();
  savePlannerToLocalStorage();
  setHint(t("hint.yellowAreasRemoved"));
});

syncCustomMapEditor();

// ---------------------------------------------------------------------------
// Background image

function applyBackground(path) {
  backgroundImg.src = backgroundSources[path] || path;
  renderSidebarMapAnnotations();
}

function getTexturePreset(textureName) {
  const normalized = BASIC_MAP_TEXTURES[textureName] ? textureName : LEGACY_COLOR_TO_TEXTURE[textureName];
  return BASIC_MAP_TEXTURES[normalized || "indoorGym"];
}

function buildTexturePatternSvg(textureName) {
  const normalized = BASIC_MAP_TEXTURES[textureName] ? textureName : "indoorGym";
  const id = `texture_${normalized}`;

  switch (normalized) {
    case "concrete":
      return `<defs><pattern id="${id}" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="7" cy="9" r="1.5" fill="#7d8893" opacity="0.55"/><circle cx="24" cy="15" r="1.2" fill="#8a949e" opacity="0.45"/><circle cx="18" cy="28" r="1.4" fill="#717b86" opacity="0.5"/><circle cx="31" cy="8" r="1" fill="#5f6a76" opacity="0.35"/><circle cx="11" cy="24" r="0.9" fill="#5f6a76" opacity="0.25"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.55"/>`;
    case "woodDeck":
      return `<defs><pattern id="${id}" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 6 H28 M0 14 H28 M0 22 H28" stroke="#9c6d42" stroke-width="1.6" opacity="0.55"/><path d="M0 10 C6 8, 10 12, 16 10 S24 12, 28 10" stroke="#7f5330" stroke-width="1" fill="none" opacity="0.35"/><path d="M0 18 C7 16, 11 20, 18 18 S24 20, 28 18" stroke="#7f5330" stroke-width="1" fill="none" opacity="0.35"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.6"/>`;
    case "stoneBrick":
      return `<defs><pattern id="${id}" width="64" height="32" patternUnits="userSpaceOnUse"><path d="M0 16 H64 M0 0 H64 M0 32 H64" stroke="#8f867b" stroke-width="1" opacity="0.45"/><path d="M0 0 V16 M32 0 V16 M16 16 V32 M48 16 V32" stroke="#9f968a" stroke-width="1" opacity="0.4"/><path d="M32 0 V32" stroke="#7f766d" stroke-width="0.8" opacity="0.25"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.6"/>`;
    case "grass":
      return `<defs><pattern id="${id}" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M3 28 L8 8 M8 28 L14 10 M14 28 L18 6 M20 28 L25 12" stroke="#7aa55a" stroke-width="1.4" opacity="0.6" stroke-linecap="round"/><path d="M0 20 C6 18, 9 22, 15 20 S24 22, 30 19" stroke="#87b06a" stroke-width="1" opacity="0.35" fill="none"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.6"/>`;
    case "dirtGravel":
      return `<defs><pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="5" cy="7" r="1.5" fill="#9a7446" opacity="0.45"/><circle cx="12" cy="19" r="1.8" fill="#7d5d38" opacity="0.35"/><circle cx="22" cy="11" r="1.3" fill="#8a6a42" opacity="0.4"/><circle cx="19" cy="22" r="1.1" fill="#6e5232" opacity="0.35"/><circle cx="8" cy="14" r="0.9" fill="#6e5232" opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.65"/>`;
    case "asphalt":
      return `<defs><pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="6" r="0.8" fill="#edf2f6" opacity="0.38"/><circle cx="13" cy="10" r="0.7" fill="#d7dfe6" opacity="0.32"/><circle cx="20" cy="17" r="0.9" fill="#f7fafc" opacity="0.26"/><circle cx="8" cy="20" r="0.8" fill="#c9d3dc" opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.52"/>`;
    default:
      return `<defs><pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 0 H40 M0 20 H40 M0 40 H40 M0 0 V40 M20 0 V40" stroke="#c4b79c" stroke-width="1" opacity="0.18"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})" opacity="0.4"/>`;
  }
}

function buildCustomMapSvgData(widthCm, heightCm, textureName) {
  const preset = getTexturePreset(textureName);
  const normalized = BASIC_MAP_TEXTURES[textureName] ? textureName : LEGACY_COLOR_TO_TEXTURE[textureName] || "indoorGym";
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthCm}" height="${heightCm}" viewBox="0 0 ${widthCm} ${heightCm}">`,
    `<rect x="0" y="0" width="${widthCm}" height="${heightCm}" fill="${preset.base}"/>`,
    buildTexturePatternSvg(normalized),
    `<rect x="1" y="1" width="${Math.max(0, widthCm - 2)}" height="${Math.max(0, heightCm - 2)}" fill="none" stroke="${preset.detail}" stroke-width="2" opacity="0.85"/>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function registerCustomMap(widthCm, heightCm, textureName, mapName = "Custom Map", mapMeta = null) {
  const normalizedTexture = BASIC_MAP_TEXTURES[textureName] ? textureName : LEGACY_COLOR_TO_TEXTURE[textureName];
  const preset = getTexturePreset(normalizedTexture);
  if (!preset) {
    throw new Error(t("error.unsupportedMapTexture"));
  }

  const name = String(mapName).trim() || "Custom Map";

  backgroundDimensions[CUSTOM_BACKGROUND_KEY] = { width: widthCm, height: heightCm };
  backgroundSources[CUSTOM_BACKGROUND_KEY] = buildCustomMapSvgData(widthCm, heightCm, normalizedTexture || "indoorGym");
  customBackgroundConfig = {
    name,
    width: widthCm,
    height: heightCm,
    textureName: normalizedTexture || "indoorGym",
    mapMeta: mapMeta ? JSON.parse(JSON.stringify(mapMeta)) : null,
  };

  let option = backgroundSelect.querySelector(`option[value="${CUSTOM_BACKGROUND_KEY}"]`);
  if (!option) {
    option = document.createElement("option");
    option.value = CUSTOM_BACKGROUND_KEY;
    backgroundSelect.appendChild(option);
  }
  option.textContent = name;
  option.dataset.fullLabel = option.textContent;
  syncBackgroundSelectTitle();
}

function registerCustomImageMap(widthCm, heightCm, mapName, imageSource, mapMeta = null) {
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    throw new Error(t("error.mapDimensionsPositive"));
  }
  const normalizedImageSource = String(imageSource || "").trim();
  const isDataImage = normalizedImageSource.startsWith("data:image/");
  const isRemoteImage = /^https?:\/\//i.test(normalizedImageSource);
  if (!isDataImage && !isRemoteImage) {
    throw new Error(t("error.customImageInvalid"));
  }

  const name = String(mapName).trim() || "Imported Map";
  backgroundDimensions[CUSTOM_BACKGROUND_KEY] = { width: widthCm, height: heightCm };
  backgroundSources[CUSTOM_BACKGROUND_KEY] = normalizedImageSource;
  customBackgroundConfig = {
    name,
    width: widthCm,
    height: heightCm,
    sourceType: "image",
    imageSource: normalizedImageSource,
    imageDataUrl: isDataImage ? normalizedImageSource : "",
    mapMeta: mapMeta ? JSON.parse(JSON.stringify(mapMeta)) : null,
  };

  let option = backgroundSelect.querySelector(`option[value="${CUSTOM_BACKGROUND_KEY}"]`);
  if (!option) {
    option = document.createElement("option");
    option.value = CUSTOM_BACKGROUND_KEY;
    backgroundSelect.appendChild(option);
  }
  option.textContent = name;
  option.dataset.fullLabel = option.textContent;
  syncBackgroundSelectTitle();
}

function clearCustomMapRegistration() {
  const option = backgroundSelect.querySelector(`option[value="${CUSTOM_BACKGROUND_KEY}"]`);
  if (option) option.remove();
  delete backgroundDimensions[CUSTOM_BACKGROUND_KEY];
  delete backgroundSources[CUSTOM_BACKGROUND_KEY];
  customBackgroundConfig = null;
  syncBackgroundSelectTitle();
}

function deleteCurrentCustomMap() {
  if (!customBackgroundConfig) {
    setHint(t("hint.noCustomMapDelete"));
    return false;
  }

  clearCustomMapRegistration();
  if (!backgroundDimensions[backgroundSelect.value]) {
    backgroundSelect.value = "assets/gym-floor-topdown-4000x7000cm.svg";
  }
  applyBackground(backgroundSelect.value);
  backgroundState.zoom = getFitZoom();
  backgroundState.panX = 0;
  backgroundState.panY = 0;
  clampBackgroundPan();
  renderBackgroundView();
  window.switchMapObjects?.(backgroundSelect.value);
  setHint(t("hint.customMapDeleted"));
  return true;
}

window.clearCustomMapRegistration = clearCustomMapRegistration;
window.deleteCurrentCustomMap = deleteCurrentCustomMap;

function updateCurrentCustomMap(changes) {
  if (backgroundSelect.value !== CUSTOM_BACKGROUND_KEY || !customBackgroundConfig) {
    setHint(t("hint.selectCustomMapEdit"));
    syncCustomMapEditor();
    return false;
  }

  const nextName = String(changes.name ?? customBackgroundConfig.name).trim();
  const nextWidth = Number(changes.width ?? customBackgroundConfig.width);
  const nextHeight = Number(changes.height ?? customBackgroundConfig.height);
  const nextTexture = String(
    changes.textureName
    ?? customBackgroundConfig.textureName
    ?? LEGACY_COLOR_TO_TEXTURE[customBackgroundConfig.colorName]
    ?? "indoorGym",
  );
  const isImageMap = customBackgroundConfig.sourceType === "image";

  if (!nextName) {
    setHint(t("hint.customMapNameEmpty"));
    syncCustomMapEditor();
    return false;
  }

  if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
    setHint(t("hint.customMapSizePositive"));
    syncCustomMapEditor();
    return false;
  }

  if (isImageMap && ((changes.width != null && Number(changes.width) !== Number(customBackgroundConfig.width))
    || (changes.height != null && Number(changes.height) !== Number(customBackgroundConfig.height)))) {
    setHint(t("hint.importedDimsLocked"));
    syncCustomMapEditor();
    return false;
  }

  if (!isImageMap && !BASIC_MAP_TEXTURES[nextTexture]) {
    setHint(t("hint.invalidCustomMapTexture"));
    syncCustomMapEditor();
    return false;
  }

  if (isImageMap) {
    registerCustomImageMap(
      Math.round(nextWidth),
      Math.round(nextHeight),
      nextName,
      customBackgroundConfig.imageSource || customBackgroundConfig.imageDataUrl,
      customBackgroundConfig.mapMeta || null,
    );
  } else {
    registerCustomMap(Math.round(nextWidth), Math.round(nextHeight), nextTexture, nextName, customBackgroundConfig.mapMeta || null);
  }
  backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
  applyBackground(backgroundSelect.value);
  clampBackgroundPan();
  renderBackgroundView();
  setHint(t("hint.customMapUpdated"));
  return true;
}

function applyCurrentMapScaleCalibration(factor) {
  const scale = Number(factor);
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }
  if (backgroundSelect.value !== CUSTOM_BACKGROUND_KEY || !customBackgroundConfig) {
    setHint(t("hint.calibrationSelectCustomMap"));
    return null;
  }

  const nextWidth = Math.max(1, Math.round(Number(customBackgroundConfig.width) * scale));
  const nextHeight = Math.max(1, Math.round(Number(customBackgroundConfig.height) * scale));
  const mapMeta = customBackgroundConfig.mapMeta || null;

  if (customBackgroundConfig.sourceType === "image") {
    registerCustomImageMap(
      nextWidth,
      nextHeight,
      customBackgroundConfig.name,
      customBackgroundConfig.imageSource || customBackgroundConfig.imageDataUrl,
      mapMeta,
    );
  } else {
    registerCustomMap(
      nextWidth,
      nextHeight,
      customBackgroundConfig.textureName || LEGACY_COLOR_TO_TEXTURE[customBackgroundConfig.colorName] || "indoorGym",
      customBackgroundConfig.name,
      mapMeta,
    );
  }

  backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
  applyBackground(backgroundSelect.value);
  clampBackgroundPan();
  renderBackgroundView();

  return {
    factor: scale,
    width: nextWidth,
    height: nextHeight,
  };
}

function promptForNewMap() {
  if (!newMapDialog || !newMapForm) {
    setHint(t("hint.newMapDialogUnavailable"));
    return false;
  }

  const currentDims = backgroundDimensions[backgroundSelect.value] || { width: 1400, height: 900 };
  newMapNameInput.value = customBackgroundConfig?.name || "Custom Map";
  newMapWidthInput.value = String(Math.round(currentDims.width));
  newMapHeightInput.value = String(Math.round(currentDims.height));
  newMapTextureSelect.value = customBackgroundConfig?.textureName || LEGACY_COLOR_TO_TEXTURE[customBackgroundConfig?.colorName] || "indoorGym";

  const closeDialog = () => {
    newMapForm.removeEventListener("submit", handleCreate);
    newMapCancelBtn.removeEventListener("click", handleCancel);
    if (newMapDialog.open) newMapDialog.close();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const handleCreate = (event) => {
    event.preventDefault();
    const mapName = String(newMapNameInput.value || "").trim();
    const widthCm = Number(newMapWidthInput.value);
    const heightCm = Number(newMapHeightInput.value);
    const textureName = newMapTextureSelect.value;

    if (!mapName) {
      setHint(t("hint.enterMapName"));
      return;
    }

    const isValidWidth = Number.isFinite(widthCm) && widthCm > 0;
    const isValidHeight = Number.isFinite(heightCm) && heightCm > 0;
    if (!isValidWidth || !isValidHeight) {
      setHint(t("hint.mapSizePositive"));
      return;
    }

    if (!BASIC_MAP_TEXTURES[textureName]) {
      setHint(t("hint.invalidTextureChoice"));
      return;
    }

    try {
      registerCustomMap(Math.round(widthCm), Math.round(heightCm), textureName, mapName);
      backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
      window.switchMapObjects?.(CUSTOM_BACKGROUND_KEY, { clearStore: true });
      applyBackground(backgroundSelect.value);
      backgroundState.zoom = getFitZoom();
      backgroundState.panX = 0;
      backgroundState.panY = 0;
      clampBackgroundPan();
      renderBackgroundView();

      // Persist immediately so a refresh right after creation keeps the map.
      savePlannerToLocalStorage();
      savePlannerToServer();

      syncCustomMapEditor();
      closeDialog();

      setHint(t("hint.customMapCreated", {
        name: mapName,
        width: Math.round(widthCm),
        height: Math.round(heightCm),
        texture: t(BASIC_MAP_TEXTURES[textureName].labelKey),
      }));
    } catch (error) {
      console.error(error);
      setHint(error?.message || t("hint.unableLoadGooglePreview"));
    }
  };

  newMapForm.addEventListener("submit", handleCreate);
  newMapCancelBtn.addEventListener("click", handleCancel);
  newMapDialog.showModal();
  newMapNameInput.focus();
  return true;
}

function parseGoogleMapsContext(link) {
  const text = String(link || "").trim();
  if (!text) throw new Error(t("error.googleMapsLinkRequired"));

  // Format 1: @lat,lng,zoomz (e.g., @42.8770583,143.1712503,15z)
  const zoomMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/i);
  if (zoomMatch) {
    return {
      latitude: Number(zoomMatch[1]),
      longitude: Number(zoomMatch[2]),
      zoom: Number(zoomMatch[3]),
    };
  }

  // Format 2: @lat,lng,distancem (e.g., @42.8770583,143.1712503,134m)
  const meterMatch = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)m/i);
  if (meterMatch) {
    const lat = Number(meterMatch[1]);
    const lng = Number(meterMatch[2]);
    const meters = Number(meterMatch[3]);
    // Convert meters to approximate zoom level using Google Maps zoom formula
    // At zoom 0: ~40,075km per pixel; zoom n: distance/(2^n * 256) = 156543.03392 * cos(lat*pi/180) / 2^n
    // We want: meters ≈ 256 * metersPerPixelAtZoom * someScaleFactor
    // Rough formula: zoom ≈ log2(156543.03392 * cos(lat*pi/180) / (meters / 150))
    const earthCircumference = 40075000; // meters
    const tileSize = 256; // pixels
    const factor = earthCircumference / (tileSize * 2 * Math.PI);
    const cosLatitude = Math.cos((lat * Math.PI) / 180);
    const zoom = Math.log2(factor * cosLatitude / (meters / 150));
    return {
      latitude: lat,
      longitude: lng,
      zoom: Math.max(0, Math.min(21, zoom)), // Clamp to valid zoom range
    };
  }

  // Format 3: URL parameters (parse z and center from query string)
  try {
    const url = new URL(text);
    const z = Number(url.searchParams.get("z"));
    const center = url.searchParams.get("center") || url.searchParams.get("ll");
    if (center && Number.isFinite(z)) {
      const [lat, lng] = center.split(",").map((v) => Number(v));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng, zoom: z };
      }
    }
  } catch (e) {
    // Not a valid URL, fall through to error
  }

  throw new Error(t("error.unableDetectLatZoom"));
}

function metersPerPixelAtLatitude(latitude, zoom) {
  return 156543.03392 * Math.cos((latitude * Math.PI) / 180) / (2 ** zoom);
}

function loadGoogleMapsApi() {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Google Maps API key is not configured. Set APP_CONFIG.GOOGLE_MAPS_API_KEY in js/config.local.js"));
  }
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }
  if (googleMapsApiPromise) {
    return googleMapsApiPromise;
  }

  googleMapsApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps-api="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps), { once: true });
      existing.addEventListener("error", () => reject(new Error(t("error.failedLoadGoogleMapsApi"))), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsApi = "true";
    script.addEventListener("load", () => {
      if (window.google?.maps?.Map) {
        resolve(window.google.maps);
      } else {
        reject(new Error(t("error.googleMapsApiNoMapSupport")));
      }
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(t("error.failedLoadGoogleMapsApi"))), { once: true });
    document.head.appendChild(script);
  });

  return googleMapsApiPromise;
}

function buildGoogleMapsShareUrl(latitude, longitude, zoom) {
  const lat = Number(latitude).toFixed(6);
  const lng = Number(longitude).toFixed(6);
  const roundedZoom = Math.max(0, Math.min(21, Math.round(zoom)));
  return `https://www.google.com/maps/@${lat},${lng},${roundedZoom}z/data=!3m1!1e3`;
}

async function ensureGooglePreviewMap() {
  if (googleImportState.map) return googleImportState.map;
  if (!googleMapPreviewMap) {
    throw new Error(t("error.googleMapPreviewUnavailable"));
  }

  await loadGoogleMapsApi();

  googleImportState.map = new window.google.maps.Map(googleMapPreviewMap, {
    center: { lat: 37.7749, lng: -122.4194 },
    zoom: googleImportState.currentZoom,
    mapTypeId: "satellite",
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true,
    tilt: 0,
    gestureHandling: "greedy",
  });

  if (!googleImportState.listenersBound) {
    googleImportState.map.addListener("idle", () => {
      if (googleImportState.syncingFromInput) return;
      const center = googleImportState.map.getCenter();
      const zoom = googleImportState.map.getZoom();
      if (!center || !Number.isFinite(zoom)) return;

      googleImportState.syncingFromPreview = true;
      googleImportState.currentZoom = zoom;
      googleImportState.mapContext = {
        latitude: center.lat(),
        longitude: center.lng(),
        zoom,
      };
      googleMapLinkInput.value = buildGoogleMapsShareUrl(center.lat(), center.lng(), zoom);
      updateGoogleImportScaleInfo();
      googleImportState.syncingFromPreview = false;
    });
    googleImportState.listenersBound = true;
  }

  return googleImportState.map;
}

function updateGoogleImportScaleInfo() {
  if (!googleMapScaleInfo) return;
  const info = googleImportState.mapContext;
  if (!info) {
    googleMapScaleInfo.textContent = t("dialog.pasteValidGoogleUrl");
    if (googleMapSizeWarning) {
      googleMapSizeWarning.hidden = true;
      googleMapSizeWarning.textContent = "";
    }
    return;
  }

  const dims = computeImportDimensionsCm(info.latitude, googleImportState.currentZoom);
  const widthCm = dims.widthCm;
  const heightCm = dims.heightCm;
  googleMapScaleInfo.textContent = t("dialog.useSnippingToolOnPreview");

  if (googleMapSizeWarning) {
    const tooLarge = widthCm > MAX_GOOGLE_MAP_CM || heightCm > MAX_GOOGLE_MAP_CM;
    googleMapSizeWarning.hidden = !tooLarge;
    googleMapSizeWarning.textContent = tooLarge
      ? t("dialog.mapTooLargeWarning", { width: widthCm, height: heightCm, max: MAX_GOOGLE_MAP_CM })
      : "";
  }

  if (googleMapCropInfo) {
    if (googleImportState.selectedImageEl && googleImportState.cropRect) {
      const { width, height } = googleImportState.cropRect;
      googleMapCropInfo.textContent = t("dialog.cropInfo", {
        pxWidth: Math.round(width),
        pxHeight: Math.round(height),
        width: widthCm,
        height: heightCm,
      });
    } else {
      googleMapCropInfo.textContent = t("hint.cropDragImage");
    }
  }
}

function setGoogleImportLinkReadyState(isReady) {
  if (googleMapPostLinkSection) {
    googleMapPostLinkSection.hidden = !isReady;
  }
  if (importGoogleMapCreateBtn) {
    importGoogleMapCreateBtn.hidden = !isReady;
  }
  if (googleMapNameInput) {
    googleMapNameInput.required = isReady;
  }
}

function computeImportDimensionsCm(latitude, zoom) {
  const mpp = metersPerPixelAtLatitude(latitude, zoom);
  const sourceW = Number(googleImportState.selectedImageWidth) || 0;
  const sourceH = Number(googleImportState.selectedImageHeight) || 0;
  const cropRect = googleImportState.cropRect;
  const previewW = Number(googleMapPreviewMap?.clientWidth) || 0;
  const previewH = Number(googleMapPreviewMap?.clientHeight) || 0;

  // Use the actual imported image pixel size when available so non-square captures
  // produce non-square real-world dimensions. Before an image is loaded, use
  // the preview viewport size (which may be rectangular), then fall back to
  // the legacy static-map reference size only when viewport size is unavailable.
  const basePxWidth = sourceW > 0 ? sourceW : (previewW > 0 ? previewW : GOOGLE_STATIC_MAP_SIZE);
  const basePxHeight = sourceH > 0 ? sourceH : (previewH > 0 ? previewH : GOOGLE_STATIC_MAP_SIZE);
  const effectivePxWidth = cropRect ? Number(cropRect.width) || basePxWidth : basePxWidth;
  const effectivePxHeight = cropRect ? Number(cropRect.height) || basePxHeight : basePxHeight;

  const widthCm = effectivePxWidth * mpp * 100;
  const heightCm = effectivePxHeight * mpp * 100;

  return {
    widthCm: Math.max(1, Math.round(widthCm)),
    heightCm: Math.max(1, Math.round(heightCm)),
  };
}

function resetSelectedImageCrop() {
  if (!googleImportState.selectedImageEl) {
    googleImportState.cropRect = null;
    return;
  }
  googleImportState.cropRect = {
    x: 0,
    y: 0,
    width: googleImportState.selectedImageWidth,
    height: googleImportState.selectedImageHeight,
  };
}

function renderGoogleMapCropCanvas() {
  if (!googleMapCropCanvas || !googleImportState.selectedImageEl || !googleImportState.cropRect) return;
  const canvas = googleMapCropCanvas;
  const ctx = canvas.getContext("2d");
  const img = googleImportState.selectedImageEl;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = cw / ch;
  let drawW;
  let drawH;
  let drawX;
  let drawY;

  if (imgAspect > canvasAspect) {
    drawW = cw;
    drawH = cw / imgAspect;
    drawX = 0;
    drawY = (ch - drawH) / 2;
  } else {
    drawH = ch;
    drawW = ch * imgAspect;
    drawY = 0;
    drawX = (cw - drawW) / 2;
  }

  googleImportState.cropCanvasLayout = {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
    scaleX: img.naturalWidth / drawW,
    scaleY: img.naturalHeight / drawH,
  };

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  const crop = googleImportState.cropRect;
  const cropX = drawX + crop.x / googleImportState.cropCanvasLayout.scaleX;
  const cropY = drawY + crop.y / googleImportState.cropCanvasLayout.scaleY;
  const cropW = crop.width / googleImportState.cropCanvasLayout.scaleX;
  const cropH = crop.height / googleImportState.cropCanvasLayout.scaleY;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  ctx.rect(drawX, drawY, drawW, drawH);
  ctx.rect(cropX, cropY, cropW, cropH);
  ctx.fill("evenodd");
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#f6b34a";
  ctx.lineWidth = 2;
  ctx.strokeRect(cropX, cropY, cropW, cropH);
  ctx.restore();

  if (googleImportState.drawAreaPath && googleImportState.drawAreaPath.length > 1) {
    ctx.save();
    ctx.strokeStyle = "#ffe100";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    googleImportState.drawAreaPath.forEach((point, index) => {
      const px = drawX + point.x / googleImportState.cropCanvasLayout.scaleX;
      const py = drawY + point.y / googleImportState.cropCanvasLayout.scaleY;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();
    ctx.restore();
  }
}

function setCropRectFromCanvasDrag(startCanvasX, startCanvasY, endCanvasX, endCanvasY) {
  const layout = googleImportState.cropCanvasLayout;
  if (!layout) return;

  const clampX = (v) => clamp(v, layout.x, layout.x + layout.width);
  const clampY = (v) => clamp(v, layout.y, layout.y + layout.height);
  const x1 = clampX(startCanvasX);
  const y1 = clampY(startCanvasY);
  const x2 = clampX(endCanvasX);
  const y2 = clampY(endCanvasY);

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  const pxW = Math.max(1, Math.round((right - left) * layout.scaleX));
  const pxH = Math.max(1, Math.round((bottom - top) * layout.scaleY));
  const pxX = Math.round((left - layout.x) * layout.scaleX);
  const pxY = Math.round((top - layout.y) * layout.scaleY);

  googleImportState.cropRect = {
    x: clamp(pxX, 0, Math.max(0, googleImportState.selectedImageWidth - 1)),
    y: clamp(pxY, 0, Math.max(0, googleImportState.selectedImageHeight - 1)),
    width: clamp(pxW, 1, googleImportState.selectedImageWidth),
    height: clamp(pxH, 1, googleImportState.selectedImageHeight),
  };
}

function canvasToImagePixelPoint(canvasX, canvasY) {
  const layout = googleImportState.cropCanvasLayout;
  if (!layout) return null;

  const clampX = (v) => clamp(v, layout.x, layout.x + layout.width);
  const clampY = (v) => clamp(v, layout.y, layout.y + layout.height);
  const clampedX = clampX(canvasX);
  const clampedY = clampY(canvasY);
  const pxX = Math.round((clampedX - layout.x) * layout.scaleX);
  const pxY = Math.round((clampedY - layout.y) * layout.scaleY);

  return {
    x: clamp(pxX, 0, Math.max(0, googleImportState.selectedImageWidth - 1)),
    y: clamp(pxY, 0, Math.max(0, googleImportState.selectedImageHeight - 1)),
  };
}

function startDrawAreaPath(canvasX, canvasY) {
  const point = canvasToImagePixelPoint(canvasX, canvasY);
  if (!point) return;
  googleImportState.drawAreaPath = [point];
}

function appendDrawAreaPathPoint(canvasX, canvasY) {
  const point = canvasToImagePixelPoint(canvasX, canvasY);
  if (!point) return;
  if (!googleImportState.drawAreaPath) {
    googleImportState.drawAreaPath = [point];
    return;
  }

  const last = googleImportState.drawAreaPath[googleImportState.drawAreaPath.length - 1];
  if (!last || last.x !== point.x || last.y !== point.y) {
    googleImportState.drawAreaPath.push(point);
  }
}

function buildCroppedImageDataUrl() {
  const img = googleImportState.selectedImageEl;
  const crop = googleImportState.cropRect;
  if (!img || !crop) return googleImportState.selectedImageSource;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    Math.round(crop.x),
    Math.round(crop.y),
    Math.round(crop.width),
    Math.round(crop.height),
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const areaPath = googleImportState.drawAreaPath;
  if (areaPath && areaPath.length > 1) {
    const lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) * 0.008));
    ctx.save();
    ctx.strokeStyle = "#ffe100";
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    areaPath.forEach((point, index) => {
      const x = Math.round(point.x - crop.x);
      const y = Math.round(point.y - crop.y);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

async function updateGoogleMapPreview() {
  if (!googleMapPreviewWrap) return;

  const rawLink = String(googleMapLinkInput.value || "").trim();
  if (!rawLink) {
    googleImportState.mapContext = null;
    setGoogleImportLinkReadyState(false);
    googleMapPreviewWrap.hidden = true;
    setGoogleMapDialogMessage("");
    updateGoogleImportScaleInfo();
    return;
  }

  let info;
  try {
    info = parseGoogleMapsContext(rawLink);
  } catch {
    googleImportState.mapContext = null;
    setGoogleImportLinkReadyState(false);
    googleMapPreviewWrap.hidden = true;
    setGoogleMapDialogMessage(t("dialog.pasteValidGoogleUrl"));
    updateGoogleImportScaleInfo();
    return;
  }

  try {
    const map = await ensureGooglePreviewMap();
    googleImportState.syncingFromInput = true;
    googleImportState.currentZoom = info.zoom;
    googleImportState.mapContext = info;
    map.setOptions({ mapTypeId: "satellite" });
    map.setZoom(Math.round(info.zoom));
    map.setCenter({ lat: info.latitude, lng: info.longitude });
    googleImportState.syncingFromInput = false;
    setGoogleImportLinkReadyState(true);
    googleMapPreviewWrap.hidden = false;
    setGoogleMapDialogMessage(t("dialog.useSnippingToolOnPreview"), "info");
    updateGoogleImportScaleInfo();
  } catch (error) {
    googleImportState.syncingFromInput = false;
    googleImportState.mapContext = null;
    setGoogleImportLinkReadyState(false);
    googleMapPreviewWrap.hidden = true;
    setGoogleMapDialogMessage(error.message || t("hint.unableLoadGooglePreview"));
    setHint(error.message || t("hint.unableLoadGooglePreview"));
  }
}

function promptForGoogleMapImport() {
  if (!importGoogleMapDialog || !importGoogleMapForm) {
    setHint(t("hint.googleImportDialogUnavailable"));
    return false;
  }

  googleMapNameInput.value = "Imported Satellite Map";
  googleMapLinkInput.value = "";
  googleImportState.mapContext = null;
  googleImportState.currentZoom = 15;
  googleImportState.syncingFromPreview = false;
  googleImportState.syncingFromInput = false;
  googleImportState.selectedImageSource = "";
  googleImportState.selectedFileName = "";
  googleImportState.selectedImageEl = null;
  googleImportState.selectedImageWidth = 0;
  googleImportState.selectedImageHeight = 0;
  googleImportState.cropRect = null;
  googleImportState.cropCanvasLayout = null;
  googleImportState.cropPointerId = null;
  googleImportState.cropDragStart = null;
  googleImportState.drawMode = false;
  googleImportState.drawAreaPath = null;
  if (googleMapImageFileInput) {
    googleMapImageFileInput.value = "";
  }
  if (googleMapFileNameInfo) {
    googleMapFileNameInfo.textContent = t("dialog.noFileSelected");
  }
  if (googleMapCropWrap) {
    googleMapCropWrap.hidden = true;
  }
  setGoogleImportLinkReadyState(false);
  if (googleMapDrawAreaBtn) {
    googleMapDrawAreaBtn.classList.remove("active");
  }
  setGoogleMapDialogMessage("");
  void updateGoogleMapPreview();
  updateGoogleImportScaleInfo();

  const handleLinkInput = () => {
    if (googleImportState.syncingFromPreview) return;
    void updateGoogleMapPreview();
  };

  const closeDialog = () => {
    importGoogleMapForm.removeEventListener("submit", handleCreate);
    importGoogleMapCancelBtn.removeEventListener("click", handleCancel);
    importGoogleMapFileBtn?.removeEventListener("click", handleImportFile);
    googleMapImageFileInput?.removeEventListener("change", handleFileInputChange);
    googleMapResetCropBtn?.removeEventListener("click", handleResetCrop);
    googleMapDrawAreaBtn?.removeEventListener("click", handleToggleDrawArea);
    googleMapClearAreaBtn?.removeEventListener("click", handleClearDrawArea);
    googleMapCropCanvas?.removeEventListener("pointerdown", handleCropPointerDown);
    googleMapCropCanvas?.removeEventListener("pointermove", handleCropPointerMove);
    googleMapCropCanvas?.removeEventListener("pointerup", handleCropPointerUp);
    googleMapCropCanvas?.removeEventListener("pointercancel", handleCropPointerUp);
    googleMapLinkInput.removeEventListener("input", handleLinkInput);
    if (importGoogleMapDialog.open) importGoogleMapDialog.close();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const finalizeImportedMap = (imageSource, context, name) => {
    const dims = computeImportDimensionsCm(context.latitude, googleImportState.currentZoom);
    const widthCm = dims.widthCm;
    const heightCm = dims.heightCm;

    if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
      setGoogleMapDialogMessage(t("hint.mapDimensionsTryZoom"));
      setHint(t("hint.mapDimensionsTryZoom"));
      return false;
    }

    if (widthCm > MAX_GOOGLE_MAP_CM || heightCm > MAX_GOOGLE_MAP_CM) {
      const msg = `Map is too large (${widthCm}x${heightCm} cm). Maximum allowed is ${MAX_GOOGLE_MAP_CM} cm per side. Zoom in and try again.`;
      setGoogleMapDialogMessage(msg, "error");
      setHint(msg);
      return false;
    }

    registerCustomImageMap(widthCm, heightCm, name, imageSource, {
      latitude: context.latitude,
      longitude: context.longitude,
      zoom: googleImportState.currentZoom,
    });
    backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
    applyBackground(backgroundSelect.value);
    backgroundState.zoom = getFitZoom();
    backgroundState.panX = 0;
    backgroundState.panY = 0;
    clampBackgroundPan();
    renderBackgroundView();
    window.switchMapObjects?.(CUSTOM_BACKGROUND_KEY, { clearStore: true });
    savePlannerToLocalStorage();
    setGoogleMapDialogMessage(t("dialog.importedSatelliteMapShort", { name }), "success");
    setHint(t("hint.importedSatelliteMap", { name, width: widthCm, height: heightCm }));
    closeDialog();
    return true;
  };

  const handleImportFile = () => {
    if (!googleMapImageFileInput) return;
    googleImportState.selectedImageSource = "";
    googleImportState.selectedFileName = "";
    googleImportState.selectedImageEl = null;
    googleImportState.selectedImageWidth = 0;
    googleImportState.selectedImageHeight = 0;
    googleImportState.cropRect = null;
    googleImportState.drawAreaPath = null;
    googleImportState.drawMode = false;
    googleImportState.cropCanvasLayout = null;
    if (googleMapCropWrap) {
      googleMapCropWrap.hidden = true;
    }
    if (googleMapFileNameInfo) {
      googleMapFileNameInfo.textContent = t("dialog.noFileSelected");
    }
    if (googleMapDrawAreaBtn) {
      googleMapDrawAreaBtn.classList.remove("active");
    }
    googleMapImageFileInput.value = "";
    googleMapImageFileInput.click();
  };

  const handleFileInputChange = async () => {
    const link = String(googleMapLinkInput.value || "").trim();
    if (!link) {
      setGoogleMapDialogMessage(t("hint.pasteGoogleLinkFirst"));
      setHint(t("hint.pasteGoogleLinkFirst"));
      return;
    }

    let context;
    try {
      context = googleImportState.mapContext || parseGoogleMapsContext(link);
    } catch (error) {
      setGoogleMapDialogMessage(error.message || t("hint.invalidGoogleMapsLink"));
      setHint(error.message || t("hint.invalidGoogleMapsLink"));
      return;
    }

    const name = String(googleMapNameInput.value || "").trim();
    if (!name) {
      setGoogleMapDialogMessage(t("hint.provideMapName"));
      setHint(t("hint.provideMapName"));
      return;
    }

    const file = googleMapImageFileInput?.files?.[0] || null;
    if (!file) {
      return;
    }
    if (!String(file.type || "").startsWith("image/")) {
      const msg = t("hint.selectedFileNotImage");
      setGoogleMapDialogMessage(msg);
      setHint(msg);
      return;
    }

    setGoogleMapDialogMessage(t("dialog.loadingImageFile"), "info");
    try {
      const imageSource = await readImageFileAsDataUrl(file);
      const imageEl = await loadImageElement(imageSource);
      googleImportState.selectedImageSource = imageSource;
      googleImportState.selectedFileName = file.name;
      googleImportState.selectedImageEl = imageEl;
      googleImportState.selectedImageWidth = imageEl.naturalWidth;
      googleImportState.selectedImageHeight = imageEl.naturalHeight;
      resetSelectedImageCrop();
      googleImportState.drawAreaPath = null;
      googleImportState.drawMode = false;
      if (googleMapCropWrap) {
        googleMapCropWrap.hidden = false;
      }
      if (googleMapDrawAreaBtn) {
        googleMapDrawAreaBtn.classList.remove("active");
      }
      renderGoogleMapCropCanvas();
      updateGoogleImportScaleInfo();
      if (googleMapFileNameInfo) {
        googleMapFileNameInfo.textContent = t("dialog.selectedFile", { name: file.name });
      }
      setGoogleMapDialogMessage(t("dialog.imageFileLoaded"), "success");
      setHint(t("hint.selectedImageFile", { name: file.name }));
    } catch (error) {
      const message = error.message || "Unable to import image file.";
      googleImportState.selectedImageSource = "";
      googleImportState.selectedFileName = "";
      googleImportState.selectedImageEl = null;
      googleImportState.selectedImageWidth = 0;
      googleImportState.selectedImageHeight = 0;
      googleImportState.cropRect = null;
      googleImportState.drawAreaPath = null;
      googleImportState.drawMode = false;
      if (googleMapCropWrap) {
        googleMapCropWrap.hidden = true;
      }
      if (googleMapFileNameInfo) {
        googleMapFileNameInfo.textContent = t("dialog.noFileSelected");
      }
      if (googleMapDrawAreaBtn) {
        googleMapDrawAreaBtn.classList.remove("active");
      }
      setGoogleMapDialogMessage(message);
      setHint(message);
    }
  };

  const handleCreate = (event) => {
    event.preventDefault();

    const link = String(googleMapLinkInput.value || "").trim();
    if (!link) {
      setGoogleMapDialogMessage(t("hint.pasteGoogleLink"));
      setHint(t("hint.pasteGoogleLink"));
      return;
    }

    let context;
    try {
      context = googleImportState.mapContext || parseGoogleMapsContext(link);
    } catch (error) {
      setGoogleMapDialogMessage(error.message || t("hint.invalidGoogleMapsLink"));
      setHint(error.message || t("hint.invalidGoogleMapsLink"));
      return;
    }

    const name = String(googleMapNameInput.value || "").trim();
    if (!name) {
      setGoogleMapDialogMessage(t("hint.provideMapName"));
      setHint(t("hint.provideMapName"));
      return;
    }

    if (!googleImportState.selectedImageSource) {
      const msg = t("hint.importFileBeforeCreate");
      setGoogleMapDialogMessage(msg);
      setHint(msg);
      return;
    }

    const preparedImage = buildCroppedImageDataUrl();
    finalizeImportedMap(preparedImage, context, name);
  };

  const handleResetCrop = () => {
    if (!googleImportState.selectedImageEl) return;
    resetSelectedImageCrop();
    renderGoogleMapCropCanvas();
    updateGoogleImportScaleInfo();
  };

  const handleToggleDrawArea = () => {
    if (!googleImportState.selectedImageEl) return;
    googleImportState.drawMode = !googleImportState.drawMode;
    if (googleMapDrawAreaBtn) {
      googleMapDrawAreaBtn.classList.toggle("active", googleImportState.drawMode);
    }
    setHint(googleImportState.drawMode ? t("hint.drawModeEnabledImage") : t("hint.drawModeDisabled"));
  };

  const handleClearDrawArea = () => {
    googleImportState.drawAreaPath = null;
    renderGoogleMapCropCanvas();
  };

  const handleCropPointerDown = (event) => {
    if (!googleImportState.selectedImageEl || !googleMapCropCanvas) return;
    googleImportState.cropPointerId = event.pointerId;
    googleImportState.cropDragStart = { x: event.offsetX, y: event.offsetY };
    googleMapCropCanvas.setPointerCapture(event.pointerId);
    if (googleImportState.drawMode) {
      startDrawAreaPath(event.offsetX, event.offsetY);
    } else {
      setCropRectFromCanvasDrag(event.offsetX, event.offsetY, event.offsetX, event.offsetY);
    }
    renderGoogleMapCropCanvas();
    updateGoogleImportScaleInfo();
  };

  const handleCropPointerMove = (event) => {
    if (googleImportState.cropPointerId !== event.pointerId || !googleImportState.cropDragStart) return;
    if (googleImportState.drawMode) {
      appendDrawAreaPathPoint(event.offsetX, event.offsetY);
    } else {
      setCropRectFromCanvasDrag(
        googleImportState.cropDragStart.x,
        googleImportState.cropDragStart.y,
        event.offsetX,
        event.offsetY,
      );
    }
    renderGoogleMapCropCanvas();
    updateGoogleImportScaleInfo();
  };

  const handleCropPointerUp = (event) => {
    if (googleImportState.cropPointerId !== event.pointerId) return;
    googleImportState.cropPointerId = null;
    googleImportState.cropDragStart = null;
    if (googleMapCropCanvas.hasPointerCapture(event.pointerId)) {
      googleMapCropCanvas.releasePointerCapture(event.pointerId);
    }
  };

  importGoogleMapForm.addEventListener("submit", handleCreate);
  importGoogleMapCancelBtn.addEventListener("click", handleCancel);
  importGoogleMapFileBtn?.addEventListener("click", handleImportFile);
  googleMapResetCropBtn?.addEventListener("click", handleResetCrop);
  googleMapDrawAreaBtn?.addEventListener("click", handleToggleDrawArea);
  googleMapClearAreaBtn?.addEventListener("click", handleClearDrawArea);
  googleMapImageFileInput?.addEventListener("change", () => {
    void handleFileInputChange();
  });
  googleMapCropCanvas?.addEventListener("pointerdown", handleCropPointerDown);
  googleMapCropCanvas?.addEventListener("pointermove", handleCropPointerMove);
  googleMapCropCanvas?.addEventListener("pointerup", handleCropPointerUp);
  googleMapCropCanvas?.addEventListener("pointercancel", handleCropPointerUp);
  googleMapLinkInput.addEventListener("input", handleLinkInput);

  importGoogleMapDialog.showModal();
  googleMapLinkInput.focus();
  return true;
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result.startsWith("data:image/")) {
        reject(new Error(t("error.unableReadImageData")));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error(t("error.failedReadSelectedFile")));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t("error.failedDecodeImage")));
    img.src = source;
  });
}

window.registerCustomImageMap = registerCustomImageMap;
window.promptForGoogleMapImport = promptForGoogleMapImport;
window.applyCurrentMapScaleCalibration = applyCurrentMapScaleCalibration;

function sizeBackgroundImg() {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return;

  // 1 scene unit = 1 cm; background is rendered at its natural cm dimensions
  backgroundImg.style.width  = `${dims.width}px`;
  backgroundImg.style.height = `${dims.height}px`;
  backgroundImg.style.left   = `${-dims.width / 2}px`;
  backgroundImg.style.top    = `${-dims.height / 2}px`;
  renderSidebarMapAnnotations();
}

// ---------------------------------------------------------------------------
// Zoom / pan

// Returns the zoom level that fits the full background inside the canvas viewport.
function getFitZoom() {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return 1;
  const cw = roomCanvas.clientWidth || 800;
  const ch = roomCanvas.clientHeight || 600;
  return Math.min(cw / dims.width, ch / dims.height);
}

function getBackgroundPanLimits() {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return { x: 0, y: 0 };

  const containerWidth  = roomCanvas.clientWidth;
  const containerHeight = roomCanvas.clientHeight;
  const renderedWidth   = dims.width  * backgroundState.zoom;
  const renderedHeight  = dims.height * backgroundState.zoom;
  const overscrollRatio = 0.10;
  const overscrollX = renderedWidth * overscrollRatio;
  const overscrollY = renderedHeight * overscrollRatio;

  return {
    x: Math.max(0, (renderedWidth  - containerWidth)  / 2) + overscrollX,
    y: Math.max(0, (renderedHeight - containerHeight) / 2) + overscrollY,
  };
}

function clampBackgroundPan() {
  const limits = getBackgroundPanLimits();
  backgroundState.panX = clamp(backgroundState.panX, -limits.x, limits.x);
  backgroundState.panY = clamp(backgroundState.panY, -limits.y, limits.y);
}

// focalClient: optional { x, y } in client coords — that point stays fixed on screen.
function setBackgroundZoom(value, focalClient) {
  const oldZoom = backgroundState.zoom;
  const newZoom = clamp(value, 0.05, 3.0);
  if (focalClient) {
    const scenePt = clientToSceneCoords(focalClient.x, focalClient.y);
    backgroundState.zoom = newZoom;
    const bounds = getRoomBounds();
    const cx = bounds.left + bounds.width  / 2;
    const cy = bounds.top  + bounds.height / 2;
    backgroundState.panX = focalClient.x - cx - scenePt.x * newZoom;
    backgroundState.panY = focalClient.y - cy - scenePt.y * newZoom;
  } else {
    // Scale pan so the scene point at the viewport centre stays fixed.
    backgroundState.panX = backgroundState.panX * (newZoom / oldZoom);
    backgroundState.panY = backgroundState.panY * (newZoom / oldZoom);
    backgroundState.zoom = newZoom;
  }
  clampBackgroundPan();
  renderBackgroundView();
}

function resetBackgroundView() {
  backgroundState.zoom = getFitZoom();
  backgroundState.panX = 0;
  backgroundState.panY = 0;
  clampBackgroundPan();
  renderBackgroundView();
}

function renderBackgroundView() {
  roomCanvas.style.setProperty("--bg-zoom",  String(backgroundState.zoom));
  roomCanvas.style.setProperty("--bg-pan-x", `${backgroundState.panX}px`);
  roomCanvas.style.setProperty("--bg-pan-y", `${backgroundState.panY}px`);
  sizeBackgroundImg();
  renderBackgroundGrid();

  const zoomPercent = Math.round(backgroundState.zoom * 100);
  backgroundZoom.value = String(zoomPercent);
  const zoomValueEl = document.getElementById("backgroundZoomValue");
  if (zoomValueEl) zoomValueEl.textContent = `${zoomPercent}%`;

  roomCanvas.classList.toggle("bg-move-mode", backgroundState.moveMode);
  syncBackgroundSelectTitle();
  renderSidebarMapAnnotations();
  renderRulers();
}

// ---------------------------------------------------------------------------
// Coordinate helpers

function getRoomBounds() {
  return roomCanvas.getBoundingClientRect();
}

function clientToSceneCoords(clientX, clientY) {
  const bounds = getRoomBounds();
  const cx = bounds.left + bounds.width  / 2 + backgroundState.panX;
  const cy = bounds.top  + bounds.height / 2 + backgroundState.panY;
  return {
    x: (clientX - cx) / backgroundState.zoom,
    y: (clientY - cy) / backgroundState.zoom,
  };
}

function getPlacementBounds(width, height) {
  const dims = backgroundDimensions[backgroundSelect.value];
  if (!dims) return { minLeft: 0, maxLeft: 0, minTop: 0, maxTop: 0 };
  // Background image is centred at scene origin; restrict objects to stay fully inside it.
  const halfW = dims.width  / 2;
  const halfH = dims.height / 2;
  return {
    minLeft: -halfW,
    maxLeft:  halfW - width,
    minTop:  -halfH,
    maxTop:   halfH - height,
  };
}

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
const newMapColorSelect = document.getElementById("newMapColorSelect");
const newMapCancelBtn = document.getElementById("newMapCancelBtn");
const importGoogleMapDialog = document.getElementById("importGoogleMapDialog");
const importGoogleMapForm = document.getElementById("importGoogleMapForm");
const googleMapLinkInput = document.getElementById("googleMapLinkInput");
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
const customMapEditor = document.getElementById("customMapEditor");
const customMapNameInput = document.getElementById("customMapNameInput");
const customMapWidthInput = document.getElementById("customMapWidthInput");
const customMapHeightInput = document.getElementById("customMapHeightInput");
const customMapColorSelect = document.getElementById("customMapColorSelect");
const customMapDrawAreaBtn = document.getElementById("customMapDrawAreaBtn");
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
  "assets/room-topdown.svg": { width: 1400, height: 900 },
  "assets/gym-floor-topdown-4000x7000cm.svg": { width: 4000, height: 7000 },
};

const backgroundSources = {
  "assets/room-topdown.svg": "assets/room-topdown.svg",
  "assets/gym-floor-topdown-4000x7000cm.svg": "assets/gym-floor-topdown-4000x7000cm.svg",
};

const CUSTOM_BACKGROUND_KEY = "custom-map";
const BASIC_MAP_COLORS = {
  Beige: "#e8dfcf",
  Gray: "#d5d9de",
  Blue: "#cfe1ea",
  Green: "#d2e5d2",
  Tan: "#dcc8ab",
  White: "#f5f5f0",
};
let customBackgroundConfig = null;

const GOOGLE_MAPS_API_KEY = "AIzaSyCXrRVXt6ZG1C4uqrp-nwsB1Ybaxyqg4Cw";
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
backgroundImg.addEventListener("load", () => sizeBackgroundImg());
backgroundImg.addEventListener("error", () => {
  const src = backgroundImg.getAttribute("src") || "";
  if (/^https?:\/\//i.test(src)) {
    setHint("Satellite image failed to display. Check that 'Maps Static API' is enabled for this API key in Google Cloud Console.");
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

const sidebarDrawState = {
  enabled: false,
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

customMapColorSelect?.addEventListener("change", () => {
  updateCurrentCustomMap({ colorName: customMapColorSelect.value });
});

deleteCustomMapBtn?.addEventListener("click", () => {
  const mapName = customBackgroundConfig?.name || "this custom map";
  const confirmed = window.confirm(`Delete ${mapName}? This cannot be undone.`);
  if (!confirmed) {
    setHint("Custom map delete canceled.");
    return;
  }

  if (deleteCurrentCustomMap()) {
    savePlannerToLocalStorage();
  }
});

// ---------------------------------------------------------------------------
// Utilities

function setHint(message) {
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

  if (!isImageMap && sidebarDrawState.enabled) {
    sidebarDrawState.enabled = false;
    backgroundState.moveMode = sidebarDrawState.previousMoveMode;
    sidebarDrawState.pointerId = null;
    sidebarDrawState.activePath = null;
  }

  customMapEditor.hidden = !isCustom;
  customMapEditor.setAttribute("aria-hidden", String(!isCustom));

  [customMapNameInput, customMapWidthInput, customMapHeightInput, customMapColorSelect, deleteCustomMapBtn].forEach((el) => {
    if (!el) return;
    el.disabled = !isCustom;
  });

  if (!isCustom) return;

  customMapNameInput.value = customBackgroundConfig.name;
  customMapWidthInput.value = String(customBackgroundConfig.width);
  customMapHeightInput.value = String(customBackgroundConfig.height);
  customMapColorSelect.value = customBackgroundConfig.colorName || "Beige";
  customMapWidthInput.disabled = !isCustom || isImageMap;
  customMapHeightInput.disabled = !isCustom || isImageMap;
  customMapColorSelect.disabled = !isCustom || isImageMap;
  if (customMapDrawAreaBtn) {
    customMapDrawAreaBtn.disabled = !isImageMap;
    customMapDrawAreaBtn.classList.toggle("active", sidebarDrawState.enabled && isImageMap);
  }
  if (customMapClearAreaBtn) {
    customMapClearAreaBtn.disabled = !isImageMap;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCustomImageAnnotations() {
  if (!customBackgroundConfig || customBackgroundConfig.sourceType !== "image") return [];
  const annotations = customBackgroundConfig.mapMeta?.annotations;
  return Array.isArray(annotations) ? annotations : [];
}

function setCustomImageAnnotations(annotations) {
  if (!customBackgroundConfig || customBackgroundConfig.sourceType !== "image") return;
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
  const isCustomImage = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig
    && customBackgroundConfig.sourceType === "image";

  while (backgroundAnnotationsSvg.firstChild) {
    backgroundAnnotationsSvg.removeChild(backgroundAnnotationsSvg.firstChild);
  }

  if (!isCustomImage || !dims) {
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

function beginSidebarAnnotationDraw(event) {
  const isCustomImage = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig
    && customBackgroundConfig.sourceType === "image";
  if (!sidebarDrawState.enabled || !isCustomImage) return;
  if (
    event.target.closest(".room-object") ||
    event.target.closest(".room-divider") ||
    event.target.closest(".divider-rotate-anchor")
  ) {
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

customMapDrawAreaBtn?.addEventListener("click", () => {
  const isCustomImage = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig
    && customBackgroundConfig.sourceType === "image";
  if (!isCustomImage) {
    setHint("Select an imported custom map to draw yellow areas.");
    return;
  }

  sidebarDrawState.enabled = !sidebarDrawState.enabled;
  customMapDrawAreaBtn.classList.toggle("active", sidebarDrawState.enabled);
  if (sidebarDrawState.enabled) {
    sidebarDrawState.previousMoveMode = backgroundState.moveMode;
    backgroundState.moveMode = false;
    renderBackgroundView();
    setHint("Draw mode enabled. Drag on the map to draw yellow areas.");
  } else {
    backgroundState.moveMode = sidebarDrawState.previousMoveMode;
    renderBackgroundView();
    setHint("Draw mode disabled.");
  }
});

customMapClearAreaBtn?.addEventListener("click", () => {
  const isCustomImage = backgroundSelect.value === CUSTOM_BACKGROUND_KEY
    && customBackgroundConfig
    && customBackgroundConfig.sourceType === "image";
  if (!isCustomImage) return;
  setCustomImageAnnotations([]);
  renderSidebarMapAnnotations();
  savePlannerToLocalStorage();
  setHint("Yellow areas removed from this map.");
});

syncCustomMapEditor();

// ---------------------------------------------------------------------------
// Background image

function applyBackground(path) {
  backgroundImg.src = backgroundSources[path] || path;
  renderSidebarMapAnnotations();
}

function buildCustomMapSvgData(widthCm, heightCm, colorHex) {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${widthCm}" height="${heightCm}" viewBox="0 0 ${widthCm} ${heightCm}">`,
    `<rect x="0" y="0" width="${widthCm}" height="${heightCm}" fill="${colorHex}"/>`,
    `<rect x="1" y="1" width="${Math.max(0, widthCm - 2)}" height="${Math.max(0, heightCm - 2)}" fill="none" stroke="#4e5a63" stroke-width="2"/>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function registerCustomMap(widthCm, heightCm, colorName, mapName = "Custom Map") {
  const hex = BASIC_MAP_COLORS[colorName];
  if (!hex) {
    throw new Error("Unsupported map color.");
  }

  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    throw new Error("Map dimensions must be greater than 0 cm.");
  }

  const name = String(mapName).trim() || "Custom Map";

  backgroundDimensions[CUSTOM_BACKGROUND_KEY] = { width: widthCm, height: heightCm };
  backgroundSources[CUSTOM_BACKGROUND_KEY] = buildCustomMapSvgData(widthCm, heightCm, hex);
  customBackgroundConfig = {
    name,
    width: widthCm,
    height: heightCm,
    colorName,
    colorHex: hex,
  };

  let option = backgroundSelect.querySelector(`option[value="${CUSTOM_BACKGROUND_KEY}"]`);
  if (!option) {
    option = document.createElement("option");
    option.value = CUSTOM_BACKGROUND_KEY;
    backgroundSelect.appendChild(option);
  }
  option.textContent = `${name} (${widthCm}x${heightCm} cm, ${colorName})`;
  option.dataset.fullLabel = option.textContent;
  syncBackgroundSelectTitle();
}

function registerCustomImageMap(widthCm, heightCm, mapName, imageSource, mapMeta = null) {
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    throw new Error("Map dimensions must be greater than 0 cm.");
  }
  const normalizedImageSource = String(imageSource || "").trim();
  const isDataImage = normalizedImageSource.startsWith("data:image/");
  const isRemoteImage = /^https?:\/\//i.test(normalizedImageSource);
  if (!isDataImage && !isRemoteImage) {
    throw new Error("Custom image map data is invalid.");
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
  option.textContent = `${name} (${widthCm}x${heightCm} cm, Satellite)`;
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
    setHint("No custom map to delete.");
    return false;
  }

  clearCustomMapRegistration();
  if (!backgroundDimensions[backgroundSelect.value]) {
    backgroundSelect.value = "assets/room-topdown.svg";
  }
  applyBackground(backgroundSelect.value);
  backgroundState.zoom = getFitZoom();
  backgroundState.panX = 0;
  backgroundState.panY = 0;
  clampBackgroundPan();
  renderBackgroundView();
  setHint("Custom map deleted.");
  return true;
}

window.clearCustomMapRegistration = clearCustomMapRegistration;
window.deleteCurrentCustomMap = deleteCurrentCustomMap;

function updateCurrentCustomMap(changes) {
  if (backgroundSelect.value !== CUSTOM_BACKGROUND_KEY || !customBackgroundConfig) {
    setHint("Select a custom map to edit its properties.");
    syncCustomMapEditor();
    return false;
  }

  const nextName = String(changes.name ?? customBackgroundConfig.name).trim();
  const nextWidth = Number(changes.width ?? customBackgroundConfig.width);
  const nextHeight = Number(changes.height ?? customBackgroundConfig.height);
  const nextColor = String(changes.colorName ?? customBackgroundConfig.colorName);
  const isImageMap = customBackgroundConfig.sourceType === "image";

  if (!nextName) {
    setHint("Custom map name cannot be empty.");
    syncCustomMapEditor();
    return false;
  }

  if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) {
    setHint("Custom map size must be greater than 0 cm.");
    syncCustomMapEditor();
    return false;
  }

  if (isImageMap && ((changes.width != null && Number(changes.width) !== Number(customBackgroundConfig.width))
    || (changes.height != null && Number(changes.height) !== Number(customBackgroundConfig.height)))) {
    setHint("Width and height are locked for imported maps.");
    syncCustomMapEditor();
    return false;
  }

  if (!isImageMap && !BASIC_MAP_COLORS[nextColor]) {
    setHint("Invalid custom map color.");
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
    registerCustomMap(Math.round(nextWidth), Math.round(nextHeight), nextColor, nextName);
  }
  backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
  applyBackground(backgroundSelect.value);
  clampBackgroundPan();
  renderBackgroundView();
  setHint("Custom map updated.");
  return true;
}

function promptForNewMap() {
  if (!newMapDialog || !newMapForm) {
    setHint("New map dialog is unavailable.");
    return false;
  }

  const currentDims = backgroundDimensions[backgroundSelect.value] || { width: 1400, height: 900 };
  newMapNameInput.value = customBackgroundConfig?.name || "Custom Map";
  newMapWidthInput.value = String(Math.round(currentDims.width));
  newMapHeightInput.value = String(Math.round(currentDims.height));
  newMapColorSelect.value = customBackgroundConfig?.colorName || "Beige";

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
    const colorName = newMapColorSelect.value;

    if (!mapName) {
      setHint("Please enter a map name.");
      return;
    }

    const isValidWidth = Number.isFinite(widthCm) && widthCm > 0;
    const isValidHeight = Number.isFinite(heightCm) && heightCm > 0;
    if (!isValidWidth || !isValidHeight) {
      setHint("Map size must be greater than 0 cm.");
      return;
    }

    if (!BASIC_MAP_COLORS[colorName]) {
      setHint("Invalid color choice.");
      return;
    }

    registerCustomMap(Math.round(widthCm), Math.round(heightCm), colorName, mapName);
    backgroundSelect.value = CUSTOM_BACKGROUND_KEY;
    applyBackground(backgroundSelect.value);
    backgroundState.zoom = getFitZoom();
    backgroundState.panX = 0;
    backgroundState.panY = 0;
    clampBackgroundPan();
    renderBackgroundView();
    setHint(`Custom map created: ${mapName} (${Math.round(widthCm)}x${Math.round(heightCm)} cm, ${colorName}).`);
    syncCustomMapEditor();
    closeDialog();
  };

  newMapForm.addEventListener("submit", handleCreate);
  newMapCancelBtn.addEventListener("click", handleCancel);
  newMapDialog.showModal();
  newMapNameInput.focus();
  return true;
}

function parseGoogleMapsContext(link) {
  const text = String(link || "").trim();
  if (!text) throw new Error("Google Maps link is required.");

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

  throw new Error("Unable to detect latitude/zoom from link. Use a Google Maps URL (e.g., paste the link from your browser address bar).");
}

function metersPerPixelAtLatitude(latitude, zoom) {
  return 156543.03392 * Math.cos((latitude * Math.PI) / 180) / (2 ** zoom);
}

function loadGoogleMapsApi() {
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
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps API.")), { once: true });
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
        reject(new Error("Google Maps API loaded without map support."));
      }
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Google Maps API.")), { once: true });
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
    throw new Error("Google map preview container is unavailable.");
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
    googleMapScaleInfo.textContent = "Paste a valid Google Maps link above (from your browser address bar).";
    if (googleMapSizeWarning) {
      googleMapSizeWarning.hidden = true;
      googleMapSizeWarning.textContent = "";
    }
    return;
  }

  const dims = computeImportDimensionsCm(info.latitude, googleImportState.currentZoom);
  const widthCm = dims.widthCm;
  const heightCm = dims.heightCm;
  googleMapScaleInfo.textContent = `Detected: Latitude ${info.latitude.toFixed(5)}, Longitude ${info.longitude.toFixed(5)}, Zoom ${Math.round(googleImportState.currentZoom)}. Import size: ${widthCm}x${heightCm} cm.`;

  if (googleMapSizeWarning) {
    const tooLarge = widthCm > MAX_GOOGLE_MAP_CM || heightCm > MAX_GOOGLE_MAP_CM;
    googleMapSizeWarning.hidden = !tooLarge;
    googleMapSizeWarning.textContent = tooLarge
      ? `Warning: map is too large (${widthCm}x${heightCm} cm). Maximum is ${MAX_GOOGLE_MAP_CM} cm per side. Zoom in to reduce size.`
      : "";
  }

  if (googleMapCropInfo) {
    if (googleImportState.selectedImageEl && googleImportState.cropRect) {
      const { width, height } = googleImportState.cropRect;
      googleMapCropInfo.textContent = `Crop: ${Math.round(width)}x${Math.round(height)} px -> ${widthCm}x${heightCm} cm`;
    } else {
      googleMapCropInfo.textContent = "Drag on the image to crop. Map dimensions update automatically.";
    }
  }
}

function computeImportDimensionsCm(latitude, zoom) {
  const mpp = metersPerPixelAtLatitude(latitude, zoom);
  let widthCm = GOOGLE_STATIC_MAP_SIZE * mpp * 100;
  let heightCm = GOOGLE_STATIC_MAP_SIZE * mpp * 100;

  const cropRect = googleImportState.cropRect;
  const sourceW = googleImportState.selectedImageWidth;
  const sourceH = googleImportState.selectedImageHeight;
  if (cropRect && sourceW > 0 && sourceH > 0) {
    widthCm *= cropRect.width / sourceW;
    heightCm *= cropRect.height / sourceH;
  }

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
    googleMapPreviewWrap.hidden = true;
    setGoogleMapDialogMessage("Paste a valid Google Maps URL to load the preview.");
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
    googleMapPreviewWrap.hidden = false;
    setGoogleMapDialogMessage("Preview ready. Drag or zoom the map to update the link automatically.", "info");
    updateGoogleImportScaleInfo();
  } catch (error) {
    googleImportState.syncingFromInput = false;
    googleImportState.mapContext = null;
    googleMapPreviewWrap.hidden = true;
    setGoogleMapDialogMessage(error.message || "Unable to load Google Maps preview.");
    setHint(error.message || "Unable to load Google Maps preview.");
  }
}

function promptForGoogleMapImport() {
  if (!importGoogleMapDialog || !importGoogleMapForm) {
    setHint("Google map import dialog is unavailable.");
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
    googleMapFileNameInfo.textContent = "No file selected.";
  }
  if (googleMapCropWrap) {
    googleMapCropWrap.hidden = true;
  }
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
      setGoogleMapDialogMessage("Map dimensions must be greater than 0 cm. Try a different zoom level.");
      setHint("Map dimensions must be greater than 0 cm. Try a different zoom level.");
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
    savePlannerToLocalStorage();
    setGoogleMapDialogMessage(`Imported satellite map: ${name}.`, "success");
    setHint(`Imported satellite map: ${name} (${widthCm}x${heightCm} cm).`);
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
      googleMapFileNameInfo.textContent = "No file selected.";
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
      setGoogleMapDialogMessage("Please paste a Google Maps link first.");
      setHint("Please paste a Google Maps link first.");
      return;
    }

    let context;
    try {
      context = googleImportState.mapContext || parseGoogleMapsContext(link);
    } catch (error) {
      setGoogleMapDialogMessage(error.message || "Invalid Google Maps link.");
      setHint(error.message || "Invalid Google Maps link.");
      return;
    }

    const name = String(googleMapNameInput.value || "").trim();
    if (!name) {
      setGoogleMapDialogMessage("Please provide a map name.");
      setHint("Please provide a map name.");
      return;
    }

    const file = googleMapImageFileInput?.files?.[0] || null;
    if (!file) {
      return;
    }
    if (!String(file.type || "").startsWith("image/")) {
      const msg = "Selected file is not a supported image.";
      setGoogleMapDialogMessage(msg);
      setHint(msg);
      return;
    }

    setGoogleMapDialogMessage("Loading image file...", "info");
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
        googleMapFileNameInfo.textContent = `Selected: ${file.name}`;
      }
      setGoogleMapDialogMessage("Image file loaded. Click Create Map to import.", "success");
      setHint(`Selected image file: ${file.name}`);
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
        googleMapFileNameInfo.textContent = "No file selected.";
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
      setGoogleMapDialogMessage("Please paste a Google Maps link.");
      setHint("Please paste a Google Maps link.");
      return;
    }

    let context;
    try {
      context = googleImportState.mapContext || parseGoogleMapsContext(link);
    } catch (error) {
      setGoogleMapDialogMessage(error.message || "Invalid Google Maps link.");
      setHint(error.message || "Invalid Google Maps link.");
      return;
    }

    const name = String(googleMapNameInput.value || "").trim();
    if (!name) {
      setGoogleMapDialogMessage("Please provide a map name.");
      setHint("Please provide a map name.");
      return;
    }

    if (!googleImportState.selectedImageSource) {
      const msg = "Please click Import File and choose an image before creating the map.";
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
    setHint(googleImportState.drawMode ? "Draw mode enabled: drag freehand on the image to draw a yellow line." : "Draw mode disabled.");
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
        reject(new Error("Unable to read image data."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode the selected image."));
    img.src = source;
  });
}

async function fetchGoogleMapsSatelliteImage(context) {
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", `${context.latitude},${context.longitude}`);
  url.searchParams.set("zoom", String(Math.round(context.zoom)));
  url.searchParams.set("size", `${GOOGLE_STATIC_MAP_SIZE}x${GOOGLE_STATIC_MAP_SIZE}`);
  url.searchParams.set("maptype", "satellite");
  url.searchParams.set("format", "png");
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  const urlString = url.toString();

  // Step 1: Try to convert to a self-contained data URL via canvas.
  // This works when the Static Maps API sends CORS headers, giving an offline-safe result.
  const dataUrl = await tryLoadImageAsDataUrl(urlString);
  if (dataUrl) return dataUrl;

  // Step 2: CORS blocked canvas export. Verify the URL at least loads as an <img> source.
  const loads = await verifyImageUrlLoads(urlString);
  if (loads) return urlString;

  // Step 3: Image did not load at all — API key is likely not configured for Maps Static API.
  throw new Error(
    "Unable to load the satellite image. Make sure the 'Maps Static API' service is enabled for this API key in Google Cloud Console (console.cloud.google.com → APIs & Services).",
  );
}

function tryLoadImageAsDataUrl(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || GOOGLE_STATIC_MAP_SIZE;
        canvas.height = img.naturalHeight || GOOGLE_STATIC_MAP_SIZE;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        // Canvas tainted — CORS headers not present; resolve null to try URL fallback.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null); // CORS-mode request rejected; try non-CORS next.
    img.src = imageUrl;
  });
}

function verifyImageUrlLoads(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}

window.registerCustomImageMap = registerCustomImageMap;
window.promptForGoogleMapImport = promptForGoogleMapImport;

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

  return {
    x: Math.max(0, (renderedWidth  - containerWidth)  / 2),
    y: Math.max(0, (renderedHeight - containerHeight) / 2),
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

  const zoomPercent = Math.round(backgroundState.zoom * 100);
  backgroundZoom.value = String(zoomPercent);
  backgroundZoomValue.textContent = `${zoomPercent}%`;

  roomCanvas.classList.toggle("bg-move-mode", backgroundState.moveMode);
  syncBackgroundSelectTitle();
  renderSidebarMapAnnotations();

  // Defined in dividers.js and rulers.js — resolved at call time.
  renderAllDividers();
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

function sceneToCanvasCoords(x, y) {
  return {
    x: roomCanvas.clientWidth  / 2 + backgroundState.panX + x * backgroundState.zoom,
    y: roomCanvas.clientHeight / 2 + backgroundState.panY + y * backgroundState.zoom,
  };
}

function getVisibleSceneBounds() {
  const halfWidth  = roomCanvas.clientWidth  / 2;
  const halfHeight = roomCanvas.clientHeight / 2;
  return {
    minX: (-halfWidth  - backgroundState.panX) / backgroundState.zoom,
    maxX: ( halfWidth  - backgroundState.panX) / backgroundState.zoom,
    minY: (-halfHeight - backgroundState.panY) / backgroundState.zoom,
    maxY: ( halfHeight - backgroundState.panY) / backgroundState.zoom,
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

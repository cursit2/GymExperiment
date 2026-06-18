// room-objects.js — equipment objects (state, DOM creation, drag, rotate)

const objectCatalog = window.objectCatalog;

let selectedId = null;
let idCounter = 1;
let dragState = null;
let rotateState = null;
let annotationIdCounter = 1;
let noteDragState = null;
let noteResizeState = null;
const selectedIds = new Set();

function objectById(id) {
  return roomCanvas.querySelector(
    `.room-object[data-id="${id}"], .planner-note[data-annotation-id="${id}"], .planner-measure[data-annotation-id="${id}"], .planner-area-measure[data-annotation-id="${id}"]`
  );
}

function getSelectableId(el) {
  if (!el) return "";
  if (el.classList?.contains("room-object")) return String(el.dataset.id || "");
  if (el.classList?.contains("planner-note")) return String(el.dataset.annotationId || "");
  if (el.classList?.contains("planner-measure")) return String(el.dataset.annotationId || "");
  if (el.classList?.contains("planner-area-measure")) return String(el.dataset.annotationId || "");
  return "";
}

function getSelectedElements() {
  return [...selectedIds]
    .map((id) => objectById(id))
    .filter(Boolean);
}

function getSelectedObjects() {
  return getSelectedElements().filter((el) => el.classList.contains("room-object"));
}

function syncSelectionClasses() {
  roomCanvas.querySelectorAll(".room-object, .planner-note, .planner-measure, .planner-area-measure").forEach((obj) => {
    const itemId = getSelectableId(obj);
    const isSelected = selectedIds.has(itemId);
    obj.classList.toggle("selected", isSelected);
    obj.classList.toggle("selected-primary", isSelected && itemId === selectedId);
  });

  if (!selectedId || !selectedIds.has(selectedId)) {
    const ids = [...selectedIds];
    selectedId = ids.length > 0 ? ids[ids.length - 1] : null;
  }
}

function deselectAll() {
  selectedIds.clear();
  selectedId = null;
  syncSelectionClasses();
}

function selectObject(id, options = {}) {
  const { append = false, toggle = false } = options;
  const target = objectById(id);
  if (!target) return;

  const targetId = getSelectableId(target);
  if (!targetId) return;

  if (!append && !toggle) {
    selectedIds.clear();
  }

  if (toggle) {
    if (selectedIds.has(targetId)) {
      selectedIds.delete(targetId);
      if (selectedId === targetId) {
        const ids = [...selectedIds];
        selectedId = ids.length > 0 ? ids[ids.length - 1] : null;
      }
    } else {
      selectedIds.add(targetId);
      selectedId = targetId;
    }
  } else {
    selectedIds.add(targetId);
    selectedId = targetId;
  }

  syncSelectionClasses();
}

function getSelectedObjectIds() {
  return [...selectedIds];
}

function getAllSceneItems() {
  return [...roomCanvas.querySelectorAll(".room-object, .planner-annotation")];
}

function getSelectedObjectsClipboardData() {
  const targets = getSelectedElements();
  if (targets.length === 0) return null;

  const items = targets
    .map((obj) => {
      const left = parseFloat(obj.style.left) || 0;
      const top = parseFloat(obj.style.top) || 0;
      const centerX = left + (obj.offsetWidth / 2);
      const centerY = top + (obj.offsetHeight / 2);

      if (obj.classList.contains("planner-note")) {
        return {
          kind: "note",
          text: obj.dataset.text || "",
          color: obj.dataset.color || "#fff5bf",
          width: parseFloat(obj.style.width) || obj.offsetWidth || 180,
          height: parseFloat(obj.style.height) || obj.offsetHeight || 88,
          centerX,
          centerY,
        };
      }

      return {
        kind: "object",
        type: obj.dataset.type,
        rotation: Number(obj.dataset.rotation) || 0,
        centerX,
        centerY,
      };
    })
    .filter(Boolean);

  const anchorX = items.reduce((sum, item) => sum + item.centerX, 0) / items.length;
  const anchorY = items.reduce((sum, item) => sum + item.centerY, 0) / items.length;

  return {
    items: items.map((item) => ({
      kind: item.kind,
      type: item.type,
      rotation: item.rotation,
      text: item.text,
      color: item.color,
      width: item.width,
      height: item.height,
      relX: item.centerX - anchorX,
      relY: item.centerY - anchorY,
    })),
  };
}

function pasteObjectsFromClipboardData(data, options = {}) {
  const list = Array.isArray(data?.items) ? data.items : [];
  if (list.length === 0) return [];

  const bounds = roomCanvas.getBoundingClientRect();
  const defaultPoint = clientToSceneCoords(
    bounds.left + (bounds.width / 2),
    bounds.top + (bounds.height / 2),
  );
  const baseX = Number.isFinite(Number(options.baseX)) ? Number(options.baseX) : defaultPoint.x;
  const baseY = Number.isFinite(Number(options.baseY)) ? Number(options.baseY) : defaultPoint.y;
  const offsetX = Number.isFinite(Number(options.offsetX)) ? Number(options.offsetX) : 0;
  const offsetY = Number.isFinite(Number(options.offsetY)) ? Number(options.offsetY) : 0;

  const created = [];
  withHistorySuppressed(() => {
    list.forEach((item) => {
      const x = baseX + (Number(item.relX) || 0) + offsetX;
      const y = baseY + (Number(item.relY) || 0) + offsetY;

      if (item?.kind === "note") {
        const noteWidth = Math.max(90, Number(item.width) || 180);
        const noteHeight = Math.max(48, Number(item.height) || 88);
        const note = createNoteAnnotation(item.text, x, y, {
          color: item.color,
          width: noteWidth,
          height: noteHeight,
        });
        if (note) {
          note.style.left = `${x - (noteWidth / 2)}px`;
          note.style.top = `${y - (noteHeight / 2)}px`;
        }
        if (note) created.push(note);
        return;
      }

      if (!item?.type || !objectCatalog[item.type]) return;
      const obj = createRoomObject(item.type, x, y);
      if (!obj) return;
      const rotation = Number(item.rotation) || 0;
      obj.dataset.rotation = String(rotation);
      obj.style.transform = `rotate(${rotation}deg)`;
      created.push(obj);
    });
  });

  if (created.length === 0) return [];

  deselectAll();
  created.forEach((obj, index) => {
    const id = getSelectableId(obj);
    if (id) selectObject(id, { append: index > 0 });
  });

  pushUndo(() => {
    created.forEach((obj) => obj.remove());
    deselectAll();
    setHint(t("hint.undoPastedRemoved"));
  });

  return created;
}

function nextAnnotationId() {
  return `a${annotationIdCounter++}`;
}

function normalizeAngleDelta(delta) {
  let n = delta;
  while (n > 180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

function getObjectCenter(obj) {
  return {
    x: parseFloat(obj.style.left) + obj.offsetWidth / 2,
    y: parseFloat(obj.style.top) + obj.offsetHeight / 2,
  };
}

function getPointerAngleToObject(obj, clientX, clientY) {
  const sp = clientToSceneCoords(clientX, clientY);
  const center = getObjectCenter(obj);
  return (Math.atan2(sp.y - center.y, sp.x - center.x) * 180) / Math.PI;
}

function createNoteAnnotation(text, x, y, options = {}) {
  const label = String(text || "").trim();
  if (!label) return null;

  const note = document.createElement("div");
  note.className = "planner-annotation planner-note";
  note.dataset.annotationId = options.id || nextAnnotationId();
  note.dataset.annotationType = "note";
  note.dataset.text = label;
  note.dataset.color = String(options.color || "#fff5bf");

  const noteContent = document.createElement("div");
  noteContent.className = "planner-note-content";
  noteContent.textContent = label;
  note.appendChild(noteContent);

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "planner-note-resize-handle";
  note.appendChild(resizeHandle);

  note.style.left = `${Number(x) || 0}px`;
  note.style.top = `${Number(y) || 0}px`;
  note.style.width = `${Math.max(90, Number(options.width) || 180)}px`;
  note.style.height = `${Math.max(48, Number(options.height) || 88)}px`;
  note.style.background = String(options.color || "#fff5bf");

  function getSelectedMovers(target) {
    const targetId = getSelectableId(target);
    const movers = getSelectedElements();
    if (!selectedIds.has(targetId)) {
      return [target];
    }
    return movers.length > 0 ? movers : [target];
  }

  note.addEventListener("pointerdown", (event) => {
    if (event.target === resizeHandle) return;
    event.preventDefault();
    event.stopPropagation();

    const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    const targetId = getSelectableId(note);
    if (additiveSelection) {
      selectObject(targetId, { toggle: true, append: true });
      if (!selectedIds.has(targetId)) return;
    } else if (!selectedIds.has(targetId)) {
      selectObject(targetId);
    }

    const movers = getSelectedMovers(note);
    noteDragState = {
      id: targetId,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      movers: movers.map((objEl) => ({
        id: getSelectableId(objEl),
        startLeft: parseFloat(objEl.style.left) || 0,
        startTop: parseFloat(objEl.style.top) || 0,
      })),
    };
    note.setPointerCapture(event.pointerId);
  });

  note.addEventListener("pointermove", (event) => {
    if (!noteDragState || noteDragState.id !== getSelectableId(note) || noteDragState.pointerId !== event.pointerId) return;
    const dx = (event.clientX - noteDragState.startClientX) / backgroundState.zoom;
    const dy = (event.clientY - noteDragState.startClientY) / backgroundState.zoom;
    noteDragState.movers.forEach((entry) => {
      const item = objectById(entry.id);
      if (!item) return;
      const b = getPlacementBounds(item.offsetWidth, item.offsetHeight);
      item.style.left = `${clamp(entry.startLeft + dx, b.minLeft, b.maxLeft)}px`;
      item.style.top = `${clamp(entry.startTop + dy, b.minTop, b.maxTop)}px`;
    });
  });

  note.addEventListener("pointerup", (event) => {
    if (!noteDragState || noteDragState.id !== getSelectableId(note) || noteDragState.pointerId !== event.pointerId) return;
    if (note.hasPointerCapture(event.pointerId)) {
      note.releasePointerCapture(event.pointerId);
    }

    const changedEntries = noteDragState.movers
      .map((entry) => {
        const item = objectById(entry.id);
        if (!item) return null;
        const endLeft = parseFloat(item.style.left) || 0;
        const endTop = parseFloat(item.style.top) || 0;
        if (endLeft === entry.startLeft && endTop === entry.startTop) return null;
        return {
          id: entry.id,
          startLeft: entry.startLeft,
          startTop: entry.startTop,
        };
      })
      .filter(Boolean);

    if (changedEntries.length > 0) {
      pushUndo(() => {
        changedEntries.forEach((entry) => {
          const item = objectById(entry.id);
          if (!item) return;
          item.style.left = `${entry.startLeft}px`;
          item.style.top = `${entry.startTop}px`;
        });
        deselectAll();
        changedEntries.forEach((entry, index) => {
          selectObject(entry.id, { append: index > 0 });
        });
        setHint(t("hint.undoMoveRestored"));
      });
    }
    noteDragState = null;
  });

  note.addEventListener("pointercancel", (event) => {
    if (!noteDragState || noteDragState.pointerId !== event.pointerId) return;
    noteDragState = null;
  });

  note.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.openNoteEditorForExistingNote?.(note);
  });

  resizeHandle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();

    noteResizeState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: parseFloat(note.style.width) || note.offsetWidth,
      startHeight: parseFloat(note.style.height) || note.offsetHeight,
    };
    resizeHandle.setPointerCapture(event.pointerId);
  });

  resizeHandle.addEventListener("pointermove", (event) => {
    if (!noteResizeState || noteResizeState.pointerId !== event.pointerId) return;
    const dx = (event.clientX - noteResizeState.startClientX) / backgroundState.zoom;
    const dy = (event.clientY - noteResizeState.startClientY) / backgroundState.zoom;
    note.style.width = `${Math.max(90, noteResizeState.startWidth + dx)}px`;
    note.style.height = `${Math.max(48, noteResizeState.startHeight + dy)}px`;
  });

  resizeHandle.addEventListener("pointerup", (event) => {
    if (!noteResizeState || noteResizeState.pointerId !== event.pointerId) return;
    if (resizeHandle.hasPointerCapture(event.pointerId)) {
      resizeHandle.releasePointerCapture(event.pointerId);
    }

    const endWidth = parseFloat(note.style.width) || note.offsetWidth;
    const endHeight = parseFloat(note.style.height) || note.offsetHeight;
    const { startWidth, startHeight } = noteResizeState;
    if (endWidth !== startWidth || endHeight !== startHeight) {
      pushUndo(() => {
        note.style.width = `${startWidth}px`;
        note.style.height = `${startHeight}px`;
      });
    }
    noteResizeState = null;
  });

  resizeHandle.addEventListener("pointercancel", (event) => {
    if (!noteResizeState || noteResizeState.pointerId !== event.pointerId) return;
    noteResizeState = null;
  });

  sceneEl.appendChild(note);
  return note;
}

// ---------------------------------------------------------------------------
// Shared helper: attach drag behaviour to a measure/area-measure corner pin.
// pinEl      – the DOM div that is the draggable pin
// getScene   – fn() returning {x, y} current scene coords for this pin
// setScene   – fn(x, y) that writes the new scene position back to the
//              annotation's dataset + redraws the annotation
// getUndo    – fn() returning a snapshot object used by pushUndo
// applyUndo  – fn(snapshot) that restores the annotation from a snapshot
function attachMeasurePin(pinEl, getScene, setScene, getUndo, applyUndo) {
  let pinDragState = null;

  pinEl.addEventListener("pointerdown", (event) => {
    const owner = pinEl.closest(".planner-annotation");
    const ownerId = owner?.dataset?.annotationId;
    if (ownerId) {
      const additive = event.shiftKey || event.ctrlKey || event.metaKey;
      if (additive) {
        selectObject(ownerId, { append: true, toggle: true });
      } else {
        selectObject(ownerId);
      }
    }
    event.stopPropagation();
    pinDragState = {
      pointerId: event.pointerId,
      snapshot: getUndo(),
    };
    pinEl.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  pinEl.addEventListener("pointermove", (event) => {
    if (!pinDragState || pinDragState.pointerId !== event.pointerId) return;
    const sp = clientToSceneCoords(event.clientX, event.clientY);
    setScene(sp.x, sp.y);
    event.preventDefault();
  });

  const endDrag = (event) => {
    if (!pinDragState || pinDragState.pointerId !== event.pointerId) return;
    const snapshot = pinDragState.snapshot;
    pinDragState = null;
    pushUndo(() => {
      applyUndo(snapshot);
      savePlannerToLocalStorage();
      setHint(t("hint.undoMoveRestored"));
    });
    savePlannerToLocalStorage();
  };

  pinEl.addEventListener("pointerup", endDrag);
  pinEl.addEventListener("pointercancel", endDrag);
}

function updateMeasureAnnotationElement(el) {
  const x1 = Number(el.dataset.x1) || 0;
  const y1 = Number(el.dataset.y1) || 0;
  const x2 = Number(el.dataset.x2) || 0;
  const y2 = Number(el.dataset.y2) || 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceCm = Math.sqrt((dx * dx) + (dy * dy));
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Update SVG line
  const svg = el.querySelector("svg");
  if (svg) {
    const line = svg.querySelector("line");
    if (line) {
      line.setAttribute("x2", String(distanceCm));
    }
  }

  el.style.left = `${x1}px`;
  el.style.top = `${y1}px`;
  el.style.width = `${distanceCm}px`;
  el.style.transform = `rotate(${angleDeg}deg)`;

  const label = el.querySelector(".planner-measure-label");
  if (label) {
    label.textContent = `${(distanceCm / 100).toFixed(2)} m`;
  }

  // Move end pin
  const endPin = el.querySelector(".planner-measure-corner-end");
  if (endPin) {
    endPin.style.left = `${distanceCm - 6}px`;
  }
}

function createMeasurementAnnotation(x1, y1, x2, y2, options = {}) {
  const line = document.createElement("div");
  line.className = "planner-annotation planner-measure";
  line.dataset.annotationId = options.id || nextAnnotationId();
  line.dataset.annotationType = "measure";
  line.dataset.x1 = String(Number(x1) || 0);
  line.dataset.y1 = String(Number(y1) || 0);
  line.dataset.x2 = String(Number(x2) || 0);
  line.dataset.y2 = String(Number(y2) || 0);

  // SVG line
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:0;overflow:visible;pointer-events:none;";
  const svgLine = document.createElementNS(svgNS, "line");
  svgLine.setAttribute("x1", "0");
  svgLine.setAttribute("y1", "0");
  svgLine.setAttribute("y2", "0");
  svgLine.setAttribute("stroke", "#254956");
  svgLine.setAttribute("stroke-width", "2");
  svgLine.setAttribute("stroke-dasharray", "6,4");
  svg.appendChild(svgLine);
  line.appendChild(svg);

  // Distance label
  const label = document.createElement("span");
  label.className = "planner-measure-label";
  line.appendChild(label);

  // Start pin (index 0)
  const startPin = document.createElement("div");
  startPin.className = "planner-measure-corner";
  startPin.style.left = "-6px";
  startPin.style.top = "-6px";
  line.appendChild(startPin);

  // End pin (index 1) — x position filled in by updateMeasureAnnotationElement
  const endPin = document.createElement("div");
  endPin.className = "planner-measure-corner planner-measure-corner-end";
  endPin.style.top = "-6px";
  line.appendChild(endPin);

  updateMeasureAnnotationElement(line);

  // Drag: start pin moves (x1, y1)
  attachMeasurePin(
    startPin,
    () => ({ x: Number(line.dataset.x1), y: Number(line.dataset.y1) }),
    (sx, sy) => {
      line.dataset.x1 = String(sx);
      line.dataset.y1 = String(sy);
      updateMeasureAnnotationElement(line);
    },
    () => ({ x1: Number(line.dataset.x1), y1: Number(line.dataset.y1), x2: Number(line.dataset.x2), y2: Number(line.dataset.y2) }),
    (snap) => {
      line.dataset.x1 = String(snap.x1); line.dataset.y1 = String(snap.y1);
      line.dataset.x2 = String(snap.x2); line.dataset.y2 = String(snap.y2);
      updateMeasureAnnotationElement(line);
    },
  );

  // Drag: end pin moves (x2, y2)
  attachMeasurePin(
    endPin,
    () => ({ x: Number(line.dataset.x2), y: Number(line.dataset.y2) }),
    (sx, sy) => {
      line.dataset.x2 = String(sx);
      line.dataset.y2 = String(sy);
      updateMeasureAnnotationElement(line);
    },
    () => ({ x1: Number(line.dataset.x1), y1: Number(line.dataset.y1), x2: Number(line.dataset.x2), y2: Number(line.dataset.y2) }),
    (snap) => {
      line.dataset.x1 = String(snap.x1); line.dataset.y1 = String(snap.y1);
      line.dataset.x2 = String(snap.x2); line.dataset.y2 = String(snap.y2);
      updateMeasureAnnotationElement(line);
    },
  );

  // Click on the line body (not a pin) selects it for deletion
  line.style.pointerEvents = "auto";
  line.addEventListener("pointerdown", (event) => {
    if (event.target.classList.contains("planner-measure-corner")) return;
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const id = line.dataset.annotationId;
    if (additive) { selectObject(id, { toggle: true, append: true }); } else { selectObject(id); }
  });

  sceneEl.appendChild(line);
  return line;
}

function formatAreaCenterLabel(el, areaSqMValue) {
  const areaSqM = Number.isFinite(Number(areaSqMValue)) ? Number(areaSqMValue) : 0;
  const name = String(el.dataset.areaName || "").trim();
  const pricePerSqM = Number(el.dataset.pricePerSqm);
  const hasPrice = Number.isFinite(pricePerSqM) && pricePerSqM >= 0;
  const totalPrice = hasPrice ? areaSqM * pricePerSqM : null;
  const yenFormatter = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  });

  if (hasPrice) {
    el.dataset.totalPrice = String(totalPrice);
  } else {
    delete el.dataset.totalPrice;
  }

  const lines = [];
  if (name) lines.push(name);
  lines.push(`${areaSqM.toFixed(2)} m\u00b2`);
  if (hasPrice) lines.push(`Total: ${yenFormatter.format(totalPrice)}`);
  return lines.join("\n");
}

function updateAreaMeasureAnnotation(el) {
  const pts = [0, 1, 2, 3].map((i) => ({
    x: Number(el.dataset[`x${i}`]) || 0,
    y: Number(el.dataset[`y${i}`]) || 0,
  }));

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  el.style.left = `${minX}px`;
  el.style.top = `${minY}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  const polygon = el.querySelector("polygon");
  if (polygon) {
    polygon.setAttribute("points", pts.map((p) => `${p.x - minX},${p.y - minY}`).join(" "));
  }

  const pins = el.querySelectorAll(".planner-area-measure-corner");
  pins.forEach((pin, i) => {
    pin.style.left = `${pts[i].x - minX - 6}px`;
    pin.style.top = `${pts[i].y - minY - 6}px`;
  });

  const sideLabels = el.querySelectorAll(".planner-measure-label");
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b], idx) => {
    const pa = pts[a];
    const pb = pts[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lbl = sideLabels[idx];
    if (lbl) {
      lbl.textContent = `${(dist / 100).toFixed(2)} m`;
      lbl.style.left = `${(pa.x + pb.x) / 2 - minX}px`;
      lbl.style.top = `${(pa.y + pb.y) / 2 - minY}px`;
    }
  });

  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  const areaSqM = (Math.abs(area) / 2 / 10000).toFixed(2);

  const cx = pts.reduce((s, p) => s + p.x, 0) / 4 - minX;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4 - minY;
  const areaLabel = el.querySelector(".planner-area-measure-label");
  if (areaLabel) {
    areaLabel.textContent = formatAreaCenterLabel(el, Number(areaSqM));
    areaLabel.style.left = `${cx}px`;
    areaLabel.style.top = `${cy}px`;
  }
}

function createAreaMeasurementAnnotation(pts, options = {}) {
  // pts: [{x,y},{x,y},{x,y},{x,y}] in scene coords — any quadrilateral
  if (!Array.isArray(pts) || pts.length !== 4) return null;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;

  const el = document.createElement("div");
  el.className = "planner-annotation planner-area-measure";
  el.dataset.annotationId = options.id || nextAnnotationId();
  el.dataset.annotationType = "area-measure";
  el.dataset.areaName = String(options.areaName || "").trim();
  const inputPrice = Number(options.pricePerSqm);
  if (Number.isFinite(inputPrice) && inputPrice >= 0) {
    el.dataset.pricePerSqm = String(inputPrice);
  }
  pts.forEach((p, i) => {
    el.dataset[`x${i}`] = String(Number(p.x) || 0);
    el.dataset[`y${i}`] = String(Number(p.y) || 0);
  });

  el.style.left = `${minX}px`;
  el.style.top = `${minY}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  // SVG polygon
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
  const polygon = document.createElementNS(svgNS, "polygon");
  polygon.setAttribute("points", pts.map((p) => `${p.x - minX},${p.y - minY}`).join(" "));
  polygon.setAttribute("fill", "rgba(255,70,120,0.08)");
  polygon.setAttribute("stroke", "rgba(255,70,120,0.65)");
  polygon.setAttribute("stroke-width", "2");
  polygon.setAttribute("stroke-dasharray", "6,4");
  svg.appendChild(polygon);
  el.appendChild(svg);

  // Pink corner pins
  pts.forEach((p, i) => {
    const pin = document.createElement("div");
    pin.className = "planner-area-measure-corner";
    pin.style.left = `${p.x - minX - 6}px`;
    pin.style.top = `${p.y - minY - 6}px`;
    el.appendChild(pin);

    attachMeasurePin(
      pin,
      () => ({ x: Number(el.dataset[`x${i}`]), y: Number(el.dataset[`y${i}`]) }),
      (sx, sy) => {
        el.dataset[`x${i}`] = String(sx);
        el.dataset[`y${i}`] = String(sy);
        updateAreaMeasureAnnotation(el);
      },
      () => [0, 1, 2, 3].map((k) => ({ x: Number(el.dataset[`x${k}`]), y: Number(el.dataset[`y${k}`]) })),
      (snap) => {
        snap.forEach((p2, k) => { el.dataset[`x${k}`] = String(p2.x); el.dataset[`y${k}`] = String(p2.y); });
        updateAreaMeasureAnnotation(el);
      },
    );
  });

  // Side distance labels
  [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => {
    const pa = pts[a];
    const pb = pts[b];
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sideLabel = document.createElement("span");
    sideLabel.className = "planner-measure-label";
    sideLabel.textContent = `${(dist / 100).toFixed(2)} m`;
    sideLabel.style.position = "absolute";
    sideLabel.style.left = `${(pa.x + pb.x) / 2 - minX}px`;
    sideLabel.style.top = `${(pa.y + pb.y) / 2 - minY}px`;
    sideLabel.style.transform = "translate(-50%, -50%)";
    el.appendChild(sideLabel);
  });

  // Area label at centroid
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  const areaSqM = (Math.abs(area) / 2 / 10000).toFixed(2);
  const cx = pts.reduce((s, p) => s + p.x, 0) / 4 - minX;
  const cy = pts.reduce((s, p) => s + p.y, 0) / 4 - minY;
  const areaLabel = document.createElement("span");
  areaLabel.className = "planner-area-measure-label";
  areaLabel.textContent = formatAreaCenterLabel(el, Number(areaSqM));
  areaLabel.style.position = "absolute";
  areaLabel.style.left = `${cx}px`;
  areaLabel.style.top = `${cy}px`;
  areaLabel.style.transform = "translate(-50%, -50%)";
  areaLabel.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.openAreaMeasureDetailsDialog?.(el);
  });
  el.appendChild(areaLabel);

  sceneEl.appendChild(el);

  // Click on the area body (not a pin) selects it for deletion
  el.addEventListener("pointerdown", (event) => {
    if (event.target.classList.contains("planner-area-measure-corner")) return;
    event.stopPropagation();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const id = el.dataset.annotationId;
    if (additive) { selectObject(id, { toggle: true, append: true }); } else { selectObject(id); }
  });

  return el;
}

function getSceneAnnotationsState() {
  return [...roomCanvas.querySelectorAll(".planner-annotation")].map((el) => {
    const common = {
      id: el.dataset.annotationId,
      kind: el.dataset.annotationType,
    };

    if (el.dataset.annotationType === "measure") {
      return {
        ...common,
        x1: Number(el.dataset.x1) || 0,
        y1: Number(el.dataset.y1) || 0,
        x2: Number(el.dataset.x2) || 0,
        y2: Number(el.dataset.y2) || 0,
      };
    }

    if (el.dataset.annotationType === "area-measure") {
      return {
        ...common,
        pts: [0, 1, 2, 3].map((i) => ({
          x: Number(el.dataset[`x${i}`]) || 0,
          y: Number(el.dataset[`y${i}`]) || 0,
        })),
        areaName: String(el.dataset.areaName || ""),
        pricePerSqm: Number.isFinite(Number(el.dataset.pricePerSqm))
          ? Number(el.dataset.pricePerSqm)
          : null,
        totalPrice: Number.isFinite(Number(el.dataset.totalPrice))
          ? Number(el.dataset.totalPrice)
          : null,
      };
    }

    return {
      ...common,
      text: el.dataset.text || "",
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      width: parseFloat(el.style.width) || el.offsetWidth || 180,
      height: parseFloat(el.style.height) || el.offsetHeight || 88,
      color: el.dataset.color || "#fff5bf",
    };
  });
}

function restoreSceneAnnotationsState(annotations) {
  const list = Array.isArray(annotations) ? annotations : [];
  list.forEach((item) => {
    if (item?.kind === "measure") {
      createMeasurementAnnotation(item.x1, item.y1, item.x2, item.y2, { id: item.id });
      return;
    }
    if (item?.kind === "area-measure" && Array.isArray(item.pts) && item.pts.length === 4) {
      createAreaMeasurementAnnotation(item.pts, {
        id: item.id,
        areaName: item.areaName,
        pricePerSqm: item.pricePerSqm,
      });
      return;
    }
    createNoteAnnotation(item?.text, item?.x, item?.y, {
      id: item?.id,
      width: item?.width,
      height: item?.height,
      color: item?.color,
    });
  });
}

function deleteSelectedObjects() {
  const targets = getSelectedElements();
  if (targets.length === 0) return false;

  const snapshots = targets.map((obj) => {
    const parent = obj.parentElement;
    const nextSibling = obj.nextSibling;
    return { obj, parent, nextSibling };
  });
  const selectionIds = getSelectedObjectIds();

  pushUndo(() => {
    snapshots.forEach(({ obj, parent, nextSibling }) => {
      if (!parent) return;
      if (nextSibling && nextSibling.parentElement === parent) {
        parent.insertBefore(obj, nextSibling);
      } else {
        parent.appendChild(obj);
      }
    });
    deselectAll();
    selectionIds.forEach((id, index) => {
      selectObject(id, { append: index > 0 });
    });
    setHint(t("hint.undoObjectRestored"));
  });

  targets.forEach((obj) => obj.remove());
  deselectAll();
  return true;
}

function alignSelectedObjects(mode) {
  const targets = getSelectedElements();
  if (targets.length < 2) return false;

  const snapshots = targets.map((obj) => ({
    id: getSelectableId(obj),
    left: parseFloat(obj.style.left) || 0,
    top: parseFloat(obj.style.top) || 0,
  }));

  if (mode === "left") {
    const visualLeftEdges = targets.map((obj) => {
      const rotationDeg = obj.classList.contains("room-object") ? (Number(obj.dataset.rotation) || 0) : 0;
      const theta = (rotationDeg * Math.PI) / 180;
      const halfW = obj.offsetWidth / 2;
      const halfH = obj.offsetHeight / 2;
      const visualHalfWidth = Math.abs(halfW * Math.cos(theta)) + Math.abs(halfH * Math.sin(theta));
      const centerX = (parseFloat(obj.style.left) || 0) + halfW;
      return centerX - visualHalfWidth;
    });

    const targetVisualLeft = Math.min(...visualLeftEdges);
    targets.forEach((obj) => {
      const rotationDeg = obj.classList.contains("room-object") ? (Number(obj.dataset.rotation) || 0) : 0;
      const theta = (rotationDeg * Math.PI) / 180;
      const halfW = obj.offsetWidth / 2;
      const halfH = obj.offsetHeight / 2;
      const visualHalfWidth = Math.abs(halfW * Math.cos(theta)) + Math.abs(halfH * Math.sin(theta));
      const targetCenterX = targetVisualLeft + visualHalfWidth;
      obj.style.left = `${targetCenterX - halfW}px`;
    });
  } else if (mode === "center") {
    const centers = targets.map((obj) => (parseFloat(obj.style.left) || 0) + (obj.offsetWidth / 2));
    const targetCenter = centers.reduce((sum, value) => sum + value, 0) / centers.length;
    targets.forEach((obj) => {
      obj.style.left = `${targetCenter - (obj.offsetWidth / 2)}px`;
    });
  } else if (mode === "top") {
    const minTop = Math.min(...snapshots.map((entry) => entry.top));
    targets.forEach((obj) => {
      obj.style.top = `${minTop}px`;
    });
  } else {
    return false;
  }

  pushUndo(() => {
    snapshots.forEach((entry) => {
      const obj = objectById(entry.id);
      if (!obj) return;
      obj.style.left = `${entry.left}px`;
      obj.style.top = `${entry.top}px`;
    });
    syncSelectionClasses();
    setHint(t("hint.undoMoveRestored"));
  });

  return true;
}

function createRoomObject(type, x, y) {
  const template = objectCatalog[type];
  if (!template) return;

  const obj = document.createElement("div");
  obj.className = "room-object";
  obj.dataset.id = String(idCounter++);
  obj.dataset.type = type;
  obj.dataset.rotation = "0";
  obj.style.width = `${template.width}px`;
  obj.style.height = `${template.height}px`;
  obj.style.backgroundColor = template.color;
  obj.style.backgroundImage = template.image ? `url("${template.image}")` : "none";
  obj.style.backgroundSize = "cover";
  obj.style.backgroundPosition = "center";
  obj.style.backgroundRepeat = "no-repeat";
  obj.textContent = template.label;

  const rotateControls = document.createElement("div");
  rotateControls.className = "rotate-controls";

  ["tl", "tr", "bl", "br"].forEach((corner) => {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = `rotate-handle corner-${corner}`;
    handle.ariaLabel = t("label.dragToRotate");
    handle.textContent = "↻";

    handle.addEventListener("pointerdown", (event) => {
      if (window.getMouseInteractionMode?.() === "select") return;
      event.preventDefault();
      event.stopPropagation();
      selectObject(obj.dataset.id);
      rotateState = {
        id: obj.dataset.id,
        pointerId: event.pointerId,
        startAngle: getPointerAngleToObject(obj, event.clientX, event.clientY),
        startRotation: Number(obj.dataset.rotation) || 0,
      };
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!rotateState || rotateState.id !== obj.dataset.id || rotateState.pointerId !== event.pointerId) return;
      const currentAngle = getPointerAngleToObject(obj, event.clientX, event.clientY);
      const rawDelta = normalizeAngleDelta(currentAngle - rotateState.startAngle);
      const snappedDelta = Math.round(rawDelta / 15) * 15;
      let nextRotation = (rotateState.startRotation + snappedDelta) % 360;
      if (nextRotation < 0) nextRotation += 360;
      obj.dataset.rotation = String(nextRotation);
      obj.style.transform = `rotate(${nextRotation}deg)`;
    });

    handle.addEventListener("pointerup", (event) => {
      if (!rotateState || rotateState.pointerId !== event.pointerId) return;
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      const endRotation = Number(obj.dataset.rotation) || 0;
      if (endRotation !== rotateState.startRotation) {
        const savedRotation = rotateState.startRotation;
        const objId = obj.dataset.id;
        pushUndo(() => {
          const o = objectById(objId);
          if (!o) return;
          o.dataset.rotation = String(savedRotation);
          o.style.transform = `rotate(${savedRotation}deg)`;
          selectObject(objId);
          setHint(t("hint.undoRotationRestored"));
        });
      }
      setHint(t("hint.rotatedTo", { type: obj.dataset.type, degrees: obj.dataset.rotation }));
      rotateState = null;
    });

    handle.addEventListener("pointercancel", (event) => {
      if (!rotateState || rotateState.pointerId !== event.pointerId) return;
      rotateState = null;
    });

    rotateControls.appendChild(handle);
  });

  obj.appendChild(rotateControls);

  const bounds = getPlacementBounds(template.width, template.height);
  obj.style.left = `${clamp(x - template.width / 2, bounds.minLeft, bounds.maxLeft)}px`;
  obj.style.top = `${clamp(y - template.height / 2, bounds.minTop, bounds.maxTop)}px`;

  obj.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const target = event.currentTarget;

    const additiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
    if (additiveSelection) {
      selectObject(target.dataset.id, { toggle: true, append: true });
      if (!selectedIds.has(target.dataset.id)) return;
    } else if (!selectedIds.has(target.dataset.id)) {
      selectObject(target.dataset.id);
    }

    const movers = getSelectedElements();
    dragState = {
      id: target.dataset.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      movers: movers.map((objEl) => ({
        id: getSelectableId(objEl),
        startLeft: parseFloat(objEl.style.left) || 0,
        startTop: parseFloat(objEl.style.top) || 0,
      })),
    };
    target.setPointerCapture(event.pointerId);
  });

  obj.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.id !== obj.dataset.id || dragState.pointerId !== event.pointerId) return;
    const dx = (event.clientX - dragState.startX) / backgroundState.zoom;
    const dy = (event.clientY - dragState.startY) / backgroundState.zoom;
    dragState.movers.forEach((entry) => {
      const item = objectById(entry.id);
      if (!item) return;
      const b = getPlacementBounds(item.offsetWidth, item.offsetHeight);
      item.style.left = `${clamp(entry.startLeft + dx, b.minLeft, b.maxLeft)}px`;
      item.style.top = `${clamp(entry.startTop + dy, b.minTop, b.maxTop)}px`;
    });
  });

  obj.addEventListener("pointerup", (event) => {
    if (obj.hasPointerCapture(event.pointerId)) {
      obj.releasePointerCapture(event.pointerId);
    }
    if (dragState && dragState.id === obj.dataset.id && dragState.pointerId === event.pointerId) {
      const changedEntries = dragState.movers
        .map((entry) => {
          const item = objectById(entry.id);
          if (!item) return null;
          const endLeft = parseFloat(item.style.left);
          const endTop = parseFloat(item.style.top);
          if (endLeft === entry.startLeft && endTop === entry.startTop) return null;
          return {
            id: entry.id,
            startLeft: entry.startLeft,
            startTop: entry.startTop,
          };
        })
        .filter(Boolean);

      if (changedEntries.length > 0) {
        pushUndo(() => {
          changedEntries.forEach((entry) => {
            const o = objectById(entry.id);
            if (!o) return;
            o.style.left = `${entry.startLeft}px`;
            o.style.top = `${entry.startTop}px`;
          });
          deselectAll();
          changedEntries.forEach((entry, index) => {
            selectObject(entry.id, { append: index > 0 });
          });
          setHint(t("hint.undoMoveRestored"));
        });
      }
    }
    dragState = null;
  });

  obj.addEventListener("pointercancel", () => {
    dragState = null;
  });

  sceneEl.appendChild(obj);
  selectObject(obj.dataset.id);
  setHint(t("hint.objectPlaced", { label: template.label }));
  pushUndo(() => {
    obj.remove();
    if (selectedId === obj.dataset.id) selectedId = null;
    selectedIds.delete(obj.dataset.id);
    syncSelectionClasses();
    setHint(t("hint.undoObjectRemoved", { label: template.label }));
  });

  return obj;
}

function rotateSelectedObjectsAroundGroupCenter(angleDeg) {
  const targets = getSelectedObjects();
  if (targets.length < 1) return false;

  // Snapshot for undo
  const snapshots = targets.map((obj) => ({
    id: obj.dataset.id,
    left: parseFloat(obj.style.left) || 0,
    top: parseFloat(obj.style.top) || 0,
    rotation: Number(obj.dataset.rotation) || 0,
  }));

  // Compute center of each object
  const centers = targets.map((obj) => ({
    cx: (parseFloat(obj.style.left) || 0) + obj.offsetWidth / 2,
    cy: (parseFloat(obj.style.top) || 0) + obj.offsetHeight / 2,
  }));

  // Compute group centroid
  const groupCx = centers.reduce((s, c) => s + c.cx, 0) / centers.length;
  const groupCy = centers.reduce((s, c) => s + c.cy, 0) / centers.length;

  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  targets.forEach((obj, i) => {
    const { cx, cy } = centers[i];
    const dx = cx - groupCx;
    const dy = cy - groupCy;
    const newCx = groupCx + dx * cosA - dy * sinA;
    const newCy = groupCy + dx * sinA + dy * cosA;
    obj.style.left = `${newCx - obj.offsetWidth / 2}px`;
    obj.style.top = `${newCy - obj.offsetHeight / 2}px`;
    const newRot = ((Number(obj.dataset.rotation) || 0) + angleDeg + 360) % 360;
    obj.dataset.rotation = String(newRot);
    obj.style.transform = `rotate(${newRot}deg)`;
  });

  pushUndo(() => {
    snapshots.forEach((entry) => {
      const obj = objectById(entry.id);
      if (!obj) return;
      obj.style.left = `${entry.left}px`;
      obj.style.top = `${entry.top}px`;
      obj.dataset.rotation = String(entry.rotation);
      obj.style.transform = `rotate(${entry.rotation}deg)`;
    });
    syncSelectionClasses();
    setHint(t("hint.undoMoveRestored"));
  });

  return true;
}

window.getSelectedObjectIds = getSelectedObjectIds;
window.deleteSelectedObjects = deleteSelectedObjects;
window.alignSelectedObjects = alignSelectedObjects;
window.rotateSelectedObjectsAroundGroupCenter = rotateSelectedObjectsAroundGroupCenter;
window.createNoteAnnotation = createNoteAnnotation;
window.createMeasurementAnnotation = createMeasurementAnnotation;
window.createAreaMeasurementAnnotation = createAreaMeasurementAnnotation;
window.updateAreaMeasurementAnnotation = updateAreaMeasureAnnotation;
window.getSceneAnnotationsState = getSceneAnnotationsState;
window.restoreSceneAnnotationsState = restoreSceneAnnotationsState;
window.getAllSceneItems = getAllSceneItems;
window.getSelectedObjectsClipboardData = getSelectedObjectsClipboardData;
window.pasteObjectsFromClipboardData = pasteObjectsFromClipboardData;

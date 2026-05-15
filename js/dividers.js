// dividers.js — cosmetic room divider lines (state, logic, DOM, event handling)

const DIVIDER_EDGE_PADDING = 40;
let dividerIdCounter = 1;
let selectedDividerId = null;
const dividers = [];

// ---------------------------------------------------------------------------
// Selection

function getDividerById(id) {
  return dividers.find((d) => d.id === id) || null;
}

function deselectDivider() {
  if (!selectedDividerId) return;
  const divider = getDividerById(selectedDividerId);
  if (divider) {
    divider.lineEl.classList.remove("selected");
    divider.rotateTop.classList.remove("active");
    divider.rotateBottom.classList.remove("active");
  }
  selectedDividerId = null;
}

function selectDivider(id) {
  const divider = getDividerById(id);
  if (!divider) return;
  deselectAll();
  deselectDivider();
  selectedDividerId = id;
  divider.lineEl.classList.add("selected");
  divider.rotateTop.classList.add("active");
  divider.rotateBottom.classList.add("active");
}

// ---------------------------------------------------------------------------
// Geometry helpers

function getDividerCenter(divider) {
  return { x: divider.centerX, y: divider.centerY };
}

function normalizeDividerAngle(angle) {
  let a = angle;
  while (a >  90) a -= 180;
  while (a <= -90) a += 180;
  return a;
}

function getDividerNormal(divider) {
  const rad = (divider.angle * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

function clampDividerCenter(divider, x, y) {
  const bounds  = getVisibleSceneBounds();
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.maxY },
  ];
  const normal  = getDividerNormal(divider);
  const tangent = { x: -normal.y, y: normal.x };
  const padding = DIVIDER_EDGE_PADDING / backgroundState.zoom;

  const normalValues   = corners.map((c) => c.x * normal.x + c.y * normal.y);
  const tangentValue   = divider.startCenterX * tangent.x + divider.startCenterY * tangent.y;
  const clampedNormal  = clamp(
    x * normal.x + y * normal.y,
    Math.min(...normalValues) + padding,
    Math.max(...normalValues) - padding,
  );

  return {
    x: clampedNormal * normal.x + tangentValue * tangent.x,
    y: clampedNormal * normal.y + tangentValue * tangent.y,
  };
}

function moveDividerPerpendicular(divider, clientX, clientY) {
  const scenePoint = clientToSceneCoords(clientX, clientY);
  const normal     = getDividerNormal(divider);
  const deltaX     = scenePoint.x - divider.startPointerSceneX;
  const deltaY     = scenePoint.y - divider.startPointerSceneY;
  const distance   = deltaX * normal.x + deltaY * normal.y;
  const next       = clampDividerCenter(
    divider,
    divider.startCenterX + normal.x * distance,
    divider.startCenterY + normal.y * distance,
  );
  divider.centerX = next.x;
  divider.centerY = next.y;
  renderDivider(divider);
}

function getDividerPointerAngle(divider, clientX, clientY, handlePosition) {
  const scenePoint = clientToSceneCoords(clientX, clientY);
  const center     = getDividerCenter(divider);
  let dx = scenePoint.x - center.x;
  let dy = scenePoint.y - center.y;
  if (handlePosition === "end") { dx = -dx; dy = -dy; }
  return normalizeDividerAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
}

function getVisibleDividerHandlePoints(divider) {
  const dividerCenter = getDividerCenter(divider);
  const center  = sceneToCanvasCoords(dividerCenter.x, dividerCenter.y);
  const radians = (divider.angle * Math.PI) / 180;
  const dir     = { x: -Math.sin(radians), y: Math.cos(radians) };
  const width   = roomCanvas.clientWidth;
  const height  = roomCanvas.clientHeight;
  const epsilon = 0.001;
  const intersections = [];

  function addPoint(x, y) {
    const dup = intersections.some((p) => Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5);
    if (!dup) intersections.push({ x, y });
  }

  if (Math.abs(dir.x) > epsilon) {
    const tLeft  = (0     - center.x) / dir.x; const yLeft  = center.y + tLeft  * dir.y; if (yLeft  >= 0 && yLeft  <= height) addPoint(0,     yLeft);
    const tRight = (width - center.x) / dir.x; const yRight = center.y + tRight * dir.y; if (yRight >= 0 && yRight <= height) addPoint(width, yRight);
  }
  if (Math.abs(dir.y) > epsilon) {
    const tTop    = (0      - center.y) / dir.y; const xTop    = center.x + tTop    * dir.x; if (xTop    >= 0 && xTop    <= width) addPoint(xTop,    0);
    const tBottom = (height - center.y) / dir.y; const xBottom = center.x + tBottom * dir.x; if (xBottom >= 0 && xBottom <= width) addPoint(xBottom, height);
  }

  if (intersections.length < 2) {
    return [
      { x: clamp(center.x, 0, width), y: 0 },
      { x: clamp(center.x, 0, width), y: height },
    ];
  }

  intersections.sort((a, b) => a.y - b.y || a.x - b.x);
  return [intersections[0], intersections[intersections.length - 1]];
}

// ---------------------------------------------------------------------------
// Rendering

function renderDivider(divider) {
  const bgWidth    = parseFloat(backgroundImg.style.width)  || roomCanvas.clientWidth;
  const bgHeight   = parseFloat(backgroundImg.style.height) || roomCanvas.clientHeight;
  const dividerLen = Math.hypot(bgWidth, bgHeight);

  divider.lineEl.style.top    = `${divider.centerY - dividerLen / 2}px`;
  divider.lineEl.style.height = `${dividerLen}px`;
  divider.lineEl.style.left   = `${divider.centerX}px`;
  divider.lineEl.style.setProperty("--divider-angle", `${divider.angle}deg`);

  const [startPoint, endPoint] = getVisibleDividerHandlePoints(divider);
  const inset      = 18;
  const minX = inset;
  const maxX = roomCanvas.clientWidth  - inset;
  const minY = inset;
  const maxY = roomCanvas.clientHeight - inset;

  divider.rotateTop.style.left    = `${clamp(startPoint.x, minX, maxX)}px`;
  divider.rotateTop.style.top     = `${clamp(startPoint.y, minY, maxY)}px`;
  divider.rotateBottom.style.left = `${clamp(endPoint.x,   minX, maxX)}px`;
  divider.rotateBottom.style.top  = `${clamp(endPoint.y,   minY, maxY)}px`;
}

function renderAllDividers() {
  dividers.forEach(renderDivider);
}

// ---------------------------------------------------------------------------
// Create / remove

function addDivider() {
  const id     = String(dividerIdCounter++);
  const lineEl = document.createElement("div");
  lineEl.className      = "room-divider";
  lineEl.dataset.dividerId = id;
  lineEl.innerHTML = [
    '<div class="divider-hit-area" aria-hidden="true"></div>',
    '<button type="button" class="divider-handle divider-move-handle" aria-label="Drag to move divider"></button>',
  ].join("");
  sceneEl.appendChild(lineEl);

  const rotateTop = document.createElement("button");
  rotateTop.type      = "button";
  rotateTop.className = "divider-handle divider-rotate-anchor top";
  rotateTop.ariaLabel = "Drag end control to rotate divider";
  rotateTop.textContent = "↻";
  roomCanvas.appendChild(rotateTop);

  const rotateBottom = document.createElement("button");
  rotateBottom.type      = "button";
  rotateBottom.className = "divider-handle divider-rotate-anchor bottom";
  rotateBottom.ariaLabel = "Drag end control to rotate divider";
  rotateBottom.textContent = "↻";
  roomCanvas.appendChild(rotateBottom);

  const moveHandle = lineEl.querySelector(".divider-move-handle");
  const divider = {
    id,
    lineEl,
    moveHandle,
    rotateTop,
    rotateBottom,
    centerX: 0,
    centerY: 0,
    angle: 0,
    pointerId: null,
    rotatePointerId: null,
    startCenterX: 0,
    startCenterY: 0,
    startPointerSceneX: 0,
    startPointerSceneY: 0,
  };

  lineEl.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    selectDivider(divider.id);
  });

  moveHandle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    selectDivider(divider.id);
    divider.pointerId = event.pointerId;
    const sp = clientToSceneCoords(event.clientX, event.clientY);
    divider.startCenterX       = divider.centerX;
    divider.startCenterY       = divider.centerY;
    divider.startPointerSceneX = sp.x;
    divider.startPointerSceneY = sp.y;
    moveHandle.setPointerCapture(event.pointerId);
  });

  moveHandle.addEventListener("pointermove", (event) => {
    if (divider.pointerId !== event.pointerId) return;
    moveDividerPerpendicular(divider, event.clientX, event.clientY);
  });

  moveHandle.addEventListener("pointerup", (event) => {
    if (divider.pointerId !== event.pointerId) return;
    if (moveHandle.hasPointerCapture(event.pointerId)) {
      moveHandle.releasePointerCapture(event.pointerId);
    }
    if (divider.centerX !== divider.startCenterX || divider.centerY !== divider.startCenterY) {
      const savedX = divider.startCenterX;
      const savedY = divider.startCenterY;
      const divId  = divider.id;
      pushUndo(() => {
        const d = getDividerById(divId);
        if (!d) return;
        d.centerX = savedX;
        d.centerY = savedY;
        renderDivider(d);
        selectDivider(divId);
        setHint("Undo: divider position restored.");
      });
    }
    divider.pointerId = null;
  });

  moveHandle.addEventListener("pointercancel", (event) => {
    if (divider.pointerId !== event.pointerId) return;
    divider.pointerId = null;
  });

  [rotateTop, rotateBottom].forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectDivider(divider.id);
      divider.rotatePointerId = event.pointerId;
      handle.setPointerCapture(event.pointerId);
      divider.rotateStartAngle = divider.angle;
    });

    handle.addEventListener("pointermove", (event) => {
      if (divider.rotatePointerId !== event.pointerId) return;
      const position = handle === rotateBottom ? "end" : "start";
      divider.angle  = Math.round(getDividerPointerAngle(divider, event.clientX, event.clientY, position) / 15) * 15;
      renderDivider(divider);
    });

    handle.addEventListener("pointerup", (event) => {
      if (divider.rotatePointerId !== event.pointerId) return;
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      if (divider.angle !== divider.rotateStartAngle) {
        const savedAngle = divider.rotateStartAngle;
        const divId = divider.id;
        pushUndo(() => {
          const d = getDividerById(divId);
          if (!d) return;
          d.angle = savedAngle;
          renderDivider(d);
          selectDivider(divId);
          setHint("Undo: divider rotation restored.");
        });
      }
      divider.rotatePointerId = null;
      setHint(`Divider rotated to ${divider.angle} degrees.`);
    });

    handle.addEventListener("pointercancel", (event) => {
      if (divider.rotatePointerId !== event.pointerId) return;
      divider.rotatePointerId = null;
    });
  });

  dividers.push(divider);
  renderDivider(divider);
  selectDivider(divider.id);
  setHint("Divider added. Select a divider to move or rotate it.");
  pushUndo(() => {
    const idx = dividers.findIndex((d) => d.id === divider.id);
    if (idx !== -1) dividers.splice(idx, 1);
    divider.lineEl.remove();
    divider.rotateTop.remove();
    divider.rotateBottom.remove();
    if (selectedDividerId === divider.id) selectedDividerId = null;
    setHint("Undo: divider removed.");
  });

  return divider;
}

function removeSelectedDivider() {
  if (!selectedDividerId) return false;
  const index = dividers.findIndex((d) => d.id === selectedDividerId);
  if (index === -1) return false;

  const [divider] = dividers.splice(index, 1);
  divider.lineEl.remove();
  divider.rotateTop.remove();
  divider.rotateBottom.remove();
  selectedDividerId = null;
  return divider;
}

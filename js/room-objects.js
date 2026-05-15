// room-objects.js — equipment objects (state, DOM creation, drag, rotate)

const objectCatalog = window.objectCatalog;

let selectedId = null;
let idCounter  = 1;
let dragState   = null;
let rotateState = null;

// ---------------------------------------------------------------------------
// Selection

function objectById(id) {
  return roomCanvas.querySelector(`.room-object[data-id="${id}"]`);
}

function deselectAll() {
  roomCanvas.querySelectorAll(".room-object.selected").forEach((obj) => {
    obj.classList.remove("selected");
  });
  selectedId = null;
}

function selectObject(id) {
  deselectDivider();
  deselectAll();
  const target = objectById(id);
  if (!target) return;
  target.classList.add("selected");
  selectedId = id;
}

// ---------------------------------------------------------------------------
// Rotation helpers

function normalizeAngleDelta(delta) {
  let n = delta;
  while (n >  180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

function getObjectCenter(obj) {
  return {
    x: parseFloat(obj.style.left) + obj.offsetWidth  / 2,
    y: parseFloat(obj.style.top)  + obj.offsetHeight / 2,
  };
}

function getPointerAngleToObject(obj, clientX, clientY) {
  const sp     = clientToSceneCoords(clientX, clientY);
  const center = getObjectCenter(obj);
  return (Math.atan2(sp.y - center.y, sp.x - center.x) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Factory

function createRoomObject(type, x, y) {
  const template = objectCatalog[type];
  if (!template) return;

  const obj = document.createElement("div");
  obj.className       = "room-object";
  obj.dataset.id      = String(idCounter++);
  obj.dataset.type    = type;
  obj.dataset.rotation = "0";
  obj.style.width           = `${template.width}px`;
  obj.style.height          = `${template.height}px`;
  obj.style.backgroundColor = template.color;
  obj.style.backgroundImage = template.image ? `url("${template.image}")` : "none";
  obj.style.backgroundSize = "cover";
  obj.style.backgroundPosition = "center";
  obj.style.backgroundRepeat = "no-repeat";
  obj.textContent = template.label;

  // Rotate handles
  const rotateControls = document.createElement("div");
  rotateControls.className = "rotate-controls";

  ["tl", "tr", "bl", "br"].forEach((corner) => {
    const handle = document.createElement("button");
    handle.type      = "button";
    handle.className = `rotate-handle corner-${corner}`;
    handle.ariaLabel = "Drag to rotate";
    handle.textContent = "↻";

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectObject(obj.dataset.id);
      rotateState = {
        id: obj.dataset.id,
        pointerId:     event.pointerId,
        startAngle:    getPointerAngleToObject(obj, event.clientX, event.clientY),
        startRotation: Number(obj.dataset.rotation) || 0,
      };
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!rotateState || rotateState.id !== obj.dataset.id || rotateState.pointerId !== event.pointerId) return;
      const currentAngle  = getPointerAngleToObject(obj, event.clientX, event.clientY);
      const rawDelta      = normalizeAngleDelta(currentAngle - rotateState.startAngle);
      const snappedDelta  = Math.round(rawDelta / 15) * 15;
      let nextRotation    = (rotateState.startRotation + snappedDelta) % 360;
      if (nextRotation < 0) nextRotation += 360;
      obj.dataset.rotation = String(nextRotation);
      obj.style.transform  = `rotate(${nextRotation}deg)`;
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
          o.style.transform  = `rotate(${savedRotation}deg)`;
          selectObject(objId);
          setHint("Undo: rotation restored.");
        });
      }
      setHint(`Rotated ${obj.dataset.type} to ${obj.dataset.rotation} degrees.`);
      rotateState = null;
    });

    handle.addEventListener("pointercancel", (event) => {
      if (!rotateState || rotateState.pointerId !== event.pointerId) return;
      rotateState = null;
    });

    rotateControls.appendChild(handle);
  });

  obj.appendChild(rotateControls);

  // Initial placement
  const bounds = getPlacementBounds(template.width, template.height);
  obj.style.left = `${clamp(x - template.width  / 2, bounds.minLeft, bounds.maxLeft)}px`;
  obj.style.top  = `${clamp(y - template.height / 2, bounds.minTop,  bounds.maxTop)}px`;

  // Drag
  obj.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    const target = event.currentTarget;
    selectObject(target.dataset.id);
    dragState = {
      id:        target.dataset.id,
      startX:    event.clientX,
      startY:    event.clientY,
      startLeft: parseFloat(target.style.left),
      startTop:  parseFloat(target.style.top),
    };
    target.setPointerCapture(event.pointerId);
  });

  obj.addEventListener("pointermove", (event) => {
    if (!dragState || dragState.id !== obj.dataset.id) return;
    const dx = (event.clientX - dragState.startX) / backgroundState.zoom;
    const dy = (event.clientY - dragState.startY) / backgroundState.zoom;
    const b  = getPlacementBounds(obj.offsetWidth, obj.offsetHeight);
    obj.style.left = `${clamp(dragState.startLeft + dx, b.minLeft, b.maxLeft)}px`;
    obj.style.top  = `${clamp(dragState.startTop  + dy, b.minTop,  b.maxTop)}px`;
  });

  obj.addEventListener("pointerup", (event) => {
    if (obj.hasPointerCapture(event.pointerId)) {
      obj.releasePointerCapture(event.pointerId);
    }
    if (dragState && dragState.id === obj.dataset.id) {
      const endLeft = parseFloat(obj.style.left);
      const endTop  = parseFloat(obj.style.top);
      if (endLeft !== dragState.startLeft || endTop !== dragState.startTop) {
        const savedLeft = dragState.startLeft;
        const savedTop  = dragState.startTop;
        const objId     = obj.dataset.id;
        pushUndo(() => {
          const o = objectById(objId);
          if (!o) return;
          o.style.left = `${savedLeft}px`;
          o.style.top  = `${savedTop}px`;
          selectObject(objId);
          setHint("Undo: move restored.");
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
  setHint(`${template.label} placed. Drag it to move.`);
  pushUndo(() => {
    obj.remove();
    if (selectedId === obj.dataset.id) selectedId = null;
    setHint(`Undo: ${template.label} removed.`);
  });

  return obj;
}

(function initPlannerSchema(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.PlannerSchema = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createPlannerSchemaApi() {
  const CURRENT_SCHEMA_VERSION = 2;

  function toFiniteNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function cloneObjectsArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((obj) => ({
      id: obj?.id,
      type: obj?.type,
      x: toFiniteNumber(obj?.x, 0),
      y: toFiniteNumber(obj?.y, 0),
      rotation: toFiniteNumber(obj?.rotation, 0),
    }));
  }

  function cloneAnnotationsArray(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((annotation) => {
        if (annotation?.kind === "measure") {
          return {
            id: annotation?.id,
            kind: "measure",
            x1: toFiniteNumber(annotation?.x1, 0),
            y1: toFiniteNumber(annotation?.y1, 0),
            x2: toFiniteNumber(annotation?.x2, 0),
            y2: toFiniteNumber(annotation?.y2, 0),
          };
        }

        if (annotation?.kind === "area-measure") {
          const rawPts = Array.isArray(annotation?.pts) ? annotation.pts : [];
          if (rawPts.length !== 4) return null;
          const pricePerSqm = Number(annotation?.pricePerSqm);
          const totalPrice = Number(annotation?.totalPrice);
          return {
            id: annotation?.id,
            kind: "area-measure",
            pts: rawPts.map((pt) => ({
              x: toFiniteNumber(pt?.x, 0),
              y: toFiniteNumber(pt?.y, 0),
            })),
            areaName: String(annotation?.areaName || ""),
            pricePerSqm: Number.isFinite(pricePerSqm) ? pricePerSqm : null,
            totalPrice: Number.isFinite(totalPrice) ? totalPrice : null,
          };
        }

        const text = String(annotation?.text || "").trim();
        if (!text) return null;

        return {
          id: annotation?.id,
          kind: "note",
          text,
          x: toFiniteNumber(annotation?.x, 0),
          y: toFiniteNumber(annotation?.y, 0),
          width: toFiniteNumber(annotation?.width, 180),
          height: toFiniteNumber(annotation?.height, 88),
          color: String(annotation?.color || "#fff5bf"),
        };
      })
      .filter(Boolean);
  }

  function normalizeBackground(background) {
    const next = background && typeof background === "object" ? background : {};
    return {
      src: typeof next.src === "string" ? next.src : "",
      zoom: toFiniteNumber(next.zoom, 1),
      panX: toFiniteNumber(next.panX, 0),
      panY: toFiniteNumber(next.panY, 0),
      customMap: next.customMap || null,
    };
  }

  function normalizePerMapObjects(perMapObjects) {
    if (!perMapObjects || typeof perMapObjects !== "object") return {};

    const normalized = {};
    Object.entries(perMapObjects).forEach(([src, mapState]) => {
      if (typeof src !== "string" || !src) return;
      normalized[src] = {
        objects: cloneObjectsArray(mapState?.objects),
        annotations: cloneAnnotationsArray(mapState?.annotations),
      };
    });
    return normalized;
  }

  function inferInputVersion(state) {
    if (Number.isFinite(Number(state?.schemaVersion))) {
      return Number(state.schemaVersion);
    }

    if (
      state
      && typeof state === "object"
      && state.background
      && typeof state.background === "object"
      && Array.isArray(state.objects)
    ) {
      // Legacy states without schemaVersion are treated as v1.
      return 1;
    }

    return NaN;
  }

  function migrateV1ToV2(state) {
    const background = normalizeBackground(state?.background);
    const objects = cloneObjectsArray(state?.objects);
    const perMapObjects = normalizePerMapObjects(state?.perMapObjects);

    if (background.src && !perMapObjects[background.src]) {
      perMapObjects[background.src] = { objects, annotations: [] };
    }

    return {
      ...state,
      schemaVersion: 2,
      updatedAt: typeof state?.updatedAt === "string" ? state.updatedAt : new Date().toISOString(),
      background,
      objects,
      perMapObjects,
    };
  }

  function migratePlannerState(inputState) {
    if (!inputState || typeof inputState !== "object") {
      throw new Error("Planner state must be an object");
    }

    let version = inferInputVersion(inputState);
    if (!Number.isFinite(version)) {
      throw new Error("Planner state schema version is missing or invalid");
    }
    if (version > CURRENT_SCHEMA_VERSION) {
      throw new Error("Planner state schema version is newer than supported");
    }

    let migrated = { ...inputState };
    while (version < CURRENT_SCHEMA_VERSION) {
      if (version === 1) {
        migrated = migrateV1ToV2(migrated);
        version = 2;
        continue;
      }
      throw new Error(`No migration path from schema version ${version}`);
    }

    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
    return migrated;
  }

  function isValidPlannerState(state) {
    return Boolean(
      state
      && typeof state === "object"
      && Number(state.schemaVersion) === CURRENT_SCHEMA_VERSION
      && typeof state.updatedAt === "string"
      && state.background
      && typeof state.background.src === "string"
      && Number.isFinite(state.background.zoom)
      && Number.isFinite(state.background.panX)
      && Number.isFinite(state.background.panY)
      && Array.isArray(state.objects)
      && (!state.customEquipment || Array.isArray(state.customEquipment))
      && state.perMapObjects
      && typeof state.perMapObjects === "object"
    );
  }

  return {
    CURRENT_SCHEMA_VERSION,
    migratePlannerState,
    isValidPlannerState,
  };
}));
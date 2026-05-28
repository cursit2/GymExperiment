const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CURRENT_SCHEMA_VERSION,
  migratePlannerState,
  isValidPlannerState,
} = require("../js/planner-schema.js");

test("migrates v1 save to current schema and carries active-map objects", () => {
  const input = {
    schemaVersion: 1,
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: 1,
      panX: 10,
      panY: -5,
      customMap: null,
    },
    objects: [
      { id: "1", type: "beam", x: 100, y: 200, rotation: 15 },
    ],
  };

  const migrated = migratePlannerState(input);

  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.ok(migrated.perMapObjects);
  assert.deepEqual(
    migrated.perMapObjects["assets/gym-floor-topdown-4000x7000cm.svg"].objects,
    input.objects,
  );
  assert.equal(isValidPlannerState(migrated), true);
});

test("migrates legacy state with no schemaVersion", () => {
  const input = {
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: 1,
      panX: 0,
      panY: 0,
      customMap: null,
    },
    objects: [],
  };

  const migrated = migratePlannerState(input);

  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(isValidPlannerState(migrated), true);
});

test("preserves existing per-map object states during migration", () => {
  const input = {
    schemaVersion: 1,
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: 1,
      panX: 0,
      panY: 0,
      customMap: null,
    },
    objects: [{ id: "1", type: "beam", x: 10, y: 10, rotation: 0 }],
    perMapObjects: {
      "assets/other-map.png": {
        objects: [{ id: "2", type: "vault", x: 20, y: 30, rotation: 90 }],
      },
    },
  };

  const migrated = migratePlannerState(input);

  assert.deepEqual(migrated.perMapObjects["assets/other-map.png"].objects, [
    { id: "2", type: "vault", x: 20, y: 30, rotation: 90 },
  ]);
  assert.deepEqual(
    migrated.perMapObjects["assets/gym-floor-topdown-4000x7000cm.svg"].objects,
    [{ id: "1", type: "beam", x: 10, y: 10, rotation: 0 }],
  );
});

test("preserves per-map note annotation size and color during migration", () => {
  const input = {
    schemaVersion: 1,
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: 1,
      panX: 0,
      panY: 0,
      customMap: null,
    },
    objects: [],
    perMapObjects: {
      "assets/gym-floor-topdown-4000x7000cm.svg": {
        objects: [],
        annotations: [
          {
            id: "a1",
            kind: "note",
            text: "Landing zone",
            x: 120,
            y: 240,
            width: 260,
            height: 140,
            color: "#ffd5e5",
          },
        ],
      },
    },
  };

  const migrated = migratePlannerState(input);

  assert.deepEqual(
    migrated.perMapObjects["assets/gym-floor-topdown-4000x7000cm.svg"].annotations,
    [
      {
        id: "a1",
        kind: "note",
        text: "Landing zone",
        x: 120,
        y: 240,
        width: 260,
        height: 140,
        color: "#ffd5e5",
      },
    ],
  );
});

test("rejects future schema versions", () => {
  const input = {
    schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: 1,
      panX: 0,
      panY: 0,
      customMap: null,
    },
    objects: [],
    perMapObjects: {},
  };

  assert.throws(() => migratePlannerState(input), /newer than supported/);
});

test("invalid shape fails validation", () => {
  const state = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: "2026-05-28T10:00:00.000Z",
    background: {
      src: "assets/gym-floor-topdown-4000x7000cm.svg",
      zoom: NaN,
      panX: 0,
      panY: 0,
      customMap: null,
    },
    objects: [],
    perMapObjects: {},
  };

  assert.equal(isValidPlannerState(state), false);
});

const DEFAULT_OBJECT_CATALOG = {
  bars:        { label: "Bars",        width: 240,  height: 120,  color: "#b38d58", image: "assets/equipment/bars.svg" },
  beam:        { label: "Beam",        width: 500,  height: 20,   color: "#c7a36f", image: "assets/equipment/beam.svg" },
  boxVault:    { label: "Box Vault",   width: 120,  height: 90,   color: "#a865cf", image: "assets/equipment/box-vault.svg" },
  floor:       { label: "Floor",       width: 1200, height: 1200, color: "#9ec8d8", image: "assets/equipment/floor.svg" },
  springboard: { label: "Springboard", width: 60,   height: 120,  color: "#d39a5f", image: "assets/equipment/springboard.svg" },
  vault:       { label: "Vault",       width: 100,  height: 120,  color: "#d9a675", image: "assets/equipment/vault.svg" },
  mat:         { label: "Mat",         width: 200,  height: 120,  color: "#8ec2a2", image: "assets/equipment/mat.svg" },
};

window.objectCatalog = { ...DEFAULT_OBJECT_CATALOG };

function slugifyEquipmentName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "custom-item";
}

function toPositiveCm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 10 || rounded > 10000) return null;
  return rounded;
}

function isHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value));
}

function ensurePaletteButton(typeKey, label) {
  const palette = document.getElementById("palette");
  if (!palette) return;
  let btn = palette.querySelector(`.palette-item[data-type="${typeKey}"]`);
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "palette-item";
    btn.draggable = true;
    btn.dataset.type = typeKey;
    palette.appendChild(btn);
  }
  btn.textContent = label;
  btn.classList.toggle("custom-equipment", Boolean(window.objectCatalog[typeKey]?.custom));
}

function removePaletteButton(typeKey) {
  const palette = document.getElementById("palette");
  if (!palette) return;
  const btn = palette.querySelector(`.palette-item[data-type="${typeKey}"]`);
  if (btn) btn.remove();
}

function upsertCustomEquipmentItem(input) {
  const name = String(input?.name || "").trim();
  const length = toPositiveCm(input?.length);
  const width = toPositiveCm(input?.width);
  const color = String(input?.color || "").trim();

  if (!name) {
    throw new Error("Equipment name is required.");
  }
  if (!length || !width) {
    throw new Error("Length and width must be between 10 and 10,000 cm.");
  }
  if (!isHexColor(color)) {
    throw new Error("Color must be a valid hex value.");
  }

  const providedKey = String(input?.key || "").trim();
  const baseKey = providedKey || `custom-${slugifyEquipmentName(name)}`;

  let key = baseKey;
  if (!window.objectCatalog[key] || window.objectCatalog[key].custom) {
    // keep key
  } else {
    let suffix = 2;
    while (window.objectCatalog[`${baseKey}-${suffix}`]) {
      suffix += 1;
    }
    key = `${baseKey}-${suffix}`;
  }

  window.objectCatalog[key] = {
    label: name,
    width,
    height: length,
    color,
    custom: true,
  };

  ensurePaletteButton(key, name);
  return key;
}

function getCustomEquipmentCatalog() {
  return Object.entries(window.objectCatalog)
    .filter(([, item]) => Boolean(item?.custom))
    .map(([key, item]) => ({
      key,
      name: item.label,
      length: item.height,
      width: item.width,
      color: item.color,
    }));
}

function updateCustomEquipmentItem(key, changes) {
  const existing = window.objectCatalog[key];
  if (!existing || !existing.custom) {
    throw new Error("Select a custom equipment item to edit.");
  }

  const name = String(changes?.name ?? existing.label).trim();
  const length = toPositiveCm(changes?.length ?? existing.height);
  const width = toPositiveCm(changes?.width ?? existing.width);
  const color = String(changes?.color ?? existing.color).trim();

  if (!name) {
    throw new Error("Equipment name cannot be empty.");
  }
  if (!length || !width) {
    throw new Error("Length and width must be between 10 and 10,000 cm.");
  }
  if (!isHexColor(color)) {
    throw new Error("Color must be a valid hex value.");
  }

  existing.label = name;
  existing.height = length;
  existing.width = width;
  existing.color = color;
  ensurePaletteButton(key, name);
  return key;
}

function deleteCustomEquipmentItem(key) {
  const existing = window.objectCatalog[key];
  if (!existing || !existing.custom) {
    throw new Error("Select a custom equipment item to delete.");
  }
  delete window.objectCatalog[key];
  removePaletteButton(key);
}

function resetCustomEquipmentCatalog() {
  getCustomEquipmentCatalog().forEach((item) => {
    delete window.objectCatalog[item.key];
    removePaletteButton(item.key);
  });
}

window.upsertCustomEquipmentItem = upsertCustomEquipmentItem;
window.getCustomEquipmentCatalog = getCustomEquipmentCatalog;
window.updateCustomEquipmentItem = updateCustomEquipmentItem;
window.deleteCustomEquipmentItem = deleteCustomEquipmentItem;
window.resetCustomEquipmentCatalog = resetCustomEquipmentCatalog;

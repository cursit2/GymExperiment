// server.js — Static file server with persistent saves API
// Serves the app and stores planner saves in the saves/ folder on disk.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = parseInt(process.env.PORT || '8080', 10);
const ROOT      = __dirname;
const SAVES_DIR = path.join(ROOT, 'saves');
const LAYOUTS_DIR = path.join(SAVES_DIR, 'layouts');
const MAPS_INDEX_PATH = path.join(SAVES_DIR, 'maps-index.json');
const ASSETS_DIR = path.join(ROOT, 'assets');
const MAX_SAVE_BYTES = 50 * 1024 * 1024;
const BACKGROUND_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);
const BACKGROUND_EXCLUDED_DIRS = new Set(['equipment']);

if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}
if (!fs.existsSync(LAYOUTS_DIR)) {
  fs.mkdirSync(LAYOUTS_DIR, { recursive: true });
}
if (!fs.existsSync(MAPS_INDEX_PATH)) {
  fs.writeFileSync(MAPS_INDEX_PATH, '[]', 'utf8');
}

const MIME_TYPES = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css',
  '.js':    'application/javascript',
  '.json':  'application/json',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
};

// Only allow alphanumeric, dash, underscore — prevents path traversal in save names.
function sanitizeName(name) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(name) ? name : null;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readMapsIndex() {
  try {
    const raw = fs.readFileSync(MAPS_INDEX_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMapsIndex(entries) {
  fs.writeFileSync(MAPS_INDEX_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

function canonicalMapLabel(entry) {
  const src = typeof entry?.src === 'string' ? entry.src : '';
  const customName = String(entry?.customMap?.name || '').trim();
  if (customName) return customName;

  const knownLabels = {
    'assets/gym-floor-topdown-4000x7000cm.svg': 'Gym Floor (2 Courts)',
  };
  if (knownLabels[src]) return knownLabels[src];
  if (src) return toTitleCaseLabel(path.basename(src));
  return String(entry?.saveName || entry?.id || 'Untitled Map');
}

function normalizeMapsIndex() {
  const maps = readMapsIndex();
  let changed = false;

  const normalized = maps.map((entry) => {
    const next = { ...entry };
    const nextLabel = canonicalMapLabel(next);
    if (next.label !== nextLabel) {
      next.label = nextLabel;
      changed = true;
    }
    if (!next.id && next.saveName) {
      next.id = next.saveName;
      changed = true;
    }
    return next;
  });

  if (changed) writeMapsIndex(normalized);
}

function upsertMapIndexEntryFromState(saveName, parsedState) {
  const background = parsedState?.background || {};
  const src = typeof background.src === 'string' ? background.src : '';
  const customNameRaw = String(background?.customMap?.name || '').trim();
  const label = customNameRaw
    || canonicalMapLabel({ src, saveName });

  const maps = readMapsIndex();
  const nextEntry = {
    id: saveName,
    saveName,
    label,
    src,
    updatedAt: parsedState?.updatedAt || new Date().toISOString(),
    customMap: background?.customMap || null,
  };

  const idx = maps.findIndex((entry) => entry.id === saveName);
  if (idx >= 0) {
    maps[idx] = { ...maps[idx], ...nextEntry };
  } else {
    maps.push(nextEntry);
  }

  maps.sort((a, b) => (Date.parse(b.updatedAt || 0) || 0) - (Date.parse(a.updatedAt || 0) || 0));
  writeMapsIndex(maps);
}

function migrateLegacyRootSaves() {
  const entries = fs.readdirSync(SAVES_DIR, { withFileTypes: true });
  entries.forEach((entry) => {
    if (!entry.isFile()) return;
    const lower = entry.name.toLowerCase();
    if (!lower.endsWith('.json')) return;
    if (entry.name === path.basename(MAPS_INDEX_PATH)) return;

    const saveName = entry.name.slice(0, -5);
    const legacyPath = path.join(SAVES_DIR, entry.name);
    const layoutPath = path.join(LAYOUTS_DIR, `${saveName}.json`);

    try {
      const raw = fs.readFileSync(legacyPath, 'utf8');
      const parsed = JSON.parse(raw);
      fs.writeFileSync(layoutPath, raw, 'utf8');
      upsertMapIndexEntryFromState(saveName, parsed);
      fs.unlinkSync(legacyPath);
    } catch {
      // Leave unreadable files untouched.
    }
  });
}

migrateLegacyRootSaves();
normalizeMapsIndex();

function toTitleCaseLabel(value) {
  const base = value.replace(/\.[^.]+$/, '');
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function inferDimensionsFromFileName(fileName) {
  const match = fileName.match(/(\d+)x(\d+)cm/i) || fileName.match(/(\d+)x(\d+)/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function listBackgroundFiles() {
  const results = [];
  const seen = new Set();

  function walkDirectory(dirPath, relDir = '') {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) return;

      const nextRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const nextAbs = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (BACKGROUND_EXCLUDED_DIRS.has(entry.name.toLowerCase())) return;
        walkDirectory(nextAbs, nextRel);
        return;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!BACKGROUND_EXTENSIONS.has(ext)) return;

      const src = `assets/${nextRel.replace(/\\/g, '/')}`;
      if (seen.has(src)) return;
      seen.add(src);

      const inferred = inferDimensionsFromFileName(entry.name);
      results.push({
        src,
        label: toTitleCaseLabel(nextRel),
        width: inferred?.width || null,
        height: inferred?.height || null,
      });
    });
  }

  walkDirectory(ASSETS_DIR);
  return results.sort((a, b) => a.src.localeCompare(b.src));
}

function listSavedMaps() {
  const entries = readMapsIndex();
  return entries.sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || 0) || 0;
    return bTime - aTime;
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlPath = new URL(req.url, `http://localhost`).pathname;

  // --- API: list saves ---
  if (urlPath === '/api/saves' && req.method === 'GET') {
    fs.readdir(LAYOUTS_DIR, (err, files) => {
      if (err) return json(res, 500, { error: 'Could not list saves' });
      json(res, 200, files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
    });
    return;
  }

  // --- API: list background images discoverable by the app ---
  if (urlPath === '/api/backgrounds' && req.method === 'GET') {
    try {
      return json(res, 200, listBackgroundFiles());
    } catch {
      return json(res, 500, { error: 'Could not list backgrounds' });
    }
  }

  // --- API: list saved map entries from planner saves ---
  if (urlPath === '/api/saved-maps' && req.method === 'GET') {
    try {
      return json(res, 200, listSavedMaps());
    } catch {
      return json(res, 500, { error: 'Could not list saved maps' });
    }
  }

  // --- API: get / save / delete a named save ---
  const saveMatch = urlPath.match(/^\/api\/saves\/([^/]+)$/);
  if (saveMatch) {
    const name = sanitizeName(decodeURIComponent(saveMatch[1]));
    if (!name) return json(res, 400, { error: 'Invalid save name' });

    const filePath = path.join(LAYOUTS_DIR, `${name}.json`);

    if (req.method === 'GET') {
      serveFile(res, filePath);
      return;
    }

    if (req.method === 'POST') {
      const chunks = [];
      let totalBytes = 0;

      req.on('data', chunk => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_SAVE_BYTES) {
          json(res, 413, { error: 'Save payload too large' });
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try {
          parsed = JSON.parse(body);
        } catch {
          return json(res, 400, { error: 'Invalid JSON' });
        }
        fs.writeFile(filePath, body, 'utf8', err => {
          if (err) return json(res, 500, { error: 'Write failed' });
          try {
            upsertMapIndexEntryFromState(name, parsed);
          } catch {
            // Layout save succeeded; ignore index write failure.
          }
          json(res, 200, { ok: true });
        });
      });

      req.on('error', () => {
        if (!res.headersSent) {
          json(res, 400, { error: 'Request failed' });
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') return json(res, 500, { error: 'Delete failed' });
        try {
          const maps = readMapsIndex().filter((entry) => entry.id !== name && entry.saveName !== name);
          writeMapsIndex(maps);
        } catch {
          // Layout delete succeeded; ignore index cleanup failure.
        }
        json(res, 200, { ok: true });
      });
      return;
    }
  }

  // --- Static file serving ---
  let filePath = path.resolve(ROOT, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));

  // Security: reject any path that escapes the project root.
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    serveFile(res, filePath);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`GymPlanner server running on port ${PORT}`);
});

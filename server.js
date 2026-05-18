// server.js — Static file server with persistent saves API
// Serves the app and stores planner saves in the saves/ folder on disk.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = parseInt(process.env.PORT || '8080', 10);
const ROOT      = __dirname;
const SAVES_DIR = path.join(ROOT, 'saves');

if (!fs.existsSync(SAVES_DIR)) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const urlPath = new URL(req.url, `http://localhost`).pathname;

  // --- API: list saves ---
  if (urlPath === '/api/saves' && req.method === 'GET') {
    fs.readdir(SAVES_DIR, (err, files) => {
      if (err) return json(res, 500, { error: 'Could not list saves' });
      json(res, 200, files.filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
    });
    return;
  }

  // --- API: get / save / delete a named save ---
  const saveMatch = urlPath.match(/^\/api\/saves\/([^/]+)$/);
  if (saveMatch) {
    const name = sanitizeName(decodeURIComponent(saveMatch[1]));
    if (!name) return json(res, 400, { error: 'Invalid save name' });

    const filePath = path.join(SAVES_DIR, `${name}.json`);

    if (req.method === 'GET') {
      serveFile(res, filePath);
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 10_000_000) req.destroy(); });
      req.on('end', () => {
        try { JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
        fs.writeFile(filePath, body, 'utf8', err => {
          if (err) return json(res, 500, { error: 'Write failed' });
          json(res, 200, { ok: true });
        });
      });
      return;
    }

    if (req.method === 'DELETE') {
      fs.unlink(filePath, err => {
        if (err && err.code !== 'ENOENT') return json(res, 500, { error: 'Delete failed' });
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

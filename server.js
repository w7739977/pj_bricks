const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3013;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // 安全：禁止路径穿越
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url.includes('..')) { res.writeHead(400); res.end('Bad Request'); return; }

  let filePath = url === '/' ? '/index.html' : url;
  const full = path.join(ROOT, filePath);
  if (!full.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`pj_bricks game running at http://localhost:${PORT}`);
});

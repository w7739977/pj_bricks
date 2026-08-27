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

  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(full).toLowerCase();
    const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ETag: etag,
      'Last-Modified': st.mtime.toUTCString(),
    });
    fs.readFile(full, (readErr, data) => {
      if (readErr) { res.writeHead(500); res.end('Internal Error'); return; }
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`pj_bricks game running at http://localhost:${PORT}`);
});

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.env.PORT || 3013);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be 1–65535');
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let pathname;
  try {pathname=decodeURIComponent(req.url.split('?')[0]);}
  catch {res.writeHead(400);res.end('Bad Request');return;}
  if (pathname.includes('\0')) {res.writeHead(400);res.end('Bad Request');return;}
  const full=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if (!full.startsWith(ROOT+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(full,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not Found');return;}
    const etag=`W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    if(req.headers['if-none-match']===etag){res.writeHead(304,{ETag:etag,'Cache-Control':'no-cache'});res.end();return;}
    const headers={'Content-Type':MIME[path.extname(full).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache',ETag:etag,'X-Content-Type-Options':'nosniff'};
    if(req.method==='HEAD'){res.writeHead(200,headers);res.end();return;}
    fs.readFile(full,(readError,data)=>{
      if(readError){res.writeHead(500);res.end('Internal Error');return;}
      res.writeHead(200,headers);res.end(data);
    });
  });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`pj_bricks: http://localhost:${PORT}`));

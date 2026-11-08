import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(process.env.GAME_ROOT || path.join(root,'../..'));
const dist=path.join(game,'dist');
const reports=path.resolve(process.env.LAB_OUTPUT || path.join(root,'../../test-artifacts/performance'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method==='POST' && url.pathname==='/__lab/report') {
      if(req.headers.origin!==`http://${req.headers.host}`) {res.writeHead(403);res.end();return;}
      let data=''; for await(const chunk of req) {data+=chunk; if(data.length>1000000) {res.writeHead(413);res.end();return;}}
      const report=JSON.parse(data); const name=`session-${Date.now()}.json`;
      await mkdir(reports,{recursive:true});
      await writeFile(path.join(reports,name),JSON.stringify(report,null,2));
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:name}));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const route=decodeURIComponent(url.pathname);
    const file=route==='/__lab/probe.js'?path.join(root,'probe.js'):path.resolve(dist,'.'+(route==='/'?'/index.html':route));
    if(file!==path.join(root,'probe.js')&&!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
    let data=await readFile(file);
    if(process.env.PROFILE==='1' && /\/game\/(board|interaction|move-animation)\.js$/.test(file)){
      const module=path.basename(file);let source=data.toString();
      const names=module==='board.js'?[...source.matchAll(/export function (\w+)\(/g)].map(m=>m[1]):module==='interaction.js'?['onPointerDown','handleDragMove','onPointerUp','syncDOM','updateDragTrace','refreshDragPreview','measurePitch','shakeSameEmoji','afterEliminate','eliminate','handleDeadlock']:['prepareFollow','follow','settleFollow','animate'];
      for(const name of names){
        const token=`function ${name}(`;
        if(!source.includes(token)||source.includes('async '+token))continue;
        // Wrapper stays in the same lexical scope, including nested animator functions.
        const wrapper=`function ${name}(...args){const t=performance.now();try{return __profile_${name}(...args)}finally{const spans=(window.__labSpans ||= {});const a=(spans[${JSON.stringify(module+':'+name)}] ||= []);a.push(performance.now()-t);if(a.length>20000)a.shift();}}\nfunction __profile_${name}(`;
        source=source.replace(token,wrapper);
      }
      data=Buffer.from(source);
    }
    if(route==='/' || route==='/index.html') data=Buffer.from(data.toString().replace('</body>','<script type="module" src="/__lab/probe.js"></script></body>'));
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch(error) {res.writeHead(error.code==='ENOENT'?404:500);res.end('Test server error');}
});
server.listen(Number(process.env.PORT||3014),'127.0.0.1',()=>console.log(`Game Test Lab: http://127.0.0.1:${server.address().port} (source: ${game})`));

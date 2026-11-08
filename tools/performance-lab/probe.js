// Game state remains private. Controlled replay uses explicitly marked DOM events.
const style=document.createElement('style');
style.textContent=`#test-lab{position:fixed;top:8px;left:8px;z-index:999999;background:#13271ff2;color:#fff;padding:10px;font:12px/1.5 monospace;width:280px;border-radius:8px;box-shadow:0 2px 8px #0005}#test-lab button{font:inherit;margin:3px;padding:4px;cursor:pointer}#test-lab pre{white-space:pre-wrap;margin:4px 0}html.lab-lite .veg{filter:none!important;animation:none!important}html.lab-lite .tile-piece{box-shadow:none!important}`;
document.head.append(style);
style.textContent+='html.lab-no-filter .veg{filter:none!important}html.lab-no-shadow .tile-piece{box-shadow:none!important}html.lab-no-idle .veg{animation:none!important}';
style.textContent+='html.lab-pause-idle .cell:not(.empty):nth-child(7n+1):not(.pop):not(.shake) .veg{animation:garden-breathe 4.6s steps(3,end) var(--idle-delay,0s) infinite!important}html.lab-pause-idle .board.gesture-active .veg{animation-play-state:paused!important}';
style.textContent+='html.lab-fix .veg{filter:none!important;animation:none!important}';
const panel=document.createElement('aside');panel.id='test-lab';
panel.innerHTML='<b>游戏测试实验室 · pj_bricks</b><pre id="lab-state">准备采样</pre><button id="lab-save">保存报告</button><button id="lab-lite">A/B：简化特效</button><button id="lab-clear">清空采样</button><pre id="lab-last"></pre>';
document.body.append(panel);
const fold=document.createElement('button');fold.textContent='收起面板';panel.prepend(fold);
fold.onclick=()=>{const collapsed=panel.classList.toggle('collapsed');for(const el of panel.children)if(el!==fold)el.hidden=collapsed;fold.textContent=collapsed?'展开测试面板':'收起面板';panel.style.width=collapsed?'auto':'280px';};
const state=panel.querySelector('#lab-state'),last=panel.querySelector('#lab-last');
let sessions=[],active=null,prev=null,baseline=[],seq=0,pending=[],settling=0;
let replayArmed=false;
const toolGuard=new URLSearchParams(location.search).get('tool')==='1';
let frameHistory=[];
const arm=document.createElement('button');arm.textContent='启用持续拖动回放';panel.append(arm);
arm.onclick=()=>{replayArmed=true;arm.textContent='已启用：长按有空位行的棋子 5 秒';};
for(const [label,cls] of [['原版',''],['仅关滤镜','lab-no-filter'],['仅关阴影','lab-no-shadow'],['仅关空闲动画','lab-no-idle'],['暂停替代重启动画','lab-pause-idle'],['修正：保留棋子阴影','lab-fix']]){
  const button=document.createElement('button');button.textContent='实验：'+label;panel.append(button);
  button.onclick=()=>{document.documentElement.classList.remove('lab-lite','lab-no-filter','lab-no-shadow','lab-no-idle','lab-pause-idle','lab-fix');if(cls)document.documentElement.classList.add(cls);last.textContent='当前实验：'+label;};
}
const errors=[],longTasks=[],events=[];
const percentile=(a,p)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null;
const stats=a=>({count:a.length,mean:a.length?a.reduce((a,b)=>a+b,0)/a.length:null,p95:percentile(a,.95),max:a.length?Math.max(...a):null});
const round=n=>n===null?'—':n.toFixed(1);
const cells=()=>[...document.querySelectorAll('#board .cell')].map(el=>({r:+el.dataset.r,c:+el.dataset.c,icon:el.dataset.rendered||null}));
window.addEventListener('error',e=>errors.push({message:e.message,time:performance.now()}));
window.addEventListener('unhandledrejection',e=>errors.push({message:String(e.reason),time:performance.now()}));
for(const [type,sink] of [['longtask',longTasks],['event',events]]) {
  try {new PerformanceObserver(list=>{for(const e of list.getEntries())sink.push(e.toJSON());if(sink.length>5000)sink.splice(0,sink.length-5000)}).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});} catch {}
}
function frame(t){
  if(document.hidden){prev=null;pending=[];requestAnimationFrame(frame);return;}
  if(prev!==null){const dt=t-prev;frameHistory.push({t,dt});if(frameHistory.length>1800)frameHistory.shift();if(active)active.frames.push(dt);else {baseline.push(dt);if(baseline.length>300)baseline.shift();}}
  if(active)for(const time of pending)active.inputToRAF.push(Math.max(0,performance.now()-time));
  pending=[];prev=t;requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('pointerdown',e=>{
  const cell=e.target.closest?.('#board .cell:not(.empty)');
  if(!cell||document.querySelector('#hintBtn')?.disabled)return;
  active={id:++seq,pointerId:e.pointerId,type:e.pointerType,trusted:e.isTrusted,start:performance.now(),variant:document.documentElement.classList.contains('lab-lite')?'lite':'original',cell:{r:+cell.dataset.r,c:+cell.dataset.c},before:cells(),frames:[],inputToRAF:[],dispatchLag:[],moves:0,startXY:[e.clientX,e.clientY],maxDistance:0,baseline:stats(baseline)};
  active.processing=[];active.syntheticMoves=0;active.trustedMoves=0;active.toolGuard=toolGuard;active.ignoredNative=[];
  active.variant=[...document.documentElement.classList].filter(c=>/^lab-/.test(c)).join('+')||'original';
  if(replayArmed){
    replayArmed=false;arm.textContent='启用持续拖动回放';active.inputMode='trusted hold + synthetic frame-paced moves';
    const sample=active,x=e.clientX,y=e.clientY,id=e.pointerId,pitch=cell.getBoundingClientRect().width+2,start=performance.now();
    function replay(){
      if(active!==sample)return;
      const elapsed=performance.now()-start;
      if(elapsed<4400){
        const offset=elapsed<4200?.8*pitch*(1-Math.cos(elapsed*Math.PI*2/1400)):1.5*pitch*Math.min(1,(elapsed-4200)/180);
        sample.lastReplay={x:x+offset,y};
        document.querySelector('#board').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:id,pointerType:'mouse',buttons:1,clientX:x+offset,clientY:y}));
        requestAnimationFrame(replay);
      }
    }
    requestAnimationFrame(replay);
  } else active.inputMode='native';
  prev=null;
},true);
window.addEventListener('pointermove',e=>{
  if(!active||e.pointerId!==active.pointerId)return;
  if(toolGuard&&e.isTrusted){active.ignoredNative.push({x:e.clientX,y:e.clientY,t:performance.now()});e.stopImmediatePropagation();return;}
  active.eventStart=performance.now();if(e.isTrusted)active.trustedMoves++;else active.syntheticMoves++;
  active.moves++;active.maxDistance=Math.max(active.maxDistance,Math.hypot(e.clientX-active.startXY[0],e.clientY-active.startXY[1]));
  active.dispatchLag.push(Math.max(0,performance.now()-e.timeStamp));pending.push(performance.now());
},true);
window.addEventListener('pointermove',e=>{if(active&&e.pointerId===active.pointerId)active.processing.push(performance.now()-active.eventStart);});
// Preserve replay's release coordinate instead of the stationary native hold point.
window.addEventListener('pointerup',e=>{if(e.isTrusted&&active&&(active.lastReplay||toolGuard)){const p=active.lastReplay||{x:active.startXY[0],y:active.startXY[1]};e.stopImmediatePropagation();document.querySelector('#board').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:e.pointerId,pointerType:'mouse',buttons:0,clientX:p.x,clientY:p.y}));}},true);
function finish(e){
  if(!active||e.pointerId!==active.pointerId)return;
  const a=active;active=null;pending=[];a.end=performance.now();a.duration=a.end-a.start;a.cancelled=e.type!=='pointerup';
  settling++;
  // Include commit/revert and deadlock checks for one second after release.
  setTimeout(()=>{
    a.after=cells();a.frameStats=stats(a.frames);a.dispatchStats=stats(a.dispatchLag);a.inputToRAFStats=stats(a.inputToRAF);
    a.processingStats=stats(a.processing);
    a.releaseFrames=frameHistory.filter(f=>f.t>a.end&&f.t<a.end+1000).map(f=>f.dt);a.releaseStats=stats(a.releaseFrames);
    const period=a.baseline.p95||16.67;a.slowFrames=a.frames.filter(x=>x>period*1.5).length;
    a.releaseSlowFrames=a.releaseFrames.filter(x=>x>period*1.5).length;
    a.longTasks=longTasks.filter(t=>t.startTime<a.end+1000&&t.startTime+t.duration>a.start);
    a.eventTiming=events.filter(t=>t.startTime>=a.start&&t.startTime<=a.end+1000);
    a.movedLayerObserved=Boolean(a.layerSeen);a.kind=a.maxDistance>8?'drag':'click';
    a.verdict=a.cancelled?'cancelled':a.kind!=='drag'?'functional observation':a.frames.length<30||a.moves<10||!a.layerSeen?'insufficient samples':a.slowFrames/a.frames.length>.05||a.longTasks.length||a.releaseStats.max>50?'jank observed':'no jank observed in this sample';
    settling--;
    sessions.push(a);last.textContent=`#${a.id} ${a.kind} ${a.variant}\n${a.verdict}\nrAF P95 ${round(a.frameStats.p95)}ms · 慢帧 ${a.slowFrames}/${a.frames.length}\n松手最大帧间隔 ${round(a.releaseStats.max)}ms\n长任务 ${a.longTasks.length} · 移动事件 ${a.moves}`;
  },1100);
}
window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
window.addEventListener('blur',()=>{if(active)finish({pointerId:active.pointerId,type:'blur'})});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)finish({pointerId:active.pointerId,type:'hidden'})});
setInterval(()=>{if(active?.maxDistance>8)active.layerSeen ||= !!document.querySelector('.drag-layer');state.textContent=`样本 ${sessions.length} · 异常 ${errors.length}\n${active?`正在操作：${active.moves} 个移动事件`:'每次拖动建议持续 2 秒以上'}\n空闲 rAF P95 ${round(stats(baseline).p95)}ms\n此指标不是 GPU 呈现帧率`;},250);
panel.querySelector('#lab-lite').onclick=()=>{document.documentElement.classList.toggle('lab-lite');panel.querySelector('#lab-lite').textContent=document.documentElement.classList.contains('lab-lite')?'A/B：恢复原特效':'A/B：简化特效';};
panel.querySelector('#lab-clear').onclick=()=>{if(active)return;sessions=[];last.textContent='采样已清空';};
panel.querySelector('#lab-save').onclick=async()=>{
  if(active||settling){last.textContent='操作仍在记录，请松手后等待 1.1 秒再保存';return;}
  const report={schemaVersion:3,createdAt:new Date().toISOString(),game:'pj_bricks',url:location.href,userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},supports:{longtask:PerformanceObserver.supportedEntryTypes.includes('longtask'),event:PerformanceObserver.supportedEntryTypes.includes('event')},resources:performance.getEntriesByType('resource').filter(e=>e.name.startsWith(location.origin+'/')).map(e=>({name:e.name,duration:e.duration,transferSize:e.transferSize,startTime:e.startTime})),navigation:performance.getEntriesByType('navigation').map(e=>({domContentLoaded:e.domContentLoadedEventEnd,load:e.loadEventEnd,response:e.responseEnd})),notes:['inputMode 和 syntheticMoves/trustedMoves 标识回放来源。','rAF 和输入至下一帧回调不是 GPU 呈现帧率或完整端到端输入延迟。','少于30帧或10个移动事件的拖动不足以作性能结论；后台标签页样本取消。','longTasks 包含松手后1秒；A/B 特效开关仅作用于测试页。'],spans:window.__labSpans||null,sessions,errors};
  if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname)){
    let output=panel.querySelector('#lab-report');if(!output){output=document.createElement('textarea');output.id='lab-report';output.readOnly=true;output.setAttribute('aria-label','性能报告 JSON');output.style.cssText='width:100%;height:80px';panel.append(output);}
    output.value=JSON.stringify(report);last.textContent='线上采样报告已生成（仅本页，不上传服务器）';return;
  }
  try {const response=await fetch('/__lab/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(response.status);last.textContent=`报告已保存：${(await response.json()).saved}`;}catch(e){last.textContent=`保存失败：${e.message}`;}
};

// Optional diagnostic only (?perf=1). rAF cadence is NOT measured GPU presentation FPS.
export function installFrameMeter(isDragging) {
  const badge = document.createElement('output');
  badge.className = 'frame-meter';
  badge.textContent = '拖动棋子，查看帧回调节奏';
  document.body.appendChild(badge);
  let previous = null, samples = [], lastReport = 0, wasDragging = false;
  function report() {
    if (samples.length < 3) return;
    const sorted = [...samples].sort((a,b)=>a-b);
    const average = samples.reduce((sum,n)=>sum+n,0)/samples.length;
    const p95 = sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))];
    badge.textContent = `帧回调 ${Math.round(1000/average)}Hz · P95 ${p95.toFixed(1)}ms`;
  }
  function frame(now) {
    const dragging = isDragging() && !document.hidden;
    if (dragging) {
      if (!wasDragging) {samples=[];previous=null;lastReport=now;}
      if (previous !== null && now-previous>0 && now-previous<1000) {
        samples.push(now-previous);
        if (samples.length>240) samples.shift();
      }
      previous = now;
      if (now-lastReport>600) {report();lastReport=now;}
    } else {
      if (wasDragging) report();
      previous = null;
    }
    wasDragging = dragging;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

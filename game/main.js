import { initGame } from './interaction.js';

// 等待 DOM 就绪
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

// 字体加载完成后重测 pitch（字体回流后单元格位置可能微调）
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
}

// reduced-motion 全局提示（CSS 已处理动画降级；JS 侧仅日志）
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  console.info('[a11y] reduced-motion 已启用，动画已降级');
}

// ---- 性能诊断浮层：仅诊断期临时存在，定位后移除 ----
(function installPerfProbe() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:9999;background:#000c;color:#0f0;' +
    'font:12px monospace;padding:6px 8px;border-radius:6px;pointer-events:none;white-space:pre;';
  document.body.appendChild(el);

  let frames = 0;
  let last = performance.now();
  let worst = 0;
  let worstAt = '';

  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (entry.duration > worst) {
        worst = entry.duration;
        worstAt = new Date().toLocaleTimeString();
      }
      if (entry.duration > 50) {
        console.warn('[perf] long task', Math.round(entry.duration) + 'ms', entry.name);
      }
    }
  });
  observer.observe({ entryTypes: ['longtask'] });

  function tick(now) {
    frames++;
    if (now - last >= 500) {
      const fps = Math.round(frames * 1000 / (now - last));
      frames = 0;
      last = now;
      el.textContent = `FPS ${fps}\n最差帧 ${Math.round(worst)}ms ${worstAt}`;
      if (fps < 45) console.warn('[perf] low fps', fps);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

import { initGame, getGameState, autoplayStep } from './interaction.js';

// 无头试玩契约：仅当显式 ?autoplay=1 时暴露（借鉴 dsh-game-studio 的
// window.__gameState / window.__autoplay），正常玩家页面不注入。
if (new URLSearchParams(location.search).get('autoplay') === '1') {
  window.__gameState = getGameState;
  window.__autoplay = autoplayStep;
}
import { installViewportLayout } from './viewport-layout.js';
import { installGameTextGuard } from './ui-gestures.js';

installViewportLayout();
installGameTextGuard(document.body);

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

// Diagnostics are opt-in and absent from normal play.
if (new URLSearchParams(location.search).get('perf') === '1') {
  Promise.all([import('./frame-meter.js'), import('./interaction.js')]).then(([meter,game]) => {
    meter.installFrameMeter(game.isDragging);
  });
}

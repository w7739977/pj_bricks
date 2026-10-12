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

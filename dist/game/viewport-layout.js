// Browser chrome is outside the game: use the visible page height, not screen.height.
export function installViewportLayout() {
  const root = document.documentElement;
  let pending = false;
  function update() {
    pending = false;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const width = root.clientWidth;
    const edgeGutter = width <= 600 && height > width && window.matchMedia?.('(pointer: coarse)').matches ? 16 : 4;
    const pitch = Math.min(48, (width - edgeGutter * 2 - 14) / 10);
    root.style.setProperty('--play-height', `${height}px`);
    root.classList.toggle('compact-browser', width <= 600 && height > width && height < pitch * 14 + 240);
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }
  update();
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
}

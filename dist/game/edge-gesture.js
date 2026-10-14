// Best effort only: a browser may consume an edge gesture before page events.
export function installEdgeGestureGuard(board, { canStart, getWidth = () => window.innerWidth }) {
  board.addEventListener('touchstart', event => {
    if (!event.cancelable || event.touches.length !== 1 || !canStart(event.target)) return;
    const x = event.touches[0].clientX;
    if (x <= 60 || x >= getWidth() - 60) event.preventDefault();
  }, { passive: false });
}

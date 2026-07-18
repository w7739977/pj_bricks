const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export function createMoveAnimator({
  getCell,
  getPitch,
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => cancelAnimationFrame(id),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (id) => clearTimeout(id),
}) {
  const active = new Map();

  function animate(moves, duration) {
    for (const move of moves) {
      const el = getCell(move.toR, move.toC);
      if (!el) continue;

      const previous = active.get(el);
      if (previous) {
        if (previous.frameId !== null) cancelFrame(previous.frameId);
        if (previous.timerId !== null) clearTimer(previous.timerId);
      }

      const token = Symbol('move-animation');
      const record = { token, frameId: null, timerId: null };
      active.set(el, record);

      const pitch = getPitch();
      const dx = (move.fromC - move.toC) * pitch;
      const dy = (move.fromR - move.toR) * pitch;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;

      record.frameId = requestFrame(() => {
        if (active.get(el)?.token !== token) return;
        el.style.transition = `transform ${duration}ms ${EASING}`;
        el.style.transform = '';
        record.timerId = setTimer(() => {
          if (active.get(el)?.token !== token) return;
          el.style.transition = '';
          el.style.transform = '';
          active.delete(el);
        }, duration + 30);
      });
    }
  }

  function cancelAll() {
    for (const [el, record] of active) {
      if (record.frameId !== null) cancelFrame(record.frameId);
      if (record.timerId !== null) clearTimer(record.timerId);
      el.style.transition = '';
      el.style.transform = '';
    }
    active.clear();
  }

  return { animate, cancelAll };
}

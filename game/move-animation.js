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
  let following = new Set();
  let lastFollowSig = '';

  function cancelActive(el) {
    const previous = active.get(el);
    if (!previous) return;
    if (previous.frameId !== null) cancelFrame(previous.frameId);
    if (previous.timerId !== null) clearTimer(previous.timerId);
    active.delete(el);
  }

  function clearCell(el) {
    cancelActive(el);
    el.style.transition = '';
    el.style.transform = '';
    // 归还拖拽期间申请的合成层与顶层绘制位置
    el.style.willChange = '';
    el.style.zIndex = '';
  }

  function releaseFollowing() {
    lastFollowSig = '';
    const cells = following;
    following = new Set();
    for (const el of cells) clearCell(el);
  }

  function transitionToRest(el, duration, onComplete) {
    const token = Symbol('move-animation');
    const record = { token, frameId: null, timerId: null };
    active.set(el, record);
    record.frameId = requestFrame(() => {
      if (active.get(el)?.token !== token) return;
      el.style.transition = `transform ${duration}ms ${EASING}`;
      el.style.transform = '';
      record.timerId = setTimer(() => {
        if (active.get(el)?.token !== token) return;
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.style.zIndex = '';
        active.delete(el);
        onComplete();
      }, duration + 30);
    });
  }

  function follow(positions, offsetX, offsetY) {
    const sig = `${positions.map(p => `${p.r},${p.c}`).join(';')}|${offsetX}|${offsetY}`;
    if (sig === lastFollowSig) return;
    const next = new Set();
    for (const position of positions) {
      const el = getCell(position.r, position.c);
      if (el) next.add(el);
    }

    for (const el of following) {
      if (!next.has(el)) clearCell(el);
    }
    lastFollowSig = sig;

    for (const el of next) {
      cancelActive(el);
      // transition 只需在首次加入时压掉 CSS 过渡；will-change/z-index
      // 提升合成层与绘制层级，避免拖拽中反复光栅化大阴影图层
      if (!following.has(el)) {
        el.style.transition = 'none';
        el.style.willChange = 'transform';
        el.style.zIndex = '10';
      }
      el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }
    following = next;
  }

  function settleFollow(duration, onComplete = () => {}) {
    lastFollowSig = '';
    const cells = [...following];
    following = new Set();
    if (duration === 0 || cells.length === 0) {
      cells.forEach(clearCell);
      onComplete();
      return;
    }

    let remaining = cells.length;
    const completeCell = () => {
      remaining--;
      if (remaining === 0) onComplete();
    };
    for (const el of cells) {
      cancelActive(el);
      void el.offsetWidth;
      transitionToRest(el, duration, completeCell);
    }
  }

  function animate(moves, duration, { offsetX = 0, offsetY = 0 } = {}) {
    if (moves.length === 0) {
      settleFollow(duration);
      return;
    }
    releaseFollowing();
    for (const move of moves) {
      const el = getCell(move.toR, move.toC);
      if (!el) continue;

      cancelActive(el);
      if (duration === 0) {
        clearCell(el);
        continue;
      }

      const pitch = getPitch();
      const dx = (move.fromC - move.toC) * pitch + offsetX;
      const dy = (move.fromR - move.toR) * pitch + offsetY;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void el.offsetWidth;
      transitionToRest(el, duration, () => {});
    }
  }

  function cancelAll() {
    lastFollowSig = '';
    releaseFollowing();
    for (const el of [...active.keys()]) clearCell(el);
  }

  return { animate, cancelAll, follow, settleFollow };
}

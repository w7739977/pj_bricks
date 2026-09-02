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

  // 拖拽跟随的位移施加在棋子 svg 上而非格子本体：格子留在原位，
  // 轨迹亮线（格子的 ::before）才能钉在真实格位；svg 需有定位
  // （styles.css 中 .cell .veg { position: relative }）z-index 才生效
  function pieceOf(el) {
    return el.querySelector?.('.veg') || el;
  }

  function clearStyles(target) {
    target.style.transition = '';
    target.style.transform = '';
    // 归还拖拽期间申请的合成层与顶层绘制位置
    target.style.willChange = '';
    target.style.zIndex = '';
  }

  function cancelActive(el) {
    const previous = active.get(el);
    if (!previous) return;
    if (previous.frameId !== null) cancelFrame(previous.frameId);
    if (previous.timerId !== null) clearTimer(previous.timerId);
    active.delete(el);
  }

  function clearCell(el) {
    cancelActive(el);
    // 同时清格子与棋子两层：cancelAll 可能打断动画中/拖拽中的元素
    clearStyles(el);
    clearStyles(pieceOf(el));
  }

  function releaseFollowing() {
    lastFollowSig = '';
    const cells = following;
    following = new Set();
    for (const el of cells) clearCell(el);
  }

  function transitionToRest(el, duration, onComplete, target = el) {
    const token = Symbol('move-animation');
    const record = { token, frameId: null, timerId: null };
    active.set(el, record);
    record.frameId = requestFrame(() => {
      if (active.get(el)?.token !== token) return;
      target.style.transition = `transform ${duration}ms ${EASING}`;
      target.style.transform = '';
      record.timerId = setTimer(() => {
        if (active.get(el)?.token !== token) return;
        target.style.transition = '';
        target.style.transform = '';
        target.style.willChange = '';
        target.style.zIndex = '';
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
      // will-change/z-index 提到棋子 svg 上：棋子浮在其它格子的
      // 亮线之上（符合"棋子不增强、空格增强"），且避免拖拽中
      // 反复光栅化大阴影图层
      const piece = pieceOf(el);
      // transition 只需在首次加入时压掉 CSS 过渡
      if (!following.has(el)) {
        piece.style.transition = 'none';
        piece.style.willChange = 'transform';
        piece.style.zIndex = '10';
      }
      piece.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
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
      // 回弹作用在棋子 svg 上（与 follow 的位移目标一致）
      transitionToRest(el, duration, completeCell, pieceOf(el));
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

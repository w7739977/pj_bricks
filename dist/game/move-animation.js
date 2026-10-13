const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export function createMoveAnimator({
  getCell, getPitch, getBoard,
  createElement = tag => document.createElement(tag),
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = id => cancelAnimationFrame(id),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = id => clearTimeout(id),
}) {
  const active = new Map();
  let following = new Map();
  let followPositions = null;
  let followUsesLayer = true;
  let followLayer = null;
  let lastX = NaN, lastY = NaN;
  const pieceOf = el => el.querySelector?.('.tile-piece') || el.querySelector?.('.veg') || el;
  function clearStyles(target) {
    target.style.transition = '';
    target.style.transform = '';
    target.style.willChange = '';
    target.style.zIndex = '';
  }
  function cancelActive(el) {
    const old = active.get(el);
    if (!old) return;
    if (old.frameId !== null) cancelFrame(old.frameId);
    if (old.timerId !== null) clearTimer(old.timerId);
    active.delete(el);
  }
  function clearCell(el) {
    cancelActive(el);
    clearStyles(el);
    clearStyles(pieceOf(el));
    el.classList?.remove('drag-source');
  }
  function releaseFollowing() {
    followPositions = null;
    lastX = lastY = NaN;
    if (followLayer) {
      cancelActive(followLayer);
      followLayer.remove();
      followLayer = null;
    }
    for (const [el,piece] of following) {
      clearCell(el);
      clearStyles(piece);
    }
    following = new Map();
  }
  function transitionToRest(el, duration, onComplete, target = el) {
    const token = Symbol('move-animation');
    const record = {token, frameId:null, timerId:null};
    active.set(el,record);
    record.frameId = requestFrame(() => {
      if (active.get(el)?.token !== token) return;
      target.style.transition = `transform ${duration}ms ${EASING}`;
      target.style.transform = '';
      record.timerId = setTimer(() => {
        if (active.get(el)?.token !== token) return;
        clearStyles(target);
        active.delete(el);
        onComplete();
      },duration+30);
    });
  }
  function prepareFollow(positions, useLayer) {
    releaseFollowing();
    followPositions = positions;
    followUsesLayer = useLayer;
    for (const p of positions) {
      const el = getCell(p.r,p.c);
      if (el) {
        clearCell(el);
        following.set(el,pieceOf(el));
      }
    }
    const board = getBoard?.();
    const canLayer = useLayer && board && following.size > 0 && [...following].every(([el,piece]) =>
      el.getBoundingClientRect && el.classList && piece.cloneNode);
    if (canLayer) {
      // Geometry is read only at gesture start/commit, never during pointer following.
      const origin = board.getBoundingClientRect();
      const entries = [...following].map(([el,piece]) => ({el,piece,rect:el.getBoundingClientRect()}));
      const left = Math.min(...entries.map(p=>p.rect.left));
      const top = Math.min(...entries.map(p=>p.rect.top));
      const right = Math.max(...entries.map(p=>p.rect.right));
      const bottom = Math.max(...entries.map(p=>p.rect.bottom));
      const layer = createElement('div');
      layer.className = 'drag-layer';
      layer.setAttribute('aria-hidden','true');
      Object.assign(layer.style,{
        left:`${left-origin.left-(board.clientLeft||0)}px`,
        top:`${top-origin.top-(board.clientTop||0)}px`,
        width:`${right-left}px`, height:`${bottom-top}px`,
        transition:'none',willChange:'transform',
      });
      for (const {el,piece,rect} of entries) {
        const slot = createElement('span');
        slot.className = 'drag-piece-slot';
        Object.assign(slot.style,{left:`${rect.left-left}px`,top:`${rect.top-top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
        const clone = piece.cloneNode(true);
        clone.removeAttribute('style');
        slot.appendChild(clone);
        layer.appendChild(slot);
        el.classList.add('drag-source');
      }
      board.appendChild(layer);
      followLayer = layer;
    } else {
      // DOM-free/fallback path; targets and non-transform styles still cache per gesture.
      for (const piece of following.values()) {
        piece.style.transition = 'none';
        piece.style.willChange = 'transform';
        piece.style.zIndex = '10';
      }
    }
  }
  function follow(positions,offsetX,offsetY,{useLayer=true}={}) {
    if (positions !== followPositions || useLayer !== followUsesLayer) prepareFollow(positions,useLayer);
    if (offsetX === lastX && offsetY === lastY) return;
    lastX = offsetX; lastY = offsetY;
    const transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    if (followLayer) followLayer.style.transform = transform;
    else for (const piece of following.values()) piece.style.transform = transform;
  }
  function settleFollow(duration,onComplete=()=>{}) {
    followPositions = null;
    lastX = lastY = NaN;
    if (duration === 0 || following.size === 0) {
      releaseFollowing();onComplete();return;
    }
    if (followLayer) {
      const layer = followLayer;
      cancelActive(layer);
      void layer.offsetWidth;
      transitionToRest(layer,duration,()=>{
        if (followLayer === layer) releaseFollowing();
        onComplete();
      });
      return;
    }
    const cells = [...following];
    following = new Map();
    let remaining = cells.length;
    const complete = () => {if (--remaining === 0) onComplete();};
    for (const [el,piece] of cells) {
      cancelActive(el);
      void el.offsetWidth;
      transitionToRest(el,duration,complete,piece);
    }
  }
  function animate(moves,duration,{offsetX=0,offsetY=0}={}) {
    if (moves.length === 0) {settleFollow(duration);return;}
    releaseFollowing();
    for (const move of moves) {
      const el = getCell(move.toR,move.toC);
      if (!el) continue;
      cancelActive(el);
      if (duration === 0) {clearCell(el);continue;}
      const pitch = getPitch();
      const dx = (move.fromC-move.toC)*pitch+offsetX;
      const dy = (move.fromR-move.toR)*pitch+offsetY;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void el.offsetWidth;
      transitionToRest(el,duration,()=>{});
    }
  }
  function cancelAll() {
    releaseFollowing();
    for (const el of [...active.keys()]) clearCell(el);
  }
  return {animate,cancelAll,follow,settleFollow,releaseFollow:releaseFollowing};
}

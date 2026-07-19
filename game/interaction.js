import {
  ROWS, COLS, createBoard, findTargets, findSolvablePair,
  hasAnySolvablePair, reshuffleInPlace, applyShift,
  createShiftChain, createShiftRevertMoves, getShiftChainPositions,
  cloneBoard, restoreBoard,
} from './board.js';
import { ICON_NAMES, ICONS, withFace } from './svg-icons.js';
import { showWin, showDeadlock, showGameOver } from './dialogs.js';
import { createMoveAnimator } from './move-animation.js';
import { advanceDragShift, createDragInputLock } from './drag-input.js';

// ---- 内部状态（模块私有）----
const state = {
  board: null,
  cellEls: [],            // DOM 引用 [r][c]
  busy: false,            // 异步窗口期间为 true，阻塞所有输入
  mode: 'idle',           // 'idle' | 'selected' | 'waiting'
  anchor: null,           // { r, c, el }
  candidates: [],         // [{ r, c, el }]
  pendingRevert: null,    // 多目标 waiting 期间保留的回滚快照 { snapshot, revertMoves }
  pitch: 35,              // 当前单元格中心距，由 measurePitch() 维护
  round: 1,
  deadlockCount: 0,
  drag: null,
  hintTimer: null,
};

const DRAG_THRESHOLD = 10;
const SNAP_DURATION = 120;

function motionDuration(duration) {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
}

const moveAnimator = createMoveAnimator({
  getCell: (r, c) => state.cellEls[r] && state.cellEls[r][c],
  getPitch: () => state.pitch,
});
const dragInput = createDragInputLock();

const boardEl = () => document.getElementById('board');
const tipEl = () => document.getElementById('tip');
const roundEl = () => document.getElementById('round');

// ---- busy 生命周期（A1）----
function setBusy(v) { state.busy = v; }

// ---- 单元格 pitch 测量（A6）----
function measurePitch() {
  const cells = boardEl().querySelectorAll('.cell');
  if (cells.length < 2) return state.pitch;
  const a = cells[0].getBoundingClientRect();
  const b = cells[1].getBoundingClientRect();
  // 同行第二格：横向间距；若不相邻（换行）则取纵向
  if (Math.abs(a.top - b.top) < 2) {
    state.pitch = Math.round(b.left - a.left);
  } else {
    // 取单格宽 + gap，用 CSS 变量读
    const cssPitch = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pitch'));
    if (!Number.isNaN(cssPitch) && cssPitch > 0) state.pitch = cssPitch;
  }
}
window.addEventListener('resize', () => {
  clearTimeout(window.__pitchTimer);
  window.__pitchTimer = setTimeout(measurePitch, 150);
});

// ---- 渲染 ----
function renderBoard() {
  moveAnimator.cancelAll();
  dragInput.reset();
  state.drag = null;
  const el = boardEl();
  el.innerHTML = '';
  state.cellEls = [];
  for (let r = 0; r < ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      const v = state.board[r][c];
      if (v === null) {
        cell.classList.add('empty');
      } else {
        cell.innerHTML = ICONS[ICON_NAMES[v]];
      }
      el.appendChild(cell);
      rowArr.push(cell);
    }
    state.cellEls.push(rowArr);
  }
  cancelSelection();
  requestAnimationFrame(measurePitch);
}

// 同步 DOM 文本与 empty 类，不重建监听
function syncDOM() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = state.cellEls[r][c];
      const v = state.board[r][c];
      if (v === null) {
        if (!el.classList.contains('empty')) {
          el.classList.add('empty');
          el.innerHTML = '';
        }
        delete el.dataset.rendered; // 否则下次回填同图标时 syncDOM 会跳过 innerHTML 更新
      } else {
        if (el.classList.contains('empty')) el.classList.remove('empty');
        const want = ICONS[ICON_NAMES[v]];
        if (el.dataset.rendered !== ICON_NAMES[v]) {
          el.innerHTML = want;
          el.dataset.rendered = ICON_NAMES[v];
        }
      }
    }
  }
}

// ---- 点击交互 ----
function onCellClick(r, c) {
  if (state.busy) return;
  if (state.board[r][c] === null) return;
  clearTip();

  // waiting 状态：点候选 → 消除（清 pendingRevert）
  if (state.mode === 'waiting' && state.candidates.some(p => p.r === r && p.c === c)) {
    commitPendingAndEliminate(r, c);
    return;
  }
  // waiting 状态：点非候选 → 先回滚推动（A3），再处理新选择
  if (state.mode === 'waiting' && state.pendingRevert) {
    rollbackPending();
  }
  // 点 anchor 自身 → 取消
  if (state.mode !== 'idle' && state.anchor && state.anchor.r === r && state.anchor.c === c) {
    cancelSelection();
    return;
  }
  cancelSelection();
  selectAndEvaluate(r, c);
}

function selectAndEvaluate(r, c) {
  const el = state.cellEls[r][c];
  const targets = findTargets(state.board, r, c);
  if (targets.length === 1) {
    // 单目标：等待 hint 学习窗口后再消除（A8 协同）
    const t = targets[0];
    el.classList.add('selected');
    state.anchor = { r, c, el };
    state.mode = 'selected';
    setBusy(true); // 保护 220ms 窗口，防止用户再次点击导致状态混乱
    setTimeout(() => {
      if (state.anchor && state.anchor.r === r && state.anchor.c === c) {
        eliminate({ r, c, el }, { r: t.r, c: t.c, el: state.cellEls[t.r][t.c] });
      }
      setBusy(false); // 无论是否消除，都解除 busy
    }, 220);
  } else if (targets.length >= 2) {
    state.mode = 'waiting';
    state.anchor = { r, c, el };
    el.classList.add('selected');
    state.candidates = targets.map(t => ({ r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }));
    state.candidates.forEach(p => p.el.classList.add('hint'));
  } else {
    shakeSameEmoji(state.board[r][c]);
  }
}

function commitPendingAndEliminate(r, c) {
  state.pendingRevert = null; // 提交，不再回滚
  eliminate(state.anchor, { r, c, el: state.cellEls[r][c] });
}

function rollbackPending() {
  if (!state.pendingRevert) return;
  const { snapshot, revertMoves } = state.pendingRevert;
  restoreBoard(state.board, snapshot);
  syncDOM();
  animateMoves(revertMoves, 180);
  state.pendingRevert = null;
}

function eliminate(a, b) {
  state.board[a.r][a.c] = null;
  state.board[b.r][b.c] = null;
  // 短暂震惊脸再消失（A8 表情动画）
  [a, b].forEach(p => {
    const svg = p.el.querySelector('svg.veg');
    if (svg) p.el.innerHTML = withFace(svg.outerHTML, 'shock');
  });
  setTimeout(() => {
    [a, b].forEach(p => {
      p.el.classList.remove('selected', 'hint');
      p.el.classList.add('empty');
      p.el.innerHTML = '';
      delete p.el.dataset.rendered;
    });
  }, 180);
  cancelSelection();
  afterEliminate();
}

function cancelSelection() {
  if (state.anchor) state.anchor.el.classList.remove('selected');
  state.candidates.forEach(p => p.el.classList.remove('hint'));
  state.anchor = null;
  state.candidates = [];
  state.mode = 'idle';
}

function shakeSameEmoji(v) {
  const targets = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] === v) targets.push(state.cellEls[r][c]);
  if (!targets.length) return;
  targets.forEach(el => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  });
  setTimeout(() => targets.forEach(el => el.classList.remove('shake')), 580);
}

// ---- hint（A8）----
function hint() {
  if (state.busy) return;
  clearTip();
  const pair = findSolvablePair(state.board);
  if (!pair) {
    showTip('当前盘面无可消除对');
    return;
  }
  const e1 = state.cellEls[pair.r1][pair.c1];
  const e2 = state.cellEls[pair.r2][pair.c2];
  e1.classList.add('hint');
  e2.classList.add('hint');
  clearTimeout(state.hintTimer);
  state.hintTimer = setTimeout(() => {
    e1.classList.remove('hint');
    e2.classList.remove('hint');
  }, 2000);
}

// ---- afterEliminate：胜利 / 死局 ----
function afterEliminate() {
  if (isAllCleared()) {
    setBusy(true);
    const w = showWin({ onClose: () => setBusy(false) });
    w.onRestart(() => { restart(); });
    return;
  }
  if (!hasAnySolvablePair(state.board)) {
    handleDeadlock();
  }
}

function isAllCleared() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] !== null) return false;
  return true;
}

// ---- 死局处理（A2 + 状态机）----
async function handleDeadlock() {
  setBusy(true);
  if (state.deadlockCount === 0) {
    const choice = await showDeadlock();
    if (choice === 'reshuffle') {
      state.deadlockCount++;
      reshuffleInPlace(state.board);
      renderBoard();
      showTip('已重排，继续加油');
      setBusy(false);
    } else {
      restart();
    }
  } else {
    await showGameOver(state.deadlockCount + 1);
    restart();
  }
}

// ---- 重开 ----
function restart() {
  state.board = createBoard();
  state.deadlockCount = 0;
  state.round++;
  if (roundEl()) roundEl().textContent = String(state.round);
  state.pendingRevert = null;
  cancelSelection();
  renderBoard();
  setBusy(false);
}

// ---- 提示文字 ----
let tipTimer = null;
function showTip(msg) {
  const el = tipEl();
  if (!el) return;
  el.textContent = msg;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => { el.textContent = ''; }, 2500);
}
function clearTip() {
  if (tipTimer) { clearTimeout(tipTimer); tipTimer = null; }
  const el = tipEl();
  if (el) el.textContent = '';
}

// ---- 拖拽（Task 7 实现）----
function pointerXY(e) {
  return { x: e.clientX, y: e.clientY };
}

function cellFromTarget(t) {
  const el = t.closest && t.closest('.cell');
  if (!el || el.classList.contains('empty')) return null;
  return { r: +el.dataset.r, c: +el.dataset.c, el };
}

// A5：Pointer Events 锁定一次拖拽的活动指针
function onPointerDown(e) {
  if (state.busy || state.drag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!dragInput.begin(e.pointerId)) return;

  const cell = cellFromTarget(e.target);
  if (!cell) {
    dragInput.release(e.pointerId);
    if (state.pendingRevert) {
      rollbackPending();
      cancelSelection();
    }
    return;
  }

  // 若点击 waiting 候选方块 → 不回滚，让 onCellClick 走 commit 路径
  // 否则（点 anchor 自身/点其它方块/开始新拖拽）有未决推动则先回滚
  const isCandidateClick = state.mode === 'waiting' &&
    state.candidates.some(p => p.r === cell.r && p.c === cell.c);
  if (state.pendingRevert && !isCandidateClick) {
    rollbackPending();
    cancelSelection();
  }
  const { x, y } = pointerXY(e);
  state.drag = {
    r: cell.r, c: cell.c,
    startX: x, startY: y,
    axis: null,
    chain: null,
    lastShift: 0,
    dragged: false,
    moved: false,
    curR: cell.r, curC: cell.c,
    snapshot: null,
    visualOffset: { x: 0, y: 0 },
    blockedDirection: 0,
    blockedHintAt: 0,
  };
  boardEl().setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!state.drag || !dragInput.owns(e.pointerId)) return;
  // A5：drag 进行中始终阻止默认（防页面滚动）
  if (e.cancelable) e.preventDefault();
  const { x, y } = pointerXY(e);
  const dx = x - state.drag.startX;
  const dy = y - state.drag.startY;
  if (!state.drag.axis) {
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      state.drag.axis = Math.abs(dx) > Math.abs(dy) ? 'row' : 'col';
      state.drag.dragged = true;
      cancelSelection();
      if (state.pendingRevert) rollbackPending();
      state.drag.snapshot = cloneBoard(state.board);
      const initialDistance = state.drag.axis === 'row' ? dx : dy;
      state.drag.chain = createShiftChain(
        state.board,
        state.drag.curR,
        state.drag.curC,
        state.drag.axis,
        Math.sign(initialDistance),
      );
    } else return;
  }

  const distance = state.drag.axis === 'row' ? dx : dy;
  const result = advanceDragShift({
    distance,
    pitch: state.pitch,
    threshold: DRAG_THRESHOLD,
    lastShift: state.drag.lastShift,
    blockedDirection: state.drag.blockedDirection,
    applyShift: (delta) => applyShift(
      state.board,
      state.drag.curR,
      state.drag.curC,
      state.drag.chain,
      delta,
    ),
  });

  state.drag.lastShift = result.lastShift;
  state.drag.blockedDirection = result.blockedDirection;
  if (result.applied !== 0) {
    if (state.drag.axis === 'row') state.drag.curC += result.applied;
    else state.drag.curR += result.applied;
    state.drag.moved = true;
    syncDOM();
  }

  state.drag.visualOffset = state.drag.axis === 'row'
    ? { x: result.visualOffset, y: 0 }
    : { x: 0, y: result.visualOffset };
  moveAnimator.follow(
    getShiftChainPositions(state.drag.curR, state.drag.curC, state.drag.chain),
    state.drag.visualOffset.x,
    state.drag.visualOffset.y,
  );

  if (result.constrained) {
    // A4：边界或链外方块阻挡时，仅保留少量视觉阻力
    const now = Date.now();
    if (now - state.drag.blockedHintAt > 200) {
      state.drag.blockedHintAt = now;
      if (navigator.vibrate) navigator.vibrate(8);
    }
  }
}

function onPointerUp(e) {
  if (!state.drag || !dragInput.release(e.pointerId)) return;
  const wasDrag = state.drag.dragged;
  const info = {
    r: state.drag.r, c: state.drag.c,
    curR: state.drag.curR, curC: state.drag.curC,
    chain: state.drag.chain,
    snapshot: state.drag.snapshot,
    moved: state.drag.moved,
    visualOffset: state.drag.visualOffset,
  };
  state.drag = null;

  if (!wasDrag) {
    onCellClick(info.r, info.c);
    return;
  }

  const snapDuration = motionDuration(SNAP_DURATION);
  if (!info.moved) {
    moveAnimator.settleFollow(snapDuration);
    return;
  }

  const targets = findTargets(state.board, info.curR, info.curC);
  const revertMoves = createShiftRevertMoves(info.r, info.c, info.curR, info.curC, info.chain);
  if (targets.length === 0) {
    restoreBoard(state.board, info.snapshot);
    syncDOM();
    animateMoves(revertMoves, 200, info.visualOffset);
    showTip('无可消除，已还原');
    return;
  }

  if (targets.length === 1) {
    moveAnimator.settleFollow(snapDuration);
    const t = targets[0];
    eliminate(
      { r: info.curR, c: info.curC, el: state.cellEls[info.curR][info.curC] },
      { r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }
    );
  } else {
    // A3：多目标 → 进入 waiting，保留 pendingRevert 以便玩家取消时回滚
    state.mode = 'waiting';
    const el = state.cellEls[info.curR][info.curC];
    state.anchor = { r: info.curR, c: info.curC, el };
    el.classList.add('selected');
    state.candidates = targets.map(t => ({ r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }));
    state.candidates.forEach(p => p.el.classList.add('hint'));
    const pendingRevert = { snapshot: info.snapshot, revertMoves };
    state.pendingRevert = pendingRevert;
    if (snapDuration > 0) setBusy(true);
    moveAnimator.settleFollow(snapDuration, () => {
      if (state.pendingRevert === pendingRevert) setBusy(false);
    });
    showTip('多目标，请点击要消除的方块（点空白取消并还原）');
  }
}

function onPointerCancel(e) {
  if (!state.drag || !dragInput.release(e.pointerId)) return;
  const info = state.drag;
  state.drag = null;
  if (!info.dragged) return;
  if (!info.moved) {
    moveAnimator.settleFollow(motionDuration(SNAP_DURATION));
    return;
  }

  const revertMoves = createShiftRevertMoves(info.r, info.c, info.curR, info.curC, info.chain);
  restoreBoard(state.board, info.snapshot);
  syncDOM();
  animateMoves(revertMoves, 200, info.visualOffset);
  cancelSelection();
}

// ---- 动画（FLIP + state.pitch，Task 8 实现）----
function animateMoves(moves, duration, { x = 0, y = 0 } = {}) {
  moveAnimator.animate(moves, motionDuration(duration), {
    offsetX: x,
    offsetY: y,
  });
}

// ---- 启动 ----
export function initGame() {
  state.board = createBoard();
  renderBoard();

  document.getElementById('hintBtn').addEventListener('click', hint);
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (state.busy) return;
    reshuffleInPlace(state.board);
    renderBoard();
    showTip('已重新洗牌');
  });
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (state.busy) return;
    restart();
  });

  // 棋盘事件代理
  const be = boardEl();
  be.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
}

import {
  ROWS, COLS, createBoard, findTargets, findSolvablePair,
  hasAnySolvablePair, reshuffleInPlace, applyShift,
  createShiftChain, createShiftRevertMoves, getShiftChainPositions,
  cloneBoard, restoreBoard,
} from './board.js';
import { ICON_LABELS, ICON_NAMES, ICONS, withFace } from './svg-icons.js';
import { createBrowserDialogManager } from './dialogs.js';
import { createLevelSession } from './level-session.js';
import { createRandomSeed, createSeededRng, getLevelConfig } from './levels.js';
import { createDefaultProgress, loadProgress, saveProgress } from './progress.js';
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
  currentLevel: 1,
  highestUnlocked: 1,
  levelSeed: null,
  levelConfig: null,
  levelSession: null,
  phase: 'loading',       // 'loading' | 'playing' | 'level-complete' | 'failed'
  levelSessionId: 0,
  timerIds: new Set(),
  tipTimer: null,
  hintTimer: null,
  hintCells: [],
  reshuffleNonce: 0,
  storage: null,
  drag: null,
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
const dialogs = createBrowserDialogManager();

const boardEl = () => document.getElementById('board');
const tipEl = () => document.getElementById('tip');
const levelEl = () => document.getElementById('level');
const hintCountEl = () => document.getElementById('hintCount');
const reshuffleCountEl = () => document.getElementById('reshuffleCount');
const toolAvailabilityEl = () => document.getElementById('toolAvailability');

// ---- busy 与异步生命周期 ----
function setBusy(value) {
  state.busy = value;
  updateLevelControls();
}

function sessionStillCurrent(sessionId) {
  return sessionId === state.levelSessionId;
}

function scheduleForSession(callback, delay) {
  const sessionId = state.levelSessionId;
  const timer = setTimeout(() => {
    state.timerIds.delete(timer);
    if (!sessionStillCurrent(sessionId)) return;
    callback();
  }, delay);
  state.timerIds.add(timer);
  return timer;
}

function clearTrackedTimer(timer) {
  if (timer === null) return;
  clearTimeout(timer);
  state.timerIds.delete(timer);
}

function clearHintHighlight() {
  clearTrackedTimer(state.hintTimer);
  state.hintTimer = null;
  state.hintCells.forEach(el => el.classList.remove('hint'));
  state.hintCells = [];
}

function clearLevelAsync() {
  const pointerId = state.drag?.pointerId;
  if (pointerId !== undefined && boardEl().hasPointerCapture?.(pointerId)) {
    boardEl().releasePointerCapture(pointerId);
  }
  clearHintHighlight();
  state.timerIds.forEach(clearTimeout);
  state.timerIds.clear();
  state.tipTimer = null;
  moveAnimator.cancelAll();
  dragInput.reset();
  dialogs.closeAll();
  state.drag = null;
  state.pendingRevert = null;
  cancelSelection();
  boardEl().innerHTML = '';
  state.cellEls = [];
  const tip = tipEl();
  if (tip) tip.textContent = '';
}

// ---- 单元格 pitch 测量（A6）----
function measurePitch() {
  const cells = boardEl().querySelectorAll('.cell');
  if (cells.length < 2) return state.pitch;
  const a = cells[0].getBoundingClientRect();
  const b = cells[1].getBoundingClientRect();
  if (Math.abs(a.top - b.top) < 2) {
    state.pitch = Math.round(b.left - a.left);
  } else {
    const cssPitch = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--pitch')
    );
    if (!Number.isNaN(cssPitch) && cssPitch > 0) state.pitch = cssPitch;
  }
}
window.addEventListener('resize', () => {
  clearTimeout(window.__pitchTimer);
  window.__pitchTimer = setTimeout(measurePitch, 150);
});

// ---- 关卡与存档 ----
function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function currentProgress() {
  return {
    version: 1,
    currentLevel: state.currentLevel,
    highestUnlocked: state.highestUnlocked,
    levelSeed: state.currentLevel >= 6 ? state.levelSeed : null,
  };
}

function persistProgress() {
  const result = saveProgress(state.storage, currentProgress());
  if (!result.ok) showTip('本次进度无法保存');
  return result;
}

function updateLevelControls() {
  if (levelEl()) levelEl().textContent = String(state.currentLevel);
  const hintButton = document.getElementById('hintBtn');
  const shuffleButton = document.getElementById('shuffleBtn');
  if (!state.levelSession) {
    if (hintButton) hintButton.disabled = true;
    if (shuffleButton) shuffleButton.disabled = true;
    return;
  }

  const snapshot = state.levelSession.snapshot();
  hintCountEl().textContent = String(snapshot.hintsRemaining);
  reshuffleCountEl().textContent = String(snapshot.reshufflesRemaining);
  const interactionLocked = state.busy || state.phase !== 'playing' ||
    state.drag !== null || state.mode !== 'idle' || state.pendingRevert !== null;
  hintButton.disabled = interactionLocked || snapshot.hintsRemaining === 0;
  shuffleButton.disabled = interactionLocked || snapshot.reshufflesRemaining === 0;
  hintButton.setAttribute('aria-label', `提示，剩余 ${snapshot.hintsRemaining} 次`);
  shuffleButton.setAttribute('aria-label', `手动重排，剩余 ${snapshot.reshufflesRemaining} 次`);
  toolAvailabilityEl().textContent =
    `提示剩余 ${snapshot.hintsRemaining} 次，重排剩余 ${snapshot.reshufflesRemaining} 次`;
}

function activateLevel(config, board) {
  state.currentLevel = config.levelNumber;
  state.highestUnlocked = config.levelNumber;
  state.levelSeed = config.levelNumber >= 6 ? config.seed : null;
  state.levelConfig = config;
  state.board = board;
  state.reshuffleNonce = 0;
  state.levelSession = createLevelSession({
    progress: currentProgress(),
    config,
    createNextSeed: () => createRandomSeed(),
  });
  state.phase = 'playing';
  renderBoard();
  setBusy(false);
  persistProgress();
}

function loadLevel(levelNumber, seed, { allowReplacement = true } = {}) {
  const sessionId = ++state.levelSessionId;
  clearLevelAsync();
  state.phase = 'loading';
  state.levelSession = null;
  state.currentLevel = levelNumber;
  state.highestUnlocked = levelNumber;
  state.levelSeed = levelNumber >= 6 ? seed : null;
  state.busy = true;
  updateLevelControls();

  let config;
  try {
    config = getLevelConfig(levelNumber, { randomSeed: seed });
  } catch (error) {
    if (levelNumber !== 1) {
      loadLevel(1, null);
      return;
    }
    throw error;
  }

  state.levelConfig = config;
  const result = createBoard({
    iconIndices: config.iconIndices,
    rng: createSeededRng(config.seed),
  });
  if (!result.ok) {
    void handleBoardGenerationFailure(sessionId, config, allowReplacement);
    return;
  }

  activateLevel(config, result.board);
}

async function handleBoardGenerationFailure(sessionId, config, allowReplacement) {
  if (!sessionStillCurrent(sessionId)) return;

  if (config.levelNumber >= 6 && allowReplacement) {
    const replacementSeed = createRandomSeed();
    state.currentLevel = config.levelNumber;
    state.highestUnlocked = config.levelNumber;
    state.levelSeed = replacementSeed;
    persistProgress();
    const replacementConfig = getLevelConfig(config.levelNumber, {
      randomSeed: replacementSeed,
    });
    const replacement = createBoard({
      iconIndices: replacementConfig.iconIndices,
      rng: createSeededRng(replacementSeed),
    });
    if (replacement.ok) {
      activateLevel(replacementConfig, replacement.board);
      return;
    }
  }

  state.phase = 'failed';
  state.busy = true;
  const action = await dialogs.showFailure({
    title: '关卡生成失败',
    description: config.levelNumber >= 6 ? '请重新生成本关。' : '请重试本关。',
    actionLabel: config.levelNumber >= 6 ? '重新生成本关' : '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;

  if (config.levelNumber < 6) {
    loadLevel(config.levelNumber, null, { allowReplacement: false });
    return;
  }

  const regeneratedSeed = createRandomSeed();
  state.currentLevel = config.levelNumber;
  state.highestUnlocked = config.levelNumber;
  state.levelSeed = regeneratedSeed;
  persistProgress();
  loadLevel(config.levelNumber, regeneratedSeed, { allowReplacement: false });
}

function retryCurrentLevel() {
  loadLevel(state.currentLevel, state.levelSeed);
}

// ---- 渲染 ----
function renderBoard() {
  clearHintHighlight();
  state.pendingRevert = null;
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
        const iconName = ICON_NAMES[v];
        cell.innerHTML = ICONS[iconName];
        cell.dataset.rendered = iconName;
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
        delete el.dataset.rendered;
      } else {
        if (el.classList.contains('empty')) el.classList.remove('empty');
        const iconName = ICON_NAMES[v];
        if (el.dataset.rendered !== iconName) {
          el.innerHTML = ICONS[iconName];
          el.dataset.rendered = iconName;
        }
      }
    }
  }
}

// ---- 点击交互 ----
function onCellClick(r, c) {
  if (state.busy || state.phase !== 'playing') return;
  if (state.board[r][c] === null) return;
  clearTip();
  clearHintHighlight();

  if (state.mode === 'waiting' && state.candidates.some(p => p.r === r && p.c === c)) {
    commitPendingAndEliminate(r, c);
    return;
  }
  if (state.mode === 'waiting' && state.pendingRevert) rollbackPending();
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
    const t = targets[0];
    el.classList.add('selected');
    state.anchor = { r, c, el };
    state.mode = 'selected';
    setBusy(true);
    scheduleForSession(() => {
      const remainsSelected = state.anchor && state.anchor.r === r && state.anchor.c === c;
      setBusy(false);
      if (remainsSelected) {
        eliminate({ r, c, el }, { r: t.r, c: t.c, el: state.cellEls[t.r][t.c] });
      }
    }, 220);
  } else if (targets.length >= 2) {
    state.mode = 'waiting';
    state.anchor = { r, c, el };
    el.classList.add('selected');
    state.candidates = targets.map(t => ({ r: t.r, c: t.c, el: state.cellEls[t.r][t.c] }));
    state.candidates.forEach(p => p.el.classList.add('hint'));
    updateLevelControls();
  } else {
    shakeSameEmoji(state.board[r][c]);
  }
}

function commitPendingAndEliminate(r, c) {
  state.pendingRevert = null;
  eliminate(state.anchor, { r, c, el: state.cellEls[r][c] });
}

function rollbackPending() {
  if (!state.pendingRevert) return;
  const { snapshot, revertMoves } = state.pendingRevert;
  restoreBoard(state.board, snapshot);
  syncDOM();
  animateMoves(revertMoves, 180);
  state.pendingRevert = null;
  updateLevelControls();
}

function eliminate(a, b) {
  state.board[a.r][a.c] = null;
  state.board[b.r][b.c] = null;
  setBusy(true);
  [a, b].forEach(p => {
    const svg = p.el.querySelector('svg.veg');
    if (svg) p.el.innerHTML = withFace(svg.outerHTML, 'shock');
  });
  scheduleForSession(() => {
    [a, b].forEach(p => {
      p.el.classList.remove('selected', 'hint');
      p.el.classList.add('empty');
      p.el.innerHTML = '';
      delete p.el.dataset.rendered;
    });
    setBusy(false);
    afterEliminate();
  }, motionDuration(180));
  cancelSelection();
}

function cancelSelection() {
  if (state.anchor) state.anchor.el.classList.remove('selected');
  state.candidates.forEach(p => p.el.classList.remove('hint'));
  state.anchor = null;
  state.candidates = [];
  state.mode = 'idle';
  updateLevelControls();
}

function shakeSameEmoji(value) {
  const targets = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] === value) targets.push(state.cellEls[r][c]);
  if (!targets.length) return;
  targets.forEach(el => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  });
  scheduleForSession(() => targets.forEach(el => el.classList.remove('shake')), 580);
}

// ---- 提示与资源 ----
function hint() {
  if (state.busy || state.phase !== 'playing' || state.mode !== 'idle') return;
  clearTip();
  const pair = findSolvablePair(state.board);
  const outcome = state.levelSession.useHint({ pairAvailable: Boolean(pair) });
  if (outcome.action === 'deadlock') {
    void handleDeadlock();
    return;
  }
  if (outcome.action !== 'highlight-pair') return;

  clearHintHighlight();
  updateLevelControls();
  const e1 = state.cellEls[pair.r1][pair.c1];
  const e2 = state.cellEls[pair.r2][pair.c2];
  state.hintCells = [e1, e2];
  state.hintCells.forEach(el => el.classList.add('hint'));
  state.hintTimer = scheduleForSession(clearHintHighlight, 2000);
}

function tryReshuffle() {
  const snapshot = state.levelSession?.snapshot();
  if (state.busy || state.phase !== 'playing' || state.drag ||
      state.mode !== 'idle' || state.pendingRevert ||
      !snapshot || snapshot.reshufflesRemaining === 0) {
    return false;
  }

  const seed = (
    state.levelConfig.seed ^
    Math.imul(++state.reshuffleNonce, 0x9e3779b9)
  ) >>> 0;
  const result = reshuffleInPlace(state.board, createSeededRng(seed));
  const outcome = state.levelSession.useReshuffle({ success: result.ok });
  if (!result.ok) {
    void showCurrentGenerationFailure();
    return false;
  }
  if (outcome.action !== 'reshuffled') return false;
  renderBoard();
  updateLevelControls();
  showTip('已重新洗牌');
  return true;
}

async function showCurrentGenerationFailure() {
  const sessionId = state.levelSessionId;
  state.phase = 'failed';
  setBusy(true);
  const action = await dialogs.showFailure({
    title: '重排失败',
    description: '未能生成可继续的盘面，请重试本关。',
    actionLabel: '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;
  retryCurrentLevel();
}

// ---- 过关与死局 ----
function afterEliminate() {
  if (isAllCleared()) {
    void completeCurrentLevel();
    return;
  }
  if (!hasAnySolvablePair(state.board)) void handleDeadlock();
}

function isAllCleared() {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (state.board[r][c] !== null) return false;
  return true;
}

async function completeCurrentLevel() {
  const sessionId = state.levelSessionId;
  const completedLevel = state.currentLevel;
  const resources = state.levelSession.snapshot();
  const completion = state.levelSession.complete();
  if (completion.action !== 'level-complete') return;

  state.currentLevel = completion.progress.currentLevel;
  state.highestUnlocked = completion.progress.highestUnlocked;
  state.levelSeed = completion.progress.levelSeed;
  state.phase = 'level-complete';
  setBusy(true);
  levelEl().textContent = String(completedLevel);
  persistProgress();

  const nextConfig = getLevelConfig(state.currentLevel, { randomSeed: state.levelSeed });
  const unlockedIconKey = nextConfig.unlockedIconIndex === null
    ? null
    : ICON_NAMES[nextConfig.unlockedIconIndex];
  const unlockedIconSvg = unlockedIconKey ? ICONS[unlockedIconKey] : '';
  const unlockedIconName = unlockedIconKey ? ICON_LABELS[unlockedIconKey] : '';
  const action = await dialogs.showLevelComplete({
    levelNumber: completedLevel,
    nextLevelNumber: state.currentLevel,
    hintsRemaining: resources.hintsRemaining,
    reshufflesRemaining: resources.reshufflesRemaining,
    unlockedIconSvg,
    unlockedIconName,
  });
  if (!sessionStillCurrent(sessionId) || action !== 'next') return;
  loadLevel(state.currentLevel, state.levelSeed);
}

async function handleDeadlock() {
  if (state.busy || state.phase !== 'playing') return;
  const sessionId = state.levelSessionId;
  const outcome = state.levelSession.deadlock();
  setBusy(true);

  if (outcome.action === 'offer-reshuffle') {
    const choice = await dialogs.showDeadlock();
    if (!sessionStillCurrent(sessionId) || choice === 'cancelled') return;
    setBusy(false);
    if (choice === 'retry') retryCurrentLevel();
    else tryReshuffle();
    return;
  }

  state.phase = 'failed';
  const action = await dialogs.showFailure({
    title: '本关失败',
    description: '重排次数已用尽，请重试本关。',
    actionLabel: '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;
  retryCurrentLevel();
}

// ---- 提示文字 ----
function showTip(message) {
  const el = tipEl();
  if (!el) return;
  el.textContent = message;
  clearTrackedTimer(state.tipTimer);
  state.tipTimer = scheduleForSession(() => {
    el.textContent = '';
    state.tipTimer = null;
  }, 2500);
}

function clearTip() {
  clearTrackedTimer(state.tipTimer);
  state.tipTimer = null;
  const el = tipEl();
  if (el) el.textContent = '';
}

// ---- 拖拽 ----
function pointerXY(e) {
  return { x: e.clientX, y: e.clientY };
}

function cellFromTarget(target) {
  const el = target.closest && target.closest('.cell');
  if (!el || el.classList.contains('empty')) return null;
  return { r: +el.dataset.r, c: +el.dataset.c, el };
}

function onPointerDown(e) {
  if (state.busy || state.phase !== 'playing' || state.drag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (!dragInput.begin(e.pointerId)) return;

  let cell = cellFromTarget(e.target);
  if (!cell) {
    dragInput.release(e.pointerId);
    if (state.pendingRevert) {
      rollbackPending();
      cancelSelection();
    }
    return;
  }

  clearHintHighlight();
  const isCandidateClick = state.mode === 'waiting' &&
    state.candidates.some(p => p.r === cell.r && p.c === cell.c);
  if (state.pendingRevert && !isCandidateClick) {
    rollbackPending();
    cancelSelection();
    cell = cellFromTarget(e.target);
    if (!cell) {
      dragInput.release(e.pointerId);
      return;
    }
  }
  const { x, y } = pointerXY(e);
  state.drag = {
    pointerId: e.pointerId,
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
  updateLevelControls();
}

function onPointerMove(e) {
  if (!state.drag || !dragInput.owns(e.pointerId)) return;
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
    applyShift: delta => applyShift(
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
  updateLevelControls();

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
    const target = targets[0];
    eliminate(
      { r: info.curR, c: info.curC, el: state.cellEls[info.curR][info.curC] },
      { r: target.r, c: target.c, el: state.cellEls[target.r][target.c] },
    );
  } else {
    state.mode = 'waiting';
    const el = state.cellEls[info.curR][info.curC];
    state.anchor = { r: info.curR, c: info.curC, el };
    el.classList.add('selected');
    state.candidates = targets.map(target => ({
      r: target.r,
      c: target.c,
      el: state.cellEls[target.r][target.c],
    }));
    state.candidates.forEach(candidate => candidate.el.classList.add('hint'));
    const pendingRevert = { snapshot: info.snapshot, revertMoves };
    state.pendingRevert = pendingRevert;
    updateLevelControls();
    const sessionId = state.levelSessionId;
    if (snapDuration > 0) setBusy(true);
    moveAnimator.settleFollow(snapDuration, () => {
      if (!sessionStillCurrent(sessionId)) return;
      if (state.pendingRevert === pendingRevert) setBusy(false);
    });
    showTip('多目标，请点击要消除的方块（点空白取消并还原）');
  }
}

function onPointerCancel(e) {
  if (!state.drag || !dragInput.release(e.pointerId)) return;
  const info = state.drag;
  state.drag = null;
  updateLevelControls();
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

// ---- 动画（FLIP + 动态 pitch）----
function animateMoves(moves, duration, { x = 0, y = 0 } = {}) {
  moveAnimator.animate(moves, motionDuration(duration), {
    offsetX: x,
    offsetY: y,
  });
}

// ---- 启动 ----
export function initGame() {
  state.storage = getBrowserStorage();
  const stored = loadProgress(state.storage);
  const progress = stored.ok ? stored.value : createDefaultProgress();
  loadLevel(progress.currentLevel, progress.levelSeed);
  if (!stored.ok) showTip('进度读取失败，已从第 1 关开始');

  document.getElementById('hintBtn').addEventListener('click', hint);
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (!state.busy && state.phase === 'playing') tryReshuffle();
  });
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (!state.busy && state.phase === 'playing') retryCurrentLevel();
  });

  const be = boardEl();
  be.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
}

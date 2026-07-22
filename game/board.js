// 纯棋盘逻辑，无 DOM 依赖。
// 规则：14 行 × 10 列 = 140 格；图案按成对分配；消除为 0 折直线连通。

export const ROWS = 14;
export const COLS = 10;
const CELL_COUNT = ROWS * COLS;
const PAIR_COUNT = CELL_COUNT / 2;

function validateIconIndices(iconIndices) {
  if (!Array.isArray(iconIndices) || iconIndices.length < 1 || iconIndices.length > PAIR_COUNT) {
    throw new RangeError('iconIndices must contain between 1 and 70 entries');
  }
  const allValid = iconIndices.every(value => Number.isInteger(value) && value >= 0);
  if (!allValid || new Set(iconIndices).size !== iconIndices.length) {
    throw new TypeError('iconIndices must contain unique non-negative integers');
  }
}

function createPairPool(iconIndices) {
  const pool = [];
  for (let pair = 0; pair < PAIR_COUNT; pair++) {
    const iconIndex = iconIndices[pair % iconIndices.length];
    pool.push(iconIndex, iconIndex);
  }
  return pool;
}

function shuffleInPlace(values, rng) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function poolToBoard(pool) {
  return Array.from({ length: ROWS }, (_, r) =>
    pool.slice(r * COLS, (r + 1) * COLS)
  );
}

// ---- 棋盘构造 ----
export function createBoard({ iconIndices, rng = Math.random, maxAttempts = 1000 }) {
  validateIconIndices(iconIndices);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pool = createPairPool(iconIndices);
    shuffleInPlace(pool, rng);
    const board = poolToBoard(pool);
    if (hasAnySolvablePair(board)) return { ok: true, board };
  }
  return { ok: false, reason: 'no-solvable-pair' };
}

// ---- 0 折直线连通 ----
export function isClearPath(board, r1, c1, r2, c2) {
  if (r1 === r2) {
    const [a, b] = c1 < c2 ? [c1, c2] : [c2, c1];
    for (let c = a + 1; c < b; c++) if (board[r1][c] !== null) return false;
    return true;
  }
  if (c1 === c2) {
    const [a, b] = r1 < r2 ? [r1, r2] : [r2, r1];
    for (let r = a + 1; r < b; r++) if (board[r][c1] !== null) return false;
    return true;
  }
  return false;
}

// ---- 从 (r,c) 沿四方向找直线可达的同图案目标 ----
export function findTargets(board, r, c) {
  const v = board[r][c];
  if (v === null || v === undefined) return [];
  const out = [];
  for (let rr = r - 1; rr >= 0; rr--) {
    if (board[rr][c] === v) { out.push({ r: rr, c }); break; }
    if (board[rr][c] !== null) break;
  }
  for (let rr = r + 1; rr < ROWS; rr++) {
    if (board[rr][c] === v) { out.push({ r: rr, c }); break; }
    if (board[rr][c] !== null) break;
  }
  for (let cc = c - 1; cc >= 0; cc--) {
    if (board[r][cc] === v) { out.push({ r, c: cc }); break; }
    if (board[r][cc] !== null) break;
  }
  for (let cc = c + 1; cc < COLS; cc++) {
    if (board[r][cc] === v) { out.push({ r, c: cc }); break; }
    if (board[r][cc] !== null) break;
  }
  return out;
}

export function findSolvablePair(board) {
  const map = {};
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v === null) continue;
      (map[v] = map[v] || []).push([r, c]);
    }
  }
  for (const v in map) {
    const list = map[v];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [r1, c1] = list[i];
        const [r2, c2] = list[j];
        if ((r1 === r2 || c1 === c2) && isClearPath(board, r1, c1, r2, c2)) {
          return { r1, c1, r2, c2 };
        }
      }
    }
  }
  return null;
}

export function hasAnySolvablePair(board) {
  return findSolvablePair(board) !== null;
}

// ---- 重排（就地）----
export function reshuffleInPlace(board, rng = Math.random, { maxAttempts = 1000 } = {}) {
  const snapshot = cloneBoard(board);
  const positions = [];
  const pieces = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) {
        positions.push({ r, c });
        pieces.push(board[r][c]);
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    shuffleInPlace(pieces, rng);
    positions.forEach(({ r, c }, i) => { board[r][c] = pieces[i]; });
    if (hasAnySolvablePair(board)) return { ok: true };
  }

  restoreBoard(board, snapshot);
  return { ok: false, reason: 'no-solvable-pair' };
}

// ---- 空间平移：拖拽核心 ----
export function createShiftChain(board, r, c, axis, dir) {
  let length = 1;
  for (let step = 1; ; step++) {
    const nextR = axis === 'row' ? r : r + dir * step;
    const nextC = axis === 'row' ? c + dir * step : c;
    if (nextR < 0 || nextR >= ROWS || nextC < 0 || nextC >= COLS) break;
    if (board[nextR][nextC] === null) break;
    length++;
  }
  return { axis, dir, length };
}

export function getShiftChainPositions(r, c, chain) {
  return Array.from({ length: chain.length }, (_, i) => {
    const offset = chain.dir * i;
    return {
      r: chain.axis === 'row' ? r : r + offset,
      c: chain.axis === 'row' ? c + offset : c,
    };
  });
}

export function createShiftRevertMoves(originR, originC, currentR, currentC, chain) {
  const from = getShiftChainPositions(currentR, currentC, chain);
  const to = getShiftChainPositions(originR, originC, chain);
  return from.flatMap((position, i) => {
    const destination = to[i];
    if (position.r === destination.r && position.c === destination.c) return [];
    return [{
      fromR: position.r,
      fromC: position.c,
      toR: destination.r,
      toC: destination.c,
    }];
  });
}

// 语义：移动拖拽开始时确定的固定连接链，途中不吸收新元素
export function applyShift(board, r, c, chain, delta) {
  if (delta === 0 || board[r][c] === null || chain.length === 0) {
    return { applied: 0, moves: [] };
  }

  const selectedIndex = chain.axis === 'row' ? c : r;
  const chainEnd = selectedIndex + chain.dir * (chain.length - 1);
  const lo = Math.min(selectedIndex, chainEnd);
  const hi = Math.max(selectedIndex, chainEnd);
  const moveDir = delta > 0 ? 1 : -1;
  const edge = moveDir > 0 ? hi : lo;
  const limit = chain.axis === 'row' ? COLS : ROWS;
  let capacity = 0;

  for (let index = edge + moveDir; index >= 0 && index < limit; index += moveDir) {
    const value = chain.axis === 'row' ? board[r][index] : board[index][c];
    if (value !== null) break;
    capacity++;
  }

  const distance = Math.min(Math.abs(delta), capacity);
  if (distance === 0) return { applied: 0, moves: [] };

  const applied = moveDir * distance;
  const moves = [];
  const start = moveDir > 0 ? hi : lo;
  const end = moveDir > 0 ? lo : hi;
  const iteration = moveDir > 0 ? -1 : 1;

  for (let index = start; moveDir > 0 ? index >= end : index <= end; index += iteration) {
    if (chain.axis === 'row') {
      moves.push({ fromR: r, fromC: index, toR: r, toC: index + applied });
      board[r][index + applied] = board[r][index];
      board[r][index] = null;
    } else {
      moves.push({ fromR: index, fromC: c, toR: index + applied, toC: c });
      board[index + applied][c] = board[index][c];
      board[index][c] = null;
    }
  }

  return { applied, moves };
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

export function restoreBoard(board, snap) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      board[r][c] = snap[r][c];
}

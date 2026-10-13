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

// Count opening choices once per undirected edge (a full board has no gaps).
export function countOpeningPairs(board) {
  let count = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (board[r][c] === null) continue;
    if (c + 1 < COLS && board[r][c] === board[r][c + 1]) count++;
    if (r + 1 < ROWS && board[r][c] === board[r + 1][c]) count++;
  }
  return count;
}

// Local pair swaps preserve every icon's even count. Only affected edges are scored.
function tuneOpeningPairs(board, range, rng) {
  let count = countOpeningPairs(board);
  const penalty = value => Math.max(range.min - value, value - range.max, 0);
  for (let step = 0; step < 400 && penalty(count) > 0; step++) {
    const a = Math.floor(rng() * CELL_COUNT);
    const b = Math.floor(rng() * CELL_COUNT);
    const ar = Math.floor(a / COLS), ac = a % COLS;
    const br = Math.floor(b / COLS), bc = b % COLS;
    if (board[ar][ac] === board[br][bc]) continue;
    const edges = new Set();
    for (const index of [a,b]) {
      const r = Math.floor(index / COLS), c = index % COLS;
      const neighbours = [];
      if (r > 0) neighbours.push(index - COLS);
      if (r + 1 < ROWS) neighbours.push(index + COLS);
      if (c > 0) neighbours.push(index - 1);
      if (c + 1 < COLS) neighbours.push(index + 1);
      for (const other of neighbours) edges.add(`${Math.min(index,other)},${Math.max(index,other)}`);
    }
    const affected = [...edges].map(edge => edge.split(',').map(Number));
    const localCount = () => affected.reduce((sum,[x,y]) => sum + (
      board[Math.floor(x/COLS)][x%COLS] === board[Math.floor(y/COLS)][y%COLS] ? 1 : 0
    ),0);
    const before = localCount();
    [board[ar][ac], board[br][bc]] = [board[br][bc], board[ar][ac]];
    const next = count + localCount() - before;
    if (penalty(next) <= penalty(count)) count = next;
    else [board[ar][ac], board[br][bc]] = [board[br][bc], board[ar][ac]];
  }
  return count >= range.min && count <= range.max;
}

// ---- 棋盘构造 ----
export function createBoard({ iconIndices, rng = Math.random, maxAttempts = 1000, openingPairs = null }) {
  validateIconIndices(iconIndices);
  if (openingPairs && (!Number.isInteger(openingPairs.min) || !Number.isInteger(openingPairs.max) ||
      openingPairs.min < 1 || openingPairs.max < openingPairs.min)) {
    throw new RangeError('openingPairs must have integer bounds with 1 <= min <= max');
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pool = createPairPool(iconIndices);
    shuffleInPlace(pool, rng);
    const board = poolToBoard(pool);
    if (openingPairs) {
      if (tuneOpeningPairs(board, openingPairs, rng)) return { ok: true, board };
    } else if (hasAnySolvablePair(board)) return { ok: true, board };
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
  let playableFallback = null;
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
    // Prefer an immediate pair, but a legal drag is also a playable outcome.
    // Sparse occupied positions may make any immediate pair impossible.
    if (!playableFallback && hasAnySolvablePairDeep(board)) playableFallback = cloneBoard(board);
  }

  if (playableFallback) {
    restoreBoard(board, playableFallback);
    return { ok: true };
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

// 语义：判断拖拽轴线所在整行/列是否存在空格；无空格则链不可能产生任何平移
export function hasLineEmptyCell(board, r, c, axis) {
  const limit = axis === 'row' ? COLS : ROWS;
  for (let index = 0; index < limit; index++) {
    const value = axis === 'row' ? board[r][index] : board[index][c];
    if (value === null) return true;
  }
  return false;
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

// ---- 死局检测：拖拽可达口径 ----
// 游戏规则：拖拽要么消除并落位，要么整体还原——不存在"滑过去但没消除、
// 棋子留在新位置"的中间态。因此可解 = 存在直接配对（零拖拽），或存在
// 某一次拖拽，拖完后被抓棋子在最终位置能直接配对。
// 只靠链上其他棋子或未被移动的棋子出现配对不算合法落子。多步滑移中转在真实规则里不可达，不作搜索。
// 拖拽主体是"链"：抓取段内任意子链（抓中间一颗时只有其前方部分跟随），
// 枚举按子链口径展开。

export function findSolvablePairDeep(board) {
  const direct = findSolvablePair(board);
  if (direct) return { direct: true, depth: 0, pair: direct, board: null };

  // Use exactly the fixed-chain movement and grabbed-cell matching used on release.
  // A gesture may reverse direction after its chain has been fixed.
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (board[r][c] === null) continue;
    for (const axis of ['row', 'col']) for (const dir of [-1, 1]) {
      const chain = createShiftChain(board, r, c, axis, dir);
      for (const moveDir of [-1, 1]) {
        const probe = cloneBoard(board);
        const capacity = Math.abs(applyShift(probe, r, c, chain, moveDir * (axis === 'row' ? COLS : ROWS)).applied);
        for (let dist = 1; dist <= capacity; dist++) {
          const next = cloneBoard(board);
          const delta = moveDir * dist;
          applyShift(next, r, c, chain, delta);
          const toR = axis === 'col' ? r + delta : r;
          const toC = axis === 'row' ? c + delta : c;
          const targets = findTargets(next, toR, toC);
          if (!targets.length) continue;
          const target = targets[0];
          return {
            direct: false, depth: 1,
            pair: { r1: toR, c1: toC, r2: target.r, c2: target.c },
            shiftFrom: { r, c, chain, delta }, board: next,
          };
        }
      }
    }
  }
  return { direct: false, depth: -1, pair: null, board: null };
}

export function hasAnySolvablePairDeep(board) {
  return findSolvablePairDeep(board).pair !== null;
}

// 纯棋盘逻辑，无 DOM 依赖。
// 规则：14 行 × 10 列 = 140 格；14 种蔬菜 × 10 个；消除为 0 折直线连通。

export const ROWS = 14;
export const COLS = 10;
export const KINDS = 14;     // 与 svg-icons ICON_NAMES 长度一致
export const PER_KIND = 10;  // 140 / KINDS

// ---- 棋盘构造 ----
export function createBoard(rng = Math.random) {
  let board;
  let attempts = 0;
  do {
    board = buildRandomBoard(rng);
    attempts++;
  } while (!hasAnySolvablePair(board) && attempts < 1000);
  return board; // string[ROWS][COLS]，null 表示空
}

function buildRandomBoard(rng) {
  const pool = [];
  for (let i = 0; i < KINDS; i++)
    for (let j = 0; j < PER_KIND; j++) pool.push(i);
  // Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const board = [];
  let k = 0;
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(pool[k++]);
    board.push(row);
  }
  return board;
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
export function reshuffleInPlace(board, rng = Math.random) {
  const pieces = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] !== null) pieces.push(board[r][c]);
  let attempts = 0;
  do {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    let k = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c] !== null) board[r][c] = pieces[k++];
    attempts++;
  } while (!hasAnySolvablePair(board) && attempts < 1000);
  return board;
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

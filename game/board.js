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
// 语义：以 (r,c) 为受力点沿 axis 推 delta 格，链尾外侧空位决定实际位移
export function applyShift(board, r, c, axis, delta) {
  if (delta === 0) return { applied: 0, moves: [] };
  const NOPE = { applied: 0, moves: [] };

  const doMove = (lo, hi, axisIsRow, dir) => {
    // dir = +1 向索引增大，-1 向索引减小
    // 计算链尾外侧连续空位数
    const len = hi - lo + 1;
    const tailNext = dir > 0 ? hi + 1 : lo - 1;
    const maxR = ROWS - 1, maxC = COLS - 1;
    let cnt = 0;
    if (axisIsRow) {
      let cc = tailNext;
      while (dir > 0 ? cc <= maxC : cc >= 0) {
        if (board[r][cc] !== null) break;
        cnt++; cc += dir;
      }
    } else {
      let rr = tailNext;
      while (dir > 0 ? rr <= maxR : rr >= 0) {
        if (board[rr][c] !== null) break;
        cnt++; rr += dir;
      }
    }
    const shift = Math.min(Math.abs(delta), cnt);
    if (shift <= 0) return NOPE;
    const moves = [];
    const step = dir * shift;
    if (axisIsRow) {
      // 必须从远端开始搬，避免覆盖
      for (let x = dir > 0 ? hi : lo; dir > 0 ? x >= lo : x <= hi; x += dir > 0 ? -1 : 1) {
        moves.push({ fromR: r, fromC: x, toR: r, toC: x + step });
        board[r][x + step] = board[r][x];
        board[r][x] = null;
      }
    } else {
      for (let x = dir > 0 ? hi : lo; dir > 0 ? x >= lo : x <= hi; x += dir > 0 ? -1 : 1) {
        moves.push({ fromR: x, fromC: c, toR: x + step, toC: c });
        board[x + step][c] = board[x][c];
        board[x][c] = null;
      }
    }
    return { applied: shift * dir, moves };
  };

  if (axis === 'row') {
    if (delta > 0) {
      let hi = c;
      while (hi < COLS - 1 && board[r][hi + 1] !== null) hi++;
      return doMove(c, hi, true, +1);
    } else {
      let lo = c;
      while (lo > 0 && board[r][lo - 1] !== null) lo--;
      return doMove(lo, c, true, -1);
    }
  } else { // 'col'
    if (delta > 0) {
      let hi = r;
      while (hi < ROWS - 1 && board[hi + 1][c] !== null) hi++;
      return doMove(c, hi, false, +1);
    } else {
      let lo = r;
      while (lo > 0 && board[lo - 1][c] !== null) lo--;
      return doMove(lo, r, false, -1);
    }
  }
}

export function cloneBoard(board) {
  return board.map(row => row.slice());
}

export function restoreBoard(board, snap) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      board[r][c] = snap[r][c];
}

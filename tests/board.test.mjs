import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROWS,
  COLS,
  applyShift,
  cloneBoard,
  createBoard,
  createShiftChain,
  createShiftRevertMoves,
  findTargets,
  getShiftChainPositions,
  hasLineEmptyCell,
  hasAnySolvablePair,
  hasAnySolvablePairDeep,
  findSolvablePair,
  findSolvablePairDeep,
  reshuffleInPlace,
} from '../game/board.js';
import { createSeededRng } from '../game/levels.js';

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

test('parameterized board uses every enabled icon in even counts', () => {
  const result = createBoard({
    iconIndices: Array.from({ length: 17 }, (_, i) => i),
    rng: createSeededRng(123),
  });

  assert.equal(result.ok, true);
  assert.equal(result.board.length, ROWS);
  assert.equal(result.board.flat().length, ROWS * COLS);
  const counts = new Map();
  result.board.flat().forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  assert.equal(counts.size, 17);
  assert.equal([...counts.values()].every(count => count >= 2 && count % 2 === 0), true);
  assert.ok(Math.max(...counts.values()) - Math.min(...counts.values()) <= 2);
});

test('same seed creates the same solvable board', () => {
  const iconIndices = Array.from({ length: 20 }, (_, i) => i);
  const left = createBoard({ iconIndices, rng: createSeededRng(456) });
  const right = createBoard({ iconIndices, rng: createSeededRng(456) });

  assert.deepEqual(left, right);
  assert.equal(hasAnySolvablePair(left.board), true);
});

test('different seeds can create different boards', () => {
  const iconIndices = Array.from({ length: 20 }, (_, i) => i);
  const left = createBoard({ iconIndices, rng: createSeededRng(456) });
  const right = createBoard({ iconIndices, rng: createSeededRng(789) });

  assert.notDeepEqual(left.board, right.board);
});

test('generation reports exhaustion', () => {
  const result = createBoard({ iconIndices: [0, 1], rng: () => 0, maxAttempts: 0 });
  assert.deepEqual(result, { ok: false, reason: 'no-solvable-pair' });
});

test('failed reshuffle restores the exact board', () => {
  const board = emptyBoard();
  board[0][0] = 1;
  board[13][9] = 2;
  const before = cloneBoard(board);

  const result = reshuffleInPlace(board, () => 0, { maxAttempts: 2 });

  assert.deepEqual(result, { ok: false, reason: 'no-solvable-pair' });
  assert.deepEqual(board, before);
});

test('fixed-chain positions follow the selected member and initial direction', () => {
  assert.deepEqual(getShiftChainPositions(6, 2, { axis: 'col', dir: -1, length: 4 }), [
    { r: 6, c: 2 },
    { r: 5, c: 2 },
    { r: 4, c: 2 },
    { r: 3, c: 2 },
  ]);
});

test('a fixed connected column can be pushed into empty cells above it', () => {
  const board = emptyBoard();
  board[3][0] = 1;
  board[4][0] = 2;
  board[5][0] = 3;
  board[6][0] = 4;
  const chain = createShiftChain(board, 6, 0, 'col', -1);

  const result = applyShift(board, 6, 0, chain, -3);

  assert.deepEqual(chain, { axis: 'col', dir: -1, length: 4 });
  assert.equal(result.applied, -3);
  assert.equal(result.moves.length, 4);
  assert.deepEqual(board.slice(0, 4).map(row => row[0]), [1, 2, 3, 4]);
  assert.deepEqual(board.slice(4, 7).map(row => row[0]), [null, null, null]);
});

test('a fixed row chain moves together through available empty cells', () => {
  const board = emptyBoard();
  board[2][1] = 1;
  board[2][2] = 2;
  board[2][3] = 3;
  const chain = createShiftChain(board, 2, 1, 'row', 1);

  const result = applyShift(board, 2, 1, chain, 2);

  assert.equal(result.applied, 2);
  assert.deepEqual(board[2].slice(1, 6), [null, null, 1, 2, 3]);
});

test('a fixed chain stops before an element outside the original chain', () => {
  const board = emptyBoard();
  board[1][0] = 1;
  board[1][1] = 2;
  board[1][5] = 9;
  const chain = createShiftChain(board, 1, 0, 'row', 1);

  const result = applyShift(board, 1, 0, chain, 8);

  assert.equal(result.applied, 3);
  assert.deepEqual(board[1].slice(0, 6), [null, null, null, 1, 2, 9]);
});

test('a fixed chain does not absorb a new element reached later in the drag', () => {
  const board = emptyBoard();
  board[1][0] = 1;
  board[1][3] = 9;
  const chain = createShiftChain(board, 1, 0, 'row', 1);

  const first = applyShift(board, 1, 0, chain, 2);
  const second = applyShift(board, 1, 2, chain, 1);

  assert.equal(first.applied, 2);
  assert.deepEqual(second, { applied: 0, moves: [] });
  assert.deepEqual(board[1].slice(0, 4), [null, null, 1, 9]);
});

test('chain rollback animates every member from final position to origin', () => {
  const chain = { axis: 'col', dir: -1, length: 3 };

  assert.deepEqual(createShiftRevertMoves(5, 2, 3, 2, chain), [
    { fromR: 3, fromC: 2, toR: 5, toC: 2 },
    { fromR: 2, fromC: 2, toR: 4, toC: 2 },
    { fromR: 1, fromC: 2, toR: 3, toC: 2 },
  ]);
});

test('moving the selected member can expose every legal target', () => {
  const board = emptyBoard();
  board[0][0] = 7;
  board[0][1] = 7;
  board[0][4] = 7;
  const chain = createShiftChain(board, 0, 1, 'row', 1);

  applyShift(board, 0, 1, chain, 1);

  assert.deepEqual(findTargets(board, 0, 2), [
    { r: 0, c: 0 },
    { r: 0, c: 4 },
  ]);
});

test('hasLineEmptyCell detects empty cells along the drag axis', () => {
  // 满盘整行无空格
  const full = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  assert.equal(hasLineEmptyCell(full, 5, 5, 'row'), false);
  assert.equal(hasLineEmptyCell(full, 5, 5, 'col'), false);

  // 行内存在空格
  full[5][9] = null;
  assert.equal(hasLineEmptyCell(full, 5, 0, 'row'), true);
  assert.equal(hasLineEmptyCell(full, 0, 5, 'col'), false);
});

test('applyShift never moves a chain on a board line without empties', () => {
  const full = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  const chain = createShiftChain(full, 5, 4, 'row', 1);
  const result = applyShift(full, 5, 4, chain, 2);
  assert.deepEqual(result, { applied: 0, moves: [] });
});

// ---- 深度死局检测（考虑拖拽可达解）----

function deepEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

test('findSolvablePairDeep finds pair reachable by one shift', () => {
  // 无直接配对：两枚 A 被列 0 的其它棋子隔开；
  // 但第 1 行整行左移 1 格后，两枚 A 在行 1 上直连。
  const board = deepEmptyBoard();
  board[0][0] = 0;            // A(挡路)
  board[0][3] = 1;
  board[1][3] = 0;            // A
  board[1][5] = 0;            // A —— 与 board[1][3] 之间隔着 board[1][4]
  board[1][4] = 2;
  board[2][3] = 3;
  // 初始无直接配对
  assert.equal(findSolvablePair(board), null);
  const result = findSolvablePairDeep(board);
  assert.ok(result.pair, '拖拽可达解应被找到');
  assert.equal(result.direct, false);
  assert.ok(result.depth >= 1);
});

test('findSolvablePairDeep reports direct pair without search', () => {
  const board = deepEmptyBoard();
  board[0][0] = 5;
  board[0][2] = 5;
  const result = findSolvablePairDeep(board);
  assert.equal(result.direct, true);
  assert.equal(result.depth, 0);
  assert.equal(result.pair.r1, 0);
});

test('findSolvablePairDeep declares true deadlock (nothing reachable)', () => {
  const board = deepEmptyBoard();
  // 全盘仅 2 枚不同图标，永无可消对，且任何拖拽都无法改变这一点
  board[0][0] = 0;
  board[5][5] = 1;
  const result = findSolvablePairDeep(board);
  assert.equal(result.pair, null);
});

test('hasAnySolvablePairDeep mirrors findSolvablePairDeep', () => {
  const board = deepEmptyBoard();
  board[0][0] = 0;
  board[3][2] = 0;
  board[3][4] = 1;
  board[0][9] = 1;
  assert.equal(hasAnySolvablePair(board), false);
  assert.equal(hasAnySolvablePairDeep(board), true);
});

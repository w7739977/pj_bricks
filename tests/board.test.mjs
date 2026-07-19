import test from 'node:test';
import assert from 'node:assert/strict';

import { ROWS, COLS, applyShift, findTargets } from '../game/board.js';

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

test('dragging stops at an adjacent occupied cell instead of pushing a chain', () => {
  const board = emptyBoard();
  board[0][0] = 1;
  board[0][1] = 2;
  board[0][2] = 3;
  const before = board.map(row => row.slice());

  const result = applyShift(board, 0, 0, 'row', 1);

  assert.deepEqual(result, { applied: 0, moves: [] });
  assert.deepEqual(board, before);
});

test('a tile can cross multiple consecutive empty cells', () => {
  const board = emptyBoard();
  board[2][1] = 4;

  const result = applyShift(board, 2, 1, 'row', 3);

  assert.deepEqual(result, {
    applied: 3,
    moves: [{ fromR: 2, fromC: 1, toR: 2, toC: 4 }],
  });
  assert.equal(board[2][1], null);
  assert.equal(board[2][4], 4);
});

test('a tile stops in the last empty cell before an obstacle', () => {
  const board = emptyBoard();
  board[3][1] = 5;
  board[3][4] = 9;

  const result = applyShift(board, 3, 1, 'row', 8);

  assert.deepEqual(result, {
    applied: 2,
    moves: [{ fromR: 3, fromC: 1, toR: 3, toC: 3 }],
  });
  assert.equal(board[3][3], 5);
  assert.equal(board[3][4], 9);
});

test('single-tile movement is symmetric in all four directions', () => {
  const cases = [
    { start: [5, 5], axis: 'row', delta: 2, end: [5, 7] },
    { start: [5, 5], axis: 'row', delta: -2, end: [5, 3] },
    { start: [5, 5], axis: 'col', delta: 2, end: [7, 5] },
    { start: [5, 5], axis: 'col', delta: -2, end: [3, 5] },
  ];

  for (const { start, axis, delta, end } of cases) {
    const board = emptyBoard();
    board[start[0]][start[1]] = 6;
    const result = applyShift(board, start[0], start[1], axis, delta);
    assert.equal(result.applied, delta);
    assert.equal(result.moves.length, 1);
    assert.equal(board[end[0]][end[1]], 6);
    assert.equal(board[start[0]][start[1]], null);
  }
});

test('moving a tile can expose every legal target for player selection', () => {
  const board = emptyBoard();
  board[0][0] = 7;
  board[0][1] = 7;
  board[0][4] = 7;

  applyShift(board, 0, 1, 'row', 1);

  assert.deepEqual(findTargets(board, 0, 2), [
    { r: 0, c: 0 },
    { r: 0, c: 4 },
  ]);
});

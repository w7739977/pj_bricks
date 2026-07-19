import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROWS,
  COLS,
  applyShift,
  createShiftChain,
  createShiftRevertMoves,
  findTargets,
} from '../game/board.js';

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

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

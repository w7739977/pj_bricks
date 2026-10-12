import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceDragShift,
  createDragFrameQueue,
  createDragInputLock,
  dragStepsFromDistance,
} from '../dist/game/drag-input.js';

test('activation slop does not prematurely snap a tile', () => {
  assert.equal(dragStepsFromDistance(9, 40, 10), 0);
  assert.equal(dragStepsFromDistance(11, 40, 10), 0);
  assert.equal(dragStepsFromDistance(-11, 40, 10), -0);
});

test('an active drag ignores other pointers until its owner releases', () => {
  const lock = createDragInputLock();

  assert.equal(lock.begin(11), true);
  assert.equal(lock.begin(22), false);
  assert.equal(lock.owns(11), true);
  assert.equal(lock.owns(22), false);
  assert.equal(lock.release(22), false);
  assert.equal(lock.owns(11), true);
  assert.equal(lock.release(11), true);
  assert.equal(lock.begin(22), true);
});

test('advancing a drag applies the requested integer board shift', () => {
  const calls = [];
  const result = advanceDragShift({
    distance: 21,
    pitch: 40,
    threshold: 10,
    lastShift: 0,
    applyShift(delta) {
      calls.push(delta);
      return { applied: delta, moves: [{ id: 'move' }] };
    },
  });

  assert.deepEqual(calls, [1]);
  assert.equal(result.applied, 1);
  assert.equal(result.lastShift, 1);
  assert.equal(result.visualOffset, -19);
  assert.equal(result.constrained, false);
  assert.deepEqual(result.moves, [{ id: 'move' }]);
});

test('pointer movement updates the residual without another integer shift', () => {
  let calls = 0;
  const result = advanceDragShift({
    distance: 50,
    pitch: 40,
    threshold: 10,
    lastShift: 1,
    applyShift() {
      calls++;
      return { applied: 0, moves: [] };
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.lastShift, 1);
  assert.equal(result.visualOffset, 10);
  assert.equal(result.constrained, false);
});

test('blocked movement clamps visual resistance before the next cell', () => {
  const result = advanceDragShift({
    distance: 100,
    pitch: 40,
    threshold: 10,
    lastShift: 1,
    applyShift() {
      return { applied: 0, moves: [] };
    },
  });

  assert.equal(result.applied, 0);
  assert.equal(result.lastShift, 1);
  assert.equal(result.visualOffset, 20);
  assert.equal(result.constrained, true);
});

test('blocked resistance stays clamped until the pointer retreats', () => {
  const blocked = advanceDragShift({
    distance: 60,
    pitch: 40,
    threshold: 10,
    lastShift: 1,
    blockedDirection: 0,
    applyShift() {
      return { applied: 0, moves: [] };
    },
  });
  const stillBlocked = advanceDragShift({
    distance: 59,
    pitch: 40,
    threshold: 10,
    lastShift: blocked.lastShift,
    blockedDirection: blocked.blockedDirection,
    applyShift() {
      throw new Error('no integer shift expected');
    },
  });
  const retreated = advanceDragShift({
    distance: 39,
    pitch: 40,
    threshold: 10,
    lastShift: stillBlocked.lastShift,
    blockedDirection: stillBlocked.blockedDirection,
    applyShift() {
      throw new Error('no integer shift expected');
    },
  });

  assert.equal(blocked.blockedDirection, 1);
  assert.equal(stillBlocked.visualOffset, 19);
  assert.equal(stillBlocked.constrained, true);
  assert.equal(retreated.visualOffset, -1);
  assert.equal(retreated.blockedDirection, 0);
  assert.equal(retreated.constrained, false);
});

test('partial movement derives drag state from the applied distance', () => {
  const result = advanceDragShift({
    distance: -100,
    pitch: 40,
    threshold: 10,
    lastShift: 0,
    applyShift() {
      return { applied: -1, moves: [{ id: 'partial' }] };
    },
  });

  assert.equal(result.applied, -1);
  assert.equal(result.lastShift, -1);
  assert.equal(result.visualOffset, -20);
  assert.equal(result.constrained, true);
});

test('half-cell snapping is symmetric including fractional pitch', () => {
  for (const pitch of [32, 35.5, 40]) {
    for (const sign of [-1, 1]) {
      assert.equal(dragStepsFromDistance(sign * (pitch / 2 - 0.01), pitch, 10), sign * 0);
      assert.equal(dragStepsFromDistance(sign * pitch / 2, pitch, 10), sign);
      assert.equal(dragStepsFromDistance(sign * pitch * 1.5, pitch, 10), sign * 2);
    }
  }
});

test('release flushes final pointer coordinates and invalidates a queued frame', () => {
  const frames = [];
  const moves = [];
  const queue = createDragFrameQueue({
    requestFrame: cb => { frames.push(cb); return frames.length; },
    cancelFrame: () => {},
    onMove: (x, y) => moves.push([x, y]),
  });
  queue.push(11, 0);
  queue.push(19, 0);
  assert.equal(frames.length, 1);
  queue.flush(42, 3);
  frames[0]();
  assert.deepEqual(moves, [[42, 3]]);
  queue.push(9, 9);
  frames[0]();
  frames[1]();
  assert.deepEqual(moves, [[42, 3], [9, 9]]);
});

test('cancel discards old gesture coordinates before a new gesture', () => {
  const frames = [];
  const moves = [];
  const queue = createDragFrameQueue({
    requestFrame: cb => { frames.push(cb); return frames.length; },
    cancelFrame: () => {},
    onMove: (x, y) => moves.push([x, y]),
  });
  queue.push(100, 0);
  queue.cancel();
  queue.push(0, 50);
  frames[0]();
  assert.deepEqual(moves, []);
  frames[1]();
  assert.deepEqual(moves, [[0, 50]]);
});

test('the full drag chain stays inside every board edge at fractional pitches', async () => {
  const { constrainDragOffset } = await import('../dist/game/drag-input.js');
  for (const pitch of [31.7, 35.5, 46]) {
    for (const axis of ['row', 'col']) {
      const positions = [{r: 2,c: 1}, {r: 3,c: 2}, {r: 4,c: 3}];
      for (const distance of [-1000, -pitch, 0, pitch, 1000]) {
        const offset = constrainDragOffset({ positions, axis, distance, pitch, rows: 14, cols: 10 });
        for (const p of positions) {
          const origin = (axis === 'row' ? p.c : p.r) * pitch;
          const edge = ((axis === 'row' ? 10 : 14) - 1) * pitch;
          assert.ok(origin + offset >= -1e-9);
          assert.ok(origin + offset <= edge + 1e-9);
        }
      }
    }
  }
});

test('edge tile has no outward overshoot but follows movement back into board', async () => {
  const { constrainDragOffset } = await import('../dist/game/drag-input.js');
  const base = { positions: [{r: 0,c: 0}], axis: 'row', pitch: 40, rows: 14, cols: 10 };
  assert.equal(constrainDragOffset({...base, distance: -900}), -0);
  assert.equal(constrainDragOffset({...base, distance: 11}), 11);
  assert.equal(constrainDragOffset({...base, distance: 900}), 360);
});

test('an unrelated tile stops the whole chain before visual overlap on either axis', async () => {
  const { constrainDragOffset } = await import('../dist/game/drag-input.js');
  for (const axis of ['row','col']) {
    const board = Array.from({length:14},()=>Array(10).fill(null));
    const positions = axis === 'row' ? [{r:4,c:3},{r:4,c:4}] : [{r:3,c:4},{r:4,c:4}];
    for (const p of positions) board[p.r][p.c] = 1;
    if (axis === 'row') {board[4][1]=2;board[4][7]=3;}
    else {board[1][4]=2;board[7][4]=3;}
    const options = {positions,axis,board,pitch:35.5,rows:14,cols:10};
    assert.equal(constrainDragOffset({...options,distance:1000}),71);
    assert.equal(constrainDragOffset({...options,distance:-1000}),-35.5);
    assert.equal(constrainDragOffset({...options,distance:42}),42);
    // Reversal is immediate and the immutable original board was not changed.
    assert.equal(constrainDragOffset({...options,distance:65}),65);
    assert.equal(board[positions[0].r][positions[0].c],1);
  }
});

test('even a sub-half-cell move cannot overlap a tile immediately behind a fixed chain', async () => {
  const { constrainDragOffset } = await import('../dist/game/drag-input.js');
  const board = Array.from({length:14},()=>Array(10).fill(null));
  board[4][2]=2;board[4][3]=1;board[4][4]=1;
  const options = {positions:[{r:4,c:3},{r:4,c:4}],axis:'row',board,pitch:40,rows:14,cols:10};
  assert.equal(constrainDragOffset({...options,distance:-11}),-0);
  assert.equal(constrainDragOffset({...options,distance:-1000}),-0);
  assert.equal(constrainDragOffset({...options,distance:11}),11);
});

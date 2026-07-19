import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceDragShift,
  createDragInputLock,
  dragStepsFromDistance,
} from '../game/drag-input.js';

test('crossing the drag threshold moves at least one cell', () => {
  assert.equal(dragStepsFromDistance(9, 40, 10), 0);
  assert.equal(dragStepsFromDistance(11, 40, 10), 1);
  assert.equal(dragStepsFromDistance(-11, 40, 10), -1);
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
    distance: 11,
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
  assert.equal(result.visualOffset, -29);
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
  assert.equal(result.visualOffset, 14);
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
  assert.equal(stillBlocked.visualOffset, 14);
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
  assert.equal(result.visualOffset, -14);
  assert.equal(result.constrained, true);
});

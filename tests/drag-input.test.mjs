import test from 'node:test';
import assert from 'node:assert/strict';

import { createDragInputLock, dragStepsFromDistance } from '../game/drag-input.js';

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

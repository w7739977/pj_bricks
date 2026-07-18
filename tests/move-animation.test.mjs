import test from 'node:test';
import assert from 'node:assert/strict';

import { createMoveAnimator } from '../game/move-animation.js';

function createScheduler() {
  let nextId = 1;
  const frames = new Map();
  const timers = new Map();
  const cancelledFrames = new Set();
  const cancelledTimers = new Set();

  return {
    requestFrame(callback) {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      cancelledFrames.add(id);
    },
    setTimer(callback) {
      const id = nextId++;
      timers.set(id, callback);
      return id;
    },
    clearTimer(id) {
      cancelledTimers.add(id);
    },
    runFrame(id) {
      frames.get(id)?.();
    },
    runTimer(id) {
      timers.get(id)?.();
    },
    frameIds() {
      return [...frames.keys()];
    },
    timerIds() {
      return [...timers.keys()];
    },
    cancelledFrames,
    cancelledTimers,
  };
}

function createCell() {
  return {
    style: { transition: '', transform: '' },
    get offsetWidth() { return 40; },
  };
}

test('cleanup timing starts only after the transition frame begins', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);

  assert.deepEqual(scheduler.timerIds(), []);
  scheduler.runFrame(scheduler.frameIds()[0]);
  assert.equal(scheduler.timerIds().length, 1);
});

test('stale callbacks cannot overwrite a newer animation on the same cell', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const [oldFrame] = scheduler.frameIds();
  const [oldTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 2 },
  ], 90);

  assert.equal(cell.style.transform, 'translate(-80px, 0px)');
  assert.equal(cell.style.transition, 'none');

  scheduler.runFrame(oldFrame);
  scheduler.runTimer(oldTimer);

  assert.equal(cell.style.transform, 'translate(-80px, 0px)');
  assert.equal(cell.style.transition, 'none');
});

test('a newer animation cancels pending work for the same cell', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const [oldFrame] = scheduler.frameIds();
  scheduler.runFrame(oldFrame);
  const [oldTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 1, toR: 0, toC: 2 },
  ], 90);

  assert.equal(scheduler.cancelledFrames.has(oldFrame), true);
  assert.equal(scheduler.cancelledTimers.has(oldTimer), true);

  scheduler.runTimer(oldTimer);
  assert.equal(cell.style.transform, 'translate(-40px, 0px)');
  assert.equal(cell.style.transition, 'none');
});

test('cancelAll clears active cells and blocks retained callbacks', () => {
  const scheduler = createScheduler();
  const cells = [createCell(), createCell()];
  const animator = createMoveAnimator({
    getCell: (_r, c) => cells[c],
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 0 },
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 90);
  const frameIds = scheduler.frameIds();
  const timerIds = scheduler.timerIds();

  animator.cancelAll();

  assert.deepEqual(cells.map(cell => cell.style), [
    { transition: '', transform: '' },
    { transition: '', transform: '' },
  ]);
  assert.equal(frameIds.every(id => scheduler.cancelledFrames.has(id)), true);
  assert.equal(timerIds.every(id => scheduler.cancelledTimers.has(id)), true);

  frameIds.forEach(id => scheduler.runFrame(id));
  timerIds.forEach(id => scheduler.runTimer(id));
  assert.deepEqual(cells.map(cell => cell.style), [
    { transition: '', transform: '' },
    { transition: '', transform: '' },
  ]);
});

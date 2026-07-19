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

function createCell(onLayout = () => {}) {
  return {
    style: { transition: '', transform: '' },
    get offsetWidth() {
      onLayout();
      return 40;
    },
  };
}

test('follow transfers a continuous visual offset to the chain current cells', () => {
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

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  assert.equal(cells[0].style.transform, 'translate(12px, 0px)');
  assert.equal(cells[0].style.transition, 'none');

  animator.follow([{ r: 0, c: 1 }], -28, 0);
  assert.deepEqual(cells[0].style, { transition: '', transform: '' });
  assert.equal(cells[1].style.transform, 'translate(-28px, 0px)');
});

test('settleFollow magnetically returns followed cells to the grid', () => {
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

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120);
  scheduler.runFrame(scheduler.frameIds()[0]);

  assert.equal(cell.style.transition, 'transform 120ms cubic-bezier(0.22, 0.61, 0.36, 1)');
  assert.equal(cell.style.transform, '');

  scheduler.runTimer(scheduler.timerIds()[0]);
  assert.deepEqual(cell.style, { transition: '', transform: '' });
});

test('settleFollow commits the pointer offset before scheduling its transition', () => {
  const scheduler = createScheduler();
  let layoutReads = 0;
  const cell = createCell(() => { layoutReads++; });
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120);

  assert.equal(layoutReads, 1);
});

test('settleFollow reports completion after its cleanup timer', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  let completions = 0;
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 14, 0);
  animator.settleFollow(120, () => { completions++; });
  assert.equal(completions, 0);
  scheduler.runFrame(scheduler.frameIds()[0]);
  assert.equal(completions, 0);
  scheduler.runTimer(scheduler.timerIds()[0]);
  assert.equal(completions, 1);
});

test('rollback animation includes the pointer residual offset', () => {
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
    { fromR: 0, fromC: 2, toR: 0, toC: 0 },
  ], 200, { offsetX: 6, offsetY: 0 });

  assert.equal(cell.style.transform, 'translate(86px, 0px)');
});

test('rollback animation releases direct pointer-follow ownership', () => {
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

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 1 },
  ], 200, { offsetX: 12 });

  assert.deepEqual(cells[0].style, { transition: '', transform: '' });
  assert.equal(cells[1].style.transform, 'translate(-28px, 0px)');
});

test('an empty rollback settles the followed cells in place', () => {
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

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.animate([], 200, { offsetX: 12 });
  scheduler.runFrame(scheduler.frameIds()[0]);

  assert.equal(cell.style.transition, 'transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1)');
  assert.equal(cell.style.transform, '');
});

test('a newer animation blocks retained settle callbacks', () => {
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

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.settleFollow(120);
  const [settleFrame] = scheduler.frameIds();
  scheduler.runFrame(settleFrame);
  const [settleTimer] = scheduler.timerIds();

  animator.animate([
    { fromR: 0, fromC: 0, toR: 0, toC: 2 },
  ], 200);
  scheduler.runTimer(settleTimer);

  assert.equal(cell.style.transform, 'translate(-80px, 0px)');
  assert.equal(cell.style.transition, 'none');
});

test('zero-duration settling clears follow styles synchronously', () => {
  const scheduler = createScheduler();
  const cell = createCell();
  let completions = 0;
  const animator = createMoveAnimator({
    getCell: () => cell,
    getPitch: () => 40,
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame,
    setTimer: scheduler.setTimer,
    clearTimer: scheduler.clearTimer,
  });

  animator.follow([{ r: 0, c: 0 }], 12, 0);
  animator.settleFollow(0, () => { completions++; });

  assert.deepEqual(cell.style, { transition: '', transform: '' });
  assert.deepEqual(scheduler.frameIds(), []);
  assert.deepEqual(scheduler.timerIds(), []);
  assert.equal(completions, 1);
});

test('zero-duration movement leaves no animation callbacks or styles', () => {
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
  ], 0);

  assert.deepEqual(cell.style, { transition: '', transform: '' });
  assert.deepEqual(scheduler.frameIds(), []);
  assert.deepEqual(scheduler.timerIds(), []);
});

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

test('cancelAll clears cells that are following the pointer', () => {
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

  animator.follow([{ r: 0, c: 0 }], 15, 0);
  animator.cancelAll();

  assert.deepEqual(cell.style, { transition: '', transform: '' });
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

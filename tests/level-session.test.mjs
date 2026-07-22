import test from 'node:test';
import assert from 'node:assert/strict';

import { createLevelSession } from '../game/level-session.js';

function session({ level = 4, seed = null, hints = 2, reshuffles = 1 } = {}) {
  return createLevelSession({
    progress: {
      version: 1,
      currentLevel: level,
      highestUnlocked: level,
      levelSeed: seed,
    },
    config: { hints, reshuffles },
    createNextSeed: () => 987654321,
  });
}

test('retry keeps level and seed while restoring configured resources', () => {
  const value = session();
  value.useHint({ pairAvailable: true });
  value.useReshuffle({ success: true });

  assert.deepEqual(value.retry(), {
    currentLevel: 4,
    highestUnlocked: 4,
    levelSeed: null,
    hintsRemaining: 2,
    reshufflesRemaining: 1,
    phase: 'playing',
    failureReason: null,
  });
});

test('successful hint consumes one resource while deadlock hint consumes none', () => {
  const value = session();

  assert.equal(value.useHint({ pairAvailable: true }).action, 'highlight-pair');
  assert.equal(value.snapshot().hintsRemaining, 1);
  assert.equal(value.useHint({ pairAvailable: false }).action, 'deadlock');
  assert.equal(value.snapshot().hintsRemaining, 1);
});

test('successful reshuffle consumes the shared resource', () => {
  const value = session({ reshuffles: 2 });

  assert.deepEqual(value.useReshuffle({ success: true }), { action: 'reshuffled' });
  assert.equal(value.snapshot().reshufflesRemaining, 1);
});

test('failed reshuffle preserves the shared resource and enters failed phase', () => {
  const value = session();

  assert.deepEqual(value.useReshuffle({ success: false }), {
    action: 'generation-failed',
  });
  assert.equal(value.snapshot().reshufflesRemaining, 1);
  assert.equal(value.snapshot().phase, 'failed');
  assert.equal(value.snapshot().failureReason, 'generation');
});

test('deadlock exposes rescue only while a reshuffle remains', () => {
  const withResource = session();
  assert.deepEqual(withResource.deadlock(), { action: 'offer-reshuffle' });

  const withoutResource = session({ reshuffles: 0 });
  assert.deepEqual(withoutResource.deadlock(), { action: 'failed' });
  assert.equal(withoutResource.snapshot().phase, 'failed');
  assert.equal(withoutResource.snapshot().failureReason, 'deadlock');
});

test('complete advances current and highest levels together', () => {
  const value = session();
  const result = value.complete();

  assert.equal(result.action, 'level-complete');
  assert.deepEqual(result.progress, {
    version: 1,
    currentLevel: 5,
    highestUnlocked: 5,
    levelSeed: null,
  });
  assert.equal(value.snapshot().phase, 'level-complete');
});

test('completing level five creates the level six seed', () => {
  const value = session({ level: 5 });
  assert.equal(value.complete().progress.levelSeed, 987654321);
});

test('resources cannot be consumed outside playing phase', () => {
  const value = session();
  value.fail('deadlock');

  assert.deepEqual(value.useHint({ pairAvailable: true }), { action: 'none' });
  assert.deepEqual(value.useReshuffle({ success: true }), { action: 'none' });
});

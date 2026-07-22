import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROGRESS_KEY,
  createDefaultProgress,
  loadProgress,
  parseProgress,
  saveProgress,
} from '../game/progress.js';

const fixed = JSON.stringify({
  version: 1,
  currentLevel: 5,
  highestUnlocked: 5,
  levelSeed: null,
});
const random = JSON.stringify({
  version: 1,
  currentLevel: 6,
  highestUnlocked: 6,
  levelSeed: 42,
});

test('default progress starts at level one without a random seed', () => {
  assert.deepEqual(createDefaultProgress(), {
    version: 1,
    currentLevel: 1,
    highestUnlocked: 1,
    levelSeed: null,
  });
});

test('parseProgress accepts fixed and random level seeds', () => {
  assert.equal(parseProgress(fixed).ok, true);
  assert.equal(parseProgress(random).ok, true);
});

test('parseProgress rejects malformed or inconsistent progress', () => {
  assert.equal(parseProgress('{').ok, false);
  assert.equal(parseProgress(JSON.stringify({ version: 2 })).ok, false);
  assert.equal(parseProgress(JSON.stringify({
    version: 1,
    currentLevel: 5,
    highestUnlocked: 6,
    levelSeed: null,
  })).ok, false);
  assert.equal(parseProgress(JSON.stringify({
    version: 1,
    currentLevel: 6,
    highestUnlocked: 6,
    levelSeed: null,
  })).ok, false);
});

test('loadProgress returns default progress when the key is absent', () => {
  const storage = { getItem() { return null; } };
  assert.deepEqual(loadProgress(storage), {
    ok: true,
    value: createDefaultProgress(),
  });
});

test('loadProgress returns a failure result when storage throws', () => {
  const result = loadProgress({
    getItem() {
      throw new Error('SecurityError');
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /SecurityError/);
});

test('saveProgress serializes under the versioned storage key', () => {
  const writes = [];
  const storage = {
    setItem(key, value) {
      writes.push([key, value]);
    },
  };
  const value = JSON.parse(random);
  assert.deepEqual(saveProgress(storage, value), { ok: true, value });
  assert.deepEqual(writes, [[PROGRESS_KEY, JSON.stringify(value)]]);
});

test('saveProgress rejects invalid random-level progress', () => {
  const storage = {
    setItem() {
      throw new Error('must not write');
    },
  };
  const result = saveProgress(storage, {
    version: 1,
    currentLevel: 6,
    highestUnlocked: 6,
    levelSeed: null,
  });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /Invalid level progress/);
});

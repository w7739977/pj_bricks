import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRandomSeed,
  createSeededRng,
  getLevelConfig,
} from '../game/levels.js';

test('level configuration grows from fourteen icons to twenty and then caps', () => {
  assert.deepEqual(
    Array.from({ length: 9 }, (_, i) => getLevelConfig(i + 1, { randomSeed: 123 }).iconCount),
    [14, 15, 16, 17, 18, 19, 20, 20, 20],
  );
});

test('fixed levels ignore supplied random seeds', () => {
  assert.deepEqual(
    getLevelConfig(3, { randomSeed: 1 }),
    getLevelConfig(3, { randomSeed: 0xffffffff }),
  );
});

test('random levels require an unsigned 32-bit seed', () => {
  assert.throws(() => getLevelConfig(6), RangeError);
  assert.throws(() => getLevelConfig(6, { randomSeed: -1 }), RangeError);
  assert.throws(() => getLevelConfig(6, { randomSeed: 0x100000000 }), RangeError);
  assert.equal(getLevelConfig(6, { randomSeed: 0xffffffff }).seed, 0xffffffff);
});

test('level resource budgets match the approved curve', () => {
  const configs = Array.from({ length: 8 }, (_, i) =>
    getLevelConfig(i + 1, { randomSeed: 123 }),
  );
  assert.deepEqual(configs.map(({ hints }) => hints), [3, 3, 2, 2, 1, 1, 0, 0]);
  assert.deepEqual(configs.map(({ reshuffles }) => reshuffles), [3, 2, 2, 1, 1, 1, 1, 1]);
});

test('new fruit indices unlock only on levels two through seven', () => {
  assert.deepEqual(
    Array.from({ length: 8 }, (_, i) =>
      getLevelConfig(i + 1, { randomSeed: 123 }).unlockedIconIndex,
    ),
    [null, 14, 15, 16, 17, 18, 19, null],
  );
});

test('seeded random generators repeat the same sequence', () => {
  const left = createSeededRng(123456);
  const right = createSeededRng(123456);
  assert.deepEqual(
    Array.from({ length: 6 }, () => left()),
    Array.from({ length: 6 }, () => right()),
  );
});

test('random seed uses crypto and falls back to the supplied random source', () => {
  const cryptoSource = {
    getRandomValues(values) {
      values[0] = 0x89abcdef;
      return values;
    },
  };
  assert.equal(createRandomSeed(cryptoSource), 0x89abcdef);
  assert.equal(createRandomSeed(null, () => 0.5), 0x80000000);
});

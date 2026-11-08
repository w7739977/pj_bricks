import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRandomSeed,
  createSeededRng,
  getLevelConfig,
} from '../dist/game/levels.js';

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
  assert.deepEqual(configs.map(({ hints }) => hints), [4, 3, 3, 2, 2, 2, 1, 1]);
  assert.deepEqual(configs.map(({ reshuffles }) => reshuffles), [2, 2, 2, 1, 1, 1, 1, 1]);
  for (const level of [9,10,15,20,30]) {
    const config=getLevelConfig(level,{randomSeed:123});
    assert.equal(config.reshuffles,0);
    assert.equal(config.rewardedReshuffleLimit,1);
  }
  assert.equal(getLevelConfig(10,{randomSeed:123}).hints,1);
  assert.equal(getLevelConfig(11,{randomSeed:123}).hints,0);
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

test('opening choices and assistance decrease as the icon pool grows', () => {
  const configs = Array.from({length:20},(_,i)=>getLevelConfig(i+1,{randomSeed:123}));
  for(let i=1;i<configs.length;i++) {
    assert.ok(configs[i].iconCount >= configs[i-1].iconCount);
    assert.ok(configs[i].openingPairs.max <= configs[i-1].openingPairs.max);
    assert.ok(configs[i].hints <= configs[i-1].hints);
    assert.ok(configs[i].reshuffles <= configs[i-1].reshuffles);
    assert.ok(configs[i].openingPairs.min >= 1);
  }
  assert.deepEqual(configs[0].openingPairs,{min:18,max:22});
  assert.deepEqual(configs[9].openingPairs,{min:3,max:5});
  assert.deepEqual(configs[14].openingPairs,{min:1,max:2});
  assert.deepEqual(configs[19].openingPairs,{min:1,max:1});
});

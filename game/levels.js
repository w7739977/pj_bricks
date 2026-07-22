const FIXED_SEEDS = Object.freeze([
  0x1a2b3c4d,
  0x2b3c4d5e,
  0x3c4d5e6f,
  0x4d5e6f70,
  0x5e6f7081,
]);

const HINTS = Object.freeze([3, 3, 2, 2, 1, 1]);
const RESHUFFLES = Object.freeze([3, 2, 2, 1]);
const BASE_ICON_COUNT = 14;
const MAX_ICON_COUNT = 20;

function assertLevelNumber(levelNumber) {
  if (!Number.isInteger(levelNumber) || levelNumber < 1) {
    throw new RangeError('levelNumber must be a positive integer');
  }
}

function assertUint32(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('randomSeed must be an unsigned 32-bit integer');
  }
  return seed >>> 0;
}

export function createSeededRng(seed) {
  let state = assertUint32(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
  };
}

export function createRandomSeed(cryptoSource = globalThis.crypto, fallbackRandom = Math.random) {
  if (cryptoSource?.getRandomValues) {
    return cryptoSource.getRandomValues(new Uint32Array(1))[0] >>> 0;
  }
  return Math.floor(fallbackRandom() * 0x100000000) >>> 0;
}

export function getLevelConfig(levelNumber, { randomSeed = null } = {}) {
  assertLevelNumber(levelNumber);
  const fixedSeed = FIXED_SEEDS[levelNumber - 1];
  const seed = fixedSeed === undefined ? assertUint32(randomSeed) : fixedSeed;
  const iconCount = Math.min(MAX_ICON_COUNT, BASE_ICON_COUNT + levelNumber - 1);
  const hints = HINTS[levelNumber - 1] ?? 0;
  const reshuffles = RESHUFFLES[levelNumber - 1] ?? 1;

  return Object.freeze({
    levelNumber,
    seed,
    iconIndices: Object.freeze(Array.from({ length: iconCount }, (_, i) => i)),
    iconCount,
    hints,
    reshuffles,
    unlockedIconIndex: levelNumber >= 2 && levelNumber <= 7
      ? levelNumber + 12
      : null,
  });
}

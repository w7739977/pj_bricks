export const PROGRESS_KEY = 'lianliankan.progress.v1';
const VERSION = 1;

export function createDefaultProgress() {
  return {
    version: VERSION,
    currentLevel: 1,
    highestUnlocked: 1,
    levelSeed: null,
  };
}

function validateProgress(value) {
  const levelIsValid = Number.isInteger(value?.currentLevel) && value.currentLevel > 0;
  const highestIsValid = value?.highestUnlocked === value?.currentLevel;
  const seedIsValid = value?.currentLevel <= 5
    ? value?.levelSeed === null
    : Number.isInteger(value?.levelSeed) &&
      value.levelSeed >= 0 &&
      value.levelSeed <= 0xffffffff;

  if (value?.version !== VERSION || !levelIsValid || !highestIsValid || !seedIsValid) {
    throw new TypeError('Invalid level progress');
  }

  return Object.freeze({
    version: VERSION,
    currentLevel: value.currentLevel,
    highestUnlocked: value.highestUnlocked,
    levelSeed: value.levelSeed === null ? null : value.levelSeed >>> 0,
  });
}

export function parseProgress(rawValue) {
  try {
    if (rawValue === null) {
      return { ok: true, value: createDefaultProgress() };
    }
    return { ok: true, value: validateProgress(JSON.parse(rawValue)) };
  } catch (error) {
    return { ok: false, error };
  }
}

export function loadProgress(storage) {
  try {
    return parseProgress(storage.getItem(PROGRESS_KEY));
  } catch (error) {
    return { ok: false, error };
  }
}

export function saveProgress(storage, progress) {
  try {
    const value = validateProgress(progress);
    storage.setItem(PROGRESS_KEY, JSON.stringify(value));
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error };
  }
}

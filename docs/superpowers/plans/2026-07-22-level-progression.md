# Level Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single random game into persistent sequential levels with five fixed-seed stages, infinite seeded random stages, 14-to-20 icon progression, limited hint/reshuffle resources, deterministic retries, and safe level transitions.

**Architecture:** Add DOM-free `levels.js`, `progress.js`, and `level-session.js` modules for configuration, persistence, and resource/phase transitions. Parameterize `board.js`, keep `interaction.js` as the browser controller, and replace ad-hoc dialog listeners with a cancellable dialog manager so stale callbacks cannot cross level boundaries.

**Tech Stack:** Native JavaScript ES Modules, browser `localStorage`, browser `crypto.getRandomValues`, native `<dialog>`, CSS, Node.js built-in `node:test`; no package manager, third-party dependency, build step, lint tool, or test framework.

## Global Constraints

- Preserve the 14-row × 10-column board and zero-turn straight-line elimination rule.
- Preserve fixed push-chain membership, one-pointer drag ownership, rollback semantics, and dynamic measured `state.pitch`.
- Keep `game/board.js`, `game/levels.js`, `game/progress.js`, and `game/level-session.js` DOM-free.
- Keep existing numeric board values: every occupied cell is an index into `ICON_NAMES`; empty cells are `null`.
- Levels 1–5 always use fixed seeds; levels 6+ require a persisted unsigned 32-bit seed.
- The first level uses 14 icons; levels 2–7 unlock banana, orange, pear, cherry, peach, and watermelon; level 7+ uses all 20.
- Board generation guarantees only an initial removable pair, not a complete solution.
- Manual reshuffle and deadlock rescue share one resource pool; consume a reshuffle only after successful generation.
- Preserve native button/dialog keyboard semantics, ARIA labels, the grid role, live status text, and `prefers-reduced-motion` behavior.
- Run all automated tests with `node --test tests/*.test.mjs`; there is no build or lint command.
- Do not stage or commit `ScreenShot_2026-07-19_143405_876.png` or `ScreenShot_2026-07-19_151418_495.png`.

## File Structure

- Create `game/levels.js`: fixed seeds, level curves, icon unlock order, deterministic PRNG, random seed creation.
- Create `game/progress.js`: versioned progress validation and safe storage adapter.
- Create `game/level-session.js`: pure phase/resource/progress state transitions.
- Modify `game/board.js`: parameterized paired-pool generation and rollback-safe reshuffle results.
- Modify `game/svg-icons.js`: append six fruit icons without changing the original 14 indices.
- Modify `game/dialogs.js`: promise-based cancellable manager with one active listener set per dialog.
- Modify `game/interaction.js`: load/retry/complete levels, persist progress, consume resources, invalidate stale asynchronous work.
- Modify `index.html`: level label, resource badges, retry copy, completion/deadlock/failure dialog markup.
- Modify `styles.css`: badges, disabled controls, unlock summary, screen-reader helper, reduced-motion final states.
- Create `tests/levels.test.mjs`, `tests/progress.test.mjs`, `tests/level-session.test.mjs`, `tests/dialogs.test.mjs`, and `tests/svg-icons.test.mjs`.
- Modify `tests/board.test.mjs` for the new board result contracts while retaining all existing drag-chain regression tests.

---

### Task 1: Deterministic Level Configuration

**Files:**
- Create: `game/levels.js`
- Create: `tests/levels.test.mjs`

**Interfaces:**
- Consumes: numeric icon indices `0..19` matching `ICON_NAMES`.
- Produces:
  - `getLevelConfig(levelNumber, { randomSeed = null } = {})`
  - `createSeededRng(seed)`
  - `createRandomSeed(cryptoSource = globalThis.crypto, fallbackRandom = Math.random)`
  - frozen config `{ levelNumber, seed, iconIndices, iconCount, hints, reshuffles, unlockedIconIndex }`

- [ ] **Step 1: Write failing tests for seeds, icon growth, unlocks, and resources**

Create `tests/levels.test.mjs`:

```js
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
  const cryptoSource = { getRandomValues(values) { values[0] = 0x89abcdef; return values; } };
  assert.equal(createRandomSeed(cryptoSource), 0x89abcdef);
  assert.equal(createRandomSeed(null, () => 0.5), 0x80000000);
});
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

Run:

```bash
node --test tests/levels.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `game/levels.js`.

- [ ] **Step 3: Implement the complete level configuration module**

Create `game/levels.js`:

```js
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
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
node --test tests/levels.test.mjs
```

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit the level module**

```bash
git add game/levels.js tests/levels.test.mjs
git commit -m "feat: add deterministic level configuration" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Versioned Progress Storage

**Files:**
- Create: `game/progress.js`
- Create: `tests/progress.test.mjs`

**Interfaces:**
- Consumes: Storage-like object implementing `getItem(key)` and `setItem(key, value)`.
- Produces:
  - `PROGRESS_KEY = 'lianliankan.progress.v1'`
  - `createDefaultProgress()`
  - `parseProgress(rawValue)`
  - `loadProgress(storage)`
  - `saveProgress(storage, progress)`
  - result union `{ ok: true, value } | { ok: false, error }`

- [ ] **Step 1: Write failing storage validation tests**

Create `tests/progress.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROGRESS_KEY,
  createDefaultProgress,
  loadProgress,
  parseProgress,
  saveProgress,
} from '../game/progress.js';

const fixed = JSON.stringify({ version: 1, currentLevel: 5, highestUnlocked: 5, levelSeed: null });
const random = JSON.stringify({ version: 1, currentLevel: 6, highestUnlocked: 6, levelSeed: 42 });

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
  assert.equal(parseProgress(JSON.stringify({ version: 1, currentLevel: 5, highestUnlocked: 6, levelSeed: null })).ok, false);
  assert.equal(parseProgress(JSON.stringify({ version: 1, currentLevel: 6, highestUnlocked: 6, levelSeed: null })).ok, false);
});

test('loadProgress returns a failure result when storage throws', () => {
  const result = loadProgress({ getItem() { throw new Error('SecurityError'); } });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /SecurityError/);
});

test('saveProgress serializes under the versioned storage key', () => {
  const writes = [];
  const storage = { setItem(key, value) { writes.push([key, value]); } };
  const value = JSON.parse(random);
  assert.deepEqual(saveProgress(storage, value), { ok: true, value });
  assert.deepEqual(writes, [[PROGRESS_KEY, JSON.stringify(value)]]);
});

test('saveProgress rejects invalid random-level progress', () => {
  const storage = { setItem() { throw new Error('must not write'); } };
  const result = saveProgress(storage, {
    version: 1,
    currentLevel: 6,
    highestUnlocked: 6,
    levelSeed: null,
  });
  assert.equal(result.ok, false);
});
```

- [ ] **Step 2: Run the tests and confirm the missing module failure**

```bash
node --test tests/progress.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement validated parsing and exception-safe storage**

Create `game/progress.js`:

```js
export const PROGRESS_KEY = 'lianliankan.progress.v1';
const VERSION = 1;

export function createDefaultProgress() {
  return { version: VERSION, currentLevel: 1, highestUnlocked: 1, levelSeed: null };
}

function validateProgress(value) {
  const levelIsValid = Number.isInteger(value?.currentLevel) && value.currentLevel > 0;
  const highestIsValid = value?.highestUnlocked === value?.currentLevel;
  const seedIsValid = value?.currentLevel <= 5
    ? value?.levelSeed === null
    : Number.isInteger(value?.levelSeed) && value.levelSeed >= 0 && value.levelSeed <= 0xffffffff;

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
    if (rawValue === null) return { ok: true, value: createDefaultProgress() };
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
```

- [ ] **Step 4: Run the focused tests**

```bash
node --test tests/progress.test.mjs
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Commit the progress module**

```bash
git add game/progress.js tests/progress.test.mjs
git commit -m "feat: add validated level progress storage" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Parameterized Board Generation and Safe Reshuffle

**Files:**
- Modify: `game/board.js:1-125`
- Modify: `tests/board.test.mjs`

**Interfaces:**
- Consumes: `iconIndices: number[]`, deterministic `rng: () => number`.
- Produces:
  - `createBoard({ iconIndices, rng, maxAttempts = 1000 })`
  - `reshuffleInPlace(board, rng, { maxAttempts = 1000 } = {})`
  - success/failure result objects.
- Preserves all existing path, target, fixed-chain, snapshot, and rollback exports.

- [ ] **Step 1: Add failing board generation tests before the existing chain tests**

Add imports for `cloneBoard`, `createBoard`, `hasAnySolvablePair`, and `reshuffleInPlace`, then add:

```js
import { createSeededRng } from '../game/levels.js';

test('parameterized board uses every enabled icon in even counts', () => {
  const result = createBoard({
    iconIndices: Array.from({ length: 17 }, (_, i) => i),
    rng: createSeededRng(123),
  });
  assert.equal(result.ok, true);
  assert.equal(result.board.length, ROWS);
  assert.equal(result.board.flat().length, ROWS * COLS);
  const counts = new Map();
  result.board.flat().forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  assert.equal(counts.size, 17);
  assert.equal([...counts.values()].every(count => count >= 2 && count % 2 === 0), true);
  assert.ok(Math.max(...counts.values()) - Math.min(...counts.values()) <= 2);
});

test('same seed creates the same solvable board', () => {
  const options = { iconIndices: Array.from({ length: 20 }, (_, i) => i) };
  const left = createBoard({ ...options, rng: createSeededRng(456) });
  const right = createBoard({ ...options, rng: createSeededRng(456) });
  assert.deepEqual(left, right);
  assert.equal(hasAnySolvablePair(left.board), true);
});

test('generation reports exhaustion', () => {
  const result = createBoard({ iconIndices: [0, 1], rng: () => 0, maxAttempts: 0 });
  assert.deepEqual(result, { ok: false, reason: 'no-solvable-pair' });
});

test('failed reshuffle restores the exact board', () => {
  const board = emptyBoard();
  board[0][0] = 1;
  board[13][9] = 2;
  const before = cloneBoard(board);
  const result = reshuffleInPlace(board, () => 0, { maxAttempts: 2 });
  assert.deepEqual(result, { ok: false, reason: 'no-solvable-pair' });
  assert.deepEqual(board, before);
});
```

- [ ] **Step 2: Run board tests and verify the API mismatch**

```bash
node --test tests/board.test.mjs
```

Expected: FAIL because current `createBoard()` returns a board array and `reshuffleInPlace()` returns the board.

- [ ] **Step 3: Replace fixed pool generation with paired round-robin generation**

Replace the current `KINDS`, `PER_KIND`, `createBoard`, and `buildRandomBoard` section with:

```js
export const ROWS = 14;
export const COLS = 10;
const CELL_COUNT = ROWS * COLS;
const PAIR_COUNT = CELL_COUNT / 2;

function validateIconIndices(iconIndices) {
  if (!Array.isArray(iconIndices) || iconIndices.length < 1 || iconIndices.length > PAIR_COUNT) {
    throw new RangeError('iconIndices must contain between 1 and 70 entries');
  }
  const allValid = iconIndices.every(value => Number.isInteger(value) && value >= 0);
  if (!allValid || new Set(iconIndices).size !== iconIndices.length) {
    throw new TypeError('iconIndices must contain unique non-negative integers');
  }
}

function createPairPool(iconIndices) {
  const pool = [];
  for (let pair = 0; pair < PAIR_COUNT; pair++) {
    const iconIndex = iconIndices[pair % iconIndices.length];
    pool.push(iconIndex, iconIndex);
  }
  return pool;
}

function shuffleInPlace(values, rng) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function poolToBoard(pool) {
  return Array.from({ length: ROWS }, (_, r) =>
    pool.slice(r * COLS, (r + 1) * COLS),
  );
}

export function createBoard({ iconIndices, rng = Math.random, maxAttempts = 1000 }) {
  validateIconIndices(iconIndices);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pool = createPairPool(iconIndices);
    shuffleInPlace(pool, rng);
    const board = poolToBoard(pool);
    if (hasAnySolvablePair(board)) return { ok: true, board };
  }
  return { ok: false, reason: 'no-solvable-pair' };
}
```

- [ ] **Step 4: Replace reshuffle with snapshot restoration on exhaustion**

Replace `reshuffleInPlace()` with:

```js
export function reshuffleInPlace(board, rng = Math.random, { maxAttempts = 1000 } = {}) {
  const snapshot = cloneBoard(board);
  const positions = [];
  const pieces = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) {
        positions.push({ r, c });
        pieces.push(board[r][c]);
      }
    }
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    shuffleInPlace(pieces, rng);
    positions.forEach(({ r, c }, i) => { board[r][c] = pieces[i]; });
    if (hasAnySolvablePair(board)) return { ok: true };
  }

  restoreBoard(board, snapshot);
  return { ok: false, reason: 'no-solvable-pair' };
}
```

- [ ] **Step 5: Run board and full regression tests**

```bash
node --test tests/board.test.mjs
node --test tests/*.test.mjs
```

Expected: all board tests and the existing drag/move animation tests pass.

- [ ] **Step 6: Commit board generation**

```bash
git add game/board.js tests/board.test.mjs
git commit -m "feat: parameterize board generation by unlocked icons" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Six Fruit Icons and Level UI Skeleton

**Files:**
- Modify: `game/svg-icons.js:1-end`
- Modify: `index.html:13-97`
- Modify: `styles.css:79-330`
- Create: `tests/svg-icons.test.mjs`

**Interfaces:**
- Consumes: original 14 `ICON_NAMES` indices unchanged.
- Produces: indices `14..19` named `banana`, `orange`, `pear`, `cherry`, `peach`, `watermelon`; DOM IDs `level`, `hintCount`, `reshuffleCount`, `toolAvailability`, `completeDialog`, `deadlockDialog`, `failureDialog`.

- [ ] **Step 1: Write failing icon contract tests**

Create `tests/svg-icons.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_NAMES, ICONS } from '../game/svg-icons.js';

const NEW_FRUITS = ['banana', 'orange', 'pear', 'cherry', 'peach', 'watermelon'];

test('six fruit icons follow the original fourteen icons', () => {
  assert.equal(ICON_NAMES.length, 20);
  assert.deepEqual(ICON_NAMES.slice(14), NEW_FRUITS);
});

test('every icon uses the shared veg svg contract', () => {
  for (const name of ICON_NAMES) {
    assert.match(ICONS[name], /^<svg class="veg" data-name="[^"]+" viewBox="0 0 64 64"/);
  }
});

test('new fruit names occupy indices fourteen through nineteen', () => {
  NEW_FRUITS.forEach((name, offset) => assert.equal(ICON_NAMES[14 + offset], name));
});
```

- [ ] **Step 2: Run the icon tests and verify they fail at length 14**

```bash
node --test tests/svg-icons.test.mjs
```

Expected: FAIL because `ICON_NAMES.length` is 14.

- [ ] **Step 3: Append the six SVG icons without reordering existing icons**

Extend `ICON_NAMES`:

```js
export const ICON_NAMES = [
  'broccoli', 'lettuce', 'tomato', 'carrot', 'corn',
  'eggplant', 'onion', 'potato', 'cucumber', 'pepper',
  'pumpkin', 'grape', 'apple', 'strawberry',
  'banana', 'orange', 'pear', 'cherry', 'peach', 'watermelon',
];
```

Add all six approved `S(name, body)` entries. Each body uses only inline SVG geometry, the shared dark ink supplied by `S()`, and saturated fills:

```js
banana: S('banana', `
  <path d="M10 35c8 14 24 20 38 11 7-4 10-12 8-20-8 8-17 12-27 9-7-2-12-6-16-11-3 3-4 7-3 11Z" fill="#F4D54A"/>
  <path d="M15 29c10 11 24 15 36 7" stroke="#D29B24" stroke-width="2.2"/>
`),
orange: S('orange', `
  <circle cx="32" cy="35" r="20" fill="#F69227"/>
  <path d="M31 15c3-8 10-11 17-8-2 7-8 10-16 9Z" fill="#5AAA43"/>
  <path d="M19 35h26M32 22v26" stroke="#D76C1E" stroke-width="1.8"/>
`),
pear: S('pear', `
  <path d="M35 13c2 8 12 12 13 24 1 12-6 20-17 20S13 49 16 37c2-10 12-15 13-24Z" fill="#ACD052"/>
  <path d="M34 13c0-5 2-8 6-10"/>
  <path d="M38 9c6-5 11-3 13 2-5 3-9 2-13-2Z" fill="#56A640"/>
`),
cherry: S('cherry', `
  <path d="M18 36c-7 0-12 6-11 13 1 8 9 11 15 7 6 4 14 1 15-7 1-7-5-13-12-13Z" fill="#E84747"/>
  <path d="M39 34c-7 0-12 6-11 13 1 8 9 11 15 7 6 4 14 1 15-7 1-7-5-13-12-13Z" fill="#EF5A50"/>
  <path d="M22 36C25 20 34 13 43 10m1 24c0-9-1-17-1-24"/>
  <path d="M40 13c-6-7-12-5-14 0 5 4 10 4 14 0Z" fill="#59A846"/>
`),
peach: S('peach', `
  <path d="M13 35c0-14 10-23 22-23 13 0 21 10 18 24-2 13-13 21-24 19-10-2-16-9-16-20Z" fill="#F58B6A"/>
  <path d="M34 13c-4 12-2 28 8 38" stroke="#E96B55" stroke-width="2.2"/>
  <path d="M34 13c4-9 13-10 18-5-4 7-10 9-17 7Z" fill="#5AA844"/>
`),
watermelon: S('watermelon', `
  <path d="M8 35c7-15 19-22 34-18 12 3 17 14 11 24-7 12-23 17-36 11C7 48 4 42 8 35Z" fill="#58AD4D"/>
  <path d="M15 37c7-9 18-14 31-12 4 8-3 17-13 21-8 4-16 1-18-9Z" fill="#EF4C4C"/>
  <path d="m22 36 2 1m10-5 2 1m5 6 2 1" stroke="#4F2C1F" stroke-width="2.4"/>
`),
```

- [ ] **Step 4: Replace static round and dialog markup with level/resource markup**

In `index.html`:

```html
<div class="meta" id="meta">第 <span id="level">1</span> 关</div>
```

Add badges inside hint and shuffle buttons:

```html
<span class="tool__badge" id="hintCount" aria-hidden="true">3</span>
<span class="tool__badge" id="reshuffleCount" aria-hidden="true">3</span>
```

Change restart copy and add a live availability region:

```html
<button class="tool tool--restart" id="restartBtn" type="button" aria-label="重试本关">
  <!-- preserve the existing restart SVG -->
  <span>重试</span>
</button>
<p id="toolAvailability" class="sr-only" aria-live="polite"></p>
```

Replace the three dialog blocks with:

```html
<dialog id="completeDialog" class="dialog dialog--complete">
  <div class="dialog__card">
    <div class="dialog__unlock" id="completeUnlock" hidden></div>
    <h2 class="dialog__title" id="completeTitle">关卡完成！</h2>
    <p class="dialog__desc" id="completeDesc"></p>
    <div class="dialog__summary" id="completeSummary"></div>
    <div class="dialog__actions">
      <button class="tool tool--primary" data-complete-next type="button">下一关</button>
    </div>
  </div>
</dialog>

<dialog id="deadlockDialog" class="dialog dialog--deadlock">
  <div class="dialog__card">
    <h2 class="dialog__title">陷入死局</h2>
    <p class="dialog__desc">当前盘面已无可消除对。</p>
    <div class="dialog__actions">
      <button class="tool tool--secondary" data-deadlock-retry type="button">重试本关</button>
      <button class="tool tool--primary" data-deadlock-reshuffle type="button">使用一次重排</button>
    </div>
  </div>
</dialog>

<dialog id="failureDialog" class="dialog dialog--failure">
  <div class="dialog__card">
    <h2 class="dialog__title" id="failureTitle">本关失败</h2>
    <p class="dialog__desc" id="failureDesc"></p>
    <div class="dialog__actions">
      <button class="tool tool--primary" data-failure-action type="button">重试本关</button>
    </div>
  </div>
</dialog>
```

- [ ] **Step 5: Add badge, disabled, summary, and screen-reader styles**

Add to `styles.css`:

```css
.meta #level { font-variant-numeric: tabular-nums; }
.tool { position: relative; }
.tool__badge {
  position: absolute;
  top: -9px;
  right: -7px;
  min-width: 24px;
  height: 24px;
  padding-inline: 5px;
  display: grid;
  place-items: center;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background: #E94D45;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.tool:disabled {
  cursor: not-allowed;
  filter: saturate(0.45);
  opacity: 0.7;
  transform: none;
}
.tool:disabled:active { box-shadow: 0 5px 0 var(--color-wood-dark); }
.dialog__summary { display: flex; gap: 10px; justify-content: center; margin-bottom: 18px; }
.dialog__unlock { margin-bottom: 10px; }
.dialog__unlock .veg { width: 58px; height: 58px; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

Keep the existing global reduced-motion block; these styles do not require JavaScript animation completion.

- [ ] **Step 6: Run icon tests and HTML/server smoke**

```bash
node --test tests/svg-icons.test.mjs
node --check server.js
node server.js
```

In a second shell:

```bash
curl -fsS http://localhost:3013/ | grep -q 'id="completeDialog"'
curl -fsS http://localhost:3013/game/svg-icons.js | grep -q 'watermelon'
```

Expected: icon tests pass and both HTTP checks exit 0. Stop the temporary server before continuing.

- [ ] **Step 7: Commit icons and markup**

```bash
git add game/svg-icons.js index.html styles.css tests/svg-icons.test.mjs
git commit -m "feat: add level unlock icons and resource controls" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Pure Level Session State Machine

**Files:**
- Create: `game/level-session.js`
- Create: `tests/level-session.test.mjs`

**Interfaces:**
- Consumes:
  - validated progress `{ version, currentLevel, highestUnlocked, levelSeed }`
  - level config `{ hints, reshuffles }`
  - `createNextSeed()` callback.
- Produces `createLevelSession({ progress, config, createNextSeed })` with methods:
  - `snapshot()`
  - `retry()`
  - `useHint({ pairAvailable })`
  - `deadlock()`
  - `useReshuffle({ success })`
  - `complete()`
  - `fail(reason)`

- [ ] **Step 1: Write failing state transition tests**

Create `tests/level-session.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createLevelSession } from '../game/level-session.js';

function session({ level = 4, seed = null, hints = 2, reshuffles = 1 } = {}) {
  return createLevelSession({
    progress: { version: 1, currentLevel: level, highestUnlocked: level, levelSeed: seed },
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
  assert.deepEqual(value.useHint({ pairAvailable: true }).action, 'highlight-pair');
  assert.equal(value.snapshot().hintsRemaining, 1);
  assert.deepEqual(value.useHint({ pairAvailable: false }).action, 'deadlock');
  assert.equal(value.snapshot().hintsRemaining, 1);
});

test('failed reshuffle preserves the shared resource and enters failed phase', () => {
  const value = session();
  assert.deepEqual(value.useReshuffle({ success: false }), { action: 'generation-failed' });
  assert.equal(value.snapshot().reshufflesRemaining, 1);
  assert.equal(value.snapshot().phase, 'failed');
});

test('deadlock exposes rescue only while a reshuffle remains', () => {
  const withResource = session();
  assert.deepEqual(withResource.deadlock(), { action: 'offer-reshuffle' });
  const withoutResource = session({ reshuffles: 0 });
  assert.deepEqual(withoutResource.deadlock(), { action: 'failed' });
  assert.equal(withoutResource.snapshot().phase, 'failed');
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
});

test('completing level five creates the level six seed', () => {
  const value = session({ level: 5 });
  assert.equal(value.complete().progress.levelSeed, 987654321);
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

```bash
node --test tests/level-session.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the state machine with immutable snapshots**

Create `game/level-session.js`:

```js
export function createLevelSession({ progress, config, createNextSeed }) {
  const initial = Object.freeze({ hints: config.hints, reshuffles: config.reshuffles });
  const state = {
    currentLevel: progress.currentLevel,
    highestUnlocked: progress.highestUnlocked,
    levelSeed: progress.levelSeed,
    hintsRemaining: initial.hints,
    reshufflesRemaining: initial.reshuffles,
    phase: 'playing',
    failureReason: null,
  };

  const snapshot = () => Object.freeze({ ...state });

  function retry() {
    state.hintsRemaining = initial.hints;
    state.reshufflesRemaining = initial.reshuffles;
    state.phase = 'playing';
    state.failureReason = null;
    return snapshot();
  }

  function useHint({ pairAvailable }) {
    if (state.phase !== 'playing' || state.hintsRemaining === 0) return { action: 'none' };
    if (!pairAvailable) return { action: 'deadlock' };
    state.hintsRemaining--;
    return { action: 'highlight-pair' };
  }

  function deadlock() {
    if (state.reshufflesRemaining > 0) return { action: 'offer-reshuffle' };
    state.phase = 'failed';
    state.failureReason = 'deadlock';
    return { action: 'failed' };
  }

  function useReshuffle({ success }) {
    if (state.phase !== 'playing' || state.reshufflesRemaining === 0) return { action: 'none' };
    if (!success) {
      state.phase = 'failed';
      state.failureReason = 'generation';
      return { action: 'generation-failed' };
    }
    state.reshufflesRemaining--;
    return { action: 'reshuffled' };
  }

  function complete() {
    const nextLevel = state.currentLevel + 1;
    state.currentLevel = nextLevel;
    state.highestUnlocked = nextLevel;
    state.levelSeed = nextLevel >= 6 ? createNextSeed() : null;
    state.phase = 'level-complete';
    return {
      action: 'level-complete',
      progress: {
        version: 1,
        currentLevel: nextLevel,
        highestUnlocked: nextLevel,
        levelSeed: state.levelSeed,
      },
    };
  }

  function fail(reason) {
    state.phase = 'failed';
    state.failureReason = reason;
    return snapshot();
  }

  return { snapshot, retry, useHint, deadlock, useReshuffle, complete, fail };
}
```

- [ ] **Step 4: Run state machine tests**

```bash
node --test tests/level-session.test.mjs
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 5: Commit the state machine**

```bash
git add game/level-session.js tests/level-session.test.mjs
git commit -m "feat: add level resource state machine" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Cancellable Dialog Manager

**Files:**
- Modify: `game/dialogs.js:1-61`
- Create: `tests/dialogs.test.mjs`

**Interfaces:**
- Consumes: `getDialog(id)` and browser DOM dialog elements.
- Produces:
  - `createDialogManager({ getDialog })`
  - `createBrowserDialogManager()`
  - manager methods `showLevelComplete`, `showDeadlock`, `showFailure`, `closeAll`; every pending dialog promise resolves to `'cancelled'` when replaced or closed programmatically.

- [ ] **Step 1: Write fake-dialog lifecycle tests**

Create `tests/dialogs.test.mjs` with a minimal event target:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDialogManager } from '../game/dialogs.js';

function fakeElement() {
  const listeners = new Map();
  return {
    open: false,
    textContent: '',
    innerHTML: '',
    hidden: false,
    addEventListener(type, fn) { (listeners.get(type) || listeners.set(type, new Set()).get(type)).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatch(type) {
      const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      [...(listeners.get(type) || [])].forEach(fn => fn(event));
      return event;
    },
    showModal() { this.open = true; },
    close() { this.open = false; },
    focus() {},
    querySelector(selector) { return this.parts[selector]; },
    parts: {},
    listenerCount(type) { return listeners.get(type)?.size || 0; },
  };
}

function fixture() {
  const dialogs = new Map();
  for (const id of ['completeDialog', 'deadlockDialog', 'failureDialog']) {
    const dialog = fakeElement();
    dialog.parts = {
      '[data-complete-next]': fakeElement(),
      '[data-deadlock-retry]': fakeElement(),
      '[data-deadlock-reshuffle]': fakeElement(),
      '[data-failure-action]': fakeElement(),
    };
    dialogs.set(id, dialog);
  }
  for (const id of ['completeTitle', 'completeDesc', 'completeSummary', 'completeUnlock', 'failureTitle', 'failureDesc']) {
    dialogs.set(id, fakeElement());
  }
  return { dialogs, manager: createDialogManager({ getDialog: id => dialogs.get(id) }) };
}

test('completion settles only once and prevents cancel', async () => {
  const { dialogs, manager } = fixture();
  const pending = manager.showLevelComplete({ levelNumber: 1, nextLevelNumber: 2, hintsRemaining: 2, reshufflesRemaining: 1, unlockedIconSvg: '' });
  assert.equal(dialogs.get('completeDialog').dispatch('cancel').defaultPrevented, true);
  dialogs.get('completeDialog').parts['[data-complete-next]'].dispatch('click');
  dialogs.get('completeDialog').parts['[data-complete-next]'].dispatch('click');
  assert.equal(await pending, 'next');
});

test('closeAll resolves cancelled and removes active listeners', async () => {
  const { dialogs, manager } = fixture();
  const pending = manager.showDeadlock();
  manager.closeAll();
  assert.equal(await pending, 'cancelled');
  assert.equal(dialogs.get('deadlockDialog').open, false);
  assert.equal(dialogs.get('deadlockDialog').listenerCount('cancel'), 0);
});

test('reopening a dialog cancels the prior session and keeps one listener set', async () => {
  const { dialogs, manager } = fixture();
  const first = manager.showFailure({ title: '失败', description: 'A', actionLabel: '重试' });
  manager.showFailure({ title: '失败', description: 'B', actionLabel: '重试' });
  assert.equal(await first, 'cancelled');
  assert.equal(dialogs.get('failureDialog').listenerCount('cancel'), 1);
});
```

- [ ] **Step 2: Run tests and confirm the missing factory failure**

```bash
node --test tests/dialogs.test.mjs
```

Expected: FAIL because `createDialogManager` is not exported.

- [ ] **Step 3: Replace ad-hoc dialog functions with one active-session manager**

Implement `game/dialogs.js` around this common helper:

```js
export function createDialogManager({ getDialog }) {
  const active = new Map();

  function closeSession(id) {
    active.get(id)?.cancel();
  }

  function open(id, install) {
    closeSession(id);
    const dialog = getDialog(id);
    return new Promise(resolve => {
      let settled = false;
      const cleanups = [];
      const listen = (element, type, handler) => {
        element.addEventListener(type, handler);
        cleanups.push(() => element.removeEventListener(type, handler));
      };
      const cleanup = () => cleanups.splice(0).forEach(fn => fn());
      const settle = value => {
        if (settled) return;
        settled = true;
        cleanup();
        active.delete(id);
        if (dialog.open) dialog.close();
        resolve(value);
      };
      listen(dialog, 'cancel', event => event.preventDefault());
      install({ dialog, listen, settle });
      active.set(id, { dialog, cancel: () => settle('cancelled') });
      dialog.showModal();
    });
  }

  function closeAll() {
    [...active.keys()].forEach(closeSession);
  }

  return {
    showLevelComplete(data) {
      return open('completeDialog', ({ dialog, listen, settle }) => {
        getDialog('completeTitle').textContent = `第 ${data.levelNumber} 关完成！`;
        getDialog('completeDesc').textContent = data.unlockedIconSvg ? '新的水果图案已解锁' : '继续挑战下一关';
        getDialog('completeSummary').textContent = `提示剩余 ${data.hintsRemaining} · 重排剩余 ${data.reshufflesRemaining}`;
        const unlock = getDialog('completeUnlock');
        unlock.hidden = !data.unlockedIconSvg;
        unlock.innerHTML = data.unlockedIconSvg || '';
        const button = dialog.querySelector('[data-complete-next]');
        button.textContent = `进入第 ${data.nextLevelNumber} 关`;
        listen(button, 'click', () => settle('next'));
      });
    },
    showDeadlock() {
      return open('deadlockDialog', ({ dialog, listen, settle }) => {
        listen(dialog.querySelector('[data-deadlock-retry]'), 'click', () => settle('retry'));
        listen(dialog.querySelector('[data-deadlock-reshuffle]'), 'click', () => settle('reshuffle'));
      });
    },
    showFailure({ title, description, actionLabel }) {
      return open('failureDialog', ({ dialog, listen, settle }) => {
        getDialog('failureTitle').textContent = title;
        getDialog('failureDesc').textContent = description;
        const button = dialog.querySelector('[data-failure-action]');
        button.textContent = actionLabel;
        listen(button, 'click', () => settle('retry'));
      });
    },
    closeAll,
  };
}

export function createBrowserDialogManager() {
  return createDialogManager({ getDialog: id => document.getElementById(id) });
}
```

- [ ] **Step 4: Run dialog tests**

```bash
node --test tests/dialogs.test.mjs
```

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit dialog lifecycle changes**

```bash
git add game/dialogs.js tests/dialogs.test.mjs
git commit -m "feat: isolate dialog listeners by level session" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Integrate Levels, Persistence, Resources, and Async Isolation

**Files:**
- Modify: `game/interaction.js:1-545`
- Verify unchanged: `game/main.js`, `game/drag-input.js`, `game/move-animation.js`
- Test: run `tests/*.test.mjs`; integration-specific behavior is covered by the browser verification task without adding a DOM dependency.

**Interfaces:**
- Consumes all APIs from Tasks 1–6.
- Produces browser flows `loadLevel`, `retryCurrentLevel`, `completeCurrentLevel`, resource-aware hint/reshuffle, deadlock/failure handling, and `levelSessionId` stale callback protection.

- [ ] **Step 1: Change imports and state shape, then run syntax check to expose every old API use**

Replace imports with:

```js
import {
  ROWS, COLS, findTargets, findSolvablePair, hasAnySolvablePair,
  reshuffleInPlace, applyShift, createShiftChain, createShiftRevertMoves,
  getShiftChainPositions, createBoard, cloneBoard, restoreBoard,
} from './board.js';
import { createBrowserDialogManager } from './dialogs.js';
import { createLevelSession } from './level-session.js';
import { createRandomSeed, createSeededRng, getLevelConfig } from './levels.js';
import { createDefaultProgress, loadProgress, saveProgress } from './progress.js';
```

Replace `round`, `deadlockCount`, and individual timer fields with:

```js
currentLevel: 1,
highestUnlocked: 1,
levelSeed: null,
levelConfig: null,
levelSession: null,
phase: 'loading',
levelSessionId: 0,
timerIds: new Set(),
storageAvailable: true,
```

Instantiate once:

```js
const dialogs = createBrowserDialogManager();
```

Run:

```bash
node --check game/interaction.js
```

Expected: syntax succeeds, but the old `showWin`, `showDeadlock`, `showGameOver`, `round`, and `deadlockCount` references remain to be removed in subsequent steps.

- [ ] **Step 2: Add session-scoped timer and cleanup helpers**

Add:

```js
function scheduleForSession(callback, delay) {
  const sessionId = state.levelSessionId;
  const timer = setTimeout(() => {
    state.timerIds.delete(timer);
    if (sessionId !== state.levelSessionId) return;
    callback();
  }, delay);
  state.timerIds.add(timer);
  return timer;
}

function clearLevelAsync() {
  state.timerIds.forEach(clearTimeout);
  state.timerIds.clear();
  moveAnimator.cancelAll();
  dragInput.reset();
  dialogs.closeAll();
  state.drag = null;
  state.pendingRevert = null;
  cancelSelection();
  clearTip();
}

function sessionStillCurrent(sessionId) {
  return sessionId === state.levelSessionId;
}
```

Replace every level-bound `setTimeout()` call with `scheduleForSession()`:

- single-target 220ms selection delay;
- 180ms elimination face cleanup;
- 580ms shake cleanup;
- 2000ms hint cleanup;
- 2500ms tip cleanup.

Do not change the resize debounce because it only remeasures dynamic pitch.

- [ ] **Step 3: Add progress helpers, resource rendering, and deterministic level loading**

Add DOM getters:

```js
const levelEl = () => document.getElementById('level');
const hintCountEl = () => document.getElementById('hintCount');
const reshuffleCountEl = () => document.getElementById('reshuffleCount');
const toolAvailabilityEl = () => document.getElementById('toolAvailability');
```

Add:

```js
function currentProgress() {
  return {
    version: 1,
    currentLevel: state.currentLevel,
    highestUnlocked: state.highestUnlocked,
    levelSeed: state.currentLevel >= 6 ? state.levelSeed : null,
  };
}

function persistProgress() {
  const result = saveProgress(window.localStorage, currentProgress());
  state.storageAvailable = result.ok;
  if (!result.ok) showTip('本次进度无法保存');
  return result;
}

function updateLevelControls() {
  const snapshot = state.levelSession.snapshot();
  levelEl().textContent = String(state.currentLevel);
  hintCountEl().textContent = String(snapshot.hintsRemaining);
  reshuffleCountEl().textContent = String(snapshot.reshufflesRemaining);
  const hintButton = document.getElementById('hintBtn');
  const shuffleButton = document.getElementById('shuffleBtn');
  hintButton.disabled = state.phase !== 'playing' || snapshot.hintsRemaining === 0;
  shuffleButton.disabled = state.phase !== 'playing' || snapshot.reshufflesRemaining === 0;
  toolAvailabilityEl().textContent = `提示剩余 ${snapshot.hintsRemaining} 次，重排剩余 ${snapshot.reshufflesRemaining} 次`;
}
```

Implement `loadLevel()`:

```js
function loadLevel(levelNumber, seed) {
  const sessionId = ++state.levelSessionId;
  clearLevelAsync();
  state.phase = 'loading';
  setBusy(true);

  let config;
  try {
    config = getLevelConfig(levelNumber, { randomSeed: seed });
  } catch {
    loadLevel(1, null);
    return;
  }

  const result = createBoard({
    iconIndices: config.iconIndices,
    rng: createSeededRng(config.seed),
  });
  if (!result.ok) {
    handleBoardGenerationFailure(sessionId, levelNumber);
    return;
  }

  state.currentLevel = levelNumber;
  state.highestUnlocked = levelNumber;
  state.levelSeed = levelNumber >= 6 ? config.seed : null;
  state.levelConfig = config;
  state.board = result.board;
  state.levelSession = createLevelSession({
    progress: currentProgress(),
    config,
    createNextSeed: () => createRandomSeed(),
  });
  state.phase = 'playing';
  renderBoard();
  updateLevelControls();
  persistProgress();
  setBusy(false);
}
```

- [ ] **Step 4: Implement fixed/random generation failure paths**

Add:

```js
async function handleBoardGenerationFailure(sessionId, levelNumber) {
  if (!sessionStillCurrent(sessionId)) return;

  if (levelNumber >= 6) {
    const replacementSeed = createRandomSeed();
    state.currentLevel = levelNumber;
    state.highestUnlocked = levelNumber;
    state.levelSeed = replacementSeed;
    persistProgress();
    const replacement = createBoard({
      iconIndices: getLevelConfig(levelNumber, { randomSeed: replacementSeed }).iconIndices,
      rng: createSeededRng(replacementSeed),
    });
    if (replacement.ok) {
      loadLevel(levelNumber, replacementSeed);
      return;
    }
  }

  state.phase = 'failed';
  const action = await dialogs.showFailure({
    title: '关卡生成失败',
    description: levelNumber >= 6 ? '请重新生成本关。' : '请重试本关。',
    actionLabel: levelNumber >= 6 ? '重新生成本关' : '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;
  if (levelNumber < 6) {
    loadLevel(levelNumber, null);
    return;
  }
  const regeneratedSeed = createRandomSeed();
  state.currentLevel = levelNumber;
  state.highestUnlocked = levelNumber;
  state.levelSeed = regeneratedSeed;
  persistProgress();
  loadLevel(levelNumber, regeneratedSeed);
}
```

- [ ] **Step 5: Replace hint and reshuffle handlers with shared resource consumption**

Implement hint:

```js
function hint() {
  if (state.busy || state.phase !== 'playing') return;
  clearTip();
  const pair = findSolvablePair(state.board);
  const outcome = state.levelSession.useHint({ pairAvailable: Boolean(pair) });
  if (outcome.action === 'deadlock') {
    handleDeadlock();
    return;
  }
  if (outcome.action !== 'highlight-pair') return;
  updateLevelControls();
  const e1 = state.cellEls[pair.r1][pair.c1];
  const e2 = state.cellEls[pair.r2][pair.c2];
  e1.classList.add('hint');
  e2.classList.add('hint');
  scheduleForSession(() => {
    e1.classList.remove('hint');
    e2.classList.remove('hint');
  }, 2000);
}
```

Implement the generation-failure dialog and shared reshuffle path:

```js
async function showCurrentGenerationFailure() {
  const sessionId = state.levelSessionId;
  state.phase = 'failed';
  setBusy(true);
  updateLevelControls();
  const action = await dialogs.showFailure({
    title: '重排失败',
    description: '未能生成可继续的盘面，请重试本关。',
    actionLabel: '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;
  retryCurrentLevel();
}

function tryReshuffle() {
  const result = reshuffleInPlace(
    state.board,
    createSeededRng((state.levelConfig.seed ^ state.levelSessionId ^ Date.now()) >>> 0),
  );
  const outcome = state.levelSession.useReshuffle({ success: result.ok });
  if (!result.ok) {
    void showCurrentGenerationFailure();
    return false;
  }
  renderBoard();
  updateLevelControls();
  showTip('已重新洗牌');
  return outcome.action === 'reshuffled';
}
```

Do not use a hard-coded movement pitch. `renderBoard()` must continue to schedule `measurePitch()`.

- [ ] **Step 6: Replace win/deadlock/restart flows with complete/retry flows**

Replace `afterEliminate()` and old dialogs with:

```js
function afterEliminate() {
  if (isAllCleared()) {
    completeCurrentLevel();
    return;
  }
  if (!hasAnySolvablePair(state.board)) handleDeadlock();
}

async function completeCurrentLevel() {
  const sessionId = state.levelSessionId;
  const completedLevel = state.currentLevel;
  const resources = state.levelSession.snapshot();
  const completion = state.levelSession.complete();
  state.currentLevel = completion.progress.currentLevel;
  state.highestUnlocked = completion.progress.highestUnlocked;
  state.levelSeed = completion.progress.levelSeed;
  state.phase = 'level-complete';
  setBusy(true);
  persistProgress();
  const nextConfig = getLevelConfig(state.currentLevel, { randomSeed: state.levelSeed });
  const unlockedIconSvg = nextConfig.unlockedIconIndex === null
    ? ''
    : ICONS[ICON_NAMES[nextConfig.unlockedIconIndex]];
  const action = await dialogs.showLevelComplete({
    levelNumber: completedLevel,
    nextLevelNumber: state.currentLevel,
    hintsRemaining: resources.hintsRemaining,
    reshufflesRemaining: resources.reshufflesRemaining,
    unlockedIconSvg,
  });
  if (!sessionStillCurrent(sessionId) || action !== 'next') return;
  loadLevel(state.currentLevel, state.levelSeed);
}

async function handleDeadlock() {
  if (state.busy || state.phase !== 'playing') return;
  const sessionId = state.levelSessionId;
  const outcome = state.levelSession.deadlock();
  setBusy(true);
  if (outcome.action === 'offer-reshuffle') {
    const choice = await dialogs.showDeadlock();
    if (!sessionStillCurrent(sessionId)) return;
    setBusy(false);
    if (choice === 'retry') retryCurrentLevel();
    else tryReshuffle();
    return;
  }
  const action = await dialogs.showFailure({
    title: '本关失败',
    description: '重排次数已用尽，请重试本关。',
    actionLabel: '重试本关',
  });
  if (!sessionStillCurrent(sessionId) || action !== 'retry') return;
  retryCurrentLevel();
}

function retryCurrentLevel() {
  loadLevel(state.currentLevel, state.levelSeed);
}
```

Delete `restart()`, `round`, `deadlockCount`, `showWin`, and `showGameOver` references.

- [ ] **Step 7: Guard animation completion callbacks and initialize from storage**

For every `moveAnimator.settleFollow(duration, callback)`, capture `const sessionId = state.levelSessionId` and start the callback with:

```js
if (!sessionStillCurrent(sessionId)) return;
```

Replace `initGame()` startup:

```js
export function initGame() {
  const stored = loadProgress(window.localStorage);
  const progress = stored.ok ? stored.value : createDefaultProgress();
  if (!stored.ok) showTip('进度读取失败，已从第 1 关开始');
  loadLevel(progress.currentLevel, progress.levelSeed);

  document.getElementById('hintBtn').addEventListener('click', hint);
  document.getElementById('shuffleBtn').addEventListener('click', () => {
    if (!state.busy && state.phase === 'playing') tryReshuffle();
  });
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (!state.busy && state.phase === 'playing') retryCurrentLevel();
  });

  const be = boardEl();
  be.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerCancel);
}
```

- [ ] **Step 8: Run all automated and syntax checks**

```bash
node --test tests/*.test.mjs
for file in game/*.js; do node --check "$file" || exit 1; done
node --check server.js
```

Expected: all tests pass, all syntax checks exit 0.

- [ ] **Step 9: Commit browser integration**

```bash
git add game/interaction.js
git commit -m "feat: integrate persistent level progression" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Browser Verification, Commit Gate, and Deployment

**Files:**
- Verify all changed files.
- Do not create product code unless verification identifies a defect.

**Interfaces:**
- Consumes the complete feature from Tasks 1–7.
- Produces verified local behavior, a pushed branch/master commit, and a healthy PM2 deployment at `http://119.91.53.223:3013/`.

- [ ] **Step 1: Run the full automated verification gate**

```bash
node --test tests/*.test.mjs
for file in game/*.js; do node --check "$file" || exit 1; done
node --check server.js
git diff --check
git status --short --branch
```

Expected: zero test failures, zero syntax failures, no diff-check output, and only the two pre-existing screenshot files remain untracked.

- [ ] **Step 2: Launch the real app over HTTP**

```bash
node server.js
```

Poll from a second shell:

```bash
for i in {1..30}; do curl -sf http://localhost:3013/ >/dev/null && break; sleep 1; done
curl -fsS http://localhost:3013/game/levels.js | grep -q 'getLevelConfig'
curl -fsS http://localhost:3013/game/progress.js | grep -q 'PROGRESS_KEY'
curl -fsS http://localhost:3013/styles.css | grep -q 'tool__badge'
```

Expected: all resource checks exit 0.

- [ ] **Step 3: Drive critical browser paths**

Using the project browser-driving path, verify:

1. Clear `lianliankan.progress.v1`; reload shows level 1, 3 hints, 3 reshuffles.
2. Record the level 1 board HTML, click Retry, and verify exact board equality.
3. Inject valid level 6 progress with seed `123456789`; reload twice and verify exact board equality.
4. Click Hint and verify the badge decreases only when a pair is highlighted.
5. Use manual Reshuffle and verify the reshuffle badge decreases by one.
6. Trigger a board clear through a controlled browser evaluation or normal play; verify completion dialog, saved next level, and Next Level loading.
7. Rapidly retry while selection, hint, drag settle, or dialog callbacks are pending; verify no stale style, dialog, resource, or busy mutation.
8. Verify 375px, 768px, and 1440px widths have no horizontal overflow.
9. Emulate `prefers-reduced-motion: reduce`; verify transitions clean up synchronously.
10. Check browser Console and Network for runtime errors or failed module requests.

- [ ] **Step 4: Run a final diff review and commit any verification fixes**

If verification changed files, rerun Step 1 and commit only the fixes:

```bash
git add game index.html styles.css tests
git commit -m "fix: stabilize level progression verification" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If no files changed, do not create an empty commit.

- [ ] **Step 5: Push and merge the feature branch**

```bash
git push -u origin feat/level-progression
```

Attempt a PR only if the GitHub token allows it. If PR creation remains unavailable, fast-forward locally after final verification:

```bash
git switch master
git merge --ff-only feat/level-progression
git push origin master
```

Expected: `origin/master` points to the verified feature head.

- [ ] **Step 6: Deploy to the existing Ubuntu PM2 service**

```bash
ssh ubuntu@119.91.53.223 '
  set -e
  cd /home/ubuntu/pj_bricks
  test -z "$(git status --porcelain)"
  git fetch origin master
  git merge --ff-only origin/master
  node --test tests/*.test.mjs
  for file in game/*.js; do node --check "$file"; done
  node --check server.js
  pm2 restart pj-bricks
  for i in $(seq 1 30); do curl -sf http://127.0.0.1:3013/ >/dev/null && break; sleep 1; done
  curl -fsS http://127.0.0.1:3013/ | grep -q "田园连连看"
  printf "DEPLOYED_COMMIT="
  git rev-parse --short HEAD
'
```

Expected: remote tests pass, PM2 reports `pj-bricks` online, local HTTP returns 200, and the deployed commit equals `origin/master`.

- [ ] **Step 7: Verify public resources and behavior**

```bash
curl -fsS http://119.91.53.223:3013/ | grep -q 'id="level"'
curl -fsS http://119.91.53.223:3013/game/levels.js | grep -q 'getLevelConfig'
curl -fsS http://119.91.53.223:3013/game/progress.js | grep -q 'lianliankan.progress.v1'
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' http://119.91.53.223:3013/styles.css
```

Expected: the first three commands exit 0 and the stylesheet reports `200 text/css; charset=utf-8`.

## Plan Self-Review

- Spec coverage: Tasks 1–7 cover seeds, 14-to-20 icons, paired 140-cell boards, resource curves, progress, dialogs, retry, completion, deadlock, generation failure, stale callback protection, accessibility, and reduced motion. Task 8 covers local/remote verification and deployment.
- Completeness scan: every code-changing step includes concrete interfaces, code, commands, and expected outcomes.
- Type consistency: board values remain numeric indices; level configs use `iconIndices`; progress uses `levelSeed`; levels 6+ use unsigned 32-bit seeds; dialogs return string actions; session snapshots use the same state property names as `interaction.js`.
